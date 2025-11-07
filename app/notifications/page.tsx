'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Bell, Check, RefreshCw, Loader2, ArrowLeft, MessageSquare } from 'lucide-react';
import { notificationApi } from '@/lib/api-client';
import { Notification } from '@/lib/types';
import { format, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';
import { toast } from 'react-hot-toast';
import { fcmService } from '@/lib/firebase';
import type { MessagePayload } from 'firebase/messaging';

// Extended notification type to include FCM notifications
interface FCMNotification {
  id: string; // Use timestamp + random for unique ID
  title: string;
  content: string;
  created_at: string;
  is_read: boolean;
  is_fcm: true;
  payload?: MessagePayload;
}

type CombinedNotification = Notification | FCMNotification;

export default function NotificationsPage() {
  const router = useRouter();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [fcmNotifications, setFcmNotifications] = useState<FCMNotification[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const [hasNext, setHasNext] = useState(false);
  const [hasPrevious, setHasPrevious] = useState(false);

  const fetchNotifications = async (pageNum = 1) => {
    try {
      setIsRefreshing(pageNum === 1);
      setIsLoading(pageNum === 1);
      
      const response = await notificationApi.getAll(pageNum);
      
      setNotifications(response.results);
      setHasNext(!!response.next);
      setHasPrevious(!!response.previous);
      setPage(pageNum);
    } catch (error) {
      console.error('Error fetching notifications:', error);
      toast.error('Échec du chargement des notifications');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, []);

  // Refetch data when the page gains focus to ensure fresh data
  useEffect(() => {
    const handleFocus = () => {
      fetchNotifications(page);
    };
    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [page]);

  // Load FCM notifications from localStorage on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const storedFcmNotifications = localStorage.getItem('fcm_notifications');
      if (storedFcmNotifications) {
        try {
          const parsed = JSON.parse(storedFcmNotifications);
          setFcmNotifications(parsed);
        } catch (error) {
          console.error('Error loading FCM notifications from storage:', error);
        }
      }
    }
  }, []);

  // Setup FCM foreground message listener
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleFCMMessage = (payload: MessagePayload) => {
      console.log('FCM notification received in notifications page:', payload);
      
      const fcmNotification: FCMNotification = {
        id: `fcm-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`,
        title: payload.notification?.title || 'Nouvelle notification',
        content: payload.notification?.body || payload.data?.body || 'Vous avez une nouvelle notification',
        created_at: new Date().toISOString(),
        is_read: false,
        is_fcm: true,
        payload: payload,
      };

      // Add to state
      setFcmNotifications(prev => {
        const updated = [fcmNotification, ...prev];
        // Save to localStorage with the updated state
        localStorage.setItem('fcm_notifications', JSON.stringify(updated));
        return updated;
      });

      // Show native browser notification
      try {
        if (typeof window === 'undefined' || !('Notification' in window) || !window.Notification) {
          console.warn('Notification API not available');
          return;
        }
        
        // Check permission safely
        const permission = window.Notification?.permission;
        if (permission !== 'granted') {
          console.warn('Notification permission not granted:', permission);
          return;
        }
        
        const notification = new window.Notification(fcmNotification.title, {
          body: fcmNotification.content,
          icon: '/placeholder-logo.png',
          badge: '/placeholder-logo.png',
          tag: fcmNotification.id,
          requireInteraction: false,
        });

        // Handle click on notification
        notification.onclick = (event) => {
          event.preventDefault();
          window.focus();
          
          // Navigate to notification details or handle custom data
          if (payload.data?.url) {
            window.open(payload.data.url, '_blank');
          }
          
          notification.close();
        };
      } catch (error) {
        console.error('Error showing notification:', error);
      }
    };

    // Setup listener
    fcmService.setupForegroundListener(handleFCMMessage);

    // Also listen for service worker messages (background notifications)
    if ('serviceWorker' in navigator) {
      const messageHandler = (event: MessageEvent) => {
        if (event.data && event.data.firebaseMessaging) {
          const payload = event.data.firebaseMessaging;
          handleFCMMessage(payload);
        }
      };
      
      navigator.serviceWorker.addEventListener('message', messageHandler);
      
      return () => {
        navigator.serviceWorker.removeEventListener('message', messageHandler);
      };
    }
  }, []); // Empty dependency array - setup once

  const markAsRead = async (notificationId: number | string) => {
    // Check if it's an FCM notification (string ID)
    if (typeof notificationId === 'string' && notificationId.startsWith('fcm-')) {
      setFcmNotifications(prev =>
        prev.map(notif =>
          notif.id === notificationId ? { ...notif, is_read: true } : notif
        )
      );
      
      // Update localStorage
      const updated = fcmNotifications.map(notif =>
        notif.id === notificationId ? { ...notif, is_read: true } : notif
      );
      localStorage.setItem('fcm_notifications', JSON.stringify(updated));
      
      toast.success('Notification marquée comme lue');
      return;
    }

    // Backend notification (number ID)
    try {
      // TODO: Implement mark as read API call if available
      setNotifications(prev =>
        prev.map(notif =>
          notif.id === notificationId ? { ...notif, is_read: true } : notif
        )
      );
      toast.success('Notification marquée comme lue');
    } catch (error) {
      console.error('Error marking notification as read:', error);
      toast.error('Échec de la mise à jour de la notification');
    }
  };

  const formatDate = (dateString: string) => {
    try {
      return format(parseISO(dateString), 'PPP p', { locale: fr });
    } catch {
      return dateString;
    }
  };

  // Combine backend and FCM notifications, sorted by date (newest first)
  const allNotifications: CombinedNotification[] = [
    ...fcmNotifications,
    ...notifications,
  ].sort((a, b) => {
    const dateA = new Date(a.created_at).getTime();
    const dateB = new Date(b.created_at).getTime();
    return dateB - dateA; // Newest first
  });

  const unreadCount = allNotifications.filter(n => !n.is_read).length;

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="space-y-6">
        {/* Header with Back Button */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.back()}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Retour
            </Button>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Bell className="h-6 w-6" />
                <h1 className="text-3xl font-bold">Notifications</h1>
              </div>
              <p className="text-muted-foreground">
                Votre centre de notifications
              </p>
            </div>
          </div>
          
          {unreadCount > 0 && (
            <Badge variant="secondary" className="text-lg px-3 py-1">
              {unreadCount} non {unreadCount === 1 ? 'lue' : 'lues'}
            </Badge>
          )}
        </div>

        {/* Refresh Button */}
        <div className="flex justify-end">
          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchNotifications()}
            disabled={isRefreshing}
          >
            {isRefreshing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Actualisation...
              </>
            ) : (
              <>
                <RefreshCw className="mr-2 h-4 w-4" />
                Actualiser
              </>
            )}
          </Button>
        </div>

        {/* Loading State */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : allNotifications.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Bell className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground text-center">
                Aucune notification pour le moment
              </p>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Notifications List */}
            <div className="space-y-4">
              {allNotifications.map((notification) => {
                const isFCM = 'is_fcm' in notification && notification.is_fcm;
                
                return (
                  <Card
                    key={notification.id}
                    className={`transition-all hover:shadow-md ${
                      !notification.is_read ? 'border-primary/50' : ''
                    } ${isFCM ? 'border-blue-500/30' : ''}`}
                  >
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 space-y-2">
                          <div className="flex items-center gap-2">
                            {isFCM && (
                              <MessageSquare className="h-4 w-4 text-blue-500" />
                            )}
                            <h3 className="font-semibold text-lg">
                              {notification.title}
                            </h3>
                            {!notification.is_read && (
                              <span className="h-2 w-2 rounded-full bg-primary" />
                            )}
                            {isFCM && (
                              <Badge variant="outline" className="text-xs">
                                Notification push
                              </Badge>
                            )}
                          </div>
                          
                          <p className="text-muted-foreground">
                            {notification.content}
                          </p>
                          
                          <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            <span>{formatDate(notification.created_at)}</span>
                            {'reference' in notification && notification.reference && (
                              <span>Réf. : {notification.reference}</span>
                            )}
                          </div>
                        </div>
                        
                        {!notification.is_read && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => markAsRead(notification.id)}
                            className="flex items-center gap-2"
                          >
                            <Check className="h-4 w-4" />
                            <span className="hidden sm:inline">Marquer comme lu</span>
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            {/* Pagination */}
            {(hasNext || hasPrevious) && (
              <div className="flex items-center justify-center gap-4">
                <Button
                  variant="outline"
                  onClick={() => fetchNotifications(page - 1)}
                  disabled={!hasPrevious || isLoading}
                >
                  Précédent
                </Button>
                <span className="text-sm text-muted-foreground">
                  Page {page}
                </span>
                <Button
                  variant="outline"
                  onClick={() => fetchNotifications(page + 1)}
                  disabled={!hasNext || isLoading}
                >
                  Suivant
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
