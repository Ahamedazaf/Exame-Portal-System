// src/app/api/students/check-approval/route.js
// Checks the real-time approval status from DB
import { queryOne } from '@/lib/db';
import { ok, err, requireAuth } from '@/lib/apiHelpers';

export async function GET(request) {
  const auth = requireAuth(request);
  if (auth.error) return auth.error;

  const user = await queryOne(
    'SELECT id, approval_status, class_id, status FROM users WHERE id = ?',
    [auth.user.id]
  );
  if (!user) return err('User not found', 404);

  return ok({
    approvalStatus: user.approval_status,
    classId: user.class_id,
    accountStatus: user.status,
  });
}
