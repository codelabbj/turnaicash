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

export const dynamic = 'force-dynamic'
export const revalidate = 0

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
    const { token, platform, userId } = body;

    if (!token) {
      return NextResponse.json(
        { error: 'Token is required' },
        { status: 400 }
      );
    }

    // Store token in your database
    // This is a placeholder - implement your own storage logic
    console.log('Storing FCM token:', { token, platform, userId });

    // You can store this in your database
    // Example: await db.collection('fcm_tokens').doc(userId).set({ token, platform, createdAt: new Date() });

    return NextResponse.json({ success: true }, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    });
  } catch (error) {
    console.error('Error storing FCM token:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500, headers: {
        'Cache-Control': 'no-store'
      }}
    );
  }
}

export async function DELETE(request: NextRequest) {
  const messaging = await getMessagingClient();
  
  if (!messaging) {
    return NextResponse.json(
      { error: 'Firebase Admin not available' },
      { status: 503 }
    );
  }
  
  try {
    const body = await request.json();
    const { token, userId } = body;

    if (!token) {
      return NextResponse.json(
        { error: 'Token is required' },
        { status: 400 }
      );
    }

    // Remove token from your database
    console.log('Removing FCM token:', { token, userId });

    // You can remove this from your database
    // Example: await db.collection('fcm_tokens').doc(userId).delete();

    return NextResponse.json({ success: true }, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    });
  } catch (error) {
    console.error('Error removing FCM token:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500, headers: {
        'Cache-Control': 'no-store'
      }}
    );
  }
}
