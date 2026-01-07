import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { DayEntrySchema } from '@/lib/types';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const date = searchParams.get('date');
    const month = searchParams.get('month'); // Format: YYYY-MM
    
    if (date) {
      const entry = await prisma.dayEntry.findUnique({
        where: { date },
      });
      return NextResponse.json(entry);
    }
    
    if (month) {
      const entries = await prisma.dayEntry.findMany({
        where: {
          date: {
            startsWith: month,
          },
        },
        orderBy: { date: 'asc' },
      });
      return NextResponse.json(entries);
    }
    
    // Return all entries
    const entries = await prisma.dayEntry.findMany({
      orderBy: { date: 'desc' },
    });
    return NextResponse.json(entries);
  } catch (error) {
    console.error('Error fetching day entries:', error);
    return NextResponse.json(
      { error: 'Failed to fetch day entries' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const validated = DayEntrySchema.parse(body);
    
    const entry = await prisma.dayEntry.upsert({
      where: { date: validated.date },
      update: {
        netSalesExTax: validated.netSalesExTax,
        notes: validated.notes,
      },
      create: {
        date: validated.date,
        netSalesExTax: validated.netSalesExTax,
        notes: validated.notes,
      },
    });
    
    return NextResponse.json(entry);
  } catch (error) {
    console.error('Error creating day entry:', error);
    return NextResponse.json(
      { error: 'Failed to create day entry' },
      { status: 500 }
    );
  }
}
