import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { getCurrentOrgId } from '@/lib/org';

interface VendorRecord {
  id: string;
  name: string;
  defaultCategory: string;
  typicalAmount: number | null;
  isRecurring: boolean;
  recurrenceRule: string;
  dueDayOfMonth: number | null;
  autopopulateChecklist: boolean;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const showcase = searchParams.get('showcase') === 'true';
    const isNewUser = searchParams.get('newUser') === 'true';
    
    // New user simulation - return empty vendors
    if (isNewUser) {
      return NextResponse.json([]);
    }
    
    const orgId = showcase ? 'showcase-template' : await getCurrentOrgId();
    const vendors: VendorRecord[] = await prisma.vendorTemplate.findMany({
      where: { organizationId: orgId },
      orderBy: { name: 'asc' },
    });
    
    // Get expense stats per vendor (by name)
    const expenseStats = await prisma.expenseTransaction.groupBy({
      by: ['vendorName'],
      where: { organizationId: orgId },
      _avg: { amount: true },
      _sum: { amount: true },
      _count: { amount: true },
    });
    
    // Map stats to vendors
    const statsMap = new Map(expenseStats.map(s => [s.vendorName, {
      avgSpend: s._avg.amount ? Math.round(s._avg.amount) : null,
      totalSpend: s._sum.amount || 0,
      txCount: s._count.amount || 0,
    }]));
    
    const vendorsWithStats = vendors.map(v => ({
      ...v,
      avgSpend: statsMap.get(v.name)?.avgSpend || null,
      totalSpend: statsMap.get(v.name)?.totalSpend || 0,
      txCount: statsMap.get(v.name)?.txCount || 0,
    }));
    
    return NextResponse.json(vendorsWithStats);
  } catch (error) {
    console.error('Error fetching vendors:', error);
    return NextResponse.json(
      { error: 'Failed to fetch vendors' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const orgId = await getCurrentOrgId();
    const body = await request.json();
    
    const vendor = await prisma.vendorTemplate.create({
      data: {
        organizationId: orgId,
        name: body.name,
        defaultCategory: body.defaultCategory || 'COGS',
        typicalAmount: body.typicalAmount || null,
        isRecurring: body.isRecurring || false,
        recurrenceRule: body.recurrenceRule || 'NONE',
        dueDayOfMonth: body.dueDayOfMonth || null,
        autopopulateChecklist: body.autopopulateChecklist ?? true,
      },
    });
    
    return NextResponse.json(vendor);
  } catch (error) {
    console.error('Error creating vendor:', error);
    return NextResponse.json(
      { error: 'Failed to create vendor' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    
    if (!body.id) {
      return NextResponse.json(
        { error: 'Vendor ID is required' },
        { status: 400 }
      );
    }
    
    const vendor = await prisma.vendorTemplate.update({
      where: { id: body.id },
      data: {
        name: body.name,
        defaultCategory: body.defaultCategory,
        typicalAmount: body.typicalAmount,
        isRecurring: body.isRecurring,
        recurrenceRule: body.recurrenceRule,
        dueDayOfMonth: body.dueDayOfMonth,
        autopopulateChecklist: body.autopopulateChecklist,
      },
    });
    
    return NextResponse.json(vendor);
  } catch (error) {
    console.error('Error updating vendor:', error);
    return NextResponse.json(
      { error: 'Failed to update vendor' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const id = searchParams.get('id');
    
    if (!id) {
      return NextResponse.json(
        { error: 'Vendor ID is required' },
        { status: 400 }
      );
    }
    
    await prisma.vendorTemplate.delete({
      where: { id },
    });
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting vendor:', error);
    return NextResponse.json(
      { error: 'Failed to delete vendor' },
      { status: 500 }
    );
  }
}
