(function(){
  var sub = document.getElementById('season-collection-subtitle');
  var grid = document.getElementById('season-collection-grid');
  var MB = 'Мабон';
  var LM = 'Ламмас';
  var items = [
    {id:12,img:'glaz-odina.jpg',col:MB,name:'Глаз Одина',price:'15 900 ₽'},
    {id:15,img:'mother-teney-art.jpg',col:MB,name:'Мать Теней (браслет)',price:'13 900 ₽'},
    {id:27,img:'hranitel-urozhaya.jpg',col:LM,name:'Хранитель урожая',price:'8 800 ₽'},
    {id:13,img:'pechat-korolya.jpg',col:MB,name:'Печать Короля',price:'15 900 ₽'},
    {id:26,img:'zolotoe-zerno.jpg',col:LM,name:'Золотое зерно',price:'11 800 ₽'},
    {id:16,img:'mother-teney-art.jpg',col:MB,name:'Мать Теней (кулон)',price:'13 900 ₽'},
    {id:14,img:'yablochny-pentakl.jpg',col:MB,name:'Яблочный Пентакль',price:'15 900 ₽'}
  ];
  sub.textContent='Коллекция Мабона 2026';
  grid.innerHTML=items.map(function(it,i,arr){
    var last=i===arr.length-1&&arr.length%2===1;
    var ext=last?'grid-column:1/-1;max-width:480px;margin:0 auto;width:100%':'';
    return '<div class="new-card glass reveal" style="transition-delay:'+(i*0.06)+'s;'+ext+'" onclick="openProductModal('+it.id+')">'
      +'<div class="new-card-img"><img src="assets/img/products/'+it.img+'" alt="'+it.name+'" loading="lazy"></div>'
      +'<div class="new-card-info"><div class="new-card-collection">'+it.col+'</div>'
      +'<div class="new-card-name">'+it.name+'</div>'
      +'<div class="new-card-price">'+it.price+'</div></div></div>';
  }).join('');
})();
