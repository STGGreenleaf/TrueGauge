import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentOrgId } from '@/lib/org';
import { getGravatarUrl } from '@/lib/gravatar';
import { createClient } from '@/lib/supabase/server';

export async function GET() {
  try {
    const orgId = await getCurrentOrgId();
    const supabase = await createClient();
    const { data: { user: authUser } } = await supabase.auth.getUser();
    
    // Get all users who have access to this organization
    const orgUsers = await prisma.organizationUser.findMany({
      where: { organizationId: orgId },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    const users = orgUsers.map((ou) => ({
      id: ou.user.id,
      visibleId: ou.id,
      email: ou.user.email,
      name: ou.user.name,
      role: ou.role === 'owner' ? 'admin' : ou.role,
      joinedAt: ou.createdAt,
      avatarUrl: getGravatarUrl(ou.user.email, 80),
    }));

    // Find current user's role
    const currentUserRole = orgUsers.find(ou => ou.user.id === authUser?.id)?.role;
    const isAdmin = currentUserRole === 'owner' || currentUserRole === 'admin';

    return NextResponse.json({ users, currentUserId: authUser?.id, isAdmin });
  } catch (error) {
    console.error('Error fetching users:', error);
    return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
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
    
    const { visibleId, role } = await request.json();
    
    // Update user role
    await prisma.organizationUser.update({
      where: { id: visibleId },
      data: { role: role === 'admin' ? 'owner' : 'member' },
    });
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating user:', error);
    return NextResponse.json({ error: 'Failed to update user' }, { status: 500 });
  }
}

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
    const visibleId = searchParams.get('id');
    
    if (!visibleId) {
      return NextResponse.json({ error: 'Missing user id' }, { status: 400 });
    }
    
    // Don't allow removing yourself
    const targetUser = await prisma.organizationUser.findUnique({
      where: { id: visibleId },
    });
    
    if (targetUser?.userId === authUser?.id) {
      return NextResponse.json({ error: 'Cannot remove yourself' }, { status: 400 });
    }
    
    // Remove user from organization
    await prisma.organizationUser.delete({
      where: { id: visibleId },
    });
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error removing user:', error);
    return NextResponse.json({ error: 'Failed to remove user' }, { status: 500 });
  }
}
