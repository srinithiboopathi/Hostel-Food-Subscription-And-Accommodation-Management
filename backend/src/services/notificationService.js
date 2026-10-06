const { pool, query } = require('../config/database');

const VALID_NOTIFICATION_TYPES = [
  'SYSTEM',
  'FEES',
  'LEAVE',
  'COMPLAINT',
  'MESS',
  'ROOM',
  'NOTICE',
  'PAYMENT',
  'ACCOMMODATION',
  'FOOD',
  'STUDENT',
];

const TYPE_ALIAS_MAP = {
  PAYMENT: 'FEES',
  ACCOMMODATION: 'ROOM',
  FOOD: 'MESS',
  STUDENT: 'SYSTEM',
};

/**
 * 1. Create a notification for a user (Supports optional MySQL transaction connection)
 */
async function createNotification({
  userId,
  title,
  message,
  type = 'NOTICE',
  link = null,
  relatedEntityType = null,
  relatedEntityId = null,
  connection = null,
}) {
  if (!userId) {
    const error = new Error('User ID is required to send a notification');
    error.statusCode = 400;
    throw error;
  }

  if (!title || title.trim() === '') {
    const error = new Error('Notification title is required');
    error.statusCode = 400;
    throw error;
  }

  if (!message || message.trim() === '') {
    const error = new Error('Notification message is required');
    error.statusCode = 400;
    throw error;
  }

  const rawType = (type || 'NOTICE').trim().toUpperCase();
  if (!VALID_NOTIFICATION_TYPES.includes(rawType)) {
    const error = new Error(`Invalid notification type "${rawType}". Allowed: ${VALID_NOTIFICATION_TYPES.join(', ')}`);
    error.statusCode = 400;
    throw error;
  }

  const cleanType = TYPE_ALIAS_MAP[rawType] || rawType;
  const cleanTitle = title.trim();
  const cleanMessage = message.trim();
  const cleanLink = link ? link.trim() : null;
  const cleanEntityType = relatedEntityType ? relatedEntityType.trim().toUpperCase() : null;
  const cleanEntityId = relatedEntityId ? parseInt(relatedEntityId, 10) : null;

  // Check user preferences if exists (Non-critical types can be disabled)
  try {
    const [prefs] = connection
      ? await connection.query('SELECT * FROM notification_preferences WHERE user_id = ?', [userId])
      : await query('SELECT * FROM notification_preferences WHERE user_id = ?', [userId]);

    if (prefs && prefs.length > 0) {
      const p = prefs[0];
      if (cleanType === 'MESS' && p.food_alerts === 0) return null;
      if (cleanType === 'LEAVE' && p.leave_alerts === 0) return null;
      if (cleanType === 'COMPLAINT' && p.complaint_alerts === 0) return null;
      if (cleanType === 'ROOM' && p.accommodation_alerts === 0) return null;
      // Critical payment / system alerts are always delivered if not explicitly permitted to disable
      if (cleanType === 'FEES' && p.payment_alerts === 0) return null;
      if (cleanType === 'SYSTEM' && p.system_alerts === 0) return null;
    }
  } catch (prefErr) {
    // Ignore preferences check failure and proceed with delivery
  }

  // Duplicate Prevention: Check if identical notification was sent to user within the duplicate window (5 minutes)
  const duplicateCheckSql = `
    SELECT id, user_id, title, message, type, related_entity_type, related_entity_id, link, is_read, read_at, created_at
    FROM notifications
    WHERE user_id = ? 
      AND title = ? 
      AND message = ? 
      AND type = ?
      AND created_at >= DATE_SUB(NOW(), INTERVAL 5 MINUTE)
    LIMIT 1
  `;
  const checkParams = [userId, cleanTitle, cleanMessage, cleanType];

  const [existing] = connection 
    ? await connection.query(duplicateCheckSql, checkParams)
    : await query(duplicateCheckSql, checkParams);

  if (existing && existing.length > 0) {
    return {
      id: existing[0].id,
      user_id: existing[0].user_id,
      title: existing[0].title,
      message: existing[0].message,
      type: existing[0].type,
      related_entity_type: existing[0].related_entity_type,
      related_entity_id: existing[0].related_entity_id,
      link: existing[0].link,
      is_read: existing[0].is_read,
      read_at: existing[0].read_at,
      created_at: existing[0].created_at,
      isDuplicate: true,
    };
  }

  const sql = `
    INSERT INTO notifications (user_id, title, message, type, related_entity_type, related_entity_id, link, is_read, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, 0, NOW())
  `;
  const params = [userId, cleanTitle, cleanMessage, cleanType, cleanEntityType, cleanEntityId, cleanLink];

  let insertId;
  if (connection) {
    const [result] = await connection.query(sql, params);
    insertId = result.insertId;
  } else {
    const [result] = await query(sql, params);
    insertId = result.insertId;
  }

  return {
    id: insertId,
    user_id: userId,
    title: cleanTitle,
    message: cleanMessage,
    type: cleanType,
    related_entity_type: cleanEntityType,
    related_entity_id: cleanEntityId,
    link: cleanLink,
    is_read: 0,
    read_at: null,
    created_at: new Date(),
  };
}

