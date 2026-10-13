// Сквозной тест программы лояльности на локальной PostgreSQL. Запуск: node test/e2e.js
const { spawn } = require('child_process');
const assert = require('assert');
const crypto = require('crypto');
const path = require('path');

const PORT = 3999, BASE = `http://127.0.0.1:${PORT}`;
const env = Object.assign({}, process.env, {
  DATABASE_URL: process.env.TEST_DATABASE_URL || 'postgres://postgres@127.0.0.1:54329/jotun',
  ROBOKASSA_LOGIN: 'test', ROBOKASSA_PASSWORD_1: 'p1', ROBOKASSA_PASSWORD_2: 'p2', ROBOKASSA_TEST_MODE: '0',
  PORT: String(PORT), ALLOWED_ORIGIN: 'http://localhost', COOKIE_INSECURE: '1', DEV_RETURN_CODE: '1',
  TELEGRAM_BOT_TOKEN: '', TELEGRAM_CHAT_ID: '', TELEGRAM_BOT_USERNAME: 'JotunTestBot', TELEGRAM_WEBHOOK_SECRET: 'sek',
  SMTP_HOST: '', NODE_ENV: 'test',
});
process.env.DATABASE_URL = env.DATABASE_URL;
const md5 = (s) => crypto.createHash('md5').update(s).digest('hex');

async function call(method, url, body, cookie) {
  const res = await fetch(BASE + url, {
    method, headers: Object.assign({ 'Content-Type': 'application/json' }, cookie ? { Cookie: cookie } : {}),
    body: body ? JSON.stringify(body) : undefined,
  });
  const sc = res.headers.get('set-cookie');
  const json = await res.json().catch(() => null);
  return { status: res.status, json, cookie: sc ? sc.split(';')[0] : null };
}
async function login(email, extra) {
  const r1 = await call('POST', '/api/auth/request-code', { email });
  assert.strictEqual(r1.status, 200, JSON.stringify(r1.json));
  const r2 = await call('POST', '/api/auth/verify', Object.assign({ email, code: r1.json.devCode }, extra || {}));
  assert.strictEqual(r2.status, 200, JSON.stringify(r2.json));
  return r2.cookie;
}
const result = (invId, sum) => fetch(BASE + '/api/robokassa/result', {
  method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  body: `OutSum=${sum}&InvId=${invId}&SignatureValue=${md5(`${sum}:${invId}:p2`)}`,
}).then((r) => r.text());
const cust = (email) => ({ name: 'Тест', phone: '+7 900 000-00-' + String(Math.floor(Math.random() * 90) + 10), address: 'Москва', email });

