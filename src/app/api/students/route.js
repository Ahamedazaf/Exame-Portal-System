// src/app/api/students/route.js
import { query } from '@/lib/db';
import { ok, requireAuth } from '@/lib/apiHelpers';

export async function GET(request) {
  const auth = requireAuth(request, 'teacher');
  if (auth.error) return auth.error;

  const students = await query(`
    SELECT 
      u.id, u.name, u.email, u.status, u.class_id,
      u.approval_status, u.auth_provider, u.created_at,
      c.name AS class_name
    FROM users u
    LEFT JOIN classes c ON u.class_id = c.id
    WHERE u.role = 'student'
    ORDER BY 
      CASE u.approval_status WHEN 'pending' THEN 0 WHEN 'approved' THEN 1 ELSE 2 END,
      u.created_at DESC
  `);
  return ok(students);
}
