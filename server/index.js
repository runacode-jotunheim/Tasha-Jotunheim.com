// Минимальный backend для tasha-jotunheim.com: создаёт ссылку на оплату через
// Робокассу и принимает от неё подтверждение оплаты (ResultURL).
//
// Деплой: Timeweb Cloud (Node.js), см. README.md рядом с этим файлом.
// Секреты (пароли Робокассы, токен телеграм-бота) — только в .env на сервере,
// никогда не коммитятся в репозиторий.

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const crypto = require('crypto');

const {
  ROBOKASSA_LOGIN,
  ROBOKASSA_PASSWORD_1,
  ROBOKASSA_PASSWORD_2,
  ROBOKASSA_TEST_PASSWORD_1,
  ROBOKASSA_TEST_PASSWORD_2,
  ROBOKASSA_TEST_MODE,
  ROBOKASSA_TAX_SYSTEM,
  PORT,
  ALLOWED_ORIGIN,
  TELEGRAM_BOT_TOKEN,
  TELEGRAM_CHAT_ID,
} = process.env;

for (const [key, val] of Object.entries({ ROBOKASSA_LOGIN, ROBOKASSA_PASSWORD_1, ROBOKASSA_PASSWORD_2 })) {
  if (!val) {
    console.error(`[FATAL] Не задана переменная окружения ${key} — проверьте .env`);
    process.exit(1);
  }
}

const isTest = ROBOKASSA_TEST_MODE === '1';

if (isTest && (!ROBOKASSA_TEST_PASSWORD_1 || !ROBOKASSA_TEST_PASSWORD_2)) {
  console.error('[FATAL] ROBOKASSA_TEST_MODE=1, но не заданы ROBOKASSA_TEST_PASSWORD_1 / ROBOKASSA_TEST_PASSWORD_2 — тестовые платежи будут падать с ошибкой 29');
  process.exit(1);
}

const activePassword1 = (isTest ? ROBOKASSA_TEST_PASSWORD_1 : ROBOKASSA_PASSWORD_1).trim();
const activePassword2 = (isTest ? ROBOKASSA_TEST_PASSWORD_2 : ROBOKASSA_PASSWORD_2).trim();

const app = express();
app.use(cors({ origin: ALLOWED_ORIGIN || '*' }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

function md5(str) {
  return crypto.createHash('md5').update(str, 'utf8').digest('hex');
}

function generateInvId() {
  return Math.floor(Date.now() / 1000);
}

/**
 * POST /api/create-payment
 * body: { items: [{name, price, qty}], customer: {name, phone, email, address}, comment? }
 * -> { action, fields, invId, sum }
 */
app.post('/api/create-payment', async (req, res) => {
  try {
    const { items, customer } = req.body || {};

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'Корзина пуста' });
    }
    if (!customer || !customer.name || !customer.phone || !customer.address) {
      return res.status(400).json({ error: 'Не заполнены обязательные поля покупателя (имя, телефон, адрес)' });
    }

    let outSum = 0;
    const receiptItems = [];

    for (const it of items) {
      const price = Number(it.price);
      const qty = Number(it.qty || 1);

      if (!it.name || !Number.isFinite(price) || price === 0) {
        throw new Error(`Некорректный товар в корзине: ${JSON.stringify(it)}`);
      }

      outSum += price * qty;

      // Скидки (отрицательная цена) — учитываются в итоговой сумме,
      // но НЕ добавляются в фискальный чек: Робокасса не принимает
      // позиции с price <= 0 и возвращает ошибку.
      if (price > 0) {
        receiptItems.push({
          name: String(it.name).slice(0, 128),
          quantity: qty,
          sum: Number((price * qty).toFixed(2)),
          payment_method: 'full_payment',
          payment_object: 'commodity',
          tax: 'none',
        });
      }
    }

    outSum = Number(outSum.toFixed(2));
    const outSumStr = outSum.toFixed(2);

    const invId = generateInvId();
    const description = `Заказ №${invId} — Артефакты Йотунхейм`;

    const receipt = {
      sno: ROBOKASSA_TAX_SYSTEM || 'usn_income',
      items: receiptItems,
    };
    const receiptJson = JSON.stringify(receipt);
    const receiptEncodedOnce = encodeURIComponent(receiptJson);

    const signatureBase = `${ROBOKASSA_LOGIN}:${outSumStr}:${invId}:${receiptEncodedOnce}:${activePassword1}`;
    const signature = md5(signatureBase);

    const robokassaFields = {
      MerchantLogin: ROBOKASSA_LOGIN,
      OutSum: outSumStr,
      InvId: String(invId),
      Description: description,
      SignatureValue: signature,
      Receipt: receiptEncodedOnce,
      Culture: 'ru',
      Email: customer.email || '',
    };
    if (isTest) robokassaFields.IsTest = '1';

    const signatureBaseRedacted = signatureBase.replace(activePassword1, '***');
    console.log('[create-payment] DEBUG', JSON.stringify({
      MerchantLogin: ROBOKASSA_LOGIN,
      OutSum: outSumStr,
      InvId: invId,
      IsTest: isTest ? 1 : 0,
      hashAlgo: 'md5',
      receiptSno: receipt.sno,
      receiptItemsCount: receiptItems.length,
      signatureBaseRedacted,
      signature,
      activePassword1Length: activePassword1.length,
    }));

    await notifyTelegram(
      `🛒 Новый заказ №${invId} оформляется (ожидает оплаты)\n` +
      `Сумма: ${outSum} ₽\n` +
      `Покупатель: ${customer.name}, ${customer.phone}${customer.email ? ', ' + customer.email : ''}\n` +
      `Адрес: ${customer.address}\n` +
      `Товары:\n` + items.map(it => `— ${it.name} × ${it.qty || 1} = ${it.price * (it.qty || 1)} ₽`).join('\n')
    );

    res.json({
      action: 'https://auth.robokassa.ru/Merchant/Index.aspx',
      fields: robokassaFields,
      invId,
      sum: outSum,
    });
  } catch (err) {
    console.error('[create-payment] error:', err.message);
    res.status(500).json({ error: 'Не удалось создать платёж' });
  }
});

