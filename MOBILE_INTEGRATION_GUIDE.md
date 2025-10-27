# Mobile App Firebase Integration Guide

This guide provides instructions for integrating Firebase Cloud Messaging (FCM) with mobile apps (React Native and Flutter) to work alongside your web application.

## Prerequisites

- Firebase project set up with web app configured
- Mobile app development environment (React Native/Flutter)
- Firebase CLI installed
- Android/iOS development certificates

## React Native Integration

### 1. Install Dependencies

```bash
# Install Firebase SDK
npm install @react-native-firebase/app @react-native-firebase/messaging

# For iOS, install pods
cd ios && pod install && cd ..
```

### 2. Firebase Configuration

#### Android Setup

1. Download `google-services.json` from Firebase Console
2. Place it in `android/app/` directory
3. Update `android/app/build.gradle`:

```gradle
apply plugin: 'com.google.gms.google-services'

dependencies {
    implementation 'com.google.firebase:firebase-messaging:23.4.0'
}
```

#### iOS Setup

1. Download `GoogleService-Info.plist` from Firebase Console
2. Add it to your iOS project in Xcode
3. Update `ios/Podfile`:

```ruby
pod 'Firebase/Messaging'
```

### 3. React Native Code Implementation

#### FCM Service (`src/services/fcmService.ts`)

```typescript
import messaging from '@react-native-firebase/messaging';
import { Platform, Alert } from 'react-native';

class FCMService {
  private static instance: FCMService;
  private token: string | null = null;

  private constructor() {}

  public static getInstance(): FCMService {
    if (!FCMService.instance) {
      FCMService.instance = new FCMService();
    }
    return FCMService.instance;
  }

  async initialize(): Promise<void> {
    // Request permission
    const authStatus = await messaging().requestPermission();
    const enabled =
      authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
      authStatus === messaging.AuthorizationStatus.PROVISIONAL;

    if (!enabled) {
      console.log('Permission not granted');
      return;
    }

    // Get FCM token
    this.token = await messaging().getToken();
    console.log('FCM Token:', this.token);

    // Send token to server
    await this.sendTokenToServer(this.token);

    // Setup message handlers
    this.setupMessageHandlers();
  }

  private async sendTokenToServer(token: string): Promise<void> {
    try {
      await fetch('https://your-domain.com/api/fcm/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          token,
          platform: Platform.OS,
          userId: 'user_id_here', // Replace with actual user ID
        }),
      });
    } catch (error) {
      console.error('Error sending token to server:', error);
    }
  }

  private setupMessageHandlers(): void {
    // Handle foreground messages
    messaging().onMessage(async (remoteMessage) => {
      console.log('Foreground message:', remoteMessage);
      
      // Show local notification
      Alert.alert(
        remoteMessage.notification?.title || 'New Message',
        remoteMessage.notification?.body || 'You have a new message',
        [
          { text: 'OK', onPress: () => this.handleNotificationPress(remoteMessage) },
        ]
      );
    });

    // Handle background messages
    messaging().setBackgroundMessageHandler(async (remoteMessage) => {
      console.log('Background message:', remoteMessage);
    });

    // Handle notification press
    messaging().onNotificationOpenedApp((remoteMessage) => {
      console.log('Notification opened app:', remoteMessage);
      this.handleNotificationPress(remoteMessage);
    });

    // Handle notification press when app is closed
    messaging()
      .getInitialNotification()
      .then((remoteMessage) => {
        if (remoteMessage) {
          console.log('App opened from notification:', remoteMessage);
          this.handleNotificationPress(remoteMessage);
        }
      });
  }

  private handleNotificationPress(remoteMessage: any): void {
    // Handle deep linking
    if (remoteMessage.data?.url) {
      // Navigate to URL
      // Use your navigation library here
      console.log('Navigate to:', remoteMessage.data.url);
    }
  }

  getToken(): string | null {
    return this.token;
  }

  async refreshToken(): Promise<string | null> {
    this.token = await messaging().getToken();
    if (this.token) {
      await this.sendTokenToServer(this.token);
    }
    return this.token;
  }
}

export default FCMService.getInstance();
```

#### App Initialization (`App.tsx`)

```typescript
import React, { useEffect } from 'react';
import FCMService from './src/services/fcmService';

const App: React.FC = () => {
  useEffect(() => {
    // Initialize FCM
    FCMService.initialize();
  }, []);

  return (
    // Your app components
  );
};

export default App;
```

