// Статистика лояльности, пересчёт рангов и «созревание» заказов через 14 дней.
const db = require('./db');
const jc = require('./jc');
const tg = require('./telegram');
const { RANKS, computeRank } = require('./ranks');
const { rub } = require('./util');

const MATURE_DAYS = Number(process.env.MATURE_DAYS || 14);
const FRIEND_BONUS_JC = 1000; // базовый; фактическая сумма — RANKS[ранг пригласившего].friendJC
const FRIEND_BONUS_MIN = 10000;

async function stats(conn, userId) {
  const own = (await conn.query(
    `SELECT COALESCE(SUM(total),0)::float AS s, COALESCE(SUM(artifact_count),0)::int AS a
       FROM orders WHERE user_id = $1 AND status = 'paid' AND matured`,
    [userId]
  )).rows[0];
  const friends = (await conn.query(
    `SELECT u.id, COALESCE(SUM(o.total),0)::float AS s
       FROM users u LEFT JOIN orders o ON o.user_id = u.id AND o.status = 'paid' AND o.matured
      WHERE u.referred_by = $1 GROUP BY u.id`,
    [userId]
  )).rows;
  return {
    ownSum: own.s,
    ownArtifacts: own.a,
    friendSums: friends.map((f) => f.s).filter((s) => s > 0),
    invited: friends.length,
  };
}

// Пересчитать ранг; ранг не понижается. Разовые бонусы JC за новые ранги выдаются один раз.
async function recalcRank(conn, userId) {
  const u = (await conn.query('SELECT id, rank, rank_bonus_given, tg_id FROM users WHERE id = $1 FOR UPDATE', [userId])).rows[0];
  if (!u) return null;
  const st = await stats(conn, userId);
  const r = Math.max(u.rank, computeRank(st));
  let bonus = 0;
  for (let i = u.rank_bonus_given + 1; i <= r; i++) {
    if (RANKS[i].bonusJC) {
      bonus += await jc.grant(conn, userId, RANKS[i].bonusJC, 'rank_bonus', { meta: { rank: i } });
    }
  }
  await conn.query('UPDATE users SET rank = $1, rank_bonus_given = GREATEST(rank_bonus_given, $1) WHERE id = $2', [r, userId]);
  return { userId, from: u.rank, to: r, bonus, tgId: u.tg_id };
}

// Заказы, оплаченные >= 14 дней назад: зачесть, начислить +1000 JC пригласившему, пересчитать ранги.
async function matureOrders() {
  if (!db.enabled()) return;
  const due = (await db.q(
    `SELECT id FROM orders WHERE status = 'paid' AND NOT matured AND matures_at <= now() ORDER BY id LIMIT 200`
  )).rows;
  for (const { id } of due) {
    const notes = await db.tx(async (c) => {
      const o = (await c.query('SELECT * FROM orders WHERE id = $1 FOR UPDATE', [id])).rows[0];
      if (!o || o.matured || o.status !== 'paid') return [];
      await c.query('UPDATE orders SET matured = TRUE WHERE id = $1', [id]);
      const out = [];
      if (o.user_id) {
        const buyer = (await c.query('SELECT id, referred_by, ref_bonus_paid FROM users WHERE id = $1 FOR UPDATE', [o.user_id])).rows[0];
        const ch = await recalcRank(c, o.user_id);
        if (ch && ch.to > ch.from) out.push(ch);
        if (buyer && buyer.referred_by) {
          if (!buyer.ref_bonus_paid && Number(o.total) >= FRIEND_BONUS_MIN) {
            const inv = (await c.query('SELECT rank FROM users WHERE id = $1', [buyer.referred_by])).rows[0];
            const amount = (RANKS[(inv && inv.rank) || 0] || RANKS[0]).friendJC || FRIEND_BONUS_JC;
            await jc.grant(c, buyer.referred_by, amount, 'referral', { orderId: id, meta: { friend: buyer.id, rank: inv && inv.rank } });
            await c.query('UPDATE users SET ref_bonus_paid = TRUE WHERE id = $1', [buyer.id]);
            const ref = (await c.query('SELECT tg_id FROM users WHERE id = $1', [buyer.referred_by])).rows[0];
            out.push({ friendBonus: amount, tgId: ref && ref.tg_id });
          }
          const ch2 = await recalcRank(c, buyer.referred_by);
          if (ch2 && ch2.to > ch2.from) out.push(ch2);
        }
      }
      return out;
    });
    for (const n of notes) {
      if (!n.tgId) continue;
      if (n.friendBonus) {
        await tg.sendTo(n.tgId, `🎉 Твой друг сделал заказ — тебе начислено +${n.friendBonus} JC.`);
      } else {
        await tg.sendTo(n.tgId, `ᛟ Новый ранг: ${RANKS[n.to].name}! Скидка ${RANKS[n.to].pct}%` + (n.bonus ? `, бонус +${n.bonus} JC` : '') + '.');
      }
    }
  }
}

// Неоплаченные за 24 часа заказы: отменить и вернуть удержанные JC.
async function cancelStale() {
  if (!db.enabled()) return;
  const stale = (await db.q(
    `SELECT id FROM orders WHERE status = 'pending' AND created_at < now() - interval '24 hours' LIMIT 200`
  )).rows;
  for (const { id } of stale) {
    await db.tx(async (c) => {
      const o = (await c.query('SELECT * FROM orders WHERE id = $1 FOR UPDATE', [id])).rows[0];
      if (!o || o.status !== 'pending') return;
      await c.query(`UPDATE orders SET status = 'cancelled' WHERE id = $1`, [id]);
      if (o.user_id && o.jc_spent > 0) await jc.refund(c, o.user_id, o.jc_alloc, id);
    });
  }
}

function startJobs() {
  const run = () => Promise.resolve()
    .then(matureOrders).then(cancelStale)
    .catch((e) => console.error('[jobs]', e.message));
  setTimeout(run, 5000);
  return setInterval(run, 10 * 60 * 1000);
}

module.exports = { stats, recalcRank, matureOrders, cancelStale, startJobs, MATURE_DAYS, FRIEND_BONUS_JC, rub };
