// Без DATABASE_URL сервер обязан вести себя как раньше: оплата + уведомления.
const { spawn } = require('child_process');
const assert = require('assert');
const crypto = require('crypto');
const path = require('path');
const PORT = 3998, BASE = `http://127.0.0.1:${PORT}`;
const env = Object.assign({}, process.env, { DATABASE_URL: '', ROBOKASSA_LOGIN: 'test', ROBOKASSA_PASSWORD_1: 'p1', ROBOKASSA_PASSWORD_2: 'p2',
  ROBOKASSA_TEST_MODE: '0', PORT: String(PORT), ALLOWED_ORIGIN: 'https://tasha-jotunheim.com', TELEGRAM_BOT_TOKEN: '' });
(async () => {
  const srv = spawn(process.execPath, [path.join(__dirname, '..', 'index.js')], { env, stdio: ['ignore', 'pipe', 'pipe'] });
  let log = ''; srv.stdout.on('data', (d) => (log += d)); srv.stderr.on('data', (d) => (log += d));
  for (let i = 0; i < 50; i++) { try { if ((await fetch(BASE + '/api/health')).ok) break; } catch (e) {} await new Promise((r) => setTimeout(r, 200)); }
  try {
    const h = await (await fetch(BASE + '/api/health')).json();
    assert.strictEqual(h.db, false);
    const r = await fetch(BASE + '/api/create-payment', { method: 'POST', headers: { 'Content-Type': 'application/json', Origin: 'https://tasha-jotunheim.com' },
      body: JSON.stringify({ items: [{ name: 'Глаз Одина', price: 16490, qty: 1 }, { name: 'Скидка', price: -500, qty: 1 }], customer: { name: 'Т', phone: '1', address: 'М' } }) });
    const j = await r.json();
    assert.strictEqual(r.status, 200); assert.strictEqual(j.fields.OutSum, '15990.00');
    assert.strictEqual(r.headers.get('access-control-allow-origin'), 'https://tasha-jotunheim.com');
    const sig = crypto.createHash('md5').update(`15990.00:${j.invId}:p2`).digest('hex');
    const t = await (await fetch(BASE + '/api/robokassa/result', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: `OutSum=15990.00&InvId=${j.invId}&SignatureValue=${sig}` })).text();
    assert.strictEqual(t, 'OK' + j.invId);
    assert.strictEqual((await fetch(BASE + '/api/me')).status, 404, 'маршрутов кабинета без базы нет');
    console.log('LEGACY OK');
  } catch (e) { console.error('FAIL', e.message, log); process.exitCode = 1; } finally { srv.kill(); }
})();
