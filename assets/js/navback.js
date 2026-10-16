/* «Назад» и «Домик» на внутренних страницах.
   Назад — на предыдущую страницу сайта; если её нет (зашли по ссылке) — на главную.
   Домик — всегда на главную. Внутри Telegram главная открывается во внешнем браузере. */
(function(){
  'use strict';
  var HOME = location.origin + '/';
  function tg(){ try{ var w = window.Telegram && window.Telegram.WebApp; return w && w.initData ? w : null; }catch(e){ return null; } }
  function sameSiteRef(){ try{ return document.referrer && new URL(document.referrer).origin === location.origin && document.referrer !== location.href; }catch(e){ return false; } }
  function goHome(){ var t = tg(); if(t){ try{ t.openLink(HOME); return; }catch(e){} } location.href = HOME; }
  function goBack(){ if(sameSiteRef() && history.length > 1) history.back(); else goHome(); }
  document.addEventListener('click', function(e){
    var a = e.target.closest && e.target.closest('[data-nav-back],[data-nav-home]'); if(!a) return;
    e.preventDefault();
    if(a.hasAttribute('data-nav-back')) goBack(); else goHome();
  });
})();
