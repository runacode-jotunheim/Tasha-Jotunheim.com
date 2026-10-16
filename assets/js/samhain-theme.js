/* ══ Тема «Самайн»: оранжевая пилюля, доступна 20.10–15.11 ══
   Фон-картина + мерцание фонарей и тыкв + туман + падающие листья.
   Подключается в конце <body> после основных скриптов страницы. */
(function(){
'use strict';

var KEY = 'jv_theme';
var ACCENT = '#ff8c26', ACCENT_DIM = '#cc6a12';
var BASE = (function(){ var s = document.currentScript && document.currentScript.src; return s ? s.replace(/assets\/js\/samhain-theme\.js.*$/, '') : '/'; })();

function inSeason(){
  try{
    if(/[?&]samhain=1/.test(location.search)) localStorage.setItem('sm_preview', '1');
    if(/[?&]samhain=0/.test(location.search)) localStorage.removeItem('sm_preview');
    if(localStorage.getItem('sm_preview') === '1') return true;
  }catch(e){}
  var d = new Date(), m = d.getMonth() + 1, day = d.getDate();
  return (m === 10 && day >= 20) || (m === 11 && day <= 15);
}
function lsGet(){ try{ return localStorage.getItem(KEY); }catch(e){ return null; } }
function lsSet(v){ try{ localStorage.setItem(KEY, v); }catch(e){} }

var SEASON = inSeason();
if(!SEASON){ if(lsGet() === 'orange') lsSet('green'); return; }
document.documentElement.classList.add('sm-season');

/* координаты огней на картинах (в пикселях исходника): x, y, радиус */
var IMG = {
  d:{ w:1672, h:941, src:'assets/img/samhain/bg-desktop',
      lights:[[337,195,70],[422,310,46],[383,440,26],[552,480,18],[1453,225,70],[1305,335,46],[1186,478,16],[1066,535,10],[660,615,10],
              [155,755,120],[262,665,85],[512,665,55],[570,697,45],[1520,665,120],[1400,712,60],[1270,735,70],[1270,612,45],[1380,553,40]] },
  m:{ w:941, h:1672, src:'assets/img/samhain/bg-mobile',
      lights:[[230,385,80],[176,620,40],[908,500,32],[810,650,46],[234,925,36],[313,968,26],[358,1035,16],[733,855,30],[772,1065,40],
              [98,1170,130],[255,1220,62],[866,1215,85],[770,1265,48],[680,1050,40],[650,1058,20],[358,1088,32],[580,1155,16]] }
};

var scene, stage, leaves, cur = null, raf = 0;

function build(){
  if(scene) return;
  scene = document.createElement('div'); scene.id = 'sm-scene'; scene.setAttribute('aria-hidden', 'true');
  stage = document.createElement('div'); stage.id = 'sm-stage';
  scene.appendChild(stage);
  var fogA = document.createElement('div'); fogA.className = 'sm-fog';
  var fogB = document.createElement('div'); fogB.className = 'sm-fog b';
  var shade = document.createElement('div'); shade.id = 'sm-shade';
  leaves = document.createElement('canvas'); leaves.id = 'sm-leaves';
  scene.appendChild(fogA); scene.appendChild(fogB); scene.appendChild(shade); scene.appendChild(leaves);
  document.body.insertBefore(scene, document.body.firstChild);
  // цвет сигила клуба: чёрный → #431410 (как видно на сигиле) → #73221a
  var fx = document.createElement('div');
  fx.setAttribute('aria-hidden','true');
  fx.style.cssText = 'position:absolute;width:0;height:0;overflow:hidden';
  fx.innerHTML = '<svg width="0" height="0"><filter id="smWine" color-interpolation-filters="sRGB">'
    + '<feColorMatrix type="matrix" values=".3 .59 .11 0 0 .3 .59 .11 0 0 .3 .59 .11 0 0 0 0 0 1 0"/>'
    + '<feComponentTransfer>'
    + '<feFuncR type="table" tableValues="0 .28 .45 .5"/>'
    + '<feFuncG type="table" tableValues="0 .083 .133 .15"/>'
    + '<feFuncB type="table" tableValues="0 .067 .107 .12"/>'
    + '</feComponentTransfer></filter></svg>';
  document.body.appendChild(fx);
  addEventListener('resize', layout);
}

function layout(){
  if(!scene) return;
  var vw = innerWidth, vh = innerHeight;
  var want = (vw / vh < 0.9) ? 'm' : 'd';
  var cfg = IMG[want];
  if(cur !== want){
    cur = want;
    stage.innerHTML = '<picture><source type="image/webp" srcset="' + BASE + cfg.src + '.webp"><img alt="" src="' + BASE + cfg.src + '.jpg"></picture>';
    cfg.lights.forEach(function(L){
      var g = document.createElement('i'); g.className = 'sm-glow';
      g.style.left = (L[0] / cfg.w * 100) + '%'; g.style.top = (L[1] / cfg.h * 100) + '%';
      g.style.width = g.style.height = (L[2] * 2 / cfg.w * 100) + '%';
      g.style.setProperty('--d', (2.2 + Math.random() * 2.6).toFixed(2) + 's');
      g.style.setProperty('--dl', (-Math.random() * 4).toFixed(2) + 's');
      stage.appendChild(g);
    });
  }
  var k = Math.max(vw / cfg.w, vh / cfg.h);
  stage.style.width = Math.ceil(cfg.w * k) + 'px';
  stage.style.height = Math.ceil(cfg.h * k) + 'px';
  sizeLeaves();
}

/* ── листья ── */
var L = [], ctx, dpr = 1, lastT = 0;
var COLS = [['#c2410c','#ffb347'],['#9a2a10','#ff7a1a'],['#7c1d0e','#e0561a'],['#b45309','#fcd34d'],['#8f2a14','#f59e0b'],['#a83210','#ff9a3a']];
function sizeLeaves(){
  if(!leaves) return;
  dpr = Math.min(2, devicePixelRatio || 1);
  leaves.width = innerWidth * dpr; leaves.height = innerHeight * dpr;
  ctx = leaves.getContext('2d'); ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  var n = innerWidth < 700 ? 16 : 30;
  while(L.length < n) L.push(newLeaf(true));
  L.length = n;
}
function newLeaf(anywhere){
  var s = 11 + Math.random() * 15, cc = COLS[(Math.random() * COLS.length) | 0];
  var o = { x:Math.random() * innerWidth, y:anywhere ? Math.random() * innerHeight : -30, s:s,
    vy:14 + Math.random() * 22, sway:20 + Math.random() * 40, ph:Math.random() * 6.28, fr:.4 + Math.random() * .9,
    rot:Math.random() * 6.28, vr:(Math.random() - .5) * 1.6, flip:Math.random() * 6.28,
    c:cc[0], c2:cc[1], a:.6 + Math.random() * .35, maple:false, star:false };
  var r = Math.random(); if(r < .3) o.star = true; else if(r < .72) o.maple = true;
  return o;
}
var MAPLE = [[0,-1],[.1,-.74],[.26,-.84],[.2,-.5],[.5,-.66],[.46,-.46],[.84,-.52],[.62,-.24],[.78,-.1],[.44,-.04],[.5,.16],[.16,.12],[.06,.42],[0,.42]];
function leafPath(f){
  var s = f.s;
  ctx.beginPath();
  if(f.star){
    for(var q = 0; q < 5; q++){ var a1 = -Math.PI / 2 + q * Math.PI * 2 / 5, a2 = a1 + Math.PI / 5; ctx.lineTo(Math.cos(a1) * s, Math.sin(a1) * s); ctx.lineTo(Math.cos(a2) * s * .42, Math.sin(a2) * s * .42); }
  } else if(f.maple){
    var P = MAPLE;
    ctx.moveTo(P[0][0] * s, P[0][1] * s);
    for(var i = 1; i < P.length; i++) ctx.lineTo(P[i][0] * s, P[i][1] * s);
    for(var j = P.length - 1; j >= 1; j--) ctx.lineTo(-P[j][0] * s, P[j][1] * s);
  } else {
    ctx.moveTo(0, -s);
    ctx.bezierCurveTo(s * .55, -s * .55, s * .5, s * .35, 0, s * .62);
    ctx.bezierCurveTo(-s * .5, s * .35, -s * .55, -s * .55, 0, -s);
  }
  ctx.closePath();
}
function drawLeaf(f){
  ctx.save();
  ctx.translate(f.x + Math.sin(f.ph) * f.sway, f.y);
  ctx.rotate(f.rot);
  ctx.scale(Math.cos(f.flip) * .85 + (Math.cos(f.flip) >= 0 ? .15 : -.15), 1);
  ctx.globalAlpha = f.a;
  var s = f.s, g = ctx.createRadialGradient(0, -s * .1, s * .1, 0, 0, s * 1.1);
  g.addColorStop(0, f.c2); g.addColorStop(1, f.c);
  leafPath(f); ctx.fillStyle = g; ctx.fill();
  if(f.star){ ctx.restore(); return; }
  ctx.lineWidth = .45; ctx.strokeStyle = 'rgba(70,20,5,.16)';
  ctx.beginPath();
  if(f.maple){
    ctx.moveTo(0, s * .8); ctx.lineTo(0, -s * .85);
    ctx.moveTo(0, s * .05); ctx.lineTo(s * .7, -s * .45); ctx.moveTo(0, s * .05); ctx.lineTo(-s * .7, -s * .45);
    ctx.moveTo(0, s * .2); ctx.lineTo(s * .42, s * .08); ctx.moveTo(0, s * .2); ctx.lineTo(-s * .42, s * .08);
  } else {
    ctx.moveTo(0, s * .9); ctx.lineTo(0, -s * .9);
    for(var k = -2; k <= 2; k++){ var y = k * s * .28; ctx.moveTo(0, y); ctx.lineTo(s * .32, y - s * .2); ctx.moveTo(0, y); ctx.lineTo(-s * .32, y - s * .2); }
  }
  ctx.stroke();
  ctx.restore();
}
function tick(t){
  raf = requestAnimationFrame(tick);
  if(document.hidden || !ctx){ lastT = t; return; }
  var dt = Math.min(.05, (t - (lastT || t)) / 1000); lastT = t;
  ctx.clearRect(0, 0, innerWidth, innerHeight);
  for(var i = 0; i < L.length; i++){
    var f = L[i];
    f.y += f.vy * dt; f.ph += f.fr * dt; f.rot += f.vr * dt; f.flip += 1.3 * dt;
    if(f.y > innerHeight + 30){ L[i] = newLeaf(false); continue; }
    drawLeaf(f);
  }
}



/* ── призрак: выглядывает то слева, то справа; по клику говорит фразу ── */
var ghostT = 0, ghostLeft = Math.random() < .5, ghostLayer = null, phraseI = Math.floor(Math.random() * 5);
var PHRASES = [
  'Бу! Завеса между мирами сегодня тоньше паутинки…',
  'Зажги свечу в окне — чтобы свои нашли дорогу домой.',
  'Мёртвые не забыты. Я, например, заглянул в гости!',
  'Благословен будь! Пусть урожай наполнит твоё сердце.',
  'Счастливого Самайна! Только не пугайся — я добрый.'
];
var GHOST = '<svg viewBox="0 0 80 100" aria-hidden="true">'
  + '<path d="M12 38C12 16 26 4 40 4s28 12 28 34c0 20-6 34-14 44-6 8-14 12-24 15 6-8 8-14 4-19C22 72 12 58 12 38z" fill="#fff"/>'
  + '<path d="M16 54c-9-2-12-9-9-14 4 5 8 7 12 8z" fill="#fff"/>'
  + '<ellipse cx="30" cy="34" rx="5" ry="7" fill="#1b0d0d"/><ellipse cx="50" cy="34" rx="5" ry="7" fill="#1b0d0d"/>'
  + '<circle cx="31.6" cy="31.5" r="1.7" fill="#fff"/><circle cx="51.6" cy="31.5" r="1.7" fill="#fff"/>'
  + '<ellipse cx="23" cy="45" rx="4" ry="2.4" fill="#ffb3b3" opacity=".55"/><ellipse cx="57" cy="45" rx="4" ry="2.4" fill="#ffb3b3" opacity=".55"/>'
  + '<path d="M34 46q6 7 12 0" fill="none" stroke="#1b0d0d" stroke-width="2.4" stroke-linecap="round"/></svg>';
function spawnGhost(){
  if(!scene || !document.documentElement.classList.contains('samhain') || document.hidden) return;
  if(ghostLayer && ghostLayer.querySelector('.sm-ghost')) return;
  if(!ghostLayer){ ghostLayer = document.createElement('div'); ghostLayer.id = 'sm-ghosts'; document.body.appendChild(ghostLayer); }
  ghostLeft = !ghostLeft;
  var left = ghostLeft, g = document.createElement('div');
  var size = innerWidth < 700 ? 54 + Math.random() * 16 : 82 + Math.random() * 22;
  g.className = 'sm-ghost ' + (left ? 'l' : 'r');
  g.style.width = size + 'px'; g.style.top = (22 + Math.random() * 40) + '%';
  g.style.setProperty('--dx', (left ? 1 : -1) * (size * 1.25) + 'px');
  g.innerHTML = GHOST + '<div class="sm-say"></div>';
  g.setAttribute('role', 'button'); g.setAttribute('aria-label', 'Призрак Самайна');
  var kill = setTimeout(function(){ g.remove(); }, 9000);
  var talkT = 0;
  function bye(){ clearTimeout(talkT); g.classList.remove('talk'); g.classList.add('bye'); setTimeout(function(){ g.remove(); }, 1200); }
  g.addEventListener('click', function(e){
    e.stopPropagation();
    if(g.classList.contains('bye')) return;
    if(g.classList.contains('talk')){ bye(); return; }   // повторный клик — убрать фразу
    clearTimeout(kill);
    g.querySelector('.sm-say').textContent = PHRASES[phraseI++ % PHRASES.length];
    g.classList.add('talk');
    talkT = setTimeout(bye, 5000);
  });
  ghostLayer.appendChild(g);
}
// первый — после 2.5 с без скролла; дальше не чаще раза в минуту и тоже только когда страница 2.5 с не листается
var GHOST_EVERY = 60000, GHOST_IDLE = 2500, lastGhost = 0, lastScroll = Date.now();
['scroll','wheel','touchmove','touchstart'].forEach(function(ev){ addEventListener(ev, function(){ lastScroll = Date.now(); }, {passive:true}); });
function ghostLoop(){ clearInterval(ghostT); ghostT = setInterval(function(){
  var now = Date.now();
  if(lastGhost && now - lastGhost < GHOST_EVERY) return;
  if(now - lastScroll < GHOST_IDLE) return;
  if(ghostLayer && ghostLayer.querySelector('.sm-ghost')) return;
  spawnGhost(); if(ghostLayer && ghostLayer.querySelector('.sm-ghost')) lastGhost = now;
}, 500); }

/* перекраска зелёного в оранжевый: копия стилей страницы с заменой цветов + inline-стили */
var RE = [[/rgba\(\s*0\s*,\s*255\s*,\s*65\s*,/g, 'rgba(255,140,38,'], [/#00ff41/gi, '#ff8c26'], [/#00cc35/gi, '#cc6a12'],
          [/#28ff6e/gi, '#ff9a3a'], [/rgba\(\s*40\s*,\s*255\s*,\s*110\s*,/g, 'rgba(255,150,50,'], [/rgba\(\s*0\s*,\s*30\s*,\s*8\s*,/g, 'rgba(30,8,0,'],
          [/#00661a/gi, '#663000'], [/#008f11/gi, '#8f4a00'], [/#c8ffda/gi, '#f3e3cf'], [/rgba\(\s*200\s*,\s*255\s*,\s*218\s*,/g, 'rgba(243,227,207,']];
function recolor(t){ for(var i = 0; i < RE.length; i++) t = t.replace(RE[i][0], RE[i][1]); return t; }
var recolorEl = null, inlineSaved = [];
function setRecolor(on){
  if(on && !recolorEl){
    var css = '';
    [].forEach.call(document.querySelectorAll('style'), function(st){ if(st.id !== 'sm-recolor' && /0\s*,\s*255\s*,\s*65|00ff41|00cc35|c8ffda|200\s*,\s*255\s*,\s*218/i.test(st.textContent)) css += recolor(st.textContent) + '\n'; });
    recolorEl = document.createElement('style'); recolorEl.id = 'sm-recolor'; recolorEl.textContent = css;
    document.head.appendChild(recolorEl);
    [].forEach.call(document.querySelectorAll('[style]'), function(el){
      var v = el.getAttribute('style'); if(!/0\s*,\s*255\s*,\s*65|00ff41|00cc35|c8ffda|200\s*,\s*255\s*,\s*218/i.test(v)) return;
      inlineSaved.push([el, v]); el.setAttribute('style', recolor(v));
    });
  } else if(!on && recolorEl){
    recolorEl.remove(); recolorEl = null;
    inlineSaved.forEach(function(p){ p[0].setAttribute('style', p[1]); }); inlineSaved = [];
  }
}

function apply(on){
  var root = document.documentElement;
  if(on){
    build(); layout();
    root.classList.add('samhain'); setRecolor(true);
    root.style.setProperty('--green', ACCENT); root.style.setProperty('--green-dim', ACCENT_DIM);
    root.style.setProperty('--accent', ACCENT);
    root.style.setProperty('--accent-dim', ACCENT_DIM);
    lastScroll = Date.now(); ghostLoop();
    if(!raf && !(matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches)) raf = requestAnimationFrame(tick);
  } else {
    root.classList.remove('samhain'); setRecolor(false);
    root.style.removeProperty('--green'); root.style.removeProperty('--green-dim');
    if(raf){ cancelAnimationFrame(raf); raf = 0; }
    clearInterval(ghostT); if(ghostLayer) ghostLayer.innerHTML = '';
  }
  if(window.onSamhainTheme) window.onSamhainTheme(on);
}

/* третья кнопка в пилюле */
function addPill(){
  var box = document.getElementById('pillChoices'); if(!box || box.querySelector('.orange')) return;
  var b = document.createElement('div'); b.className = 'pill-btn'; b.title = 'Самайн';
  b.addEventListener('click', function(e){
    e.stopPropagation(); lsSet('orange'); apply(true); box.classList.remove('open');
  });
  box.addEventListener('click', function(e){
    var t = e.target.closest && e.target.closest('.pill-btn'); if(t && t !== b) apply(false);
  }, true);
  b.innerHTML = '<div class="pill-icon orange"></div>';
  box.insertBefore(b, box.firstChild);
}

var orig = window.setTheme;
window.setTheme = function(t){
  if(t === 'orange'){
    lsSet('orange'); apply(true);
    var c = document.getElementById('pillChoices'); if(c) c.classList.remove('open');
    return;
  }
  apply(false);
  if(orig) orig(t);
};

addPill();
if(lsGet() === 'orange') apply(true);
})();
