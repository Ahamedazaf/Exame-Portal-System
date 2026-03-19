// src/lib/store.js
// LocalStorage-based data store simulating a database

export const KEYS = {
  USERS: 'exame_users',
  CLASSES: 'exame_classes',
  EXAMS: 'exame_exams',
  QUESTIONS: 'exame_questions',
  RESULTS: 'exame_results',
  CURRENT_USER: 'exame_current_user',
};

const isBrowser = typeof window !== 'undefined';

function get(key) {
  if (!isBrowser) return null;
  try {
    const v = localStorage.getItem(key);
    return v ? JSON.parse(v) : null;
  } catch { return null; }
}

function set(key, value) {
  if (!isBrowser) return;
  localStorage.setItem(key, JSON.stringify(value));
}

// ─── Seed Data ───────────────────────────────────────────────────────────────
export function seedData() {
  if (!isBrowser) return;
  if (localStorage.getItem('exame_seeded')) return;

  const classes = [
    { id: 'cls1', name: 'Computer Science Batch 01', status: 'active', createdAt: new Date().toISOString() },
    { id: 'cls2', name: 'Computer Science Batch 02', status: 'active', createdAt: new Date().toISOString() },
    { id: 'cls3', name: 'Diploma Web Development B01', status: 'active', createdAt: new Date().toISOString() },
  ];

  const users = [
    { id: 'teacher1', role: 'teacher', name: 'Admin Teacher', email: 'teacher@exame.com', password: 'teacher123', status: 'active' },
    { id: 'stu1', role: 'student', name: 'Arun Kumar', email: 'arun@student.com', password: 'student123', classId: 'cls1', status: 'active' },
    { id: 'stu2', role: 'student', name: 'Priya Devi', email: 'priya@student.com', password: 'student123', classId: 'cls2', status: 'active' },
  ];

  const exams = [
    {
      id: 'exam1', title: 'JavaScript Basics Test', classId: 'cls1',
      instructions: 'Read each question carefully. You have a timer per question.',
      status: 'published', totalMarks: 30, createdAt: new Date().toISOString()
    },
    {
      id: 'exam2', title: 'HTML & CSS Fundamentals', classId: 'cls3',
      instructions: 'Answer all MCQ questions.',
      status: 'draft', totalMarks: 20, createdAt: new Date().toISOString()
    },
  ];

  const questions = [
    { id: 'q1', examId: 'exam1', text: 'What does HTML stand for?', options: ['Hyper Text Markup Language', 'High Tech Modern Language', 'Hyper Transfer Markup Logic', 'Home Tool Markup Language'], correct: 0, marks: 10, timer: 30 },
    { id: 'q2', examId: 'exam1', text: 'Which keyword declares a variable in JavaScript?', options: ['var', 'int', 'string', 'declare'], correct: 0, marks: 10, timer: 30 },
    { id: 'q3', examId: 'exam1', text: 'What is the output of: console.log(typeof null)?', options: ['"object"', '"null"', '"undefined"', '"string"'], correct: 0, marks: 10, timer: 45 },
    { id: 'q4', examId: 'exam2', text: 'Which tag creates a hyperlink in HTML?', options: ['<a>', '<link>', '<href>', '<url>'], correct: 0, marks: 10, timer: 30 },
    { id: 'q5', examId: 'exam2', text: 'What does CSS stand for?', options: ['Cascading Style Sheets', 'Creative Style Syntax', 'Computer Style Sheets', 'Colorful Style Syntax'], correct: 0, marks: 10, timer: 30 },
  ];

  set(KEYS.CLASSES, classes);
  set(KEYS.USERS, users);
  set(KEYS.EXAMS, exams);
  set(KEYS.QUESTIONS, questions);
  set(KEYS.RESULTS, []);
  localStorage.setItem('exame_seeded', '1');
}

// ─── Auth ─────────────────────────────────────────────────────────────────────
export const auth = {
  login(email, password) {
    const users = get(KEYS.USERS) || [];
    const user = users.find(u => u.email === email && u.password === password);
    if (!user) return null;
    if (user.status === 'blocked') return { error: 'blocked' };
    set(KEYS.CURRENT_USER, user);
    return user;
  },
  logout() { if (isBrowser) localStorage.removeItem(KEYS.CURRENT_USER); },
  current() { return get(KEYS.CURRENT_USER); },
  register(data) {
    const users = get(KEYS.USERS) || [];
    if (users.find(u => u.email === data.email)) return { error: 'exists' };
    const user = { ...data, id: 'stu_' + Date.now(), role: 'student', status: 'active' };
    users.push(user);
    set(KEYS.USERS, users);
    return user;
  }
};

