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

    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    // Total organizations (excluding showcase-template)
    const totalOrgs = await prisma.organization.count({
      where: { id: { not: 'showcase-template' } },
    });

    // Total users
    const totalUsers = await prisma.user.count();

    // Get org details with more data
    const orgs = await prisma.organization.findMany({
      where: { id: { not: 'showcase-template' } },
      include: {
        settings: { select: { businessName: true, monthlyFixedNut: true } },
        users: { include: { user: { select: { id: true, email: true, name: true } } } },
        _count: { select: { dayEntries: true, expenses: true } },
      },
    });

    // Get all users with their activity
    const allUsers = await prisma.user.findMany({
      include: {
        organizations: { include: { organization: { include: { settings: true } } } },
      },
    });

    // Get all activity for heatmap (last 7 days)
    const activityForHeatmap = await prisma.userActivity.findMany({
      where: { createdAt: { gte: sevenDaysAgo } },
      select: { createdAt: true },
    });

    // Build heatmap data (7 days x 24 hours)
    const heatmapData: number[][] = Array(7).fill(null).map(() => Array(24).fill(0));
    for (const activity of activityForHeatmap) {
      const date = new Date(activity.createdAt);
      const dayIndex = (date.getDay() + 6) % 7; // Mon=0, Sun=6
      const hour = date.getHours();
      heatmapData[dayIndex][hour]++;
    }

    // Page popularity
    const pageActivity = await prisma.userActivity.groupBy({
      by: ['page'],
      where: { createdAt: { gte: thirtyDaysAgo }, page: { not: null } },
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
      take: 10,
    });

    // Action frequency
    const actionFrequency = await prisma.userActivity.groupBy({
      by: ['action'],
      where: { createdAt: { gte: thirtyDaysAgo } },
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
      take: 10,
    });

    // Session stats
    const sessions = await prisma.userSession.findMany({
      where: { startedAt: { gte: thirtyDaysAgo } },
      select: { userId: true, durationMs: true, pagesViewed: true, startedAt: true },
    });

    const avgSessionDuration = sessions.length > 0
      ? Math.round(sessions.filter(s => s.durationMs).reduce((sum, s) => sum + (s.durationMs || 0), 0) / sessions.filter(s => s.durationMs).length / 1000)
      : 0;

    const avgPagesPerSession = sessions.length > 0
      ? Math.round(sessions.reduce((sum, s) => sum + s.pagesViewed, 0) / sessions.length * 10) / 10
      : 0;

    // User engagement scores and last seen
    const userActivityCounts = await prisma.userActivity.groupBy({
      by: ['userId'],
      where: { createdAt: { gte: thirtyDaysAgo } },
      _count: { id: true },
    });

    const lastActivityByUser = await prisma.userActivity.findMany({
      distinct: ['userId'],
      orderBy: { createdAt: 'desc' },
      select: { userId: true, createdAt: true },
    });

    const lastSeenMap = new Map(lastActivityByUser.map(a => [a.userId, a.createdAt]));
    const activityCountMap = new Map(userActivityCounts.map(a => [a.userId, a._count.id]));

    // Calculate engagement scores
    const userEngagement = allUsers.map(u => {
      const activityCount = activityCountMap.get(u.id) || 0;
      const lastSeen = lastSeenMap.get(u.id);
      const daysSinceActive = lastSeen ? Math.floor((now.getTime() - new Date(lastSeen).getTime()) / (24 * 60 * 60 * 1000)) : 999;
      
      let status: 'active' | 'moderate' | 'dormant' | 'inactive' = 'inactive';
      let score = 0;
      
      if (daysSinceActive <= 1) { status = 'active'; score = 100; }
      else if (daysSinceActive <= 7) { status = 'moderate'; score = 70; }
      else if (daysSinceActive <= 30) { status = 'dormant'; score = 30; }
      else { status = 'inactive'; score = 0; }
      
      score = Math.min(100, score + Math.min(30, activityCount));

      const orgName = u.organizations[0]?.organization?.settings?.businessName || u.organizations[0]?.organization?.name || 'Unknown';
      
      return {
        id: u.id,
        email: u.email,
        name: u.name,
        orgName,
        activityCount,
        lastSeen: lastSeen?.toISOString() || null,
        daysSinceActive,
        status,
        score,
      };
    }).sort((a, b) => b.score - a.score);

    // Retention: weekly cohorts
    const weeklyRetention: { week: string; users: number; retained: number }[] = [];
    for (let i = 3; i >= 0; i--) {
      const weekStart = new Date(now.getTime() - (i + 1) * 7 * 24 * 60 * 60 * 1000);
      const weekEnd = new Date(now.getTime() - i * 7 * 24 * 60 * 60 * 1000);
      const nextWeekEnd = new Date(weekEnd.getTime() + 7 * 24 * 60 * 60 * 1000);
      
      const usersInWeek = await prisma.userActivity.groupBy({
        by: ['userId'],
        where: { createdAt: { gte: weekStart, lt: weekEnd } },
      });
      
      const retainedNextWeek = await prisma.userActivity.groupBy({
        by: ['userId'],
        where: {
          userId: { in: usersInWeek.map(u => u.userId) },
          createdAt: { gte: weekEnd, lt: nextWeekEnd },
        },
      });
      
      weeklyRetention.push({
        week: `Week ${4 - i}`,
        users: usersInWeek.length,
        retained: retainedNextWeek.length,
      });
    }

    // Store data health (entry consistency)
    const storeHealth = await Promise.all(orgs.map(async org => {
      const entries = await prisma.dayEntry.findMany({
        where: { organizationId: org.id },
        orderBy: { date: 'desc' },
        take: 30,
        select: { date: true },
      });
      
      const uniqueDates = new Set(entries.map(e => e.date));
      const consistency = Math.round((uniqueDates.size / 30) * 100);
      
      // Calculate streak
      let streak = 0;
      const today = new Date().toISOString().split('T')[0];
      let checkDate = today;
      while (uniqueDates.has(checkDate)) {
        streak++;
        const d = new Date(checkDate);
        d.setDate(d.getDate() - 1);
        checkDate = d.toISOString().split('T')[0];
      }
      
      return {
        id: org.id,
        name: org.settings?.businessName || org.name,
        consistency,
        streak,
        totalEntries: org._count.dayEntries,
        totalExpenses: org._count.expenses,
      };
    }));

    // Feature adoption
    const featureActions = ['day_entry', 'expense', 'goal', 'settings', 'calendar', 'ly_compare'];
    const featureAdoption = await Promise.all(featureActions.map(async feature => {
      const count = await prisma.userActivity.count({
        where: {
          createdAt: { gte: thirtyDaysAgo },
          OR: [
            { action: { contains: feature } },
            { page: { contains: feature } },
          ],
        },
      });
      return { feature, count };
    }));

    // Health metrics
    const healthMetrics = {
      totalStores: totalOrgs,
      totalUsers,
      avgUsersPerStore: totalOrgs > 0 ? Math.round((totalUsers / totalOrgs) * 10) / 10 : 0,
      storesWithData: orgs.filter(o => o._count.dayEntries > 0).length,
      storesInactive: orgs.filter(o => o._count.dayEntries === 0).length,
    };

    // Store details
    const storeDetails = orgs.map(org => ({
      id: org.id,
      name: org.settings?.businessName || org.name,
      monthlyNut: org.settings?.monthlyFixedNut || 0,
      userCount: org.users.length,
      users: org.users.map(u => ({
        id: u.user.id,
        email: u.user.email,
        name: u.user.name,
        role: u.role,
      })),
      dayEntries: org._count.dayEntries,
      expenses: org._count.expenses,
      createdAt: org.createdAt,
    }));

    // Feedback stats
    const feedbackStats = {
      unread: await prisma.feedback.count({ where: { status: 'unread' } }),
      total: await prisma.feedback.count(),
    };

    // Activity summary
    const userActivity = {
      activeUsers30d: userActivityCounts.length,
      totalActions30d: userActivityCounts.reduce((sum, a) => sum + a._count.id, 0),
      totalSessions30d: sessions.length,
      avgSessionDuration,
      avgPagesPerSession,
    };

    return NextResponse.json({
      healthMetrics,
      storeDetails,
      feedbackStats,
      userActivity,
      heatmapData,
      pagePopularity: pageActivity.map(p => ({ page: p.page || 'unknown', count: p._count.id })),
      actionFrequency: actionFrequency.map(a => ({ action: a.action, count: a._count.id })),
      userEngagement,
      weeklyRetention,
      storeHealth,
      featureAdoption,
    });
  } catch (error) {
    console.error('Error fetching analytics:', error);
    return NextResponse.json({ error: 'Failed to fetch analytics' }, { status: 500 });
  }
}