/**
 * ResultURL — Робокасса стучится сюда сама (server-to-server) после реальной оплаты.
 */
app.post('/api/robokassa/result', async (req, res) => {
  const { OutSum, InvId, SignatureValue } = req.body || {};

  if (!OutSum || !InvId || !SignatureValue) {
    console.warn('[robokassa/result] Неполные данные:', req.body);
    return res.status(400).send('bad request');
  }

  const expected = md5(`${OutSum}:${InvId}:${activePassword2}`).toLowerCase();
  const received = String(SignatureValue).toLowerCase();

  if (expected !== received) {
    console.warn(`[robokassa/result] Неверная подпись для InvId=${InvId}. Возможна подделка запроса.`);
    return res.status(400).send('bad signature');
  }

  console.log(`[robokassa/result] Оплачен заказ InvId=${InvId} на сумму ${OutSum} ₽`);

  await notifyTelegram(`✅ Заказ №${InvId} ОПЛАЧЕН — ${OutSum} ₽. Можно приступать к изготовлению/отправке.`);

  res.send(`OK${InvId}`);
});

async function notifyTelegram(text) {
  if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) return;
  const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
  const MAX_ATTEMPTS = 3;

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 8000);
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: TELEGRAM_CHAT_ID, text }),
        signal: controller.signal,
      });
      clearTimeout(timeout);
      if (!res.ok) {
        const body = await res.text().catch(() => '');
        throw new Error(`Telegram API вернул ${res.status}: ${body.slice(0, 200)}`);
      }
      if (attempt > 1) {
        console.log(`[telegram] Отправлено со ${attempt}-й попытки`);
      }
      return;
    } catch (err) {
      const detail = err.cause ? `${err.message} — cause: ${err.cause.code || err.cause.message || err.cause}` : err.message;
      console.error(`[telegram] Попытка ${attempt}/${MAX_ATTEMPTS} не удалась:`, detail);
      if (attempt < MAX_ATTEMPTS) {
        await new Promise((r) => setTimeout(r, attempt * 800));
      } else {
        console.error('[telegram] Все попытки исчерпаны, уведомление не доставлено:', text.slice(0, 80));
      }
    }
  }
}

app.get('/api/health', (req, res) => res.json({ ok: true, test_mode: isTest }));

const port = PORT || 3000;
app.listen(port, () => {
  console.log(`Сервер запущен на порту ${port}. Тестовый режим Робокассы: ${isTest ? 'ДА' : 'нет (боевой)'}`);
});
