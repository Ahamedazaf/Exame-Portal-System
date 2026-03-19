// src/app/api/notifications/route.js
import { query } from '@/lib/db';
import { ok, requireAuth } from '@/lib/apiHelpers';

export async function GET(request) {
  const auth = requireAuth(request, 'teacher');
  if (auth.error) return auth.error;
  try {
    const notifications = await query(`
      SELECT n.*, u.name AS student_name, u.email AS student_email
      FROM notifications n
      LEFT JOIN users u ON n.user_id = u.id
      ORDER BY n.created_at DESC
      LIMIT 50
    `);
    const unreadCount = notifications.filter(n => !n.is_read).length;
    return ok({ notifications, unreadCount });
  } catch (e) { return ok({ notifications: [], unreadCount: 0 }); }
}

export async function PUT(request) {
  const auth = requireAuth(request, 'teacher');
  if (auth.error) return auth.error;
  try {
    await query('UPDATE notifications SET is_read = 1 WHERE is_read = 0');
    return ok({ message: 'All marked as read' });
  } catch (e) { return ok({}); }
}
