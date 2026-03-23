import mysql from 'mysql2/promise';

let pool;

export function getPool() {
  if (!pool) {
    pool = mysql.createPool(process.env.DATABASE_URL);
  }
  return pool;
}

export async function query(sql, params = []) {
  const db = getPool();
  try {
    const [rows] = await db.execute(sql, params);
    return rows;
  } catch (e) {
    console.error('[DB Query Error]', e.message);
    throw e;
  }
}

export async function queryOne(sql, params = []) {
  const rows = await query(sql, params);
  return rows[0] || null;
}