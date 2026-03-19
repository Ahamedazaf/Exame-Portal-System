// scripts/fix-admin.js
const mysql  = require('mysql2/promise');
const bcrypt = require('bcryptjs');
const fs     = require('fs');
const path   = require('path');

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

async function fix() {
  const conn = await mysql.createConnection({
    host:     process.env.DB_HOST     || 'localhost',
    port:     Number(process.env.DB_PORT) || 3306,
    user:     process.env.DB_USER     || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME     || 'exame_portal',
  });

  // Step 1: Show current teacher info
  const [teachers] = await conn.execute('SELECT id, name, email, role FROM users WHERE role = "teacher"');
  console.log('\n📋 Current teacher accounts:');
  console.table(teachers);

  if (teachers.length === 0) {
    console.log('❌ No teacher found!');
    await conn.end();
    return;
  }

  // Step 2: Generate fresh hash
  const newPass = 'admin123';
  const hash    = bcrypt.hashSync(newPass, 10);

  // Verify hash works
  const valid = bcrypt.compareSync(newPass, hash);
  console.log('\n🔐 Hash verification:', valid ? '✅ PASS' : '❌ FAIL');

  // Step 3: Update ALL teacher accounts
  const [result] = await conn.execute(
    'UPDATE users SET password = ? WHERE role = "teacher"',
    [hash]
  );
  console.log('\n✅ Updated', result.affectedRows, 'teacher account(s)');

  // Step 4: Verify in DB
  const [updated] = await conn.execute(
    'SELECT id, name, email, password FROM users WHERE role = "teacher"'
  );
  const verify = bcrypt.compareSync(newPass, updated[0].password);
  console.log('🔐 DB password verify:', verify ? '✅ PASS' : '❌ FAIL');

  console.log('\n🔑 Login credentials:');
  updated.forEach(u => {
    console.log('   Email:   ', u.email);
    console.log('   Password: admin123');
  });
  console.log('\n🌐 URL: http://localhost:3000/login\n');

  await conn.end();
}

fix().catch(e => {
  console.error('❌ Error:', e.message);
  process.exit(1);
});