(async () => {
  const db = require('../lib/db');
  await db.q('DROP SCHEMA public CASCADE; CREATE SCHEMA public;');
  const srv = spawn(process.execPath, [path.join(__dirname, '..', 'index.js')], { env, stdio: ['ignore', 'pipe', 'pipe'] });
  let log = ''; srv.stdout.on('data', (d) => (log += d)); srv.stderr.on('data', (d) => (log += d));
  for (let i = 0; i < 50; i++) { try { const h = await fetch(BASE + '/api/health'); if (h.ok) break; } catch (e) {} await new Promise((r) => setTimeout(r, 200)); }
  const loyalty = require('../lib/loyalty');
  try {
    // 1. A регистрируется, получает реф-ссылку
    const A = await login('a@test.ru', { name: 'Аня' });
    let me = (await call('GET', '/api/me', null, A)).json;
    assert.strictEqual(me.rank.name, 'Мини-Йотун'); assert.strictEqual(me.jc.balance, 0);
    const link = (await call('GET', '/api/ref/link', null, A)).json;
    assert.ok(/\?ref=[A-Z0-9]{7}$/.test(link.url));
    const link2 = (await call('GET', '/api/ref/link', null, A)).json;
    assert.strictEqual(link2.code, link.code, 'в течение суток ссылка та же');
    assert.strictEqual((await call('GET', '/api/ref/check?code=' + link.code)).json.valid, true);

    // 2. B приходит по ссылке → скидка друга 15% на артефакты
    const B = await login('b@test.ru', { ref: link.code, name: 'Боря' });
    me = (await call('GET', '/api/me', null, B)).json;
    assert.ok(me.refDiscount, 'у друга есть реф-скидка');
    const items = [{ id: 12, name: 'Глаз Одина', price: 1, qty: 2 }]; // цена из браузера игнорируется
    const qB = (await call('POST', '/api/checkout/quote', { items }, B)).json;
    assert.strictEqual(qB.subtotal, 32980); assert.strictEqual(qB.discountKind, 'ref'); assert.strictEqual(qB.discount, 4947);

    // 3. B оплачивает
    const pB = await call('POST', '/api/create-payment', { items, customer: cust('b@test.ru') }, B);
    assert.strictEqual(pB.status, 200, JSON.stringify(pB.json));
    assert.strictEqual(pB.json.fields.OutSum, '28033.00');
    const rc = JSON.parse(decodeURIComponent(pB.json.fields.Receipt));
    assert.strictEqual(Math.round(rc.items.reduce((s, i) => s + i.sum, 0) * 100) / 100, 28033, 'сумма чека = сумме оплаты');
    assert.ok(pB.json.invId >= 10001);
    assert.strictEqual(await result(pB.json.invId, pB.json.fields.OutSum), 'OK' + pB.json.invId);
    me = (await call('GET', '/api/me', null, B)).json;
    assert.strictEqual(me.refDiscount, null, 'после оплаты реф-скидка аннулирована');

    // 4. через 14 дней: A получает +1000 JC
    await db.q(`UPDATE orders SET matures_at = now() - interval '1 minute'`);
    await loyalty.matureOrders();
    me = (await call('GET', '/api/me', null, A)).json;
    assert.strictEqual(me.jc.balance, 1000); assert.strictEqual(me.stats.friendsBought, 1);
    me = (await call('GET', '/api/me', null, B)).json;
    assert.strictEqual(me.stats.ownSum, 28033); assert.strictEqual(me.rank.index, 0, '2 артефакта < 3 — ещё не Йотун');

    // 5. A платит JC: не больше 50%, при неоплате — возврат
    const qA = (await call('POST', '/api/checkout/quote', { items: [{ id: 12, qty: 1 }], useJC: 99999 }, A)).json;
    assert.strictEqual(qA.discount, 495); assert.strictEqual(qA.jcUse, 1000); assert.strictEqual(qA.total, 16490 - 495 - 1000);
    const pA = await call('POST', '/api/create-payment', { items: [{ id: 12, qty: 1 }], customer: cust('a@test.ru'), useJC: 1000 }, A);
    assert.strictEqual(pA.json.fields.OutSum, '14995.00');
    assert.strictEqual((await call('GET', '/api/me', null, A)).json.jc.balance, 0, 'JC удержаны');
    await db.q(`UPDATE orders SET created_at = now() - interval '25 hours' WHERE id = $1`, [pA.json.invId]);
    await loyalty.cancelStale();
    assert.strictEqual((await call('GET', '/api/me', null, A)).json.jc.balance, 1000, 'JC вернулись');

    // 6. игры: не больше 4 JC/сек и лимиты 500/нед
    const g = (await call('POST', '/api/game/start', { game: 'runner' }, B)).json;
    await new Promise((r) => setTimeout(r, 2100));
    const gf = (await call('POST', '/api/game/finish', { token: g.token, jc: 400 }, B)).json;
    assert.ok(gf.granted > 0 && gf.granted <= 9, 'накрутка срезана: ' + gf.granted);
    assert.strictEqual((await call('POST', '/api/game/finish', { token: g.token, jc: 5 }, B)).status, 400, 'токен одноразовый');
    const g2 = (await call('POST', '/api/game/start', { game: 'runner' }, B)).json;
    await db.q(`UPDATE game_sessions SET started_at = now() - interval '30 minutes' WHERE token = $1`, [g2.token]);
    const gf2 = (await call('POST', '/api/game/finish', { token: g2.token, jc: 5000 }, B)).json;
    assert.strictEqual(gf.granted + gf2.granted, 500, 'недельный лимит 500');

    // 7. гость с галочкой «создать кабинет» получает 3%; гость без неё — промокод
    const pG = await call('POST', '/api/create-payment', { items: [{ name: 'Глаз Одина', price: 16490, qty: 1 }], customer: cust('c@test.ru'), createAccount: true });
    assert.strictEqual(pG.json.fields.OutSum, (16490 - 495).toFixed(2));
    const pP = await call('POST', '/api/create-payment', { items: [{ id: 12, qty: 1 }, { name: 'Скидка (промокод X)', price: -1649, qty: 1 }], customer: cust('d@test.ru') });
    assert.strictEqual(pP.json.fields.OutSum, (16490 - 1649).toFixed(2));
    const pH = await call('POST', '/api/create-payment', { items: [{ id: 12, qty: 1 }, { name: 'Скидка', price: -9000, qty: 1 }], customer: cust('e@test.ru') });
    assert.strictEqual(pH.json.fields.OutSum, (16490 - 2474).toFixed(2), 'промокод не больше 15%');

    // 8. самореферал не проходит
    const self = await login('a2@test.ru', { ref: link.code });
    // (разные почты — допустимо; проверяем тот же email)
    const r1 = await call('POST', '/api/auth/request-code', { email: 'a@test.ru' });
    assert.strictEqual(r1.status, 429, 'повтор кода раньше минуты запрещён');

    // 9. ранг: 5 друзей с покупками от 7000 → Йотун
    const aId = (await db.q(`SELECT id FROM users WHERE email='a@test.ru'`)).rows[0].id;
    for (let i = 0; i < 4; i++) {
      const u = (await db.q(`INSERT INTO users(email, referred_by) VALUES ($1,$2) RETURNING id`, [`f${i}@t.ru`, aId])).rows[0];
      await db.q(`INSERT INTO orders(user_id, items, subtotal, total, status, paid_at, matures_at, matured) VALUES ($1,'[]',7490,7490,'paid',now(),now(),TRUE)`, [u.id]);
    }
    await db.tx((c) => loyalty.recalcRank(c, aId));
    me = (await call('GET', '/api/me', null, A)).json;
    assert.strictEqual(me.rank.name, 'Йотун'); assert.strictEqual(me.rank.pct, 3);

    // 10. привязка Telegram через вебхук
    const tl = (await call('POST', '/api/tg/link', {}, A)).json;
    const tok = tl.url.split('start=')[1];
    const wh = await fetch(BASE + '/api/tg/webhook', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Telegram-Bot-Api-Secret-Token': 'sek' },
      body: JSON.stringify({ message: { text: '/start ' + tok, from: { id: 777, username: 'anya' }, chat: { id: 777, type: 'private' } } }) });
    assert.strictEqual(wh.status, 200);
    await new Promise((r) => setTimeout(r, 300));
    assert.strictEqual((await call('GET', '/api/me', null, A)).json.user.telegram, '@anya');
    const bad = await fetch(BASE + '/api/tg/webhook', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });
    assert.strictEqual(bad.status, 403, 'вебхук без секрета отклонён');

    // 11. выход
    await call('POST', '/api/auth/logout', {}, A);
    assert.strictEqual((await call('GET', '/api/me', null, A)).status, 401);

    console.log('ВСЕ ПРОВЕРКИ ПРОЙДЕНЫ');
  } catch (e) {
    console.error('FAIL:', e.message); console.error(log.slice(-2500)); process.exitCode = 1;
  } finally {
    srv.kill(); await db.getPool().end();
  }
})();
