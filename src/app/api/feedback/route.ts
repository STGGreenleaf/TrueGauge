import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';

const OWNER_EMAIL = 'collingreenleaf@gmail.com';

// GET - Fetch feedback (owner gets all, users get their own with replies)
export async function GET(request: Request) {
  try {
    const user = await getSession();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');

    // Owner sees all feedback
    if (user.email === OWNER_EMAIL) {
      const feedback = await prisma.feedback.findMany({
        where: status ? { status } : undefined,
        include: {
          user: { select: { email: true, name: true, avatarUrl: true } },
          organization: { select: { name: true } },
        },
        orderBy: { createdAt: 'desc' },
      });
      return NextResponse.json(feedback);
    }

    // Regular users see their own feedback (to check for replies)
    const dbUser = await prisma.user.findUnique({
      where: { email: user.email },
      include: { organizations: true },
    });

    if (!dbUser || dbUser.organizations.length === 0) {
      return NextResponse.json([]);
    }

    const feedback = await prisma.feedback.findMany({
      where: { userId: dbUser.id },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(feedback);
  } catch (error) {
    console.error('Error fetching feedback:', error);
    return NextResponse.json({ error: 'Failed to fetch feedback' }, { status: 500 });
  }
}

// POST - Submit new feedback
export async function POST(request: Request) {
  try {
    const user = await getSession();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { type, message } = await request.json();

    if (!message || message.trim().length === 0) {
      return NextResponse.json({ error: 'Message required' }, { status: 400 });
    }

    const dbUser = await prisma.user.findUnique({
      where: { email: user.email },
      include: { organizations: true },
    });

    if (!dbUser || dbUser.organizations.length === 0) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const feedback = await prisma.feedback.create({
      data: {
        userId: dbUser.id,
        organizationId: dbUser.organizations[0].organizationId,
        type: type || 'feature',
        message: message.trim(),
      },
    });

    return NextResponse.json(feedback);
  } catch (error) {
    console.error('Error creating feedback:', error);
    return NextResponse.json({ error: 'Failed to submit feedback' }, { status: 500 });
  }
}

// PUT - Owner replies to feedback or updates status
export async function PUT(request: Request) {
  try {
    const user = await getSession();
    if (!user || user.email !== OWNER_EMAIL) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id, status, ownerReply } = await request.json();

    if (!id) {
      return NextResponse.json({ error: 'Feedback ID required' }, { status: 400 });
    }

    const updateData: Record<string, unknown> = {};
    if (status) updateData.status = status;
    if (ownerReply !== undefined) {
      updateData.ownerReply = ownerReply;
      updateData.repliedAt = new Date();
    }

    const feedback = await prisma.feedback.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json(feedback);
  } catch (error) {
    console.error('Error updating feedback:', error);
    return NextResponse.json({ error: 'Failed to update feedback' }, { status: 500 });
  }
}

// DELETE - Owner deletes feedback
export async function DELETE(request: Request) {
  try {
    const user = await getSession();
    if (!user || user.email !== OWNER_EMAIL) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Feedback ID required' }, { status: 400 });
    }

    await prisma.feedback.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting feedback:', error);
    return NextResponse.json({ error: 'Failed to delete feedback' }, { status: 500 });
  }
}
