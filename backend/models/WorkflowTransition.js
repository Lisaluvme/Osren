const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class WorkflowTransition extends Model {
    static associate(models) {
      // WorkflowTransition belongs to document
      WorkflowTransition.belongsTo(models.Document, {
        foreignKey: 'document_id',
        as: 'document',
        onDelete: 'CASCADE'
      });

      // WorkflowTransition performed by user
      WorkflowTransition.belongsTo(models.User, {
        foreignKey: 'transitioned_by',
        as: 'transitionedBy'
      });
    }
  }

  WorkflowTransition.init({
    id: {
      type: DataTypes.UUID,
      primaryKey: true,
      defaultValue: DataTypes.UUIDV4
    },
    document_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'documents',
        key: 'id'
      }
    },
    from_status: {
      type: DataTypes.STRING(50),
      allowNull: false
    },
    to_status: {
      type: DataTypes.STRING(50),
      allowNull: false
    },
    transitioned_by: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id'
      }
    },
    comments: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    metadata: {
      type: DataTypes.JSONB,
      defaultValue: {}
    },
    transitioned_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW
    }
  }, {
    sequelize,
    modelName: 'WorkflowTransition',
    tableName: 'workflow_transitions',
    timestamps: false,
    updatedAt: false,
    indexes: [
      {
        fields: ['document_id']
      }
    ]
  });

  return WorkflowTransition;
};
