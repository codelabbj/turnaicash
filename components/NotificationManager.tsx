'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Bell, 
  BellOff, 
  Settings, 
  CheckCircle, 
  XCircle, 
  AlertCircle,
  Smartphone,
  Monitor
} from 'lucide-react';
import { fcmService, NotificationPermission, isFirebaseSupported } from '@/lib/firebase';
import { toast } from 'sonner';

interface NotificationState {
  permission: NotificationPermission;
  isSupported: boolean;
  isInitialized: boolean;
  token: string | null;
  isEnabled: boolean;
  error: string | null;
}

interface NotificationManagerProps {
  onTokenChange?: (token: string | null) => void;
  onPermissionChange?: (permission: NotificationPermission) => void;
  className?: string;
}

export const NotificationManager: React.FC<NotificationManagerProps> = ({
  onTokenChange,
  onPermissionChange,
  className = '',
}) => {
  const [state, setState] = useState<NotificationState>({
    permission: 'default',
    isSupported: false,
    isInitialized: false,
    token: null,
    isEnabled: false,
    error: null,
  });

  const [isLoading, setIsLoading] = useState(false);

  // Initialize notification manager
  const initialize = useCallback(async () => {
    if (typeof window === 'undefined') return;

    setIsLoading(true);
    setState(prev => ({ ...prev, error: null }));

    try {
      // Check if Firebase is supported
      const supported = isFirebaseSupported();
      setState(prev => ({ ...prev, isSupported: supported }));

      if (!supported) {
        setState(prev => ({ 
          ...prev, 
          error: 'Push notifications are not supported in this browser' 
        }));
        return;
      }

      // Register service worker
      await fcmService.registerServiceWorker();

      // Initialize FCM
      await fcmService.initialize();

      // Get current state (await permission since it returns a promise)
      const permission = await fcmService.requestNotificationPermission();
      const token = fcmService.getToken();

      setState(prev => ({
        ...prev,
        permission,
        token,
        isInitialized: true,
        isEnabled: !!token,
      }));

      // Setup foreground message listener
      fcmService.setupForegroundListener((payload) => {
        console.log('Foreground message received:', payload);
        
        // Show toast notification
        toast.success(payload.notification?.title || 'New Notification', {
          description: payload.notification?.body,
          duration: 5000,
        });

        // Handle custom data
        if (payload.data) {
          handleNotificationData(payload.data);
        }
      });

      // Call callbacks
      onTokenChange?.(token);
      onPermissionChange?.(permission);

    } catch (error) {
      console.error('Error initializing notifications:', error);
      setState(prev => ({ 
        ...prev, 
        error: error instanceof Error ? error.message : 'Failed to initialize notifications' 
      }));
    } finally {
      setIsLoading(false);
    }
  }, [onTokenChange, onPermissionChange]);

  // Handle notification data
  const handleNotificationData = (data: any) => {
    // Handle custom notification data
    if (data.url) {
      // Navigate to URL
      window.open(data.url, '_blank');
    }
    
    if (data.action) {
      // Handle custom actions
      console.log('Custom action:', data.action);
    }
  };

  // Request notification permission
  const requestPermission = useCallback(async () => {
    if (typeof window === 'undefined') return;

    setIsLoading(true);
    setState(prev => ({ ...prev, error: null }));

    try {
      const permission = await fcmService.requestNotificationPermission();
      
      if (permission === 'granted') {
        // Get token after permission is granted
        const token = await fcmService.refreshToken();
        
        setState(prev => ({
          ...prev,
          permission,
          token,
          isEnabled: !!token,
        }));

        onTokenChange?.(token);
        onPermissionChange?.(permission);

        toast.success('Notifications enabled successfully!');
      } else {
        setState(prev => ({ ...prev, permission }));
        onPermissionChange?.(permission);
        
        toast.error('Notification permission denied');
      }
    } catch (error) {
      console.error('Error requesting permission:', error);
      setState(prev => ({ 
        ...prev, 
        error: error instanceof Error ? error.message : 'Failed to request permission' 
      }));
      toast.error('Failed to enable notifications');
    } finally {
      setIsLoading(false);
    }
  }, [onTokenChange, onPermissionChange]);

  // Disable notifications
  const disableNotifications = useCallback(async () => {
    setIsLoading(true);
    setState(prev => ({ ...prev, error: null }));

    try {
      await fcmService.unsubscribe();
      
      setState(prev => ({
        ...prev,
        token: null,
        isEnabled: false,
      }));

      onTokenChange?.(null);
      toast.success('Notifications disabled');
    } catch (error) {
      console.error('Error disabling notifications:', error);
      setState(prev => ({ 
        ...prev, 
        error: error instanceof Error ? error.message : 'Failed to disable notifications' 
      }));
      toast.error('Failed to disable notifications');
    } finally {
      setIsLoading(false);
    }
  }, [onTokenChange]);

  // Refresh token
  const refreshToken = useCallback(async () => {
    setIsLoading(true);
    setState(prev => ({ ...prev, error: null }));

    try {
      const token = await fcmService.refreshToken();
      
      setState(prev => ({
        ...prev,
        token,
        isEnabled: !!token,
      }));

      onTokenChange?.(token);
      toast.success('Token refreshed successfully');
    } catch (error) {
      console.error('Error refreshing token:', error);
      setState(prev => ({ 
        ...prev, 
        error: error instanceof Error ? error.message : 'Failed to refresh token' 
      }));
      toast.error('Failed to refresh token');
    } finally {
      setIsLoading(false);
    }
  }, [onTokenChange]);

  // Initialize on mount
  useEffect(() => {
    initialize();
  }, [initialize]);

  // Get permission status icon
  const getPermissionIcon = () => {
    switch (state.permission) {
      case 'granted':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'denied':
        return <XCircle className="h-5 w-5 text-red-500" />;
      default:
        return <AlertCircle className="h-5 w-5 text-yellow-500" />;
    }
  };

  // Get permission status text
  const getPermissionText = () => {
    switch (state.permission) {
      case 'granted':
        return 'Granted';
      case 'denied':
        return 'Denied';
      default:
        return 'Not requested';
    }
  };

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bell className="h-5 w-5" />
          Push Notifications
        </CardTitle>
        <CardDescription>
          Manage push notifications for web and mobile platforms
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Error Alert */}
        {state.error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{state.error}</AlertDescription>
          </Alert>
        )}

        {/* Support Status */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Monitor className="h-4 w-4" />
            <span className="text-sm font-medium">Browser Support</span>
          </div>
          <Badge variant={state.isSupported ? 'default' : 'destructive'}>
            {state.isSupported ? 'Supported' : 'Not Supported'}
          </Badge>
        </div>

        {/* Permission Status */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {getPermissionIcon()}
            <span className="text-sm font-medium">Permission Status</span>
          </div>
          <Badge variant={state.permission === 'granted' ? 'default' : 'secondary'}>
            {getPermissionText()}
          </Badge>
        </div>

        {/* Notification Status */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {state.isEnabled ? (
              <Bell className="h-4 w-4 text-green-500" />
            ) : (
              <BellOff className="h-4 w-4 text-gray-400" />
            )}
            <span className="text-sm font-medium">Notifications</span>
          </div>
          <Switch
            checked={state.isEnabled}
            onCheckedChange={(checked) => {
              if (checked) {
                requestPermission();
              } else {
                disableNotifications();
              }
            }}
            disabled={isLoading || !state.isSupported}
          />
        </div>

        {/* Token Display */}
        {state.token && (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Smartphone className="h-4 w-4" />
              <span className="text-sm font-medium">FCM Token</span>
            </div>
            <div className="p-2 bg-gray-100 rounded-md">
              <code className="text-xs break-all">{state.token}</code>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-2 pt-2">
          {state.permission === 'granted' && state.token && (
            <Button
              variant="outline"
              size="sm"
              onClick={refreshToken}
              disabled={isLoading}
            >
              Refresh Token
            </Button>
          )}
          
          {state.permission === 'default' && (
            <Button
              size="sm"
              onClick={requestPermission}
              disabled={isLoading || !state.isSupported}
            >
              Enable Notifications
            </Button>
          )}
          
          {state.permission === 'denied' && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                toast.info('Please enable notifications in your browser settings');
              }}
            >
              <Settings className="h-4 w-4 mr-2" />
              Browser Settings
            </Button>
          )}
        </div>

        {/* Instructions */}
        {state.permission === 'denied' && (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Notifications are blocked. Please enable them in your browser settings:
              <br />
              • Chrome: Settings → Privacy → Site Settings → Notifications
              <br />
              • Firefox: Settings → Privacy → Notifications
              <br />
              • Safari: Preferences → Websites → Notifications
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
};

export default NotificationManager;
