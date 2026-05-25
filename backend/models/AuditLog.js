const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class AuditLog extends Model {
    static associate(models) {
      // AuditLog performed by user
      AuditLog.belongsTo(models.User, {
        foreignKey: 'performed_by',
        as: 'performedByUser'
      });
    }

    // Helper to format audit log for display
    toJSON() {
      const values = { ...this.get() };
      if (values.performedByUser) {
        values.performed_by_name = values.performedByUser.full_name;
        values.performed_by_email = values.performedByUser.email;
      }
      return values;
    }
  }

  AuditLog.init({
    id: {
      type: DataTypes.UUID,
      primaryKey: true,
      defaultValue: DataTypes.UUIDV4
    },
    entity_type: {
      type: DataTypes.STRING(50),
      allowNull: false
    },
    entity_id: {
      type: DataTypes.UUID,
      allowNull: false
    },
    action: {
      type: DataTypes.STRING(50),
      allowNull: false
    },
    performed_by: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id'
      }
    },
    performed_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW
    },
    old_values: {
      type: DataTypes.JSONB,
      allowNull: true
    },
    new_values: {
      type: DataTypes.JSONB,
      allowNull: true
    },
    ip_address: {
      type: DataTypes.STRING(45),
      allowNull: true
    },
    user_agent: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    metadata: {
      type: DataTypes.JSONB,
      defaultValue: {}
    }
  }, {
    sequelize,
    modelName: 'AuditLog',
    tableName: 'audit_logs',
    timestamps: false,
    updatedAt: false,
    indexes: [
      {
        fields: ['entity_type', 'entity_id']
      },
      {
        fields: ['performed_by']
      }
    ]
  });

  return AuditLog;
};
