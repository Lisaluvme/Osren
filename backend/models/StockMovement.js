const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class StockMovement extends Model {
    static associate(models) {
      // StockMovement belongs to product
      StockMovement.belongsTo(models.Product, {
        foreignKey: 'product_id',
        as: 'product'
      });

      // StockMovement performed by user
      StockMovement.belongsTo(models.User, {
        foreignKey: 'performed_by',
        as: 'performedBy'
      });
    }
  }

  StockMovement.init({
    id: {
      type: DataTypes.UUID,
      primaryKey: true,
      defaultValue: DataTypes.UUIDV4
    },
    product_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'products',
        key: 'id'
      }
    },
    movement_type: {
      type: DataTypes.STRING(50),
      allowNull: false
    },
    quantity: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false
    },
    reference_type: {
      type: DataTypes.STRING(50),
      allowNull: true
    },
    reference_id: {
      type: DataTypes.UUID,
      allowNull: true
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true
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
    }
  }, {
    sequelize,
    modelName: 'StockMovement',
    tableName: 'stock_movements',
    timestamps: false,
    indexes: [
      {
        fields: ['product_id']
      }
    ]
  });

  return StockMovement;
};
