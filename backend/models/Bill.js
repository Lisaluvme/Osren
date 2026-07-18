const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Bill extends Model {
    static associate(models) {
      Bill.belongsTo(models.User, {
        foreignKey: 'created_by',
        as: 'creator'
      });
    }
  }

  Bill.init(
    {
      id: {
        type: DataTypes.UUID,
        primaryKey: true,
        defaultValue: DataTypes.UUIDV4
      },
      vendor_name: {
        type: DataTypes.STRING(255),
        allowNull: false
      },
      invoice_ref: {
        // The vendor's own invoice/bill number.
        type: DataTypes.STRING(255),
        allowNull: true
      },
      category: {
        // Expense category, e.g. Rent, Utilities, Supplies, Logistics.
        type: DataTypes.STRING(100),
        allowNull: true
      },
      amount: {
        type: DataTypes.DECIMAL(12, 2),
        allowNull: false
      },
      issue_date: {
        type: DataTypes.DATEONLY,
        allowNull: true
      },
      due_date: {
        type: DataTypes.DATEONLY,
        allowNull: false
      },
      status: {
        // 'pending' = not yet paid; 'paid' = settled. 'Overdue' is derived
        // on the client (pending && due_date < today) so it never goes stale.
        type: DataTypes.STRING(20),
        allowNull: false,
        defaultValue: 'pending',
        validate: {
          isIn: [['pending', 'paid']]
        }
      },
      payment_date: {
        type: DataTypes.DATEONLY,
        allowNull: true
      },
      payment_method: {
        type: DataTypes.STRING(50),
        allowNull: true
      },
      notes: {
        type: DataTypes.TEXT,
        allowNull: true
      },
      created_by: {
        type: DataTypes.UUID,
        allowNull: true,
        references: {
          model: 'users',
          key: 'id'
        }
      }
    },
    {
      sequelize,
      modelName: 'Bill',
      tableName: 'bills',
      timestamps: true,
      createdAt: 'created_at',
      updatedAt: 'updated_at'
    }
  );

  return Bill;
};
