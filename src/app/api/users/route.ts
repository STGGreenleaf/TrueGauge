import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentOrgId } from '@/lib/org';

export async function GET() {
  try {
    const orgId = await getCurrentOrgId();
    
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
      email: ou.user.email,
      name: ou.user.name,
      role: ou.role,
      joinedAt: ou.createdAt,
    }));

    return NextResponse.json({ users });
  } catch (error) {
    console.error('Error fetching users:', error);
    return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 });
  }
}