## Flutter Integration

### 1. Install Dependencies

Add to `pubspec.yaml`:

```yaml
dependencies:
  firebase_core: ^2.24.2
  firebase_messaging: ^14.7.10
  flutter_local_notifications: ^16.3.2
```

### 2. Firebase Configuration

#### Android Setup

1. Download `google-services.json` from Firebase Console
2. Place it in `android/app/` directory
3. Update `android/app/build.gradle`:

```gradle
apply plugin: 'com.google.gms.google-services'

dependencies {
    implementation 'com.google.firebase:firebase-messaging:23.4.0'
}
```

#### iOS Setup

1. Download `GoogleService-Info.plist` from Firebase Console
2. Add it to your iOS project in Xcode
3. Update `ios/Runner/Info.plist`:

```xml
<key>UIBackgroundModes</key>
<array>
    <string>fetch</string>
    <string>remote-notification</string>
</array>
```

### 3. Flutter Code Implementation

#### FCM Service (`lib/services/fcm_service.dart`)

```dart
import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter_local_notifications/flutter_local_notifications.dart';
import 'package:http/http.dart' as http;
import 'dart:convert';
import 'dart:io';

class FCMService {
  static final FCMService _instance = FCMService._internal();
  factory FCMService() => _instance;
  FCMService._internal();

  final FirebaseMessaging _messaging = FirebaseMessaging.instance;
  final FlutterLocalNotificationsPlugin _localNotifications = 
      FlutterLocalNotificationsPlugin();
  
  String? _token;

  Future<void> initialize() async {
    // Request permission
    NotificationSettings settings = await _messaging.requestPermission(
      alert: true,
      badge: true,
      sound: true,
    );

    if (settings.authorizationStatus == AuthorizationStatus.authorized) {
      print('User granted permission');
    } else {
      print('User declined or has not accepted permission');
      return;
    }

    // Get FCM token
    _token = await _messaging.getToken();
    print('FCM Token: $_token');

    // Send token to server
    await _sendTokenToServer(_token!);

    // Setup message handlers
    _setupMessageHandlers();

    // Initialize local notifications
    await _initializeLocalNotifications();
  }

  Future<void> _sendTokenToServer(String token) async {
    try {
      final response = await http.post(
        Uri.parse('https://your-domain.com/api/fcm/token'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({
          'token': token,
          'platform': Platform.isIOS ? 'ios' : 'android',
          'userId': 'user_id_here', // Replace with actual user ID
        }),
      );

      if (response.statusCode == 200) {
        print('Token sent to server successfully');
      }
    } catch (e) {
      print('Error sending token to server: $e');
    }
  }

  void _setupMessageHandlers() {
    // Handle foreground messages
    FirebaseMessaging.onMessage.listen((RemoteMessage message) {
      print('Foreground message: ${message.notification?.title}');
      _showLocalNotification(message);
    });

    // Handle background messages
    FirebaseMessaging.onBackgroundMessage(_firebaseMessagingBackgroundHandler);

    // Handle notification press
    FirebaseMessaging.onMessageOpenedApp.listen((RemoteMessage message) {
      print('Notification opened app: ${message.notification?.title}');
      _handleNotificationPress(message);
    });

    // Handle notification press when app is closed
    FirebaseMessaging.getInitialMessage().then((RemoteMessage? message) {
      if (message != null) {
        print('App opened from notification: ${message.notification?.title}');
        _handleNotificationPress(message);
      }
    });
  }

  Future<void> _initializeLocalNotifications() async {
    const AndroidInitializationSettings initializationSettingsAndroid =
        AndroidInitializationSettings('@mipmap/ic_launcher');
    
    const DarwinInitializationSettings initializationSettingsIOS =
        DarwinInitializationSettings(
      requestAlertPermission: true,
      requestBadgePermission: true,
      requestSoundPermission: true,
    );

    const InitializationSettings initializationSettings =
        InitializationSettings(
      android: initializationSettingsAndroid,
      iOS: initializationSettingsIOS,
    );

    await _localNotifications.initialize(initializationSettings);
  }

  Future<void> _showLocalNotification(RemoteMessage message) async {
    const AndroidNotificationDetails androidPlatformChannelSpecifics =
        AndroidNotificationDetails(
      'default_channel',
      'Default Channel',
      channelDescription: 'Default notification channel',
      importance: Importance.max,
      priority: Priority.high,
    );

    const DarwinNotificationDetails iOSPlatformChannelSpecifics =
        DarwinNotificationDetails(
      presentAlert: true,
      presentBadge: true,
      presentSound: true,
    );

    const NotificationDetails platformChannelSpecifics =
        NotificationDetails(
      android: androidPlatformChannelSpecifics,
      iOS: iOSPlatformChannelSpecifics,
    );

    await _localNotifications.show(
      message.hashCode,
      message.notification?.title,
      message.notification?.body,
      platformChannelSpecifics,
      payload: jsonEncode(message.data),
    );
  }

  void _handleNotificationPress(RemoteMessage message) {
    // Handle deep linking
    if (message.data['url'] != null) {
      // Navigate to URL
      // Use your navigation library here
      print('Navigate to: ${message.data['url']}');
    }
  }

  String? getToken() => _token;

  Future<String?> refreshToken() async {
    _token = await _messaging.getToken();
    if (_token != null) {
      await _sendTokenToServer(_token!);
    }
    return _token;
  }
}

// Background message handler (must be top-level function)
Future<void> _firebaseMessagingBackgroundHandler(RemoteMessage message) async {
  print('Background message: ${message.notification?.title}');
}
```

