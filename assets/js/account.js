/* ══════════════════════════════════════════════
   Кабинет и программа лояльности Йотунхейм.
   Включается сам, только если сервер отвечает /api/health → db:true.
   Пока база не подключена — посетители ничего не видят.
   ══════════════════════════════════════════════ */
(function(){
'use strict';

var API = window.PAYMENT_API_BASE || 'https://api.tasha-jotunheim.com';
try{
  var qa = new URLSearchParams(location.search).get('api');
  if(qa && /^(localhost|127\.0\.0\.1)$/.test(location.hostname))API = qa; // только для локальной проверки
}catch(e){}

var COOKIE_OK_KEY = 'jv_cookie_ok';     // согласие на cookie, помним 1 год
var REF_KEY = 'jv_ref';                 // реф-код друга, живёт 48 часов
var YEAR = 365 * 864e5, DAY = 864e5;

var RANK_BONUS = [
  'Скидка 3% навсегда',
  'Мини-Йотун + скидка 5 000 ₽ на консультацию и 500 JC в подарок',
  'Скидка 5% на всю продукцию и особые условия на обучающих программах',
  'Старший Йотун + приоритет записи на закрытые ритуалы (для своих)',
  'Ёрмунганд + артефакт до 15 000 ₽ в подарок и доступ в секретный канал',
  'Хель + личное обучение рунам у Создателей Клуба (по запросу)',
  'Локи + скидка 10% и ритуал «Открытие дорог» на 1 год в подарок',
  'Имир + подарок на 1 000 000 ₽'
];
var RANK_BG = []; // сюда можно положить пути к картинкам фона рангов: ['assets/img/ranks/0.jpg', ...]

var A = window.JotunAccount = { enabled:false, me:null, useJC:false, apiBase:API };

function $(id){ return document.getElementById(id); }
function rub(n){ return Math.round(n).toLocaleString('ru-RU') + ' ₽'; }
function esc(s){ return String(s == null ? '' : s).replace(/[&<>"]/g, function(c){ return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]; }); }
function lsGet(k){ try{ return localStorage.getItem(k); }catch(e){ return null; } }
function lsSet(k, v){ try{ localStorage.setItem(k, v); }catch(e){} }
function lsDel(k){ try{ localStorage.removeItem(k); }catch(e){} }
function ssGet(k){ try{ return sessionStorage.getItem(k); }catch(e){ return null; } }
function ssSet(k, v){ try{ sessionStorage.setItem(k, v); }catch(e){} }
var JC = '<span class="acc-jc">JC</span>';

function api(method, path, body){
  return fetch(API + path, {
    method: method, credentials: 'include',
    headers: body ? {'Content-Type': 'application/json'} : {},
    body: body ? JSON.stringify(body) : undefined
  }).then(function(r){
    return r.json().catch(function(){ return {}; }).then(function(j){ j.__status = r.status; return j; });
  });
}

/* ── cookie и реф-код ── */
function cookieOk(){ var t = parseInt(lsGet(COOKIE_OK_KEY) || '0', 10); return t && Date.now() - t < YEAR; }
function saveRef(code){
  ssSet(REF_KEY, code);
  if(cookieOk()) lsSet(REF_KEY, JSON.stringify({code: code, exp: Date.now() + 2 * DAY}));
}
function getRef(){
  var s = ssGet(REF_KEY); if(s) return s;
  try{ var o = JSON.parse(lsGet(REF_KEY) || 'null'); if(o && o.exp > Date.now()) return o.code; }catch(e){}
  lsDel(REF_KEY); return null;
}
function captureRef(){
  try{
    var code = new URLSearchParams(location.search).get('ref');
    if(!code) return;
    code = code.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 16);
    if(!code) return;
    saveRef(code);
    api('GET', '/api/ref/check?code=' + encodeURIComponent(code)).then(function(r){
      if(!r.valid) return;
      toast((r.inviter ? r.inviter + ' приглашает тебя' : 'Тебя пригласил друг') + ': скидка ' + r.pct + '% на артефакты от 10 000 ₽ в первом заказе');
    });
  }catch(e){}
}
function cookieBar(){
  if(cookieOk()) return;
  var b = document.createElement('div');
  b.id = 'cookie-bar';
  b.innerHTML = '<span>Мы используем cookie, чтобы помнить вход в кабинет и приглашение друга. Оставаясь на сайте, вы соглашаетесь с <a href="/legal/consent.html" target="_blank">обработкой данных</a>.</span><button type="button">Принять</button>';
  document.body.appendChild(b);
  b.classList.add('on');
  b.querySelector('button').onclick = function(){
    lsSet(COOKIE_OK_KEY, String(Date.now()));
    var r = ssGet(REF_KEY); if(r) saveRef(r);
    b.classList.remove('on');
  };
}
function toast(text){
  var t = $('ref-toast');
  if(!t){ t = document.createElement('div'); t.id = 'ref-toast'; document.body.appendChild(t); }
  t.textContent = text; t.classList.add('on');
  setTimeout(function(){ t.classList.remove('on'); }, 7000);
}

/* ── окно ── */
function overlay(){
  var o = $('acc-overlay');
  if(o) return o;
  o = document.createElement('div');
  o.id = 'acc-overlay';
  o.innerHTML = '<div class="acc-card" id="acc-card"></div>';
  o.addEventListener('click', function(e){ if(e.target === o) close(); });
  document.body.appendChild(o);
  return o;
}
function open(html){
  var o = overlay();
  $('acc-card').innerHTML = '<button class="acc-x" type="button" aria-label="Закрыть">&#10005;</button>' + html;
  $('acc-card').querySelector('.acc-x').onclick = close;
  if(!o.classList.contains('open')){ o.classList.add('open'); if(window.lockBodyScroll) window.lockBodyScroll(); }
}
function close(){
  var o = $('acc-overlay');
  if(o && o.classList.contains('open')){ o.classList.remove('open'); if(window.unlockBodyScroll) window.unlockBodyScroll(); }
}
A.open = function(){ if(A.me) showAccount(); else showLogin(); };
A.close = close;

/* ── вход: почта → код ── */
var loginEmail = '';
function showLogin(after){
  var ref = getRef();
  open('<div class="acc-pad">' +
    '<div class="acc-title">Вход в кабинет</div>' +
    '<div class="acc-sub">Введи почту — пришлём код. Если привязан Telegram, код придёт и туда. Пароль не нужен.</div>' +
    '<input class="acc-input" id="acc-email" type="email" autocomplete="email" placeholder="mail@example.com" value="' + esc(loginEmail) + '">' +
    '<button class="acc-btn-main" id="acc-send" type="button">Получить код</button>' +
    '<div class="acc-msg" id="acc-msg"></div>' +
    (ref ? '<div class="acc-note">Тебя пригласил друг — скидка 15% на артефакты от 10 000 ₽ закрепится за тобой на 7 дней после входа.</div>' : '') +
    '</div>');
  var inp = $('acc-email');
  setTimeout(function(){ try{ inp.focus(); }catch(e){} }, 50);
  inp.onkeydown = function(e){ if(e.key === 'Enter') $('acc-send').click(); };
  $('acc-send').onclick = function(){
    var email = inp.value.trim();
    if(!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) return msg('Проверь адрес почты', true);
    this.disabled = true; msg('Отправляем код…');
    var btn = this;
    api('POST', '/api/auth/request-code', {email: email}).then(function(r){
      btn.disabled = false;
      if(r.__status === 200){ loginEmail = email; showCode(r, after); return; }
      msg({wait_minute:'Код уже отправлен — новый можно запросить через минуту', too_many:'Слишком много попыток, попробуй через час', bad_email:'Проверь адрес почты', send_failed:'Не удалось отправить код. Напиши нам в Telegram: @JotunSpirit'}[r.error] || 'Ошибка, попробуй ещё раз', true);
    }).catch(function(){ btn.disabled = false; msg('Нет связи с сервером', true); });
  };
}
function showCode(r, after){
  var where = r.telegram && r.mail ? 'на почту и в Telegram' : (r.telegram ? 'в Telegram' : 'на почту');
  open('<div class="acc-pad">' +
    '<div class="acc-title">Код из письма</div>' +
    '<div class="acc-sub">Отправили 6 цифр ' + where + ' <b>' + esc(loginEmail) + '</b>. Код действует 10 минут.</div>' +
    '<input class="acc-input acc-code" id="acc-code" inputmode="numeric" autocomplete="one-time-code" maxlength="6" placeholder="••••••">' +
    '<button class="acc-btn-main" id="acc-verify" type="button">Войти</button>' +
    '<div class="acc-msg" id="acc-msg"></div>' +
    '<div class="acc-foot"><button class="acc-link" id="acc-back" type="button">Другая почта</button><button class="acc-link" id="acc-resend" type="button">Отправить ещё раз</button></div>' +
    '</div>');
  var inp = $('acc-code');
  setTimeout(function(){ try{ inp.focus(); }catch(e){} }, 50);
  inp.oninput = function(){ this.value = this.value.replace(/\D/g, '').slice(0, 6); if(this.value.length === 6) $('acc-verify').click(); };
  $('acc-back').onclick = function(){ showLogin(after); };
  $('acc-resend').onclick = function(){ showLogin(after); setTimeout(function(){ var b = $('acc-send'); if(b) b.click(); }, 30); };
  $('acc-verify').onclick = function(){
    var code = inp.value;
    if(code.length !== 6) return msg('Введи 6 цифр', true);
    var btn = this; btn.disabled = true; msg('Проверяем…');
    var body = {email: loginEmail, code: code};
    var ref = getRef(); if(ref) body.ref = ref;
    api('POST', '/api/auth/verify', body).then(function(res){
      btn.disabled = false;
      if(res.__status !== 200){
        return msg({wrong_code:'Неверный код', code_expired:'Код устарел — запроси новый', too_many_attempts:'Слишком много попыток — запроси новый код'}[res.error] || 'Ошибка, попробуй ещё раз', true);
      }
      loadMe().then(function(){ if(after) { close(); after(); } else showAccount(); });
    }).catch(function(){ btn.disabled = false; msg('Нет связи с сервером', true); });
  };
}
function msg(t, err){ var m = $('acc-msg'); if(m){ m.textContent = t; m.className = 'acc-msg' + (err ? ' err' : ''); } }

/* ── кабинет ── */
function progressText(n){
  if(!n) return 'Это высший ранг.';
  var a = [];
  if(n.friendsLeft) a.push(n.friendsLeft + ' ' + plural(n.friendsLeft, 'друг', 'друга', 'друзей') + ' с покупкой от ' + rub(n.friendsMin));
  var o = n.own, p = [];
  if(o.sumLeft) p.push('покупок ещё на ' + rub(o.sumLeft));
  if(o.artifactsLeft) p.push('ещё ' + o.artifactsLeft + ' ' + plural(o.artifactsLeft, 'артефакт', 'артефакта', 'артефактов'));
  if(o.friendsLeft) p.push(o.friendsLeft + ' ' + plural(o.friendsLeft, 'друг', 'друга', 'друзей') + ' от ' + rub(o.friendsMin));
  if(p.length) a.push(p.join(' и '));
  return 'До ранга «' + n.name + '»: ' + a.join(' или ');
}
function plural(n, a, b, c){ n = Math.abs(n) % 100; var d = n % 10; if(n > 10 && n < 20) return c; if(d > 1 && d < 5) return b; if(d === 1) return a; return c; }
function progressPct(me){
  var n = me.next; if(!n) return 100;
  var r = me.ranks[n.rank], st = me.stats, best = 0;
  if(r.friends) best = Math.max(best, (r.friends.n - n.friendsLeft) / r.friends.n);
  if(r.own) best = Math.max(best, Math.min(1, st.ownSum / r.own.sum));
  return Math.round(best * 100);
}
function showAccount(){
  var me = A.me; if(!me) return showLogin();
  var r = me.rank, bg = RANK_BG[r.index];
  var ranks = me.ranks.map(function(x, i){
    var cur = i === r.index ? ' cur' : '';
    var how = '';
    if(x.friends){
      how = x.friends.n + ' друзей от ' + rub(x.friends.min) + ' или покупки на ' + rub(x.own.sum) +
        (x.own.artifacts ? ' (от ' + x.own.artifacts + ' артефактов)' : '') +
        (x.own.plus ? ' + ' + x.own.plus.n + ' ' + plural(x.own.plus.n, 'друг', 'друга', 'друзей') + ' от ' + rub(x.own.plus.min) : '');
    } else how = 'сразу после регистрации';
    return '<div class="rn' + cur + '">' + esc(x.name) + '</div><div class="rb' + cur + '">' + esc(RANK_BONUS[i]).replace(/JC/g, JC) + '<small>' + esc(how) + '</small></div>';
  }).join('');
  var tgLine = me.user.telegram
    ? '<span>Telegram: <b>' + esc(me.user.telegram === true ? 'привязан' : me.user.telegram) + '</b></span>'
    : '<button class="acc-btn-ghost" id="acc-tg" type="button">Привязать Telegram</button>';
  open(
    '<div class="acc-hero' + (bg ? ' has-img' : '') + '" data-rank="' + r.index + '"' + (bg ? ' style="background-image:url(' + esc(bg) + ')"' : '') + '>' +
      '<div class="acc-eye">твой ранг</div>' +
      '<div class="acc-rank">' + esc(r.name) + '</div>' +
      '<div class="acc-pct">скидка ' + r.pct + '% на всё</div>' +
      '<div class="acc-prog"><div class="acc-bar"><i style="width:' + progressPct(me) + '%"></i></div><div class="acc-prog-t">' + esc(progressText(me.next)) + '</div></div>' +
    '</div>' +
    '<div class="acc-pad">' +
      '<div class="acc-grid">' +
        '<div class="acc-tile"><b>' + me.jc.balance.toLocaleString('ru-RU') + ' ' + JC + '</b><span>баланс · 1 ' + JC + ' = 1 ₽, до 50% заказа</span></div>' +
        '<div class="acc-tile"><b>' + me.stats.friendsBought + '</b><span>друзей купили · приглашено ' + me.stats.invited + '</span></div>' +
      '</div>' +
      (me.refDiscount ? '<div class="acc-note">Скидка друга ' + me.refDiscount.pct + '% на артефакты от 10 000 ₽ действует до ' + new Date(me.refDiscount.until).toLocaleDateString('ru-RU') + '</div>' : '') +
      '<div class="acc-sec">твоя ссылка для друзей</div>' +
      '<div class="acc-ref"><input class="acc-input" id="acc-ref" readonly value="загружаем…"><button class="acc-btn-ghost" id="acc-share" type="button">Поделиться</button></div>' +
      '<div class="acc-ref-t" id="acc-ref-t">Друг получит 15% на первый заказ, ты — 1 000 ' + JC + ' после его покупки.</div>' +
      '<div class="acc-sec">ранги</div>' +
      '<div class="acc-ranks">' + ranks + '</div>' +
      '<div class="acc-foot">' + tgLine + '<a class="acc-link" href="/program/">О клубе</a><button class="acc-link" id="acc-logout" type="button">Выйти</button></div>' +
    '</div>');
  api('GET', '/api/ref/link').then(function(l){
    if(!l.url) return;
    var inp = $('acc-ref'); if(!inp) return;
    inp.value = l.url;
    var h = Math.max(1, Math.round((new Date(l.expiresAt) - Date.now()) / 36e5));
    $('acc-ref-t').innerHTML = 'Ссылка действует ' + h + ' ч с момента копирования. Друг получит скидку на первый заказ, ты — от 1 000 до 3 000 ' + JC + ' после его покупки.';
    $('acc-share').onclick = function(){
      var text = 'Артефакты Йотунхейм — скидка 15% на первый заказ по моей ссылке:';
      if(navigator.share) navigator.share({title: 'Артефакты Йотунхейм', text: text, url: l.url}).catch(function(){});
      else { try{ inp.select(); document.execCommand('copy'); }catch(e){} if(navigator.clipboard) navigator.clipboard.writeText(l.url).catch(function(){}); this.textContent = 'Скопировано'; }
    };
  });
  var tg = $('acc-tg');
  if(tg) tg.onclick = function(){
    var w = window.open('', '_blank');
    api('POST', '/api/tg/link', {}).then(function(r){
      if(r.url){ if(w) w.location = r.url; else location.href = r.url; }
      else if(w) w.close();
    });
  };
  $('acc-logout').onclick = function(){
    api('POST', '/api/auth/logout', {}).then(function(){ A.me = null; updateBtn(); close(); });
  };
}

/* ── кнопка в шапке ── */
function addButton(){
  var box = $('top-right-controls'); if(!box || $('acc-btn')) return;
  var b = document.createElement('button');
  b.id = 'acc-btn'; b.type = 'button';
  b.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="8" r="4"/><path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6"/></svg><span class="acc-label">Кабинет</span>';
  b.onclick = A.open;
  box.insertBefore(b, box.firstChild);
}
function updateBtn(){
  var b = $('acc-btn'); if(!b) return;
  b.classList.add('on');
  var dot = b.querySelector('.acc-dot');
  if(A.me && !dot){ dot = document.createElement('i'); dot.className = 'acc-dot'; b.appendChild(dot); }
  if(!A.me && dot) dot.remove();
  b.title = A.me ? A.me.rank.name : 'Войти в кабинет';
}
function loadMe(){
  return api('GET', '/api/me').then(function(r){ A.me = r.__status === 200 ? r : null; updateBtn(); return A.me; })
    .catch(function(){ A.me = null; return null; });
}

/* ── оформление заказа: галочка «создать кабинет», JC, расчёт на сервере ── */
A.checkoutExtras = function(){
  var o = {};
  var ref = getRef();
  if(!A.me){
    var cb = $('ckCreateAcc');
    o.createAccount = !!(cb && cb.checked) || !!ref;
    if(ref) o.ref = ref;
  } else if(A.useJC){
    o.useJC = 999999; // сервер сам ограничит балансом и 50%
  }
  return o;
};
A.decorateCheckout = function(){
  var sum = $('checkoutSummary'); if(!sum) return;
  var box = $('ckAccount');
  if(!box){ box = document.createElement('div'); box.id = 'ckAccount'; sum.parentNode.insertBefore(box, sum); }
  var ref = getRef();
  if(A.me){
    box.innerHTML = '<div class="ck-mem">Кабинет: ' + esc(A.me.user.email) + ' · ' + esc(A.me.rank.name) + ', скидка ' + A.me.rank.pct + '%</div>' +
      (A.me.jc.balance > 0 ? '<label class="ck-row"><input type="checkbox" id="ckUseJC"' + (A.useJC ? ' checked' : '') + '> Оплатить часть заказа ' + JC + ' (баланс ' + A.me.jc.balance.toLocaleString('ru-RU') + ', до 50% суммы)</label>' : '');
    var u = $('ckUseJC'); if(u) u.onchange = function(){ A.useJC = this.checked; requote(); };
  } else {
    box.innerHTML = '<label><input type="checkbox" id="ckCreateAcc"' + (ref ? ' checked disabled' : ' checked') + '> <span>Создать кабинет по этой почте и копить бонусы: скидка 3% сразу' + (ref ? ', а по приглашению друга — 15% на артефакты от 10 000 ₽' : '') + '</span></label>' +
      '<div class="ck-row">Уже есть кабинет? <button class="acc-link" type="button" id="ckLogin">Войти</button></div>';
    $('ckLogin').onclick = function(){ showLogin(function(){ if(window.openCheckout) window.openCheckout(); }); };
    var cb = $('ckCreateAcc'); if(cb) cb.onchange = requote;
  }
  requote();
};
function cartItems(){
  try{ return (window.getCartForAccount ? window.getCartForAccount() : []); }catch(e){ return []; }
}
function requote(){
  var items = cartItems(); if(!items.length) return;
  var body = {items: items};
  var ex = A.checkoutExtras(); for(var k in ex) body[k] = ex[k];
  if(A.me) body.useJC = A.useJC ? 999999 : 0;
  api('POST', '/api/checkout/quote', body).then(function(q){
    if(q.__status !== 200) return;
    var sum = $('checkoutSummary'); if(!sum) return;
    var kinds = {rank: 'Скидка ранга', ref: 'Скидка друга', promo: 'Скидка (промокод)'};
    var rows = items.map(function(it){ return '<div class="checkout-summary-row"><span>' + esc(it.name) + (it.qty > 1 ? ' × ' + it.qty : '') + '</span><span>' + rub(it.price * it.qty) + '</span></div>'; }).join('');
    if(q.discount > 0) rows += '<div class="checkout-summary-row" style="color:var(--accent)"><span>' + (kinds[q.discountKind] || 'Скидка') + '</span><span>−' + rub(q.discount) + '</span></div>';
    if(q.jcUse > 0) rows += '<div class="checkout-summary-row" style="color:#ffd84a"><span>Оплата ' + JC + '</span><span>−' + rub(q.jcUse) + '</span></div>';
    sum.innerHTML = rows + '<div class="checkout-summary-total"><span>Итого</span><b>' + rub(q.total) + '</b></div>';
  }).catch(function(){});
}

/* ── запуск ── */
function boot(){
  fetch(API + '/api/health').then(function(r){ return r.json(); }).then(function(h){
    if(!h || h.db !== true) return; // база не подключена — программа скрыта
    A.enabled = true;
    addButton();
    updateBtn();
    captureRef();
    cookieBar();
    loadMe();
  }).catch(function(){});
}
if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();
