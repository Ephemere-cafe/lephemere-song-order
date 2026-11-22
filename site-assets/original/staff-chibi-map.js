(function(){
  'use strict';

  var images = Object.freeze({
    '夏沐':'assets/chibi-cast/xiamu.png',
    '彌亞璃卡':'assets/chibi-cast/miarica.png',
    '玥紅雪':'assets/chibi-cast/yuehongxue.png',
    'naipa':'assets/chibi-cast/naipa.png',
    '小顏':'assets/chibi-cast/xiaoyan.png',
    '蒼':'assets/chibi-cast/cang.png',
    '璐可':'assets/chibi-cast/ruko.png',
    '草莓':'assets/chibi-cast/strawberry.png',
    '諾依':'assets/chibi-cast/noi.png',
    '馬鈴薯':'assets/chibi-cast/potato.png',
    '魔可娜':'assets/chibi-cast/mokona.png'
  });

  function key(value){
    return String(value || '').replace(/\s+/g,'').toLowerCase();
  }

  window.ephemereChibiCast = Object.freeze({
    get:function(name){ return images[key(name)] || ''; }
  });

  document.addEventListener('dragstart',function(event){
    if(event.target.closest && event.target.closest('.home-shift-avatar.has-chibi')) event.preventDefault();
  });
  document.addEventListener('contextmenu',function(event){
    if(event.target.closest && event.target.closest('.home-shift-avatar.has-chibi')) event.preventDefault();
  });
})();
