'use client';

import { useEffect } from 'react';
import { useAuth } from '@clerk/nextjs';
import { getToken, onMessage } from 'firebase/messaging';
import { getFirebaseMessaging } from '@/lib/firebase';

const VAPID_KEY = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY;

export function usePushNotifications() {
  const { isSignedIn } = useAuth();

  useEffect(() => {
    if (!isSignedIn || !VAPID_KEY) return;
    if (typeof window === 'undefined' || !('Notification' in window) || !('serviceWorker' in navigator)) return;

    const init = async () => {
      try {
        const permission = await Notification.requestPermission();
        if (permission !== 'granted') return;

        const messaging = await getFirebaseMessaging();
        if (!messaging) return;

        // Register the Firebase messaging SW separately so it doesn't
        // conflict with the next-pwa caching SW (sw.js at scope '/').
        const swReg = await navigator.serviceWorker.register(
          '/firebase-messaging-sw.js',
          { scope: '/firebase-push/' }
        );

        const token = await getToken(messaging, {
          vapidKey: VAPID_KEY,
          serviceWorkerRegistration: swReg,
        });

        if (token) {
          await fetch('/api/notifications/save-token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ token }),
          });
        }

        // Handle foreground messages (app is open and in focus)
        onMessage(messaging, (payload) => {
          const title = payload.notification?.title || 'CELPIP Practice Test';
          const body = payload.notification?.body || '';
          new Notification(title, {
            body,
            icon: '/favicon/android-chrome-192x192.png',
          });
        });
      } catch (err) {
        console.error('[Push] Setup failed:', err);
      }
    };

    init();
  }, [isSignedIn]);
}
