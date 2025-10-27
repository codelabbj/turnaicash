# Firebase Notifications for Next.js + Capacitor Mobile Apps

Complete guide to add Firebase Cloud Messaging (FCM) notifications to a Next.js app that's converted to mobile using Capacitor.

## 🎯 Overview

When using Capacitor to convert your Next.js app to mobile, you have two notification paths:

### **Web (Browser)**
- Uses `firebase-messaging-sw.js` service worker
- Works in Chrome, Firefox, Safari, Edge
- HTTPS required (or localhost for development)

### **Mobile (iOS/Android via Capacitor)**
- Uses native Firebase SDK via Capacitor plugins
- Requires Capacitor Firebase plugins
- Native notifications with full mobile features

---

## 📦 Step 1: Install Dependencies

### For Web Notifications
```bash
npm install firebase
```

### For Mobile Notifications (Capacitor)
```bash
# Install Capacitor Firebase plugins
npm install @capacitor/push-notifications
npm install @capacitor-firebase/messaging

# Or if using the community plugin
npm install @capacitor-community/fcm
```

### Sync Capacitor
```bash
npx cap sync
```

---

## 🔧 Step 2: Firebase Console Setup

### 1. Create or Use Existing Firebase Project
1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Create a new project or select existing one
3. Enable **Cloud Messaging** (enabled by default)

### 2. Add Web App to Firebase
1. In Firebase Console, click **Add app** → Web
2. Register app with a nickname (e.g., "myapp-web")
3. Copy the Firebase config object

### 3. Generate VAPID Key (for Web Push)
1. Go to **Project Settings** → **Cloud Messaging**
2. Under **Web configuration**, click **Generate key pair**
3. Copy the generated VAPID key

### 4. Add Android App to Firebase
1. Go to **Project Settings**
2. Click **Add app** → Android
3. Enter package name (e.g., `com.example.myapp`)
4. Download `google-services.json`
5. Place it in `android/app/` directory

### 5. Add iOS App to Firebase
1. Go to **Project Settings**
2. Click **Add app** → iOS
3. Enter bundle ID (e.g., `com.example.myapp`)
4. Download `GoogleService-Info.plist`
5. Add to iOS project in Xcode at root level

---

## 📝 Step 3: Environment Variables

Create `.env.local` in your project root:

```env
# Firebase Web Configuration
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789
NEXT_PUBLIC_FIREBASE_APP_ID=1:123456789:web:abcdef
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=G-XXXXXXXXXX

# VAPID Key for Web Push Notifications
NEXT_PUBLIC_FIREBASE_VAPID_KEY=your_vapid_key_here
```

---

## 💻 Step 4: Create Firebase Service

Create `lib/firebase.ts`:

