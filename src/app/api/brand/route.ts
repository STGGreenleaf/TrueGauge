import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { getOrCreateSettings } from '@/lib/org';

// Global settings stored under showcase-template org (same as splash duration)
const GLOBAL_ORG_ID = 'showcase-template';

export async function GET() {
  try {
    const settings = await getOrCreateSettings(GLOBAL_ORG_ID);
    return NextResponse.json({
      ogTitle: settings.ogTitle || 'TrueGauge - Precision Business Health',
      ogDescription: settings.ogDescription || 'Your instrument panel for business clarity',
      seoTitle: settings.seoTitle || 'TrueGauge',
      seoDescription: settings.seoDescription || 'Business health dashboard for smart operators',
      seoKeywords: settings.seoKeywords?.split(', ') || ['business dashboard', 'financial health'],
      robotsIndex: settings.robotsIndex ?? true,
      robotsFollow: settings.robotsFollow ?? true,
    });
  } catch (error) {
    console.error('Error fetching brand settings:', error);
    return NextResponse.json({
      ogTitle: 'TrueGauge - Precision Business Health',
      ogDescription: 'Your instrument panel for business clarity',
      seoTitle: 'TrueGauge',
      seoDescription: 'Business health dashboard for smart operators',
      seoKeywords: ['business dashboard', 'financial health'],
      robotsIndex: true,
      robotsFollow: true,
    });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Update global settings in Supabase
    await prisma.settings.update({
      where: { organizationId: GLOBAL_ORG_ID },
      data: {
        ogTitle: body.ogTitle || 'TrueGauge',
        ogDescription: body.ogDescription || '',
        seoTitle: body.seoTitle || 'TrueGauge',
        seoDescription: body.seoDescription || '',
        seoKeywords: Array.isArray(body.seoKeywords) 
          ? body.seoKeywords.join(', ') 
          : body.seoKeywords || '',
        robotsIndex: body.robotsIndex ?? true,
        robotsFollow: body.robotsFollow ?? true,
      },
    });
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to save brand config:', error);
    return NextResponse.json({ error: 'Failed to save' }, { status: 500 });
  }
}