#### App Initialization (`main.dart`)

```dart
import 'package:flutter/material.dart';
import 'package:firebase_core/firebase_core.dart';
import 'services/fcm_service.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await Firebase.initializeApp();
  
  // Initialize FCM
  await FCMService().initialize();
  
  runApp(MyApp());
}

class MyApp extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Your App',
      home: HomePage(),
    );
  }
}
```

## Deep Linking Setup

### Android App Links

1. Update `android/app/src/main/AndroidManifest.xml`:

```xml
<activity
    android:name=".MainActivity"
    android:exported="true"
    android:launchMode="singleTop">
    <intent-filter android:autoVerify="true">
        <action android:name="android.intent.action.VIEW" />
        <category android:name="android.intent.category.DEFAULT" />
        <category android:name="android.intent.category.BROWSABLE" />
        <data android:scheme="https"
              android:host="your-domain.com" />
    </intent-filter>
</activity>
```

2. Update your web `assetlinks.json` with the correct SHA256 fingerprint:

```bash
# Get SHA256 fingerprint
keytool -list -v -keystore android/app/debug.keystore -alias androiddebugkey -storepass android -keypass android
```

### iOS Universal Links

1. Update `ios/Runner/Info.plist`:

```xml
<key>CFBundleURLTypes</key>
<array>
    <dict>
        <key>CFBundleURLName</key>
        <string>your-domain.com</string>
        <key>CFBundleURLSchemes</key>
        <array>
            <string>https</string>
        </array>
    </dict>
</array>
```

2. Create `apple-app-site-association` file on your web server:

```json
{
    "applinks": {
        "apps": [],
        "details": [
            {
                "appID": "TEAM_ID.com.yourcompany.yourapp",
                "paths": ["*"]
            }
        ]
    }
}
```

## Testing

### Web to Mobile Deep Linking

1. Send a notification from your web app with a deep link URL
2. Click the notification on mobile
3. Verify the app opens and navigates to the correct screen

### Mobile to Web Deep Linking

1. Send a notification from your mobile app with a web URL
2. Click the notification
3. Verify the web app opens in the browser

## Troubleshooting

### Common Issues

1. **Token not generated**: Check Firebase configuration files
2. **Notifications not received**: Verify VAPID key and server configuration
3. **Deep links not working**: Check app links configuration and SHA256 fingerprints
4. **Background notifications**: Ensure proper service worker setup for web

### Debug Commands

```bash
# Check Firebase project
firebase projects:list

# Test notification sending
firebase functions:shell

# Check app links
curl -s "https://your-domain.com/.well-known/assetlinks.json" | jq
```

## Security Considerations

1. **Token Storage**: Store FCM tokens securely on your server
2. **API Keys**: Never expose server-side API keys in client code
3. **Deep Links**: Validate URLs before processing
4. **User Consent**: Always request permission before enabling notifications

## Production Deployment

1. **Environment Variables**: Use production Firebase project configuration
2. **Certificates**: Use production certificates for iOS/Android
3. **Monitoring**: Set up Firebase Analytics and Crashlytics
4. **Testing**: Test on real devices before production release
