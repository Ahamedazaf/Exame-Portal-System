// src/app/api/students/[id]/route.js
import { query, queryOne } from '@/lib/db';
import { ok, err, requireAuth } from '@/lib/apiHelpers';

export async function PUT(request, { params }) {
  const auth = requireAuth(request, 'teacher');
  if (auth.error) return auth.error;

  const { status, classId, approvalStatus } = await request.json();

  await query(
    `UPDATE users SET 
      status = ?, 
      class_id = ?,
      approval_status = ?
     WHERE id = ? AND role = 'student'`,
    [status, classId || null, approvalStatus || 'approved', params.id]
  );

  const updated = await queryOne(`
    SELECT u.id, u.name, u.email, u.status, u.class_id, u.approval_status, c.name AS class_name
    FROM users u LEFT JOIN classes c ON u.class_id = c.id
    WHERE u.id = ?`, [params.id]);
  return ok(updated);
}
