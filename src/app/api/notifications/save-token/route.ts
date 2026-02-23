import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getDb } from '@/lib/mongodb';

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { token } = await req.json();
  if (!token || typeof token !== 'string') {
    return NextResponse.json({ error: 'Invalid token' }, { status: 400 });
  }

  const db = await getDb();
  await db.collection('fcm_tokens').updateOne(
    { userId },
    { $set: { userId, token, updatedAt: new Date() } },
    { upsert: true }
  );

  return NextResponse.json({ success: true });
}
