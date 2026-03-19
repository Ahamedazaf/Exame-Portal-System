// src/app/api/exams/route.js
import { query, queryOne } from '@/lib/db';
import { ok, err, requireAuth } from '@/lib/apiHelpers';

export async function GET(request) {
  const auth = requireAuth(request);
  if (auth.error) return auth.error;
  const { user } = auth;

  try {
    let exams;
    if (user.role === 'teacher') {
      exams = await query(`
        SELECT e.*, c.name AS class_name,
               (SELECT COUNT(*) FROM questions q WHERE q.exam_id = e.id) AS question_count
        FROM exams e
        LEFT JOIN classes c ON e.class_id = c.id
        ORDER BY e.created_at DESC
      `);
    } else {
      // Student: only published exams for their class
      if (!user.classId) return ok([]);
      exams = await query(`
        SELECT e.*, c.name AS class_name,
               (SELECT COUNT(*) FROM questions q WHERE q.exam_id = e.id) AS question_count
        FROM exams e
        LEFT JOIN classes c ON e.class_id = c.id
        WHERE e.status = 'published' AND e.class_id = ?
        ORDER BY e.created_at DESC
      `, [user.classId]);
    }
    return ok(exams);
  } catch (e) {
    console.error('[Exams GET Error]', e.message);
    return err('Server error: ' + e.message, 500);
  }
}

export async function POST(request) {
  const auth = requireAuth(request, 'teacher');
  if (auth.error) return auth.error;

  try {
    const { title, classId, instructions, status = 'draft' } = await request.json();
    if (!title?.trim()) return err('Exam title is required');
    if (!classId) return err('Please select a class');

    const result = await query(
      'INSERT INTO exams (title, class_id, instructions, status) VALUES (?, ?, ?, ?)',
      [title.trim(), classId, instructions || '', status]
    );
    const created = await queryOne(`
      SELECT e.*, c.name AS class_name,
             (SELECT COUNT(*) FROM questions q WHERE q.exam_id = e.id) AS question_count
      FROM exams e LEFT JOIN classes c ON e.class_id = c.id
      WHERE e.id = ?`, [result.insertId]);
    return ok(created, 201);
  } catch (e) {
    console.error('[Exams POST Error]', e.message);
    return err('Server error: ' + e.message, 500);
  }
}
