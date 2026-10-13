// HTTP-маршруты программы лояльности: вход по коду, кабинет, реф-ссылки, Telegram, игры, корзина.
const db = require('./db');
const jc = require('./jc');
const tg = require('./telegram');
const mailer = require('./mailer');
const loyalty = require('./loyalty');
const checkout = require('./checkout');
const { RANKS, progressTo } = require('./ranks');
const U = require('./util');

const SESSION_DAYS = 10;
const CODE_TTL_MIN = 10;
const REF_LINK_HOURS = 24;
const REF_DISCOUNT_DAYS = 7;
const GAME_WEEK_CAP = 500;
const GAME_MONTH_CAP = 2000;
const GAME_MAX_RATE = 4; // JC в секунду игры, выше — подозрение на накрутку
const SITE_URL = () => process.env.SITE_URL || 'https://tasha-jotunheim.com';
const COOKIE = 'jsid';

/* ── мелкий rate-limit по IP ── */
const hits = new Map();
function limited(key, max, windowMs) {
  const now = Date.now();
  const arr = (hits.get(key) || []).filter((t) => now - t < windowMs);
  arr.push(now); hits.set(key, arr);
  return arr.length > max;
}
setInterval(() => { const now = Date.now(); for (const [k, v] of hits) if (!v.some((t) => now - t < 3600e3)) hits.delete(k); }, 600e3).unref();

function ipOf(req) { return String(req.headers['x-forwarded-for'] || req.socket.remoteAddress || '').split(',')[0].trim(); }

/* ── сессии ── */
async function currentUser(req) {
  const tok = U.parseCookies(req.headers.cookie)[COOKIE];
  if (!tok) return null;
  const r = await db.q(
    `SELECT u.* FROM sessions s JOIN users u ON u.id = s.user_id WHERE s.token_hash = $1 AND s.expires_at > now()`,
    [U.sha256(tok)]
  );
  return r.rows[0] || null;
}
function cookieAttrs(maxAgeSec) {
  const dom = process.env.COOKIE_DOMAIN ? `; Domain=${process.env.COOKIE_DOMAIN}` : '';
  const secure = process.env.COOKIE_INSECURE === '1' ? '' : '; Secure';
  return `; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAgeSec}${dom}${secure}`;
}
async function startSession(res, userId) {
  const tok = U.randomToken();
  await db.q(`INSERT INTO sessions(token_hash, user_id, expires_at) VALUES ($1,$2, now() + interval '${SESSION_DAYS} days')`, [U.sha256(tok), userId]);
  res.setHeader('Set-Cookie', `${COOKIE}=${tok}${cookieAttrs(SESSION_DAYS * 86400)}`);
}
function requireUser(handler) {
  return async (req, res) => {
    try {
      const user = await currentUser(req);
      if (!user) return res.status(401).json({ error: 'auth_required' });
      return await handler(req, res, user);
    } catch (e) {
      console.error('[api]', req.path, e.message);
      res.status(500).json({ error: 'server_error' });
    }
  };
}
function safe(handler) {
  return async (req, res) => {
    try { await handler(req, res); } catch (e) { console.error('[api]', req.path, e.message); res.status(500).json({ error: 'server_error' }); }
  };
}

/* ── реф-коды ── */
const ALPH = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
function newRefCode() {
  let s = ''; const b = require('crypto').randomBytes(7);
  for (let i = 0; i < 7; i++) s += ALPH[b[i] % ALPH.length];
  return s;
}
async function validRef(conn, code) {
  if (!code) return null;
  const r = await conn.query(
    `SELECT l.user_id, u.email, u.phone, u.name FROM ref_links l JOIN users u ON u.id = l.user_id
      WHERE l.code = $1 AND l.expires_at > now()`,
    [String(code).toUpperCase().slice(0, 16)]
  );
  return r.rows[0] || null;
}