```typescript
import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import { getMessaging, getToken, onMessage } from 'firebase/messaging';
import { isPlatform } from '@ionic/core';
import { Capacitor } from '@capacitor/core';

// Firebase configuration
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

// Initialize Firebase
let app: FirebaseApp;
if (getApps().length === 0) {
  app = initializeApp(firebaseConfig);
} else {
  app = getApps()[0];
}

// Initialize messaging only for web
let messaging = null;
if (typeof window !== 'undefined' && Capacitor.getPlatform() === 'web') {
  messaging = getMessaging(app);
}

export { messaging };

// VAPID key for web push notifications
const vapidKey = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY;

// Unified notification service for Web and Mobile
export class UnifiedFCMService {
  private static instance: UnifiedFCMService;
  private token: string | null = null;
  private isInitialized = false;
  private platform: 'web' | 'ios' | 'android' = 'web';

  private constructor() {
    if (typeof window !== 'undefined') {
      this.platform = Capacitor.getPlatform() as 'web' | 'ios' | 'android';
    }
  }

  public static getInstance(): UnifiedFCMService {
    if (!UnifiedFCMService.instance) {
      UnifiedFCMService.instance = new UnifiedFCMService();
    }
    return UnifiedFCMService.instance;
  }

  /**
   * Initialize FCM service (works for both web and mobile)
   */
  public async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      if (this.platform === 'web') {
        await this.initializeWeb();
      } else {
        await this.initializeMobile();
      }
      this.isInitialized = true;
    } catch (error) {
      console.error('Error initializing FCM:', error);
    }
  }

  /**
   * Initialize web notifications
   */
  private async initializeWeb(): Promise<void> {
    if (typeof window === 'undefined' || !messaging) return;

    // Request notification permission
    const permission = await this.requestNotificationPermission();
    if (permission !== 'granted') {
      console.warn('Notification permission not granted');
      return;
    }

    // Get FCM token
    this.token = await getToken(messaging, { vapidKey });

    if (this.token) {
      console.log('FCM Token (Web):', this.token);
      localStorage.setItem('fcm_token', this.token);
      await this.sendTokenToServer(this.token);
    }

    // Setup foreground message listener
    onMessage(messaging, (payload) => {
      console.log('Foreground message received (Web):', payload);
      // Show custom notification or handle data
    });
  }

  /**
   * Initialize mobile notifications
   */
  private async initializeMobile(): Promise<void> {
    const { PushNotifications } = await import('@capacitor/push-notifications');
    const { FirebaseMessaging } = await import('@capacitor-firebase/messaging');

    // Request permission
    const permissionStatus = await PushNotifications.requestPermissions();
    
    if (permissionStatus.receive === 'granted') {
      // Register for push notifications
      await PushNotifications.register();

      // Get FCM token
      const result = await FirebaseMessaging.getToken();
      this.token = result.token;

      if (this.token) {
        console.log('FCM Token (Mobile):', this.token);
        localStorage.setItem('fcm_token', this.token);
        await this.sendTokenToServer(this.token);
      }

      // Listen for notification received
      PushNotifications.addListener('pushNotificationReceived', (notification) => {
        console.log('Push notification received (Mobile):', notification);
      });

      // Listen for notification action performed
      PushNotifications.addListener('pushNotificationActionPerformed', (notification) => {
        console.log('Push notification action performed:', notification);
      });

      // Listen for FCM messages
      FirebaseMessaging.addListener('message', (message) => {
        console.log('FCM message received (Mobile):', message);
      });
    }
  }

  /**
   * Request notification permission
   */
  public async requestNotificationPermission(): Promise<string> {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      return 'denied';
    }

    if (Notification.permission === 'granted') {
      return 'granted';
    }

    if (Notification.permission === 'denied') {
      return 'denied';
    }

    const permission = await Notification.requestPermission();
    return permission;
  }

  /**
   * Get current FCM token
   */
  public getToken(): string | null {
    return this.token || localStorage.getItem('fcm_token');
  }

  /**
   * Send token to your backend server
   */
  private async sendTokenToServer(token: string): Promise<void> {
    try {
      const response = await fetch('/api/fcm/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          token,
          platform: this.platform,
          userId: null, // Add your user ID logic
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to send token to server');
      }
    } catch (error) {
      console.error('Error sending token to server:', error);
    }
  }

  /**
   * Get platform
   */
  public getPlatform(): string {
    return this.platform;
  }
}

// Export singleton instance
export const unifiedFcmService = UnifiedFCMService.getInstance();

export default app;
```

---

## 📄 Step 5: Service Worker for Web

Create `public/firebase-messaging-sw.js`:

```javascript
// Import Firebase scripts
importScripts('https://www.gstatic.com/firebasejs/11.0.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/11.0.0/firebase-messaging-compat.js');

// Firebase configuration
const firebaseConfig = {
  apiKey: "your_actual_api_key",
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-project-id",
  storageBucket: "your-project.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abcdef",
  measurementId: "G-XXXXXXXXXX"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);

// Initialize Firebase Messaging
const messaging = firebase.messaging();

console.log('[firebase-messaging-sw.js] Firebase initialized');

// Handle background messages
messaging.onBackgroundMessage((payload) => {
  console.log('Received background message:', payload);

  const notificationTitle = payload.notification?.title || 'New Message';
  const notificationOptions = {
    body: payload.notification?.body || 'You have a new message',
    icon: payload.notification?.icon || '/icon-192x192.png',
    badge: '/badge-72x72.png',
    data: payload.data,
    tag: payload.data?.tag || 'default',
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});

// Handle notification click
self.addEventListener('notificationclick', (event) => {
  console.log('Notification clicked:', event);
  event.notification.close();

  const url = event.notification.data?.url || '/';
  
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.focus();
          if (client.navigate) {
            client.navigate(url);
          }
          return;
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(url);
      }
    })
  );
});
```

---

## 📱 Step 6: Capacitor Configuration

### Android Configuration

1. **Add `google-services.json`**:
   - Download from Firebase Console
   - Place in `android/app/` directory

2. **Update `android/app/build.gradle`**:
   ```gradle
   apply plugin: 'com.google.gms.google-services'
   
   dependencies {
       implementation 'com.google.firebase:firebase-messaging:23.4.0'
       implementation 'com.google.firebase:firebase-analytics'
   }
   ```

3. **Update `android/build.gradle`**:
   ```gradle
   dependencies {
       classpath 'com.google.gms:google-services:4.4.0'
   }
   ```

### iOS Configuration

1. **Add `GoogleService-Info.plist`**:
   - Download from Firebase Console
   - Add to Xcode project at root level (not in any folder)

2. **Update `ios/App/Info.plist`**:
   Add background modes:
   ```xml
   <key>UIBackgroundModes</key>
   <array>
       <string>remote-notification</string>
   </array>
   ```

3. **Update `ios/App/Podfile`**:
   ```ruby
   pod 'Firebase/Messaging'
   ```

