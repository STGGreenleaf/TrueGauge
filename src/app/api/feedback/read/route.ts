import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';

// POST - User marks their feedback reply as read
export async function POST(request: Request) {
  try {
    const user = await getSession();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await request.json();

    if (!id) {
      return NextResponse.json({ error: 'Feedback ID required' }, { status: 400 });
    }

    // Verify the feedback belongs to this user
    const feedback = await prisma.feedback.findUnique({
      where: { id },
      include: { user: true },
    });

    if (!feedback || feedback.user.email !== user.email) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    // Mark as read (change status from 'replied' to 'read')
    await prisma.feedback.update({
      where: { id },
      data: { status: 'read' },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error marking feedback as read:', error);
    return NextResponse.json({ error: 'Failed to mark as read' }, { status: 500 });
  }
}
