import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/'

  if (code) {
    const supabase = await createClient()
    const { data, error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error && data.user) {
      // Ensure user exists in our database
      const existingUser = await prisma.user.findUnique({
        where: { id: data.user.id },
        include: { organizations: true },
      })

      if (!existingUser) {
        // Create new user and their default organization
        const user = await prisma.user.create({
          data: {
            id: data.user.id,
            email: data.user.email!,
            name: data.user.user_metadata?.full_name || data.user.email?.split('@')[0],
            avatarUrl: data.user.user_metadata?.avatar_url,
          },
        })

        // Create default organization for new user
        const org = await prisma.organization.create({
          data: {
            name: `${user.name}'s Business`,
            users: {
              create: {
                userId: user.id,
                role: 'owner',
              },
            },
            settings: {
              create: {
                businessName: `${user.name}'s Business`,
              },
            },
          },
        })

        console.log(`Created new user ${user.email} with org ${org.id}`)
      }

      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  // Return the user to an error page with instructions
  return NextResponse.redirect(`${origin}/login?error=auth_failed`)
}
