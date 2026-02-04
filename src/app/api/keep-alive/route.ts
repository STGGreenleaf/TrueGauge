import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// Simple keep-alive endpoint to prevent Supabase auto-pause
// Called daily by Vercel cron
export async function GET() {
  try {
    // Lightweight query - just count organizations
    const count = await prisma.organization.count();
    
    return NextResponse.json({ 
      status: 'alive',
      timestamp: new Date().toISOString(),
      orgs: count
    });
  } catch (error) {
    console.error('Keep-alive failed:', error);
    return NextResponse.json({ 
      status: 'error',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}
