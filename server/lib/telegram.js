// Telegram: два бота.
// TELEGRAM_BOT_TOKEN — служебный бот (уведомления о заказах в чат Таши).
// TELEGRAM_CLIENT_BOT_TOKEN — клиентский бот @Jotunheimgame_bot (коды входа, бонусы, привязка /start link_<токен>).
// Если клиентский не задан — всё идёт через служебный, как раньше.

function clientToken() {
  return process.env.TELEGRAM_CLIENT_BOT_TOKEN || process.env.TELEGRAM_BOT_TOKEN;
}

async function api(method, payload, token) {
  token = token || clientToken();
  if (!token) return null;
  const MAX = 3;
  for (let attempt = 1; attempt <= MAX; attempt++) {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 8000);
      const res = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });
      clearTimeout(timer);
      const body = await res.json().catch(() => ({}));
      if (!res.ok || body.ok === false) throw new Error(`${res.status} ${body.description || ''}`);
      return body.result;
    } catch (err) {
      console.error(`[telegram] ${method} попытка ${attempt}/${MAX}:`, err.message);
      if (attempt < MAX) await new Promise((r) => setTimeout(r, attempt * 800));
    }
  }
  return null;
}

function sendTo(chatId, text, extra) {
  if (!chatId) return Promise.resolve(null);
  return api('sendMessage', Object.assign({ chat_id: chatId, text }, extra || {}));
}

// Служебный чат Таши (как раньше).
function notifyAdmin(text) {
  const chat = process.env.TELEGRAM_CHAT_ID;
  if (!chat || !process.env.TELEGRAM_BOT_TOKEN) return Promise.resolve(null);
  return api('sendMessage', { chat_id: chat, text }, process.env.TELEGRAM_BOT_TOKEN);
}

async function setupWebhook() {
  const url = process.env.TELEGRAM_WEBHOOK_URL;
  const secret = process.env.TELEGRAM_WEBHOOK_SECRET;
  if (!url || !secret || !clientToken()) return;
  const r = await api('setWebhook', { url, secret_token: secret, allowed_updates: ['message'] });
  if (r) console.log('[telegram] вебхук установлен:', url);
}

module.exports = { api, sendTo, notifyAdmin, setupWebhook };
