const Role = {
  ADMIN: 'admin',
  SALES: 'sales',
  DRIVER: 'driver'
};

const permissions = {
  [Role.ADMIN]: ['*'],
  [Role.SALES]: ['create', 'edit', 'view'],
  [Role.DRIVER]: ['view']
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
