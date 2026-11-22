/* Layout-only enhancement: existing inputs, tabs and listeners are retained. */
(()=>{
 'use strict';
 const wrap=document.getElementById('wrap');if(!wrap||!document.getElementById('festival-order'))return;
 document.body.classList.add('festival-guest-page','festival-design');
 const oldHeader=wrap.querySelector('.header'),tabs=wrap.querySelector('.guest-tabs');
 if(oldHeader&&tabs){
  const header=document.createElement('header');header.className='festival-guest-header';
  const brand=document.createElement('a');brand.className='festival-guest-brand';brand.href='school-festival-roster-arena-preview.html';
  brand.innerHTML='<img src="festival-base/assets/logo.webp" alt=""><span>曇時學園祭<small>兩校聯合學園祭</small></span>';
  const tools=document.createElement('div');tools.className='festival-guest-tools';
  const clock=oldHeader.querySelector('.clock');if(clock)tools.append(clock);
  const guide=document.getElementById('openGuide');if(guide){guide.textContent='來店流程';tools.append(guide);}
  header.append(brand,tabs,tools);oldHeader.remove();wrap.before(header);
  for(const [id,title]of [['queueTab','入店與號碼牌'],['orderTab','學園祭餐點'],['photoTab','特殊服務'],['totalTab','本次消費']]){const button=document.getElementById(id);if(button)button.textContent=title;}
 }
 const grid=document.querySelector('.festival-guest-grid'),choices=document.getElementById('festival-choices');
 if(grid&&choices){
  const sidebar=document.createElement('aside');sidebar.className='festival-school-sidebar';
  sidebar.innerHTML='<span>本次應援學院</span><h2>選擇你的學院</h2><p>首次結清後，後續餐飲累積於同一學院。</p>';
  sidebar.append(choices);sidebar.insertAdjacentHTML('beforeend','<p class="festival-rule-note">餐飲結清滿 30,000 Gil<br>取得基本抽獎券與 1 票應援。</p><p class="festival-rule-note">餐飲每累計滿 200,000 Gil<br>再多 1 張抽獎券。</p>');grid.prepend(sidebar);
  const sync=()=>{const selected=choices.querySelector('[aria-pressed="true"]');if(selected)document.body.dataset.activeSchool=selected.dataset.team;};
  new MutationObserver(sync).observe(choices,{attributes:true,subtree:true,attributeFilter:['aria-pressed']});sync();
 }
 const link=document.querySelector('.festival-cover-copy a');if(link){link.href='school-festival-roster-arena-preview.html';link.textContent='查看學園祭首頁';}
 window.SchoolFestivalTheme?.refresh();
})();
