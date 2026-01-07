import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';

interface VendorRecord {
  id: number;
  name: string;
  defaultCategory: string;
  typicalAmount: number | null;
  isRecurring: boolean;
  recurrenceRule: string;
  dueDayOfMonth: number | null;
  autopopulateChecklist: boolean;
}

export async function GET() {
  try {
    const vendors: VendorRecord[] = await prisma.vendorTemplate.findMany({
      orderBy: { name: 'asc' },
    });
    
    return NextResponse.json(vendors);
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
    const body = await request.json();
    
    const vendor = await prisma.vendorTemplate.create({
      data: {
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
      where: { id: parseInt(id) },
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
