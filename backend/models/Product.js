const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Product extends Model {
    static associate(models) {
      // Product belongs to vendor (supplier)
      Product.belongsTo(models.Vendor, {
        foreignKey: 'supplier_id',
        as: 'supplier'
      });

      // Product has many stock movements
      Product.hasMany(models.StockMovement, {
        foreignKey: 'product_id',
        as: 'stockMovements'
      });

      // Product appears in many document items
      Product.hasMany(models.DocumentItem, {
        foreignKey: 'product_id',
        as: 'documentItems'
      });
    }

    // Check if product is low stock
    isLowStock() {
      return this.quantity <= this.min_stock_level;
    }

    // Calculate profit margin
    getProfitMargin() {
      if (!this.selling_price || !this.unit_cost) return 0;
      return ((this.selling_price - this.unit_cost) / this.selling_price) * 100;
    }

    // Calculate total stock value
    getStockValue() {
      return this.quantity * this.unit_cost;
    }
  }

  Product.init({
    id: {
      type: DataTypes.UUID,
      primaryKey: true,
      defaultValue: DataTypes.UUIDV4
    },
    sku: {
      type: DataTypes.STRING(50),
      unique: true,
      allowNull: false
    },
    name: {
      type: DataTypes.STRING(255),
      allowNull: false
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    category: {
      type: DataTypes.STRING(100),
      allowNull: true
    },
    brand: {
      type: DataTypes.STRING(100),
      allowNull: true
    },
    unit: {
      type: DataTypes.STRING(50),
      defaultValue: 'pcs'
    },
    unit_cost: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true
    },
    selling_price: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true
    },
    quantity: {
      type: DataTypes.DECIMAL(10, 2),
      defaultValue: 0
    },
    min_stock_level: {
      type: DataTypes.INTEGER,
      defaultValue: 10
    },
    max_stock_level: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    reorder_quantity: {
      type: DataTypes.INTEGER,
      defaultValue: 50
    },
    supplier_id: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'vendors',
        key: 'id'
      }
    },
    last_movement: {
      type: DataTypes.DATE,
      allowNull: true
    },
    is_active: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    }
  }, {
    sequelize,
    modelName: 'Product',
    tableName: 'products',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [
      {
        unique: true,
        fields: ['sku']
      }
    ]
  });

  return Product;
};
