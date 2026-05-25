const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class DocumentItem extends Model {
    static associate(models) {
      // DocumentItem belongs to document
      DocumentItem.belongsTo(models.Document, {
        foreignKey: 'document_id',
        as: 'document',
        onDelete: 'CASCADE'
      });

      // DocumentItem belongs to product
      DocumentItem.belongsTo(models.Product, {
        foreignKey: 'product_id',
        as: 'product'
      });
    }

    // Calculate line total before saving
    static async beforeCreate(instance) {
      instance.calculateLineTotal();
    }

    static async beforeUpdate(instance) {
      instance.calculateLineTotal();
    }

    calculateLineTotal() {
      const discountMultiplier = 1 - (this.discount_percentage || 0) / 100;
      const taxMultiplier = 1 + (this.tax_percentage || 0) / 100;
      this.line_total = this.quantity * this.unit_price * discountMultiplier * taxMultiplier;
    }
  }

  DocumentItem.init({
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
    product_id: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'products',
        key: 'id'
      }
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    quantity: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false
    },
    unit_price: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false
    },
    discount_percentage: {
      type: DataTypes.DECIMAL(5, 2),
      defaultValue: 0
    },
    tax_percentage: {
      type: DataTypes.DECIMAL(5, 2),
      defaultValue: 0
    },
    line_total: {
      type: DataTypes.DECIMAL(15, 2),
      allowNull: false
    }
  }, {
    sequelize,
    modelName: 'DocumentItem',
    tableName: 'document_items',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: false
  });

  // Add hooks
  DocumentItem.addHook('beforeCreate', 'calculateLineTotal', (instance) => {
    instance.calculateLineTotal();
  });

  DocumentItem.addHook('beforeUpdate', 'calculateLineTotal', (instance) => {
    instance.calculateLineTotal();
  });

  return DocumentItem;
};
