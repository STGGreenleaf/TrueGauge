import { NextResponse } from 'next/server';
import prisma from '@/lib/db';

// GET - fetch all reference months or by year
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const year = searchParams.get('year');
    
    if (year) {
      const months = await prisma.referenceMonth.findMany({
        where: { year: parseInt(year) },
        orderBy: { month: 'asc' },
      });
      return NextResponse.json(months);
    }
    
    // Return all reference months grouped by year
    const allMonths = await prisma.referenceMonth.findMany({
      orderBy: [{ year: 'desc' }, { month: 'asc' }],
    });
    return NextResponse.json(allMonths);
  } catch (error) {
    console.error('Error fetching reference months:', error);
    return NextResponse.json({ error: 'Failed to fetch reference months' }, { status: 500 });
  }
}

// POST - create or update a reference month (upsert)
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { year, month, referenceNetSalesExTax, note } = body;
    
    if (!year || !month || referenceNetSalesExTax === undefined) {
      return NextResponse.json({ error: 'year, month, and referenceNetSalesExTax are required' }, { status: 400 });
    }
    
    const refMonth = await prisma.referenceMonth.upsert({
      where: { year_month: { year, month } },
      update: { referenceNetSalesExTax, note },
      create: { year, month, referenceNetSalesExTax, note },
    });
    
    return NextResponse.json(refMonth);
  } catch (error) {
    console.error('Error saving reference month:', error);
    return NextResponse.json({ error: 'Failed to save reference month' }, { status: 500 });
  }
}

// PUT - bulk update a year's worth of reference months
export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { year, months } = body; // months: { 1: 25000, 2: 28000, ... }
    
    if (!year || !months) {
      return NextResponse.json({ error: 'year and months object required' }, { status: 400 });
    }
    
    // Upsert each month
    const results = await Promise.all(
      Object.entries(months).map(async ([monthStr, value]) => {
        const month = parseInt(monthStr);
        const amount = value as number;
        
        if (amount > 0) {
          return prisma.referenceMonth.upsert({
            where: { year_month: { year, month } },
            update: { referenceNetSalesExTax: amount },
            create: { year, month, referenceNetSalesExTax: amount },
          });
        } else {
          // Delete if value is 0 or empty
          await prisma.referenceMonth.deleteMany({
            where: { year, month },
          });
          return null;
        }
      })
    );
    
    return NextResponse.json({ success: true, updated: results.filter(Boolean).length });
  } catch (error) {
    console.error('Error bulk updating reference months:', error);
    return NextResponse.json({ error: 'Failed to update reference months' }, { status: 500 });
  }
}
