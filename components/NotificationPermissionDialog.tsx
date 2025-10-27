'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Bell, BellOff, Smartphone, Loader2 } from 'lucide-react';

interface NotificationPermissionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEnable: () => Promise<void>;
  onSkip: () => void;
}

export function NotificationPermissionDialog({
  open,
  onOpenChange,
  onEnable,
  onSkip,
}: NotificationPermissionDialogProps) {
  const [isLoading, setIsLoading] = useState(false);

  const handleEnable = async () => {
    setIsLoading(true);
    try {
      await onEnable();
      onOpenChange(false);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <div className="flex items-center gap-2 mb-2">
            <Bell className="h-6 w-6 text-primary" />
            <DialogTitle>Activer les notifications</DialogTitle>
          </div>
          <DialogDescription>
            Recevez des alertes en temps réel sur vos transactions et l'activité de votre compte.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <div className="flex items-start gap-3">
              <Bell className="h-5 w-5 text-green-500 mt-0.5" />
              <div>
                <h4 className="font-medium text-sm">Notifications transactionnelles</h4>
                <p className="text-sm text-muted-foreground">
                  Soyez informé instantanément de vos dépôts, retraits et transferts
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <Smartphone className="h-5 w-5 text-blue-500 mt-0.5" />
            <div>
              <h4 className="font-medium text-sm">Multi-appareil</h4>
              <p className="text-sm text-muted-foreground">
                Recevez des notifications même quand l'application est fermée
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <BellOff className="h-5 w-5 text-gray-500 mt-0.5" />
            <div>
              <h4 className="font-medium text-sm">Contrôle total</h4>
              <p className="text-sm text-muted-foreground">
                Vous pouvez les désactiver à tout moment dans les paramètres
              </p>
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onSkip} disabled={isLoading}>
            Plus tard
          </Button>
          <Button onClick={handleEnable} disabled={isLoading}>
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Activation...
              </>
            ) : (
              <>
                <Bell className="mr-2 h-4 w-4" />
                Activer les notifications
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

