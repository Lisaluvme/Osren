const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Vendor extends Model {
    static associate(models) {
      // Vendor has many products
      Vendor.hasMany(models.Product, {
        foreignKey: 'supplier_id',
        as: 'products'
      });

      // Vendor has many documents
      Vendor.hasMany(models.Document, {
        foreignKey: 'vendor_id',
        as: 'documents'
      });
    }
  }

  Vendor.init({
    id: {
      type: DataTypes.UUID,
      primaryKey: true,
      defaultValue: DataTypes.UUIDV4
    },
    name: {
      type: DataTypes.STRING(255),
      allowNull: false
    },
    email: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    phone: {
      type: DataTypes.STRING(50),
      allowNull: true
    },
    address: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    city: {
      type: DataTypes.STRING(100),
      allowNull: true
    },
    state: {
      type: DataTypes.STRING(100),
      allowNull: true
    },
    postal_code: {
      type: DataTypes.STRING(20),
      allowNull: true
    },
    country: {
      type: DataTypes.STRING(100),
      defaultValue: 'Malaysia'
    },
    tax_id: {
      type: DataTypes.STRING(50),
      allowNull: true
    },
    payment_terms: {
      type: DataTypes.STRING(50),
      allowNull: true
    },
    is_active: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    }
  }, {
    sequelize,
    modelName: 'Vendor',
    tableName: 'vendors',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  });

  return Vendor;
};
