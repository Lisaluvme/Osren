import { Role, Permission } from '../lib/permissions';
import { useAuth } from './useAuth';

export const usePermissions = () => {
  const { userRole } = useAuth();

  const hasPermission = (permission: Permission): boolean => {
    const ROLE_PERMISSIONS = {
      [Role.ADMIN]: Object.values(Permission),
      [Role.SALES]: [
        Permission.CREATE_DOCUMENT,
        Permission.READ_DOCUMENT,
        Permission.UPDATE_DOCUMENT,
        Permission.TRANSITION_WORKFLOW,
        Permission.VIEW_WORKFLOW,
        Permission.MANAGE_SALES,
        Permission.VIEW_SALES,
        Permission.VIEW_INVENTORY,
        Permission.VIEW_FINANCE,
        Permission.VIEW_AUDIT
      ],
      [Role.ACCOUNTS]: [
        Permission.CREATE_DOCUMENT,
        Permission.READ_DOCUMENT,
        Permission.UPDATE_DOCUMENT,
        Permission.APPROVE_DOCUMENT,
        Permission.REJECT_DOCUMENT,
        Permission.TRANSITION_WORKFLOW,
        Permission.VIEW_WORKFLOW,
        Permission.MANAGE_FINANCE,
        Permission.VIEW_FINANCE,
        Permission.VIEW_INVENTORY,
        Permission.VIEW_AUDIT,
        Permission.VIEW_SALES
      ],
      [Role.LOGISTICS]: [
        Permission.READ_DOCUMENT,
        Permission.UPDATE_DOCUMENT,
        Permission.TRANSITION_WORKFLOW,
        Permission.VIEW_WORKFLOW,
        Permission.MANAGE_LOGISTICS,
        Permission.VIEW_LOGISTICS,
        Permission.VIEW_INVENTORY,
        Permission.VIEW_AUDIT
      ],
      [Role.TECHNICIAN]: [
        Permission.READ_DOCUMENT,
        Permission.UPDATE_DOCUMENT,
        Permission.TRANSITION_WORKFLOW,
        Permission.VIEW_WORKFLOW,
        Permission.VIEW_INVENTORY
      ],
      [Role.VIEWER]: [
        Permission.READ_DOCUMENT,
        Permission.VIEW_WORKFLOW,
        Permission.VIEW_INVENTORY,
        Permission.VIEW_FINANCE,
        Permission.VIEW_SALES,
        Permission.VIEW_LOGISTICS,
        Permission.VIEW_AUDIT
      ]
    };

    return ROLE_PERMISSIONS[userRole]?.includes(permission) || false;
  };

  const hasAnyPermission = (permissions: Permission[]): boolean => {
    return permissions.some(perm => hasPermission(perm));
  };

  const hasAllPermissions = (permissions: Permission[]): boolean => {
    return permissions.every(perm => hasPermission(perm));
  };

  const canCreateDocument = (documentType: string): boolean => {
    const typePermissions: Record<string, Role[]> = {
      quotation: [Role.SALES, Role.ADMIN],
      invoice: [Role.ACCOUNTS, Role.ADMIN],
      delivery_order: [Role.LOGISTICS, Role.ADMIN],
      purchase_order: [Role.ACCOUNTS, Role.ADMIN],
      sales_order: [Role.SALES, Role.ADMIN],
      credit_note: [Role.ACCOUNTS, Role.ADMIN],
      debit_note: [Role.ACCOUNTS, Role.ADMIN]
    };

    return typePermissions[documentType]?.includes(userRole) || false;
  };

  const canEditDocument = (status: string): boolean => {
    return ['draft', 'internal_review', 'rejected'].includes(status);
  };

  const canDeleteDocument = (status: string): boolean => {
    return ['draft', 'rejected'].includes(status);
  };

  const canApproveDocument = (): boolean => {
    return hasPermission(Permission.APPROVE_DOCUMENT);
  };

  const canRejectDocument = (): boolean => {
    return hasPermission(Permission.REJECT_DOCUMENT);
  };

  const canTransitionWorkflow = (): boolean => {
    return hasPermission(Permission.TRANSITION_WORKFLOW);
  };

  const canViewAudit = (): boolean => {
    return hasPermission(Permission.VIEW_AUDIT);
  };

  const canManageUsers = (): boolean => {
    return hasPermission(Permission.MANAGE_USERS);
  };

  return {
    userRole,
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    canCreateDocument,
    canEditDocument,
    canDeleteDocument,
    canApproveDocument,
    canRejectDocument,
    canTransitionWorkflow,
    canViewAudit,
    canManageUsers,
  };
};