// Создать/найти пользователя по почте. ref применяется только к НОВОМУ пользователю и не к самому себе.
async function upsertUser(conn, { email, name, phone, ref }) {
  const ex = (await conn.query('SELECT * FROM users WHERE email = $1 FOR UPDATE', [email])).rows[0];
  if (ex) {
    if ((name && !ex.name) || (phone && !ex.phone)) {
      await conn.query('UPDATE users SET name = COALESCE(name,$2), phone = COALESCE(phone,$3) WHERE id = $1', [ex.id, name || null, phone || null]);
    }
    return { user: ex, created: false };
  }
  let referredBy = null, refUntil = null;
  const inv = await validRef(conn, ref);
  if (inv && inv.email !== email && !(phone && inv.phone && inv.phone === phone)) {
    // один человек — одна реф-скидка: телефон уже встречался у другого аккаунта → без скидки
    const dupPhone = phone ? (await conn.query('SELECT 1 FROM users WHERE phone = $1', [phone])).rowCount : 0;
    if (!dupPhone) { referredBy = inv.user_id; refUntil = new Date(Date.now() + REF_DISCOUNT_DAYS * U.DAY); }
  }
  const u = (await conn.query(
    `INSERT INTO users(email, name, phone, referred_by, ref_discount_until) VALUES ($1,$2,$3,$4,$5) RETURNING *`,
    [email, name || null, phone || null, referredBy, refUntil]
  )).rows[0];
  return { user: u, created: true };
}

async function refEligible(conn, user) {
  if (!user || !user.referred_by || user.ref_discount_used) return false;
  if (!user.ref_discount_until || new Date(user.ref_discount_until) < new Date()) return false;
  const paid = (await conn.query(`SELECT 1 FROM orders WHERE user_id = $1 AND status = 'paid' LIMIT 1`, [user.id])).rowCount;
  return paid === 0;
}

async function gameEarned(conn, userId) {
  const b = U.mskBounds();
  const r = (await conn.query(
    `SELECT COALESCE(SUM(amount) FILTER (WHERE created_at >= $2),0)::int AS week,
            COALESCE(SUM(amount),0)::int AS month
       FROM jc_ledger WHERE user_id = $1 AND reason = 'game' AND created_at >= $3`,
    [userId, b.weekStart, b.monthStart]
  )).rows[0];
  return { week: r.week, month: r.month, weekLeft: Math.max(0, GAME_WEEK_CAP - r.week), monthLeft: Math.max(0, GAME_MONTH_CAP - r.month) };
}

