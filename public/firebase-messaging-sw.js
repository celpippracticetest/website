// Firebase Messaging Service Worker
// Handles background push notifications when the app is not in the foreground.
//
// IMPORTANT: Replace the placeholder values below with your actual Firebase config.
// Get these from: Firebase Console > Project Settings > Your apps > Web app

importScripts('https://www.gstatic.com/firebasejs/12.9.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/12.9.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: "REPLACE_WITH_YOUR_API_KEY",
  authDomain: "REPLACE_WITH_YOUR_AUTH_DOMAIN",
  projectId: "REPLACE_WITH_YOUR_PROJECT_ID",
  storageBucket: "REPLACE_WITH_YOUR_STORAGE_BUCKET",
  messagingSenderId: "REPLACE_WITH_YOUR_MESSAGING_SENDER_ID",
  appId: "REPLACE_WITH_YOUR_APP_ID",
});

const messaging = firebase.messaging();

// Handle background messages (app is closed or not in focus)
messaging.onBackgroundMessage((payload) => {
  const title = payload.notification?.title || 'CELPIP Practice Test';
  const body = payload.notification?.body || '';
  const icon = payload.notification?.icon || '/favicon/android-chrome-192x192.png';

  self.registration.showNotification(title, {
    body,
    icon,
    badge: '/favicon/android-chrome-192x192.png',
    data: payload.data || {},
  });
});
