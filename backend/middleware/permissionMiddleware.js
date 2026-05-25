const { hasPermission, canCreateDocument, canEditDocument, canDeleteDocument } = require('../../lib/permissions.cjs');

/**
 * Require specific permission
 */
function requirePermission(requiredPermission) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }

    const userRole = req.userRole || 'viewer';

    if (!hasPermission(userRole, requiredPermission)) {
      return res.status(403).json({
        success: false,
        error: `Permission '${requiredPermission}' required`
      });
    }

    next();
  };
}

/**
 * Require any of the specified permissions
 */
function requireAnyPermission(...permissions) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }

    const userRole = req.userRole || 'viewer';

    const hasAny = permissions.some(perm => hasPermission(userRole, perm));

    if (!hasAny) {
      return res.status(403).json({
        success: false,
        error: `One of these permissions required: ${permissions.join(', ')}`
      });
    }

    next();
  };
}

/**
 * Require all of the specified permissions
 */
function requireAllPermissions(...permissions) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }

    const userRole = req.userRole || 'viewer';

    const hasAll = permissions.every(perm => hasPermission(userRole, perm));

    if (!hasAll) {
      return res.status(403).json({
        success: false,
        error: `All these permissions required: ${permissions.join(', ')}`
      });
    }

    next();
  };
}

/**
 * Check if user can create document of specific type
 */
function canCreateDocumentType(documentType) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }

    const userRole = req.userRole || 'viewer';

    if (!canCreateDocument(userRole, documentType)) {
      return res.status(403).json({
        success: false,
        error: `Not authorized to create ${documentType} documents`
      });
    }

    next();
  };
}

/**
 * Check if user can edit document
 */
function canEditDocumentOfType(documentType, status) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }

    const userRole = req.userRole || 'viewer';

    if (!canEditDocument(userRole, documentType, status)) {
      return res.status(403).json({
        success: false,
        error: `Not authorized to edit this document`
      });
    }

    next();
  };
}

/**
 * Check if user can delete document
 */
function canDeleteDocumentOfType(documentType, status) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }

    const userRole = req.userRole || 'viewer';

    if (!canDeleteDocument(userRole, documentType, status)) {
      return res.status(403).json({
        success: false,
        error: `Not authorized to delete this document`
      });
    }

    next();
  };
}

/**
 * Check if user can approve document
 */
function canApproveDocument() {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }

    const userRole = req.userRole || 'viewer';

    if (!hasPermission(userRole, 'approve:document')) {
      return res.status(403).json({
        success: false,
        error: 'Not authorized to approve documents'
      });
    }

    next();
  };
}

/**
 * Check if user can reject document
 */
function canRejectDocument() {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }

    const userRole = req.userRole || 'viewer';

    if (!hasPermission(userRole, 'reject:document')) {
      return res.status(403).json({
        success: false,
        error: 'Not authorized to reject documents'
      });
    }

    next();
  };
}

module.exports = {
  requirePermission,
  requireAnyPermission,
  requireAllPermissions,
  canCreateDocumentType,
  canEditDocumentOfType,
  canDeleteDocumentOfType,
  canApproveDocument,
  canRejectDocument
};
