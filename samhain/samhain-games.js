/* ══════════════════════════════════════════════
   ИГРЫ САМАЙНА: хаб + «Погост» + «Джек-бегун»
   Векторный HD-арт: рисуется в родном разрешении экрана
   ══════════════════════════════════════════════ */
(function(){
'use strict';

var DPR = Math.min(window.devicePixelRatio || 1, 3);
function $(id){ return document.getElementById(id); }
function rand(a,b){ return a + Math.random()*(b-a); }
function clamp01(t){ return t < 0 ? 0 : (t > 1 ? 1 : t); }
function lerp(a,b,t){ return a + (b-a)*clamp01(t); }
function vibrate(ms){ try{ if(navigator.vibrate) navigator.vibrate(ms); }catch(e){} }
function lsGet(k){ try{ return localStorage.getItem(k); }catch(e){ return null; } }
function lsSet(k,v){ try{ localStorage.setItem(k,v); }catch(e){} }
function seeded(seed){ var s = seed; return function(){ s = (s*16807) % 2147483647; return (s-1)/2147483646; }; }
function rrect(c,x,y,w,h,r){
  c.beginPath(); c.moveTo(x+r,y); c.arcTo(x+w,y,x+w,y+h,r); c.arcTo(x+w,y+h,x,y+h,r);
  c.arcTo(x,y+h,x,y,r); c.arcTo(x,y,x+w,y,r); c.closePath();
}
function ell(c,x,y,rx,ry,rot){ c.beginPath(); c.ellipse(x,y,Math.max(0.01,rx),Math.max(0.01,ry),rot||0,0,Math.PI*2); }
function glow(c,x,y,r,col,a){
  var g = c.createRadialGradient(x,y,0,x,y,r);
  g.addColorStop(0,'rgba('+col+','+a+')'); g.addColorStop(1,'rgba('+col+',0)');
  c.fillStyle = g; c.fillRect(x-r,y-r,r*2,r*2);
}

/* ══════════ АРТ ══════════ */
function artPumpkin(c,x,y,w,h,gold,withGlow){
  var cx = x + w/2, top = y + h*0.16, bh = h*0.84, cy = top + bh/2;
  if(withGlow) glow(c, cx, cy, w*0.85, gold ? '255,215,60' : '255,130,20', 0.38);
  var C = gold ? ['#fff6b8','#ffd84a','#c79400','#5c4100'] : ['#ffc173','#ff7a1a','#c44a00','#4a1a00'];
  var lobes = [[-0.27,0.25,0.46],[0.27,0.25,0.46],[-0.12,0.27,0.5],[0.12,0.27,0.5],[0,0.24,0.5]];
  for(var i=0;i<lobes.length;i++){
    var L = lobes[i], lx = cx + L[0]*w, rx = L[1]*w, ry = L[2]*bh;
    var g = c.createRadialGradient(lx - rx*0.35, cy - ry*0.45, rx*0.1, lx, cy, Math.max(rx,ry)*1.1);
    g.addColorStop(0,C[0]); g.addColorStop(0.45,C[1]); g.addColorStop(0.85,C[2]); g.addColorStop(1,C[3]);
    c.fillStyle = g; ell(c,lx,cy,rx,ry); c.fill();
    c.strokeStyle = 'rgba(60,20,0,0.35)'; c.lineWidth = Math.max(0.3, w*0.015); c.stroke();
  }
  c.fillStyle = '#4a7a22'; c.beginPath();
  c.moveTo(cx - w*0.05, top + bh*0.06);
  c.quadraticCurveTo(cx - w*0.04, y + h*0.02, cx + w*0.08, y);
  c.lineTo(cx + w*0.12, y + h*0.06);
  c.quadraticCurveTo(cx + w*0.03, y + h*0.08, cx + w*0.05, top + bh*0.06);
  c.closePath(); c.fill();
  c.strokeStyle = '#22400f'; c.lineWidth = Math.max(0.25, w*0.012); c.stroke();
  function P(fx,fy){ return [cx + fx*w, cy + fy*bh]; }
  function poly(pts, curveTo){
    c.beginPath(); var p = P(pts[0][0],pts[0][1]); c.moveTo(p[0],p[1]);
    for(var i=1;i<pts.length;i++){ p = P(pts[i][0],pts[i][1]); c.lineTo(p[0],p[1]); }
    if(curveTo){ var cp = P(curveTo[0],curveTo[1]), e = P(pts[0][0],pts[0][1]); c.quadraticCurveTo(cp[0],cp[1],e[0],e[1]); }
    c.closePath(); c.fill();
  }
  var fg = c.createRadialGradient(cx, cy, 0, cx, cy, w*0.42);
  if(gold){ fg.addColorStop(0,'#fffdf0'); fg.addColorStop(0.5,'#ff9a00'); fg.addColorStop(1,'#c84400'); } else { fg.addColorStop(0,'#fffbd0'); fg.addColorStop(0.55,'#ffd640'); fg.addColorStop(1,'#ff9000'); }
  c.fillStyle = fg;
  poly([[-0.27,-0.02],[-0.07,-0.02],[-0.16,-0.25]]);
  poly([[0.07,-0.02],[0.27,-0.02],[0.16,-0.25]]);
  poly([[-0.04,0.07],[0.04,0.07],[0,-0.03]]);
  poly([[-0.32,0.1],[-0.17,0.15],[-0.17,0.25],[-0.08,0.25],[-0.08,0.17],[0.08,0.17],[0.08,0.25],[0.17,0.25],[0.17,0.15],[0.32,0.1]], [0,0.58]);
}

function artZombie(c,x,y,w,h){
  var cx = x + w/2;
  c.lineCap = 'round'; c.lineJoin = 'round';
  c.strokeStyle = '#4f8a32'; c.lineWidth = w*0.11;
  [-1,1].forEach(function(s){
    c.beginPath(); c.moveTo(cx + s*w*0.2, y + h*0.76);
    c.quadraticCurveTo(cx + s*w*0.44, y + h*0.5, cx + s*w*0.38, y + h*0.17); c.stroke();
  });
  c.strokeStyle = '#7cc454'; c.lineWidth = w*0.035;
  [-1,1].forEach(function(s){
    var hx = cx + s*w*0.38, hy = y + h*0.17;
    for(var k=-1;k<=1;k++){ c.beginPath(); c.moveTo(hx, hy); c.lineTo(hx + k*w*0.05 + s*w*0.01, hy - h*0.1); c.stroke(); }
  });
  var tg = c.createLinearGradient(0, y + h*0.68, 0, y + h);
  tg.addColorStop(0,'#62449a'); tg.addColorStop(1,'#26173f');
  c.fillStyle = tg; rrect(c, cx - w*0.32, y + h*0.68, w*0.64, h*0.42, w*0.12); c.fill();
  c.fillStyle = '#26173f'; c.beginPath();
  c.moveTo(cx - w*0.1, y + h*0.68); c.lineTo(cx, y + h*0.8); c.lineTo(cx + w*0.1, y + h*0.68); c.closePath(); c.fill();
  c.strokeStyle = 'rgba(20,10,35,0.7)'; c.lineWidth = w*0.02;
  c.beginPath(); c.moveTo(cx - w*0.22, y + h*0.82); c.lineTo(cx - w*0.15, y + h*0.95); c.moveTo(cx + w*0.2, y + h*0.85); c.lineTo(cx + w*0.25, y + h*0.97); c.stroke();
  var hg = c.createRadialGradient(cx - w*0.07, y + h*0.36, w*0.03, cx, y + h*0.45, w*0.3);
  hg.addColorStop(0,'#bdf590'); hg.addColorStop(0.6,'#6db84a'); hg.addColorStop(1,'#335f20');
  c.fillStyle = hg; ell(c, cx, y + h*0.46, w*0.25, h*0.23); c.fill();
  c.strokeStyle = '#1f3312'; c.lineWidth = w*0.02;
  c.beginPath(); c.moveTo(cx - w*0.15, y + h*0.28); c.quadraticCurveTo(cx - w*0.1, y + h*0.2, cx - w*0.02, y + h*0.26);
  c.moveTo(cx + w*0.02, y + h*0.25); c.quadraticCurveTo(cx + w*0.12, y + h*0.19, cx + w*0.16, y + h*0.29); c.stroke();
  c.fillStyle = '#1b2b10';
  ell(c, cx - w*0.1, y + h*0.43, w*0.075, h*0.065); c.fill();
  ell(c, cx + w*0.1, y + h*0.43, w*0.075, h*0.065); c.fill();
  glow(c, cx - w*0.1, y + h*0.43, w*0.09, '255,40,40', 0.9);
  glow(c, cx + w*0.1, y + h*0.43, w*0.09, '255,40,40', 0.9);
  c.fillStyle = '#ffd0d0'; ell(c, cx - w*0.1, y + h*0.43, w*0.018, w*0.018); c.fill(); ell(c, cx + w*0.1, y + h*0.43, w*0.018, w*0.018); c.fill();
  c.strokeStyle = '#1b2b10'; c.lineWidth = w*0.025;
  c.beginPath(); c.moveTo(cx - w*0.11, y + h*0.56); c.lineTo(cx + w*0.11, y + h*0.57); c.stroke();
  c.lineWidth = w*0.015;
  for(var i=0;i<5;i++){ var sx = cx - w*0.09 + i*w*0.045; c.beginPath(); c.moveTo(sx, y + h*0.535); c.lineTo(sx, y + h*0.595); c.stroke(); }
}

function artGhost(c,x,y,w,h){
  var cx = x + w/2, r = w*0.42, topC = y + r + h*0.02, bottom = y + h*0.9;
  glow(c, cx, y + h*0.45, w*0.8, '190,255,220', 0.28);
  c.beginPath(); c.moveTo(cx - r, topC); c.arc(cx, topC, r, Math.PI, 0); c.lineTo(cx + r, bottom);
  var seg = 2*r/4;
  for(var i=0;i<4;i++){
    var xa = cx + r - (i+1)*seg;
    c.quadraticCurveTo(xa + seg/2, bottom + h*0.09*(i%2 ? -1 : 1), xa, bottom);
  }
  c.closePath();
  var g = c.createRadialGradient(cx - w*0.12, y + h*0.28, w*0.02, cx, y + h*0.5, w*0.6);
  g.addColorStop(0,'rgba(255,255,255,0.98)'); g.addColorStop(0.6,'rgba(220,255,236,0.92)'); g.addColorStop(1,'rgba(150,215,185,0.8)');
  c.fillStyle = g; c.fill();
  c.fillStyle = '#0a0a14';
  ell(c, cx - w*0.14, y + h*0.38, w*0.07, h*0.09); c.fill();
  ell(c, cx + w*0.14, y + h*0.38, w*0.07, h*0.09); c.fill();
  ell(c, cx, y + h*0.58, w*0.07, h*0.085); c.fill();
  c.fillStyle = 'rgba(255,150,180,0.35)';
  ell(c, cx - w*0.25, y + h*0.5, w*0.06, h*0.035); c.fill(); ell(c, cx + w*0.25, y + h*0.5, w*0.06, h*0.035); c.fill();
}

function artStone(c,x,y,w,h,rn){
  var r = w/2;
  var g = c.createLinearGradient(x,0,x+w,0);
  g.addColorStop(0,'#8e8ea2'); g.addColorStop(0.5,'#606072'); g.addColorStop(1,'#323240');
  c.fillStyle = g; c.beginPath(); c.moveTo(x, y+h); c.lineTo(x, y+r); c.arc(x+r, y+r, r, Math.PI, 0); c.lineTo(x+w, y+h); c.closePath(); c.fill();
  c.strokeStyle = 'rgba(0,0,0,0.5)'; c.lineWidth = w*0.03; c.stroke();
  c.strokeStyle = 'rgba(20,20,28,0.6)'; c.lineWidth = w*0.025;
  c.beginPath(); c.moveTo(x+w*0.78, y+h*0.18); c.lineTo(x+w*0.7, y+h*0.32); c.lineTo(x+w*0.76, y+h*0.42); c.stroke();
  var tx = x + r;
  function rune(){
    c.beginPath();
    if(rn === 'hagalaz'){
      c.moveTo(tx - w*0.13, y+h*0.34); c.lineTo(tx - w*0.13, y+h*0.84);
      c.moveTo(tx + w*0.13, y+h*0.34); c.lineTo(tx + w*0.13, y+h*0.84);
      c.moveTo(tx - w*0.13, y+h*0.5); c.lineTo(tx + w*0.13, y+h*0.66);
    } else {
      c.moveTo(tx, y+h*0.34); c.lineTo(tx, y+h*0.84);
      c.moveTo(tx, y+h*0.54); c.lineTo(tx - w*0.2, y+h*0.32);
      c.moveTo(tx, y+h*0.54); c.lineTo(tx + w*0.2, y+h*0.32);
    }
    c.stroke();
  }
  c.lineCap = 'round';
  c.strokeStyle = 'rgba(0,255,65,0.22)'; c.lineWidth = w*0.14; rune();
  c.strokeStyle = '#3dff6e'; c.lineWidth = w*0.05; rune();
  c.fillStyle = 'rgba(64,118,34,0.85)';
  ell(c, x + w*0.18, y + h*0.95, w*0.2, h*0.06); c.fill();
  ell(c, x + w*0.72, y + h*0.97, w*0.16, h*0.05); c.fill();
}

function artHole(c,hx,hy,rw,rh,rnd){
  var mg = c.createRadialGradient(hx, hy - rh*0.6, rw*0.1, hx, hy, rw*1.3);
  mg.addColorStop(0,'#5e4128'); mg.addColorStop(1,'#24160b');
  c.fillStyle = mg; ell(c, hx, hy - rh*0.15, rw*1.2, rh*1.75); c.fill();
  var hg = c.createRadialGradient(hx, hy + rh*0.2, 0, hx, hy, rw);
  hg.addColorStop(0,'#000'); hg.addColorStop(0.75,'#050302'); hg.addColorStop(1,'#1a0e05');
  c.fillStyle = hg; ell(c, hx, hy, rw, rh); c.fill();
  c.strokeStyle = 'rgba(160,115,70,0.45)'; c.lineWidth = Math.max(0.6, rw*0.04);
  c.beginPath(); c.ellipse(hx, hy, rw, rh, 0, Math.PI*1.05, Math.PI*1.95); c.stroke();
  c.fillStyle = '#6b4a2e';
  for(var i=0;i<5;i++){ var a = rnd()*Math.PI*2; ell(c, hx + Math.cos(a)*rw*1.15, hy + Math.sin(a)*rh*1.45, rw*0.06, rw*0.045); c.fill(); }
}

function artHero(c,x,y,ph,air){
  var cx = x + 5, wv = Math.sin(ph*1.3)*1.2;
  glow(c, x+11.2, y+10, 13, '255,190,60', 0.42);
  c.lineCap = 'round'; c.strokeStyle = '#140c20'; c.lineWidth = 1.7;
  if(air){
    c.beginPath(); c.moveTo(cx-1, y+10.5); c.lineTo(cx-2.5, y+13); c.moveTo(cx+1, y+10.5); c.lineTo(cx+2.8, y+12.4); c.stroke();
  } else {
    var a = Math.sin(ph)*0.75;
    c.beginPath(); c.moveTo(cx, y+10.5); c.lineTo(cx + Math.sin(a)*3.6, y+13.8);
    c.moveTo(cx, y+10.5); c.lineTo(cx - Math.sin(a)*3.6, y+13.8); c.stroke();
  }
  c.fillStyle = '#331d5c'; c.beginPath();
  c.moveTo(cx-1, y+4); c.quadraticCurveTo(x-4, y+7.5+wv, x-3.2, y+12.2+wv); c.lineTo(cx, y+11.2); c.closePath(); c.fill();
  var bg = c.createLinearGradient(x, y+4, x+10, y+12);
  bg.addColorStop(0,'#9a6fe0'); bg.addColorStop(1,'#46277f');
  c.fillStyle = bg; c.beginPath();
  c.moveTo(cx-2.6, y+4.4); c.lineTo(cx+3, y+4.4); c.lineTo(cx+4.1, y+11.6); c.lineTo(cx-4.1, y+11.6); c.closePath(); c.fill();
  c.strokeStyle = 'rgba(200,255,216,0.55)'; c.lineWidth = 0.35; c.stroke();
  c.fillStyle = '#ffb000'; c.fillRect(cx-3.3, y+8.3, 6.8, 0.7);
  c.strokeStyle = '#46277f'; c.lineWidth = 1.4; c.beginPath(); c.moveTo(cx+1.5, y+6); c.lineTo(x+10.6, y+8.2); c.stroke();
  c.fillStyle = '#2a1a10'; c.fillRect(x+10.2, y+8.1, 2.2, 0.6);
  var lg = c.createLinearGradient(0, y+8.7, 0, y+11.6);
  lg.addColorStop(0,'#fff6c0'); lg.addColorStop(1,'#ffa800');
  c.fillStyle = lg; c.fillRect(x+10.2, y+8.7, 2.2, 2.9);
  c.strokeStyle = '#2a1a10'; c.lineWidth = 0.3; c.strokeRect(x+10.2, y+8.7, 2.2, 2.9);
  var hg = c.createRadialGradient(cx-1, y+1.2, 0.3, cx, y+3, 5);
  hg.addColorStop(0,'#ad86ec'); hg.addColorStop(1,'#3b2170');
  c.fillStyle = hg; c.beginPath();
  c.moveTo(cx-3.7, y+5.3); c.quadraticCurveTo(cx-4.3, y-0.9, cx+0.5, y-0.7);
  c.quadraticCurveTo(cx+4.7, y+0.3, cx+3.9, y+5.3); c.closePath(); c.fill();
  c.beginPath(); c.moveTo(cx-2, y+0.2); c.lineTo(cx-5.8, y+2.4 + wv*0.3); c.lineTo(cx-2.9, y+2.9); c.closePath(); c.fill();
  c.strokeStyle = 'rgba(200,255,216,0.55)'; c.lineWidth = 0.35;
  c.beginPath(); c.moveTo(cx-3.7, y+5.3); c.quadraticCurveTo(cx-4.3, y-0.9, cx+0.5, y-0.7); c.quadraticCurveTo(cx+4.7, y+0.3, cx+3.9, y+5.3); c.stroke();
  c.fillStyle = '#f2d7b6'; ell(c, cx+1.4, y+3.1, 1.85, 1.95); c.fill();
  c.fillStyle = 'rgba(40,20,70,0.45)'; ell(c, cx+0.4, y+2.4, 1.3, 1.1); c.fill();
  glow(c, cx+1.8, y+2.9, 2.4, '0,255,65', 0.5);
  c.fillStyle = '#00ff41'; c.fillRect(cx+0.7, y+2.55, 0.75, 0.75); c.fillRect(cx+2.15, y+2.55, 0.75, 0.75);
}

function artCrow(c,x,y,ph){
  var cx = x + 7, cy = y + 4.5, f = Math.sin(ph*14);
  c.fillStyle = '#26263c'; c.beginPath();
  c.moveTo(cx-1, cy-0.5); c.lineTo(cx+3, cy - 1 - f*4.5); c.lineTo(cx+5.5, cy-0.2); c.closePath(); c.fill();
  c.fillStyle = '#14141f'; c.beginPath(); c.moveTo(cx+4.5, cy-0.6); c.lineTo(cx+8.6, cy-2); c.lineTo(cx+8.6, cy+1.6); c.closePath(); c.fill();
  var g = c.createRadialGradient(cx-1, cy-1.5, 0.3, cx, cy, 6);
  g.addColorStop(0,'#45456a'); g.addColorStop(1,'#0c0c15');
  c.fillStyle = g; ell(c, cx+0.5, cy, 5, 2.6, -0.08); c.fill();
  c.strokeStyle = 'rgba(170,160,215,0.6)'; c.lineWidth = 0.35; c.stroke();
  c.fillStyle = '#15151f'; ell(c, cx-4.2, cy-1.2, 2.2, 2.1); c.fill(); c.stroke();
  c.fillStyle = '#ffb000'; c.beginPath(); c.moveTo(cx-6, cy-1.7); c.lineTo(cx-9, cy-0.6); c.lineTo(cx-6, cy-0.1); c.closePath(); c.fill();
  glow(c, cx-4.9, cy-1.7, 1.6, '255,40,40', 0.7);
  c.fillStyle = '#ff3a3a'; ell(c, cx-4.9, cy-1.7, 0.55, 0.55); c.fill();
  c.fillStyle = '#1d1d2e'; c.beginPath();
  c.moveTo(cx-1.5, cy); c.quadraticCurveTo(cx+1, cy - f*5.5 - 0.5, cx+4.6, cy - f*6); c.lineTo(cx+2.6, cy+0.6); c.closePath(); c.fill();
  c.strokeStyle = 'rgba(170,160,215,0.5)'; c.stroke();
}

function artCandy(c,x,y){
  var cx = x + 4.5, cy = y + 2.5;
  glow(c, cx, cy, 6, '255,95,162', 0.25);
  c.fillStyle = '#ff5fa2';
  c.beginPath(); c.moveTo(cx-2.4, cy); c.lineTo(cx-4.6, cy-2.3); c.lineTo(cx-4.1, cy); c.lineTo(cx-4.6, cy+2.3); c.closePath(); c.fill();
  c.beginPath(); c.moveTo(cx+2.4, cy); c.lineTo(cx+4.6, cy-2.3); c.lineTo(cx+4.1, cy); c.lineTo(cx+4.6, cy+2.3); c.closePath(); c.fill();
  var g = c.createRadialGradient(cx-0.8, cy-1, 0.2, cx, cy, 3);
  g.addColorStop(0,'#ffd6ea'); g.addColorStop(0.5,'#ff5fa2'); g.addColorStop(1,'#b8235f');
  c.fillStyle = g; ell(c, cx, cy, 2.8, 2.1); c.fill();
  c.save(); ell(c, cx, cy, 2.8, 2.1); c.clip();
  c.strokeStyle = 'rgba(255,255,255,0.9)'; c.lineWidth = 0.55;
  for(var i=-3;i<=3;i+=2){ c.beginPath(); c.moveTo(cx+i-1.5, cy+2.5); c.lineTo(cx+i+1.5, cy-2.5); c.stroke(); }
  c.restore();
  c.fillStyle = 'rgba(255,255,255,0.75)'; ell(c, cx-1, cy-1, 0.8, 0.45, -0.4); c.fill();
}

function artCrypt(c,x,y,w,h,rn){
  var g = c.createLinearGradient(0, y, 0, y+h);
  g.addColorStop(0,'#7e7e94'); g.addColorStop(1,'#353543');
  c.fillStyle = g; c.fillRect(x, y, w, h);
  c.strokeStyle = 'rgba(15,15,25,0.55)'; c.lineWidth = 0.4;
  for(var ry=y+5, row=0; ry<y+h; ry+=5, row++){
    c.beginPath(); c.moveTo(x, ry); c.lineTo(x+w, ry); c.stroke();
    for(var rx=x + (row%2 ? 4 : 8); rx<x+w; rx+=8){ c.beginPath(); c.moveTo(rx, ry); c.lineTo(rx, Math.min(y+h, ry+5)); c.stroke(); }
  }
  c.fillStyle = '#a5a5bc'; c.fillRect(x-0.8, y-0.4, w+1.6, 2.2);
  c.fillStyle = 'rgba(0,0,0,0.35)'; c.fillRect(x-0.8, y+1.8, w+1.6, 0.6);
  c.fillStyle = 'rgba(0,0,0,0.28)'; c.fillRect(x+w-2, y+2.4, 2, h-2.4);
  if(w >= 22 && h >= 14){
    var tx = x + w/2, ty = y + h*0.55;
    c.lineCap = 'round';
    [[ 'rgba(0,255,65,0.25)', 2.2 ], [ '#3dff6e', 0.7 ]].forEach(function(s){
      c.strokeStyle = s[0]; c.lineWidth = s[1]; c.beginPath();
      if(rn === 'hagalaz'){
        c.moveTo(tx-2, ty-4); c.lineTo(tx-2, ty+4); c.moveTo(tx+2, ty-4); c.lineTo(tx+2, ty+4); c.moveTo(tx-2, ty-1.5); c.lineTo(tx+2, ty+1.5);
      } else {
        c.moveTo(tx, ty-4); c.lineTo(tx, ty+4); c.moveTo(tx, ty-1); c.lineTo(tx-2.5, ty-4); c.moveTo(tx, ty-1); c.lineTo(tx+2.5, ty-4);
      }
      c.stroke();
    });
  }
  c.fillStyle = 'rgba(60,110,30,0.9)';
  ell(c, x+3, y+h-0.6, 3.2, 1.1); c.fill(); ell(c, x+w-5, y+h-0.4, 2.6, 0.9); c.fill();
}

function artSlab(c,x,y,w,h){
  c.fillStyle = 'rgba(0,0,0,0.35)'; c.fillRect(x+1, y+h, w-2, 1.2);
  var g = c.createLinearGradient(0, y, 0, y+h);
  g.addColorStop(0,'#a2a2b8'); g.addColorStop(1,'#4a4a5a');
  c.fillStyle = g; rrect(c, x, y, w, h, 1.2); c.fill();
  c.strokeStyle = 'rgba(200,255,216,0.35)'; c.lineWidth = 0.35; c.beginPath(); c.moveTo(x+1, y+0.4); c.lineTo(x+w-1, y+0.4); c.stroke();
  c.strokeStyle = 'rgba(20,20,30,0.6)'; c.lineWidth = 0.35;
  c.beginPath(); c.moveTo(x+w*0.3, y+0.5); c.lineTo(x+w*0.34, y+h*0.6); c.lineTo(x+w*0.3, y+h); c.stroke();
  c.strokeStyle = 'rgba(70,120,40,0.85)'; c.lineWidth = 0.6;
  for(var i=0;i<3;i++){ var mx = x + w*(0.2 + i*0.3); c.beginPath(); c.moveTo(mx, y+h); c.quadraticCurveTo(mx+0.8, y+h+2, mx-0.3, y+h+3.5); c.stroke(); }
}

/* ── Оболочка игры ── */
var gameEl = $('sg-game'), canvas = $('sg-canvas'), ctx = canvas.getContext('2d'), stage = $('sg-stage');
var hudScore = $('sg-score'), hudMid = $('sg-mid'), hudLives = $('sg-lives'), hint = $('sg-hint');
var ov = $('sg-ov'), ovTitle = $('sg-ov-title'), ovText = $('sg-ov-text'), ovBtns = $('sg-ov-btns');
var current = null, running = false, last = 0, raf = 0;

function sizeCanvas(w,h){
  canvas.style.width = w + 'px'; canvas.style.height = h + 'px';
  canvas.width = Math.round(w*DPR); canvas.height = Math.round(h*DPR);
}
function artHeart(c,x,y,w,h,full){
  c.beginPath();
  c.moveTo(x + w/2, y + h*0.92);
  c.bezierCurveTo(x - w*0.05, y + h*0.55, x + w*0.02, y + h*0.02, x + w*0.27, y + h*0.06);
  c.bezierCurveTo(x + w*0.4, y + h*0.08, x + w*0.47, y + h*0.18, x + w/2, y + h*0.28);
  c.bezierCurveTo(x + w*0.53, y + h*0.18, x + w*0.6, y + h*0.08, x + w*0.73, y + h*0.06);
  c.bezierCurveTo(x + w*0.98, y + h*0.02, x + w*1.05, y + h*0.55, x + w/2, y + h*0.92);
  c.closePath();
  if(full){
    var g = c.createRadialGradient(x + w*0.35, y + h*0.3, w*0.05, x + w/2, y + h/2, w*0.7);
    g.addColorStop(0,'#ff9a9a'); g.addColorStop(0.5,'#ff2a2a'); g.addColorStop(1,'#8a0000');
    c.fillStyle = g; c.fill();
    c.fillStyle = 'rgba(255,255,255,0.6)'; ell(c, x + w*0.3, y + h*0.27, w*0.09, h*0.06, -0.6); c.fill();
  } else {
    c.strokeStyle = 'rgba(255,60,60,0.55)'; c.lineWidth = Math.max(1, w*0.07); c.stroke();
  }
}
function artStar(c,x,y,w,h){
  var cx = x + w/2, cy = y + h*0.53, R = w*0.48, r = w*0.2;
  glow(c, cx, cy, w*0.7, '0,255,65', 0.25);
  c.beginPath();
  for(var i=0;i<10;i++){ var a = -Math.PI/2 + i*Math.PI/5, rr = i%2 ? r : R; c.lineTo(cx + Math.cos(a)*rr, cy + Math.sin(a)*rr); }
  c.closePath();
  var g = c.createLinearGradient(0, y, 0, y + h);
  g.addColorStop(0,'#b6ffcb'); g.addColorStop(1,'#00c834');
  c.fillStyle = g; c.fill();
}
function artClock(c,x,y,w,h){
  var cx = x + w/2, cy = y + h/2, R = w*0.42;
  c.fillStyle = 'rgba(0,255,65,0.12)'; ell(c, cx, cy, R, R); c.fill();
  c.strokeStyle = '#00ff41'; c.lineWidth = Math.max(1, w*0.09); ell(c, cx, cy, R, R); c.stroke();
  c.lineCap = 'round'; c.beginPath(); c.moveTo(cx, cy); c.lineTo(cx, cy - R*0.6); c.moveTo(cx, cy); c.lineTo(cx + R*0.45, cy + R*0.2); c.stroke();
}
function makeIcon(type, size){
  var cv = document.createElement('canvas');
  cv.className = 'sg-ico';
  cv.width = Math.round(size*DPR); cv.height = Math.round(size*DPR);
  cv.style.width = size + 'px'; cv.style.height = size + 'px';
  var c = cv.getContext('2d'); c.setTransform(DPR,0,0,DPR,0,0);
  if(type === 'pumpkin') artPumpkin(c, size*0.04, size*0.08, size*0.92, size*0.84, false, false);
  else if(type === 'candy'){ c.save(); c.scale(size/10, size/10); artCandy(c, 0.5, 2.5); c.restore(); }
  else if(type === 'heart') artHeart(c, size*0.06, size*0.1, size*0.88, size*0.82, true);
  else if(type === 'heart0') artHeart(c, size*0.06, size*0.1, size*0.88, size*0.82, false);
  else if(type === 'star') artStar(c, 0, 0, size, size);
  else if(type === 'clock') artClock(c, 0, 0, size, size);
  return cv;
}
var hudCache = {};
function hudSlot(el, key, icon, text){
  var size = Math.round(parseFloat(getComputedStyle(el).fontSize) * 1.05) || 24;
  var sig = icon + '|' + size;
  if(hudCache[key] !== sig){
    el.innerHTML = '';
    if(icon) el.appendChild(makeIcon(icon, size));
    var sp = document.createElement('span'); el.appendChild(sp);
    hudCache[key] = sig;
  }
  var span = el.lastChild;
  if(span.textContent !== text) span.textContent = text;
}
function setLives(n, max){
  var size = Math.round(parseFloat(getComputedStyle(hudLives).fontSize) * 1.05) || 24;
  var sig = n + '/' + max + '|' + size;
  if(hudCache.lives === sig) return;
  hudCache.lives = sig; hudLives.innerHTML = '';
  for(var i=0;i<max;i++) hudLives.appendChild(makeIcon(i < n ? 'heart' : 'heart0', size));
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
  current = g; hudCache = {};
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
  if(!running || !current) return;
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
  var btns = [{label:'↻ Ещё раз', fn:startGame}, {label:'К играм', ghost:true, fn:closeGame}];
  if(win){
    vibrate([60,40,60]);
    showOv('Победа!', g.winText() + '<div class="sg-code">Здесь будет промокод — подключим при запуске на сайте</div>', btns);
  } else {
    showOv('Не вышло', g.loseText(), btns);
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
function makeArt(w, h, fn){
  var pad = Math.ceil(Math.max(w,h)*0.35);
  var cv = document.createElement('canvas');
  cv.width = Math.ceil((w + pad*2)*DPR); cv.height = Math.ceil((h + pad*2)*DPR);
  var c = cv.getContext('2d'); c.setTransform(DPR,0,0,DPR,0,0);
  fn(c, pad, pad, w, h);
  cv.pad = pad; cv.aw = w; cv.ah = h;
  return cv;
}
function blitArt(c, cv, x, y){ c.drawImage(cv, x - cv.pad, y - cv.pad, cv.aw + cv.pad*2, cv.ah + cv.pad*2); }

/* ══════════════════════════════════════════════
   ПОГОСТ
   ══════════════════════════════════════════════ */
function graveCellGeom(x0, y0, k){
  return {sx:x0 + k*0.32, sy:y0 + k*0.04, sw:k*0.36, sh:k*0.42, hx:x0 + k/2, hy:y0 + k*0.8, rw:k*0.36, rh:k*0.1};
}
function paintGraveBoard(c, s, N, k){
  var g = c.createLinearGradient(0,0,0,s);
  g.addColorStop(0,'#0c0718'); g.addColorStop(1,'#160c07');
  c.fillStyle = g; c.fillRect(0,0,s,s);
  var rnd = seeded(7 + N);
  for(var i=0;i<N*N*25;i++){
    c.fillStyle = rnd() < 0.5 ? 'rgba(90,60,30,0.25)' : 'rgba(40,90,25,0.25)';
    var ds = rnd()*k*0.035 + 0.5; c.fillRect(rnd()*s, rnd()*s, ds, ds);
  }
  for(var r=0;r<N;r++) for(var cl=0;cl<N;cl++){
    var x0 = cl*k, y0 = r*k, G = graveCellGeom(x0, y0, k);
    c.fillStyle = 'rgba(70,110,40,0.06)'; rrect(c, x0 + k*0.04, y0 + k*0.04, k*0.92, k*0.92, k*0.1); c.fill();
    artStone(c, G.sx, G.sy, G.sw, G.sh, rnd() < 0.5 ? 'algiz' : 'hagalaz');
    artHole(c, G.hx, G.hy, G.rw, G.rh, rnd);
    c.strokeStyle = 'rgba(70,140,40,0.7)'; c.lineWidth = Math.max(0.6, k*0.012); c.lineCap = 'round';
    for(var t=0;t<4;t++){
      var gx = x0 + k*(0.08 + rnd()*0.84), gy = y0 + k*(0.55 + rnd()*0.4);
      c.beginPath(); c.moveTo(gx, gy); c.lineTo(gx + k*0.015, gy - k*0.05); c.moveTo(gx + k*0.02, gy); c.lineTo(gx + k*0.045, gy - k*0.04); c.stroke();
    }
  }
}
function graveEntityBox(type, k){
  if(type === 'zombie') return {w:k*0.72, h:k*0.7};
  if(type === 'ghost') return {w:k*0.56, h:k*0.64};
  return {w:k*0.66, h:k*0.56};
}

var Grave = {
  id:'grave', title:'Погост', GOAL:30, TIME:40, LIVES:3,
  rules:'Из могил лезут тыквы — тапай и собирай.<br><b>Зомби</b> не трогай: −1 жизнь.<br><b>Призрак</b> крадёт 3 секунды.<br><b>Золотая тыква</b> — сразу +3 тыквы к счёту.<br><br>Собери <b>30 тыкв за 40 секунд</b>.',
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
    var bg = document.createElement('canvas');
    bg.width = Math.round(s*DPR); bg.height = Math.round(s*DPR);
    var bc = bg.getContext('2d'); bc.setTransform(DPR,0,0,DPR,0,0);
    paintGraveBoard(bc, s, this.N, this.k);
    this.bg = bg;
    var k = this.k, self = this;
    this.art = {};
    ['pumpkin','gold','zombie','ghost'].forEach(function(t){
      var b = graveEntityBox(t, k);
      self.art[t] = makeArt(b.w, b.h, function(c,x,y,w,h){
        if(t === 'pumpkin') artPumpkin(c,x,y,w,h,false,true);
        else if(t === 'gold') artPumpkin(c,x,y,w,h,true,true);
        else if(t === 'zombie') artZombie(c,x,y,w,h);
        else artGhost(c,x,y,w,h);
      });
    });
    if(!this.cells) this.reset();
  },
  reset:function(){
    this.cells = []; for(var i=0;i<this.N*this.N;i++) this.cells.push(null);
    this.score = 0; this.lives = this.LIVES; this.time = this.TIME; this.el = 0;
    this.spawnT = 0.3; this.fx = []; this.txt = []; this.shake = 0; this.flash = 0; this.flashC = '255,32,32';
    this.hud();
  },
  hud:function(){
    hudSlot(hudScore, 'score', 'pumpkin', this.score + '/' + this.GOAL);
    hudSlot(hudMid, 'mid', 'clock', Math.ceil(this.time) + ' с');
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
      this.score += 1; burst(this.fx, cx, cy, '#ff8a2a', 12, k*2.2);
      this.txt.push({x:cx, y:cy - k*0.2, s:'+1', c:'#ffb35c', life:0.6});
      vibrate(15);
    } else if(e.type === 'gold'){
      this.score += 3; burst(this.fx, cx, cy, '#ffd84a', 20, k*2.6);
      this.txt.push({x:cx, y:cy - k*0.2, s:'+3', c:'#ffd84a', life:0.8});
      vibrate(25);
    } else if(e.type === 'zombie'){
      this.lives -= 1; this.shake = 0.3; this.flash = 1; this.flashC = '255,32,32';
      burst(this.fx, cx, cy, '#6db84a', 14, k*2);
      this.txt.push({x:cx, y:cy - k*0.2, s:'−♥', c:'#ff3b3b', life:0.8});
      vibrate(120);
    } else if(e.type === 'ghost'){
      this.time = Math.max(0, this.time - 3); this.flash = 1; this.flashC = '170,220,255';
      burst(this.fx, cx, cy, '#e8fff0', 14, k*2);
      this.txt.push({x:cx, y:cy - k*0.2, s:'−3с', c:'#cfe8ff', life:0.8});
      vibrate(80);
    }
  },
  draw:function(){
    var c = ctx, s = this.size, k = this.k, N = this.N, i;
    c.setTransform(DPR,0,0,DPR,0,0);
    c.imageSmoothingEnabled = true;
    c.clearRect(0,0,s,s);
    c.save();
    if(this.shake > 0) c.translate(rand(-1,1)*this.shake*14, rand(-1,1)*this.shake*14);
    c.drawImage(this.bg, 0, 0, s, s);
    for(var r=0;r<N;r++) for(var cl=0;cl<N;cl++){
      var e = this.cells[r*N+cl];
      if(!e) continue;
      var rise = this.rise(e); if(rise <= 0) continue;
      var G = graveCellGeom(cl*k, r*k, k), art = this.art[e.type];
      c.save();
      c.beginPath(); c.rect(cl*k - k, r*k - k, k*3, G.hy - r*k + k); c.clip();
      if(e.type === 'ghost') c.globalAlpha = 0.65 + 0.3*Math.sin(e.age*14);
      blitArt(c, art, G.hx - art.aw/2, G.hy - art.ah*rise);
      c.restore();
    }
    for(i=0;i<this.fx.length;i++){
      var p = this.fx[i]; c.globalAlpha = Math.min(1, p.life*2); c.fillStyle = p.c;
      ell(c, p.x, p.y, k*0.03, k*0.03); c.fill();
    }
    c.globalAlpha = 1;
    c.textAlign = 'center'; c.textBaseline = 'middle';
    c.font = Math.round(k*0.42) + "px 'VT323', monospace";
    for(i=0;i<this.txt.length;i++){
      var t = this.txt[i]; c.globalAlpha = Math.min(1, t.life*2);
      c.fillStyle = 'rgba(0,0,0,0.6)'; c.fillText(t.s, t.x + 1.5, t.y + 1.5);
      c.fillStyle = t.c; c.fillText(t.s, t.x, t.y);
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
   ДЖЕК-БЕГУН
   Прыжок с земли/блока — в любой момент (плюс 0.1 сек после схода с края).
   Двойной прыжок — один, восстанавливается при касании земли, блока
   или при прыжке врагу на голову.
   ══════════════════════════════════════════════ */
var GRAV = 900, JUMP1 = 265, JUMP2 = 235, BOUNCE = 230;

function drawNightBg(c, LW, LH, G, scroll, t, stars){
  var g = c.createLinearGradient(0,0,0,G);
  g.addColorStop(0,'#04020a'); g.addColorStop(1,'#1d0f2e');
  c.fillStyle = g; c.fillRect(0,0,LW,LH);
  c.fillStyle = '#d8ffe6';
  for(var i=0;i<stars.length;i++){
    var st = stars[i];
    c.globalAlpha = 0.3 + 0.35*Math.sin(t*2 + st.p);
    ell(c, st.x, st.y, st.r, st.r); c.fill();
  }
  c.globalAlpha = 1;
  var mx = LW - 34, my = 28;
  glow(c, mx, my, 34, '215,255,205', 0.32);
  var mg = c.createRadialGradient(mx-3, my-3, 1, mx, my, 12);
  mg.addColorStop(0,'#f7ffee'); mg.addColorStop(1,'#bcdcb2');
  c.fillStyle = mg; ell(c, mx, my, 12, 12); c.fill();
  c.fillStyle = 'rgba(120,150,115,0.35)';
  ell(c, mx-4, my-2, 2.2, 2); c.fill(); ell(c, mx+4, my+4, 1.6, 1.5); c.fill(); ell(c, mx+2, my-5, 1, 1); c.fill();
  var cl = ((scroll*0.06) % (LW + 80));
  c.fillStyle = 'rgba(18,10,32,0.6)';
  ell(c, LW + 40 - cl, my + 6, 26, 3.2); c.fill(); ell(c, LW + 20 - cl, my + 2, 16, 2.4); c.fill();
  function hills(par, base, a1, a2, col){
    c.fillStyle = col; c.beginPath(); c.moveTo(0, G);
    var o = scroll*par;
    for(var x=0;x<=LW+3;x+=3) c.lineTo(x, G - base - Math.sin((x+o)*0.03)*a1 - Math.sin((x+o)*0.071)*a2);
    c.lineTo(LW, G); c.closePath(); c.fill();
  }
  hills(0.12, 32, 8, 4, '#150c26');
  hills(0.25, 18, 5, 3, '#1b1131');
  var per = 112, o2 = scroll*0.45;
  c.strokeStyle = '#25183f'; c.fillStyle = '#25183f'; c.lineCap = 'round';
  for(var n=-1;n<LW/per+2;n++){
    var bx = n*per - (o2 % per);
    c.lineWidth = 2.4; c.beginPath(); c.moveTo(bx+12, G); c.quadraticCurveTo(bx+10, G-16, bx+13, G-32); c.stroke();
    c.lineWidth = 1.2; c.beginPath();
    c.moveTo(bx+11.5, G-18); c.lineTo(bx+4, G-26); c.lineTo(bx+1, G-31);
    c.moveTo(bx+12, G-23); c.lineTo(bx+21, G-30); c.lineTo(bx+25, G-29);
    c.moveTo(bx+13, G-28); c.lineTo(bx+16, G-37);
    c.moveTo(bx+4, G-26); c.lineTo(bx+2, G-24); c.stroke();
    rrect(c, bx+56, G-11, 7, 11, 3); c.fill();
    c.lineWidth = 1.6; c.beginPath(); c.moveTo(bx+82, G); c.lineTo(bx+82, G-14); c.moveTo(bx+78.5, G-10.5); c.lineTo(bx+85.5, G-10.5); c.stroke();
  }
  var gg = c.createLinearGradient(0, G, 0, LH);
  gg.addColorStop(0,'#27180c'); gg.addColorStop(1,'#0e0804');
  c.fillStyle = gg; c.fillRect(0, G, LW, LH-G);
  c.fillStyle = '#2b5c19'; c.fillRect(0, G-0.2, LW, 1.4);
  c.strokeStyle = '#3d7d23'; c.lineWidth = 0.5;
  var si = Math.floor(scroll/3), so = scroll % 3;
  for(var gx=0; gx<LW+3; gx+=3){
    var id = si + gx/3, hgt = 1 + ((id*37) % 5)*0.45;
    var px = gx - so;
    c.beginPath(); c.moveTo(px, G); c.lineTo(px + 0.6, G - hgt); c.stroke();
  }
  c.fillStyle = 'rgba(80,50,25,0.6)';
  var dso = scroll % 19;
  for(var dx=-dso; dx<LW; dx+=19){ c.fillRect(dx, G+6, 1.6, 0.8); c.fillRect(dx+9, G+12, 1, 0.8); }
  var fog = c.createLinearGradient(0, G-14, 0, G+4);
  fog.addColorStop(0,'rgba(170,140,220,0)'); fog.addColorStop(1,'rgba(170,140,220,0.09)');
  c.fillStyle = fog; c.fillRect(0, G-14, LW, 18);
}

var Runner = {
  id:'runner', title:'Джек-бегун', GOAL:30, LIVES:3, LH:144, G:124, HOME:30,
  rules:'Тап — прыжок. Ещё тап в воздухе — двойной прыжок: он один и восстанавливается, когда коснёшься земли, склепа или <b>прыгнешь врагу на голову</b>.<br>Прыжок сверху на <b>тыкву</b> — 10 очков. <b>Ворона</b> бей сверху или головой в брюхо снизу — 25. Серия без касания земли умножает очки.<br>Бок тыквы или бок ворона — удар. Стена склепа не бьёт — упрёшься и встанешь, пока не перепрыгнешь.<br><br><b>30 конфет</b> открывают промокод, а очки идут в рекорд. Бег идёт, пока есть жизни.',
  bestKey:'sg_runner_best',
  best:function(){ return parseInt(lsGet(this.bestKey) || '0', 10) || 0; },
  summary:function(){
    var b = this.best(), rec = this.points > b;
    if(rec) lsSet(this.bestKey, String(this.points));
    return 'Очки: <b>' + this.points + '</b>' + (rec ? ' — новый рекорд!' : ' · рекорд ' + b) +
      '<br>Конфет: <b>' + this.score + '</b> · ' + Math.floor(this.dist/10) + ' м';
  },
  winText:function(){ return this.summary(); },
  loseText:function(){ return this.summary() + '<br>Для промокода нужно 30 конфет.'; },
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
      for(var i=0;i<46;i++) this.stars.push({x:Math.random()*this.LW, y:Math.random()*80, p:Math.random()*6, r:rand(0.25,0.6)});
    }
    hint.textContent = window.innerHeight > window.innerWidth ? 'Поверни телефон — поле будет шире' : '';
    if(!this.hero) this.reset();
  },
  reset:function(){
    this.hero = {x:30, y:this.G-14, vy:0, onGround:true, canDouble:true, coyote:0.1, inv:0, anim:0, combo:0};
    this.t = 0; this.speed = 90; this.dist = 0; this.scroll = 0;
    this.solids = []; this.foes = []; this.cand = []; this.fx = []; this.pops = [];
    this.next = 150; this.score = 0; this.points = 0; this.lives = this.LIVES; this.shake = 0;
    this.unlocked = false; this.banner = 0; this.recent = []; this.stall = false;
    this.hud();
  },
  hud:function(){
    hudSlot(hudScore, 'score', 'candy', this.score + (this.unlocked ? ' \u2713' : '/' + this.GOAL));
    hudSlot(hudMid, 'mid', 'star', String(this.points));
    setLives(this.lives, this.LIVES);
  },
  jump:function(){
    var h = this.hero;
    if(h.onGround || h.coyote > 0){
      h.vy = -JUMP1; h.onGround = false; h.coyote = 0;
      burst(this.fx, h.x+5, h.y+14, '#7a5a3a', 5, 40);
    } else if(h.canDouble){
      h.vy = -JUMP2; h.canDouble = false;
      burst(this.fx, h.x+5, h.y+13, '#00ff41', 7, 45);
    }
  },
  tap:function(){ this.jump(); },
  key:function(e){
    if(e.code === 'Space' || e.code === 'ArrowUp' || e.code === 'KeyW'){ if(!e.repeat) this.jump(); return true; }
    return false;
  },
  candies:function(cx, y, n){
    n = n || (Math.random() < 0.55 ? 1 : 2);
    for(var i=0;i<n;i++) this.cand.push({x:cx - 4.5 - (n-1)*8 + i*16, y:y});
  },
  maybeCandies:function(p, cx, y){ if(Math.random() < p) this.candies(cx, y); },
  pumpkin:function(x, groundY){ this.foes.push({type:'pump', x:x, y:groundY-12, w:14, h:12}); },
  crow:function(x, y, dive){
    // чем быстрее бег, тем медленнее ворон сам по себе — чтобы успевал появиться в кадре
    var vx = 5 + 30*(1 - clamp01((this.speed - 90)/150));
    var o = {type:'crow', x:x, y:y, w:13, h:8, vx:vx, f:Math.random()};
    if(dive && dive.swoop) o.swoop = {st:0};
    else if(dive) o.dive = {base:y, amp:dive.amp, w:dive.w, t:Math.random()*6};
    this.foes.push(o);
  },
  crypt:function(x, h, w){
    this.solids.push({type:'crypt', x:x, y:this.G-h, w:w, h:h, rune:Math.random() < 0.5 ? 'algiz' : 'hagalaz'});
  },
  slab:function(x, y, w){ this.solids.push({type:'slab', x:x, y:y, w:w, h:5}); },
  PATTERNS:[
    {id:'pump', min:0, wt:function(){ return 3; }, make:function(R,x,G){
      R.pumpkin(x,G); R.maybeCandies(0.45, x+7, G-38); return 14; }},
    {id:'pumpRow', min:8, wt:function(){ return 2; }, make:function(R,x,G){
      var n = Math.random() < 0.5 ? 2 : 3;
      for(var i=0;i<n;i++) R.pumpkin(x + i*26, G);
      R.maybeCandies(0.5, x + (n-1)*13 + 7, G-46); return (n-1)*26 + 14; }},
    {id:'stack2', min:5, wt:function(){ return 2; }, make:function(R,x,G){
      R.pumpkin(x,G); R.pumpkin(x,G-12); R.maybeCandies(0.45, x+7, G-50); return 14; }},
    {id:'stack3', min:30, wt:function(){ return 1; }, make:function(R,x,G){
      R.pumpkin(x,G); R.pumpkin(x,G-12); R.pumpkin(x,G-24); R.maybeCandies(0.5, x+7, G-62); return 14; }},
    {id:'crowLow', min:0, wt:function(t){ return 1.5 + t/40; }, make:function(R,x,G){
      R.crow(x, G-16); R.maybeCandies(0.4, x+6, G-42); return 13; }},
    {id:'crowHigh', min:5, wt:function(t){ return 1 + t/60; }, make:function(R,x,G){
      R.crow(x, G-64); R.maybeCandies(0.3, x+6, G-84); return 13; }},
    {id:'crowPair', min:15, wt:function(t){ return 1 + t/60; }, make:function(R,x,G){
      R.crow(x, G-16); R.crow(x+6, G-64); return 19; }},
    {id:'flock', min:18, wt:function(t){ return 1 + t/60; }, make:function(R,x,G){
      R.crow(x, G-28); R.crow(x+22, G-46); R.crow(x+44, G-62); return 57; }},
    {id:'diver', min:14, wt:function(t){ return 1.2 + t/40; }, make:function(R,x,G){
      R.crow(x, G-46, {amp:36, w:3.6}); return 13; }},
    {id:'swoop', min:10, wt:function(t){ return 1.4 + t/35; }, make:function(R,x,G){
      R.crow(x, G-78, {swoop:true}); return 13; }},
    {id:'swoopPair', min:30, wt:function(t){ return 0.8 + t/60; }, make:function(R,x,G){
      R.crow(x, G-78, {swoop:true}); R.crow(x+48, G-84, {swoop:true}); return 61; }},
    {id:'crypt', min:5, wt:function(){ return 2; }, make:function(R,x,G){
      var ch = Math.round(rand(14,24)), cw = Math.round(rand(26,48));
      R.crypt(x, ch, cw);
      if(Math.random() < 0.45) R.pumpkin(x + cw/2 - 7, G-ch); else R.candies(x + cw/2, G-ch-10);
      return cw; }},
    {id:'stairs', min:12, wt:function(){ return 1.5; }, make:function(R,x,G){
      var n = Math.random() < 0.5 ? 2 : 3;
      for(var i=0;i<n;i++) R.crypt(x + i*22, 12 + i*8, 22);
      var topY = G - (12 + (n-1)*8);
      R.candies(x + (n-1)*22 + 11, topY - 10);
      if(R.t > 25 && Math.random() < 0.5) R.crow(x + (n-1)*22 + 6, topY - 30);
      return n*22; }},
    {id:'cryptCrow', min:15, wt:function(){ return 1; }, make:function(R,x,G){
      R.crypt(x, 16, 44); R.crow(x + 16, G-16-18); return 44; }},
    {id:'slab', min:5, wt:function(){ return 1.5; }, make:function(R,x,G){
      var sy = G - Math.round(rand(34,44)), sw = Math.round(rand(30,50));
      R.slab(x, sy, sw);
      if(Math.random() < 0.6) R.pumpkin(x + sw/2 - 7, G);
      R.candies(x + sw/2, sy-10); return sw; }},
    {id:'slabLadder', min:12, wt:function(){ return 1; }, make:function(R,x,G){
      R.slab(x, G-34, 34); R.slab(x+44, G-60, 34); R.pumpkin(x+52, G);
      R.candies(x+61, G-70); return 78; }},
    {id:'trap', min:10, wt:function(){ return 1; }, make:function(R,x,G){
      R.pumpkin(x, G); R.crow(x-4, G-66); return 14; }},
    {id:'breather', min:10, wt:function(){ return 0.6; }, make:function(R,x,G){
      R.candies(x+10, G-30, 1); R.candies(x+40, G-12, 2); return 56; }}
  ],
  spawn:function(){
    var G = this.G, x = this.LW + 16, t = this.t, recent = this.recent || (this.recent = []);
    var elig = this.PATTERNS.filter(function(p){ return p.min <= t; });
    var pool = elig.filter(function(p){ return recent.indexOf(p.id) < 0; });
    if(!pool.length) pool = elig.filter(function(p){ return p.id !== recent[recent.length-1]; });
    if(!pool.length) pool = elig;
    var sum = 0, i; for(i=0;i<pool.length;i++) sum += pool[i].wt(t);
    var r = Math.random()*sum, pick = pool[0];
    for(i=0;i<pool.length;i++){ r -= pool[i].wt(t); if(r <= 0){ pick = pool[i]; break; } }
    recent.push(pick.id); if(recent.length > 2) recent.shift();
    var w = pick.make(this, x, G);
    var gap = this.speed * rand(0.9, lerp(1.8, 1.3, t/60));
    this.next = w + gap;
    if(Math.random() < 0.3) this.candies(x + w + gap*0.5, G-10);
  },
  stomp:function(o, belly){
    var h = this.hero;
    o.dead = 0.0001; o.vy = belly ? -110 : -40;
    if(belly) h.vy = 40; else h.vy = -BOUNCE;
    h.onGround = false; h.coyote = 0; h.canDouble = true;
    h.combo += 1;
    var base = o.type === 'crow' ? 25 : 10, pts = base * h.combo;
    this.points += pts;
    this.pops.push({x:o.x + o.w/2, y:o.y - 2, s:'+' + pts + (h.combo > 1 ? ' x' + h.combo : ''), c:h.combo > 1 ? '#00ff41' : '#ffd84a', life:0.9});
    burst(this.fx, o.x + o.w/2, o.y + o.h/2, o.type === 'crow' ? '#8f86b0' : '#ff8a2a', 12, 70);
    vibrate(30);
  },
  hurt:function(){
    var h = this.hero;
    this.lives -= 1; h.inv = 1.3; this.shake = 0.25;
    burst(this.fx, h.x+5, h.y+7, '#ff3b3b', 10, 70);
    vibrate(120);
  },
  update:function(dt){
    var G = this.G, h = this.hero, i, o;
    this.t += dt;
    this.speed = Math.min(230, 90 + this.t*2.2);
    // упёрся в стену склепа — мир стоит, пока не перепрыгнешь
    var dx = this.stall ? 0 : this.speed*dt; this.dist += dx; this.scroll += dx;
    this.next -= dx; if(this.next <= 0) this.spawn();
    var prevY = h.y;
    h.vy = Math.min(420, h.vy + GRAV*dt); h.y += h.vy*dt;
    h.anim += dt; if(h.inv > 0) h.inv -= dt;
    for(i=this.solids.length-1;i>=0;i--){ o = this.solids[i]; o.x -= dx; if(o.x + o.w < -20) this.solids.splice(i,1); }
    for(i=this.foes.length-1;i>=0;i--){
      o = this.foes[i]; o.x -= dx + (o.dead ? 0 : (o.vx || 0)*dt);
      if(o.type === 'crow'){
        o.f += dt;
        if(o.dive && !o.dead){ o.dive.t += dt; o.y = o.dive.base + Math.sin(o.dive.t*o.dive.w)*o.dive.amp; }
        if(o.swoop && !o.dead){
          // пикировщик: летит высоко, увидев героя — ныряет к земле, потом взмывает
          if(o.swoop.st === 0 && o.x - h.x < 70 + this.speed*0.25) o.swoop.st = 1;
          if(o.swoop.st === 1){ o.y += (150 + this.speed*0.4)*dt; if(o.y >= G-15){ o.y = G-15; o.swoop.st = 2; } }
          else if(o.swoop.st === 2){ o.y -= 120*dt; }
        }
      }
      if(o.dead){ o.dead += dt; o.vy += 500*dt; o.y += o.vy*dt; if(o.dead > 0.7) { this.foes.splice(i,1); continue; } }
      if(o.x < -30) this.foes.splice(i,1);
    }
    var landed = false, pb = prevY + 14, bottom = h.y + 14, fl = h.x + 2, fr = h.x + 8;
    if(h.vy >= 0){
      for(i=0;i<this.solids.length;i++){
        o = this.solids[i];
        if(fr > o.x && fl < o.x + o.w && pb <= o.y + 0.5 && bottom >= o.y){ h.y = o.y - 14; h.vy = 0; landed = true; }
      }
    }
    if(h.y + 14 >= G){ h.y = G - 14; h.vy = 0; landed = true; }
    if(landed){
      if(!h.onGround) burst(this.fx, h.x+5, h.y+14, '#7a5a3a', 3, 25);
      h.onGround = true; h.canDouble = true; h.combo = 0; h.coyote = 0.1;
    } else {
      h.onGround = false; h.coyote = Math.max(0, h.coyote - dt);
    }
    var hb = {x:h.x+2, y:h.y+1, w:6, h:13}, blocked = false;
    function hit(o, ins){ return hb.x < o.x+o.w-ins && hb.x+hb.w > o.x+ins && hb.y < o.y+o.h-ins && hb.y+hb.h > o.y+ins; }
    for(i=0;i<this.solids.length;i++){
      o = this.solids[i];
      if(o.type !== 'crypt') continue;
      var touch = hb.x + hb.w >= o.x + 0.5 && hb.x < o.x + o.w - 1 && h.y + 14 > o.y + 2 && hb.y < o.y + o.h;
      if(touch){
        if(h.onGround && h.y + 14 - o.y <= 9){ h.y = o.y - 14; h.vy = 0; hb.y = h.y + 1; continue; }
        // стена склепа: не бьёт, а упирает героя и тащит назад вместе с экраном
        if(!this.stall) burst(this.fx, h.x+8, h.y+8, '#9a9ab0', 5, 35);
        h.x = Math.min(h.x, o.x - 6.5); hb.x = h.x + 2; blocked = true;
      }
    }
    this.stall = blocked;
    if(!blocked && h.x < this.HOME) h.x = Math.min(this.HOME, h.x + 22*dt);
    if(h.x < -6){
      this.hurt(); h.x = this.HOME; h.y = 10; h.vy = 0; h.onGround = false; h.canDouble = true;
      for(i=this.solids.length-1;i>=0;i--){ o = this.solids[i]; if(o.type === 'crypt' && o.x < this.HOME + 12 && o.x + o.w > this.HOME - 4) this.solids.splice(i,1); }
    }
    hb.x = h.x + 2; hb.y = h.y + 1;
    for(i=0;i<this.foes.length;i++){
      o = this.foes[i];
      if(o.dead || o.hit) continue;
      if(!hit(o, 1)) continue;
      if(h.vy > 0 && pb <= o.y + 4){ this.stomp(o, false); pb = h.y + 14; }
      else if(o.type === 'crow' && h.vy < 0 && prevY + 1 >= o.y + o.h - 4){ this.stomp(o, true); }
      else { o.hit = true; if(h.inv <= 0) this.hurt(); }
    }
    for(i=this.cand.length-1;i>=0;i--){
      var cd = this.cand[i];
      cd.x -= dx;
      if(cd.x < -12){ this.cand.splice(i,1); continue; }
      if(hb.x-1 < cd.x+9 && hb.x+hb.w+1 > cd.x && hb.y-1 < cd.y+5 && hb.y+hb.h+1 > cd.y){
        this.cand.splice(i,1); this.score += 1;
        burst(this.fx, cd.x+4, cd.y+2, '#ff5fa2', 6, 50);
        vibrate(10);
        if(!this.unlocked && this.score >= this.GOAL){ this.unlocked = true; this.banner = 2.4; vibrate([60,40,60]); }
      }
    }
    for(i=this.pops.length-1;i>=0;i--){ var pp = this.pops[i]; pp.life -= dt; pp.y -= 14*dt; if(pp.life <= 0) this.pops.splice(i,1); }
    stepParticles(this.fx, dt, 200);
    this.shake = Math.max(0, this.shake - dt);
    this.banner = Math.max(0, this.banner - dt);
    this.hud();
    if(this.lives <= 0) return endGame(this.unlocked);
  },
  draw:function(){
    var c = ctx, k = this.k, LW = this.LW, LH = this.LH, G = this.G, h = this.hero, i, o;
    c.setTransform(DPR*k,0,0,DPR*k,0,0);
    c.imageSmoothingEnabled = true;
    c.save();
    if(this.shake > 0) c.translate(rand(-1,1)*this.shake*8, rand(-1,1)*this.shake*8);
    drawNightBg(c, LW, LH, G, this.scroll, this.t, this.stars);
    for(i=0;i<this.solids.length;i++){
      o = this.solids[i];
      if(o.type === 'crypt') artCrypt(c, o.x, o.y, o.w, o.h + (G - o.y - o.h), o.rune);
      else artSlab(c, o.x, o.y, o.w, o.h);
    }
    for(i=0;i<this.cand.length;i++){
      var cd = this.cand[i];
      artCandy(c, cd.x, cd.y + Math.sin(this.t*6 + cd.x*0.1)*0.8);
    }
    for(i=0;i<this.foes.length;i++){
      o = this.foes[i];
      c.save();
      if(o.dead){
        c.globalAlpha = Math.max(0, 1 - o.dead/0.7);
        if(o.type === 'pump'){ c.translate(o.x + o.w/2, o.y + o.h); c.scale(1 + o.dead*1.5, Math.max(0.15, 1 - o.dead*3)); c.translate(-(o.x + o.w/2), -(o.y + o.h)); }
        else { c.translate(o.x + o.w/2, o.y + o.h/2); c.rotate(o.dead*8); c.translate(-(o.x + o.w/2), -(o.y + o.h/2)); }
      }
      if(o.type === 'pump') artPumpkin(c, o.x, o.y, o.w, o.h, false, !o.dead);
      else {
        if(o.swoop && !o.dead && o.swoop.st){ var ang = o.swoop.st === 1 ? -0.55 : 0.4; c.translate(o.x + 6.5, o.y + 4); c.rotate(ang); c.translate(-(o.x + 6.5), -(o.y + 4)); }
        artCrow(c, o.x, o.y, o.f);
      }
      c.restore();
    }
    if(!(h.inv > 0 && Math.floor(h.inv*12) % 2)) artHero(c, h.x, h.y, h.anim*11, !h.onGround);
    for(i=0;i<this.fx.length;i++){
      var p = this.fx[i]; c.globalAlpha = Math.min(1, p.life*2); c.fillStyle = p.c;
      ell(c, p.x, p.y, 0.6, 0.6); c.fill();
    }
    c.globalAlpha = 1;
    c.textAlign = 'center'; c.textBaseline = 'middle';
    c.font = "8px 'VT323', monospace";
    for(i=0;i<this.pops.length;i++){
      var pp = this.pops[i]; c.globalAlpha = Math.min(1, pp.life*2);
      c.fillStyle = 'rgba(0,0,0,0.7)'; c.fillText(pp.s, pp.x+0.5, pp.y+0.5);
      c.fillStyle = pp.c; c.fillText(pp.s, pp.x, pp.y);
    }
    c.globalAlpha = 1;
    if(this.banner > 0){
      c.globalAlpha = Math.min(1, this.banner*2);
      c.font = "12px 'VT323', monospace";
      c.fillStyle = 'rgba(0,0,0,0.65)'; rrect(c, LW/2 - 62, 34, 124, 18, 4); c.fill();
      c.fillStyle = '#ffd84a'; c.fillText('ПРОМОКОД ОТКРЫТ — БЕГИ ДАЛЬШЕ', LW/2, 43.5);
      c.globalAlpha = 1;
    }
    c.restore();
  }
};

/* ── Хаб ── */
var GAMES = {grave:Grave, runner:Runner};

function drawPreviews(){
  var list = document.querySelectorAll('canvas[data-prev]');
  for(var i=0;i<list.length;i++){
    var cv = list[i], w = cv.clientWidth;
    if(!w) continue;
    cv.width = Math.round(w*DPR); cv.height = Math.round(w*DPR);
    var c = cv.getContext('2d');
    if(cv.getAttribute('data-prev') === 'grave'){
      c.setTransform(DPR,0,0,DPR,0,0);
      paintGraveBoard(c, w, 2, w/2);
      var k = w/2;
      [[0,0,'zombie',0.9],[1,1,'pumpkin',1],[1,0,'gold',0.7]].forEach(function(d){
        var G = graveCellGeom(d[0]*k, d[1]*k, k), b = graveEntityBox(d[2], k);
        c.save(); c.beginPath(); c.rect(d[0]*k - k, d[1]*k - k, k*3, G.hy - d[1]*k + k); c.clip();
        var ey = G.hy - b.h*d[3];
        if(d[2] === 'zombie') artZombie(c, G.hx - b.w/2, ey, b.w, b.h);
        else artPumpkin(c, G.hx - b.w/2, ey, b.w, b.h, d[2] === 'gold', true);
        c.restore();
      });
      var gb = graveEntityBox('ghost', k);
      c.globalAlpha = 0.85; artGhost(c, k*0.75, k*0.9, gb.w*0.9, gb.h*0.9); c.globalAlpha = 1;
    } else {
      var LH = 72, kk = w/LH;
      c.setTransform(DPR*kk,0,0,DPR*kk,0,0);
      drawNightBg(c, LH, LH, 58, 40, 1, [{x:6,y:8,p:1,r:0.4},{x:20,y:20,p:2,r:0.5},{x:12,y:34,p:3,r:0.3},{x:30,y:6,p:4,r:0.4}]);
      artCrypt(c, 44, 46, 22, 12, 'hagalaz');
      artPumpkin(c, 26, 46, 14, 12, false, true);
      artHero(c, 24, 20, 0, true);
      artCrow(c, 50, 22, 0.05);
      artCandy(c, 36, 12);
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