/**
 * 2. Broadcast Announcement (Admin / Warden)
 */
async function broadcastNotification({
  title,
  message,
  type = 'NOTICE',
  link = null,
  targetRole = 'ALL',
  targetUserIds = [],
}) {
  if (!title || title.trim() === '') {
    const error = new Error('Broadcast title is required');
    error.statusCode = 400;
    throw error;
  }

  if (!message || message.trim() === '') {
    const error = new Error('Broadcast message is required');
    error.statusCode = 400;
    throw error;
  }

  let recipientUsers = [];
  if (targetUserIds && targetUserIds.length > 0) {
    const placeholders = targetUserIds.map(() => '?').join(',');
    const [rows] = await query(
      `SELECT id FROM users WHERE id IN (${placeholders}) AND status = 'ACTIVE'`,
      targetUserIds
    );
    recipientUsers = rows;
  } else if (targetRole && targetRole.toUpperCase() !== 'ALL') {
    const [rows] = await query(
      'SELECT id FROM users WHERE role = ? AND status = "ACTIVE"',
      [targetRole.toUpperCase()]
    );
    recipientUsers = rows;
  } else {
    const [rows] = await query('SELECT id FROM users WHERE status = "ACTIVE"');
    recipientUsers = rows;
  }

  const cleanTitle = title.trim();
  const cleanMessage = message.trim();
  const cleanType = TYPE_ALIAS_MAP[type.toUpperCase()] || type.toUpperCase() || 'NOTICE';
  const cleanLink = link ? link.trim() : null;

  let createdCount = 0;
  for (const user of recipientUsers) {
    try {
      await createNotification({
        userId: user.id,
        title: cleanTitle,
        message: cleanMessage,
        type: cleanType,
        link: cleanLink,
      });
      createdCount++;
    } catch (err) {
      console.warn(`Failed to dispatch broadcast to user ${user.id}:`, err.message);
    }
  }

  return {
    success: true,
    recipientsCount: recipientUsers.length,
    dispatchedCount: createdCount,
  };
}

/**
 * 3. Get User Notifications with pagination, search, category, date filters
 */
async function getUserNotifications(
  userId,
  {
    page = 1,
    limit = 20,
    isRead = '',
    type = '',
    category = '',
    search = '',
    startDate = '',
    endDate = '',
  } = {}
) {
  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
  const offset = (pageNum - 1) * limitNum;

  const whereClauses = ['user_id = ?'];
  const params = [userId];

  if (isRead !== '' && isRead !== undefined && isRead !== null) {
    const boolRead = isRead === true || isRead === 'true' || isRead === '1' || isRead === 1 ? 1 : 0;
    whereClauses.push('is_read = ?');
    params.push(boolRead);
  }

  const rawFilterType = category || type;
  if (rawFilterType && rawFilterType.trim() !== '') {
    const cleanType = rawFilterType.trim().toUpperCase();
    const mappedType = TYPE_ALIAS_MAP[cleanType] || cleanType;
    if (VALID_NOTIFICATION_TYPES.includes(cleanType) || VALID_NOTIFICATION_TYPES.includes(mappedType)) {
      whereClauses.push('type = ?');
      params.push(mappedType);
    }
  }

  if (search && search.trim() !== '') {
    const searchTerm = `%${search.trim()}%`;
    whereClauses.push('(title LIKE ? OR message LIKE ?)');
    params.push(searchTerm, searchTerm);
  }

  if (startDate && startDate.trim() !== '') {
    whereClauses.push('created_at >= ?');
    params.push(`${startDate.trim()} 00:00:00`);
  }

  if (endDate && endDate.trim() !== '') {
    whereClauses.push('created_at <= ?');
    params.push(`${endDate.trim()} 23:59:59`);
  }

  const whereSQL = `WHERE ${whereClauses.join(' AND ')}`;

  // Total count
  const countSql = `SELECT COUNT(*) AS total FROM notifications ${whereSQL}`;
  const [countResult] = await query(countSql, params);
  const total = countResult[0]?.total || 0;

  // Paginated data
  const dataSql = `
    SELECT id, user_id, title, message, type, related_entity_type, related_entity_id, link, is_read, read_at, created_at
    FROM notifications
    ${whereSQL}
    ORDER BY is_read ASC, created_at DESC
    LIMIT ? OFFSET ?
  `;
  const [rows] = await query(dataSql, [...params, limitNum, offset]);

  return {
    notifications: rows || [],
    pagination: {
      page: pageNum,
      limit: limitNum,
      total,
      totalPages: Math.ceil(total / limitNum) || 1,
    },
  };
}

/**
 * 4. Get Recent Unread Notifications for a user
 */
async function getUnreadNotifications(userId, { limit = 10 } = {}) {
  const limitNum = Math.min(50, Math.max(1, parseInt(limit, 10) || 10));

  const sql = `
    SELECT id, user_id, title, message, type, related_entity_type, related_entity_id, link, is_read, read_at, created_at
    FROM notifications
    WHERE user_id = ? AND is_read = 0
    ORDER BY created_at DESC
    LIMIT ?
  `;

  const [rows] = await query(sql, [userId, limitNum]);
  return rows || [];
}

