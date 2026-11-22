(()=>{
 const schema=window.FestivalPageSchema;
 const text=(selector,value)=>{const el=document.querySelector(selector);if(el)el.textContent=value;};
 function imageAt(host,url,alt){host.replaceChildren();if(url){const img=document.createElement('img');img.src=url;img.alt=alt;host.append(img);}else{const span=document.createElement('span');span.className='photo-reserved';span.textContent='角色照片待補';host.append(span);}}
 function lines(host,value){host.replaceChildren(...value.split(/\n/).map(s=>s.trim()).filter(Boolean).map(value=>{const li=document.createElement('li');li.textContent=value;return li;}));}
 function apply(raw){
  const p=schema.normalize(raw.page),card=document.querySelector('.chairman-card'),dialog=document.getElementById('chairman-profile');
  document.body.dataset.contentFont=p.font;
  const group=document.querySelector('.campus-group img');group.hidden=!p.groupPhoto;if(p.groupPhoto)group.src=p.groupPhoto;
  text('.campus-group figcaption',p.groupCaption);
  text('.chairman-invitation h2',p.invitationTitle);text('.chairman-invitation blockquote',p.invitationQuote);
  lines(document.querySelector('.chairman-invitation ol'),p.invitationSteps);
  text('.chairman-invitation .aside-order',p.orderButton);text('.chairman-invitation .aside-link',p.rulesButton);
  card.hidden=!p.showChairman;
  text('.chairman-label span',p.chairmanLabel);text('.chairman-label b',p.chairmanBadge);
  imageAt(card.querySelector('.chairman-photo'),p.chairmanPhoto,p.chairmanName);
  text('.chairman-name h2',p.chairmanName);text('.chairman-name small',p.chairmanRomanized);
  text('.chairman-title',p.chairmanTalent);text('.chairman-role',p.chairmanRole);text('.chairman-card blockquote',p.chairmanQuote);
  text('.chairman-more',p.chairmanMore+' ↗');
  imageAt(dialog.querySelector('.profile-photo-reserved'),p.chairmanPhoto,p.chairmanName);
  text('.neutral-badge',p.chairmanAffiliation);text('.chairman-profile-side blockquote',p.chairmanQuote);text('.profile-role',p.chairmanRole);
  const roman=document.createElement('small');roman.textContent=p.chairmanRomanized;
  dialog.querySelector('h2').replaceChildren(document.createTextNode(p.chairmanName),roman);
  const secret=document.createElement('span');secret.textContent=p.chairmanSecret;
  dialog.querySelector('.profile-talent').replaceChildren(document.createTextNode(p.chairmanTalent),secret);
  const dd=dialog.querySelectorAll('dd');dd[0].textContent=p.chairmanAffiliation;dd[1].textContent=p.chairmanPersonality;
  dialog.querySelectorAll('.chairman-profile-copy>p:not(.profile-talent)').forEach(el=>el.remove());
  const ending=dialog.querySelector('.profile-ending');ending.textContent=p.chairmanClosingQuote;
  for(const para of p.chairmanBiography.split(/\n\s*\n/).filter(Boolean)){const node=document.createElement('p');node.textContent=para;ending.before(node);}
  const rules=document.getElementById('rules-dialog');
  rules.classList.add('festival-entry-dialog');
  rules.innerHTML='<div class="entry-top"><span>曇時・兩校聯合學園祭</span><button type="button" aria-label="關閉活動介紹">關閉 ×</button></div><div class="entry-layout"><aside class="entry-photo-column"><figure><img alt="學園祭合照"><figcaption></figcaption></figure><div class="entry-school-names"></div><blockquote></blockquote></aside><section class="entry-copy"><span class="entry-kicker">學園祭邀請函</span><h2></h2><p class="entry-welcome"></p><ol></ol><div class="entry-bottom"><small></small><button type="button" class="action primary"></button></div></section></div>';
  const photo=rules.querySelector('img');photo.hidden=!p.groupPhoto;if(p.groupPhoto)photo.src=p.groupPhoto;
  rules.querySelector('figcaption').textContent=p.groupCaption;
  rules.querySelector('.entry-school-names').textContent=raw.teams.A.name+' × '+raw.teams.B.name;
  rules.querySelector('blockquote').textContent=p.invitationQuote;
  rules.querySelector('h2').textContent=p.introTitle;rules.querySelector('.entry-welcome').textContent=p.introText;
  lines(rules.querySelector('ol'),p.introRules);
  rules.querySelector('.entry-bottom small').textContent=p.introFootnote;rules.querySelector('.entry-bottom button').textContent=p.introButton;
  // Existing rules dialog click/Escape handlers still own dismissal and focus.
  const query=new URLSearchParams(location.search);
  if(query.get('intro')==='1')rules.showModal();
  else if(p.introEnabled&&!query.has('profile')&&!query.has('noIntro')&&location.hash!=='#lineup'){
   try{const key='festival-intro-v108-'+p._revision;if(!sessionStorage.getItem(key)){rules.showModal();sessionStorage.setItem(key,'1');}}catch{}
  }
  // Crop is editable per member; photos themselves remain unmodified.
  for(const key of ['A','B'])document.querySelectorAll('#school-'+key.toLowerCase()+' .member').forEach((card,index)=>{
   const member=raw.teams[key].members[index],img=card.querySelector('img');if(!img||!member)return;
   img.style.setProperty('object-fit',member.photoFit==='contain'?'contain':'cover','important');
   img.style.setProperty('object-position','50% '+(Number.isFinite(member.photoY)?member.photoY:28)+'%','important');
  });
 }
 window.FestivalPresentation.load().then(apply).catch(()=>{const el=document.querySelector('.preview-label');if(el)el.textContent='頁面設定暫時無法讀取，保留原本內容。';});
})();
