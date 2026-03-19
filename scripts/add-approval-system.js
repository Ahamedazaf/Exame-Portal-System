// scripts/add-approval-system.js
// Run: node scripts/add-approval-system.js
// Adds approval_status column to users table

const mysql = require('mysql2/promise');
const fs    = require('fs');
const path  = require('path');

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

async function run() {
  const conn = await mysql.createConnection({
    host:     process.env.DB_HOST     || 'localhost',
    port:     Number(process.env.DB_PORT) || 3306,
    user:     process.env.DB_USER     || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME     || 'exame_portal',
  });

  // Add approval_status column
  try {
    await conn.execute(`
      ALTER TABLE users 
      ADD COLUMN approval_status ENUM('pending','approved','rejected') 
      NOT NULL DEFAULT 'pending' AFTER auth_provider
    `);
    console.log('✅ approval_status column added');
  } catch (e) {
    if (e.code === 'ER_DUP_FIELDNAME') console.log('ℹ️  approval_status already exists');
    else throw e;
  }

  // Add class_id_requested column (for Google users who haven't been assigned a class)
  try {
    await conn.execute(`
      ALTER TABLE users 
      ADD COLUMN class_id_requested INT NULL AFTER approval_status
    `);
    console.log('✅ class_id_requested column added');
  } catch (e) {
    if (e.code === 'ER_DUP_FIELDNAME') console.log('ℹ️  class_id_requested already exists');
    else throw e;
  }

  // Set existing teacher & demo students as approved
  await conn.execute(`
    UPDATE users SET approval_status = 'approved' 
    WHERE role = 'teacher' OR email IN ('arun@student.com','priya@student.com')
  `);
  console.log('✅ Existing users set to approved');

  // Set other existing students to approved (they were manually registered before)
  await conn.execute(`UPDATE users SET approval_status = 'approved' WHERE role = 'student'`);
  console.log('✅ All existing students set to approved');

  console.log('\n✅ Approval system migration complete!');
  console.log('New registrations will now require teacher approval.');
  await conn.end();
}

run().catch(e => { console.error('❌ Error:', e.message); process.exit(1); });
