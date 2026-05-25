/**
 * Permission System for OSREN ERP-Lite
 *
 * Defines roles, permissions, and access control logic for the entire application.
 * This system provides granular control over what each role can do.
 */

// Role definitions with hierarchical structure
export enum Role {
  ADMIN = 'admin',
  SALES = 'sales',
  ACCOUNTS = 'accounts',
  LOGISTICS = 'logistics',
  TECHNICIAN = 'technician',
  VIEWER = 'viewer'
}

// Granular permissions for different actions
export enum Permission {
  // Document permissions
  CREATE_DOCUMENT = 'create:document',
  READ_DOCUMENT = 'read:document',
  UPDATE_DOCUMENT = 'update:document',
  DELETE_DOCUMENT = 'delete:document',
  APPROVE_DOCUMENT = 'approve:document',
  REJECT_DOCUMENT = 'reject:document',

  // Workflow permissions
  TRANSITION_WORKFLOW = 'transition:workflow',
  VIEW_WORKFLOW = 'view:workflow',
  REASSIGN_DOCUMENT = 'reassign:document',

  // User management
  MANAGE_USERS = 'manage:users',
  VIEW_USERS = 'view:users',

  // Audit permissions
  VIEW_AUDIT = 'view:audit',
  EXPORT_AUDIT = 'export:audit',

  // Module-specific permissions
  MANAGE_INVENTORY = 'manage:inventory',
  VIEW_INVENTORY = 'view:inventory',
  MANAGE_FINANCE = 'manage:finance',
  VIEW_FINANCE = 'view:finance',
  MANAGE_SALES = 'manage:sales',
  VIEW_SALES = 'view:sales',
  MANAGE_LOGISTICS = 'manage:logistics',
  VIEW_LOGISTICS = 'view:logistics',

  // Notification permissions
  MANAGE_NOTIFICATIONS = 'manage:notifications'
}

// Role hierarchy for inheritance (higher numbers = more permissions)
export const ROLE_HIERARCHY: Record<Role, number> = {
  [Role.ADMIN]: 100,
  [Role.ACCOUNTS]: 60,
  [Role.SALES]: 50,
  [Role.LOGISTICS]: 40,
  [Role.TECHNICIAN]: 30,
  [Role.VIEWER]: 10
};

// Comprehensive role-permission mapping
export const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  [Role.ADMIN]: Object.values(Permission),

  [Role.SALES]: [
    Permission.CREATE_DOCUMENT,
    Permission.READ_DOCUMENT,
    Permission.UPDATE_DOCUMENT,
    Permission.TRANSITION_WORKFLOW,
    Permission.VIEW_WORKFLOW,
    Permission.VIEW_SALES,
    Permission.MANAGE_SALES,
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

// Document type-specific permissions
export const DOCUMENT_TYPE_PERMISSIONS: Record<string, {
  canCreate: Role[];
  canEdit: Role[];
  canDelete: Role[];
  canApprove: Role[];
  canView: Role[];
}> = {
  quotation: {
    canCreate: [Role.SALES, Role.ADMIN],
    canEdit: [Role.SALES, Role.ADMIN],
    canDelete: [Role.SALES, Role.ADMIN],
    canApprove: [Role.SALES, Role.ADMIN],
    canView: [Role.SALES, Role.ACCOUNTS, Role.ADMIN, Role.VIEWER]
  },
  invoice: {
    canCreate: [Role.ACCOUNTS, Role.ADMIN],
    canEdit: [Role.ACCOUNTS, Role.ADMIN],
    canDelete: [Role.ACCOUNTS, Role.ADMIN],
    canApprove: [Role.ACCOUNTS, Role.ADMIN],
    canView: [Role.ACCOUNTS, Role.SALES, Role.ADMIN, Role.VIEWER]
  },
  delivery_order: {
    canCreate: [Role.LOGISTICS, Role.ADMIN],
    canEdit: [Role.LOGISTICS, Role.ADMIN],
    canDelete: [Role.LOGISTICS, Role.ADMIN],
    canApprove: [Role.LOGISTICS, Role.ADMIN],
    canView: [Role.LOGISTICS, Role.SALES, Role.ADMIN, Role.VIEWER]
  },
  purchase_order: {
    canCreate: [Role.ACCOUNTS, Role.ADMIN],
    canEdit: [Role.ACCOUNTS, Role.ADMIN],
    canDelete: [Role.ACCOUNTS, Role.ADMIN],
    canApprove: [Role.ADMIN],
    canView: [Role.ACCOUNTS, Role.ADMIN, Role.VIEWER]
  },
  sales_order: {
    canCreate: [Role.SALES, Role.ADMIN],
    canEdit: [Role.SALES, Role.ADMIN],
    canDelete: [Role.SALES, Role.ADMIN],
    canApprove: [Role.SALES, Role.ADMIN],
    canView: [Role.SALES, Role.LOGISTICS, Role.ADMIN, Role.VIEWER]
  }
};

// Permission checking utility functions
export function hasPermission(role: Role, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role]?.includes(permission) || false;
}

