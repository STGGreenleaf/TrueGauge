import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentOrgId } from '@/lib/org';
import { createClient } from '@/lib/supabase/server';

// GET - fetch pending invites for current org
export async function GET() {
  try {
    const orgId = await getCurrentOrgId();
    
    const invites = await prisma.invite.findMany({
      where: { organizationId: orgId },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ invites });
  } catch (error) {
    console.error('Error fetching invites:', error);
    return NextResponse.json({ error: 'Failed to fetch invites' }, { status: 500 });
  }
}

// POST - create a new invite
export async function POST(request: Request) {
  try {
    const orgId = await getCurrentOrgId();
    const supabase = await createClient();
    const { data: { user: authUser } } = await supabase.auth.getUser();
    
    // Check if current user is admin
    const currentOrgUser = await prisma.organizationUser.findFirst({
      where: { organizationId: orgId, userId: authUser?.id },
    });
    
    if (!currentOrgUser || (currentOrgUser.role !== 'owner' && currentOrgUser.role !== 'admin')) {
      return NextResponse.json({ error: 'Only admins can invite users' }, { status: 403 });
    }
    
    const { email, role = 'member' } = await request.json();
    
    if (!email || !email.includes('@')) {
      return NextResponse.json({ error: 'Valid email required' }, { status: 400 });
    }
    
    const normalizedEmail = email.toLowerCase().trim();
    
    // Check if user already exists in this org
    const existingUser = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });
    
    if (existingUser) {
      const existingOrgUser = await prisma.organizationUser.findFirst({
        where: { organizationId: orgId, userId: existingUser.id },
      });
      
      if (existingOrgUser) {
        return NextResponse.json({ error: 'User already has access to this organization' }, { status: 400 });
      }
    }
    
    // Check if invite already exists
    const existingInvite = await prisma.invite.findFirst({
      where: { organizationId: orgId, email: normalizedEmail },
    });
    
    if (existingInvite) {
      return NextResponse.json({ error: 'Invite already sent to this email' }, { status: 400 });
    }
    
    // Create the invite
    const invite = await prisma.invite.create({
      data: {
        organizationId: orgId,
        email: normalizedEmail,
        role: role === 'admin' ? 'owner' : 'member',
        invitedBy: authUser?.id,
      },
    });

    return NextResponse.json({ invite, message: 'Invite created. User will be added when they sign in.' });
  } catch (error) {
    console.error('Error creating invite:', error);
    return NextResponse.json({ error: 'Failed to create invite' }, { status: 500 });
  }
}

// DELETE - remove an invite
export async function DELETE(request: Request) {
  try {
    const orgId = await getCurrentOrgId();
    const supabase = await createClient();
    const { data: { user: authUser } } = await supabase.auth.getUser();
    
    // Check if current user is admin
    const currentOrgUser = await prisma.organizationUser.findFirst({
      where: { organizationId: orgId, userId: authUser?.id },
    });
    
    if (!currentOrgUser || (currentOrgUser.role !== 'owner' && currentOrgUser.role !== 'admin')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }
    
    const { searchParams } = new URL(request.url);
    const inviteId = searchParams.get('id');
    
    if (!inviteId) {
      return NextResponse.json({ error: 'Missing invite id' }, { status: 400 });
    }
    
    await prisma.invite.delete({
      where: { id: inviteId },
    });
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting invite:', error);
    return NextResponse.json({ error: 'Failed to delete invite' }, { status: 500 });
  }
}
