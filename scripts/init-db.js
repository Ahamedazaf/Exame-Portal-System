// scripts/init-db.js
// Supports two modes:
//   node scripts/init-db.js               → Full setup (create tables + seed)
//   node scripts/init-db.js --fix-passwords → Only fix/reset passwords (use after SQL import)

const mysql  = require('mysql2/promise');
const bcrypt = require('bcryptjs');
const fs     = require('fs');
const path   = require('path');

// Read .env.local manually
function loadEnv() {
  const envPath = path.join(__dirname, '..', '.env.local');
  if (!fs.existsSync(envPath)) return;
  fs.readFileSync(envPath, 'utf-8').split('\n').forEach(line => {
    const t = line.trim();
    if (!t || t.startsWith('#')) return;
    const i = t.indexOf('=');
    if (i === -1) return;
    const k = t.slice(0, i).trim();
    const v = t.slice(i + 1).trim();
    if (!process.env[k]) process.env[k] = v;
  });
}
loadEnv();

const dbName = process.env.DB_NAME || 'exame_portal';

async function getConn(withDb = true) {
  return mysql.createConnection({
    host:     process.env.DB_HOST     || 'localhost',
    port:     Number(process.env.DB_PORT) || 3306,
    user:     process.env.DB_USER     || 'root',
    password: process.env.DB_PASSWORD || '',
    ...(withDb ? { database: dbName } : {}),
    multipleStatements: true,
  });
}

// ── Fix Passwords Only ────────────────────────────────────────
async function fixPasswords() {
  console.log('🔧 Fixing passwords in existing database...\n');
  const conn = await getConn(true);

  const tHash = bcrypt.hashSync('teacher123', 10);
  const sHash = bcrypt.hashSync('student123', 10);

  await conn.execute('UPDATE users SET password = ? WHERE email = ?', [tHash, 'teacher@exame.com']);
  await conn.execute('UPDATE users SET password = ? WHERE email = ?', [sHash, 'arun@student.com']);
  await conn.execute('UPDATE users SET password = ? WHERE email = ?', [sHash, 'priya@student.com']);

  const [rows] = await conn.execute('SELECT id, name, email, role FROM users');
  console.log('✅ Passwords updated for:');
  rows.forEach(r => console.log(`   ${r.role === 'teacher' ? '👨‍🏫' : '🎓'} ${r.name} <${r.email}>`));

  console.log('\n🔑 Login Credentials:');
  console.log('   Teacher → teacher@exame.com  / teacher123');
  console.log('   Student → arun@student.com   / student123');
  console.log('   Student → priya@student.com  / student123');
  console.log('\n🚀 Now run: npm run dev');

  await conn.end();
}

