import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { getCurrentOrgId } from '@/lib/org';

// GET - fetch all cash injections
export async function GET() {
  try {
    const orgId = await getCurrentOrgId();
    const injections = await prisma.cashInjection.findMany({
      where: { organizationId: orgId },
      orderBy: { date: 'asc' },
    });
    return NextResponse.json(injections);
  } catch (error) {
    console.error('Error fetching cash injections:', error);
    return NextResponse.json({ error: 'Failed to fetch' }, { status: 500 });
  }
}

// POST - add new injection or withdrawal
export async function POST(request: Request) {
  try {
    const orgId = await getCurrentOrgId();
    const body = await request.json();
    const { date, amount, note, type = 'injection' } = body;
    
    if (!date || amount === undefined) {
      return NextResponse.json({ error: 'Date and amount required' }, { status: 400 });
    }
    
    const injection = await prisma.cashInjection.create({
      data: {
        organizationId: orgId,
        date,
        amount: Math.abs(amount), // Store as positive
        type, // "injection" or "withdrawal"
        note: note || null,
      },
    });
    
    return NextResponse.json(injection);
  } catch (error) {
    console.error('Error creating cash injection:', error);
    return NextResponse.json({ error: 'Failed to create' }, { status: 500 });
  }
}

// DELETE - remove injection by id
export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    
    if (!id) {
      return NextResponse.json({ error: 'ID required' }, { status: 400 });
    }
    
    await prisma.cashInjection.delete({
      where: { id },
    });
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting cash injection:', error);
    return NextResponse.json({ error: 'Failed to delete' }, { status: 500 });
  }
}
