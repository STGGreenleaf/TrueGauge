import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { getCurrentOrgId } from '@/lib/org';

export async function PUT(request: NextRequest) {
  try {
    const orgId = await getCurrentOrgId();
    const body = await request.json();
    const duration = Math.max(1000, Math.min(8000, body.duration || 3000));
    
    await prisma.settings.update({
      where: { organizationId: orgId },
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
