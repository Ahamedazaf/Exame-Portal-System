// src/app/api/exams/[id]/route.js
import { query, queryOne } from '@/lib/db';
import { ok, err, requireAuth } from '@/lib/apiHelpers';

export async function GET(request, { params }) {
  const auth = requireAuth(request);
  if (auth.error) return auth.error;

  const exam = await queryOne(`
    SELECT e.*, c.name AS class_name FROM exams e
    LEFT JOIN classes c ON e.class_id = c.id
    WHERE e.id = ?`, [params.id]);
  if (!exam) return err('Exam not found', 404);
  return ok(exam);
}

export async function PUT(request, { params }) {
  const auth = requireAuth(request, 'teacher');
  if (auth.error) return auth.error;

  const { title, classId, instructions, status } = await request.json();
  if (!title?.trim() || !classId) return err('Title and class required');

  await query(
    'UPDATE exams SET title = ?, class_id = ?, instructions = ?, status = ? WHERE id = ?',
    [title.trim(), classId, instructions || '', status, params.id]
  );
  const updated = await queryOne(`
    SELECT e.*, c.name AS class_name FROM exams e
    LEFT JOIN classes c ON e.class_id = c.id WHERE e.id = ?`, [params.id]);
  return ok(updated);
}

export async function DELETE(request, { params }) {
  const auth = requireAuth(request, 'teacher');
  if (auth.error) return auth.error;

  await query('DELETE FROM exams WHERE id = ?', [params.id]);
  return ok({ message: 'Deleted' });
}
