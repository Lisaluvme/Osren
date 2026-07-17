const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class User extends Model {
    static associate(models) {
      // User has many documents
      User.hasMany(models.Document, {
        foreignKey: 'created_by',
        as: 'createdDocuments'
      });

      User.hasMany(models.Document, {
        foreignKey: 'assigned_to',
        as: 'assignedDocuments'
      });

      // User has many workflow transitions
      User.hasMany(models.WorkflowTransition, {
        foreignKey: 'transitioned_by',
        as: 'transitions'
      });

      // User has many audit logs
      User.hasMany(models.AuditLog, {
        foreignKey: 'performed_by',
        as: 'auditLogs'
      });

      // User has many notifications
      User.hasMany(models.Notification, {
        foreignKey: 'user_id',
        as: 'notifications'
      });

      // User has many file attachments
      User.hasMany(models.FileAttachment, {
        foreignKey: 'uploaded_by',
        as: 'uploadedFiles'
      });

      // User belongs to a role
      User.belongsTo(models.Role, {
        foreignKey: 'role_id',
        as: 'role'
      });
    }

    // Instance methods
    toJSON() {
      const values = { ...this.get() };
      delete values.password_hash;
      return values;
    }

    hasPermission(permission) {
      if (!this.role || !this.role.permissions) {
        return false;
      }
      return this.role.permissions.includes(permission);
    }
  }

  User.init({
    id: {
      type: DataTypes.UUID,
      primaryKey: true,
      defaultValue: DataTypes.UUIDV4
    },
    email: {
      type: DataTypes.STRING(255),
      unique: true,
      allowNull: false,
      validate: {
        isEmail: true
      }
    },
    password_hash: {
      // Nullable: Firebase-only users have no local password.
      type: DataTypes.STRING(255),
      allowNull: true
    },
    firebase_uid: {
      type: DataTypes.STRING(128),
      allowNull: true,
      unique: true
    },
    full_name: {
      type: DataTypes.STRING(255),
      allowNull: false
    },
    role_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'roles',
        key: 'id'
      }
    },
    is_active: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    },
    last_login: {
      type: DataTypes.DATE,
      allowNull: true
    }
  }, {
    sequelize,
    modelName: 'User',
    tableName: 'users',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [
      {
        unique: true,
        fields: ['email']
      }
    ]
  });

  return User;
};
