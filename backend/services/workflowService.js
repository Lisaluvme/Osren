const { Document, WorkflowTransition, User, Notification } = require('../models');
const { workflowEngine, DocumentStatus, DocumentType } = require('../../lib/workflow.cjs');
const { logWorkflowTransition, logCustomerAcknowledgement } = require('../middleware/auditMiddleware');
const { Op } = require('sequelize');

class WorkflowService {
  /**
   * Transition document to new status
   */
  async transitionDocument(documentId, newStatus, userId, options = {}) {
    const document = await Document.findByPk(documentId);

    if (!document) {
      throw new Error('Document not found');
    }

    const user = await User.findByPk(userId);
    if (!user) {
      throw new Error('User not found');
    }

    // Get user's role
    const userRole = user.role ? user.role.name : 'viewer';

    // Convert document type string to DocumentType enum
    const docTypeEnum = DocumentType[document.type.toUpperCase()] || document.type;

    // Check if transition is valid for user role
    const canTransition = workflowEngine.canUserTransition(
      userRole,
      docTypeEnum,
      document.status,
      newStatus
    );

    if (!canTransition) {
      throw new Error('You are not authorized to perform this workflow transition');
    }

    const oldStatus = document.status;
    const comments = options.comments || '';

    // Check if comment is required
    if (workflowEngine.requiresComment(docTypeEnum, oldStatus, newStatus) && !comments) {
      throw new Error('Comment is required for this transition');
    }

    // Update document status
    const updateData = {
      status: newStatus
    };

    if (newStatus === DocumentStatus.APPROVED) {
      updateData.approved_by = userId;
      updateData.approved_at = new Date();
    } else if (newStatus === DocumentStatus.COMPLETED) {
      updateData.completed_at = new Date();
    }

    await document.update(updateData);

    // Record workflow transition
    await WorkflowTransition.create({
      document_id: documentId,
      from_status: oldStatus,
      to_status: newStatus,
      transitioned_by: userId,
      comments,
      metadata: {
        document_type: document.type,
        document_number: document.document_number
      }
    });

    // Log audit
    await logWorkflowTransition({
      documentId,
      fromStatus: oldStatus,
      toStatus: newStatus,
      performedBy: userId,
      comments,
      ipAddress: options.ipAddress,
      userAgent: options.userAgent
    });

    // Trigger notifications
    await this.notifyTransition(document, oldStatus, newStatus, userId, comments);

    return document;
  }

  /**
   * Get document workflow history
   */
  async getDocumentWorkflow(documentId) {
    const transitions = await WorkflowTransition.findAll({
      where: { document_id: documentId },
      include: [{
        model: User,
        as: 'transitionedBy',
        attributes: ['id', 'full_name', 'email'],
        include: [{
          model: require('../models').Role,
          as: 'role',
          attributes: ['name', 'display_name']
        }]
      }],
      order: [['transitioned_at', 'ASC']]
    });

    return transitions;
  }

  /**
   * Get pending documents for a user
   */
  async getPendingDocuments(userId) {
    const user = await User.findByPk(userId);

    if (!user) {
      throw new Error('User not found');
    }

    const documents = await Document.findAll({
      where: {
        [Op.or]: [
          { assigned_to: userId },
          { created_by: userId }
        ],
        status: {
          [Op.in]: [
            DocumentStatus.INTERNAL_REVIEW,
            DocumentStatus.CUSTOMER_ACKNOWLEDGEMENT
          ]
        }
      },
      include: [
        { model: User, as: 'creator', attributes: ['id', 'full_name', 'email'] },
        { model: User, as: 'assignee', attributes: ['id', 'full_name', 'email'] }
      ],
      order: [['created_at', 'DESC']]
    });

    return documents;
  }

  /**
   * Process customer acknowledgement
   */
  async processCustomerAcknowledgement(documentId, acknowledgementData, options = {}) {
    const document = await Document.findByPk(documentId);

    if (!document) {
      throw new Error('Document not found');
    }

    const { acknowledged, signature, customerName, email, comments } = acknowledgementData;

    // Validate acknowledgement data
    const validation = workflowEngine.validateCustomerAcknowledgement({
      acknowledged,
      signature,
      customerName,
      email,
      comments
    });

    if (!validation.valid) {
      throw new Error(validation.errors.join(', '));
    }

    // Update document
    const updateData = {
      customer_acknowledged_at: new Date(),
      customer_acknowledgement_data: {
        acknowledged,
        customerName,
        email,
        comments,
        acknowledgedAt: new Date().toISOString()
      }
    };

    if (signature) {
      updateData.signature_data = signature;
    }

    await document.update(updateData);

    // Log audit
    await logCustomerAcknowledgement({
      documentId,
      acknowledged,
      customerName,
      performedBy: options.performedBy || document.created_by,
      ipAddress: options.ipAddress,
      userAgent: options.userAgent,
      comments
    });

    // Auto-transition based on acknowledgement
    let newStatus = null;
    if (acknowledged) {
      newStatus = DocumentStatus.APPROVED;
    } else {
      newStatus = DocumentStatus.REJECTED;
    }

    if (newStatus) {
      await this.transitionDocument(
        documentId,
        newStatus,
        options.performedBy || document.created_by,
        {
          comments: `Customer ${acknowledged ? 'approved' : 'rejected'}: ${comments || ''}`,
          ipAddress: options.ipAddress,
          userAgent: options.userAgent
        }
      );
    }

    return document;
  }

  /**
   * Notify users of workflow transition
   */
  async notifyTransition(document, oldStatus, newStatus, transitionedBy, comments) {
    const notificationType = newStatus === DocumentStatus.REJECTED
      ? 'document_rejected'
      : 'document_status_changed';

    const title = newStatus === DocumentStatus.APPROVED
      ? 'Document Approved'
      : newStatus === DocumentStatus.REJECTED
      ? 'Document Rejected'
      : 'Document Status Changed';

    const message = `Document ${document.document_number} has been ${newStatus.replace('_', ' ')}`;

    // Notify document creator
    if (document.created_by !== transitionedBy) {
      await Notification.create({
        user_id: document.created_by,
        type: notificationType,
        title,
        message,
        related_entity_type: 'document',
        related_entity_id: document.id
      });
    }

    // Notify assigned user
    if (document.assigned_to && document.assigned_to !== transitionedBy && document.assigned_to !== document.created_by) {
      await Notification.create({
        user_id: document.assigned_to,
        type: notificationType,
        title,
        message,
        related_entity_type: 'document',
        related_entity_id: document.id
      });
    }

    // Notify admins for rejected documents
    if (newStatus === DocumentStatus.REJECTED) {
      const adminRole = await require('../models').Role.findOne({ where: { name: 'admin' } });
      if (adminRole) {
        const admins = await User.findAll({
          where: { role_id: adminRole.id }
        });

        for (const admin of admins) {
          if (admin.id !== transitionedBy) {
            await Notification.create({
              user_id: admin.id,
              type: notificationType,
              title,
              message,
              related_entity_type: 'document',
              related_entity_id: document.id
            });
          }
        }
      }
    }
  }

  /**
   * Get available transitions for a document
   */
  getAvailableTransitions(document, userRole) {
    const docTypeEnum = DocumentType[document.type.toUpperCase()] || document.type;
    const transitions = workflowEngine.getValidTransitions(docTypeEnum, document.status);

    return transitions.filter(t => t.allowedRoles.includes(userRole));
  }
}

module.exports = new WorkflowService();
