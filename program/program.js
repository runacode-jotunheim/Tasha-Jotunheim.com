/* Страница реферальной программы: лестница рангов и кнопка кабинета */
(function(){
'use strict';

var RANKS = [
  { name:'Мини-Йотун', pct:3, c:'#00ff41', one:'Регистрация в кабинете',
    perks:['3% на продукцию и ритуалы'] },
  { name:'Йотун', pct:3, c:'#7dff4a', friends:'5 друзей, покупка от 7 000 ₽', buy:'3 артефакта на сумму от 24 000 ₽',
    perks:['5 000 ₽ на консультацию'] },
  { name:'Старший Йотун', pct:5, c:'#d6c24a', friends:'10 друзей, от 7 000 ₽', buy:'покупки на 50 000 ₽',
    perks:['привилегии при брони места на обучение'] },
  { name:'Ёрмунганд', pct:5, c:'#4ad6d6', friends:'15 друзей, от 10 000 ₽', buy:'покупки на 75 000 ₽',
    perks:['артефакт до 15 000 ₽ в подарок','5 000 ₽ на консультацию','приоритет на закрытые ритуалы'] },
  { name:'Йотун Хель', pct:7, c:'#b9b9d6', friends:'20 друзей, от 15 000 ₽', buy:'покупки на 100 000 ₽',
    jc:2000, perks:['закрытый канал «Настоящие Йотуны»'] },
  { name:'Йотун Локи', pct:7, c:'#ff7a3a', friends:'25 друзей, от 15 000 ₽', buy:'150 000 ₽ + 3 друга, каждый от 10 000 ₽',
    jc:3000, perks:['консультация 60 мин бесплатно','индивидуальное обучение рунам'] },
  { name:'Йотун Имир', pct:10, c:'#bfe3ff', friends:'30 друзей, от 20 000 ₽', buy:'250 000 ₽ + 5 друзей, каждый от 15 000 ₽',
    jc:3000, perks:['индивидуальный ритуал открытия дорог на 1 год'] },
  { name:'Бергельмир', pct:15, c:'#ffd84a', friends:'40 друзей, каждый от 25 000 ₽', buy:'300 000 ₽ + 15 друзей, каждый от 20 000 ₽',
    jc:5000, perks:['ритуал открытия дорог','персональный артефакт','15% на обучение'] }
];

var JC = '<span class="jc">JC</span>';
function fmt(n){ return n.toLocaleString('ru-RU'); }

var box = document.getElementById('ladder');
if(box){
  box.innerHTML = RANKS.map(function(r, i){
    var how = r.one
      ? '<div class="one"><i>Как получить</i>' + r.one + '</div>'
      : '<div><i>Через друзей</i>' + r.friends + '</div><div><i>Через свои покупки</i>' + r.buy + '</div>';
    var perks = (r.jc ? '<span class="jcp">+' + fmt(r.jc) + ' ' + JC + '</span>' : '') +
      r.perks.map(function(p){ return '<span>' + p + '</span>'; }).join('');
    return '<div class="rank r' + i + '" style="--c:' + r.c + '"><i class="dot"></i>' +
      '<div class="r-head"><div class="r-name">' + r.name + '</div><div class="r-pct">' + r.pct + '%<small>на всё</small></div></div>' +
      '<div class="r-how">' + how + '</div>' +
      '<div class="r-perks">' + perks + '</div></div>';
  }).join('');
}

/* Кнопки кабинета оживают, когда сервер программы запущен (account.js выставит enabled) */
var tries = 0;
function wire(){
  var A = window.JotunAccount;
  if(A && A.enabled){
    [].forEach.call(document.querySelectorAll('[data-cab-main]'), function(b){
      b.classList.remove('wait'); b.textContent = 'Открыть кабинет'; b.onclick = A.open;
    });
    var t = document.querySelector('[data-cab]');
    if(t){ t.hidden = false; t.onclick = A.open; }
    return;
  }
  if(++tries < 20) setTimeout(wire, 500);
}
wire();
})();
