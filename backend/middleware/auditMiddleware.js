const { AuditLog } = require('../models');

/**
 * Audit logging middleware factory
 * Creates middleware that logs actions for specific entity types
 */
function auditMiddleware(entityType) {
  return async (req, res, next) => {
    // Store original json method
    const originalJson = res.json;

    // Capture response data
    let responseData = null;

    // Override res.json to capture response
    res.json = function(data) {
      responseData = data;
      return originalJson.call(this, data);
    };

    // Continue to next middleware
    res.on('finish', async () => {
      // Only log successful operations
      if (res.statusCode >= 200 && res.statusCode < 300 && req.user) {
        try {
          // Determine action based on request method
          const actionMap = {
            'GET': 'view',
            'POST': 'create',
            'PUT': 'update',
            'PATCH': 'update',
            'DELETE': 'delete'
          };

          const action = actionMap[req.method] || 'unknown';

          // Get entity ID from params or body
          const entityId = req.params.id || req.body.id || responseData?.data?.id;

          if (entityId) {
            // Extract old and new values for update operations
            let oldValues = null;
            let newValues = null;

            if (req.method === 'PUT' || req.method === 'PATCH') {
              newValues = req.body;
              // oldValues would need to be fetched from database before update
              // This is handled in controllers for better accuracy
            } else if (req.method === 'POST') {
              newValues = responseData?.data || req.body;
            }

            // Create audit log entry
            await AuditLog.create({
              entity_type: entityType,
              entity_id: entityId,
              action,
              performed_by: req.user.id,
              performed_at: new Date(),
              old_values: oldValues,
              new_values: newValues,
              ip_address: req.ip || req.connection.remoteAddress,
              user_agent: req.headers['user-agent'],
              metadata: {
                method: req.method,
                path: req.path,
                description: `${action} ${entityType} ${entityId}`
              }
            });
          }
        } catch (error) {
          // Log errors but don't break the request
          console.error('Audit logging error:', error);
        }
      }
    });

    next();
  };
}

/**
 * Helper function to manually log audit events
 * Used in controllers for more complex scenarios
 */
async function logAudit({
  entityType,
  entityId,
  action,
  performedBy,
  ipAddress,
  userAgent,
  oldValues = null,
  newValues = null,
  metadata = {}
}) {
  try {
    await AuditLog.create({
      entity_type: entityType,
      entity_id: entityId,
      action,
      performed_by: performedBy,
      ip_address: ipAddress,
      user_agent: userAgent,
      old_values: oldValues,
      new_values: newValues,
      metadata: {
        timestamp: new Date().toISOString(),
        ...metadata
      }
    });
  } catch (error) {
    console.error('Audit logging error:', error);
    // Don't throw - audit failures shouldn't break the main flow
  }
}

/**
 * Workflow transition audit logging
 */
async function logWorkflowTransition({
  documentId,
  fromStatus,
  toStatus,
  performedBy,
  comments,
  ipAddress,
  userAgent
}) {
  return logAudit({
    entityType: 'document',
    entityId: documentId,
    action: 'workflow_transition',
    performedBy,
    ipAddress,
    userAgent,
    oldValues: { status: fromStatus },
    newValues: { status: toStatus, comments },
    metadata: {
      description: `Workflow transition from ${fromStatus} to ${toStatus}`,
      comments
    }
  });
}

/**
 * Customer acknowledgement audit logging
 */
async function logCustomerAcknowledgement({
  documentId,
  acknowledged,
  customerName,
  performedBy,
  ipAddress,
  userAgent,
  comments
}) {
  return logAudit({
    entityType: 'document',
    entityId: documentId,
    action: 'customer_acknowledgement',
    performedBy,
    ipAddress,
    userAgent,
    newValues: {
      acknowledged,
      customerName,
      comments
    },
    metadata: {
      description: acknowledged ? 'Customer approved document' : 'Customer rejected document',
      customerName
    }
  });
}

/**
 * File upload audit logging
 */
async function logFileUpload({
  documentId,
  fileName,
  fileSize,
  performedBy,
  ipAddress,
  userAgent
}) {
  return logAudit({
    entityType: 'file_attachment',
    entityId: documentId,
    action: 'upload',
    performedBy,
    ipAddress,
    userAgent,
    newValues: {
      file_name: fileName,
      file_size: fileSize
    },
    metadata: {
      description: `File uploaded: ${fileName}`
    }
  });
}

module.exports = {
  auditMiddleware,
  logAudit,
  logWorkflowTransition,
  logCustomerAcknowledgement,
  logFileUpload
};
