const { Notification } = require('../models');
const { asyncHandler } = require('../middleware/errorHandler');

class NotificationController {
  /**
   * Get user notifications
   */
  getNotifications = asyncHandler(async (req, res) => {
    const {
      is_read,
      type,
      limit = 50,
      offset = 0
    } = req.query;

    const where = { user_id: req.userId };

    if (is_read !== undefined) {
      where.is_read = is_read === 'true';
    }

    if (type) {
      where.type = type;
    }

    const notifications = await Notification.findAll({
      where,
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [['created_at', 'DESC']]
    });

    const unreadCount = await Notification.count({
      where: { user_id: req.userId, is_read: false }
    });

    res.json({
      success: true,
      data: {
        notifications,
        unreadCount
      }
    });
  });

  /**
   * Get unread count
   */
  getUnreadCount = asyncHandler(async (req, res) => {
    const count = await Notification.count({
      where: {
        user_id: req.userId,
        is_read: false
      }
    });

    res.json({
      success: true,
      data: { count }
    });
  });

  /**
   * Mark notification as read
   */
  markAsRead = asyncHandler(async (req, res) => {
    const notification = await Notification.findOne({
      where: {
        id: req.params.id,
        user_id: req.userId
      }
    });

    if (!notification) {
      return res.status(404).json({
        success: false,
        error: 'Notification not found'
      });
    }

    await notification.markAsRead();

    res.json({
      success: true,
      data: notification
    });
  });

  /**
   * Mark all notifications as read
   */
  markAllAsRead = asyncHandler(async (req, res) => {
    await Notification.update(
      {
        is_read: true,
        read_at: new Date()
      },
      {
        where: {
          user_id: req.userId,
          is_read: false
        }
      }
    );

    res.json({
      success: true,
      message: 'All notifications marked as read'
    });
  });

  /**
   * Delete notification
   */
  deleteNotification = asyncHandler(async (req, res) => {
    const notification = await Notification.findOne({
      where: {
        id: req.params.id,
        user_id: req.userId
      }
    });

    if (!notification) {
      return res.status(404).json({
        success: false,
        error: 'Notification not found'
      });
    }

    await notification.destroy();

    res.json({
      success: true,
      message: 'Notification deleted'
    });
  });
}

module.exports = new NotificationController();
