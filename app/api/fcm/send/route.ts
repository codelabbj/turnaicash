import { NextRequest, NextResponse } from 'next/server';

// Lazy initialization - only load Firebase Admin when actually needed
async function getMessagingClient() {
  if (!process.env.FIREBASE_ADMIN_PROJECT_ID) {
    return null;
  }
  
  try {
    const { getMessaging } = await import('firebase-admin/messaging');
    const { initializeApp, getApps, cert } = await import('firebase-admin/app');
    
    if (getApps().length === 0) {
      initializeApp({
        credential: cert({
          projectId: process.env.FIREBASE_ADMIN_PROJECT_ID,
          clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
          privateKey: process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, '\n'),
        }),
      });
    }
    
    return getMessaging();
  } catch (error) {
    console.warn('Firebase Admin not initialized:', error);
    return null;
  }
}

export async function POST(request: NextRequest) {
  const messaging = await getMessagingClient();
  
  if (!messaging) {
    return NextResponse.json(
      { error: 'Firebase Admin not available' },
      { status: 503 }
    );
  }
  
  try {
    const body = await request.json();
    const { 
      tokens, 
      title, 
      body: messageBody, 
      data, 
      imageUrl,
      clickAction,
      requireInteraction = false,
      actions = []
    } = body;

    if (!tokens || !Array.isArray(tokens) || tokens.length === 0) {
      return NextResponse.json(
        { error: 'Tokens array is required' },
        { status: 400 }
      );
    }

    if (!title || !messageBody) {
      return NextResponse.json(
        { error: 'Title and body are required' },
        { status: 400 }
      );
    }

    // Prepare notification payload
    const payload = {
      notification: {
        title,
        body: messageBody,
        imageUrl,
      },
      data: {
        ...data,
        click_action: clickAction || '/',
        requireInteraction: requireInteraction.toString(),
        actions: JSON.stringify(actions),
        timestamp: Date.now().toString(),
      },
      webpush: {
        notification: {
          title,
          body: messageBody,
          icon: '/icon-192x192.png',
          badge: '/badge-72x72.png',
          image: imageUrl,
          requireInteraction,
          actions: actions.map((action: any) => ({
            action: action.action,
            title: action.title,
            icon: action.icon,
          })),
          vibrate: [200, 100, 200],
          timestamp: Date.now(),
          renotify: true,
          silent: false,
        },
        fcmOptions: {
          link: clickAction || '/',
        },
      },
      android: {
        notification: {
          title,
          body: messageBody,
          icon: 'ic_notification',
          color: '#FF6B6B',
          sound: 'default',
          clickAction: clickAction || 'FLUTTER_NOTIFICATION_CLICK',
          channelId: 'default',
        },
        data: {
          ...data,
          click_action: clickAction || '/',
        },
      },
      apns: {
        payload: {
          aps: {
            alert: {
              title,
              body: messageBody,
            },
            badge: 1,
            sound: 'default',
            category: 'NOTIFICATION_CATEGORY',
            'mutable-content': 1,
          },
        },
        fcmOptions: {
          imageUrl,
        },
      },
    };

    // Send to multiple tokens
    const response = await messaging.sendMulticast({
      tokens,
      ...payload,
    });

    console.log('Notification sent:', {
      successCount: response.successCount,
      failureCount: response.failureCount,
      responses: response.responses,
    });

    return NextResponse.json({
      success: true,
      successCount: response.successCount,
      failureCount: response.failureCount,
      responses: response.responses,
    });
  } catch (error) {
    console.error('Error sending notification:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Send to topic
export async function PUT(request: NextRequest) {
  const messaging = await getMessagingClient();
  
  if (!messaging) {
    return NextResponse.json(
      { error: 'Firebase Admin not available' },
      { status: 503 }
    );
  }
  
  try {
    const body = await request.json();
    const { 
      topic, 
      title, 
      body: messageBody, 
      data, 
      imageUrl,
      clickAction 
    } = body;

    if (!topic) {
      return NextResponse.json(
        { error: 'Topic is required' },
        { status: 400 }
      );
    }

    if (!title || !messageBody) {
      return NextResponse.json(
        { error: 'Title and body are required' },
        { status: 400 }
      );
    }

    const payload = {
      notification: {
        title,
        body: messageBody,
        imageUrl,
      },
      data: {
        ...data,
        click_action: clickAction || '/',
        timestamp: Date.now().toString(),
      },
      webpush: {
        notification: {
          title,
          body: messageBody,
          icon: '/icon-192x192.png',
          badge: '/badge-72x72.png',
          image: imageUrl,
        },
        fcmOptions: {
          link: clickAction || '/',
        },
      },
      android: {
        notification: {
          title,
          body: messageBody,
          icon: 'ic_notification',
          color: '#FF6B6B',
          sound: 'default',
          clickAction: clickAction || 'FLUTTER_NOTIFICATION_CLICK',
        },
        data: {
          ...data,
          click_action: clickAction || '/',
        },
      },
      apns: {
        payload: {
          aps: {
            alert: {
              title,
              body: messageBody,
            },
            badge: 1,
            sound: 'default',
          },
        },
        fcmOptions: {
          imageUrl,
        },
      },
    };

    const response = await messaging.send({
      topic,
      ...payload,
    });

    console.log('Topic notification sent:', response);

    return NextResponse.json({
      success: true,
      messageId: response,
    });
  } catch (error) {
    console.error('Error sending topic notification:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
