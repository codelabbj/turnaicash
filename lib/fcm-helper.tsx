import { fcmService } from './firebase';
import api from './api';
import toast from 'react-hot-toast';

// Variable globale pour suivre l'état d'initialisation (similaire au code original)
let isInitialized = false;
let registrationToken: string | null = null;

/**
 * Initialize Push Notifications
 * Adapted from Capacitor logic for Web/FCM with requested logging
 */
export async function initializePushNotifications(): Promise<void> {
  console.log('🚀 [TEST LOG] initializePushNotifications() called at:', new Date().toISOString());

  // Ne pas initialiser plusieurs fois
  if (isInitialized) {
    console.log('⚠️ [TEST LOG] Push notifications already initialized, skipping...');
    return;
  }

  console.log('🔍 [TEST LOG] Checking platform compatibility...');

  // Vérifier si on est sur une plateforme supportée (Web)
  // Adaptation: Sur le web, on vérifie window et Notification
  const isWeb = typeof window !== 'undefined' && 'Notification' in window;

  if (!isWeb) {
    console.log('❌ [TEST LOG] Push notifications not available on this platform - exiting');
    return;
  }

  // Simulation de Capacitor.getPlatform() pour le log
  const platform = 'web';
  console.log(`✅ [TEST LOG] Initializing push notifications on ${platform} platform (loading from remote URL)`);
  console.log(`ℹ️ [TEST LOG] Platform: ${platform}, isSecureContext: ${window.isSecureContext}`);

  try {
    // Vérifier d'abord l'état actuel des permissions
    // PermissionState peut être: 'granted' | 'denied' | 'default' (équivalent prompt)
    console.log('🔐 [TEST LOG] Checking current push notification permissions...');

    // Adaptation: Utilisation de Notification.permission
    const currentPermission = Notification.permission;
    // Map Web permission to structure similar to Capacitor for logging consistency
    const permStatus = { receive: currentPermission };

    console.log('🔐 [TEST LOG] Current permission status:', permStatus);

    // Si la permission n'a pas encore été demandée (default/prompt), la demander
    if (currentPermission === 'default') {
      console.log('📋 [TEST LOG] Requesting push notification permissions...');

      // Requesting permission via FCM service or direct API
      const permissionResult = await Notification.requestPermission();
      permStatus.receive = permissionResult;

      console.log('📋 [TEST LOG] Permission request result:', permStatus);
    } else if (currentPermission === 'denied') {
      // Si la permission a été refusée, ne pas continuer
      console.warn('🚫 [TEST LOG] Push notification permission denied by user. User can enable it in browser settings.');
      return;
    } else if (currentPermission === 'granted') {
      console.log('✅ [TEST LOG] Push notification permission already granted');
    }

    // Vérifier si la permission a été accordée avant de continuer
    if (permStatus.receive !== 'granted') {
      console.warn('🚫 [TEST LOG] Push notification permission not granted:', permStatus.receive);
      console.warn('🚫 [TEST LOG] Full status received:', permStatus);
      return;
    }

    console.log('✅ [TEST LOG] Push notification permission granted, setting up listeners...');

    // Créer le canal haute priorité pour TOUTES les notifications (push + locales)
    // Adaptation: Sur le web, les "channels" n'existent pas vraiment comme sur Android,
    // mais on garde le log et la logique pour respecter la demande.
    // On peut considérer que c'est une configuration logique.
    if (platform === 'web' || platform === 'android') {
      // Simulation de la création du canal
      console.log('✅ [TEST LOG] High priority notification channel "turaincash_foreground" configured');
    }

    // IMPORTANT: Ajouter les listeners AVANT d'appeler register()
    console.log('👂 [TEST LOG] Adding push notification event listeners...');

    // Écouter les messages au premier plan (Foreground)
    // Adaptation: fcmService.setupForegroundListener remplace PushNotifications.addListener
    fcmService.setupForegroundListener((payload) => {
      const notification = payload.notification;
      const data = payload.data;

      if (notification) {
        console.log('📨 [TEST LOG] Push notification received while app in foreground:', {
          title: notification.title,
          body: notification.body,
          data: data,
          timestamp: new Date().toISOString(),
        });

        // Afficher une notification locale quand l'app est en foreground
        // Adaptation: Utilisation de react-hot-toast pour simuler la notification native
        try {
          // Pour le web, on utilise toast
          toast(t => (
            <div onClick={() => {
              console.log('👆 [TEST LOG] Toast notification clicked');
              toast.dismiss(t.id);
            }} className="flex flex-col cursor-pointer" >
              <span className="font-bold" > {notification.title || 'Notification'} </span>
              < span className="text-sm" > {notification.body || ''} </span>
            </div>
          ), {
            duration: 5000,
            position: 'top-center',
            style: {
              background: '#333',
              color: '#fff',
              padding: '16px',
              borderRadius: '10px',
            },
            icon: '🔔',
          });

          console.log('✅ [TEST LOG] Local notification scheduled for foreground push notification (via Toast)');
        } catch (error) {
          console.error('❌ [TEST LOG] Error scheduling local notification:', error);
        }
      }
    });

    // Initialiser les permissions pour les notifications locales
    // Adaptation: Sur le web, c'est la même permission que pour le push
    console.log('🔔 [TEST LOG] Checking local notification permissions...');
    console.log('✅ [TEST LOG] Local notification permissions granted (same as push)');

    console.log('👂 [TEST LOG] All listeners added, now registering for push notifications...');

    // Enregistrer pour recevoir les notifications
    console.log('📝 [TEST LOG] Calling fcmService.initialize()...');

    // Obtenir le token FCM (équivalent de register())
    const token = await fcmService.refreshToken(); // Ou initialize() si pas encore fait, mais refreshToken est plus sûr ici si on appelle manuellement

    if (token) {
      registrationToken = token;

      console.log('🔔 [TEST LOG] Push registration success! Token received:', {
        token_preview: token.substring(0, 30) + '...',
        full_token_length: token.length,
        timestamp: new Date().toISOString(),
      });

      // Déterminer le type de plateforme
      const type = 'web';

      console.log(`📱 [TEST LOG] Platform detected: ${type}, preparing to send token to backend...`);
      console.log(`📱 [TEST LOG] Device registration process starting for ${type} platform`);

      // Enregistrer le device sur le backend
      // Note: L'ID utilisateur doit être passé si disponible, sinon null
      const userId = localStorage.getItem('userId'); // Exemple rudimentaire, idéalement passer via paramètre

      // On utilise la fonction existante adaptée ou on appelle l'API directement
      // Pour cet exemple, on suppose que sendTokenToBackend est disponible ou on l'implémente inline
      await sendTokenToBackend(token, userId || undefined);
    } else {
      throw new Error("Failed to get FCM token");
    }

    isInitialized = true;
    console.log('✅ [TEST LOG] Push notifications registration initiated successfully!');

  } catch (error) {
    console.error('Error initializing push notifications:', error);
    console.error('❌ [TEST LOG] Push notification registration error:', {
      error: JSON.stringify(error, Object.getOwnPropertyNames(error)),
      timestamp: new Date().toISOString(),
      platform: 'web',
    });
  }
}

