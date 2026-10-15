/* Клуб Йотунов: аккордеон рангов, тихая матрица, кабинет */
(function(){
'use strict';

/* ── Данные программы (актуальная таблица) ── */
var RANKS = [
  { name:'Мини-Йотун', pct:3, main:'Скидка 3% на всю продукцию', first:true,
    perks:[], gifts:[], friendJC:1000 },
  { name:'Йотун', pct:3, main:'5 000 ₽ на консультацию',
    friends:[5,7000], own:'24 000 ₽', ownNote:'не меньше 3 артефактов',
    perks:[], gifts:['500 ЙотунКоинов','5 000 ₽ на консультацию'], friendJC:1250 },
  { name:'Старший Йотун', pct:5, main:'Скидка 5%',
    friends:[10,7000], own:'50 000 ₽',
    perks:['Привилегии при брони места на обучение'], gifts:['1 000 ЙотунКоинов','5 000 ₽ на консультацию'], friendJC:1500 },
  { name:'Ёрмунганд', pct:5, main:'Приоритет на закрытые ритуалы',
    friends:[15,10000], own:'75 000 ₽',
    perks:['Приоритет на закрытые ритуалы'], gifts:['1 500 ЙотунКоинов','5 000 ₽ на консультацию'], friendJC:1750 },
  { name:'Хель', pct:7, main:'Скидка 7% и закрытый канал',
    friends:[20,15000], own:'100 000 ₽',
    perks:['Закрытый канал «Настоящие Йотуны»'], gifts:['2 000 ЙотунКоинов','Артефакт из коллекции до 15 000 ₽'], friendJC:2000 },
  { name:'Локи', pct:7, main:'Индивидуальное обучение рунам',
    friends:[25,15000], own:'150 000 ₽', ownPlus:[3,10000],
    perks:['Индивидуальное обучение рунам на особых условиях'], gifts:['3 000 ЙотунКоинов','Артефакт из коллекции до 15 000 ₽','Консультация 60 минут бесплатно'], friendJC:2250 },
  { name:'Имир', pct:10, main:'Скидка 10%',
    friends:[30,20000], own:'250 000 ₽', ownPlus:[5,15000],
    perks:[], gifts:['3 500 ЙотунКоинов','Артефакт из коллекции до 15 000 ₽','Консультация 60 минут бесплатно','Индивидуальный ритуал открытия дорог на 1 год'], friendJC:2500 },
  { name:'Бергельмир', pct:15, main:'Скидка 15%',
    friends:[40,25000], own:'300 000 ₽', ownPlus:[15,20000],
    perks:['Скидка 15% на обучение'], gifts:['5 000 ЙотунКоинов','Артефакт из коллекции до 15 000 ₽','Консультация 60 минут бесплатно','Ритуал открытия дорог','Персональный артефакт'], friendJC:3000 }
];

function rub(n){ return n.toLocaleString('ru-RU') + ' ₽'; }
function num(n){ return n.toLocaleString('ru-RU'); }
function li(t){ return '<li>' + t + '</li>'; }

/* постоянные привилегии рангом выше включают всё, что было раньше */
function allPerks(i){
  var out = ['<b>Скидка ' + RANKS[i].pct + '%</b> на всю продукцию — артефакты, ритуалы, консультации'];
  for(var k = 0; k <= i; k++) RANKS[k].perks.forEach(function(p){ out.push(p); });
  return out;
}

function body(i, me){
  var r = RANKS[i], h = '';
  // условие
  h += '<div class="r-blk"><h4>Условие получения</h4><ul>';
  if(r.first) h += li('Первая оплаченная покупка с личным кабинетом');
  else {
    h += li('<b>Через приглашения:</b> ' + r.friends[0] + ' друзей, каждый оплатил заказ от ' + rub(r.friends[1]));
    h += '<li class="or">или</li>';
    h += li('<b>Через покупки:</b> ' + r.own + ' на общую сумму' + (r.ownNote ? ', ' + r.ownNote : '') +
      (r.ownPlus ? ' + ' + r.ownPlus[0] + ' ' + (r.ownPlus[0] < 5 ? 'друга' : 'друзей') + ', каждый от ' + rub(r.ownPlus[1]) : ''));
  }
  h += '</ul>' + progress(i, me) + '</div>';
  // привилегии
  h += '<div class="r-blk"><h4>Постоянные привилегии</h4><ul>' + allPerks(i).map(li).join('') + '</ul></div>';
  // подарок (только если есть)
  if(r.gifts.length) h += '<div class="r-blk"><h4>Подарок за ранг</h4><ul>' + r.gifts.map(li).join('') + '</ul><div class="note">Выдаётся один раз при получении ранга.</div></div>';
  // ЙотунКоины за друзей
  h += '<div class="r-blk"><h4>ЙотунКоины</h4><ul>' + li('<b>+' + num(r.friendJC) + ' JC</b> за каждого нового друга с первой покупкой от 10 000 ₽') + '</ul><div class="note">Начисляются через 14 дней после оплаты друга.</div></div>';
  return '<div class="r-in">' + h + '</div>';
}

/* прогресс к следующему рангу — только по реальным данным кабинета */
function progress(i, me){
  if(!me || !me.next || me.next.rank !== i) return '';
  var r = RANKS[i], n = me.next, h = '';
  if(r.friends){
    var have = Math.max(0, r.friends[0] - n.friendsLeft);
    h += '<div class="prog">Через приглашения: ' + have + ' из ' + r.friends[0] + '<div class="bar"><i style="width:' + Math.min(100, have / r.friends[0] * 100) + '%"></i></div></div>';
  }
  if(n.own){
    var need = parseInt(String(r.own).replace(/\D/g, ''), 10) || 0, got = Math.max(0, need - n.own.sumLeft);
    h += '<div class="prog">Через покупки: ' + rub(got) + ' из ' + rub(need) + '<div class="bar"><i style="width:' + (need ? Math.min(100, got / need * 100) : 0) + '%"></i></div></div>';
  }
  return h;
}

var list = document.getElementById('ranks-list');
var openIdx = -1, meData = null;

function render(){
  if(!list) return;
  var cur = meData && meData.rank ? meData.rank.index : -1;
  list.innerHTML = RANKS.map(function(r, i){
    var tag = '';
    if(cur === i) tag = '<span class="r-tag">Твой ранг</span>';
    else if(cur > i) tag = '<span class="r-tag done">Достигнут</span>';
    else if(cur >= 0 && i === cur + 1) tag = '<span class="r-tag">Следующий</span>';
    return '<li class="rank' + (cur === i ? ' cur' : '') + '" data-i="' + i + '">' +
      '<button class="r-btn" type="button" aria-expanded="false" aria-controls="rb' + i + '">' +
      '<span class="r-name">' + r.name + '<span class="r-main">' + r.main + '</span></span>' +
      (tag || '<span></span>') + '<span class="r-ico"></span></button>' +
      '<div class="r-body" id="rb' + i + '" role="region">' + body(i, meData) + '</div></li>';
  }).join('');
  if(openIdx >= 0) setOpen(openIdx, true);
}

function setOpen(i, instant){
  var items = list.querySelectorAll('.rank');
  [].forEach.call(items, function(li, k){
    var b = li.querySelector('.r-body'), btn = li.querySelector('.r-btn');
    var want = (k === i);
    if(want === li.classList.contains('open') && !instant) return;
    li.classList.toggle('open', want);
    btn.setAttribute('aria-expanded', want ? 'true' : 'false');
    if(instant){ b.style.height = want ? 'auto' : '0px'; return; }
    if(want){
      b.style.height = b.scrollHeight + 'px';
      b.addEventListener('transitionend', function te(){ if(li.classList.contains('open')) b.style.height = 'auto'; b.removeEventListener('transitionend', te); });
    } else {
      b.style.height = b.scrollHeight + 'px';
      b.offsetHeight; // зафиксировать высоту перед сворачиванием
      b.style.height = '0px';
    }
  });
  openIdx = i;
}

if(list){
  list.addEventListener('click', function(e){
    var btn = e.target.closest('.r-btn'); if(!btn) return;
    var i = +btn.parentNode.getAttribute('data-i');
    var top = btn.getBoundingClientRect().top;
    setOpen(openIdx === i ? -1 : i);
    // не дать странице «прыгнуть»: держим нажатую строку на месте
    requestAnimationFrame(function(){ var d = btn.getBoundingClientRect().top - top; if(Math.abs(d) > 2) window.scrollBy(0, d); });
  });
  render();
}

/* ── матрица как на главной: те же руны и шрифт, цвет — по рангу, яркость приглушена ── */
var TINTS = [
  [0,255,65],   // Мини-Йотун
  [0,255,65],   // Йотун
  [40,255,120], // Старший Йотун
  [0,235,175],  // Ёрмунганд
  [170,140,255],// Хель
  [255,120,40], // Локи
  [255,60,60],  // Имир
  [255,200,60]  // Бергельмир
];
var tint = TINTS[0];
function applyRank(i){
  i = Math.max(0, Math.min(7, i|0)); tint = TINTS[i];
  document.documentElement.style.setProperty('--tint', tint.join(','));
  var f = document.getElementById('frame');
  if(f) f.className = 'frame' + (i === 7 ? ' f-gold' : i >= 4 ? ' f-hi' : '');
}
(function(){
  var c = document.getElementById('mx'); if(!c) return;
  var ctx = c.getContext('2d');
  var ABC = 'ᚠᚢᚦᚨᚱᚲᚷᚹᚺᚾᛁᛃᛇᛈᛉᛋᛏᛒᛖᛗᛚᛜᛟᛞ', SECRET = ['JOTUNHEIM','JOTUN','CLUB'];
  var cellH, colStep, baseFS, drops = [];
  function setup(){
    var mob = innerWidth < 768; cellH = mob ? 18 : 24; colStep = mob ? 14 : 20; baseFS = mob ? 14 : 22;
    c.width = innerWidth; c.height = innerHeight; ctx.fillStyle = '#000'; ctx.fillRect(0, 0, c.width, c.height);
    drops = [];
    for(var i = 0, n = Math.floor(c.width / colStep); i < n; i++){
      var z = Math.random();
      drops.push({ x:i*colStep, y:-Math.random()*50, size:Math.floor(z*4)+baseFS, wait:Math.floor(Math.random()*5)+1, w:0, op:z*.8+.2, h:[], secret:'', si:0 });
    }
  }
  setup(); addEventListener('resize', setup);
  function col(j){
    var k = j === 0 ? 0 : (j < 6 ? 0.56 : Math.max(0, (200 - j*13) / 255));
    if(j === 0) return 'rgb(' + Math.round(tint[0]*.133+136) + ',' + Math.round(tint[1]*.133+136) + ',' + Math.round(tint[2]*.133+136) + ')';
    return 'rgb(' + Math.round(tint[0]*k) + ',' + Math.round(tint[1]*k) + ',' + Math.round(tint[2]*k) + ')';
  }
  setInterval(function(){
    if(document.hidden) return;
    ctx.fillStyle = 'rgba(0,0,0,0.22)'; ctx.fillRect(0, 0, c.width, c.height);
    for(var i = 0; i < drops.length; i++){
      var d = drops[i];
      if(d.y > 0){
        var cy = Math.floor(d.y);
        for(var j = 0; j < d.h.length; j++){
          var ch = d.h[j]; if(!ch) continue;
          var yp = (cy - j) * cellH; if(yp < 0) break;
          ctx.save(); ctx.translate(d.x, 0); ctx.scale(/[A-Z]/.test(ch) ? 0.85 : 1.2, 1);
          ctx.font = d.size + "px 'VT323'"; ctx.globalAlpha = d.op;
          if(j === 0){ ctx.shadowBlur = 5; ctx.shadowColor = 'rgb(' + Math.round(tint[0]*.4) + ',' + Math.round(tint[1]*.4) + ',' + Math.round(tint[2]*.4) + ')'; } else ctx.shadowBlur = 0;
          ctx.fillStyle = col(j); ctx.fillText(ch, 0, yp); ctx.restore();
        }
        ctx.globalAlpha = 1;
      }
      if(++d.w >= d.wait){
        d.w = 0; d.y += 1;
        if(!d.secret && Math.random() < .0015){ d.secret = SECRET[Math.floor(Math.random()*SECRET.length)]; d.si = 0; }
        var nc; if(d.secret){ nc = d.secret[d.si++]; if(d.si >= d.secret.length) d.secret = ''; } else nc = ABC.charAt(Math.floor(Math.random()*ABC.length));
        d.h.unshift(nc); if(d.h.length > 80) d.h.pop();
      }
      if(d.y*cellH > c.height + 400){ d.y = -Math.random()*19; d.h = []; d.secret = ''; }
    }
  }, 1000/24);
})();
var preview = null;
try{ var q = new URLSearchParams(location.search).get('rank'); if(q !== null && q !== '') preview = +q; }catch(e){}
if(preview !== null) applyRank(preview);

/* ── плавное появление разделов ── */
(function(){
  var els = document.querySelectorAll('.fade');
  if(!('IntersectionObserver' in window)){ [].forEach.call(els, function(e){ e.classList.add('in'); }); return; }
  var io = new IntersectionObserver(function(list){ list.forEach(function(en){ if(en.isIntersecting){ en.target.classList.add('in'); io.unobserve(en.target); } }); }, { threshold:0.08 });
  [].forEach.call(els, function(e){ io.observe(e); });
})();

/* ── FAQ: открыт один вопрос ── */
[].forEach.call(document.querySelectorAll('.faq details'), function(d, _, all){
  d.addEventListener('toggle', function(){ if(d.open) [].forEach.call(document.querySelectorAll('.faq details'), function(o){ if(o !== d) o.open = false; }); });
});


/* ── экран участника: статус и статистика (только по реальным данным кабинета) ── */
function fmtRub(n){ return Math.round(n || 0).toLocaleString('ru-RU') + ' ₽'; }
function showMember(me){
  var g = document.getElementById('guest-hero'), m = document.getElementById('me'); if(!m) return;
  if(g) g.hidden = true; m.hidden = false;
  var st = me.stats || {}, pct = me.rank ? me.rank.pct : 0;
  document.getElementById('me-rank').textContent = me.rank ? me.rank.name : '—';
  document.getElementById('me-pct').textContent = 'Скидка ' + pct + '% на всю продукцию — постоянно.';
  document.getElementById('ms-inv').textContent = num(st.invited || 0);
  document.getElementById('ms-fb').textContent = num(st.friendsBought || 0);
  document.getElementById('ms-art').textContent = num(st.ownArtifacts || 0);
  document.getElementById('ms-sum').textContent = fmtRub(st.ownSum);
  document.getElementById('ms-pct').textContent = pct + '%';
  document.getElementById('ms-jc').textContent = num((me.jc && me.jc.balance) || 0) + ' JC';
  var nx = document.getElementById('me-next');
  if(me.next && RANKS[me.next.rank]){
    nx.innerHTML = '<h4>Следующий ранг</h4><div class="nm">' + RANKS[me.next.rank].name + '</div>' + progress(me.next.rank, me);
  } else nx.innerHTML = '<h4>Ранг</h4><div class="nm">Высший ранг клуба</div>';
  document.getElementById('me-open').onclick = window.JotunAccount.open;
  wireHistory();
  loadRef();
}

/* ── история покупок (раскрывается по нажатию на «артефактов куплено») ── */
function fmtDate(d){ try{ return new Date(d).toLocaleDateString('ru-RU', { day:'numeric', month:'long', year:'numeric' }); }catch(e){ return ''; } }
function esc(t){ return String(t == null ? '' : t).replace(/[&<>"]/g, function(c){ return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]; }); }
function wireHistory(){
  var btn = document.getElementById('ms-art-btn'), box = document.getElementById('hist'); if(!btn || !box) return;
  var loaded = false;
  btn.onclick = function(){
    var open = box.hidden; box.hidden = !open; btn.setAttribute('aria-expanded', open ? 'true' : 'false');
    btn.querySelector('.hist-ico').textContent = open ? 'История ▴' : 'История ▾';
    if(open && !loaded) loadHistory();
  };
  function loadHistory(){
    var A = window.JotunAccount;
    box.innerHTML = '<div class="h-msg">Загружаем историю…</div>';
    fetch(A.apiBase + '/api/me/orders', { credentials:'include' }).then(function(r){ if(!r.ok) throw 0; return r.json(); }).then(function(j){
      loaded = true;
      var list = (j && j.orders) || [];
      if(!list.length){ box.innerHTML = '<div class="h-msg">Покупок пока нет.</div>'; return; }
      box.innerHTML = list.map(function(o){
        var names = o.items.map(function(it){ return esc(it.name) + (it.qty > 1 ? ' × ' + it.qty : ''); }).join(', ');
        return '<div class="h-row"><span class="h-date">' + fmtDate(o.paidAt) + '</span><span class="h-items">' + names +
          '<small>' + (o.counted ? 'Засчитана в ранг' : 'Будет засчитана через 14 дней после оплаты') + '</small></span><span class="h-sum">' + fmtRub(o.total) + '</span></div>';
      }).join('');
    }).catch(function(){
      box.innerHTML = '<div class="h-msg">Не удалось загрузить историю. <button class="link-btn" type="button">Повторить</button></div>';
      box.querySelector('button').onclick = loadHistory;
    });
  }
}

function loadRef(){
  var row = document.getElementById('ref-row'), A = window.JotunAccount; if(!row || !A) return;
  row.innerHTML = '<span class="ref-state">Обновляем ссылку…</span>';
  fetch(A.apiBase + '/api/ref/link', { credentials:'include' }).then(function(r){ if(!r.ok) throw 0; return r.json(); }).then(function(j){
    if(!j || !j.url) throw 0;
    row.innerHTML = '<input type="text" readonly aria-label="Реферальная ссылка"><button class="btn" type="button">Скопировать ссылку</button>';
    var inp = row.querySelector('input'), b = row.querySelector('button');
    inp.value = j.url;
    b.onclick = function(){
      var done = function(){ b.textContent = 'Скопировано'; setTimeout(function(){ b.textContent = 'Скопировать ссылку'; }, 1800); };
      if(navigator.clipboard) navigator.clipboard.writeText(j.url).then(done, function(){ inp.select(); try{ document.execCommand('copy'); done(); }catch(e){} });
      else { inp.select(); try{ document.execCommand('copy'); done(); }catch(e){} }
    };
    if(j.expiresAt){ var ms = new Date(j.expiresAt) - Date.now(); if(ms > 0 && ms < 864e5) setTimeout(loadRef, ms + 2000); }
  }).catch(function(){
    row.innerHTML = '<span class="ref-state">Не удалось обновить ссылку</span><button class="link-btn" type="button">Повторить</button>';
    row.querySelector('button').onclick = loadRef;
  });
}

/* ── кабинет: кнопки появляются, когда программа запущена на сервере ── */
var tries = 0;
function wire(){
  var A = window.JotunAccount;
  if(A && A.enabled){
    [].forEach.call(document.querySelectorAll('[data-cab]'), function(b){
      b.hidden = false; b.textContent = A.me ? 'Открыть кабинет' : 'Войти в кабинет'; b.onclick = A.open;
    });
    if(A.me && A.me !== meData){ meData = A.me; render(); if(preview === null && A.me.rank) applyRank(A.me.rank.index); showMember(A.me); }
    if(!A.me && tries < 30){ tries++; setTimeout(wire, 700); }
    return;
  }
  if(++tries < 20) setTimeout(wire, 500);
}
wire();
})();
