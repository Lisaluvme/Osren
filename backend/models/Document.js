const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Document extends Model {
    static associate(models) {
      // Document belongs to a type
      Document.belongsTo(models.DocumentType, {
        foreignKey: 'type',
        targetKey: 'name',
        as: 'documentType'
      });

      // Document belongs to customer
      Document.belongsTo(models.Customer, {
        foreignKey: 'customer_id',
        as: 'customer'
      });

      // Document belongs to vendor
      Document.belongsTo(models.Vendor, {
        foreignKey: 'vendor_id',
        as: 'vendor'
      });

      // Document created by user
      Document.belongsTo(models.User, {
        foreignKey: 'created_by',
        as: 'creator'
      });

      // Document assigned to user
      Document.belongsTo(models.User, {
        foreignKey: 'assigned_to',
        as: 'assignee'
      });

      // Document approved by user
      Document.belongsTo(models.User, {
        foreignKey: 'approved_by',
        as: 'approver'
      });

      // Document has many items
      Document.hasMany(models.DocumentItem, {
        foreignKey: 'document_id',
        as: 'items',
        onDelete: 'CASCADE'
      });

      // Document has many workflow transitions
      Document.hasMany(models.WorkflowTransition, {
        foreignKey: 'document_id',
        as: 'workflowHistory',
        onDelete: 'CASCADE'
      });

      // Document has many file attachments
      Document.hasMany(models.FileAttachment, {
        foreignKey: 'document_id',
        as: 'attachments',
        onDelete: 'CASCADE'
      });

      // Document has many audit logs
      Document.hasMany(models.AuditLog, {
        foreignKey: 'entity_id',
        constraints: false,
        as: 'auditLogs',
        scope: {
          where: {
            entity_type: 'document'
          }
        }
      });
    }

    // Instance methods
    canEdit(userRole) {
      const { workflowEngine } = require('../../lib/workflow.cjs');
      return workflowEngine.canEdit(this.status);
    }

    canDelete(userRole) {
      const { workflowEngine } = require('../../lib/workflow.cjs');
      return workflowEngine.canDelete(this.status);
    }

    getNextStatuses(userRole) {
      const { workflowEngine, DocumentType } = require('../../lib/workflow.cjs');
      const docType = DocumentType[this.type.toUpperCase()] || this.type;
      return workflowEngine.getNextStatuses(userRole, docType, this.status);
    }
  }

  Document.init({
    id: {
      type: DataTypes.UUID,
      primaryKey: true,
      defaultValue: DataTypes.UUIDV4
    },
    type: {
      type: DataTypes.STRING(50),
      allowNull: false,
      references: {
        model: 'document_types',
        key: 'name'
      }
    },
    status: {
      type: DataTypes.STRING(50),
      allowNull: false,
      defaultValue: 'draft'
    },
    document_number: {
      type: DataTypes.STRING(50),
      unique: true,
      allowNull: false
    },
    title: {
      type: DataTypes.STRING(255),
      allowNull: false
    },
    customer_id: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'customers',
        key: 'id'
      }
    },
    vendor_id: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'vendors',
        key: 'id'
      }
    },
    created_by: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id'
      }
    },
    assigned_to: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'users',
        key: 'id'
      }
    },
    data: {
      type: DataTypes.JSONB,
      defaultValue: {}
    },
    total_amount: {
      type: DataTypes.DECIMAL(15, 2),
      allowNull: true
    },
    currency: {
      type: DataTypes.STRING(3),
      defaultValue: 'MYR'
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    internal_notes: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    approved_at: {
      type: DataTypes.DATE,
      allowNull: true
    },
    approved_by: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'users',
        key: 'id'
      }
    },
    completed_at: {
      type: DataTypes.DATE,
      allowNull: true
    },
    signature_data: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    customer_acknowledged_at: {
      type: DataTypes.DATE,
      allowNull: true
    },
    customer_acknowledgement_data: {
      type: DataTypes.JSONB,
      allowNull: true
    }
  }, {
    sequelize,
    modelName: 'Document',
    tableName: 'documents',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [
      {
        fields: ['type', 'status']
      },
      {
        fields: ['created_by']
      },
      {
        fields: ['assigned_to']
      },
      {
        fields: ['customer_id']
      },
      {
        unique: true,
        fields: ['document_number']
      }
    ]
  });

  return Document;
};
