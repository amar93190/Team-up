import { createContext, PropsWithChildren, useCallback, useContext, useMemo, useRef, useState } from "react";

export type AppNotification = {
  id: string;
  title?: string;
  message: string;
  createdAt: number;
  read: boolean;
};

export type NotificationCenterState = {
  notifications: AppNotification[];
  unreadCount: number;
  add: (message: string, title?: string) => void;
  markAllRead: () => void;
  clear: () => void;
};

const NotificationCenterContext = createContext<NotificationCenterState>({
  notifications: [],
  unreadCount: 0,
  add: () => {},
  markAllRead: () => {},
  clear: () => {},
});

export function useNotificationCenter() {
  return useContext(NotificationCenterContext);
}

export function NotificationCenterProvider({ children }: PropsWithChildren) {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);

  const add = useCallback((message: string, title?: string) => {
    const notif: AppNotification = {
      id: String(Date.now() + Math.random()),
      title,
      message,
      createdAt: Date.now(),
      read: false,
    };
    setNotifications((prev) => [notif, ...prev].slice(0, 100));
  }, []);

  const markAllRead = useCallback(() => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  }, []);

  const clear = useCallback(() => setNotifications([]), []);

  const unreadCount = useMemo(() => notifications.filter((n) => !n.read).length, [notifications]);

  const value = useMemo(
    () => ({ notifications, unreadCount, add, markAllRead, clear }),
    [notifications, unreadCount, add, markAllRead, clear],
  );

  return <NotificationCenterContext.Provider value={value}>{children}</NotificationCenterContext.Provider>;
}
