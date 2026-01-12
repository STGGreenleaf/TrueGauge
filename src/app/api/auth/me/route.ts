import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import { prisma } from '@/lib/prisma';

// Owner user ID (Supabase auth UUID) - set via environment variable
const OWNER_USER_ID = process.env.OWNER_USER_ID;

export async function GET() {
  try {
    const cookieStore = await cookies();
    
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
        },
      }
    );
    
    const { data: { user } } = await supabase.auth.getUser();
    
    if (user) {
      // Compute isOwner server-side - never expose email to client for comparison
      const isOwner = OWNER_USER_ID ? user.id === OWNER_USER_ID : false;
      
      // Check if user has their own org WITH DATA (not just a blank org)
      const orgUser = await prisma.organizationUser.findFirst({
        where: { userId: user.id },
        select: { organizationId: true },
      });
      
      // Only consider user as having "own org" if they have actual data entered
      let hasOwnOrgWithData = false;
      if (orgUser && orgUser.organizationId !== 'showcase-template') {
        // Check if org has any day entries (sales data)
        const dataCount = await prisma.dayEntry.count({
          where: { organizationId: orgUser.organizationId },
          take: 1, // Just need to know if any exist
        });
        hasOwnOrgWithData = dataCount > 0;
      }
      
      return NextResponse.json({
        id: user.id,
        name: user.user_metadata?.full_name || 'User',
        avatarUrl: user.user_metadata?.avatar_url,
        isOwner,
        hasOwnOrg: hasOwnOrgWithData, // true only if user has actual data in their store
      });
    }
    
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  } catch (error) {
    console.error('Auth check failed');
    return NextResponse.json({ error: 'Failed to get user' }, { status: 500 });
  }
}
