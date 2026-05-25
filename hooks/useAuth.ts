import { useDispatch, useSelector } from 'react-redux';
import type { RootState, AppDispatch } from '../store';
import {
  login,
  register,
  getCurrentUser,
  updateProfile,
  changePassword,
  logout,
  setAuthFromStorage,
  clearError,
} from '../store/slices/authSlice';
import { Role, hasPermission } from '../lib/permissions';

export const useAuth = () => {
  const dispatch = useDispatch<AppDispatch>();
  const auth = useSelector((state: RootState) => state.auth);

  const loginUser = async (email: string, password: string) => {
    return dispatch(login({ email, password }));
  };

  const registerUser = async (userData: {
    email: string;
    password: string;
    full_name: string;
    role_name: string;
  }) => {
    return dispatch(register(userData));
  };

  const fetchCurrentUser = async () => {
    return dispatch(getCurrentUser());
  };

  const updateUserProfile = async (updates: { full_name: string }) => {
    return dispatch(updateProfile(updates));
  };

  const updateUserPassword = async (passwords: {
    currentPassword: string;
    newPassword: string;
  }) => {
    return dispatch(changePassword(passwords));
  };

  const logoutUser = () => {
    dispatch(logout());
  };

  const restoreAuth = (user: any, accessToken: string) => {
    dispatch(setAuthFromStorage({ user, accessToken }));
  };

  const clearAuthError = () => {
    dispatch(clearError());
  };

  const isAuthenticated = auth.isAuthenticated;
  const user = auth.user;
  const userRole = user?.role?.name as Role || Role.VIEWER;

  const hasPermissionCheck = (permission: string): boolean => {
    return hasPermission(userRole, permission as any);
  };

  const hasAnyPermission = (permissions: string[]): boolean => {
    return permissions.some(perm => hasPermission(userRole, perm as any));
  };

  const hasAllPermissions = (permissions: string[]): boolean => {
    return permissions.every(perm => hasPermission(userRole, perm as any));
  };

  const isAdmin = userRole === Role.ADMIN;

  return {
    user,
    isAuthenticated,
    isLoading: auth.isLoading,
    error: auth.error,
    userRole,
    loginUser,
    registerUser,
    fetchCurrentUser,
    updateUserProfile,
    updateUserPassword,
    logoutUser,
    restoreAuth,
    clearAuthError,
    hasPermission: hasPermissionCheck,
    hasAnyPermission,
    hasAllPermissions,
    isAdmin,
  };
};
