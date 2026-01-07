import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { ExpenseTransactionSchema } from '@/lib/types';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const month = searchParams.get('month'); // Format: YYYY-MM
    const category = searchParams.get('category');
    
    const where: Record<string, unknown> = {};
    
    if (month) {
      where.date = { startsWith: month };
    }
    
    if (category) {
      where.category = category;
    }
    
    const expenses = await prisma.expenseTransaction.findMany({
      where,
      orderBy: { date: 'desc' },
      include: { vendor: true },
    });
    
    return NextResponse.json(expenses);
  } catch (error) {
    console.error('Error fetching expenses:', error);
    return NextResponse.json(
      { error: 'Failed to fetch expenses' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const validated = ExpenseTransactionSchema.parse(body);
    
    const expense = await prisma.expenseTransaction.create({
      data: {
        date: validated.date,
        vendorId: validated.vendorId,
        vendorName: validated.vendorName,
        category: validated.category,
        amount: validated.amount,
        memo: validated.memo,
        spreadMonths: validated.spreadMonths,
      },
    });
    
    return NextResponse.json(expense);
  } catch (error) {
    console.error('Error creating expense:', error);
    return NextResponse.json(
      { error: 'Failed to create expense' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    
    if (!id) {
      return NextResponse.json(
        { error: 'ID is required' },
        { status: 400 }
      );
    }
    
    await prisma.expenseTransaction.delete({
      where: { id: parseInt(id) },
    });
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting expense:', error);
    return NextResponse.json(
      { error: 'Failed to delete expense' },
      { status: 500 }
    );
  }
}
