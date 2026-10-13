const crypto = require('crypto');

const DAY = 24 * 3600 * 1000;
const MSK = 3 * 3600 * 1000; // Москва без перехода на летнее время

function sha256(s) {
  return crypto.createHash('sha256').update(String(s), 'utf8').digest('hex');
}
function randomToken(bytes = 32) {
  return crypto.randomBytes(bytes).toString('base64url');
}
function randomCode6() {
  return String(crypto.randomInt(0, 1000000)).padStart(6, '0');
}
function normEmail(e) {
  const s = String(e || '').trim().toLowerCase();
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(s) && s.length <= 254 ? s : null;
}
function normPhone(p) {
  const d = String(p || '').replace(/\D/g, '');
  if (d.length === 11 && (d[0] === '7' || d[0] === '8')) return '7' + d.slice(1);
  if (d.length === 10) return '7' + d;
  return d.length >= 10 ? d : null;
}
function parseCookies(header) {
  const out = {};
  String(header || '').split(';').forEach((p) => {
    const i = p.indexOf('=');
    if (i > 0) out[p.slice(0, i).trim()] = decodeURIComponent(p.slice(i + 1).trim());
  });
  return out;
}
// Начало текущей недели (пн 00:00 МСК) и месяца (1-е 00:00 МСК), а также конец месяца — в UTC Date.
function mskBounds(now = Date.now()) {
  const m = new Date(now + MSK);
  const dow = (m.getUTCDay() + 6) % 7; // 0 = понедельник
  const weekStart = Date.UTC(m.getUTCFullYear(), m.getUTCMonth(), m.getUTCDate() - dow) - MSK;
  const monthStart = Date.UTC(m.getUTCFullYear(), m.getUTCMonth(), 1) - MSK;
  const monthEnd = Date.UTC(m.getUTCFullYear(), m.getUTCMonth() + 1, 1) - MSK;
  return { weekStart: new Date(weekStart), monthStart: new Date(monthStart), monthEnd: new Date(monthEnd) };
}
function rub(n) {
  return Math.round(Number(n)).toLocaleString('ru-RU') + ' ₽';
}
function escapeHtml(s) {
  return String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
}

module.exports = { DAY, MSK, sha256, randomToken, randomCode6, normEmail, normPhone, parseCookies, mskBounds, rub, escapeHtml };
