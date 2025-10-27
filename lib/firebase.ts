import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import { getMessaging, getToken, onMessage, Messaging, MessagePayload } from 'firebase/messaging';
// Commenting out services not needed for FCM notifications to avoid initialization errors
// import { getAuth, Auth } from 'firebase/auth';
// import { getAnalytics, Analytics } from 'firebase/analytics';
// import { getFirestore, Firestore } from 'firebase/firestore';
// import { getStorage, FirebaseStorage } from 'firebase/storage';

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

// Initialize Firebase services (commented out - not needed for FCM notifications)
// export const auth = getAuth(app);
// export const db = getFirestore(app);
// export const storage = getStorage(app);

// Initialize messaging (only in browser)
let messaging: Messaging | null = null;
if (typeof window !== 'undefined') {
  messaging = getMessaging(app);
}

export { messaging };

// Initialize Analytics (only in browser) - commented out, not needed for FCM
// let analytics: Analytics | null = null;
// if (typeof window !== 'undefined') {
//   analytics = getAnalytics(app);
// }
// export { analytics };

// VAPID key for web push notifications
const vapidKey = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY;

// Notification permission status
export type NotificationPermission = 'default' | 'granted' | 'denied';

// FCM token management
export class FCMService {
  private static instance: FCMService;
  private token: string | null = null;
  private isInitialized = false;

  private constructor() {}

  public static getInstance(): FCMService {
    if (!FCMService.instance) {
      FCMService.instance = new FCMService();
    }
    return FCMService.instance;
  }

  /**
   * Initialize FCM service
   */
  public async initialize(): Promise<void> {
    if (this.isInitialized || typeof window === 'undefined' || !messaging) {
      return;
    }

    try {
      // Request notification permission
      const permission = await this.requestNotificationPermission();
      if (permission !== 'granted') {
        console.warn('Notification permission not granted');
        return;
      }

      // Get FCM token
      this.token = await getToken(messaging, {
        vapidKey: vapidKey,
      });

      if (this.token) {
        console.log('FCM Token:', this.token);
        // Store token in localStorage for persistence
        localStorage.setItem('fcm_token', this.token);
        
        // Send token to your server
        await this.sendTokenToServer(this.token);
      } else {
        console.error('No registration token available.');
      }

      this.isInitialized = true;
    } catch (error) {
      console.error('Error initializing FCM:', error);
    }
  }

  /**
   * Request notification permission
   */
  public async requestNotificationPermission(): Promise<NotificationPermission> {
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
    return permission as NotificationPermission;
  }

  /**
   * Get current FCM token
   */
  public getToken(): string | null {
    return this.token || localStorage.getItem('fcm_token');
  }

  /**
   * Refresh FCM token
   */
  public async refreshToken(): Promise<string | null> {
    if (typeof window === 'undefined' || !messaging) {
      return null;
    }

    try {
      this.token = await getToken(messaging, {
        vapidKey: vapidKey,
      });

      if (this.token) {
        localStorage.setItem('fcm_token', this.token);
        await this.sendTokenToServer(this.token);
      }

      return this.token;
    } catch (error) {
      console.error('Error refreshing FCM token:', error);
      return null;
    }
  }

  /**
   * Send token to server
   */
  private async sendTokenToServer(token: string): Promise<void> {
    try {
      // Replace with your API endpoint
      const response = await fetch('/api/fcm/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          token,
          platform: 'web',
          userId: null, // UserId should be passed to setupNotifications if needed
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
   * Setup foreground message listener
   */
  public setupForegroundListener(
    onMessageReceived: (payload: MessagePayload) => void
  ): void {
    if (typeof window === 'undefined' || !messaging) {
      return;
    }

    onMessage(messaging, (payload) => {
      console.log('Message received in foreground:', payload);
      onMessageReceived(payload);
    });
  }

  /**
   * Check if service worker is supported
   */
  public isServiceWorkerSupported(): boolean {
    return typeof window !== 'undefined' && 'serviceWorker' in navigator;
  }

  /**
   * Register service worker
   */
  public async registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
    if (!this.isServiceWorkerSupported()) {
      console.warn('Service Worker not supported');
      return null;
    }

    try {
      const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
      console.log('Service Worker registered:', registration);
      return registration;
    } catch (error) {
      console.error('Service Worker registration failed:', error);
      return null;
    }
  }

  /**
   * Unsubscribe from notifications
   */
  public async unsubscribe(): Promise<void> {
    if (typeof window === 'undefined' || !messaging) {
      return;
    }

    try {
      // Delete token from Firebase
      // Note: There's no direct method to delete token in v9+ SDK
      // You can revoke it on your server side
      
      // Clear local storage
      localStorage.removeItem('fcm_token');
      this.token = null;
      this.isInitialized = false;
      
      console.log('Unsubscribed from notifications');
    } catch (error) {
      console.error('Error unsubscribing:', error);
    }
  }
}

// Export singleton instance
export const fcmService = FCMService.getInstance();

// Utility functions
export const isFirebaseSupported = (): boolean => {
  return typeof window !== 'undefined' && 
         'serviceWorker' in navigator && 
         'PushManager' in window;
};

export const getNotificationPermission = (): NotificationPermission => {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'denied';
  }
  return Notification.permission as NotificationPermission;
};

export default app;
