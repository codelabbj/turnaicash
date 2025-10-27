# Quick Start: Firebase Notifications for Next.js + Capacitor

Copy-paste ready code for adding Firebase notifications to your Next.js + Capacitor project.

## 🚀 1. Install Dependencies

```bash
npm install firebase @capacitor/push-notifications @capacitor-firebase/messaging
npx cap sync
```

---

## 📝 2. Environment Variables (.env.local)

```env
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789
NEXT_PUBLIC_FIREBASE_APP_ID=1:123456789:web:abcdef
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=G-XXXXXXXXXX
NEXT_PUBLIC_FIREBASE_VAPID_KEY=your_vapid_key
```

---

## 🔧 3. Firebase Service (lib/firebase-notifications.ts)

```typescript
import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import { getMessaging, getToken, onMessage, Messaging } from 'firebase/messaging';
import { Capacitor } from '@capacitor/core';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

let app: FirebaseApp;
if (getApps().length === 0) {
  app = initializeApp(firebaseConfig);
} else {
  app = getApps()[0];
}

let messaging: Messaging | null = null;
if (typeof window !== 'undefined' && Capacitor.getPlatform() === 'web') {
  messaging = getMessaging(app);
}

const vapidKey = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY;

export class NotificationService {
  private token: string | null = null;
  private platform: string = 'web';

  async initialize() {
    if (typeof window === 'undefined') return;

    this.platform = Capacitor.getPlatform() as string;

    try {
      if (this.platform === 'web') {
        await this.initWeb();
      } else {
        await this.initMobile();
      }
    } catch (error) {
      console.error('Notification init error:', error);
    }
  }

  private async initWeb() {
    if (!messaging) return;

    const permission = await Notification.requestPermission();
    if (permission !== 'granted') return;

    this.token = await getToken(messaging, { vapidKey });
    if (this.token) {
      console.log('FCM Token (Web):', this.token);
      localStorage.setItem('fcm_token', this.token);
    }

    onMessage(messaging, (payload) => {
      console.log('Message received:', payload);
    });
  }

  private async initMobile() {
    const { PushNotifications } = await import('@capacitor/push-notifications');
    const { FirebaseMessaging } = await import('@capacitor-firebase/messaging');

    const status = await PushNotifications.requestPermissions();
    if (status.receive !== 'granted') return;

    await PushNotifications.register();

    const result = await FirebaseMessaging.getToken();
    this.token = result.token;
    
    if (this.token) {
      console.log('FCM Token (Mobile):', this.token);
      localStorage.setItem('fcm_token', this.token);
    }

    PushNotifications.addListener('pushNotificationReceived', (notification) => {
      console.log('Notification received:', notification);
    });
  }

  getToken() {
    return this.token || localStorage.getItem('fcm_token');
  }

  getPlatform() {
    return this.platform;
  }
}

export const notificationService = new NotificationService();
export default app;
```

---

## 📄 4. Service Worker (public/firebase-messaging-sw.js)

```javascript
importScripts('https://www.gstatic.com/firebasejs/11.0.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/11.0.0/firebase-messaging-compat.js');

const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abcdef"
};

firebase.initializeApp(firebaseConfig);
const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  const notificationTitle = payload.notification?.title || 'New Message';
  const notificationOptions = {
    body: payload.notification?.body || 'You have a new message',
    icon: '/icon-192x192.png',
    data: payload.data,
  };
  self.registration.showNotification(notificationTitle, notificationOptions);
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification.data?.url || '/';
  event.waitUntil(
    clients.matchAll().then(clientList => {
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) return clients.openWindow(url);
    })
  );
});
```

**Important:** Replace the config values in `firebase-messaging-sw.js` with your actual Firebase config (from `.env.local` or Firebase Console).

---

## 🎨 5. Use in Your App

```typescript
// app/layout.tsx or any page component
'use client';

import { useEffect } from 'react';
import { notificationService } from '@/lib/firebase-notifications';

export default function Layout({ children }) {
  useEffect(() => {
    notificationService.initialize();
  }, []);

  return <div>{children}</div>;
}
```

---

## 📱 6. Android Setup

1. **Download `google-services.json`** from Firebase Console → Project Settings → Your Android app
2. **Place it** in `android/app/` directory
3. **Update `android/app/build.gradle`**:
   ```gradle
   apply plugin: 'com.google.gms.google-services'
   ```
4. **Update `android/build.gradle`**:
   ```gradle
   dependencies {
       classpath 'com.google.gms:google-services:4.4.0'
   }
   ```

---

## 📱 7. iOS Setup

1. **Download `GoogleService-Info.plist`** from Firebase Console → Project Settings → Your iOS app
2. **Open Xcode**: `npx cap open ios`
3. **Add the file** to the project at root level (drag & drop in Xcode)
4. **Install pods**: In terminal, `cd ios/App && pod install`

---

## 🧪 8. Test

### Web:
```bash
npm run dev
# Open browser console, look for "FCM Token"
```

### Mobile:
```bash
npm run build
npx cap sync
npx cap run android  # or ios
```

### Send Test Message:
1. Go to Firebase Console → Cloud Messaging
2. Click "Send your first message"
3. Enter your FCM token
4. Send!

---

## ✅ Done!

Your Next.js + Capacitor app now receives Firebase notifications on web, Android, and iOS.

**Next Steps:**
- Customize notification appearance
- Handle notification clicks/deep linking
- Store tokens in your backend database
- Set up token refresh logic


