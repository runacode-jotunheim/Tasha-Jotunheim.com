// JotunCoins: начисления партиями со сроком сгорания, списание FIFO (сначала то, что сгорит раньше).
const { DAY } = require('./util');

const YEAR_MS = 365 * DAY;

async function balance(db, userId) {
  const r = await db.query(
    `SELECT COALESCE(SUM(remaining),0)::int AS b FROM jc_ledger
      WHERE user_id = $1 AND amount > 0 AND remaining > 0 AND (expires_at IS NULL OR expires_at > now())`,
    [userId]
  );
  return r.rows[0].b;
}

async function grant(db, userId, amount, reason, opts = {}) {
  amount = Math.floor(amount);
  if (amount <= 0) return 0;
  const expires = opts.expiresAt || new Date(Date.now() + YEAR_MS);
  await db.query(
    `INSERT INTO jc_ledger(user_id, amount, remaining, reason, order_id, meta, expires_at)
     VALUES ($1,$2,$2,$3,$4,$5,$6)`,
    [userId, amount, reason, opts.orderId || null, opts.meta ? JSON.stringify(opts.meta) : null, expires]
  );
  return amount;
}

// Списывает до `amount` JC, возвращает [{id, take}] — распределение по партиям (для возврата).
async function spend(db, userId, amount, orderId) {
  amount = Math.floor(amount);
  if (amount <= 0) return { spent: 0, alloc: [] };
  const rows = (await db.query(
    `SELECT id, remaining FROM jc_ledger
      WHERE user_id = $1 AND amount > 0 AND remaining > 0 AND (expires_at IS NULL OR expires_at > now())
      ORDER BY expires_at NULLS LAST, id FOR UPDATE`,
    [userId]
  )).rows;
  let left = amount;
  const alloc = [];
  for (const r of rows) {
    if (left <= 0) break;
    const take = Math.min(left, r.remaining);
    await db.query('UPDATE jc_ledger SET remaining = remaining - $1 WHERE id = $2', [take, r.id]);
    alloc.push({ id: r.id, take });
    left -= take;
  }
  const spent = amount - left;
  if (spent > 0) {
    await db.query(
      `INSERT INTO jc_ledger(user_id, amount, remaining, reason, order_id) VALUES ($1,$2,0,'order_spend',$3)`,
      [userId, -spent, orderId || null]
    );
  }
  return { spent, alloc };
}

// Возврат списанного (заказ не оплачен) — в те же партии, срок сгорания сохраняется.
async function refund(db, userId, alloc, orderId) {
  let total = 0;
  for (const a of alloc || []) {
    await db.query('UPDATE jc_ledger SET remaining = remaining + $1 WHERE id = $2 AND user_id = $3', [a.take, a.id, userId]);
    total += a.take;
  }
  if (total > 0) {
    await db.query(
      `INSERT INTO jc_ledger(user_id, amount, remaining, reason, order_id) VALUES ($1,$2,0,'order_refund',$3)`,
      [userId, total, orderId || null]
    );
  }
  return total;
}

module.exports = { balance, grant, spend, refund, YEAR_MS };
