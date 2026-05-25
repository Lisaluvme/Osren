const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class DocumentType extends Model {
    static associate(models) {
      // DocumentType has many documents
      DocumentType.hasMany(models.Document, {
        foreignKey: 'type',
        sourceKey: 'name',
        as: 'documents'
      });
    }
  }

  DocumentType.init({
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    name: {
      type: DataTypes.STRING(50),
      unique: true,
      allowNull: false
    },
    display_name: {
      type: DataTypes.STRING(100),
      allowNull: false
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    prefix: {
      type: DataTypes.STRING(10),
      allowNull: false
    },
    requires_customer_acknowledgement: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    }
  }, {
    sequelize,
    modelName: 'DocumentType',
    tableName: 'document_types',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: false
  });

  return DocumentType;
};
