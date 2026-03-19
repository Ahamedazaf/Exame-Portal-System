// src/app/api/questions/route.js
import { query, queryOne } from '@/lib/db';
import { ok, err, requireAuth } from '@/lib/apiHelpers';

export async function GET(request) {
  const auth = requireAuth(request);
  if (auth.error) return auth.error;
  const { user } = auth;

  try {
    const { searchParams } = new URL(request.url);
    const examId = searchParams.get('examId');
    if (!examId) return err('examId is required');

    // Student: verify exam is published and for their class
    if (user.role === 'student') {
      const exam = await queryOne(
        'SELECT * FROM exams WHERE id = ? AND status = "published" AND class_id = ?',
        [examId, user.classId]
      );
      if (!exam) return err('Exam not available', 403);

      // Hide correct answer from students
      const qs = await query(
        'SELECT id, exam_id, text, options, marks, timer FROM questions WHERE exam_id = ? ORDER BY id ASC',
        [examId]
      );
      return ok(qs.map(q => ({
        ...q,
        options: typeof q.options === 'object' ? q.options : JSON.parse(q.options),
      })));
    }

    // Teacher: full data
    const qs = await query(
      'SELECT * FROM questions WHERE exam_id = ? ORDER BY id ASC',
      [examId]
    );
    return ok(qs.map(q => ({
      ...q,
      options: typeof q.options === 'object' ? q.options : JSON.parse(q.options),
    })));

  } catch (e) {
    console.error('[Questions GET Error]', e.message);
    return err('Server error: ' + e.message, 500);
  }
}

export async function POST(request) {
  const auth = requireAuth(request, 'teacher');
  if (auth.error) return auth.error;

  try {
    const { examId, text, options, correct, marks, timer } = await request.json();
    if (!examId || !text?.trim()) return err('examId and text are required');
    if (!Array.isArray(options) || options.length < 2) return err('At least 2 options required');

    const result = await query(
      'INSERT INTO questions (exam_id, text, options, correct, marks, timer) VALUES (?, ?, ?, ?, ?, ?)',
      [examId, text.trim(), JSON.stringify(options), correct ?? 0, marks ?? 10, timer ?? 30]
    );
    const created = await queryOne('SELECT * FROM questions WHERE id = ?', [result.insertId]);
    return ok({
      ...created,
      options: typeof created.options === 'object' ? created.options : JSON.parse(created.options),
    }, 201);
  } catch (e) {
    console.error('[Questions POST Error]', e.message);
    return err('Server error: ' + e.message, 500);
  }
}
