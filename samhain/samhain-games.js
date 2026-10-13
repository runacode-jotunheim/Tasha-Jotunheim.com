/* ══════════════════════════════════════════════
   ИГРЫ САМАЙНА: хаб + «Погост» + «Джек-бегун»
   ══════════════════════════════════════════════ */
(function(){
'use strict';

var DPR = Math.min(window.devicePixelRatio || 1, 2);
function $(id){ return document.getElementById(id); }
function rand(a,b){ return a + Math.random()*(b-a); }
function clamp01(t){ return t < 0 ? 0 : (t > 1 ? 1 : t); }
function lerp(a,b,t){ return a + (b-a)*clamp01(t); }
function vibrate(ms){ try{ if(navigator.vibrate) navigator.vibrate(ms); }catch(e){} }

/* ── Пиксельные спрайты ── */
function makeSprite(rows, pal, outline){
  var h = rows.length, w = rows[0].length, pad = outline ? 1 : 0;
  var c = document.createElement('canvas'); c.width = w + pad*2; c.height = h + pad*2;
  var x = c.getContext('2d');
  function on(i,j){ if(j<0||j>=h||i<0||i>=w) return false; var ch = rows[j].charAt(i); return ch !== '.' && !!pal[ch]; }
  if(outline){
    x.fillStyle = outline;
    for(var oj=-1;oj<=h;oj++) for(var oi=-1;oi<=w;oi++){
      if(on(oi,oj)) continue;
      if(on(oi-1,oj)||on(oi+1,oj)||on(oi,oj-1)||on(oi,oj+1)) x.fillRect(oi+pad, oj+pad, 1, 1);
    }
  }
  for(var j=0;j<h;j++) for(var i=0;i<w;i++){
    if(!on(i,j)) continue;
    x.fillStyle = pal[rows[j].charAt(i)]; x.fillRect(i+pad, j+pad, 1, 1);
  }
  c.pad = pad;
  return c;
}
function blit(c, s, x, y){ c.drawImage(s, x - s.pad, y - s.pad); }

var PUMP = [
  '......G......',
  '.....GG......',
  '..DOOODOOOD..',
  '.DOOOODOOOOD.',
  'DOOYOODOOYOOD',
  'DOYYYODOYYYOD',
  'DOOOOODOOOOOD',
  'DOOYOYOYOYOOD',
  'DOOOYYYYYOOOD',
  '.DOOOODOOOOD.',
  '..DDOODOODD..'
];
var ZOMBIE = [
  'z..........z',
  'Zz........zZ',
  'ZZ..zZZz..ZZ',
  'ZZ.ZZZZZZ.ZZ',
  '.ZZZRZZRZZZ.',
  '..ZZRZZRZZ..',
  '..ZZZZZZZZ..',
  '..ZZKKKKZZ..',
  '...ZKZKZZ...',
  '..CCZZZZCC..',
  '.CCCCCCCCCC.',
  'CCCCCCCCCCCC'
];
var GHOST = [
  '...WWWWW...',
  '..WWWWWWW..',
  '.WWWWWWWWW.',
  '.WWKKWWKKW.',
  'WWWKKWWKKWW',
  'WWWWWWWWWWW',
  'WWWWWKWWWWW',
  'WWWWKKKWWWW',
  'WWWWWWWWWWW',
  'WwWWWWWWWwW',
  'WwwWWwWWwwW',
  'W.wW.w.Ww.W'
];
var STONE = [
  '..SSSSSS..',
  '.SSSSSSSSs',
  'SSXSXSXSSs',
  'SSSXXXSSSs',
  'SSSSXSSSSs',
  'SSSSXSSSSs',
  'SSSSXSSSSs',
  'SSSSSSSSSs',
  'SSSSSSSSSs',
  'SSSSSSSSSs'
];
var CANDY = [
  'T.......T',
  'TTPPpPPTT',
  '.TPpPpPT.',
  'TTPPpPPTT',
  'T.......T'
];
var CROW_A = [
  '...b....b...',
  '...bb..bb...',
  '....bbbb....',
  'YYBRBBBBBB..',
  '..BBBBBBBBBB',
  '....BBBBB...',
  '.....B.B....',
  '............'
];
var CROW_B = [
  '............',
  '............',
  '....BBBB....',
  'YYBRBBBBBB..',
  '..BBBBBBBBBB',
  '...bbBBBbb..',
  '..bb.....bb.',
  '.b.........b'
];
var HERO_TOP = [
  '...HHHH...',
  '..HHHHHH..',
  '.HHHHFFFH.',
  '.HHHFEFEH.',
  '.HHHFFFFH.',
  '..HHHHHH..',
  '.hHHHHHHh.',
  'hhHHHHHHhL',
  '.HHHHHHH.L',
  '.HHHHHHH.L',
  '..HHHHHH..'
];
var HERO_A = HERO_TOP.concat(['..HH..HH..', '.HH....HH.', '.KK....KK.']);
var HERO_B = HERO_TOP.concat(['...HHHH...', '...HH.HH..', '...KK.KK..']);
var HERO_J = HERO_TOP.concat(['..HHHHHH..', '...KKKK...', '..........']);

var HERO_PAL = {H:'#4b2a78', h:'#7a52b8', F:'#f2d7b6', E:'#00ff41', L:'#ffb000', K:'#111111'};
var SPR = {
  pumpkin: makeSprite(PUMP, {O:'#ff7a1a', D:'#b84400', G:'#3fae2a', Y:'#ffe066'}),
  gold:    makeSprite(PUMP, {O:'#ffd233', D:'#a87a00', G:'#3fae2a', Y:'#ffffff'}),
  zombie:  makeSprite(ZOMBIE, {Z:'#6dbb4a', z:'#3c7a2a', R:'#ff2020', K:'#111111', C:'#4a3a7a'}),
  ghost:   makeSprite(GHOST, {W:'#e8fff0', w:'#9fd8b0', K:'#0a0a12'}),
  stone:   makeSprite(STONE, {S:'#5d5d6e', s:'#34343f', X:'#00ff41'}),
  candy:   makeSprite(CANDY, {T:'#ff5fa2', P:'#ff5fa2', p:'#ffffff'}),
  crowA:   makeSprite(CROW_A, {B:'#15151c', b:'#2c2c3a', Y:'#ffb000', R:'#ff2020'}, '#8f86b0'),
  crowB:   makeSprite(CROW_B, {B:'#15151c', b:'#2c2c3a', Y:'#ffb000', R:'#ff2020'}, '#8f86b0'),
  heroA:   makeSprite(HERO_A, HERO_PAL, '#c8ffd8'),
  heroB:   makeSprite(HERO_B, HERO_PAL, '#c8ffd8'),
  heroJ:   makeSprite(HERO_J, HERO_PAL, '#c8ffd8')
};

/* ── Общая оболочка игры ── */
var gameEl = $('sg-game'), canvas = $('sg-canvas'), ctx = canvas.getContext('2d'), stage = $('sg-stage');
var hudScore = $('sg-score'), hudMid = $('sg-mid'), hudLives = $('sg-lives'), hint = $('sg-hint');
var ov = $('sg-ov'), ovTitle = $('sg-ov-title'), ovText = $('sg-ov-text'), ovBtns = $('sg-ov-btns');
var current = null, running = false, last = 0, raf = 0;

function sizeCanvas(w,h){
  canvas.style.width = w + 'px'; canvas.style.height = h + 'px';
  canvas.width = Math.round(w*DPR); canvas.height = Math.round(h*DPR);
}
function setLives(n, max){
  var s = ''; for(var i=0;i<max;i++) s += i < n ? '♥' : '♡';
  hudLives.textContent = s;
}
function showOv(title, html, btns){
  ovTitle.textContent = title; ovText.innerHTML = html; ovBtns.innerHTML = '';
  btns.forEach(function(b){
    var e = document.createElement('button');
    e.className = 'sg-btn' + (b.ghost ? ' ghost' : '');
    e.textContent = b.label;
    e.addEventListener('click', function(ev){ ev.stopPropagation(); b.fn(); });
    ovBtns.appendChild(e);
  });
  ov.classList.add('show');
}
function hideOv(){ ov.classList.remove('show'); }

function openGame(g){
  current = g;
  gameEl.classList.add('open');
  document.documentElement.style.overflow = 'hidden';
  document.body.style.overflow = 'hidden';
  requestAnimationFrame(function(){
    g.setup(); g.reset(); g.draw();
    showOv(g.title, g.rules, [
      {label:'▶ Играть', fn:startGame},
      {label:'К играм', ghost:true, fn:closeGame}
    ]);
  });
}
function startGame(){
  hideOv(); current.reset(); running = true;
  last = performance.now();
  cancelAnimationFrame(raf); raf = requestAnimationFrame(loop);
}
function resumeGame(){
  hideOv(); running = true; last = performance.now();
  cancelAnimationFrame(raf); raf = requestAnimationFrame(loop);
}
function loop(now){
  if(!running) return;
  var dt = Math.min(0.05, (now - last)/1000); last = now;
  current.update(dt);
  if(!current) return;
  current.draw();
  if(running) raf = requestAnimationFrame(loop);
}
function endGame(win){
  running = false;
  var g = current;
  g.draw();
  if(win){
    vibrate([60,40,60]);
    showOv('Победа!', g.winText() + '<div class="sg-code">Здесь будет промокод — подключим при запуске на сайте</div>', [
      {label:'↻ Ещё раз', fn:startGame},
      {label:'К играм', ghost:true, fn:closeGame}
    ]);
  } else {
    showOv('Не вышло', g.loseText(), [
      {label:'↻ Ещё раз', fn:startGame},
      {label:'К играм', ghost:true, fn:closeGame}
    ]);
  }
}
function pauseGame(){
  if(!running) return;
  running = false;
  showOv('Пауза', 'Игра остановлена.', [
    {label:'▶ Продолжить', fn:resumeGame},
    {label:'К играм', ghost:true, fn:closeGame}
  ]);
}
function closeGame(){
  running = false; cancelAnimationFrame(raf); hideOv();
  gameEl.classList.remove('open');
  document.documentElement.style.overflow = '';
  document.body.style.overflow = '';
  current = null;
}

gameEl.addEventListener('pointerdown', function(e){
  if(!running || !current) return;
  if(e.target.closest && e.target.closest('button')) return;
  var r = canvas.getBoundingClientRect();
  current.tap(e.clientX - r.left, e.clientY - r.top);
  e.preventDefault();
}, {passive:false});
document.addEventListener('keydown', function(e){
  if(!current) return;
  if(e.key === 'Escape'){ if(running) pauseGame(); return; }
  if(running && current.key && current.key(e)) e.preventDefault();
});
document.addEventListener('visibilitychange', function(){ if(document.hidden) pauseGame(); });
window.addEventListener('resize', function(){
  if(current){ current.setup(); current.draw(); }
  drawPreviews();
});
$('sg-close').addEventListener('click', function(){ closeGame(); });

/* ── Эффекты ── */
function burst(list, x, y, color, n, spd){
  for(var i=0;i<n;i++){
    var a = Math.random()*Math.PI*2, v = rand(0.4,1)*spd;
    list.push({x:x, y:y, vx:Math.cos(a)*v, vy:Math.sin(a)*v - spd*0.4, life:rand(0.35,0.7), c:color});
  }
}
function stepParticles(list, dt, g){
  for(var i=list.length-1;i>=0;i--){
    var p = list[i]; p.life -= dt;
    if(p.life <= 0){ list.splice(i,1); continue; }
    p.vy += g*dt; p.x += p.vx*dt; p.y += p.vy*dt;
  }
}

/* ══════════════════════════════════════════════
   ПОГОСТ — тапай тыквы, нечисть не трогай
   ══════════════════════════════════════════════ */
function drawGraveCell(c, x0, y0, k, ent, rise, age){
  c.fillStyle = 'rgba(40,70,20,0.10)';
  c.fillRect(x0+1, y0+1, k-2, k-2);
  // надгробие
  var sw = k*0.34, sh = sw;
  c.drawImage(SPR.stone, x0 + k*0.5 - sw/2, y0 + k*0.08, sw, sh);
  // могильный холм и яма
  var hx = x0 + k/2, hy = y0 + k*0.8, rw = k*0.36, rh = k*0.1;
  c.fillStyle = '#2e1e0f';
  c.beginPath(); c.ellipse(hx, hy, rw + k*0.05, rh + k*0.04, 0, 0, Math.PI*2); c.fill();
  c.fillStyle = '#000';
  c.beginPath(); c.ellipse(hx, hy, rw, rh, 0, 0, Math.PI*2); c.fill();
  if(!ent || rise <= 0) return;
  var spr = SPR[ent];
  var sc = (ent === 'ghost' ? k*0.56 : k*0.62) / spr.width;
  var ew = spr.width*sc, eh = spr.height*sc;
  c.save();
  c.beginPath(); c.rect(x0 - k, y0 - k, k*3, hy - y0 + k); c.clip();
  if(ent === 'ghost') c.globalAlpha = 0.6 + 0.3*Math.sin(age*14);
  if(ent === 'pumpkin' || ent === 'gold'){ c.shadowColor = ent === 'gold' ? '#ffd233' : '#ff7a1a'; c.shadowBlur = k*0.3; }
  c.drawImage(spr, hx - ew/2, hy - eh*rise, ew, eh);
  c.restore();
}

var Grave = {
  id:'grave', title:'Погост', GOAL:30, TIME:40, LIVES:3,
  rules:'Из могил лезут тыквы — тапай и собирай.<br><b>Зомби</b> не трогай: −1 жизнь.<br><b>Призрак</b> крадёт 3 секунды.<br><b>Золотая тыква</b> даёт +3.<br><br>Собери <b>30 тыкв за 40 секунд</b>.',
  winText:function(){ return 'Собрано тыкв: <b>' + this.score + '</b> за ' + Math.round(this.TIME - this.time) + ' сек.'; },
  loseText:function(){ return this.lives <= 0 ? 'Зомби забрали все жизни. Тыкв: <b>' + this.score + '</b> из 30.' : 'Время вышло. Тыкв: <b>' + this.score + '</b> из 30.'; },
  setup:function(){
    var r = stage.getBoundingClientRect();
    var n = r.width >= 640 ? 9 : 6;
    if(n !== this.N){ this.N = n; this.cells = null; }
    var s = Math.floor(Math.min(r.width - 16, r.height - 16));
    this.size = s; this.k = s / this.N;
    sizeCanvas(s, s);
    hint.textContent = '';
    if(!this.cells) this.reset();
  },
  reset:function(){
    this.cells = []; for(var i=0;i<this.N*this.N;i++) this.cells.push(null);
    this.score = 0; this.lives = this.LIVES; this.time = this.TIME; this.el = 0;
    this.spawnT = 0.3; this.fx = []; this.txt = []; this.shake = 0; this.flash = 0; this.flashC = '255,32,32';
    this.hud();
  },
  hud:function(){
    hudScore.textContent = '🎃 ' + this.score + '/' + this.GOAL;
    hudMid.textContent = Math.ceil(this.time) + ' с';
    setLives(this.lives, this.LIVES);
  },
  rise:function(e){
    var R = 0.14;
    if(e.age < R) return e.age / R;
    if(e.age > e.stay - R) return Math.max(0, (e.stay - e.age) / R);
    return 1;
  },
  spawnOne:function(p){
    var n = this.cells.length, idx = -1;
    for(var t=0;t<24;t++){ var i = Math.floor(Math.random()*n); if(!this.cells[i]){ idx = i; break; } }
    if(idx < 0) return;
    var r = Math.random(), bad = lerp(0.22, 0.4, p), type;
    if(r < 0.07) type = 'gold';
    else if(r < 0.07 + bad) type = Math.random() < 0.6 ? 'zombie' : 'ghost';
    else type = 'pumpkin';
    var stay = lerp(1.15, 0.6, p) * rand(0.85, 1.15);
    if(type === 'zombie') stay *= 1.25;
    if(type === 'gold') stay *= 0.8;
    this.cells[idx] = {type:type, age:0, stay:stay};
  },
  update:function(dt){
    this.el += dt; this.time -= dt;
    var p = this.el / this.TIME, active = 0, i;
    for(i=0;i<this.cells.length;i++) if(this.cells[i]) active++;
    var maxA = Math.round(lerp(3, 7, p) * (this.N === 9 ? 1.4 : 1));
    this.spawnT -= dt;
    if(this.spawnT <= 0){
      if(active < maxA) this.spawnOne(p);
      this.spawnT = lerp(0.62, 0.26, p) * rand(0.8, 1.2);
    }
    for(i=0;i<this.cells.length;i++){
      var e = this.cells[i];
      if(e){ e.age += dt; if(e.age >= e.stay) this.cells[i] = null; }
    }
    stepParticles(this.fx, dt, this.k*6);
    for(i=this.txt.length-1;i>=0;i--){ var t = this.txt[i]; t.life -= dt; t.y -= dt*this.k*0.8; if(t.life <= 0) this.txt.splice(i,1); }
    this.shake = Math.max(0, this.shake - dt);
    this.flash = Math.max(0, this.flash - dt*2.5);
    if(this.time <= 0) this.time = 0;
    this.hud();
    if(this.score >= this.GOAL) return endGame(true);
    if(this.lives <= 0) return endGame(false);
    if(this.time <= 0) return endGame(false);
  },
  tap:function(x, y){
    var k = this.k, col = Math.floor(x / k), row = Math.floor(y / k);
    if(col < 0 || row < 0 || col >= this.N || row >= this.N) return;
    var i = row*this.N + col, e = this.cells[i];
    if(!e || this.rise(e) < 0.35) return;
    var cx = (col + 0.5)*k, cy = (row + 0.55)*k;
    this.cells[i] = null;
    if(e.type === 'pumpkin'){
      this.score += 1; burst(this.fx, cx, cy, '#ff7a1a', 10, k*2.2);
      this.txt.push({x:cx, y:cy - k*0.2, s:'+1', c:'#ffb35c', life:0.6});
      vibrate(15);
    } else if(e.type === 'gold'){
      this.score += 3; burst(this.fx, cx, cy, '#ffd233', 18, k*2.6);
      this.txt.push({x:cx, y:cy - k*0.2, s:'+3', c:'#ffd233', life:0.8});
      vibrate(25);
    } else if(e.type === 'zombie'){
      this.lives -= 1; this.shake = 0.3; this.flash = 1; this.flashC = '255,32,32';
      burst(this.fx, cx, cy, '#6dbb4a', 12, k*2);
      this.txt.push({x:cx, y:cy - k*0.2, s:'−♥', c:'#ff3b3b', life:0.8});
      vibrate(120);
    } else if(e.type === 'ghost'){
      this.time = Math.max(0, this.time - 3); this.flash = 1; this.flashC = '170,220,255';
      burst(this.fx, cx, cy, '#e8fff0', 12, k*2);
      this.txt.push({x:cx, y:cy - k*0.2, s:'−3с', c:'#cfe8ff', life:0.8});
      vibrate(80);
    }
  },
  draw:function(){
    var c = ctx, s = this.size, k = this.k, N = this.N, i;
    c.setTransform(DPR,0,0,DPR,0,0);
    c.imageSmoothingEnabled = false;
    c.clearRect(0,0,s,s);
    c.save();
    if(this.shake > 0) c.translate(rand(-1,1)*this.shake*14, rand(-1,1)*this.shake*14);
    var g = c.createLinearGradient(0,0,0,s);
    g.addColorStop(0,'#0b0616'); g.addColorStop(1,'#140b07');
    c.fillStyle = g; c.fillRect(-20,-20,s+40,s+40);
    for(var r=0;r<N;r++) for(var cl=0;cl<N;cl++){
      var e = this.cells[r*N+cl];
      drawGraveCell(c, cl*k, r*k, k, e ? e.type : null, e ? this.rise(e) : 0, e ? e.age : 0);
    }
    for(i=0;i<this.fx.length;i++){
      var p = this.fx[i]; c.globalAlpha = Math.min(1, p.life*2); c.fillStyle = p.c;
      var ps = Math.max(2, k*0.06); c.fillRect(p.x, p.y, ps, ps);
    }
    c.globalAlpha = 1;
    c.textAlign = 'center'; c.textBaseline = 'middle';
    c.font = Math.round(k*0.4) + "px 'VT323', monospace";
    for(i=0;i<this.txt.length;i++){
      var t = this.txt[i]; c.globalAlpha = Math.min(1, t.life*2); c.fillStyle = t.c; c.fillText(t.s, t.x, t.y);
    }
    c.globalAlpha = 1;
    c.restore();
    if(this.flash > 0){ c.fillStyle = 'rgba(' + this.flashC + ',' + (this.flash*0.22) + ')'; c.fillRect(0,0,s,s); }
    var v = c.createRadialGradient(s/2,s/2,s*0.35,s/2,s/2,s*0.75);
    v.addColorStop(0,'rgba(0,0,0,0)'); v.addColorStop(1,'rgba(0,0,0,0.5)');
    c.fillStyle = v; c.fillRect(0,0,s,s);
  }
};

/* ══════════════════════════════════════════════
   ДЖЕК-БЕГУН — горизонтальный раннер
   ══════════════════════════════════════════════ */
var GRAV = 900, JUMP1 = 265, JUMP2 = 235;

function drawNightBg(c, LW, LH, G, scroll, t, stars){
  var g = c.createLinearGradient(0,0,0,G);
  g.addColorStop(0,'#05030b'); g.addColorStop(1,'#1a0d26');
  c.fillStyle = g; c.fillRect(0,0,LW,LH);
  for(var i=0;i<stars.length;i++){
    var st = stars[i];
    c.globalAlpha = 0.35 + 0.35*Math.sin(t*2 + st.p);
    c.fillStyle = '#cfffe0'; c.fillRect(st.x, st.y, 1, 1);
  }
  c.globalAlpha = 1;
  // луна
  var mx = LW - 34, my = 28;
  var mg = c.createRadialGradient(mx,my,4,mx,my,30);
  mg.addColorStop(0,'rgba(220,255,210,0.35)'); mg.addColorStop(1,'rgba(220,255,210,0)');
  c.fillStyle = mg; c.fillRect(mx-30,my-30,60,60);
  c.fillStyle = '#e9ffe0'; c.beginPath(); c.arc(mx,my,12,0,Math.PI*2); c.fill();
  c.fillStyle = '#c9e6c0'; c.fillRect(mx-4,my-3,3,3); c.fillRect(mx+3,my+3,2,2);
  // дальние холмы
  c.fillStyle = '#140c24';
  c.beginPath(); c.moveTo(0,G);
  var o1 = scroll*0.15;
  for(var x=0;x<=LW;x+=4){ c.lineTo(x, G - 30 - Math.sin((x+o1)*0.03)*8 - Math.sin((x+o1)*0.071)*4); }
  c.lineTo(LW,G); c.closePath(); c.fill();
  // средний план: мёртвые деревья и надгробия
  var per = 96, o2 = scroll*0.45;
  c.fillStyle = '#1e1433';
  for(var n=-1;n<LW/per+2;n++){
    var bx = n*per - (o2 % per);
    c.fillRect(bx+10, G-34, 3, 34);
    c.fillRect(bx+4, G-28, 8, 2); c.fillRect(bx+4, G-32, 2, 4);
    c.fillRect(bx+13, G-24, 8, 2); c.fillRect(bx+19, G-29, 2, 5);
    c.fillRect(bx+56, G-10, 7, 10); c.fillRect(bx+57, G-12, 5, 2);
    c.fillRect(bx+74, G-14, 2, 14); c.fillRect(bx+71, G-11, 8, 2);
  }
  // земля
  c.fillStyle = '#1a1009'; c.fillRect(0,G,LW,LH-G);
  c.fillStyle = '#1f4a14'; c.fillRect(0,G,LW,2);
  var o3 = scroll % 12;
  c.fillStyle = '#2d6a1c';
  for(var gx=-o3; gx<LW; gx+=12){ c.fillRect(Math.round(gx), G-2, 1, 2); c.fillRect(Math.round(gx)+5, G-1, 1, 1); }
  c.fillStyle = '#2a1a0e';
  var o4 = scroll % 23;
  for(var dx=-o4; dx<LW; dx+=23){ c.fillRect(Math.round(dx), G+7, 2, 1); c.fillRect(Math.round(dx)+11, G+13, 1, 1); }
}

var Runner = {
  id:'runner', title:'Джек-бегун', GOAL:30, LIVES:3, LH:144, G:124,
  rules:'Тап по экрану — прыжок, второй тап в воздухе — двойной прыжок.<br>Перепрыгивай <b>тыквы</b> и <b>низких воронов</b>.<br><b>Высокие вороны</b> ловят тех, кто прыгает дважды.<br><br>Собери <b>30 конфет</b>. 3 удара — конец.',
  winText:function(){ return 'Конфет: <b>' + this.score + '</b>, пробежал ' + Math.floor(this.dist/10) + ' м.'; },
  loseText:function(){ return 'Три удара. Конфет: <b>' + this.score + '</b> из 30, пробежал ' + Math.floor(this.dist/10) + ' м.'; },
  setup:function(){
    var r = stage.getBoundingClientRect();
    var W = r.width - 16, H = r.height - 16;
    var dispW = W, dispH = Math.min(H, W/1.5);
    if(dispW/dispH > 2.2) dispW = dispH*2.2;
    this.dispW = Math.floor(dispW); this.dispH = Math.floor(dispH);
    this.k = this.dispH / this.LH;
    this.LW = Math.round(this.LH * this.dispW / this.dispH);
    sizeCanvas(this.dispW, this.dispH);
    if(!this.stars || this.starsW !== this.LW){
      this.stars = []; this.starsW = this.LW;
      for(var i=0;i<40;i++) this.stars.push({x:Math.floor(Math.random()*this.LW), y:Math.floor(Math.random()*80), p:Math.random()*6});
    }
    hint.textContent = window.innerHeight > window.innerWidth ? 'Поверни телефон — поле будет шире' : '';
    if(!this.hero) this.reset();
  },
  reset:function(){
    this.hero = {x:30, y:this.G-14, vy:0, j:0, inv:0, anim:0};
    this.t = 0; this.speed = 90; this.dist = 0; this.scroll = 0;
    this.obs = []; this.cand = []; this.fx = [];
    this.next = 150; this.score = 0; this.lives = this.LIVES; this.shake = 0;
    this.hud();
  },
  hud:function(){
    hudScore.textContent = '🍬 ' + this.score + '/' + this.GOAL;
    hudMid.textContent = Math.floor(this.dist/10) + ' м';
    setLives(this.lives, this.LIVES);
  },
  jump:function(){
    var h = this.hero;
    if(h.j >= 2) return;
    h.vy = h.j === 0 ? -JUMP1 : -JUMP2; h.j++;
    burst(this.fx, h.x+5, h.y+14, h.j === 2 ? '#00ff41' : '#6b4a2a', 5, 40);
  },
  tap:function(){ this.jump(); },
  key:function(e){
    if(e.code === 'Space' || e.code === 'ArrowUp' || e.code === 'KeyW'){ if(!e.repeat) this.jump(); return true; }
    return false;
  },
  arc:function(cx, y){
    this.cand.push({x:cx-18, y:y+6}, {x:cx-4.5, y:y}, {x:cx+9, y:y+6});
  },
  spawn:function(){
    var G = this.G, x = this.LW + 16, t = this.t, r = Math.random(), type;
    if(t < 6) type = r < 0.75 ? 'pump' : 'crowLow';
    else if(r < 0.38) type = 'pump';
    else if(r < 0.55) type = 'stack';
    else if(r < 0.78) type = 'crowLow';
    else type = 'crowHigh';
    if(type === 'pump'){
      this.obs.push({type:'pump', x:x, y:G-11, w:13, h:11});
      if(Math.random() < 0.6) this.arc(x+6, G-34);
    } else if(type === 'stack'){
      this.obs.push({type:'stack', x:x, y:G-22, w:13, h:22});
      if(Math.random() < 0.5) this.arc(x+6, G-46);
    } else if(type === 'crowLow'){
      this.obs.push({type:'crow', x:x, y:G-16, w:12, h:8, vx:35, f:Math.random()});
      if(Math.random() < 0.5) this.arc(x+6, G-40);
    } else {
      this.obs.push({type:'crow', x:x, y:G-64, w:12, h:8, vx:25, f:Math.random()});
      if(Math.random() < 0.35) this.cand.push({x:x+30, y:G-66});
    }
    this.next = this.speed * rand(0.95, lerp(1.9, 1.35, t/60));
    if(Math.random() < 0.5){
      var mx = x + 6 + this.next*0.5;
      this.cand.push({x:mx-14, y:G-10}, {x:mx, y:G-10}, {x:mx+14, y:G-10});
    }
  },
  update:function(dt){
    var G = this.G, h = this.hero, i;
    this.t += dt;
    this.speed = Math.min(175, 90 + this.t*2.4);
    var dx = this.speed*dt; this.dist += dx; this.scroll += dx;
    h.vy += GRAV*dt; h.y += h.vy*dt;
    if(h.y >= G-14){ h.y = G-14; h.vy = 0; h.j = 0; }
    h.anim += dt; if(h.inv > 0) h.inv -= dt;
    this.next -= dx; if(this.next <= 0) this.spawn();
    var hb = {x:h.x+2, y:h.y+1, w:6, h:13};
    for(i=this.obs.length-1;i>=0;i--){
      var o = this.obs[i];
      o.x -= dx + (o.vx || 0)*dt;
      if(o.type === 'crow'){ o.f += dt; if(o.hit){ o.y -= 120*dt; } }
      if(o.x < -30 || o.y < -20){ this.obs.splice(i,1); continue; }
      if(o.hit || h.inv > 0) continue;
      if(hb.x < o.x+o.w-2 && hb.x+hb.w > o.x+2 && hb.y < o.y+o.h-2 && hb.y+hb.h > o.y+2){
        o.hit = true; this.lives -= 1; h.inv = 1.3; this.shake = 0.25;
        burst(this.fx, h.x+5, h.y+7, '#ff3b3b', 10, 70);
        vibrate(120);
      }
    }
    for(i=this.cand.length-1;i>=0;i--){
      var cd = this.cand[i];
      cd.x -= dx;
      if(cd.x < -12){ this.cand.splice(i,1); continue; }
      if(hb.x-1 < cd.x+9 && hb.x+hb.w+1 > cd.x && hb.y-1 < cd.y+5 && hb.y+hb.h+1 > cd.y){
        this.cand.splice(i,1); this.score += 1;
        burst(this.fx, cd.x+4, cd.y+2, '#ff5fa2', 6, 50);
        vibrate(10);
      }
    }
    stepParticles(this.fx, dt, 200);
    this.shake = Math.max(0, this.shake - dt);
    this.hud();
    if(this.score >= this.GOAL) return endGame(true);
    if(this.lives <= 0) return endGame(false);
  },
  draw:function(){
    var c = ctx, k = this.k, LW = this.LW, LH = this.LH, G = this.G, h = this.hero, i;
    c.setTransform(DPR*k,0,0,DPR*k,0,0);
    c.imageSmoothingEnabled = false;
    c.save();
    if(this.shake > 0) c.translate(rand(-1,1)*this.shake*8, rand(-1,1)*this.shake*8);
    drawNightBg(c, LW, LH, G, this.scroll, this.t, this.stars);
    for(i=0;i<this.cand.length;i++){
      var cd = this.cand[i];
      c.drawImage(SPR.candy, Math.round(cd.x), Math.round(cd.y + Math.sin(this.t*6 + cd.x*0.1)));
    }
    for(i=0;i<this.obs.length;i++){
      var o = this.obs[i], ox = Math.round(o.x);
      if(o.type === 'pump' || o.type === 'stack'){
        var gl = c.createRadialGradient(ox+6.5, G-6, 1, ox+6.5, G-6, 16);
        gl.addColorStop(0,'rgba(255,140,30,0.28)'); gl.addColorStop(1,'rgba(255,140,30,0)');
        c.fillStyle = gl; c.fillRect(ox-12, G-30, 37, 34);
        c.drawImage(SPR.pumpkin, ox, G-11);
        if(o.type === 'stack') c.drawImage(SPR.pumpkin, ox, G-22);
      } else {
        blit(c, Math.floor(o.f*8) % 2 ? SPR.crowA : SPR.crowB, ox, Math.round(o.y));
      }
    }
    if(!(h.inv > 0 && Math.floor(h.inv*12) % 2)){
      var onGround = h.y >= G-14.5;
      var spr = !onGround ? SPR.heroJ : (Math.floor(h.anim*9) % 2 ? SPR.heroA : SPR.heroB);
      var lg = c.createRadialGradient(h.x+9.5, h.y+9, 1, h.x+9.5, h.y+9, 14);
      lg.addColorStop(0,'rgba(255,176,0,0.35)'); lg.addColorStop(1,'rgba(255,176,0,0)');
      c.fillStyle = lg; c.fillRect(h.x-5, h.y-5, 29, 29);
      blit(c, spr, Math.round(h.x), Math.round(h.y));
    }
    for(i=0;i<this.fx.length;i++){
      var p = this.fx[i]; c.globalAlpha = Math.min(1, p.life*2); c.fillStyle = p.c;
      c.fillRect(Math.round(p.x), Math.round(p.y), 1, 1);
    }
    c.globalAlpha = 1;
    c.restore();
  }
};

/* ── Хаб: превью плиток и запуск ── */
var GAMES = {grave:Grave, runner:Runner};

function drawPreviews(){
  var list = document.querySelectorAll('canvas[data-prev]');
  for(var i=0;i<list.length;i++){
    var cv = list[i], w = cv.clientWidth;
    if(!w) continue;
    cv.width = Math.round(w*DPR); cv.height = Math.round(w*DPR);
    var c = cv.getContext('2d');
    c.imageSmoothingEnabled = false;
    if(cv.getAttribute('data-prev') === 'grave'){
      c.setTransform(DPR,0,0,DPR,0,0);
      var g = c.createLinearGradient(0,0,0,w);
      g.addColorStop(0,'#0b0616'); g.addColorStop(1,'#140b07');
      c.fillStyle = g; c.fillRect(0,0,w,w);
      var k = w/2;
      drawGraveCell(c, 0, 0, k, 'zombie', 0.85, 0);
      drawGraveCell(c, k, 0, k, null, 0, 0);
      drawGraveCell(c, 0, k, k, null, 0, 0);
      drawGraveCell(c, k, k, k, 'pumpkin', 1, 0);
      c.globalAlpha = 0.75; c.drawImage(SPR.ghost, k*0.62, k*0.62, k*0.5, k*0.55); c.globalAlpha = 1;
    } else {
      var LH = 72, kk = w/LH;
      c.setTransform(DPR*kk,0,0,DPR*kk,0,0);
      c.imageSmoothingEnabled = false;
      drawNightBg(c, LH, LH, 58, 40, 1, [{x:6,y:8,p:1},{x:20,y:20,p:2},{x:12,y:34,p:3},{x:30,y:6,p:4}]);
      c.drawImage(SPR.pumpkin, 30, 47);
      blit(c, SPR.heroJ, 24, 18);
      blit(c, SPR.crowA, 52, 22);
      c.drawImage(SPR.candy, 40, 12);
    }
  }
}

var tiles = document.querySelectorAll('.sg-tile');
for(var ti=0;ti<tiles.length;ti++){
  tiles[ti].addEventListener('click', function(){ var g = GAMES[this.getAttribute('data-game')]; if(g) openGame(g); });
}
drawPreviews();
window.addEventListener('load', drawPreviews);
if(location.search.indexOf('debug') >= 0) window.__sg = {Grave:Grave, Runner:Runner};

})();
