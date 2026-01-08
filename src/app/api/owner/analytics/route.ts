import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';

const OWNER_EMAIL = 'collingreenleaf@gmail.com';

// GET - Owner-only platform analytics
export async function GET() {
  try {
    const user = await getSession();
    if (!user || user.email !== OWNER_EMAIL) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Total organizations (excluding showcase-template)
    const totalOrgs = await prisma.organization.count({
      where: { id: { not: 'showcase-template' } },
    });

    // Total users
    const totalUsers = await prisma.user.count();

    // Users per org breakdown
    const orgUserCounts = await prisma.organizationUser.groupBy({
      by: ['organizationId'],
      _count: { userId: true },
    });

    // Get org details
    const orgs = await prisma.organization.findMany({
      where: { id: { not: 'showcase-template' } },
      include: {
        settings: { select: { businessName: true, monthlyFixedNut: true } },
        users: { include: { user: { select: { email: true, name: true } } } },
        _count: { select: { dayEntries: true, expenses: true } },
      },
    });

    // Calculate health metrics from settings
    const healthMetrics = {
      totalStores: totalOrgs,
      totalUsers,
      avgUsersPerStore: totalOrgs > 0 ? Math.round((totalUsers / totalOrgs) * 10) / 10 : 0,
      storesWithData: orgs.filter(o => o._count.dayEntries > 0).length,
      storesInactive: orgs.filter(o => o._count.dayEntries === 0).length,
    };

    // Store details for owner view
    const storeDetails = orgs.map(org => ({
      id: org.id,
      name: org.settings?.businessName || org.name,
      monthlyNut: org.settings?.monthlyFixedNut || 0,
      userCount: org.users.length,
      users: org.users.map(u => ({
        email: u.user.email,
        name: u.user.name,
        role: u.role,
      })),
      dayEntries: org._count.dayEntries,
      expenses: org._count.expenses,
      createdAt: org.createdAt,
    }));

    // Activity stats (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const recentActivity = await prisma.userActivity.groupBy({
      by: ['userId'],
      where: { createdAt: { gte: thirtyDaysAgo } },
      _count: { id: true },
    });

    const userActivityMap = new Map(recentActivity.map(a => [a.userId, a._count.id]));

    // Feedback stats
    const feedbackStats = {
      unread: await prisma.feedback.count({ where: { status: 'unread' } }),
      total: await prisma.feedback.count(),
    };

    return NextResponse.json({
      healthMetrics,
      storeDetails,
      feedbackStats,
      userActivity: {
        activeUsers30d: recentActivity.length,
        totalActions30d: recentActivity.reduce((sum, a) => sum + a._count.id, 0),
      },
    });
  } catch (error) {
    console.error('Error fetching analytics:', error);
    return NextResponse.json({ error: 'Failed to fetch analytics' }, { status: 500 });
  }
}
