import { useState, useEffect } from 'react';
import { Bell, MessageSquare, FileText, UserPlus, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ToastAction } from '@/components/ui/toast';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { formatShortName } from '@/lib/utils';

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  link: string | null;
  read: boolean;
  created_at: string;
}

export const NotificationBell = ({ profileId }: { profileId: string }) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    loadNotifications();
    
    // Subscribe to real-time notifications
    const channel = supabase
      .channel('notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${profileId}`,
        },
        (payload) => {
          const newNotification = payload.new as Notification;
          
          // Agrupar notificações: substituir notificação anterior da mesma conversa
          setNotifications(prev => {
            // Se é notificação de mensagem, verificar se já existe uma da mesma conversa
            if (newNotification.type === 'message' || newNotification.type === 'negotiation') {
              // Remover notificações anteriores da mesma conversa (mesmo link)
              const filtered = prev.filter(n => 
                n.link !== newNotification.link || 
                (n.type !== 'message' && n.type !== 'negotiation')
              );
              return [newNotification, ...filtered].slice(0, 10); // Manter apenas 10 notificações
            }
            // Para outros tipos, apenas adicionar
            return [newNotification, ...prev].slice(0, 10);
          });
          
          setUnreadCount(prev => prev + 1);
          
          // Show toast for new notification with click action
          toast({
            title: formatNotificationTitle(newNotification.title),
            description: newNotification.message,
            action: newNotification.link ? (
              <ToastAction 
                altText="Ver notificação" 
                onClick={() => navigate(newNotification.link!)}
              >
                Ver
              </ToastAction>
            ) : undefined,
          });
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${profileId}`,
        },
        (payload) => {
          // Atualizar notificação existente
          const updatedNotification = payload.new as Notification;
          setNotifications(prev =>
            prev.map(n => n.id === updatedNotification.id ? updatedNotification : n)
          );
          // Recalcular contagem de não lidas
          setUnreadCount(prev => {
            const newCount = notifications.filter(n => !n.read).length;
            return newCount;
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [profileId, toast, navigate]);

  const loadNotifications = async () => {
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', profileId)
      .order('created_at', { ascending: false })
      .limit(10);

    if (!error && data) {
      setNotifications(data);
      setUnreadCount(data.filter(n => !n.read).length);
    }
  };

  const markAsRead = async (notificationId: string) => {
    await supabase
      .from('notifications')
      .update({ read: true })
      .eq('id', notificationId);
    
    setNotifications(prev =>
      prev.map(n => n.id === notificationId ? { ...n, read: true } : n)
    );
    setUnreadCount(prev => Math.max(0, prev - 1));
  };

  const handleNotificationClick = async (notification: Notification) => {
    await markAsRead(notification.id);
    if (notification.link) {
      navigate(notification.link);
    }
  };

  const markAllAsRead = async () => {
    const unreadIds = notifications.filter(n => !n.read).map(n => n.id);
    if (unreadIds.length === 0) return;

    // Atualizar estado local imediatamente para feedback instantâneo
    setNotifications(prev =>
      prev.map(n => ({ ...n, read: true }))
    );
    setUnreadCount(0);

    // Atualizar no banco em background
    await supabase
      .from('notifications')
      .update({ read: true })
      .in('id', unreadIds);
    
    toast({
      title: "Notificações marcadas",
      description: "Todas as notificações foram marcadas como lidas",
    });
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'message':
        return <MessageSquare className="h-5 w-5" />;
      case 'proposal':
        return <FileText className="h-5 w-5" />;
      case 'negotiation':
        return <MessageSquare className="h-5 w-5" />;
      case 'follow':
        return <UserPlus className="h-5 w-5" />;
      default:
        return <AlertCircle className="h-5 w-5" />;
    }
  };

  const getNotificationIconColor = (type: string) => {
    switch (type) {
      case 'message':
        return 'bg-blue-500';
      case 'proposal':
        return 'bg-yellow-500';
      case 'negotiation':
        return 'bg-blue-500';
      case 'follow':
        return 'bg-teal-500';
      default:
        return 'bg-gray-500';
    }
  };

  const formatTimeAgo = (date: string) => {
    return formatDistanceToNow(new Date(date), { 
      addSuffix: true, 
      locale: ptBR 
    });
  };

  // Função para formatar o título da notificação (nomes em formato curto)
  const formatNotificationTitle = (title: string) => {
    // Se o título contém "Mensagem de:", formatar o nome depois
    if (title.startsWith('Mensagem de: ')) {
      const name = title.replace('Mensagem de: ', '');
      return `Mensagem de: ${formatShortName(name)}`;
    }
    // Para outros casos, tentar formatar nomes em formato curto
    return title.split(' ').map(word => {
      // Se a palavra está toda em maiúsculas e tem mais de 2 caracteres, formatar
      if (word.length > 2 && word === word.toUpperCase() && /^[A-ZÁÀÂÃÉÈÊÍÏÓÔÕÖÚÇÑ]+$/.test(word)) {
        return formatShortName(word);
      }
      return word;
    }).join(' ');
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge 
              variant="destructive" 
              className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
            >
              {unreadCount}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 p-0">
        {notifications.length === 0 ? (
          <div className="p-4 text-center text-muted-foreground">
            Nenhuma notificação
          </div>
        ) : (
          <>
            <div className="p-2 border-b flex justify-between items-center">
              <span className="text-sm font-semibold">Notificações</span>
              {unreadCount > 0 && (
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={markAllAsRead}
                  className="h-8 text-xs"
                >
                  Marcar todas como lidas
                </Button>
              )}
            </div>
            <ScrollArea className="h-[400px]">
              {notifications.map((notification) => (
                <DropdownMenuItem
                  key={notification.id}
                  onClick={() => handleNotificationClick(notification)}
                  className={`p-4 cursor-pointer border-b last:border-b-0 ${!notification.read ? 'bg-muted/30' : ''} hover:bg-muted/50`}
                >
                  <div className="flex gap-3 w-full">
                    <div className={`${getNotificationIconColor(notification.type)} rounded-lg p-2 h-10 w-10 flex items-center justify-center text-white flex-shrink-0`}>
                      {getNotificationIcon(notification.type)}
                    </div>
                    <div className="flex flex-col gap-1 flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <span className="font-semibold text-sm leading-tight">
                          {formatNotificationTitle(notification.title)}
                        </span>
                        {!notification.read && (
                          <div className="h-2 w-2 rounded-full bg-primary flex-shrink-0 mt-1" />
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground line-clamp-2">{notification.message}</p>
                      <span className="text-xs text-primary font-medium">
                        {formatTimeAgo(notification.created_at)}
                      </span>
                    </div>
                  </div>
                </DropdownMenuItem>
              ))}
            </ScrollArea>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