/**
 * 5. Get Unread Notifications Count
 */
async function getUnreadCount(userId) {
  const sql = `
    SELECT COUNT(*) AS unread_count
    FROM notifications
    WHERE user_id = ? AND is_read = 0
  `;

  const [rows] = await query(sql, [userId]);
  return {
    unreadCount: parseInt(rows[0]?.unread_count || 0, 10),
  };
}

/**
 * 6. Mark single notification as read (Enforces user ownership)
 */
async function markAsRead(id, userId) {
  const [existing] = await query(
    'SELECT * FROM notifications WHERE id = ? AND user_id = ?',
    [id, userId]
  );

  if (!existing || existing.length === 0) {
    const error = new Error('Notification not found or access denied');
    error.statusCode = 404;
    throw error;
  }

  const now = new Date();
  await query('UPDATE notifications SET is_read = 1, read_at = NOW() WHERE id = ? AND user_id = ?', [id, userId]);

  return {
    ...existing[0],
    is_read: 1,
    read_at: now,
  };
}

/**
 * 7. Mark all notifications as read for a user
 */
async function markAllAsRead(userId) {
  const [result] = await query(
    'UPDATE notifications SET is_read = 1, read_at = NOW() WHERE user_id = ? AND is_read = 0',
    [userId]
  );

  return {
    updatedCount: result.affectedRows || 0,
    message: 'All unread notifications marked as read',
  };
}

/**
 * 8. Get single notification by ID (Enforces user ownership)
 */
async function getNotificationById(id, userId) {
  const [existing] = await query(
    'SELECT id, user_id, title, message, type, related_entity_type, related_entity_id, link, is_read, read_at, created_at FROM notifications WHERE id = ? AND user_id = ?',
    [id, userId]
  );

  if (!existing || existing.length === 0) {
    const error = new Error('Notification not found or access denied');
    error.statusCode = 404;
    throw error;
  }

  return existing[0];
}

/**
 * 9. Delete notification (Enforces user ownership)
 */
async function deleteNotification(id, userId) {
  const [existing] = await query(
    'SELECT id FROM notifications WHERE id = ? AND user_id = ?',
    [id, userId]
  );

  if (!existing || existing.length === 0) {
    const error = new Error('Notification not found or access denied');
    error.statusCode = 404;
    throw error;
  }

  await query('DELETE FROM notifications WHERE id = ? AND user_id = ?', [id, userId]);

  return {
    id: parseInt(id, 10),
    deleted: true,
  };
}

/**
 * 10. Get User Notification Preferences
 */
async function getNotificationPreferences(userId) {
  const [rows] = await query('SELECT * FROM notification_preferences WHERE user_id = ?', [userId]);
  if (rows && rows.length > 0) {
    return {
      paymentAlerts: Boolean(rows[0].payment_alerts),
      accommodationAlerts: Boolean(rows[0].accommodation_alerts),
      foodAlerts: Boolean(rows[0].food_alerts),
      complaintAlerts: Boolean(rows[0].complaint_alerts),
      leaveAlerts: Boolean(rows[0].leave_alerts),
      systemAlerts: Boolean(rows[0].system_alerts),
    };
  }

  return {
    paymentAlerts: true,
    accommodationAlerts: true,
    foodAlerts: true,
    complaintAlerts: true,
    leaveAlerts: true,
    systemAlerts: true,
  };
}

/**
 * 11. Update User Notification Preferences
 */
async function updateNotificationPreferences(userId, prefs = {}) {
  const {
    paymentAlerts = true,
    accommodationAlerts = true,
    foodAlerts = true,
    complaintAlerts = true,
    leaveAlerts = true,
    systemAlerts = true,
  } = prefs;

  await query(
    `INSERT INTO notification_preferences (user_id, payment_alerts, accommodation_alerts, food_alerts, complaint_alerts, leave_alerts, system_alerts)
     VALUES (?, ?, ?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE 
       payment_alerts = VALUES(payment_alerts),
       accommodation_alerts = VALUES(accommodation_alerts),
       food_alerts = VALUES(food_alerts),
       complaint_alerts = VALUES(complaint_alerts),
       leave_alerts = VALUES(leave_alerts),
       system_alerts = VALUES(system_alerts),
       updated_at = NOW()`,
    [
      userId,
      paymentAlerts ? 1 : 0,
      accommodationAlerts ? 1 : 0,
      foodAlerts ? 1 : 0,
      complaintAlerts ? 1 : 0,
      leaveAlerts ? 1 : 0,
      systemAlerts ? 1 : 0,
    ]
  );

  return await getNotificationPreferences(userId);
}

module.exports = {
  createNotification,
  broadcastNotification,
  getUserNotifications,
  getUnreadNotifications,
  getUnreadCount,
  getNotificationById,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  getNotificationPreferences,
  updateNotificationPreferences,
  VALID_NOTIFICATION_TYPES,
  TYPE_ALIAS_MAP,
};