/**
 * Send FCM token to backend
 * @param token FCM token (registration_id)
 * @param userId User ID (optional)
 * @returns Promise<boolean> Success status
 */
export async function sendTokenToBackend(
  token: string,
  userId?: string
): Promise<boolean> {
  // Récupérer l'ID utilisateur du localStorage si non fourni (fallback)
  if (!userId) {
    // Correctly parsing the user_data from auth-context storage format
    const userDataStr = localStorage.getItem('user_data');
    if (userDataStr) {
      try {
        const userData = JSON.parse(userDataStr);
        userId = userData?.id;
      } catch (e) {
        console.error('❌ [TEST LOG] Error parsing user_data from localStorage:', e);
      }
    }
  }

  if (!userId) {
    console.log('ℹ️ [TEST LOG] User ID not found, skipping sending token to backend until login');
    return false;
  }

  try {
    console.log(`🚀 [TEST LOG] Sending token to backend for user ${userId}...`);
    // Send to the devices endpoint with the required payload format
    await api.post('/mobcash/devices/', {
      registration_id: token,
      type: 'web',
      user: userId,
      active: true,
      name: navigator.userAgent
    });

    console.log('✅ [TEST LOG] Token sent to backend successfully');
    return true;
  } catch (error: any) {
    console.error('❌ [TEST LOG] Error sending token to backend:', error);
    return false;
  }
}

/**
 * Setup setupNotifications (Backward compatibility / wrapper)
 */
export async function setupNotifications(userId?: string): Promise<string | null> {
  await initializePushNotifications();
  return registrationToken;
}
