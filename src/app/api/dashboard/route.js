// src/app/api/dashboard/route.js
import { queryOne, query } from '@/lib/db';
import { ok, requireAuth } from '@/lib/apiHelpers';

export async function GET(request) {
  const auth = requireAuth(request, 'teacher');
  if (auth.error) return auth.error;

  const stats = await queryOne(`
    SELECT
      (SELECT COUNT(*) FROM classes)                    AS total_classes,
      (SELECT COUNT(*) FROM users WHERE role='student') AS total_students,
      (SELECT COUNT(*) FROM exams)                      AS total_exams,
      (SELECT COUNT(*) FROM results)                    AS total_results
  `);

  const recentExams = await query(`
    SELECT e.id, e.title, e.status, e.created_at, c.name AS class_name,
           (SELECT COUNT(*) FROM questions q WHERE q.exam_id = e.id) AS question_count
    FROM exams e LEFT JOIN classes c ON e.class_id = c.id
    ORDER BY e.created_at DESC LIMIT 5
  `);

  const chartData = await query(`
    SELECT e.title, COUNT(r.id) AS attempts
    FROM exams e LEFT JOIN results r ON r.exam_id = e.id
    GROUP BY e.id, e.title
    ORDER BY e.created_at DESC LIMIT 8
  `);

  return ok({ stats, recentExams, chartData });
}
