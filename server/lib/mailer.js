// Отправка писем через SMTP (сейчас — обычный ящик Mail.ru с паролем приложения).
// Переезд на Unisender Go / почту на домене = смена SMTP_* в настройках, код не меняется.
const nodemailer = require('nodemailer');
const { escapeHtml } = require('./util');

let transport = null;

function configured() {
  return !!(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);
}

function getTransport() {
  if (!transport) {
    const port = Number(process.env.SMTP_PORT || 465);
    transport = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port,
      secure: port === 465,
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    });
  }
  return transport;
}

async function sendMail(to, subject, text, html) {
  if (!configured()) {
    console.warn(`[mail] SMTP не настроен — письмо «${subject}» для ${to} не отправлено`);
    return false;
  }
  const fromName = process.env.MAIL_FROM_NAME || 'Артефакты Йотунхейм';
  await getTransport().sendMail({
    from: `"${fromName}" <${process.env.SMTP_USER}>`,
    replyTo: process.env.MAIL_REPLY_TO || undefined,
    to, subject, text, html,
  });
  return true;
}

function sendLoginCode(to, code) {
  const text = `Ваш код для входа: ${code}\n\nКод действует 10 минут. Если вы не запрашивали код — просто проигнорируйте письмо.\n\nАртефакты Йотунхейм · tasha-jotunheim.com`;
  const html =
    `<div style="font-family:Arial,sans-serif;background:#000;color:#c8ffda;padding:28px;border-radius:12px;max-width:460px">` +
    `<div style="font-size:13px;letter-spacing:3px;color:#00ff41;text-transform:uppercase">Артефакты Йотунхейм</div>` +
    `<div style="margin:18px 0 6px;font-size:15px">Ваш код для входа:</div>` +
    `<div style="font-size:34px;letter-spacing:8px;font-weight:700;color:#ffb35c">${escapeHtml(code)}</div>` +
    `<div style="margin-top:16px;font-size:12px;color:#8fbf9f">Код действует 10 минут. Если вы не запрашивали код — просто проигнорируйте письмо.</div>` +
    `</div>`;
  return sendMail(to, `Код для входа: ${code}`, text, html);
}

module.exports = { configured, sendMail, sendLoginCode };
