import { useState, useEffect } from 'react';
import { Bell, BellOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface NotificationManagerProps {
  onReminderTriggered?: () => void;
}

export function NotificationManager({ onReminderTriggered }: NotificationManagerProps) {
  const [isEnabled, setIsEnabled] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const { toast } = useToast();

  // Check notification permission on mount
  useEffect(() => {
    if ('Notification' in window) {
      setPermission(Notification.permission);
      // Restore preference from localStorage
      const saved = localStorage.getItem('timeReminderEnabled');
      if (saved === 'true' && Notification.permission === 'granted') {
        setIsEnabled(true);
      }
    }
  }, []);

  // Set up 17:30 reminder
  useEffect(() => {
    if (!isEnabled) return;

    const checkTime = () => {
      const now = new Date();
      const hours = now.getHours();
      const minutes = now.getMinutes();

      if (hours === 17 && minutes === 30) {
        sendNotification();
      }
    };

    const sendNotification = () => {
      // Browser notification
      if (Notification.permission === 'granted') {
        new Notification('⏰ APPMATO - Validation des temps', {
          body: 'N\'oubliez pas de valider vos temps de la journée !',
          icon: '/favicon.ico',
          tag: 'time-reminder',
          requireInteraction: true
        });
      }

      // In-app toast
      toast({
        title: "⏰ Rappel - 17h30",
        description: "N'oubliez pas de valider vos temps de la journée !",
        duration: 10000,
      });

      onReminderTriggered?.();
    };

    // Check every minute
    const interval = setInterval(checkTime, 60000);

    // Also check immediately
    checkTime();

    return () => clearInterval(interval);
  }, [isEnabled, toast, onReminderTriggered]);

  const requestPermission = async () => {
    if (!('Notification' in window)) {
      toast({
        title: "Non supporté",
        description: "Votre navigateur ne supporte pas les notifications.",
        variant: "destructive"
      });
      return;
    }

    const result = await Notification.requestPermission();
    setPermission(result);

    if (result === 'granted') {
      setIsEnabled(true);
      localStorage.setItem('timeReminderEnabled', 'true');
      toast({
        title: "Notifications activées",
        description: "Vous recevrez un rappel à 17h30 pour valider vos temps.",
      });
    } else if (result === 'denied') {
      toast({
        title: "Notifications refusées",
        description: "Activez les notifications dans les paramètres du navigateur.",
        variant: "destructive"
      });
    }
  };

  const toggleReminder = () => {
    if (!isEnabled && permission !== 'granted') {
      requestPermission();
    } else {
      setIsEnabled(!isEnabled);
      localStorage.setItem('timeReminderEnabled', String(!isEnabled));
      toast({
        title: !isEnabled ? "Rappel activé" : "Rappel désactivé",
        description: !isEnabled
          ? "Rappel quotidien à 17h30 activé."
          : "Rappel quotidien désactivé."
      });
    }
  };

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={toggleReminder}
      className={cn(
        "gap-2 rounded-xl",
        isEnabled && "bg-primary/10 text-primary"
      )}
    >
      {isEnabled ? (
        <>
          <Bell className="w-4 h-4" />
          <span className="hidden sm:inline">17:30</span>
        </>
      ) : (
        <>
          <BellOff className="w-4 h-4" />
          <span className="hidden sm:inline">Rappel</span>
        </>
      )}
    </Button>
  );
}
