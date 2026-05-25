import { configureStore } from '@reduxjs/toolkit';
import authReducer from './slices/authSlice';
import workflowReducer from './slices/workflowSlice';
import documentReducer from './slices/documentSlice';
import notificationReducer from './slices/notificationSlice';
import auditReducer from './slices/auditSlice';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    workflow: workflowReducer,
    documents: documentReducer,
    notifications: notificationReducer,
    audit: auditReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        // Ignore these action types
        ignoredActions: ['documents/setSelectedDocument'],
        // Ignore these field paths in all actions
        ignoredActionPaths: ['meta.arg', 'payload.timestamp'],
        // Ignore these paths in the state
        ignoredPaths: ['documents.selectedDocument'],
      },
    }),
});

// Infer the `RootState` and `AppDispatch` types from the store itself
export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
