(function(){
  'use strict';
  if(!window.firebase || !firebase.apps || !firebase.apps.length) return;
  var directory=document.getElementById('studioDirectory');
  var profile=document.getElementById('studioProfile');
  var activeGrid=document.getElementById('studioActiveGrid');
  var memoryGrid=document.getElementById('studioMemoryGrid');
  if(!directory||!profile||!activeGrid||!memoryGrid) return;
  var activeTab=document.getElementById('studioActiveTab');
  var memoryTab=document.getElementById('studioMemoryTab');
  var activePanel=document.getElementById('studioActivePanel');
  var memoryPanel=document.getElementById('studioMemoryPanel');
  var selectedCard=null;
  var fallback={
    'legacy-deep-sea':{name:'深海之花',summary:'在光線無法抵達的深海交界處，那座冰冷的鐵籠靜靜佇立——',description:'在光線無法抵達的深海交界處，那座冰冷的鐵籠靜靜佇立——',status:'memory',sortOrder:100,visible:true,coverImageId:'main',images:{main:{imageUrl:'assets/studio-deep-sea.webp',alt:'深海之花攝影棚',sortOrder:100}}},
    'legacy-window':{name:'放學後的窗邊',summary:'轉過身，窗外是永不凋零的漫天櫻花，在微風中輕輕搖曳。',description:'轉過身，窗外是永不凋零的漫天櫻花，在微風中輕輕搖曳。',status:'memory',sortOrder:200,visible:true,coverImageId:'main',images:{main:{imageUrl:'assets/studio-window.webp',alt:'放學後的窗邊攝影棚',sortOrder:100}}},
    'legacy-ephemeral':{name:'曇花一瞬',summary:'曇華稍縱即逝，花境恆留此時——願框中的這一刻，是屬於你的長存。',description:'曇華稍縱即逝，花境恆留此時——願框中的這一刻，是屬於你的長存。',status:'memory',sortOrder:300,visible:true,coverImageId:'main',images:{main:{imageUrl:'assets/studio-ephemeral.webp',alt:'曇花一瞬攝影棚',sortOrder:100}}}
  };
  function safeUrl(value){var text=String(value||'').trim();if(/^assets\/[a-z0-9._/-]+$/i.test(text))return text;try{var url=new URL(text);return url.protocol==='https:'?url.href:'';}catch(_error){return '';}}
  function rows(value){var source=Object.assign({},fallback,value||{});return Object.keys(source).map(function(id){return {id:id,data:source[id]||{}};}).filter(function(item){return item.data.name&&item.data.visible!==false;}).sort(function(a,b){return Number(a.data.sortOrder||0)-Number(b.data.sortOrder||0)||String(a.data.name).localeCompare(String(b.data.name),'zh-Hant');});}
  function images(entry){return Object.keys(entry.images||{}).map(function(id){return Object.assign({id:id},entry.images[id]||{});}).filter(function(item){return safeUrl(item.imageUrl);}).sort(function(a,b){return Number(a.sortOrder||0)-Number(b.sortOrder||0);});}
  function cover(entry){var list=images(entry);return list.find(function(item){return item.id===entry.coverImageId;})||list[0]||null;}
  function empty(text){var node=document.createElement('p');node.className='studio-empty';node.textContent=text;return node;}
  function card(item,status){
    var entry=item.data;var image=cover(entry);var article=document.createElement('article');article.className='studio-managed-card';
    var button=document.createElement('button');button.type='button';button.className='studio-card-button';button.setAttribute('aria-label','查看 '+entry.name+' 的完整棚景與介紹');
    var visual=document.createElement('div');visual.className='studio-card-image';
    if(image){var img=document.createElement('img');img.loading='lazy';img.decoding='async';img.src=safeUrl(image.imageUrl);img.alt=image.alt||entry.name;visual.appendChild(img);}
    var heading=document.createElement('h3');heading.textContent=entry.name;var summary=document.createElement('p');summary.textContent=entry.summary||'點入查看完整棚景與介紹。';
    button.append(visual,heading,summary);button.addEventListener('click',function(){selectedCard=button;open(item);});article.appendChild(button);return article;
  }
  function render(value){
    var records=rows(value);if(window.ephemereStudioUI){window.ephemereStudioUI.render(records,open);return;}var active=records.filter(function(item){return item.data.status==='active';});var memory=records.filter(function(item){return item.data.status!=='active';});
    activeGrid.replaceChildren();memoryGrid.replaceChildren();
    if(!active.length)activeGrid.appendChild(empty('攝影棚資料準備中，請留意曇時最新公告。'));else active.forEach(function(item){activeGrid.appendChild(card(item,'active'));});
    if(!memory.length)memoryGrid.appendChild(empty('往日相簿尚未建立。'));else memory.forEach(function(item){memoryGrid.appendChild(card(item,'memory'));});
    activeGrid.dataset.count=String(active.length||0);memoryGrid.dataset.count=String(memory.length||0);
  }
  function setMainImage(img,thumbs,item){img.src=safeUrl(item.imageUrl);img.alt=item.alt||'';Array.prototype.forEach.call(thumbs.children,function(node){node.classList.toggle('active',node.dataset.imageId===item.id);});}
  function open(item){
    var entry=item.data;var galleryImages=images(entry);profile.replaceChildren();if(profile.parentNode!==document.body)document.body.appendChild(profile);
    var gallery=document.createElement('div');gallery.className='studio-profile-gallery';var main=document.createElement('div');main.className='studio-profile-main';var mainImage=document.createElement('img');main.appendChild(mainImage);var thumbs=document.createElement('div');thumbs.className='studio-profile-thumbs';
    galleryImages.forEach(function(image,index){var button=document.createElement('button');button.type='button';button.className='studio-thumb'+(index===0?' active':'');button.dataset.imageId=image.id;button.setAttribute('aria-label','查看 '+entry.name+' 第 '+(index+1)+' 張圖片');var img=document.createElement('img');img.src=safeUrl(image.imageUrl);img.alt='';button.appendChild(img);button.addEventListener('click',function(){setMainImage(mainImage,thumbs,image);});thumbs.appendChild(button);});
    if(galleryImages.length)setMainImage(mainImage,thumbs,galleryImages[0]);else{mainImage.alt='目前尚無棚景圖片';}
    gallery.append(main);if(galleryImages.length>1)gallery.appendChild(thumbs);
    var copy=document.createElement('div');copy.className='studio-profile-copy';
    var title=document.createElement('h3');title.textContent=entry.name;var summary=document.createElement('p');summary.className='studio-profile-summary';summary.textContent=entry.summary||'';var description=document.createElement('p');description.className='studio-profile-description';description.textContent=entry.description||entry.summary||'';
    copy.append(title,summary,description);
    var dialog=document.createElement('div');dialog.className='studio-profile-dialog'+(entry.status==='active'?'':' is-memory');dialog.setAttribute('role','document');
    var closeButton=document.createElement('button');closeButton.type='button';closeButton.className='studio-modal-close';closeButton.setAttribute('aria-label','關閉棚景介紹');closeButton.textContent='×';closeButton.addEventListener('click',close);
    dialog.append(closeButton,gallery,copy);profile.appendChild(dialog);profile.setAttribute('role','dialog');profile.setAttribute('aria-modal','true');profile.setAttribute('aria-label',entry.name+'棚景介紹');profile.hidden=false;document.body.classList.add('studio-modal-open');closeButton.focus();
  }
  function close(){profile.hidden=true;profile.replaceChildren();document.body.classList.remove('studio-modal-open');if(selectedCard)selectedCard.focus();else document.getElementById('studioOpen').focus();}
  function show(kind){var memory=kind==='memory';activePanel.hidden=memory;memoryPanel.hidden=!memory;activeTab.classList.toggle('active',!memory);memoryTab.classList.toggle('active',memory);activeTab.setAttribute('aria-selected',String(!memory));memoryTab.setAttribute('aria-selected',String(memory));}
  activeTab.addEventListener('click',function(){show('active');});memoryTab.addEventListener('click',function(){show('memory');});profile.addEventListener('click',function(event){if(event.target===profile)close();});document.addEventListener('keydown',function(event){if(event.key==='Escape'&&!profile.hidden)close();});
  firebase.database().ref('lephemere/siteContent/studios').on('value',function(snapshot){render(snapshot.val());},function(){render(null);});
})();
