(function(){
  'use strict';

  var cast = [
    {name:'夏沐',image:'assets/chibi-cast/xiamu.png',lines:['今天看到我，主人會有好運喔～♥','女僕裝的我，是不是很難得？','把今天的好運送給主人～']},
    {name:'彌亞璃卡',image:'assets/chibi-cast/miarica.png',lines:['大家都在工作……那我偷懶一下沒關係吧？','噓，不可以告訴大家喔～','主人剛剛什麼都沒看到，對吧？']},
    {name:'玥紅雪',image:'assets/chibi-cast/yuehongxue.png',lines:['我剛剛是不是忘了什麼……','金魚腦又發作了～！','主人，再提醒我一次好嗎？']},
    {name:'Naipa',image:'assets/chibi-cast/naipa.png',lines:['我家的龍又要後跳了喔！','墜星衝要衝去哪裡呢……','主人，要一起打高難嗎？']},
    {name:'小顏',image:'assets/chibi-cast/xiaoyan.png',lines:['讓我好好看看主人的笑容。','今天也要笑得開心一點喔。','這副眼鏡看得很清楚喔～']},
    {name:'蒼',image:'assets/chibi-cast/cang.png',lines:['要賞面來聽一曲嗎？','有些心情，交給音樂更合適。','今天想聽什麼呢？']},
    {name:'璐可',image:'assets/chibi-cast/ruko.png',lines:['今天也想吃甜甜的東西♡','主人要陪璐可聊天嗎？','漂亮的照片，也想和主人一起看。']},
    {name:'草莓',image:'assets/chibi-cast/strawberry.png',lines:['那個……可以陪我聊聊天嗎？','熟了以後，我可是會聊個不停喔！','主人，宇宙真的沒有邊界嗎？']},
    {name:'諾依',image:'assets/chibi-cast/noi.png',lines:['想把與主人的相遇，停留在這一刻。','主人，再陪我待一下好嗎？','這點小小的任性，可以嗎？']},
    {name:'馬鈴薯',image:'assets/chibi-cast/potato.png',lines:['送主人滿滿的兔兔能量～♥','兔兔能量補充中！','今天也要活力滿滿喔！( ⸝⸝•ᴗ•⸝⸝ )੭˒˒']},
    {name:'魔可娜',image:'assets/chibi-cast/mokona.png',lines:[]}
  ];
  if(!document.body || !cast.length) return;

  var root = document.createElement('aside');
  root.className = 'site-follow-pet';
  root.setAttribute('aria-label','曇時店員小寵物');
  root.innerHTML = '<div class="site-follow-pet-dialogue" role="status" aria-live="polite"><span class="site-follow-pet-name"></span><p class="site-follow-pet-line"></p></div><div class="site-follow-pet-surprise" aria-hidden="true"><img alt="" draggable="false"><img alt="" draggable="false"></div><div class="site-follow-pet-sparkles" aria-hidden="true"><span>✦</span><span>♡</span><span>✧</span></div><button class="site-follow-pet-button" type="button" aria-label="和店員小寵物互動；雙擊可切換角色"><img class="site-follow-pet-image" alt="" draggable="false"></button>';
  document.body.appendChild(root);

  var button = root.querySelector('.site-follow-pet-button');
  var image = root.querySelector('.site-follow-pet-image');
  var dialogue = root.querySelector('.site-follow-pet-dialogue');
  var nameNode = root.querySelector('.site-follow-pet-name');
  var lineNode = root.querySelector('.site-follow-pet-line');
  var guests = Array.prototype.slice.call(root.querySelectorAll('.site-follow-pet-surprise img'));
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  var index = Math.floor(Math.random() * cast.length);
  var clickTimer = 0;
  var lastTouchTap = 0;
  var suppressClickUntil = 0;
  var actionTimer = 0;
  var dialogueTimer = 0;
  var speechLoop = 0;
  var surpriseLoop = 0;
  var surpriseTimer = 0;
  var actions = ['is-hop','is-tilt','is-pat'];
  var lineQueues = Object.create(null);
  var lastLines = Object.create(null);

  function setCharacter(next){
    index = (next + cast.length) % cast.length;
    image.src = cast[index].image;
    image.alt = cast[index].name;
    button.setAttribute('aria-label','和'+cast[index].name+'互動；雙擊可切換角色');
    hideDialogue();
  }

  function hideDialogue(){
    window.clearTimeout(dialogueTimer);
    dialogue.classList.remove('is-visible');
  }

  function speak(){
    var lines = cast[index].lines;
    if(!lines || !lines.length) return;
    var personName = cast[index].name;
    var queue = lineQueues[personName];
    if(!queue || !queue.length){
      queue = lines.slice();
      for(var queueIndex = queue.length - 1; queueIndex > 0; queueIndex--){
        var swapIndex = Math.floor(Math.random() * (queueIndex + 1));
        var heldLine = queue[queueIndex];
        queue[queueIndex] = queue[swapIndex];
        queue[swapIndex] = heldLine;
      }
      if(queue.length > 1 && queue[0] === lastLines[personName]){
        var firstLine = queue[0];
        queue[0] = queue[1];
        queue[1] = firstLine;
      }
      lineQueues[personName] = queue;
    }
    var line = queue.shift();
    lastLines[personName] = line;
    nameNode.textContent = cast[index].name;
    lineNode.textContent = line;
    dialogue.classList.add('is-visible');
    window.clearTimeout(dialogueTimer);
    dialogueTimer = window.setTimeout(hideDialogue,5200);
  }

  function playAction(){
    if(reduceMotion.matches) return;
    actions.forEach(function(action){root.classList.remove(action);});
    root.classList.remove('has-sparkles');
    void root.offsetWidth;
    var action = actions[Math.floor(Math.random() * actions.length)];
    root.classList.add(action);
    if(Math.random() < .34) root.classList.add('has-sparkles');
    window.clearTimeout(actionTimer);
    actionTimer = window.setTimeout(function(){
      root.classList.remove(action,'has-sparkles');
    },1000);
  }

  function nextCharacter(){
    var next = (index + 1) % cast.length;
    setCharacter(next);
    playAction();
  }

  function triggerSurprise(){
    if(reduceMotion.matches || document.hidden || root.classList.contains('is-surprise')) return;
    var choices = cast.filter(function(_,guestIndex){return guestIndex !== index;});
    choices.sort(function(){return Math.random() - .5;});
    guests.forEach(function(guest,guestIndex){guest.src = choices[guestIndex].image;});
    root.classList.add('is-surprise');
    window.clearTimeout(surpriseTimer);
    surpriseTimer = window.setTimeout(function(){root.classList.remove('is-surprise');},4400);
  }

  function queueSpeech(){
    window.clearTimeout(speechLoop);
    speechLoop = window.setTimeout(function(){
      if(!document.hidden) speak();
      queueSpeech();
    },11000 + Math.random() * 9000);
  }

  function queueSurprise(){
    window.clearTimeout(surpriseLoop);
    surpriseLoop = window.setTimeout(function(){
      if(Math.random() < .42) triggerSurprise();
      queueSurprise();
    },26000 + Math.random() * 22000);
  }

  button.addEventListener('click',function(){
    if(Date.now() < suppressClickUntil) return;
    window.clearTimeout(clickTimer);
    clickTimer = window.setTimeout(playAction,280);
  });
  button.addEventListener('dblclick',function(event){
    event.preventDefault();
    window.clearTimeout(clickTimer);
    nextCharacter();
  });
  button.addEventListener('pointerup',function(event){
    if(event.pointerType !== 'touch' && event.pointerType !== 'pen') return;
    suppressClickUntil = Date.now() + 520;
    var now = Date.now();
    if(lastTouchTap && now - lastTouchTap < 360){
      window.clearTimeout(clickTimer);
      lastTouchTap = 0;
      nextCharacter();
      return;
    }
    lastTouchTap = now;
    window.clearTimeout(clickTimer);
    clickTimer = window.setTimeout(function(){
      lastTouchTap = 0;
      playAction();
    },280);
  });
  button.addEventListener('keydown',function(event){
    if(event.key === 'ArrowRight' || event.key === 'ArrowDown'){
      event.preventDefault();nextCharacter();
    }
  });
  root.addEventListener('dragstart',function(event){event.preventDefault();});
  root.addEventListener('contextmenu',function(event){event.preventDefault();});
  document.addEventListener('visibilitychange',function(){
    if(document.hidden){hideDialogue();root.classList.remove('is-surprise');}
  });

  setCharacter(index);
  queueSpeech();
  queueSurprise();
})();
