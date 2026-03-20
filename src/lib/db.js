// src/lib/db.js
import mysql from 'mysql2/promise';

let pool;

export function getPool() {
  if (!pool) {
    pool = mysql.createPool({
      host:              process.env.DB_HOST     || 'localhost',
      port:              Number(process.env.DB_PORT) || 3306,
      user:              process.env.DB_USER     || 'root',
      password:          process.env.DB_PASSWORD || '',
      database:          process.env.DB_NAME     || 'exame_portal',
      waitForConnections: true,
      connectionLimit:   10,
      queueLimit:        0,
      charset:           'utf8mb4',
      timezone:          '+00:00',
    });
  }
  return pool;
}


export async function query(sql, params = []) {
  const db = getPool();
  try {
    const [rows] = await db.execute(sql, params);
    return rows;
  } catch (e) {
    console.error('[DB Query Error]', e.message, '\nSQL:', sql.substring(0, 100));
    throw e;
  }
}

export async function queryOne(sql, params = []) {
  const rows = await query(sql, params);
  return rows[0] || null;
}
