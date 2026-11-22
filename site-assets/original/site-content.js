(function(){
  'use strict';

  if(!window.firebase || !firebase.apps || !firebase.apps.length){
    document.documentElement.classList.remove('site-hero-loading');
    return;
  }
  var db = firebase.database();
  var heroImage = document.querySelector('.concept-g .d-garden');
  var gallery = document.querySelector('.polaroid-gallery');
  var fallbackHero = heroImage ? heroImage.getAttribute('src') : '';
  var fallbackPolaroids = gallery ? Array.prototype.map.call(gallery.children, function(node){ return node.cloneNode(true); }) : [];
  var heroSettings = null;
  var contentReady = { hero: !heroImage, polaroids: !gallery };

  function safeUrl(value){
    var text = String(value || '').trim();
    if(!/^https:\/\//i.test(text)) return '';
    try { var url = new URL(text); return url.protocol === 'https:' ? url.href : ''; }
    catch(_error){ return ''; }
  }
  function clamp(value, min, max){ return Math.min(max, Math.max(min, Number(value) || 0)); }
  function markContentReady(key){
    contentReady[key] = true;
    if(contentReady.hero && contentReady.polaroids) document.documentElement.classList.remove('site-content-loading');
  }
  function useMobileHero(){ return window.matchMedia('(max-width: 860px)').matches; }
  function applyHero(data){
    if(!heroImage) return;
    heroSettings = data || null;
    var desktopUrl = heroSettings && safeUrl(heroSettings.desktopUrl);
    var mobileUrl = heroSettings && safeUrl(heroSettings.mobileUrl);
    var mobile = useMobileHero();
    var src = mobile ? (mobileUrl || desktopUrl || fallbackHero) : (desktopUrl || mobileUrl || fallbackHero);
    var x = mobile ? heroSettings && heroSettings.mobileFocalX : heroSettings && heroSettings.desktopFocalX;
    var y = mobile ? heroSettings && heroSettings.mobileFocalY : heroSettings && heroSettings.desktopFocalY;
    var zoom = mobile ? heroSettings && heroSettings.mobileZoom : heroSettings && heroSettings.desktopZoom;
    var reveal = function(){
      document.documentElement.classList.remove('site-hero-loading');
      markContentReady('hero');
    };
    heroImage.addEventListener('load', reveal, { once: true });
    heroImage.addEventListener('error', reveal, { once: true });
    heroImage.src = src;
    heroImage.style.objectPosition = clamp(x == null ? 50 : x, 0, 100) + '% ' + clamp(y == null ? 50 : y, 0, 100) + '%';
    heroImage.style.transformOrigin = clamp(x == null ? 50 : x, 0, 100) + '% ' + clamp(y == null ? 50 : y, 0, 100) + '%';
    heroImage.style.transform = 'scale(' + (clamp(zoom == null ? 100 : zoom, 100, 180) / 100) + ')';
    if(heroImage.complete) reveal();
    if(heroSettings) heroImage.dataset.managedHero = 'true';
    else delete heroImage.dataset.managedHero;
  }
  function restoreFallbackPolaroids(){
    if(!gallery) return;
    var records=fallbackPolaroids.map(function(node,index){
      var image=node.querySelector('img');
      var label=node.querySelector('small');
      return {groupKey:'fallback',staffName:'作品精選',node:node,title:label?label.textContent:('拍立得作品 '+(index+1)),imageUrl:image?image.getAttribute('src'):''};
    });
    renderCarousel(records,false);
    markContentReady('polaroids');
  }
  function createManagedCard(item,index){
    var url = safeUrl(item.imageUrl);
    var link = document.createElement('a');
    link.className = 'polaroid-print';
    link.href = url;
    link.target = '_blank';
    link.rel = 'noopener';
    link.setAttribute('aria-label', '查看' + (item.title || ('拍立得成品範例 ' + (index + 1))) + '大圖');
    var image = document.createElement('img');
    image.loading = 'lazy';
    image.decoding = 'async';
    image.src = url;
    image.alt = item.alt || '曇時 Cafe l’Éphémère 拍立得成品範例';
    var meta = document.createElement('span');
    meta.className = 'polaroid-meta';
    var label = document.createElement('small');
    label.textContent = 'PHOTO BY · ' + (item.staffName || '其他作品');
    meta.append(label);
    link.append(image, meta);
    return link;
  }
  function renderCarousel(records,managed){
    if(!gallery) return;
    var groups=[];
    records.forEach(function(item){
      var key=String(item.groupKey||item.staffId||'other');
      var group=groups.find(function(entry){return entry.key===key;});
      if(!group){group={key:key,name:item.staffName||'其他作品',items:[]};groups.push(group);}
      group.items.push(item);
    });
    if(!groups.length) return;
    var selectedGroup=0,selectedSlide=0,touchStartX=0;
    var tabs=document.createElement('div');
    tabs.className='polaroid-staff-tabs';
    tabs.setAttribute('role','tablist');
    tabs.setAttribute('aria-label','依女僕切換拍立得作品');
    var stage=document.createElement('div');
    stage.className='polaroid-carousel-stage';stage.id='servicePolaroidStage';
    stage.setAttribute('aria-live','polite');
    var footer=document.createElement('div');
    footer.className='polaroid-carousel-footer';
    var dots=document.createElement('div');
    dots.className='polaroid-dots';
    var counter=document.createElement('span');
    counter.className='polaroid-counter';
    footer.append(dots,counter);
    function button(label,className){
      var node=document.createElement('button');
      node.type='button';node.className='polaroid-carousel-button '+className;
      node.setAttribute('aria-label',label);node.textContent=className==='prev'?'‹':'›';
      return node;
    }
    var previous=button('上一張拍立得作品','prev');
    var next=button('下一張拍立得作品','next');
    function drawTabs(){
      tabs.replaceChildren();
      groups.forEach(function(group,index){
        var tab=document.createElement('button');
        tab.type='button';tab.className='polaroid-staff-tab';tab.setAttribute('role','tab');
        tab.setAttribute('aria-selected',index===selectedGroup?'true':'false');tab.setAttribute('aria-controls','servicePolaroidStage');tab.tabIndex=index===selectedGroup?0:-1;
        tab.textContent=group.name;
        tab.addEventListener('click',function(){selectedGroup=index;selectedSlide=0;draw();tabs.children[selectedGroup].focus();});
        tab.addEventListener('keydown',function(event){var next=index;if(event.key==='ArrowRight')next=(index+1)%groups.length;else if(event.key==='ArrowLeft')next=(index+groups.length-1)%groups.length;else if(event.key==='Home')next=0;else if(event.key==='End')next=groups.length-1;else return;event.preventDefault();selectedGroup=next;selectedSlide=0;draw();tabs.children[selectedGroup].focus();});
        tabs.appendChild(tab);
      });
    }
    function draw(){
      var group=groups[selectedGroup];
      if(selectedSlide>=group.items.length) selectedSlide=0;
      stage.replaceChildren();
      group.items.forEach(function(item,index){
        var card=managed?createManagedCard(item,index):item.node.cloneNode(true);
        card.classList.add('polaroid-print');
        card.classList.toggle('is-active',index===selectedSlide);
        card.hidden=index!==selectedSlide;
        stage.appendChild(card);
      });
      previous.hidden=group.items.length<2;next.hidden=group.items.length<2;
      stage.append(previous,next);
      dots.replaceChildren();
      group.items.forEach(function(_item,index){
        var dot=document.createElement('button');
        dot.type='button';dot.className='polaroid-dot';dot.setAttribute('aria-label','前往第 '+(index+1)+' 張作品');
        dot.setAttribute('aria-current',index===selectedSlide?'true':'false');
        dot.addEventListener('click',function(){selectedSlide=index;draw();});
        dots.appendChild(dot);
      });
      counter.textContent=(selectedSlide+1)+' / '+group.items.length;
      drawTabs();
    }
    function move(direction){
      var length=groups[selectedGroup].items.length;
      if(length<2) return;
      selectedSlide=(selectedSlide+direction+length)%length;draw();
    }
    previous.addEventListener('click',function(){move(-1);});
    next.addEventListener('click',function(){move(1);});
    stage.addEventListener('touchstart',function(event){touchStartX=event.changedTouches[0].clientX;},{passive:true});
    stage.addEventListener('touchend',function(event){var delta=event.changedTouches[0].clientX-touchStartX;if(Math.abs(delta)>45) move(delta<0?1:-1);},{passive:true});
    gallery.classList.toggle('is-managed',managed);
    gallery.classList.add('is-carousel');
    gallery.replaceChildren(tabs,stage,footer);
    draw();
  }
  function renderPolaroids(value){
    if(!gallery) return;
    var records = Object.keys(value || {}).map(function(id){ return Object.assign({ id: id }, value[id] || {}); })
      .filter(function(item){ return item.visible !== false && safeUrl(item.imageUrl); })
      .sort(function(a,b){ return Number(a.sortOrder || 0) - Number(b.sortOrder || 0) || Number(a.createdAt || 0) - Number(b.createdAt || 0); });
    document.dispatchEvent(new CustomEvent('ephemere:polaroids-updated',{detail:records}));
    if(!records.length){ restoreFallbackPolaroids(); return; }
    records.forEach(function(item){item.groupKey=item.staffId||('name:'+String(item.staffName||'其他作品'));item.staffName=item.staffName||'其他作品';});
    renderCarousel(records,true);
    markContentReady('polaroids');
  }

  db.ref('lephemere/siteContent/homeHero').on('value', function(snapshot){ applyHero(snapshot.val()); }, function(){ applyHero(null); });
  db.ref('lephemere/siteContent/polaroids').on('value', function(snapshot){ renderPolaroids(snapshot.val()); }, function(){ restoreFallbackPolaroids(); });
  var heroMedia = window.matchMedia('(max-width: 860px)');
  var onHeroBreakpoint = function(){ applyHero(heroSettings); };
  if(heroMedia.addEventListener) heroMedia.addEventListener('change', onHeroBreakpoint);
  else if(heroMedia.addListener) heroMedia.addListener(onHeroBreakpoint);
})();
