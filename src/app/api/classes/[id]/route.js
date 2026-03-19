// src/app/api/classes/[id]/route.js
import { query, queryOne } from '@/lib/db';
import { ok, err, requireAuth } from '@/lib/apiHelpers';

export async function PUT(request, { params }) {
  const auth = requireAuth(request, 'teacher');
  if (auth.error) return auth.error;

  const { name, status } = await request.json();
  if (!name?.trim()) return err('Class name required');

  await query('UPDATE classes SET name = ?, status = ? WHERE id = ?', [name.trim(), status, params.id]);
  const updated = await queryOne('SELECT * FROM classes WHERE id = ?', [params.id]);
  return ok(updated);
}

export async function DELETE(request, { params }) {
  const auth = requireAuth(request, 'teacher');
  if (auth.error) return auth.error;

  await query('DELETE FROM classes WHERE id = ?', [params.id]);
  return ok({ message: 'Deleted' });
}
