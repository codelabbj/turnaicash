'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Bell, Check, RefreshCw, Loader2 } from 'lucide-react';
import { notificationApi } from '@/lib/api-client';
import { Notification } from '@/lib/types';
import { format, parseISO } from 'date-fns';
import { toast } from 'react-hot-toast';

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
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
      toast.error('Failed to load notifications');
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

  const markAsRead = async (notificationId: number) => {
    // Note: You may need to add this API endpoint if it doesn't exist
    try {
      // TODO: Implement mark as read API call if available
      setNotifications(prev =>
        prev.map(notif =>
          notif.id === notificationId ? { ...notif, is_read: true } : notif
        )
      );
      toast.success('Notification marked as read');
    } catch (error) {
      console.error('Error marking notification as read:', error);
      toast.error('Failed to update notification');
    }
  };

  const formatDate = (dateString: string) => {
    try {
      return format(parseISO(dateString), 'PPP p');
    } catch {
      return dateString;
    }
  };

  const unreadCount = notifications.filter(n => !n.is_read).length;

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Bell className="h-6 w-6" />
              <h1 className="text-3xl font-bold">Notifications</h1>
            </div>
            <p className="text-muted-foreground">
              Your notification center
            </p>
          </div>
          
          {unreadCount > 0 && (
            <Badge variant="secondary" className="text-lg px-3 py-1">
              {unreadCount} unread
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
                Refreshing...
              </>
            ) : (
              <>
                <RefreshCw className="mr-2 h-4 w-4" />
                Refresh
              </>
            )}
          </Button>
        </div>

        {/* Loading State */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : notifications.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Bell className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground text-center">
                No notifications yet
              </p>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Notifications List */}
            <div className="space-y-4">
              {notifications.map((notification) => (
                <Card
                  key={notification.id}
                  className={`transition-all hover:shadow-md ${
                    !notification.is_read ? 'border-primary/50' : ''
                  }`}
                >
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold text-lg">
                            {notification.title}
                          </h3>
                          {!notification.is_read && (
                            <span className="h-2 w-2 rounded-full bg-primary" />
                          )}
                        </div>
                        
                        <p className="text-muted-foreground">
                          {notification.content}
                        </p>
                        
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <span>{formatDate(notification.created_at)}</span>
                          {notification.reference && (
                            <span>Ref: {notification.reference}</span>
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
                          <span className="hidden sm:inline">Mark as read</span>
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Pagination */}
            {(hasNext || hasPrevious) && (
              <div className="flex items-center justify-center gap-4">
                <Button
                  variant="outline"
                  onClick={() => fetchNotifications(page - 1)}
                  disabled={!hasPrevious || isLoading}
                >
                  Previous
                </Button>
                <span className="text-sm text-muted-foreground">
                  Page {page}
                </span>
                <Button
                  variant="outline"
                  onClick={() => fetchNotifications(page + 1)}
                  disabled={!hasNext || isLoading}
                >
                  Next
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
