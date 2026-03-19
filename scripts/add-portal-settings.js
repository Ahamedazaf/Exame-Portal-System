const mysql = require('mysql2/promise');
const fs    = require('fs');
const path  = require('path');

function loadEnv() {
  const envPath = path.join(__dirname, '..', '.env.local');
  if (!fs.existsSync(envPath)) return;
  fs.readFileSync(envPath, 'utf-8').split('\n').forEach(line => {
    const t = line.trim();
    if (!t || t.startsWith('#')) return;
    const i = t.indexOf('='); if (i === -1) return;
    const k = t.slice(0, i).trim(); const v = t.slice(i + 1).trim();
    if (!process.env[k]) process.env[k] = v;
  });
}
loadEnv();

async function run() {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'exame_portal',
  });

  // Portal settings table
  try {
    await conn.execute(`
      CREATE TABLE IF NOT EXISTS portal_settings (
        id          INT AUTO_INCREMENT PRIMARY KEY,
        setting_key VARCHAR(100) NOT NULL UNIQUE,
        value       TEXT NULL,
        updated_at  DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB
    `);
    console.log('✅ portal_settings table created');
  } catch (e) { console.log('ℹ️', e.message); }

  // Seed defaults
  await conn.execute(`
    INSERT IGNORE INTO portal_settings (setting_key, value) VALUES
    ('portal_name', 'Exame Portal'),
    ('portal_logo_text', 'EP'),
    ('portal_tagline', 'Online Examination System')
  `);
  console.log('✅ Default portal settings seeded');

  // Add name change to users - already exists as 'name' column
  // Add notification read status
  try {
    await conn.execute(`
      CREATE TABLE IF NOT EXISTS notifications (
        id         INT AUTO_INCREMENT PRIMARY KEY,
        type       ENUM('new_student','approval','system') NOT NULL DEFAULT 'new_student',
        message    TEXT NOT NULL,
        user_id    INT NULL COMMENT 'related user',
        is_read    TINYINT(1) NOT NULL DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB
    `);
    console.log('✅ notifications table created');
  } catch (e) { console.log('ℹ️', e.message); }

  console.log('\n✅ Portal settings migration complete!');
  await conn.end();
}
run().catch(e => { console.error('❌', e.message); process.exit(1); });
