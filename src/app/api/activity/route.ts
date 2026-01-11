import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';

// Owner user ID (Supabase auth UUID) - set via environment variable
const OWNER_USER_ID = process.env.OWNER_USER_ID;

// POST - Track user activity (page view, action, etc.)
export async function POST(request: Request) {
  try {
    const user = await getSession();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { action, page, metadata, organizationId } = await request.json();

    if (!action) {
      return NextResponse.json({ error: 'Action required' }, { status: 400 });
    }

    const dbUser = await prisma.user.findUnique({
      where: { id: user.id },
      include: { organizations: true },
    });

    if (!dbUser || dbUser.organizations.length === 0) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const orgId = organizationId || dbUser.organizations[0].organizationId;

    await prisma.userActivity.create({
      data: {
        userId: dbUser.id,
        organizationId: orgId,
        action,
        page,
        metadata: metadata ? JSON.stringify(metadata) : null,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error tracking activity:', error);
    return NextResponse.json({ error: 'Failed to track activity' }, { status: 500 });
  }
}

// GET - Owner gets activity analytics
export async function GET(request: Request) {
  try {
    const user = await getSession();
    if (!user || !OWNER_USER_ID || user.id !== OWNER_USER_ID) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const days = parseInt(searchParams.get('days') || '30');
    const since = new Date();
    since.setDate(since.getDate() - days);

    // Get activity counts by user
    const activities = await prisma.userActivity.groupBy({
      by: ['userId'],
      where: { createdAt: { gte: since } },
      _count: { id: true },
    });

    // Get user details
    const userIds = activities.map(a => a.userId);
    const users = await prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, email: true, name: true },
    });

    const userMap = new Map(users.map(u => [u.id, u]));

    const result = activities.map(a => ({
      user: userMap.get(a.userId),
      activityCount: a._count.id,
      dailyAverage: Math.round((a._count.id / days) * 10) / 10,
    }));

    return NextResponse.json(result.sort((a, b) => b.activityCount - a.activityCount));
  } catch (error) {
    console.error('Error fetching activity:', error);
    return NextResponse.json({ error: 'Failed to fetch activity' }, { status: 500 });
  }
}