// ── Full Setup ────────────────────────────────────────────────
async function fullSetup() {
  console.log('🚀 Starting full database setup...\n');

  // Create DB
  const connNoDb = await getConn(false);
  await connNoDb.query(`CREATE DATABASE IF NOT EXISTS \`${dbName}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;`);
  await connNoDb.end();
  console.log(`✅ Database "${dbName}" ready`);

  const conn = await getConn(true);

  // Create Tables
  await conn.query(`
    CREATE TABLE IF NOT EXISTS classes (
      id INT AUTO_INCREMENT PRIMARY KEY, name VARCHAR(255) NOT NULL,
      status ENUM('active','inactive') NOT NULL DEFAULT 'active',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB;

    CREATE TABLE IF NOT EXISTS users (
      id INT AUTO_INCREMENT PRIMARY KEY, name VARCHAR(255) NOT NULL,
      email VARCHAR(255) NOT NULL UNIQUE, password VARCHAR(255) NOT NULL,
      role ENUM('teacher','student') NOT NULL DEFAULT 'student',
      status ENUM('active','blocked') NOT NULL DEFAULT 'active',
      class_id INT NULL, created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB;

    CREATE TABLE IF NOT EXISTS exams (
      id INT AUTO_INCREMENT PRIMARY KEY, title VARCHAR(255) NOT NULL,
      class_id INT NOT NULL, instructions TEXT, 
      status ENUM('draft','published','closed') NOT NULL DEFAULT 'draft',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB;

    CREATE TABLE IF NOT EXISTS questions (
      id INT AUTO_INCREMENT PRIMARY KEY, exam_id INT NOT NULL,
      text TEXT NOT NULL, options JSON NOT NULL, correct TINYINT NOT NULL DEFAULT 0,
      marks INT NOT NULL DEFAULT 10, timer INT NOT NULL DEFAULT 30,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB;

    CREATE TABLE IF NOT EXISTS results (
      id INT AUTO_INCREMENT PRIMARY KEY, student_id INT NOT NULL,
      exam_id INT NOT NULL, score INT NOT NULL DEFAULT 0,
      total_marks INT NOT NULL DEFAULT 0, correct INT NOT NULL DEFAULT 0,
      wrong INT NOT NULL DEFAULT 0, answers JSON,
      completed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE KEY uq_student_exam (student_id, exam_id)
    ) ENGINE=InnoDB;
  `);
  console.log('✅ All tables created');

  // Check if seeded
  const [[{ cnt }]] = await conn.query('SELECT COUNT(*) AS cnt FROM users');
  if (Number(cnt) > 0) {
    console.log('ℹ️  Users exist — running password fix instead...');
    await conn.end();
    return fixPasswords();
  }

  // Seed
  await conn.query(`INSERT INTO classes (name) VALUES
    ('Computer Science Batch 01'), ('Computer Science Batch 02'), ('Diploma Web Development B01');`);

  const [[cls1]] = await conn.query(`SELECT id FROM classes WHERE name='Computer Science Batch 01'`);
  const [[cls3]] = await conn.query(`SELECT id FROM classes WHERE name='Diploma Web Development B01'`);

  const tHash = bcrypt.hashSync('teacher123', 10);
  const sHash = bcrypt.hashSync('student123', 10);

  await conn.query(`INSERT INTO users (name, email, password, role, status, class_id) VALUES
    ('Admin Teacher','teacher@exame.com','${tHash}','teacher','active',NULL),
    ('Arun Kumar','arun@student.com','${sHash}','student','active',${cls1.id}),
    ('Priya Devi','priya@student.com','${sHash}','student','active',${cls1.id});`);

  await conn.query(`INSERT INTO exams (title, class_id, instructions, status) VALUES
    ('JavaScript Basics Test',${cls1.id},'Read each question carefully.','published'),
    ('HTML & CSS Fundamentals',${cls3.id},'Answer all MCQ questions.','draft');`);

  const [[e1]] = await conn.query(`SELECT id FROM exams WHERE title='JavaScript Basics Test'`);
  const [[e2]] = await conn.query(`SELECT id FROM exams WHERE title='HTML & CSS Fundamentals'`);

  const o = (arr) => JSON.stringify(arr);
  await conn.query(`INSERT INTO questions (exam_id,text,options,correct,marks,timer) VALUES
    (${e1.id},'What does HTML stand for?','${o(['Hyper Text Markup Language','High Tech Modern Language','Hyper Transfer Markup Logic','Home Tool Markup Language'])}',0,10,30),
    (${e1.id},'Which keyword declares a variable in JavaScript?','${o(['var','int','string','declare'])}',0,10,30),
    (${e1.id},'What is the output of: console.log(typeof null)?','${o(['"object"','"null"','"undefined"','"string"'])}',0,10,45),
    (${e2.id},'Which tag creates a hyperlink in HTML?','${o(['<a>','<link>','<href>','<url>'])}',0,10,30),
    (${e2.id},'What does CSS stand for?','${o(['Cascading Style Sheets','Creative Style Syntax','Computer Style Sheets','Colorful Style Syntax'])}',0,10,30);`);

  console.log('✅ Demo data seeded');
  console.log('\n🔑 Login Credentials:');
  console.log('   Teacher → teacher@exame.com  / teacher123');
  console.log('   Student → arun@student.com   / student123');
  console.log('   Student → priya@student.com  / student123');
  console.log('\n🚀 Now run: npm run dev');
  await conn.end();
}

// Main
const args = process.argv.slice(2);
if (args.includes('--fix-passwords')) {
  fixPasswords().catch(e => { console.error('❌ Error:', e.message); process.exit(1); });
} else {
  fullSetup().catch(e => { console.error('❌ Error:', e.message); process.exit(1); });
}
