import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';

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
      
      return NextResponse.json({
        id: user.id,
        name: user.user_metadata?.full_name || 'User',
        avatarUrl: user.user_metadata?.avatar_url,
        isOwner,
      });
    }
    
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  } catch (error) {
    console.error('Auth check failed');
    return NextResponse.json({ error: 'Failed to get user' }, { status: 500 });
  }
}
