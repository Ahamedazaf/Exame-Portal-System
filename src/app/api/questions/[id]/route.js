// src/app/api/questions/[id]/route.js
import { query, queryOne } from '@/lib/db';
import { ok, err, requireAuth } from '@/lib/apiHelpers';

export async function PUT(request, { params }) {
  const auth = requireAuth(request, 'teacher');
  if (auth.error) return auth.error;

  const { text, options, correct, marks, timer } = await request.json();
  if (!text?.trim() || !Array.isArray(options)) return err('text and options required');

  await query(
    'UPDATE questions SET text = ?, options = ?, correct = ?, marks = ?, timer = ? WHERE id = ?',
    [text.trim(), JSON.stringify(options), correct ?? 0, marks ?? 10, timer ?? 30, params.id]
  );
  const updated = await queryOne('SELECT * FROM questions WHERE id = ?', [params.id]);
  return ok({ ...updated, options: JSON.parse(updated.options) });
}

export async function DELETE(request, { params }) {
  const auth = requireAuth(request, 'teacher');
  if (auth.error) return auth.error;

  await query('DELETE FROM questions WHERE id = ?', [params.id]);
  return ok({ message: 'Deleted' });
}
