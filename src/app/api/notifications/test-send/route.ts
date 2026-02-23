import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getDb } from '@/lib/mongodb';
import admin from '@/lib/firebase-admin';

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Fetch the FCM token saved for the current user
  const db = await getDb();
  const record = await db.collection('fcm_tokens').findOne({ userId });

  if (!record?.token) {
    return NextResponse.json(
      { error: 'No FCM token found for this user. Make sure push notifications are enabled in your browser.' },
      { status: 404 }
    );
  }

  const { title = 'Test Notification', body = 'Push notifications are working! 🎉' } = await req.json().catch(() => ({}));

  const result = await admin.messaging().send({
    token: record.token,
    notification: { title, body },
    webpush: {
      notification: {
        icon: '/favicon/android-chrome-192x192.png',
        badge: '/favicon/android-chrome-192x192.png',
      },
    },
  });

  return NextResponse.json({ success: true, messageId: result });
}
