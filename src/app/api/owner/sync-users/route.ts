import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';

const OWNER_USER_ID = process.env.OWNER_USER_ID;

// One-time sync: Pull all Supabase Auth users into Prisma
export async function POST() {
  try {
    const user = await getSession();
    if (!user || !OWNER_USER_ID || user.id !== OWNER_USER_ID) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Create admin Supabase client
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    // Get all users from Supabase Auth
    const { data: { users }, error } = await supabaseAdmin.auth.admin.listUsers();
    
    if (error) {
      return NextResponse.json({ error: 'Failed to fetch Supabase users', details: error.message }, { status: 500 });
    }

    const results = {
      total: users.length,
      created: 0,
      skipped: 0,
      errors: [] as string[],
    };

    for (const supaUser of users) {
      try {
        // Check if user already exists in Prisma
        const existingUser = await prisma.user.findUnique({
          where: { id: supaUser.id },
        });

        if (existingUser) {
          results.skipped++;
          continue;
        }

        // Create user in Prisma
        const newUser = await prisma.user.create({
          data: {
            id: supaUser.id,
            email: supaUser.email || '',
            name: supaUser.user_metadata?.full_name || supaUser.email?.split('@')[0] || 'User',
            avatarUrl: supaUser.user_metadata?.avatar_url,
          },
        });

        // Create a blank organization for them
        await prisma.organization.create({
          data: {
            name: 'My Business',
            users: {
              create: {
                userId: newUser.id,
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

        results.created++;
      } catch (err) {
        results.errors.push(`${supaUser.email}: ${err instanceof Error ? err.message : 'Unknown error'}`);
      }
    }

    return NextResponse.json({
      success: true,
      message: `Synced ${results.created} users, skipped ${results.skipped} existing`,
      ...results,
    });
  } catch (error) {
    console.error('Sync users error:', error);
    return NextResponse.json({ 
      error: 'Failed to sync users',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