function mount(app) {
  /* ---------- вход по коду ---------- */
  app.post('/api/auth/request-code', safe(async (req, res) => {
    const email = U.normEmail(req.body && req.body.email);
    if (!email) return res.status(400).json({ error: 'bad_email' });
    const ip = ipOf(req);
    if (limited('ip:' + ip, 15, 600e3)) return res.status(429).json({ error: 'too_many' });
    const recent = (await db.q(
      `SELECT count(*) FILTER (WHERE created_at > now() - interval '60 seconds')::int AS m1,
              count(*) FILTER (WHERE created_at > now() - interval '1 hour')::int AS h1
         FROM auth_codes WHERE email = $1`, [email])).rows[0];
    if (recent.m1 > 0) return res.status(429).json({ error: 'wait_minute' });
    if (recent.h1 >= 6) return res.status(429).json({ error: 'too_many' });

    const code = U.randomCode6();
    await db.q(`INSERT INTO auth_codes(email, code_hash, ip, expires_at) VALUES ($1,$2,$3, now() + interval '${CODE_TTL_MIN} minutes')`,
      [email, U.sha256(code + ':' + email), ip]);
    const user = (await db.q('SELECT tg_id FROM users WHERE email = $1', [email])).rows[0];
    let sentMail = false, sentTg = false;
    try { sentMail = await mailer.sendLoginCode(email, code); } catch (e) { console.error('[mail]', e.message); }
    if (user && user.tg_id) sentTg = !!(await tg.sendTo(user.tg_id, `Код для входа на tasha-jotunheim.com: ${code}\nДействует ${CODE_TTL_MIN} минут.`));
    const dev = process.env.DEV_RETURN_CODE === '1' && process.env.NODE_ENV !== 'production';
    if (!sentMail && !sentTg && !dev) return res.status(502).json({ error: 'send_failed' });
    const out = { ok: true, mail: sentMail, telegram: sentTg };
    if (dev) out.devCode = code;
    res.json(out);
  }));

  app.post('/api/auth/verify', safe(async (req, res) => {
    const b = req.body || {};
    const email = U.normEmail(b.email);
    const code = String(b.code || '').replace(/\D/g, '');
    if (!email || code.length !== 6) return res.status(400).json({ error: 'bad_input' });
    if (limited('verify:' + ipOf(req), 30, 600e3)) return res.status(429).json({ error: 'too_many' });
    const result = await db.tx(async (c) => {
      const row = (await c.query(
        `SELECT * FROM auth_codes WHERE email = $1 AND NOT used AND expires_at > now() ORDER BY id DESC LIMIT 1 FOR UPDATE`, [email])).rows[0];
      if (!row) return { error: 'code_expired' };
      if (row.attempts >= 5) return { error: 'too_many_attempts' };
      if (row.code_hash !== U.sha256(code + ':' + email)) {
        await c.query('UPDATE auth_codes SET attempts = attempts + 1 WHERE id = $1', [row.id]);
        return { error: 'wrong_code' };
      }
      await c.query('UPDATE auth_codes SET used = TRUE WHERE id = $1', [row.id]);
      return upsertUser(c, { email, name: b.name ? String(b.name).slice(0, 80) : null, phone: U.normPhone(b.phone), ref: b.ref });
    });
    if (result.error) return res.status(400).json({ error: result.error });
    await startSession(res, result.user.id);
    res.json({ ok: true, created: result.created });
  }));

  app.post('/api/auth/logout', safe(async (req, res) => {
    const tok = U.parseCookies(req.headers.cookie)[COOKIE];
    if (tok) await db.q('DELETE FROM sessions WHERE token_hash = $1', [U.sha256(tok)]);
    res.setHeader('Set-Cookie', `${COOKIE}=${cookieAttrs(0)}`);
    res.json({ ok: true });
  }));

  /* ---------- личный кабинет ---------- */
  app.get('/api/me', requireUser(async (req, res, user) => {
    const st = await loyalty.stats(db.getPool(), user.id);
    const bal = await jc.balance(db.getPool(), user.id);
    const games = await gameEarned(db.getPool(), user.id);
    const eligible = await refEligible(db.getPool(), user);
    res.json({
      user: { email: user.email, name: user.name, phone: user.phone, telegram: user.tg_id ? (user.tg_username ? '@' + user.tg_username : true) : null },
      rank: { index: user.rank, name: RANKS[user.rank].name, pct: RANKS[user.rank].pct },
      next: progressTo(user.rank + 1, st),
      stats: { ownSum: st.ownSum, ownArtifacts: st.ownArtifacts, invited: st.invited, friendsBought: st.friendSums.length },
      jc: { balance: bal, games },
      refDiscount: eligible ? { pct: checkout.REF_PCT, until: user.ref_discount_until } : null,
      ranks: RANKS.map((r, i) => ({ index: i, name: r.name, pct: r.pct, friends: r.friends || null, own: r.own || null, bonusJC: r.bonusJC || 0 })),
    });
  }));

  /* ---------- реф-ссылка: новая раз в 24 часа ---------- */
  app.get('/api/ref/link', requireUser(async (req, res, user) => {
    let link = (await db.q(`SELECT code, expires_at FROM ref_links WHERE user_id = $1 AND expires_at > now() ORDER BY created_at DESC LIMIT 1`, [user.id])).rows[0];
    if (!link) {
      for (let i = 0; i < 5 && !link; i++) {
        const code = newRefCode();
        const r = await db.q(`INSERT INTO ref_links(code, user_id, expires_at) VALUES ($1,$2, now() + interval '${REF_LINK_HOURS} hours')
                              ON CONFLICT (code) DO NOTHING RETURNING code, expires_at`, [code, user.id]);
        link = r.rows[0];
      }
    }
    res.json({ code: link.code, url: `${SITE_URL()}/?ref=${link.code}`, expiresAt: link.expires_at });
  }));

  app.get('/api/ref/check', safe(async (req, res) => {
    const inv = await validRef(db.getPool(), req.query.code);
    if (!inv) return res.json({ valid: false });
    res.json({ valid: true, inviter: inv.name ? String(inv.name).split(' ')[0] : null, pct: checkout.REF_PCT, minArtifacts: 10000, days: REF_DISCOUNT_DAYS });
  }));

  /* ---------- привязка Telegram ---------- */
  app.post('/api/tg/link', requireUser(async (req, res, user) => {
    const bot = process.env.TELEGRAM_BOT_USERNAME;
    if (!bot) return res.status(503).json({ error: 'bot_not_configured' });
    const token = U.randomToken(12);
    await db.q(`INSERT INTO tg_link_tokens(token, user_id, expires_at) VALUES ($1,$2, now() + interval '15 minutes')`, [token, user.id]);
    res.json({ url: `https://t.me/${bot}?start=link_${token}` });
  }));

  app.post('/api/tg/webhook', safe(async (req, res) => {
    if (req.headers['x-telegram-bot-api-secret-token'] !== process.env.TELEGRAM_WEBHOOK_SECRET) return res.status(403).end();
    res.json({ ok: true }); // Telegram ждёт быстрый ответ, остальное — асинхронно
    const msg = req.body && req.body.message;
    if (!msg || !msg.from || !msg.chat || msg.chat.type !== 'private') return;
    const text = String(msg.text || '');
    const m = text.match(/^\/start\s+link_([A-Za-z0-9_-]{8,40})$/);
    if (m) {
      const out = await db.tx(async (c) => {
        const t = (await c.query(`DELETE FROM tg_link_tokens WHERE token = $1 AND expires_at > now() RETURNING user_id`, [m[1]])).rows[0];
        if (!t) return 'expired';
        const other = (await c.query('SELECT id FROM users WHERE tg_id = $1', [msg.from.id])).rows[0];
        if (other && String(other.id) !== String(t.user_id)) return 'taken';
        await c.query('UPDATE users SET tg_id = $1, tg_username = $2 WHERE id = $3', [msg.from.id, msg.from.username || null, t.user_id]);
        return 'ok';
      });
      const replies = {
        ok: '✅ Telegram привязан к кабинету на tasha-jotunheim.com. Сюда будут приходить коды входа и бонусы JC.',
        expired: 'Ссылка устарела. Нажми «Привязать Telegram» в кабинете ещё раз.',
        taken: 'Этот Telegram уже привязан к другому кабинету.',
      };
      await tg.sendTo(msg.chat.id, replies[out]);
      return;
    }
    if (/^\/start/.test(text)) {
      await tg.sendTo(msg.chat.id,
        '🎃 Йотун Игры · Самайн\n\nПогост и Маленькая Ведьма. Играй — получи промокод на скидку и JotunCoins (JC).\n\nЧтобы сюда приходили коды входа и бонусы, привяжи Telegram в личном кабинете на сайте.',
        { reply_markup: { inline_keyboard: [
          [{ text: '▶ Играть', web_app: { url: `${SITE_URL()}/samhain/` } }],
          [{ text: 'Сайт Йотунхейм', url: SITE_URL() }],
        ] } });
    }
  }));

  /* ---------- игры: JC с лимитами ---------- */
  app.post('/api/game/start', requireUser(async (req, res, user) => {
    const game = String((req.body && req.body.game) || '').slice(0, 20);
    if (game !== 'runner') return res.status(400).json({ error: 'bad_game' });
    const token = U.randomToken(16);
    await db.q('INSERT INTO game_sessions(token, user_id, game) VALUES ($1,$2,$3)', [token, user.id, game]);
    res.json({ token, limits: await gameEarned(db.getPool(), user.id) });
  }));

  app.post('/api/game/finish', requireUser(async (req, res, user) => {
    const b = req.body || {};
    const want = Math.max(0, Math.floor(Number(b.jc) || 0));
    const out = await db.tx(async (c) => {
      const s = (await c.query('SELECT * FROM game_sessions WHERE token = $1 AND user_id = $2 FOR UPDATE', [String(b.token || ''), user.id])).rows[0];
      if (!s || s.finished) return { error: 'bad_session' };
      await c.query('UPDATE game_sessions SET finished = TRUE WHERE token = $1', [s.token]);
      const secs = (Date.now() - new Date(s.started_at).getTime()) / 1000;
      if (secs > 3600) return { error: 'expired' };
      const plausible = Math.min(want, Math.floor(secs * GAME_MAX_RATE));
      await c.query('SELECT id FROM users WHERE id = $1 FOR UPDATE', [user.id]); // сериализуем начисления одного игрока
      const lim = await gameEarned(c, user.id);
      const amount = Math.min(plausible, lim.weekLeft, lim.monthLeft);
      if (amount > 0) await jc.grant(c, user.id, amount, 'game', { expiresAt: U.mskBounds().monthEnd, meta: { game: s.game, asked: want, secs: Math.round(secs) } });
      return { granted: amount, asked: want, limits: await gameEarned(c, user.id) };
    });
    if (out.error) return res.status(400).json(out);
    res.json(out);
  }));

  /* ---------- предварительный расчёт корзины ---------- */
  app.post('/api/checkout/quote', safe(async (req, res) => {
    const user = await currentUser(req);
    const b = req.body || {};
    let refOk = false, isNew = false;
    if (user) refOk = await refEligible(db.getPool(), user);
    else if (b.createAccount || b.ref) {
      isNew = true;
      refOk = !!(await validRef(db.getPool(), b.ref));
    }
    const qt = await checkout.quote(db.getPool(), b.items, user, { useJC: b.useJC, refEligible: refOk, isNewMember: isNew });
    res.json({
      member: !!user, subtotal: qt.subtotal, discount: qt.discount, discountKind: qt.discountKind,
      jcBalance: qt.jcBalance, jcMax: qt.jcMax, jcUse: qt.jcUse, total: qt.total,
    });
  }));
}

