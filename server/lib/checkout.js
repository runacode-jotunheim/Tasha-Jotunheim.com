// Расчёт заказа на сервере: цены — только из серверного каталога, скидки — по правилам программы.
const path = require('path');
const fs = require('fs');
const jc = require('./jc');
const { RANKS } = require('./ranks');

const CATALOG = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'catalog.json'), 'utf8'));
const BY_NAME = {};
for (const [id, p] of Object.entries(CATALOG)) BY_NAME[p.name.trim().toLowerCase()] = id;

const REF_PCT = 15;           // скидка друга на артефакты в первом заказе
const REF_MIN_ARTIFACTS = 10000;
const JC_MAX_SHARE = 0.5;     // JC оплачивают не больше 50% заказа
const PROMO_MAX_SHARE = 0.15; // промокод из игры (только для гостей), страховочный потолок

// items: [{id?, name, price, qty}] от фронтенда. Возвращает позиции по серверным ценам.
function resolveItems(items, strict) {
  const lines = [];
  let promo = 0;
  const unknown = [];
  for (const it of items || []) {
    const qty = Math.max(1, Math.min(99, Math.floor(Number(it.qty || 1))));
    const id = it.id != null ? String(it.id) : BY_NAME[String(it.name || '').trim().toLowerCase()];
    if (id && CATALOG[id]) {
      const p = CATALOG[id];
      lines.push({ id, name: p.name, price: p.price, qty, kind: p.kind });
      continue;
    }
    const price = Number(it.price);
    if (Number.isFinite(price) && price < 0) { promo += -price * (Number(it.qty) || 1); continue; }
    unknown.push(it);
    if (!strict && Number.isFinite(price) && price > 0) {
      lines.push({ id: null, name: String(it.name || 'Товар').slice(0, 128), price, qty, kind: 'unknown' });
    }
  }
  return { lines, promo, unknown };
}

// user: строка users или null; opts: { useJC, refEligible, isNewMember }
async function quote(conn, items, user, opts = {}) {
  const strict = process.env.STRICT_PRICES === '1';
  const { lines, promo, unknown } = resolveItems(items, strict);
  if (strict && unknown.length) {
    const e = new Error('unknown_items'); e.unknown = unknown; throw e;
  }
  const subtotal = lines.reduce((s, l) => s + l.price * l.qty, 0);
  const artifactSubtotal = lines.filter((l) => l.kind === 'artifact').reduce((s, l) => s + l.price * l.qty, 0);
  const artifactCount = lines.filter((l) => l.kind === 'artifact').reduce((s, l) => s + l.qty, 0);

  let discount = 0, kind = null;
  if (user || opts.isNewMember) {
    const pct = RANKS[user ? user.rank : 0].pct;
    const rankDisc = Math.round(subtotal * pct / 100);
    let refDisc = 0;
    if (opts.refEligible && artifactSubtotal >= REF_MIN_ARTIFACTS) refDisc = Math.round(artifactSubtotal * REF_PCT / 100);
    if (refDisc > rankDisc) { discount = refDisc; kind = 'ref'; }
    else if (rankDisc > 0) { discount = rankDisc; kind = 'rank'; }
  } else if (promo > 0) {
    discount = Math.min(Math.round(promo), Math.round(subtotal * PROMO_MAX_SHARE));
    kind = 'promo';
  }
  const afterDiscount = Math.max(0, subtotal - discount);

  let jcBalance = 0, jcUse = 0;
  if (user) {
    jcBalance = await jc.balance(conn, user.id);
    const jcMax = Math.floor(afterDiscount * JC_MAX_SHARE);
    jcUse = Math.max(0, Math.min(Math.floor(Number(opts.useJC) || 0), jcBalance, jcMax));
  }
  const total = afterDiscount - jcUse;
  return { lines, subtotal, discount, discountKind: kind, jcBalance, jcUse, jcMax: Math.floor(afterDiscount * JC_MAX_SHARE), total, artifactCount, unknown };
}

// Чек 54-ФЗ: скидки распределяются пропорционально по позициям, сумма чека = OutSum.
function receiptItems(q) {
  if (q.subtotal <= 0) return [];
  const factor = q.total / q.subtotal;
  const items = q.lines.map((l) => ({
    name: String(l.name).slice(0, 128),
    quantity: l.qty,
    sum: Math.round(l.price * l.qty * factor * 100) / 100,
    payment_method: 'full_payment',
    payment_object: 'commodity',
    tax: 'none',
  }));
  const diff = Math.round((q.total - items.reduce((s, i) => s + i.sum, 0)) * 100) / 100;
  if (items.length && diff !== 0) items[items.length - 1].sum = Math.round((items[items.length - 1].sum + diff) * 100) / 100;
  return items;
}

module.exports = { CATALOG, resolveItems, quote, receiptItems, REF_PCT, JC_MAX_SHARE };
