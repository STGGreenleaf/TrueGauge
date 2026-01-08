import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { getOrCreateSettings } from '@/lib/org';

// Global settings stored under showcase-template org
const GLOBAL_ORG_ID = 'showcase-template';

export async function GET() {
  try {
    const settings = await getOrCreateSettings(GLOBAL_ORG_ID);
    return NextResponse.json({ duration: settings.splashDuration || 3000 });
  } catch (error) {
    console.error('Error fetching splash duration:', error);
    return NextResponse.json({ duration: 3000 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const duration = Math.max(1000, Math.min(8000, body.duration || 3000));
    
    // Update global settings (showcase-template)
    await prisma.settings.update({
      where: { organizationId: GLOBAL_ORG_ID },
      data: { splashDuration: duration },
    });
    
    return NextResponse.json({ success: true, duration });
  } catch (error) {
    console.error('Error updating splash duration:', error);
    return NextResponse.json(
      { error: 'Failed to update splash duration' },
      { status: 500 }
    );
  }
}
