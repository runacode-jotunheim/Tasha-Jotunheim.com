// Подключение к PostgreSQL и миграции. Если DATABASE_URL не задан — модуль выключен,
// и сервер работает в старом режиме (только оплата + уведомления), ничего не ломая.
const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

let pool = null;

function enabled() {
  return !!process.env.DATABASE_URL;
}

function getPool() {
  if (!pool) {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.DATABASE_SSL === '1' ? { rejectUnauthorized: false } : undefined,
      max: Number(process.env.DATABASE_POOL || 5),
    });
    pool.on('error', (err) => console.error('[db] pool error:', err.message));
  }
  return pool;
}

function q(text, params) {
  return getPool().query(text, params);
}

async function tx(fn) {
  const client = await getPool().connect();
  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    throw err;
  } finally {
    client.release();
  }
}

async function migrate() {
  const sql = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
  await q(sql);
  console.log('[db] схема проверена/обновлена');
}

module.exports = { enabled, q, tx, migrate, getPool };
