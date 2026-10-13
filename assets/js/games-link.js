/* Ссылка на игры в Telegram Mini App. Пока пусто — кнопки «Играть» скрыты, страница игр открывается как обычно.
   После /newapp в @BotFather вписать сюда ссылку вида https://t.me/<имя_бота>/games */
window.JOTUN_GAMES_TG = '';
(function(){
  var u = window.JOTUN_GAMES_TG;
  if(!u) return;
  function wire(){
    var els = document.querySelectorAll('[data-games-link]');
    for(var i = 0; i < els.length; i++){ els[i].href = u; els[i].style.display = ''; }
  }
  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', wire); else wire();
})();
