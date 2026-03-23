import { queryOne, query } from '@/lib/db';
import { ok, requireAuth } from '@/lib/apiHelpers';

export async function GET(request) {
  const auth = requireAuth(request, 'teacher');
  if (auth.error) return auth.error;

  const totalClassesRow = await queryOne(
    `SELECT COUNT(*) AS total_classes FROM classes`
  );

  const totalStudentsRow = await queryOne(
    `SELECT COUNT(*) AS total_students FROM users WHERE role = 'student'`
  );

  let totalExamsRow = { total_exams: 0 };
  let totalResultsRow = { total_results: 0 };
  let recentExams = [];
  let chartData = [];

  try {
    totalExamsRow = await queryOne(
      `SELECT COUNT(*) AS total_exams FROM exams`
    );
  } catch (e) {
    console.log('Exams table not ready:', e.message);
  }

  try {
    totalResultsRow = await queryOne(
      `SELECT COUNT(*) AS total_results FROM results`
    );
  } catch (e) {
    console.log('Results table not ready:', e.message);
  }

  try {
    recentExams = await query(`
      SELECT e.id, e.title, e.status, e.created_at, c.name AS class_name,
             (SELECT COUNT(*) FROM questions q WHERE q.exam_id = e.id) AS question_count
      FROM exams e
      LEFT JOIN classes c ON e.class_id = c.id
      ORDER BY e.created_at DESC
      LIMIT 5
    `);
  } catch (e) {
    console.log('Recent exams not available:', e.message);
    recentExams = [];
  }

  try {
    chartData = await query(`
      SELECT e.title, COUNT(r.id) AS attempts
      FROM exams e
      LEFT JOIN results r ON r.exam_id = e.id
      GROUP BY e.id, e.title
      ORDER BY e.created_at DESC
      LIMIT 8
    `);
  } catch (e) {
    console.log('Chart data not available:', e.message);
    chartData = [];
  }

  const stats = {
    total_classes: totalClassesRow?.total_classes || 0,
    total_students: totalStudentsRow?.total_students || 0,
    total_exams: totalExamsRow?.total_exams || 0,
    total_results: totalResultsRow?.total_results || 0,
  };

  return ok({ stats, recentExams, chartData });
}