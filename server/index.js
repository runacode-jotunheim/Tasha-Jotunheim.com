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

// .trim() на случай, если в переменную окружения случайно попал пробел
// или перенос строки при копировании пароля в панель Timeweb.
const activePassword1 = (isTest ? ROBOKASSA_TEST_PASSWORD_1 : ROBOKASSA_PASSWORD_1).trim();
const activePassword2 = (isTest ? ROBOKASSA_TEST_PASSWORD_2 : ROBOKASSA_PASSWORD_2).trim();

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
    // Робокасса в своей документации показывает OutSum как строку с двумя знаками
    // после точки (например "990.00"), а не как обычное число без дробной части.
    // Используем именно эту строку — и в подписи, и в URL — чтобы не зависеть от того,
    // как их сервер сам форматирует сумму при пересчёте подписи на своей стороне.
    const outSumStr = outSum.toFixed(2);

    const invId = generateInvId();
    const description = `Заказ №${invId} — Артефакты Йотунхейм`;

    const receipt = {
      sno: ROBOKASSA_TAX_SYSTEM || 'usn_income',
      items: receiptItems,
    };
    const receiptJson = JSON.stringify(receipt);
    // Робокасса требует однократно URL-кодировать Receipt перед добавлением в строку
    // подписи. Раньше в подпись по ошибке уходил сырой JSON вообще без кодирования —
    // это давало ошибку 29. Двойное кодирование, которое пробовали раньше, было нужно
    // только для GET-редиректа; теперь переходим на POST (это отдельная рекомендация
    // из документации Робокассы по Receipt: "из-за объёма номенклатуры используйте
    // метод POST"), так что здесь достаточно одинарного кодирования.
    const receiptEncodedOnce = encodeURIComponent(receiptJson);

    // Формула подписи с чеком: MerchantLogin:OutSum:InvId:Receipt(однократно закодирован):Password1
    // (Password1 — активный, тестовый или боевой, в зависимости от ROBOKASSA_TEST_MODE)
    const signatureBase = `${ROBOKASSA_LOGIN}:${outSumStr}:${invId}:${receiptEncodedOnce}:${activePassword1}`;
    const signature = md5(signatureBase);

    // Раньше формировали GET-ссылку с параметрами в query string. Документация Робокассы
    // по фискализации прямо требует метод POST при наличии Receipt ("из-за объёма
    // номенклатуры используйте метод POST") — отдаём фронтенду набор полей для
    // автосабмита формы, а не готовую ссылку.
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

    // Диагностический лог — без пароля, только то, что реально ушло в запрос.
    // Смотреть во вкладке "Логи приложения" в Timeweb после неудачной попытки оплаты.
    // ⚠ signatureBase содержит пароль в открытом виде — маскируем перед логированием.
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
      // Длина активного пароля — НЕ сам пароль. Сверьте с количеством символов
      // при выделении поля пароля в ЛК Робокассы (Ctrl+A внутри поля), чтобы
      // исключить обрезанный/задвоенный пароль или случайный пробел при копировании.
      activePassword1Length: activePassword1.length,
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
      return; // успех
    } catch (err) {
      // err.cause обычно содержит реальную сетевую причину (ECONNRESET, ENOTFOUND, ETIMEDOUT и т.п.),
      // а err.message от fetch часто просто "fetch failed" без подробностей.
      const detail = err.cause ? `${err.message} — cause: ${err.cause.code || err.cause.message || err.cause}` : err.message;
      console.error(`[telegram] Попытка ${attempt}/${MAX_ATTEMPTS} не удалась:`, detail);
      if (attempt < MAX_ATTEMPTS) {
        await new Promise((r) => setTimeout(r, attempt * 800)); // 800мс, потом 1600мс
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