export function hasAnyPermission(role: Role, permissions: Permission[]): boolean {
  return permissions.some(perm => hasPermission(role, perm));
}

export function hasAllPermissions(role: Role, permissions: Permission[]): boolean {
  return permissions.every(perm => hasPermission(role, perm));
}

// Document-specific permission checks
export function canCreateDocument(role: Role, documentType: string): boolean {
  const typePermissions = DOCUMENT_TYPE_PERMISSIONS[documentType];
  return typePermissions?.canCreate.includes(role) || false;
}

export function canEditDocument(role: Role, documentType: string, status: string): boolean {
  const typePermissions = DOCUMENT_TYPE_PERMISSIONS[documentType];
  const canEdit = typePermissions?.canEdit.includes(role) || false;

  // Can only edit documents in draft or internal_review status
  const editableStatuses = ['draft', 'internal_review', 'rejected'];
  return canEdit && editableStatuses.includes(status);
}

export function canDeleteDocument(role: Role, documentType: string, status: string): boolean {
  const typePermissions = DOCUMENT_TYPE_PERMISSIONS[documentType];
  const canDelete = typePermissions?.canDelete.includes(role) || false;

  // Can only delete documents in draft or rejected status
  const deletableStatuses = ['draft', 'rejected'];
  return canDelete && deletableStatuses.includes(status);
}

export function canApproveDocument(role: Role, documentType: string): boolean {
  const typePermissions = DOCUMENT_TYPE_PERMISSIONS[documentType];
  return typePermissions?.canApprove.includes(role) || false;
}

export function canViewDocument(role: Role, documentType: string): boolean {
  const typePermissions = DOCUMENT_TYPE_PERMISSIONS[documentType];
  return typePermissions?.canView.includes(role) || false;
}

// Role hierarchy checking (if role1 has higher or equal permissions to role2)
export function hasHigherOrEqualRole(role1: Role, role2: Role): boolean {
  return ROLE_HIERARCHY[role1] >= ROLE_HIERARCHY[role2];
}

// Get all permissions for a role
export function getRolePermissions(role: Role): Permission[] {
  return ROLE_PERMISSIONS[role] || [];
}

// Check if role can manage users
export function canManageUsers(role: Role): boolean {
  return hasPermission(role, Permission.MANAGE_USERS);
}

// Check if role can view audit logs
export function canViewAudit(role: Role): boolean {
  return hasPermission(role, Permission.VIEW_AUDIT);
}

// Get display name for role
export function getRoleDisplayName(role: Role): string {
  const displayNames: Record<Role, string> = {
    [Role.ADMIN]: 'Administrator',
    [Role.SALES]: 'Sales Representative',
    [Role.ACCOUNTS]: 'Accounts Officer',
    [Role.LOGISTICS]: 'Logistics Manager',
    [Role.TECHNICIAN]: 'Technician',
    [Role.VIEWER]: 'Viewer'
  };
  return displayNames[role] || role;
}

// Get display name for permission
export function getPermissionDisplayName(permission: Permission): string {
  return permission
    .split(':')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}