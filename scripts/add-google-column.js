// scripts/add-google-column.js
// Run this once: node scripts/add-google-column.js
// Adds google_id column to existing users table

const mysql  = require('mysql2/promise');
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

async function run() {
  const conn = await mysql.createConnection({
    host:     process.env.DB_HOST     || 'localhost',
    port:     Number(process.env.DB_PORT) || 3306,
    user:     process.env.DB_USER     || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME     || 'exame_portal',
  });

  // Add google_id column if not exists
  try {
    await conn.execute('ALTER TABLE users ADD COLUMN google_id VARCHAR(255) NULL AFTER class_id');
    console.log('✅ google_id column added to users table');
  } catch (e) {
    if (e.code === 'ER_DUP_FIELDNAME') {
      console.log('ℹ️  google_id column already exists — skipping');
    } else {
      throw e;
    }
  }

  // Add auth_provider column
  try {
    await conn.execute("ALTER TABLE users ADD COLUMN auth_provider ENUM('local','google') NOT NULL DEFAULT 'local' AFTER google_id");
    console.log('✅ auth_provider column added');
  } catch (e) {
    if (e.code === 'ER_DUP_FIELDNAME') {
      console.log('ℹ️  auth_provider column already exists — skipping');
    } else {
      throw e;
    }
  }

  console.log('✅ Database migration complete!');
  await conn.end();
}

run().catch(e => { console.error('❌ Error:', e.message); process.exit(1); });
