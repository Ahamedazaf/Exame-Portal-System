// src/app/api/results/route.js
import { query, queryOne } from '@/lib/db';
import { ok, err, requireAuth } from '@/lib/apiHelpers';

export async function GET(request) {
  const auth = requireAuth(request);
  if (auth.error) return auth.error;
  const { user } = auth;

  try {
    const { searchParams } = new URL(request.url);
    const examId = searchParams.get('examId');
    let rows;

    if (user.role === 'teacher') {
      const sql = `
        SELECT r.*,
               u.name  AS student_name,
               u.email AS student_email,
               e.title AS exam_title,
               c.name  AS class_name
        FROM results r
        JOIN users   u ON r.student_id = u.id
        JOIN exams   e ON r.exam_id    = e.id
        LEFT JOIN classes c ON e.class_id = c.id
        ${examId ? 'WHERE r.exam_id = ?' : ''}
        ORDER BY r.completed_at DESC
      `;
      rows = await query(sql, examId ? [examId] : []);
    } else {
      rows = await query(`
        SELECT r.*, e.title AS exam_title, e.class_id
        FROM results r
        JOIN exams e ON r.exam_id = e.id
        WHERE r.student_id = ?
        ORDER BY r.completed_at DESC
      `, [user.id]);
    }

    // Parse JSON answers field safely
    const data = rows.map(r => ({
      ...r,
      answers: (() => {
        if (!r.answers) return [];
        if (typeof r.answers === 'object') return r.answers;
        try { return JSON.parse(r.answers); } catch { return []; }
      })(),
    }));

    return ok(data);
  } catch (e) {
    console.error('[Results GET Error]', e.message);
    return err('Server error: ' + e.message, 500);
  }
}

export async function POST(request) {
  const auth = requireAuth(request, 'student');
  if (auth.error) return auth.error;
  const { user } = auth;

  try {
    const body = await request.json();
    const { examId, answers: submittedAnswers } = body;

    if (!examId) return err('examId is required');
    if (!Array.isArray(submittedAnswers)) return err('answers must be an array');

    // Verify exam is published and for this student's class
    const exam = await queryOne(
      'SELECT * FROM exams WHERE id = ? AND status = "published" AND class_id = ?',
      [examId, user.classId]
    );
    if (!exam) return err('Exam not available or not assigned to your class', 403);

    // Prevent re-attempt
    const already = await queryOne(
      'SELECT id FROM results WHERE student_id = ? AND exam_id = ?',
      [user.id, examId]
    );
    if (already) return err('You have already attempted this exam', 409);

    // Get questions with correct answers
    const questions = await query(
      'SELECT * FROM questions WHERE exam_id = ? ORDER BY id ASC',
      [examId]
    );
    if (!questions || questions.length === 0) return err('No questions found for this exam');

    // Auto-mark
    let score = 0, correct = 0, wrong = 0, totalMarks = 0;
    const answerLog = [];

    questions.forEach((q, i) => {
      totalMarks += q.marks;
      const options   = typeof q.options === 'object' ? q.options : JSON.parse(q.options);
      const chosen    = submittedAnswers[i];   // index (0-based) or null
      const isCorrect = chosen !== null && chosen !== undefined && Number(chosen) === Number(q.correct);

      if (isCorrect) { score += q.marks; correct++; }
      else { wrong++; }

      answerLog.push({
        questionId:    q.id,
        questionText:  q.text,
        selected:      (chosen !== null && chosen !== undefined) ? options[chosen] : 'Not answered',
        correctAnswer: options[q.correct],
        isCorrect,
      });
    });

    // Save result
    const result = await query(
      `INSERT INTO results (student_id, exam_id, score, total_marks, correct, wrong, answers)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [user.id, examId, score, totalMarks, correct, wrong, JSON.stringify(answerLog)]
    );

    const saved = await queryOne('SELECT * FROM results WHERE id = ?', [result.insertId]);
    return ok({ ...saved, answers: answerLog }, 201);

  } catch (e) {
    console.error('[Results POST Error]', e.message);
    return err('Server error: ' + e.message, 500);
  }
}
