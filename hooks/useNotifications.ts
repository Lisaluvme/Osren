import { useDispatch, useSelector } from 'react-redux';
import type { RootState, AppDispatch } from '../store';
import {
  getNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  clearError,
  decrementUnreadCount,
} from '../store/slices/notificationSlice';
import type { Notification } from '../store/slices/notificationSlice';

export const useNotifications = () => {
  const dispatch = useDispatch<AppDispatch>();
  const notificationsState = useSelector((state: RootState) => state.notifications);

  const fetchNotifications = async (params?: {
    is_read?: boolean;
    type?: string;
    limit?: number;
    offset?: number;
  }) => {
    return dispatch(getNotifications(params || {}));
  };

  const fetchUnreadCount = async () => {
    return dispatch(getUnreadCount());
  };

  const markNotificationAsRead = async (notificationId: string) => {
    return dispatch(markAsRead(notificationId));
  };

  const markAllNotificationsAsRead = async () => {
    return dispatch(markAllAsRead());
  };

  const removeNotification = async (notificationId: string) => {
    return dispatch(deleteNotification(notificationId));
  };

  const clearNotificationsError = () => {
    dispatch(clearError());
  };

  const decrementUnread = () => {
    dispatch(decrementUnreadCount());
  };

  return {
    notifications: notificationsState.notifications,
    unreadCount: notificationsState.unreadCount,
    isLoading: notificationsState.isLoading,
    error: notificationsState.error,
    fetchNotifications,
    fetchUnreadCount,
    markNotificationAsRead,
    markAllNotificationsAsRead,
    removeNotification,
    clearError: clearNotificationsError,
    decrementUnread,
  };
};
