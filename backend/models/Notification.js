const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Notification extends Model {
    static associate(models) {
      // Notification belongs to user
      Notification.belongsTo(models.User, {
        foreignKey: 'user_id',
        as: 'user'
      });
    }

    // Mark notification as read
    async markAsRead() {
      this.is_read = true;
      this.read_at = new Date();
      await this.save();
    }

    // Mark notification as unread
    async markAsUnread() {
      this.is_read = false;
      this.read_at = null;
      await this.save();
    }
  }

  Notification.init({
    id: {
      type: DataTypes.UUID,
      primaryKey: true,
      defaultValue: DataTypes.UUIDV4
    },
    user_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id'
      }
    },
    type: {
      type: DataTypes.STRING(50),
      allowNull: false
    },
    title: {
      type: DataTypes.STRING(255),
      allowNull: false
    },
    message: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    related_entity_type: {
      type: DataTypes.STRING(50),
      allowNull: true
    },
    related_entity_id: {
      type: DataTypes.UUID,
      allowNull: true
    },
    is_read: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    read_at: {
      type: DataTypes.DATE,
      allowNull: true
    }
  }, {
    sequelize,
    modelName: 'Notification',
    tableName: 'notifications',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: false,
    indexes: [
      {
        fields: ['user_id', 'is_read']
      }
    ]
  });

  return Notification;
};
