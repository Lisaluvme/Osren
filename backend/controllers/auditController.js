const { AuditLog } = require('../models');
const { asyncHandler } = require('../middleware/errorHandler');

class AuditController {
  /**
   * Get audit logs with filters
   */
  getAuditLogs = asyncHandler(async (req, res) => {
    const {
      entity_type,
      entity_id,
      action,
      user_id,
      start_date,
      end_date,
      limit = 100,
      offset = 0
    } = req.query;

    const { Op } = require('sequelize');
    const where = {};

    if (entity_type) where.entity_type = entity_type;
    if (entity_id) where.entity_id = entity_id;
    if (action) where.action = action;
    if (user_id) where.performed_by = user_id;

    if (start_date && end_date) {
      where.performed_at = {
        [Op.between]: [new Date(start_date), new Date(end_date)]
      };
    }

    const logs = await AuditLog.findAll({
      where,
      include: [{
        model: require('../models').User,
        as: 'performedByUser',
        attributes: ['id', 'full_name', 'email'],
        include: [{
          model: require('../models').Role,
          as: 'role',
          attributes: ['name', 'display_name']
        }]
      }],
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [['performed_at', 'DESC']]
    });

    const count = await AuditLog.count({ where });

    res.json({
      success: true,
      data: {
        logs,
        pagination: {
          limit: parseInt(limit),
          offset: parseInt(offset),
          total: count
        }
      }
    });
  });

  /**
   * Get audit logs for a specific entity
   */
  getEntityAuditLogs = asyncHandler(async (req, res) => {
    const { type, id } = req.params;
    const { limit = 100, offset = 0 } = req.query;

    const logs = await AuditLog.findAll({
      where: {
        entity_type: type,
        entity_id: id
      },
      include: [{
        model: require('../models').User,
        as: 'performedByUser',
        attributes: ['id', 'full_name', 'email'],
        include: [{
          model: require('../models').Role,
          as: 'role',
          attributes: ['name', 'display_name']
        }]
      }],
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [['performed_at', 'DESC']]
    });

    const count = await AuditLog.count({
      where: { entity_type: type, entity_id: id }
    });

    res.json({
      success: true,
      data: {
        logs,
        pagination: {
          limit: parseInt(limit),
          offset: parseInt(offset),
          total: count
        }
      }
    });
  });

  /**
   * Export audit logs to CSV
   */
  exportAuditLogs = asyncHandler(async (req, res) => {
    const {
      entity_type,
      entity_id,
      action,
      user_id,
      start_date,
      end_date
    } = req.query;

    const { Op } = require('sequelize');
    const where = {};

    if (entity_type) where.entity_type = entity_type;
    if (entity_id) where.entity_id = entity_id;
    if (action) where.action = action;
    if (user_id) where.performed_by = user_id;

    if (start_date && end_date) {
      where.performed_at = {
        [Op.between]: [new Date(start_date), new Date(end_date)]
      };
    }

    const logs = await AuditLog.findAll({
      where,
      include: [{
        model: require('../models').User,
        as: 'performedByUser',
        attributes: ['id', 'full_name', 'email']
      }],
      order: [['performed_at', 'DESC']],
      limit: 10000
    });

    // Generate CSV
    const csv = [
      'Timestamp,User,Action,Entity Type,Entity ID,IP Address,Details',
      ...logs.map(log => {
        const user = log.performedByUser?.full_name || log.performed_by;
        const details = log.metadata?.description || '';
        return `"${log.performed_at}","${user}","${log.action}","${log.entity_type}","${log.entity_id}","${log.ip_address || ''}","${details}"`;
      })
    ].join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=audit-logs-${Date.now()}.csv`);

    res.send(csv);
  });
}

module.exports = new AuditController();
