const { Document, DocumentItem, User, Customer, Vendor } = require('../models');
const workflowService = require('../services/workflowService');
const { asyncHandler } = require('../middleware/errorHandler');
const { logAudit } = require('../middleware/auditMiddleware');

class DocumentController {
  /**
   * Get all documents with filters
   */
  getDocuments = asyncHandler(async (req, res) => {
    const {
      type,
      status,
      customer_id,
      assigned_to_me,
      created_by_me,
      page = 1,
      limit = 50
    } = req.query;

    const { Op } = require('sequelize');
    const where = {};

    if (type) where.type = type;
    if (status) where.status = status;
    if (customer_id) where.customer_id = customer_id;

    if (assigned_to_me === 'true') {
      where.assigned_to = req.userId;
    }

    if (created_by_me === 'true') {
      where.created_by = req.userId;
    }

    const documents = await Document.findAll({
      where,
      include: [
        { model: User, as: 'creator', attributes: ['id', 'full_name', 'email'] },
        { model: User, as: 'assignee', attributes: ['id', 'full_name', 'email'] },
        { model: Customer, as: 'customer', attributes: ['id', 'name', 'email'] },
        { model: Vendor, as: 'vendor', attributes: ['id', 'name'] }
      ],
      limit: parseInt(limit),
      offset: (parseInt(page) - 1) * parseInt(limit),
      order: [['created_at', 'DESC']]
    });

    const count = await Document.count({ where });

    res.json({
      success: true,
      data: {
        documents,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: count,
          pages: Math.ceil(count / parseInt(limit))
        }
      }
    });
  });

  /**
   * Get single document by ID
   */
  getDocument = asyncHandler(async (req, res) => {
    const document = await Document.findByPk(req.params.id, {
      include: [
        { model: User, as: 'creator', attributes: ['id', 'full_name', 'email'] },
        { model: User, as: 'assignee', attributes: ['id', 'full_name', 'email'] },
        { model: User, as: 'approver', attributes: ['id', 'full_name', 'email'] },
        { model: Customer, as: 'customer' },
        { model: Vendor, as: 'vendor' },
        {
          model: DocumentItem,
          as: 'items',
          include: [{ model: require('../models').Product, as: 'product' }]
        }
      ]
    });

    if (!document) {
      return res.status(404).json({
        success: false,
        error: 'Document not found'
      });
    }

    res.json({
      success: true,
      data: document
    });
  });

  /**
   * Create new document
   */
  createDocument = asyncHandler(async (req, res) => {
    const {
      type,
      title,
      customer_id,
      vendor_id,
      assigned_to,
      items = [],
      notes,
      internal_notes,
      data = {}
    } = req.body;

    // Generate document number
    const DocumentType = require('../models').DocumentType;
    const docType = await DocumentType.findOne({ where: { name: type } });

    if (!docType) {
      return res.status(400).json({
        success: false,
        error: 'Invalid document type'
      });
    }

    const count = await Document.count({
      where: {
        type,
        created_at: {
          [require('sequelize').Op.gte]: new Date(new Date().getFullYear(), new Date().getMonth(), 1)
        }
      }
    });

    const documentNumber = `${docType.prefix}-${new Date().getFullYear()}${String(new Date().getMonth() + 1).padStart(2, '0')}-${String(count + 1).padStart(4, '0')}`;

    // Calculate total amount
    let totalAmount = 0;
    const validItems = items.filter(item => item.quantity && item.unit_price);

    for (const item of validItems) {
      const discountMultiplier = 1 - ((item.discount_percentage || 0) / 100);
      const taxMultiplier = 1 + ((item.tax_percentage || 0) / 100);
      const lineTotal = item.quantity * item.unit_price * discountMultiplier * taxMultiplier;
      totalAmount += lineTotal;
    }

    // Create document
    const document = await Document.create({
      type,
      status: 'draft',
      document_number: documentNumber,
      title,
      customer_id,
      vendor_id,
      created_by: req.userId,
      assigned_to: assigned_to || null,
      data,
      total_amount: totalAmount,
      notes,
      internal_notes
    });

    // Create document items
    if (validItems.length > 0) {
      const itemsToCreate = validItems.map(item => ({
        document_id: document.id,
        product_id: item.product_id || null,
        description: item.description,
        quantity: item.quantity,
        unit_price: item.unit_price,
        discount_percentage: item.discount_percentage || 0,
        tax_percentage: item.tax_percentage || 0
      }));

      await DocumentItem.bulkCreate(itemsToCreate);
    }

    // Log audit
    await logAudit({
      entityType: 'document',
      entityId: document.id,
      action: 'create',
      performedBy: req.userId,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      newValues: { type, title, total_amount },
      metadata: { description: `Created document ${document_number}` }
    });

    // Fetch complete document with relations
    const completeDocument = await Document.findByPk(document.id, {
      include: [
        { model: User, as: 'creator', attributes: ['id', 'full_name', 'email'] },
        { model: Customer, as: 'customer' },
        {
          model: DocumentItem,
          as: 'items',
          include: [{ model: require('../models').Product, as: 'product' }]
        }
      ]
    });

    res.status(201).json({
      success: true,
      data: completeDocument
    });
  });

  /**
   * Update document
   */
  updateDocument = asyncHandler(async (req, res) => {
    const document = await Document.findByPk(req.params.id);

    if (!document) {
      return res.status(404).json({
        success: false,
        error: 'Document not found'
      });
    }

    // Check if document can be edited
    if (!document.canEdit()) {
      return res.status(400).json({
        success: false,
        error: 'Document cannot be edited in current status'
      });
    }

    const oldValues = { ...document.toJSON() };

    const {
      title,
      customer_id,
      vendor_id,
      assigned_to,
      items,
      notes,
      internal_notes,
      data
    } = req.body;

    const updateData = {};
    if (title !== undefined) updateData.title = title;
    if (customer_id !== undefined) updateData.customer_id = customer_id;
    if (vendor_id !== undefined) updateData.vendor_id = vendor_id;
    if (assigned_to !== undefined) updateData.assigned_to = assigned_to;
    if (notes !== undefined) updateData.notes = notes;
    if (internal_notes !== undefined) updateData.internal_notes = internal_notes;
    if (data !== undefined) updateData.data = { ...document.data, ...data };

    // Recalculate total if items are being updated
    if (items && Array.isArray(items)) {
      let totalAmount = 0;

      // Delete existing items
      await DocumentItem.destroy({ where: { document_id: document.id } });

      // Create new items
      const validItems = items.filter(item => item.quantity && item.unit_price);

      for (const item of validItems) {
        const discountMultiplier = 1 - ((item.discount_percentage || 0) / 100);
        const taxMultiplier = 1 + ((item.tax_percentage || 0) / 100);
        const lineTotal = item.quantity * item.unit_price * discountMultiplier * taxMultiplier;
        totalAmount += lineTotal;

        await DocumentItem.create({
          document_id: document.id,
          product_id: item.product_id || null,
          description: item.description,
          quantity: item.quantity,
          unit_price: item.unit_price,
          discount_percentage: item.discount_percentage || 0,
          tax_percentage: item.tax_percentage || 0
        });
      }

      updateData.total_amount = totalAmount;
    }

    await document.update(updateData);

    // Log audit
    await logAudit({
      entityType: 'document',
      entityId: document.id,
      action: 'update',
      performedBy: req.userId,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      oldValues,
      newValues: updateData,
      metadata: { description: `Updated document ${document.document_number}` }
    });

    const updatedDocument = await Document.findByPk(document.id, {
      include: [
        { model: User, as: 'creator', attributes: ['id', 'full_name', 'email'] },
        { model: Customer, as: 'customer' },
        {
          model: DocumentItem,
          as: 'items',
          include: [{ model: require('../models').Product, as: 'product' }]
        }
      ]
    });

    res.json({
      success: true,
      data: updatedDocument
    });
  });

  /**
   * Delete document
   */
  deleteDocument = asyncHandler(async (req, res) => {
    const document = await Document.findByPk(req.params.id);

    if (!document) {
      return res.status(404).json({
        success: false,
        error: 'Document not found'
      });
    }

    // Check if document can be deleted
    if (!document.canDelete()) {
      return res.status(400).json({
        success: false,
        error: 'Document cannot be deleted in current status'
      });
    }

    const documentNumber = document.document_number;

    await document.destroy();

    // Log audit
    await logAudit({
      entityType: 'document',
      entityId: document.id,
      action: 'delete',
      performedBy: req.userId,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      oldValues: { document_number: documentNumber, type: document.type },
      metadata: { description: `Deleted document ${document_number}` }
    });

    res.json({
      success: true,
      message: 'Document deleted successfully'
    });
  });

  /**
   * Transition document workflow
   */
  transitionDocument = asyncHandler(async (req, res) => {
    const { to_status, comments } = req.body;

    const document = await workflowService.transitionDocument(
      req.params.id,
      to_status,
      req.userId,
      {
        comments,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent']
      }
    );

    const completeDocument = await Document.findByPk(document.id, {
      include: [
        { model: User, as: 'creator', attributes: ['id', 'full_name', 'email'] },
        { model: User, as: 'assignee', attributes: ['id', 'full_name', 'email'] }
      ]
    });

    res.json({
      success: true,
      data: completeDocument
    });
  });

  /**
   * Get document workflow history
   */
  getDocumentWorkflow = asyncHandler(async (req, res) => {
    const history = await workflowService.getDocumentWorkflow(req.params.id);

    res.json({
      success: true,
      data: history
    });
  });

  /**
   * Customer acknowledgement
   */
  customerAcknowledgement = asyncHandler(async (req, res) => {
    const {
      acknowledged,
      signature,
      customerName,
      email,
      comments
    } = req.body;

    const document = await workflowService.processCustomerAcknowledgement(
      req.params.id,
      {
        acknowledged,
        signature,
        customerName,
        email,
        comments
      },
      {
        performedBy: req.userId,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent']
      }
    );

    const completeDocument = await Document.findByPk(document.id, {
      include: [
        { model: User, as: 'creator', attributes: ['id', 'full_name', 'email'] },
        { model: Customer, as: 'customer' }
      ]
    });

    res.json({
      success: true,
      data: completeDocument
    });
  });

  /**
   * Get document files
   */
  getDocumentFiles = asyncHandler(async (req, res) => {
    const { FileAttachment } = require('../models');

    const files = await FileAttachment.findAll({
      where: { document_id: req.params.id },
      include: [{ model: User, as: 'uploader', attributes: ['id', 'full_name'] }],
      order: [['uploaded_at', 'DESC']]
    });

    res.json({
      success: true,
      data: files
    });
  });
}

module.exports = new DocumentController();
