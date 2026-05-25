const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class FileAttachment extends Model {
    static associate(models) {
      // FileAttachment belongs to document
      FileAttachment.belongsTo(models.Document, {
        foreignKey: 'document_id',
        as: 'document',
        onDelete: 'CASCADE'
      });

      // FileAttachment uploaded by user
      FileAttachment.belongsTo(models.User, {
        foreignKey: 'uploaded_by',
        as: 'uploader'
      });
    }

    // Get file size in human-readable format
    getFormattedSize() {
      const bytes = this.file_size;
      if (bytes < 1024) return bytes + ' B';
      if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
      return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
    }

    // Check if file is an image
    isImage() {
      return this.mime_type.startsWith('image/');
    }

    // Check if file is a PDF
    isPDF() {
      return this.mime_type === 'application/pdf';
    }
  }

  FileAttachment.init({
    id: {
      type: DataTypes.UUID,
      primaryKey: true,
      defaultValue: DataTypes.UUIDV4
    },
    document_id: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'documents',
        key: 'id'
      }
    },
    file_name: {
      type: DataTypes.STRING(255),
      allowNull: false
    },
    file_path: {
      type: DataTypes.STRING(500),
      allowNull: false
    },
    file_size: {
      type: DataTypes.BIGINT,
      allowNull: false
    },
    mime_type: {
      type: DataTypes.STRING(100),
      allowNull: false
    },
    uploaded_by: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id'
      }
    },
    metadata: {
      type: DataTypes.JSONB,
      defaultValue: {}
    }
  }, {
    sequelize,
    modelName: 'FileAttachment',
    tableName: 'file_attachments',
    timestamps: true,
    createdAt: 'uploaded_at',
    updatedAt: false,
    indexes: [
      {
        fields: ['document_id']
      }
    ]
  });

  return FileAttachment;
};
