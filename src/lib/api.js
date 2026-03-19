// src/lib/api.js
// Centralized API client — attaches JWT token to every request

function getToken() {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('exame_token');
}

async function request(path, options = {}) {
  const token = getToken();
  const res = await fetch(path, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    },
  });
  const json = await res.json();
  if (!json.success) throw new Error(json.error || 'Request failed');
  return json.data;
}

const get  = (path)         => request(path);
const post = (path, body)   => request(path, { method: 'POST',   body: JSON.stringify(body) });
const put  = (path, body)   => request(path, { method: 'PUT',    body: JSON.stringify(body) });
const del  = (path)         => request(path, { method: 'DELETE' });

// ─── Auth ─────────────────────────────────────────────────────────────────────
export const authApi = {
  login:    (email, password) => post('/api/auth/login',    { email, password }),
  register: (data)            => post('/api/auth/register', data),
  me:       ()                => get('/api/auth/me'),
};

// ─── Classes ──────────────────────────────────────────────────────────────────
export const classesApi = {
  list:   ()           => get('/api/classes'),
  create: (data)       => post('/api/classes', data),
  update: (id, data)   => put(`/api/classes/${id}`, data),
  delete: (id)         => del(`/api/classes/${id}`),
};

// ─── Students ─────────────────────────────────────────────────────────────────
export const studentsApi = {
  list:   ()         => get('/api/students'),
  update: (id, data) => put(`/api/students/${id}`, data),
};

// ─── Exams ────────────────────────────────────────────────────────────────────
export const examsApi = {
  list:   ()         => get('/api/exams'),
  get:    (id)       => get(`/api/exams/${id}`),
  create: (data)     => post('/api/exams', data),
  update: (id, data) => put(`/api/exams/${id}`, data),
  delete: (id)       => del(`/api/exams/${id}`),
};

// ─── Questions ────────────────────────────────────────────────────────────────
export const questionsApi = {
  list:   (examId)   => get(`/api/questions?examId=${examId}`),
  create: (data)     => post('/api/questions', data),
  update: (id, data) => put(`/api/questions/${id}`, data),
  delete: (id)       => del(`/api/questions/${id}`),
};

// ─── Results ──────────────────────────────────────────────────────────────────
export const resultsApi = {
  list:   (examId)           => get(examId ? `/api/results?examId=${examId}` : '/api/results'),
  submit: (examId, answers)  => post('/api/results', { examId, answers }),
};

// ─── Dashboard ────────────────────────────────────────────────────────────────
export const dashboardApi = {
  stats: () => get('/api/dashboard'),
};
