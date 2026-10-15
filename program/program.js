/* Клуб Йотунов: аккордеон рангов, тихая матрица, кабинет */
(function(){
'use strict';

/* ── Данные программы (актуальная таблица) ── */
var RANKS = [
  { name:'Мини-Йотун', pct:3, main:'Скидка 3% на всю продукцию', first:true,
    perks:[], gifts:[], friendJC:1000 },
  { name:'Йотун', pct:3, main:'5 000 ₽ на консультацию',
    friends:[5,7000], own:'24 000 ₽', ownNote:'не меньше 3 артефактов',
    perks:[], gifts:['500 ЙотунКоинов','5 000 ₽ на консультацию'], friendJC:1000 },
  { name:'Старший Йотун', pct:5, main:'Скидка 5%',
    friends:[10,7000], own:'50 000 ₽',
    perks:['Привилегии при брони места на обучение'], gifts:['1 000 ЙотунКоинов','5 000 ₽ на консультацию'], friendJC:1500 },
  { name:'Ёрмунганд', pct:5, main:'Приоритет на закрытые ритуалы',
    friends:[15,10000], own:'75 000 ₽',
    perks:['Приоритет на закрытые ритуалы'], gifts:['1 500 ЙотунКоинов','5 000 ₽ на консультацию'], friendJC:1500 },
  { name:'Йотун Хель', pct:7, main:'Скидка 7% и закрытый канал',
    friends:[20,15000], own:'100 000 ₽',
    perks:['Закрытый канал «Настоящие Йотуны»'], gifts:['2 000 ЙотунКоинов','Артефакт из коллекции до 15 000 ₽'], friendJC:2000 },
  { name:'Йотун Локи', pct:7, main:'Индивидуальное обучение рунам',
    friends:[25,15000], own:'150 000 ₽', ownPlus:[3,10000],
    perks:['Индивидуальное обучение рунам на особых условиях'], gifts:['3 000 ЙотунКоинов','Артефакт из коллекции до 15 000 ₽','Консультация 60 минут бесплатно'], friendJC:2000 },
  { name:'Йотун Имир', pct:10, main:'Скидка 10%',
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
      '<span class="r-num">' + String(i + 1).padStart(2, '0') + '</span>' +
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

/* ── тихая руническая матрица в приглушённом зелёном ── */
(function(){
  var c = document.getElementById('mx'); if(!c || (window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches)) return;
  var ctx = c.getContext('2d'), ABC = 'ᚠᚢᚦᚨᚱᚲᚷᚹᚺᚾᛁᛃᛇᛈᛉᛋᛏᛒᛖᛗᛚᛜᛟᛞ', drops = [], cellH, step, fs;
  function setup(){
    var mob = innerWidth < 768; cellH = mob ? 18 : 24; step = mob ? 22 : 30; fs = mob ? 14 : 20;
    c.width = innerWidth; c.height = innerHeight; ctx.fillStyle = '#0B0F0D'; ctx.fillRect(0, 0, c.width, c.height);
    drops = []; for(var i = 0, n = Math.ceil(c.width / step); i < n; i++) drops.push({ x:i*step, y:-Math.random()*80, wait:Math.floor(Math.random()*6)+3, w:0, h:[] });
  }
  setup(); addEventListener('resize', setup);
  setInterval(function(){
    if(document.hidden) return;
    ctx.fillStyle = 'rgba(11,15,13,0.25)'; ctx.fillRect(0, 0, c.width, c.height);
    drops.forEach(function(d){
      if(d.y > 0){
        for(var j = 0; j < d.h.length; j++){
          var yp = (Math.floor(d.y) - j) * cellH; if(yp < 0) break;
          ctx.save(); ctx.translate(d.x, 0); ctx.scale(1.2, 1);
          ctx.font = fs + "px 'VT323'";
          ctx.fillStyle = j === 0 ? '#c9d6c6' : 'rgba(120,152,115,' + Math.max(0, 0.9 - j*0.05) + ')';
          ctx.fillText(d.h[j], 0, yp); ctx.restore();
        }
      }
      if(++d.w >= d.wait){ d.w = 0; d.y += 1; d.h.unshift(ABC.charAt(Math.floor(Math.random()*ABC.length))); if(d.h.length > 24) d.h.pop(); }
      if(d.y * cellH > c.height + 500){ d.y = -Math.random()*30; d.h = []; }
    });
  }, 1000/18);
})();

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

/* ── кабинет: кнопки появляются, когда программа запущена на сервере ── */
var tries = 0;
function wire(){
  var A = window.JotunAccount;
  if(A && A.enabled){
    [].forEach.call(document.querySelectorAll('[data-cab]'), function(b){
      b.hidden = false; b.textContent = A.me ? 'Открыть кабинет' : 'Войти в кабинет'; b.onclick = A.open;
    });
    if(A.me && A.me !== meData){ meData = A.me; render(); }
    if(!A.me && tries < 30){ tries++; setTimeout(wire, 700); }
    return;
  }
  if(++tries < 20) setTimeout(wire, 500);
}
wire();
})();
