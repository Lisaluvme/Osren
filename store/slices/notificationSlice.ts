import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';

export interface Notification {
  id: string;
  user_id: string;
  type: string;
  title: string;
  message: string;
  related_entity_type: string | null;
  related_entity_id: string | null;
  is_read: boolean;
  read_at: string | null;
  created_at: string;
}

interface NotificationState {
  notifications: Notification[];
  unreadCount: number;
  isLoading: boolean;
  error: string | null;
}

const initialState: NotificationState = {
  notifications: [],
  unreadCount: 0,
  isLoading: false,
  error: null,
};

// Async thunks
export const getNotifications = createAsyncThunk(
  'notifications/getNotifications',
  async (params: {
    is_read?: boolean;
    type?: string;
    limit?: number;
    offset?: number;
  }) => {
    const query = new URLSearchParams();
    if (params.is_read !== undefined) {
      query.append('is_read', String(params.is_read));
    }
    if (params.type) query.append('type', params.type);
    query.append('limit', String(params.limit || 50));
    query.append('offset', String(params.offset || 0));

    const response = await fetch(`/api/notifications?${query}`, {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${localStorage.getItem('accessToken')}`,
      },
    });

    if (!response.ok) {
      throw new Error('Failed to get notifications');
    }

    const data = await response.json();
    return data.data;
  }
);

export const getUnreadCount = createAsyncThunk(
  'notifications/getUnreadCount',
  async () => {
    const response = await fetch('/api/notifications/unread-count', {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${localStorage.getItem('accessToken')}`,
      },
    });

    if (!response.ok) {
      throw new Error('Failed to get unread count');
    }

    const data = await response.json();
    return data.data.count;
  }
);

export const markAsRead = createAsyncThunk(
  'notifications/markAsRead',
  async (notificationId: string) => {
    const response = await fetch(`/api/notifications/${notificationId}/read`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${localStorage.getItem('accessToken')}`,
      },
    });

    if (!response.ok) {
      throw new Error('Failed to mark notification as read');
    }

    const data = await response.json();
    return data.data;
  }
);

export const markAllAsRead = createAsyncThunk(
  'notifications/markAllAsRead',
  async () => {
    const response = await fetch('/api/notifications/read-all', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${localStorage.getItem('accessToken')}`,
      },
    });

    if (!response.ok) {
      throw new Error('Failed to mark all as read');
    }

    return true;
  }
);

export const deleteNotification = createAsyncThunk(
  'notifications/deleteNotification',
  async (notificationId: string) => {
    const response = await fetch(`/api/notifications/${notificationId}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${localStorage.getItem('accessToken')}`,
      },
    });

    if (!response.ok) {
      throw new Error('Failed to delete notification');
    }

    return notificationId;
  }
);

const notificationSlice = createSlice({
  name: 'notifications',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    decrementUnreadCount: (state) => {
      state.unreadCount = Math.max(0, state.unreadCount - 1);
    },
  },
  extraReducers: (builder) => {
    builder
      // Get notifications
      .addCase(getNotifications.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(getNotifications.fulfilled, (state, action) => {
        state.isLoading = false;
        state.notifications = action.payload.notifications;
        state.unreadCount = action.payload.unreadCount;
      })
      .addCase(getNotifications.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.error.message || 'Failed to get notifications';
      })
      // Get unread count
      .addCase(getUnreadCount.fulfilled, (state, action) => {
        state.unreadCount = action.payload;
      })
      // Mark as read
      .addCase(markAsRead.fulfilled, (state, action) => {
        const index = state.notifications.findIndex((n) => n.id === action.payload.id);
        if (index !== -1) {
          state.notifications[index] = action.payload;
        }
        if (action.payload.is_read) {
          state.unreadCount = Math.max(0, state.unreadCount - 1);
        }
      })
      // Mark all as read
      .addCase(markAllAsRead.fulfilled, (state) => {
        state.notifications = state.notifications.map((n) => ({
          ...n,
          is_read: true,
          read_at: new Date().toISOString(),
        }));
        state.unreadCount = 0;
      })
      // Delete notification
      .addCase(deleteNotification.fulfilled, (state, action) => {
        state.notifications = state.notifications.filter((n) => n.id !== action.payload);
        const deletedNotification = state.notifications.find((n) => n.id === action.payload);
        if (deletedNotification && !deletedNotification.is_read) {
          state.unreadCount = Math.max(0, state.unreadCount - 1);
        }
      });
  },
});

export const { clearError, decrementUnreadCount } = notificationSlice.actions;
export default notificationSlice.reducer;
