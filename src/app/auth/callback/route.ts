import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// Owner user ID (Supabase auth UUID) - set via environment variable
const OWNER_USER_ID = process.env.OWNER_USER_ID;
const LEGACY_ORG_ID = 'default-org';

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/'

  if (code) {
    const supabase = await createClient()
    const { data, error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error && data.user) {
      const visitorId = data.user.id;
      const userEmail = data.user.email || '';
      console.log(`Auth callback for user: ${visitorId}`);
      
      try {
        // Check if user already exists
        let existingUser = await prisma.user.findUnique({
          where: { id: data.user.id },
          include: { organizations: true },
        })

      if (!existingUser) {
        // Check if this is the owner email - link to legacy org
        if (OWNER_USER_ID && data.user.id === OWNER_USER_ID) {
          // Create user and link to existing default-org
          const user = await prisma.user.create({
            data: {
              id: data.user.id,
              email: userEmail,
              name: data.user.user_metadata?.full_name || userEmail.split('@')[0],
              avatarUrl: data.user.user_metadata?.avatar_url,
            },
          })

          // Check if legacy org exists
          const legacyOrg = await prisma.organization.findUnique({
            where: { id: LEGACY_ORG_ID },
          })

          if (legacyOrg) {
            // Link user to existing org as owner
            await prisma.organizationUser.create({
              data: {
                organizationId: LEGACY_ORG_ID,
                userId: user.id,
                role: 'owner',
              },
            })
            console.log(`Linked owner to legacy org ${LEGACY_ORG_ID}`)
          } else {
            // Create org if it doesn't exist (shouldn't happen)
            await prisma.organization.create({
              data: {
                id: LEGACY_ORG_ID,
                name: 'HB Beverage Co',
                users: {
                  create: {
                    userId: user.id,
                    role: 'owner',
                  },
                },
                settings: {
                  create: {
                    businessName: 'HB Beverage Co',
                  },
                },
              },
            })
            console.log(`Created legacy org for owner`)
          }
        } else {
          // New user - check for pending invites first
          const pendingInvite = await prisma.invite.findFirst({
            where: { email: userEmail.toLowerCase() },
          });

          if (pendingInvite) {
            // User was invited - create user and link to existing org
            const user = await prisma.user.create({
              data: {
                id: data.user.id,
                email: userEmail,
                name: data.user.user_metadata?.full_name || userEmail.split('@')[0],
                avatarUrl: data.user.user_metadata?.avatar_url,
              },
            });

            // Add user to the organization they were invited to
            await prisma.organizationUser.create({
              data: {
                organizationId: pendingInvite.organizationId,
                userId: user.id,
                role: pendingInvite.role,
              },
            });

            // Delete the invite since it's been used
            await prisma.invite.delete({
              where: { id: pendingInvite.id },
            });

            console.log(`Invited user ${visitorId} joined org ${pendingInvite.organizationId}`);
          } else {
            // No invite - create user with their own blank store
            // Demo mode (Brightline) is ON by default for new users
            const user = await prisma.user.create({
              data: {
                id: data.user.id,
                email: userEmail,
                name: data.user.user_metadata?.full_name || userEmail.split('@')[0],
                avatarUrl: data.user.user_metadata?.avatar_url,
              },
            });

            // Create new blank organization for the user
            // Demo mode (Brightline) handled client-side via localStorage
            const org = await prisma.organization.create({
              data: {
                name: 'My Business',
                users: {
                  create: {
                    userId: user.id,
                    role: 'owner',
                  },
                },
                settings: {
                  create: {
                    businessName: 'My Business',
                  },
                },
              },
            });

            console.log(`Created new user ${visitorId} with blank org ${org.id}`);
          }
        }
      }
      } catch (dbError) {
        console.error('Auth callback DB error:', dbError);
      }

      // Force redirect to dashboard, not the 'next' param
      const redirectUrl = new URL('/', origin);
      return NextResponse.redirect(redirectUrl);
    }
  }

  // Return the user to an error page with instructions
  const errorUrl = new URL('/login', origin);
  errorUrl.searchParams.set('error', 'auth_failed');
  return NextResponse.redirect(errorUrl)
}
