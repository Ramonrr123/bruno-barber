import { useState, useCallback, useEffect } from 'react';

export type NotificationType = 'success' | 'error' | 'info';

export interface Notification {
  id: string;
  message: string;
  type: NotificationType;
}

let notificationId = 0;
const listeners: Set<(notifications: Notification[]) => void> = new Set();
let notifications: Notification[] = [];

const notifyListeners = () => {
  listeners.forEach((listener) => listener([...notifications]));
};

export const useNotification = () => {
  const [state, setState] = useState<Notification[]>(notifications);

  useEffect(() => {
    const listener = (newNotifications: Notification[]) => {
      setState(newNotifications);
    };
    listeners.add(listener);
    setState([...notifications]); // Sincronizar estado inicial
    return () => {
      listeners.delete(listener);
    };
  }, []);

  const show = useCallback((message: string, type: NotificationType = 'info') => {
    const id = (++notificationId).toString();
    const notification: Notification = { id, message, type };
    
    notifications.push(notification);
    notifyListeners();
    
    // Auto-remover após 3 segundos
    setTimeout(() => {
      notifications = notifications.filter((n) => n.id !== id);
      notifyListeners();
    }, 3000);
    
    return id;
  }, []);

  const remove = useCallback((id: string) => {
    notifications = notifications.filter((n) => n.id !== id);
    notifyListeners();
  }, []);

  const success = useCallback((message: string) => show(message, 'success'), [show]);
  const error = useCallback((message: string) => show(message, 'error'), [show]);
  const info = useCallback((message: string) => show(message, 'info'), [show]);

  return {
    notifications: state,
    show,
    success,
    error,
    info,
    remove,
  };
};

// Funções globais para usar sem hook
export const notification = {
  success: (message: string) => {
    const id = (++notificationId).toString();
    const notification: Notification = { id, message, type: 'success' };
    notifications.push(notification);
    notifyListeners();
    setTimeout(() => {
      notifications = notifications.filter((n) => n.id !== id);
      notifyListeners();
    }, 3000);
  },
  error: (message: string) => {
    const id = (++notificationId).toString();
    const notification: Notification = { id, message, type: 'error' };
    notifications.push(notification);
    notifyListeners();
    setTimeout(() => {
      notifications = notifications.filter((n) => n.id !== id);
      notifyListeners();
    }, 3000);
  },
  info: (message: string) => {
    const id = (++notificationId).toString();
    const notification: Notification = { id, message, type: 'info' };
    notifications.push(notification);
    notifyListeners();
    setTimeout(() => {
      notifications = notifications.filter((n) => n.id !== id);
      notifyListeners();
    }, 3000);
  },
};
