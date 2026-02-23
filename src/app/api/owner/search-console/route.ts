import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { google } from 'googleapis';

const OWNER_USER_ID = process.env.OWNER_USER_ID;
const SITE_URL = 'https://www.truegauge.app/';

async function getSearchConsoleClient() {
  const keyJson = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;
  if (!keyJson) {
    throw new Error('GOOGLE_SERVICE_ACCOUNT_KEY not configured');
  }
  
  const credentials = JSON.parse(keyJson);
  
  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/webmasters.readonly'],
  });
  
  return google.searchconsole({ version: 'v1', auth });
}

export async function GET() {
  try {
    const user = await getSession();
    if (!user || !OWNER_USER_ID || user.id !== OWNER_USER_ID) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const searchconsole = await getSearchConsoleClient();
    
    // Get data for last 28 days
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 28);
    
    const formatDate = (d: Date) => d.toISOString().split('T')[0];

    // Fetch search analytics
    const response = await searchconsole.searchanalytics.query({
      siteUrl: SITE_URL,
      requestBody: {
        startDate: formatDate(startDate),
        endDate: formatDate(endDate),
        dimensions: ['query'],
        rowLimit: 20,
      },
    });

    // Fetch daily totals for chart
    const dailyResponse = await searchconsole.searchanalytics.query({
      siteUrl: SITE_URL,
      requestBody: {
        startDate: formatDate(startDate),
        endDate: formatDate(endDate),
        dimensions: ['date'],
      },
    });

    // Fetch page performance
    const pageResponse = await searchconsole.searchanalytics.query({
      siteUrl: SITE_URL,
      requestBody: {
        startDate: formatDate(startDate),
        endDate: formatDate(endDate),
        dimensions: ['page'],
        rowLimit: 10,
      },
    });

    // Calculate totals
    const totals = {
      clicks: 0,
      impressions: 0,
      ctr: 0,
      position: 0,
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rows = (response.data.rows || []) as any[];
    if (rows.length > 0) {
      for (const row of rows) {
        totals.clicks += row.clicks || 0;
        totals.impressions += row.impressions || 0;
      }
      totals.ctr = totals.impressions > 0 ? (totals.clicks / totals.impressions) * 100 : 0;
      totals.position = rows.reduce((sum: number, r: { position?: number }) => sum + (r.position || 0), 0) / rows.length;
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const queryRows = (response.data.rows || []) as any[];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const dailyRows = (dailyResponse.data.rows || []) as any[];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const pageRows = (pageResponse.data.rows || []) as any[];
    
    return NextResponse.json({
      totals: {
        clicks: totals.clicks,
        impressions: totals.impressions,
        ctr: Math.round(totals.ctr * 100) / 100,
        avgPosition: Math.round(totals.position * 10) / 10,
      },
      queries: queryRows.map(row => ({
        query: row.keys?.[0] || '',
        clicks: row.clicks || 0,
        impressions: row.impressions || 0,
        ctr: Math.round((row.ctr || 0) * 10000) / 100,
        position: Math.round((row.position || 0) * 10) / 10,
      })),
      daily: dailyRows.map(row => ({
        date: row.keys?.[0] || '',
        clicks: row.clicks || 0,
        impressions: row.impressions || 0,
      })),
      pages: pageRows.map(row => ({
        page: row.keys?.[0]?.replace('https://www.truegauge.app', '') || '/',
        clicks: row.clicks || 0,
        impressions: row.impressions || 0,
      })),
      dateRange: {
        start: formatDate(startDate),
        end: formatDate(endDate),
      },
    });
  } catch (error) {
    console.error('Search Console API error:', error);
    return NextResponse.json({ 
      error: 'Failed to fetch Search Console data',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
