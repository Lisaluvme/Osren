import React, { useState } from 'react';
import { Bell, Check, X, Clock, CheckCircle, AlertCircle, Info } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

export interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  related_entity_type?: string;
  related_entity_id?: string;
  is_read: boolean;
  read_at?: string;
  created_at: string;
}

interface NotificationPanelProps {
  notifications: Notification[];
  unreadCount: number;
  onMarkAsRead?: (id: string) => void;
  onMarkAllAsRead?: () => void;
  onDelete?: (id: string) => void;
  maxItems?: number;
}

const NotificationPanel: React.FC<NotificationPanelProps> = ({
  notifications,
  unreadCount,
  onMarkAsRead,
  onMarkAllAsRead,
  onDelete,
  maxItems = 10
}) => {
  const [isOpen, setIsOpen] = useState(false);

  const getNotificationIcon = (type: string) => {
    const notificationType = type.toLowerCase();

    if (notificationType.includes('approved') || notificationType.includes('complete')) {
      return { icon: CheckCircle, color: 'text-green-600', bgColor: 'bg-green-100' };
    }
    if (notificationType.includes('rejected') || notificationType.includes('error')) {
      return { icon: AlertCircle, color: 'text-red-600', bgColor: 'bg-red-100' };
    }
    if (notificationType.includes('pending') || notificationType.includes('waiting')) {
      return { icon: Clock, color: 'text-yellow-600', bgColor: 'bg-yellow-100' };
    }

    return { icon: Info, color: 'text-blue-600', bgColor: 'bg-blue-100' };
  };

  const displayedNotifications = notifications.slice(0, maxItems);

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
        type="button"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute top-0 right-0 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-96 bg-white rounded-lg shadow-lg border border-slate-200 z-50 max-h-96 overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <h3 className="font-semibold text-slate-800">Notifications</h3>
            {unreadCount > 0 && onMarkAllAsRead && (
              <button
                onClick={() => {
                  onMarkAllAsRead();
                }}
                className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                type="button"
              >
                Mark all read
              </button>
            )}
          </div>

          <div className="overflow-y-auto max-h-80">
            {displayedNotifications.length === 0 ? (
              <div className="p-8 text-center text-slate-400">
                <Bell className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No notifications</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {displayedNotifications.map((notification) => {
                  const { icon: Icon, color, bgColor } = getNotificationIcon(notification.type);

                  return (
                    <div
                      key={notification.id}
                      className={`p-4 hover:bg-slate-50 transition-colors ${
                        !notification.is_read ? 'bg-blue-50/50' : ''
                      }`}
                    >
                      <div className="flex gap-3">
                        <div className={`p-2 rounded-full ${bgColor} ${color} mt-0.5`}>
                          <Icon className="w-4 h-4" />
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <p className="text-sm font-medium text-slate-800">
                              {notification.title}
                            </p>
                            <div className="flex items-center gap-1">
                              {!notification.is_read && onMarkAsRead && (
                                <button
                                  onClick={() => onMarkAsRead(notification.id)}
                                  className="text-slate-400 hover:text-blue-600 transition-colors"
                                  type="button"
                                  title="Mark as read"
                                >
                                  <Check className="w-4 h-4" />
                                </button>
                              )}
                              {onDelete && (
                                <button
                                  onClick={() => onDelete(notification.id)}
                                  className="text-slate-400 hover:text-red-600 transition-colors"
                                  type="button"
                                  title="Delete"
                                >
                                  <X className="w-4 h-4" />
                                </button>
                              )}
                            </div>
                          </div>
                          <p className="text-sm text-slate-600 mt-0.5">{notification.message}</p>
                          <p className="text-xs text-slate-400 mt-1">
                            {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {notifications.length > maxItems && (
            <div className="p-3 border-t border-slate-100 text-center">
              <button className="text-sm text-blue-600 hover:text-blue-700 font-medium">
                View all {notifications.length} notifications
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default NotificationPanel;
