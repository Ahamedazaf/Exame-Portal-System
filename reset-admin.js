// reset-admin.js
const mysql  = require('mysql2/promise');
const bcrypt = require('bcryptjs');
const fs     = require('fs');
const path   = require('path');

// Load .env.local
const envPath = path.join(__dirname, '.env.local');
if (fs.existsSync(envPath)) {
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

async function reset() {
  const conn = await mysql.createConnection({
    host:     process.env.DB_HOST     || 'localhost',
    port:     Number(process.env.DB_PORT) || 3306,
    user:     process.env.DB_USER     || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME     || 'exame_portal',
  });

  const newPassword = 'admin123';
  const hash = bcrypt.hashSync(newPassword, 10);

  const [result] = await conn.execute(
    'UPDATE users SET password = ?, email = ? WHERE role = ?',
    [hash, 'admin@gmail.com', 'teacher']
  );

  if (result.affectedRows > 0) {
    console.log('');
    console.log('✅ Admin password reset successfully!');
    console.log('');
    console.log('🔑 Login with:');
    console.log('   Email:    admin@gmail.com');
    console.log('   Password: admin123');
    console.log('');
    console.log('🚀 Go to: http://localhost:3000/login');
  } else {
    console.log('❌ No teacher found in database!');
  }

  await conn.end();
}

reset().catch(e => { console.error('❌ Error:', e.message); process.exit(1); });
