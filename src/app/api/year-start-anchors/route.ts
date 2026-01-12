import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentOrgId, assertNotShowcase } from '@/lib/org';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const showcase = searchParams.get('showcase') === 'true';
  const isNewUser = searchParams.get('newUser') === 'true';
  
  // New user simulation - return empty array
  if (isNewUser) {
    return NextResponse.json([]);
  }
  
  const orgId = showcase ? 'showcase-template' : await getCurrentOrgId();
  if (!orgId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const anchors = await prisma.yearStartAnchor.findMany({
    where: { organizationId: orgId },
    orderBy: { year: 'desc' },
  });

  return NextResponse.json(anchors);
}

export async function POST(request: NextRequest) {
  const orgId = await getCurrentOrgId();
  if (!orgId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  assertNotShowcase(orgId);

  const body = await request.json();
  const { year, amount, date, note } = body;

  if (typeof amount !== 'number' || !date || !year) {
    return NextResponse.json({ error: 'Invalid data' }, { status: 400 });
  }

  // Upsert - update if exists for this year, otherwise create
  const anchor = await prisma.yearStartAnchor.upsert({
    where: { organizationId_year: { organizationId: orgId, year } },
    update: { amount, date, note },
    create: { organizationId: orgId, year, amount, date, note },
  });

  // Also update Settings with the most recent year's data
  const latestAnchor = await prisma.yearStartAnchor.findFirst({
    where: { organizationId: orgId },
    orderBy: { year: 'desc' },
  });

  if (latestAnchor) {
    await prisma.settings.update({
      where: { organizationId: orgId },
      data: {
        yearStartCashAmount: latestAnchor.amount,
        yearStartCashDate: latestAnchor.date,
      },
    });
  }

  return NextResponse.json(anchor);
}

export async function DELETE(request: NextRequest) {
  const orgId = await getCurrentOrgId();
  if (!orgId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  assertNotShowcase(orgId);

  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  if (!id) {
    return NextResponse.json({ error: 'Missing id' }, { status: 400 });
  }

  // Verify ownership
  const anchor = await prisma.yearStartAnchor.findFirst({
    where: { id, organizationId: orgId },
  });

  if (!anchor) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  await prisma.yearStartAnchor.delete({ where: { id } });

  return NextResponse.json({ success: true });
}
