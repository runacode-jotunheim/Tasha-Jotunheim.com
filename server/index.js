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

// ⚠ У Робокассы отдельная пара паролей для тестового режима (IsTest=1) —
// использование боевых паролей вместе с IsTest=1 даёт ошибку 29 "Оплата счетов недоступна".
// Тестовые пароли смотреть в ЛК Робокассы → карточка магазина → Технические настройки
// (там же, где боевые Password1/Password2, обычно отдельным блоком/вкладкой "Тестовый режим").
if (isTest && (!ROBOKASSA_TEST_PASSWORD_1 || !ROBOKASSA_TEST_PASSWORD_2)) {
  console.error('[FATAL] ROBOKASSA_TEST_MODE=1, но не заданы ROBOKASSA_TEST_PASSWORD_1 / ROBOKASSA_TEST_PASSWORD_2 — тестовые платежи будут падать с ошибкой 29');
  process.exit(1);
}

const activePassword1 = isTest ? ROBOKASSA_TEST_PASSWORD_1 : ROBOKASSA_PASSWORD_1;
const activePassword2 = isTest ? ROBOKASSA_TEST_PASSWORD_2 : ROBOKASSA_PASSWORD_2;

const app = express();
app.use(cors({ origin: ALLOWED_ORIGIN || '*' }));
app.use(express.json());
app.use(express.urlencoded({ extended: true })); // Робокасса шлёт ResultURL как form-urlencoded

function md5(str) {
  return crypto.createHash('md5').update(str, 'utf8').digest('hex');
}

// ⚠ Временная генерация номера заказа по секундам unix-времени.
// Годится для старта без БД, но два заказа в одну секунду дадут коллизию.
// Как появится реальная таблица заказов — заменить на autoincrement из неё.
function generateInvId() {
  return Math.floor(Date.now() / 1000);
}

/**
 * POST /api/create-payment
 * body: { items: [{name, price, qty}], customer: {name, phone, email, address}, comment? }
 * -> { paymentUrl, invId, sum }
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

    // Сумма считается на сервере из цен, присланных фронтендом.
    // ⚠ Для полной защиты от подмены цены на будущее стоит валидировать
    // items[].price по каталогу товаров на сервере, а не доверять фронтенду.
    let outSum = 0;
    const receiptItems = items.map((it) => {
      const price = Number(it.price);
      const qty = Number(it.qty || 1);
      if (!it.name || !Number.isFinite(price) || price <= 0) {
        throw new Error(`Некорректный товар в корзине: ${JSON.stringify(it)}`);
      }
      outSum += price * qty;
      return {
        name: String(it.name).slice(0, 128),
        quantity: qty,
        sum: Number((price * qty).toFixed(2)),
        payment_method: 'full_payment',
        payment_object: 'commodity',
        tax: 'none', // УСН доходы 6% — как правило, чек "без НДС"
      };
    });
    outSum = Number(outSum.toFixed(2));

    const invId = generateInvId();
    const description = `Заказ №${invId} — Артефакты Йотунхейм`;

    const receipt = {
      sno: ROBOKASSA_TAX_SYSTEM || 'usn_income',
      items: receiptItems,
    };
    const receiptJson = JSON.stringify(receipt);
    const receiptEncoded = encodeURIComponent(receiptJson);

    // Формула подписи с чеком: MerchantLogin:OutSum:InvId:Receipt:Password1
    // (Password1 — активный, тестовый или боевой, в зависимости от ROBOKASSA_TEST_MODE)
    const signatureBase = `${ROBOKASSA_LOGIN}:${outSum}:${invId}:${receiptJson}:${activePassword1}`;
    const signature = md5(signatureBase);

    const params = new URLSearchParams({
      MerchantLogin: ROBOKASSA_LOGIN,
      OutSum: String(outSum),
      InvId: String(invId),
      Description: description,
      SignatureValue: signature,
      Receipt: receiptEncoded,
      Culture: 'ru',
      Email: customer.email || '',
    });
    if (isTest) params.set('IsTest', '1');

    const paymentUrl = `https://auth.robokassa.ru/Merchant/Index.aspx?${params.toString()}`;

    // Диагностический лог — без пароля, только то, что реально ушло в запрос.
    // Смотреть во вкладке "Логи приложения" в Timeweb после неудачной попытки оплаты.
    console.log('[create-payment] DEBUG', JSON.stringify({
      MerchantLogin: ROBOKASSA_LOGIN,
      OutSum: outSum,
      InvId: invId,
      IsTest: isTest ? 1 : 0,
      hashAlgo: 'md5',
      receiptSno: receipt.sno,
      receiptItemsCount: receiptItems.length,
      signatureBaseLength: signatureBase.length,
      paymentUrl,
    }));

    // Пока нет БД заказов — сразу шлём заявку в телеграм, чтобы Таша видела
    // намерение купить ДО фактической оплаты (сумма подтверждается отдельно в ResultURL).
    await notifyTelegram(
      `🛒 Новый заказ №${invId} оформляется (ожидает оплаты)\n` +
      `Сумма: ${outSum} ₽\n` +
      `Покупатель: ${customer.name}, ${customer.phone}${customer.email ? ', ' + customer.email : ''}\n` +
      `Адрес: ${customer.address}\n` +
      `Товары:\n` + items.map(it => `— ${it.name} × ${it.qty || 1} = ${it.price * (it.qty || 1)} ₽`).join('\n')
    );

    res.json({ paymentUrl, invId, sum: outSum });
  } catch (err) {
    console.error('[create-payment] error:', err.message);
    res.status(500).json({ error: 'Не удалось создать платёж' });
  }
});

/**
 * ResultURL — Робокасса стучится сюда сама (server-to-server) после реальной оплаты.
 * Настраивается в ЛК Робокассы → Технические настройки → Result URL,
 * метод — POST, ссылка на этот эндпоинт.
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

  // Подпись верна — оплата реально прошла на стороне Робокассы.
  console.log(`[robokassa/result] Оплачен заказ InvId=${InvId} на сумму ${OutSum} ₽`);

  await notifyTelegram(`✅ Заказ №${InvId} ОПЛАЧЕН — ${OutSum} ₽. Можно приступать к изготовлению/отправке.`);

  // Робокасса ожидает ТОЧНО такой формат ответа, иначе будет повторять запрос.
  res.send(`OK${InvId}`);
});

async function notifyTelegram(text) {
  if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) return;
  try {
    await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: TELEGRAM_CHAT_ID, text }),
    });
  } catch (err) {
    console.error('[telegram] Не удалось отправить уведомление:', err.message);
  }
}

app.get('/api/health', (req, res) => res.json({ ok: true, test_mode: isTest }));

const port = PORT || 3000;
app.listen(port, () => {
  console.log(`Сервер запущен на порту ${port}. Тестовый режим Робокассы: ${isTest ? 'ДА' : 'нет (боевой)'}`);
});
