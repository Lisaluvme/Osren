const Role = {
  ADMIN: 'admin',
  MANAGER: 'manager',
  STAFF: 'staff',
  VIEWER: 'viewer'
};

const permissions = {
  [Role.ADMIN]: ['*'],
  [Role.MANAGER]: ['create', 'edit', 'view'],
  [Role.STAFF]: ['view'],
  [Role.VIEWER]: ['view']
};

function hasPermission(role, action) {
  const rolePermissions = permissions[role] || [];
  return rolePermissions.includes('*') || rolePermissions.includes(action);
}

function canCreateDocument(role) {
  return hasPermission(role, 'create');
}

function canEditDocument(role) {
  return hasPermission(role, 'edit');
}

function canDeleteDocument(role) {
  return hasPermission(role, 'delete');
}

module.exports = {
  Role,
  hasPermission,
  canCreateDocument,
  canEditDocument,
  canDeleteDocument
};
