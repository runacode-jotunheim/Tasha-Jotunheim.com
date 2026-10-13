/* Ссылка на игры в Telegram Mini App. Пока пусто — кнопки «Играть» скрыты.
   После /newapp в @BotFather вписать сюда ссылку вида https://t.me/<имя_бота>/games
   Кнопки на сайте ведут на страницу игр: она сама предложит Telegram (телефон) или сразу запустит игры (компьютер). */
window.JOTUN_GAMES_TG = 'https://t.me/Jotunheimgame_bot/games';
(function(){
  var u = window.JOTUN_GAMES_TG;
  if(!u) return;
  function wire(){
    var els = document.querySelectorAll('[data-games-link]');
    var page = (location.pathname.indexOf('/samhain/') >= 0 ? '' : 'samhain/');
    for(var i = 0; i < els.length; i++){ els[i].href = page || './'; els[i].style.display = ''; }
  }
  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', wire); else wire();
})();
