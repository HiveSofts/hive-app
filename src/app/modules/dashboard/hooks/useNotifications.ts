import { useState, useCallback } from "react";
import { Notification } from "../types";
import { NOTIFICATIONS } from "../constants";

export function useNotifications(initialNotifications: Notification[] = NOTIFICATIONS) {
  const [notifications, setNotifications] = useState(initialNotifications);

  const addNotification = useCallback((notification: Notification) => {
    setNotifications((prev) => [notification, ...prev]);
  }, []);

  const dismissNotification = useCallback((id: number) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  }, []);

  const dismissAll = useCallback(() => {
    setNotifications([]);
  }, []);

  const handleAction = useCallback((notification: Notification) => {
    //TODO  منطق اجرای اکشن
    console.log("Action clicked:", notification.action, notification);
    dismissNotification(notification.id);
  }, [dismissNotification]);

  return {
    notifications,
    addNotification,
    dismissNotification,
    dismissAll,
    handleAction,
  };
}