// ─── Classes ──────────────────────────────────────────────────────────────────
export const classesStore = {
  all() { return get(KEYS.CLASSES) || []; },
  active() { return (get(KEYS.CLASSES) || []).filter(c => c.status === 'active'); },
  get(id) { return (get(KEYS.CLASSES) || []).find(c => c.id === id); },
  create(data) {
    const list = get(KEYS.CLASSES) || [];
    const item = { ...data, id: 'cls_' + Date.now(), createdAt: new Date().toISOString() };
    list.push(item);
    set(KEYS.CLASSES, list);
    return item;
  },
  update(id, data) {
    const list = get(KEYS.CLASSES) || [];
    const idx = list.findIndex(c => c.id === id);
    if (idx !== -1) { list[idx] = { ...list[idx], ...data }; set(KEYS.CLASSES, list); }
  },
  delete(id) {
    const list = (get(KEYS.CLASSES) || []).filter(c => c.id !== id);
    set(KEYS.CLASSES, list);
  }
};

// ─── Students ─────────────────────────────────────────────────────────────────
export const studentsStore = {
  all() { return (get(KEYS.USERS) || []).filter(u => u.role === 'student'); },
  get(id) { return (get(KEYS.USERS) || []).find(u => u.id === id); },
  update(id, data) {
    const list = get(KEYS.USERS) || [];
    const idx = list.findIndex(u => u.id === id);
    if (idx !== -1) { list[idx] = { ...list[idx], ...data }; set(KEYS.USERS, list); }
  }
};

// ─── Exams ────────────────────────────────────────────────────────────────────
export const examsStore = {
  all() { return get(KEYS.EXAMS) || []; },
  get(id) { return (get(KEYS.EXAMS) || []).find(e => e.id === id); },
  forClass(classId) {
    return (get(KEYS.EXAMS) || []).filter(e => e.classId === classId && e.status === 'published');
  },
  create(data) {
    const list = get(KEYS.EXAMS) || [];
    const item = { ...data, id: 'exam_' + Date.now(), createdAt: new Date().toISOString() };
    list.push(item);
    set(KEYS.EXAMS, list);
    return item;
  },
  update(id, data) {
    const list = get(KEYS.EXAMS) || [];
    const idx = list.findIndex(e => e.id === id);
    if (idx !== -1) { list[idx] = { ...list[idx], ...data }; set(KEYS.EXAMS, list); }
  },
  delete(id) {
    const list = (get(KEYS.EXAMS) || []).filter(e => e.id !== id);
    set(KEYS.EXAMS, list);
  }
};

// ─── Questions ────────────────────────────────────────────────────────────────
export const questionsStore = {
  forExam(examId) { return (get(KEYS.QUESTIONS) || []).filter(q => q.examId === examId); },
  get(id) { return (get(KEYS.QUESTIONS) || []).find(q => q.id === id); },
  create(data) {
    const list = get(KEYS.QUESTIONS) || [];
    const item = { ...data, id: 'q_' + Date.now() };
    list.push(item);
    set(KEYS.QUESTIONS, list);
    return item;
  },
  update(id, data) {
    const list = get(KEYS.QUESTIONS) || [];
    const idx = list.findIndex(q => q.id === id);
    if (idx !== -1) { list[idx] = { ...list[idx], ...data }; set(KEYS.QUESTIONS, list); }
  },
  delete(id) {
    const list = (get(KEYS.QUESTIONS) || []).filter(q => q.id !== id);
    set(KEYS.QUESTIONS, list);
  }
};

// ─── Results ──────────────────────────────────────────────────────────────────
export const resultsStore = {
  all() { return get(KEYS.RESULTS) || []; },
  forStudent(studentId) { return (get(KEYS.RESULTS) || []).filter(r => r.studentId === studentId); },
  forExam(examId) { return (get(KEYS.RESULTS) || []).filter(r => r.examId === examId); },
  hasAttempted(studentId, examId) {
    return (get(KEYS.RESULTS) || []).some(r => r.studentId === studentId && r.examId === examId);
  },
  save(data) {
    const list = get(KEYS.RESULTS) || [];
    const item = { ...data, id: 'res_' + Date.now(), completedAt: new Date().toISOString() };
    list.push(item);
    set(KEYS.RESULTS, list);
    return item;
  }
};
