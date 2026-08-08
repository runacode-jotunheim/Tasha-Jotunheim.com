(function(){
  var now = new Date();
  var isVrataLva = now <= new Date(2026, 7, 12, 23, 59);
  var sub = document.getElementById('season-collection-subtitle');
  var grid = document.getElementById('season-collection-grid');
  var OZ = 'Огненная Жатва';
  var VL = 'Врата Льва';
  var items = [
    {id:31,img:'ogon-probuzhdeniya.jpg',col:OZ,name:'Огонь пробуждения',price:'7 800 ₽'},
    {id:28,img:'lev-sredi-lyudey.jpg',col:VL,name:'Лев среди людей',price:'10 000 ₽'},
    {id:32,img:'put-sily.jpg',col:OZ,name:'Путь силы',price:'10 000 ₽'},
    {id:29,img:'strazh-serdtsa.jpg',col:VL,name:'Страж сердца',price:'15 000 ₽'},
    {id:33,img:'ognenny-feniks.jpg',col:OZ,name:'Огненный феникс',price:'13 000 ₽'},
    {id:30,img:'put-solntsa.jpg',col:VL,name:'Путь Солнца',price:'8 800 ₽'},
    {id:34,img:'vremya-siyat.jpg',col:OZ,name:'Время сиять',price:'15 000 ₽'}
  ];
  sub.textContent=isVrataLva?'Коллекция Мабона 2026':'Огненная Жатва · Ламмас 2026';
  grid.innerHTML=items.map(function(it,i,arr){
    var last=i===arr.length-1&&it.id===34;
    var ext=last?'grid-column:1/-1;max-width:480px;margin:0 auto;width:100%':'';
    return '<div class="new-card glass reveal" style="transition-delay:'+(i*0.06)+'s;'+ext+'" onclick="openProductModal('+it.id+')">'
      +'<div class="new-card-img"><img src="assets/img/products/'+it.img+'" alt="'+it.name+'" loading="lazy"></div>'
      +'<div class="new-card-info"><div class="new-card-collection">'+it.col+'</div>'
      +'<div class="new-card-name">'+it.name+'</div>'
      +'<div class="new-card-price">'+it.price+'</div></div></div>';
  }).join('');
})();