4. **Install pods**:
   ```bash
   cd ios/App
   pod install
   ```

---

## 🔧 Step 7: Create Notification Manager Component

Create `components/NotificationManager.tsx`:

```typescript
'use client';

import React, { useEffect, useState } from 'react';
import { unifiedFcmService } from '@/lib/firebase';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Bell, BellOff } from 'lucide-react';

export const NotificationManager: React.FC = () => {
  const [isEnabled, setIsEnabled] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const [platform, setPlatform] = useState<string>('web');

  useEffect(() => {
    initializeNotifications();
  }, []);

  const initializeNotifications = async () => {
    try {
      await unifiedFcmService.initialize();
      const currentToken = unifiedFcmService.getToken();
      const currentPlatform = unifiedFcmService.getPlatform();
      
      setToken(currentToken);
      setIsEnabled(!!currentToken);
      setPlatform(currentPlatform);
    } catch (error) {
      console.error('Failed to initialize notifications:', error);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {isEnabled ? <Bell className="h-5 w-5" /> : <BellOff className="h-5 w-5" />}
          Push Notifications
        </CardTitle>
        <CardDescription>
          Platform: {platform}
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-4">
        <Badge>{isEnabled ? 'Enabled' : 'Disabled'}</Badge>
        
        {token && (
          <div className="space-y-2">
            <p className="text-sm font-medium">FCM Token:</p>
            <code className="text-xs break-all bg-gray-100 p-2 rounded block">
              {token}
            </code>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default NotificationManager;
```

---

## 🎯 Step 8: Initialize in Your App

### In your main layout or app component:

```typescript
'use client';

import { useEffect } from 'react';
import { unifiedFcmService } from '@/lib/firebase';

export default function RootLayout({ children }) {
  useEffect(() => {
    // Initialize notifications
    unifiedFcmService.initialize();
  }, []);

  return (
    <html>
      <body>
        {children}
      </body>
    </html>
  );
}
```

---

## 📱 Step 9: Build and Run

### Web Development
```bash
npm run dev
```

### Android
```bash
# Build Next.js app
npm run build

# Sync Capacitor
npx cap sync

# Run on Android
npx cap run android
```

### iOS
```bash
# Build Next.js app
npm run build

# Sync Capacitor
npx cap sync

# Run on iOS
npx cap run ios
```

---

## 🧪 Step 10: Testing

### Test Web Notifications
1. Run `npm run dev`
2. Open browser console
3. Look for "FCM Token:" log
4. Send test notification from Firebase Console

### Test Mobile Notifications
1. Build and run on device/emulator
2. Check console for FCM token
3. Send test notification from Firebase Console

### Send Test Notification from Firebase Console
1. Go to Firebase Console → Cloud Messaging
2. Click "Send your first message"
3. Enter title and message
4. Click "Send test message"
5. Enter your FCM token
6. Send!

---

## 📋 API Endpoint Example

Create `app/api/fcm/token/route.ts`:

```typescript
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { token, platform, userId } = await request.json();

    // Store the token in your database
    // Example: await database.saveDeviceToken(token, platform, userId);

    console.log(`Token received for platform: ${platform}`);
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error saving token:', error);
    return NextResponse.json({ error: 'Failed to save token' }, { status: 500 });
  }
}
```

---

## 🎯 Differences: Web vs Mobile

| Feature | Web | Mobile (Capacitor) |
|---------|-----|-------------------|
| Setup | Service worker | Native plugins |
| Token Retrieval | `getToken()` | `FirebaseMessaging.getToken()` |
| Foreground Messages | `onMessage()` | `PushNotifications` listeners |
| Background Messages | Service worker | Native handlers |
| Deep Linking | Manual | Automatic |

---

## 🐛 Troubleshooting

### Web Notifications Not Working
- Check VAPID key is set in `.env.local`
- Verify service worker is registered (DevTools → Application → Service Workers)
- Ensure HTTPS (or localhost)
- Check browser console for errors

### Mobile Notifications Not Working
- Verify `google-services.json` is in `android/app/`
- Check `GoogleService-Info.plist` is added to iOS project
- Run `npx cap sync` after changes
- Check device logs: `npx cap run android -- --log`

---

## 📚 Resources

- [Firebase Cloud Messaging](https://firebase.google.com/docs/cloud-messaging)
- [Capacitor Push Notifications](https://capacitorjs.com/docs/apis/push-notifications)
- [Capacitor Firebase Messaging](https://capacitor-firebase.firebaseapp.com/)

---

## ✅ Summary

Your Next.js + Capacitor app now has unified Firebase notifications that work on:
- ✅ Web browsers (Chrome, Firefox, Safari, Edge)
- ✅ Android devices
- ✅ iOS devices

All using the same Firebase project and backend infrastructure!


