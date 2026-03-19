// src/app/api/classes/route.js
import { query, queryOne } from '@/lib/db';
import { ok, err } from '@/lib/apiHelpers';
import { getTokenFromRequest } from '@/lib/jwt';

export async function GET(request) {
  const user = getTokenFromRequest(request);

  // Teacher → all classes with full details
  if (user?.role === 'teacher') {
    const classes = await query('SELECT * FROM classes ORDER BY created_at DESC');
    return ok(classes);
  }

  // Everyone else (students, unauthenticated/register page) → active classes only
  const classes = await query(
    'SELECT id, name, status FROM classes WHERE status = "active" ORDER BY name ASC'
  );
  return ok(classes);
}

export async function POST(request) {
  const user = getTokenFromRequest(request);
  if (!user || user.role !== 'teacher') return err('Unauthorized', 401);

  const { name, status = 'active' } = await request.json();
  if (!name?.trim()) return err('Class name required');

  const result = await query(
    'INSERT INTO classes (name, status) VALUES (?, ?)',
    [name.trim(), status]
  );
  const created = await queryOne('SELECT * FROM classes WHERE id = ?', [result.insertId]);
  return ok(created, 201);
}
