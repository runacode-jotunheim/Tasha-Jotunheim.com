/* Страница продюсера: матрица, появление разделов, FAQ, пилюля, «наверх» */
(function(){
'use strict';
// куда ведут все кнопки «Записаться» — личный Телеграм Таши
var TG = 'https://t.me/JotunSpirit';
[].forEach.call(document.querySelectorAll('[data-tg]'), function(a){ a.href = TG; });

var tint = [0,255,65], themeRed = false, themeOrange = false;
function applyTint(){
  tint = themeOrange ? [255,140,38] : themeRed ? [255,50,50] : [0,255,65];
  document.documentElement.style.setProperty('--tint', tint.join(','));
}
window.onSamhainTheme = function(on){ themeOrange = on; if(on) themeRed = false; else { try{ themeRed = localStorage.getItem('jv_theme') === 'red'; }catch(e){} } applyTint(); };
try{ themeRed = localStorage.getItem('jv_theme') === 'red'; }catch(e){}
applyTint();

/* ── тихая матрица из рун ── */
(function(){
  var c = document.getElementById('mx'); if(!c) return;
  var ctx = c.getContext('2d');
  var ABC = 'ᚠᚢᚦᚨᚱᚲᚷᚹᚺᚾᛁᛃᛇᛈᛉᛋᛏᛒᛖᛗᛚᛜᛟᛞ', SECRET = ['JOTUNHEIM','TASHA','STAR'];
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

/* ── плавное появление разделов ── */
(function(){
  var els = document.querySelectorAll('.fade');
  if(!('IntersectionObserver' in window)){ [].forEach.call(els, function(e){ e.classList.add('in'); }); return; }
  var io = new IntersectionObserver(function(list){ list.forEach(function(en){ if(en.isIntersecting){ en.target.classList.add('in'); io.unobserve(en.target); } }); }, { threshold:0.08 });
  [].forEach.call(els, function(e){ io.observe(e); });
})();

/* ── FAQ: открыт один вопрос ── */
[].forEach.call(document.querySelectorAll('.faq details'), function(d){
  d.addEventListener('toggle', function(){ if(d.open) [].forEach.call(document.querySelectorAll('.faq details'), function(o){ if(o !== d) o.open = false; }); });
});

/* ── пилюля ── */
window.togglePills = function(){ var c = document.getElementById('pillChoices'); if(c) c.classList.toggle('open'); };
window.setTheme = function(t){
  themeRed = (t === 'red');
  try{ localStorage.setItem('jv_theme', t); }catch(e){}
  applyTint();
  var c = document.getElementById('pillChoices'); if(c) c.classList.remove('open');
};
/* ── кнопка «наверх» ── */
(function(){
  var b = document.getElementById('scroll-top-btn'); if(!b) return;
  addEventListener('scroll', function(){ b.classList.toggle('show', scrollY > 600); }, { passive:true });
})();
})();
