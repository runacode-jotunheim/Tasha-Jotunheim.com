/* Клуб Йотунов: матрица, эффекты, таблица рангов, кабинет */
(function(){
'use strict';

/* ── цвет фона по рангу посетителя (гость — зелёный) ── */
var TINTS = [
  [0,255,65],    // Мини-Йотун
  [0,235,150],   // Йотун
  [0,215,210],   // Старший Йотун
  [60,170,255],  // Ёрмунганд
  [175,140,255], // Йотун Хель
  [255,120,40],  // Йотун Локи
  [185,230,255], // Йотун Имир
  [255,210,60]   // Бергельмир
];
var tint = TINTS[0];
function setRank(i){
  i = Math.max(0, Math.min(7, i|0));
  tint = TINTS[i];
  document.documentElement.style.setProperty('--tint', tint.join(','));
  markMe(i);
}

/* ── матрица из рун, как на главной ── */
function matrix(){
  var c = document.getElementById('mx'); if(!c) return;
  var ctx = c.getContext('2d');
  var ABC = 'ᚠᚢᚦᚨᚱᚲᚷᚹᚺᚾᛁᛃᛇᛈᛉᛋᛏᛒᛖᛗᛚᛜᛟᛞ';
  var SECRET = ['JOTUNHEIM','CLUB','JOTUN'];
  var mob, cellH, step, fs, drops = [];
  function setup(){
    mob = innerWidth < 768; cellH = mob ? 18 : 24; step = mob ? 14 : 20; fs = mob ? 14 : 22;
    c.width = innerWidth; c.height = innerHeight;
    ctx.fillStyle = '#000'; ctx.fillRect(0, 0, c.width, c.height);
    var n = Math.ceil(c.width / step); drops = [];
    for(var i = 0; i < n; i++){
      var z = Math.random();
      drops.push({ x:i*step, y:-Math.random()*60, size:Math.floor(z*4)+fs, wait:Math.floor(Math.random()*5)+1, w:0,
        op:z*0.8+0.2, hist:[], secret:'', si:0 });
    }
  }
  setup(); addEventListener('resize', setup);
  function col(idx){
    if(idx === 0) return 'rgb(' + Math.round(tint[0]*0.133+136) + ',' + Math.round(tint[1]*0.133+136) + ',' + Math.round(tint[2]*0.133+136) + ')';
    var k = idx < 6 ? 0.56 : Math.max(0, 0.78 - idx*0.05);
    return 'rgb(' + Math.round(tint[0]*k) + ',' + Math.round(tint[1]*k) + ',' + Math.round(tint[2]*k) + ')';
  }
  function draw(){
    if(document.hidden) return;
    ctx.fillStyle = 'rgba(0,0,0,0.22)'; ctx.fillRect(0, 0, c.width, c.height);
    for(var i = 0; i < drops.length; i++){
      var d = drops[i];
      if(d.y > 0){
        var cy = Math.floor(d.y);
        for(var j = 0; j < d.hist.length; j++){
          var ch = d.hist[j]; if(!ch) continue;
          var yp = (cy - j) * cellH; if(yp < 0) break;
          ctx.save(); ctx.translate(d.x, 0);
          ctx.scale(/[A-Z]/.test(ch) ? 0.85 : 1.2, 1);
          ctx.font = d.size + "px 'VT323'"; ctx.globalAlpha = d.op;
          if(j === 0){ ctx.shadowBlur = 5; ctx.shadowColor = 'rgb(' + Math.round(tint[0]*0.4) + ',' + Math.round(tint[1]*0.4) + ',' + Math.round(tint[2]*0.4) + ')'; } else ctx.shadowBlur = 0;
          ctx.fillStyle = col(j); ctx.fillText(ch, 0, yp); ctx.restore();
        }
        ctx.globalAlpha = 1;
      }
      if(++d.w >= d.wait){
        d.w = 0; d.y += 1;
        if(!d.secret && Math.random() < 0.0012){ d.secret = SECRET[Math.floor(Math.random()*SECRET.length)]; d.si = 0; }
        var nc;
        if(d.secret){ nc = d.secret[d.si++]; if(d.si >= d.secret.length) d.secret = ''; }
        else nc = ABC.charAt(Math.floor(Math.random()*ABC.length));
        d.hist.unshift(nc); if(d.hist.length > 40) d.hist.pop();
      }
      if(d.y*cellH > c.height + 600){ d.y = -Math.random()*20; d.hist = []; d.secret = ''; }
    }
  }
  setInterval(draw, 1000/24);
}

/* ── заголовок проявляется рунами ── */
function scramble(){
  var CH = 'ᚠᚢᚦᚨᚱᚲᚷᚹᚺᚾᛁᛃᛇᛈᛉᛋᛏᛒᛖᛗᛚᛜᛞᛟ';
  [].forEach.call(document.querySelectorAll('#h1 span'), function(line, li){
    var fin = line.textContent, len = fin.length, f = 0, max = 20;
    line.textContent = fin.replace(/\S/g, function(){ return CH[Math.floor(Math.random()*CH.length)]; });
    setTimeout(function(){
      var iv = setInterval(function(){
        f++; var r = Math.floor(f / max * len), out = '';
        for(var i = 0; i < len; i++) out += (i < r || fin[i] === ' ') ? fin[i] : CH[Math.floor(Math.random()*CH.length)];
        line.textContent = out;
        if(r >= len){ line.textContent = fin; clearInterval(iv); }
      }, 40);
    }, 250 + li * 280);
  });
}

/* ── появление блоков и счётчики ── */
function countUp(el){
  var to = +el.getAttribute('data-count'), pre = el.getAttribute('data-pre') || '', suf = el.getAttribute('data-suf') || '';
  var t0 = performance.now(), dur = 1100;
  (function tick(t){
    var k = Math.min(1, (t - t0) / dur); k = 1 - Math.pow(1 - k, 3);
    el.textContent = pre + Math.round(to * k).toLocaleString('ru-RU') + suf;
    if(k < 1) requestAnimationFrame(tick);
  })(t0);
}
function reveal(){
  var els = document.querySelectorAll('.rv');
  if(!('IntersectionObserver' in window)){ [].forEach.call(els, function(e){ e.classList.add('in'); }); return; }
  var io = new IntersectionObserver(function(list){
    list.forEach(function(en){
      if(!en.isIntersecting) return;
      var el = en.target; io.unobserve(el);
      var sib = el.parentNode ? [].indexOf.call(el.parentNode.children, el) : 0;
      el.style.transitionDelay = Math.min(sib, 4) * 90 + 'ms';
      el.classList.add('in');
      var n = el.querySelector('[data-count]'); if(n) countUp(n);
    });
  }, { threshold:0.12, rootMargin:'0px 0px -30px 0px' });
  [].forEach.call(els, function(e){ io.observe(e); });
}

/* ── таблица рангов ── */
var RANKS = [
  ['Мини-Йотун',3],['Йотун',3],['Старший Йотун',5],['Ёрмунганд',5],
  ['Йотун Хель',7],['Йотун Локи',7],['Йотун Имир',10],['Бергельмир',15]
];
var JC = '<span class="jc">JC</span>';
var G = '🎁';
function from(i, v){ var a = []; for(var k = 0; k < 8; k++) a.push(k >= i ? (v || '✓') : '—'); return a; }
function only(map){ var a = []; for(var k = 0; k < 8; k++) a.push(map[k] || '—'); return a; }
var ROWS = [
  { g:'Как получить' },
  { n:'Через друзей', v:[{t:'первая покупка'},{t:'5 друзей',s:'каждый от 7 000 ₽'},{t:'10 друзей',s:'каждый от 7 000 ₽'},{t:'15 друзей',s:'каждый от 10 000 ₽'},{t:'20 друзей',s:'каждый от 15 000 ₽'},{t:'25 друзей',s:'каждый от 15 000 ₽'},{t:'30 друзей',s:'каждый от 20 000 ₽'},{t:'40 друзей',s:'каждый от 25 000 ₽'}] },
  { n:'Через свои покупки', s:'на общую сумму', v:[{t:'первая покупка'},{t:'24 000 ₽',s:'от 3 артефактов'},{t:'50 000 ₽'},{t:'75 000 ₽'},{t:'100 000 ₽'},{t:'150 000 ₽',s:'+ 3 друга, каждый от 10 000 ₽'},{t:'250 000 ₽',s:'+ 5 друзей, каждый от 15 000 ₽'},{t:'300 000 ₽',s:'+ 15 друзей, каждый от 20 000 ₽'}] },
  { g:'Скидка навсегда' },
  { n:'На всю продукцию', s:'артефакты, ритуалы, консультации', v:['3%','3%','5%','5%','7%','7%','10%','15%'], cls:'pct' },
  { n:'На обучение', v:only({7:{t:'15%',c:'new'}}) },
  { g:'ЙотунКоины' },
  { n:'За каждого нового друга', s:'единоразово, покупка от 10 000 ₽', v:[{t:'+1 000',c:'g'},{t:'+1 000',c:'g'},{t:'+1 500',c:'g'},{t:'+1 500',c:'g'},{t:'+2 000',c:'g'},{t:'+2 000',c:'g'},{t:'+2 500',c:'g'},{t:'+3 000',c:'g'}] },
  { g:'Привилегии' },
  { n:'Привилегии при брони места на обучение', v:from(2) },
  { n:'Приоритет на закрытые ритуалы', v:from(3) },
  { n:'Закрытый канал «Настоящие Йотуны»', v:from(4) },
  { n:'Индивидуальное обучение рунам', s:'на особых условиях', v:from(5) },
  { g:'Подарки на новой ступени' },
  { n:'ЙотунКоины (' + JC + ')', v:only({1:{t:'+500',c:'g'},2:{t:'+1 000',c:'g'},3:{t:'+1 500',c:'g'},4:{t:'+2 000',c:'g'},5:{t:'+3 000',c:'g'},6:{t:'+3 500',c:'g'},7:{t:'+5 000',c:'g'}}) },
  { n:'5 000 ₽ на консультацию', v:only({1:G,2:G,3:G}) },
  { n:'Артефакт из коллекции до 15 000 ₽', v:only({4:G,5:G,6:G,7:G}) },
  { n:'Консультация 60 мин бесплатно', v:only({5:G,6:G,7:G}) },
  { n:'Индивидуальный ритуал открытия дорог', v:only({6:G,7:G}) },
  { n:'Персональный артефакт', v:only({7:G}) }
];
function cell(v, prev, cls){
  if(v === '—') return '<td class="no">—</td>';
  if(v === '✓') return '<td class="y">✓</td>';
  if(typeof v === 'string'){
    var c = (cls === 'pct' && v !== prev) ? 'new' : '';
    return '<td class="' + c + '">' + v + '</td>';
  }
  return '<td class="' + (v.c || 'new') + '">' + v.t + (v.s ? '<small>' + v.s + '</small>' : '') + '</td>';
}
function table(){
  var t = document.getElementById('tbl'); if(!t) return;
  var h = '<thead><tr><th>Ранг</th>' + RANKS.map(function(r, i){
    return '<th data-i="' + i + '"><span class="rk-step">' + String(i+1).padStart(2,'0') + '</span><span class="rk-name">' + r[0] + '</span><span class="rk-pct">' + r[1] + '%</span></th>';
  }).join('') + '</tr></thead><tbody>';
  ROWS.forEach(function(row){
    if(row.g){ h += '<tr class="grp"><td>' + row.g + '</td><td colspan="8"></td></tr>'; return; }
    h += '<tr><td>' + row.n + (row.s ? '<small style="display:block;color:var(--faint);font-size:10px">' + row.s + '</small>' : '') + '</td>';
    row.v.forEach(function(v, i){ h += cell(v, i ? row.v[i-1] : null, row.cls); });
    h += '</tr>';
  });
  t.innerHTML = h + '</tbody>';
}
function markMe(i){
  var t = document.getElementById('tbl'); if(!t) return;
  [].forEach.call(t.querySelectorAll('.me'), function(e){ e.classList.remove('me'); });
  if(i == null) return;
  [].forEach.call(t.rows, function(r){
    if(r.classList.contains('grp')) return;
    var c = r.cells[i + 1]; if(c) c.classList.add('me');
  });
}

/* ── кабинет и счётчик участников (оживают после запуска сервера программы) ── */
var MIN_MEMBERS = 30; // меньше — счётчик не показываем
var tries = 0, statsDone = false;
function wire(){
  var A = window.JotunAccount;
  if(A && A.enabled){
    [].forEach.call(document.querySelectorAll('[data-cab-main]'), function(b){
      b.classList.remove('wait'); b.textContent = A.me ? 'Открыть кабинет' : 'Вступить в клуб'; b.onclick = A.open;
    });
    var tb = document.querySelector('[data-cab]'); if(tb){ tb.hidden = false; tb.onclick = A.open; }
    if(A.me && A.me.rank && !preview) setRank(A.me.rank.index);
    if(!statsDone){ statsDone = true; fetch(A.apiBase + '/api/club/stats').then(function(r){ return r.json(); }).then(function(s){
      if(s && s.members >= MIN_MEMBERS){
        document.getElementById('members-n').textContent = s.members.toLocaleString('ru-RU');
        document.getElementById('members').hidden = false;
      }
    }).catch(function(){}); }
    if(!A.me && tries < 30){ tries++; setTimeout(wire, 700); } // ждём, пока подгрузится профиль
    return;
  }
  if(++tries < 20) setTimeout(wire, 500);
}

/* предпросмотр цвета ранга: /program/?rank=0..7 */
var preview = null;
try{ var q = new URLSearchParams(location.search).get('rank'); if(q !== null && q !== '') preview = +q; }catch(e){}

table();
if(preview !== null) setRank(preview);
matrix();
scramble();
reveal();
wire();
})();