// Создание заказа в режиме с базой (вызывается из /api/create-payment).
async function createOrder(req, body) {
  const user = await currentUser(req);
  const cust = body.customer || {};
  const email = U.normEmail(cust.email);
  const phone = U.normPhone(cust.phone);
  return db.tx(async (c) => {
    let buyer = user, isNew = false, refOk = false;
    if (buyer) {
      buyer = (await c.query('SELECT * FROM users WHERE id = $1 FOR UPDATE', [buyer.id])).rows[0];
      refOk = await refEligible(c, buyer);
    } else if (email && (body.createAccount || body.ref)) {
      const up = await upsertUser(c, { email, name: cust.name, phone, ref: body.ref });
      if (up.created) { buyer = up.user; isNew = true; refOk = !!up.user.referred_by; }
    }
    // Скидки участника — только залогиненному или только что созданному в этом заказе кабинету.
    const qt = await checkout.quote(c, body.items, user ? buyer : null, {
      useJC: user ? body.useJC : 0, refEligible: refOk, isNewMember: isNew,
    });
    if (qt.lines.length === 0 || qt.total <= 0) { const e = new Error('empty'); e.code = 'empty'; throw e; }
    const ownerId = buyer ? buyer.id : (email ? ((await c.query('SELECT id FROM users WHERE email = $1', [email])).rows[0] || {}).id || null : null);
    const ord = (await c.query(
      `INSERT INTO orders(user_id, email, phone, name, address, items, subtotal, discount, discount_kind, jc_spent, total, artifact_count)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,0,$10,$11) RETURNING id`,
      [ownerId, email, phone, cust.name || null, cust.address || null, JSON.stringify(qt.lines), qt.subtotal, qt.discount, qt.discountKind, qt.total + qt.jcUse, qt.artifactCount]
    )).rows[0];
    let jcSpent = 0;
    if (user && qt.jcUse > 0) {
      const sp = await jc.spend(c, buyer.id, qt.jcUse, ord.id);
      jcSpent = sp.spent;
      await c.query('UPDATE orders SET jc_spent = $1::int, jc_alloc = $2, total = total - $1::int WHERE id = $3', [jcSpent, JSON.stringify(sp.alloc), ord.id]);
    }
    qt.total = qt.subtotal - qt.discount - jcSpent;
    qt.jcUse = jcSpent;
    return { invId: Number(ord.id), quote: qt, buyer, isNew };
  });
}

// Подтверждение оплаты: заказ → paid, через 14 дней будет зачтён в лояльность.
async function markPaid(invId) {
  return db.tx(async (c) => {
    const o = (await c.query('SELECT * FROM orders WHERE id = $1 FOR UPDATE', [invId])).rows[0];
    if (!o) return null;
    if (o.status === 'paid') return o;
    await c.query(`UPDATE orders SET status = 'paid', paid_at = now(), matures_at = now() + ($2 || ' days')::interval WHERE id = $1`,
      [invId, String(loyalty.MATURE_DAYS)]);
    if (o.user_id) await c.query('UPDATE users SET ref_discount_used = TRUE WHERE id = $1 AND referred_by IS NOT NULL', [o.user_id]);
    return Object.assign(o, { status: 'paid' });
  });
}

module.exports = { mount, createOrder, markPaid, currentUser };
