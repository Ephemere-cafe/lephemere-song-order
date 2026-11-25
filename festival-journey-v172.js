(()=>{'use strict';const copy=window.FestivalPublicCopy;if(!copy)return;let page={};const $=id=>document.getElementById(id),f=(n,key)=>page[copy.aliases[n]?.[key]||copy.keys[n]?.[key]]??copy.sections[n]?.fields[key]??'',node=(tag,value,cls)=>{const e=document.createElement(tag);e.textContent=value||'';if(cls)e.className=cls;return e;};
function paragraphs(host,value){host.replaceChildren(...String(value||'').split(/\n\s*\n/).filter(Boolean).map(v=>node('p',v)));}
function link(label,href){const a=node('a',label,'journey-link');a.href=href;return a;}
function section(id,title,description){const s=document.createElement('section');s.id=id;s.className='journey-section';s.append(node('h2',title));if(description){const p=document.createElement('div');paragraphs(p,description);s.append(p);}return s;}
function rulesButton(){const b=node('button','了解應援方式','journey-link');b.type='button';b.onclick=()=>{if($('rules-dialog'))$('rules-dialog').showModal();else window.open('school-festival-roster-arena-preview.html?intro=1','_blank','noopener');};return b;}
function prizeSection(data){const s=section('prizes',f('05','標題'),f('05','介紹')),items=document.createElement('div');items.className='journey-prizes';
 const catalog=Array.isArray(data.prizes)?data.prizes:[];
 if(!catalog.length)items.append(node('p',f('05','尚未公布獎項'),'prizes-empty'));
 for(const p of catalog){const article=document.createElement('article');article.className='journey-prize';if(p.photo){const img=document.createElement('img');img.src=p.photo;img.alt=p.name;img.loading='lazy';article.append(img);}article.append(node('span',p.pool==='all'?'兩校共同大獎':(data.teams[p.pool]?.name||p.pool)+'專屬','prize-pool'),node('h3',p.name),node('p',p.description),node('p','名額：'+p.quantity+' 份'),node('p',p.pool==='all'?'兩校符合抽獎資格的主人皆可參加。':'僅限支持'+data.teams[p.pool]?.name+'且符合抽獎資格的主人參加。'));items.append(article);}
 s.append(items);const eligibility=document.createElement('div');eligibility.className='journey-eligibility';paragraphs(eligibility,f('05','參加方式')+'\n\n'+f('05','補充說明'));s.append(eligibility,rulesButton());return s;
}
function home(data){const roster=$('lineup');if(!roster)return;
 const hero=document.querySelector('.collage-copy');if(hero){let intro=hero.querySelector('.journey-home-intro');if(!intro){intro=document.createElement('div');intro.className='journey-home-intro';hero.querySelector('.type-bottom')?.after(intro);}paragraphs(intro,f('01','開場介紹'));hero.querySelector('.cover-message')?.remove();const actions=hero.querySelector('.collage-actions');if(actions){actions.replaceChildren(link(f('01','主要按鈕'),'#lineup'),link(f('01','次要按鈕'),'#prizes'),link(f('01','點餐入口'),'school-festival-order.html'));}}
 const title=$('roster-title');if(title)title.textContent=f('03','區域標題');const desc=document.querySelector('.roster-title p');if(desc)desc.textContent=f('03','區域介紹');
 for(const card of document.querySelectorAll('.member[data-staff-name]')){const name=card.dataset.staffName,key=Object.keys(copy.sections['03'].fields).find(k=>k.endsWith('｜'+name));const brief=key?f('03',key):copy.shorts[name];if(brief)card.append(node('p',brief,'student-short'));}
 const group=document.querySelector('.campus-group');if(group){const heading=node('h2',f('04','標題')),intro=node('p',f('04','介紹'),'group-intro');group.before(heading,intro);}
 const prize=prizeSection(data);roster.after(prize);
 const choose=section('support',f('10','標題'),f('10','介紹'));choose.append(node('p',f('06','重要提醒')));for(const team of ['A','B'])choose.append(link('支持'+data.teams[team].name,'school-festival-order.html?school='+team));choose.append(rulesButton());prize.after(choose);
 const invite=document.querySelector('.chairman-invitation');if(invite){invite.querySelector('h2').textContent=f('02','標題');invite.querySelector('blockquote').textContent=f('02','引言');const p=document.createElement('div');p.className='invitation-body';paragraphs(p,f('02','介紹'));invite.querySelector('blockquote').after(p);}
 const rules=$('rules-dialog');if(rules){rules.querySelector('h2').textContent=f('06','標題');rules.querySelector('.entry-welcome').textContent=f('06','開場');const list=rules.querySelector('ol');list.replaceChildren(...f('06','應援規則').split('\n').filter(Boolean).map(t=>node('li',t)));const important=node('p',f('06','重要提醒'),'rules-important');list.after(important);const proceed=rules.querySelector('.entry-bottom button');proceed.textContent=f('06','按鈕');proceed.addEventListener('click',e=>{e.stopPropagation();location.href='school-festival-order.html';});const back=node('button',f('06','返回按鈕'),'journey-link');back.type='button';back.onclick=e=>{e.stopPropagation();rules.close();roster.scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});};rules.querySelector('.entry-bottom').append(back);}
}
function ordering(data){if(!$('festival-order'))return;
 const texts={'visitTotalTitle':['14','標題'],'photoServiceTitle':['13','標題'],'np-confirmOrderTitle':['13','確認視窗標題'],'np-confirmOrderSubmit':['13','送出按鈕'],'np-cancelOrderConfirm':['13','返回按鈕'],'np-submitSelection':['13','確認按鈕'],'queueSuccessTitle':['09','領號成功'],'joinVisitQueue':['09','確認按鈕'],'joinSharedTable':['09','按鈕'],'festival-send':['12','按鈕']};
 for(const [id,[n,key]]of Object.entries(texts)){const el=$(id);if(el)el.textContent=f(n,key);}
 if($('refreshVisitTotal'))$('refreshVisitTotal').textContent='更新消費紀錄';
 const receiptIntro=document.querySelector('.visit-total-head>div>p:last-child');if(receiptIntro)receiptIntro.textContent=f('14','介紹');
 const browseNotice=document.querySelector('#menuBrowseNotice strong');if(browseNotice)browseNotice.textContent=f('11','尚未領號');
 const serviceIntro=document.querySelector('#np-confirmOrderOverlay .cart-note');if(serviceIntro)serviceIntro.textContent=f('13','確認視窗提醒');
 const successIntro=document.querySelector('#np-successOverlay .success-guidance');if(successIntro)successIntro.textContent=f('13','成功訊息');
 const cartTitle=document.querySelector('#festival-receipt h3');if(cartTitle)cartTitle.textContent=f('12','標題');
 const ticketIntro=document.querySelector('.festival-consumption-tickets>p');if(ticketIntro)ticketIntro.textContent=f('16','提醒')+'\n特殊服務費用不計入餐飲應援及發券門檻。';
 const replacements=new Map([['尚未選擇商品。',['13','服務清單標題']],['尚無餐點訂單。',['14','沒有訂單']],['尚無拍攝或紀念服務訂單。',['14','沒有紀念服務']],['正在讀取本桌消費…',['17','資料載入中']],['正在整理您的服務訂單…',['17','資料載入中']],['正在確認本場資訊…',['17','資料載入中']],['今晚的線上點餐已結束，菜單仍可瀏覽。若您已在店內，請直接告知女僕。',['17','點餐結束']],['尚未發券。',['16','尚未取得']]]);
 function refreshCopy(host){const walker=document.createTreeWalker(host,NodeFilter.SHOW_TEXT);let t;while((t=walker.nextNode())){if(t.parentElement?.closest('script,style,textarea,select'))continue;const pair=replacements.get(t.textContent.trim());if(pair){const value=f(...pair);if(value!==t.textContent.trim())t.textContent=value;}}}
 for(const host of [$('visitTotalPanel'),$('photoNativeRoot'),document.querySelector('.closed-notice')].filter(Boolean)){refreshCopy(host);new MutationObserver(()=>refreshCopy(host)).observe(host,{childList:true,subtree:true,characterData:true});}
 const gate=$('visitGate'),welcome=document.createElement('section');welcome.className='arrival-welcome';const text=document.createElement('div');text.append(node('h1',f('08','標題')));paragraphs(text.appendChild(document.createElement('div')),f('08','介紹'));const photos=document.createElement('div');photos.className='arrival-photos';for(const [name,file]of [['橘琥珀','amber-candy.png'],['千早愛依','noi-candy.png']]){const img=document.createElement('img');img.src='school-photos/gallery-v128/'+file;img.alt=name;photos.append(img);}welcome.append(text,photos);gate.prepend(welcome);
 for(const [id,title,key]of [['chooseService','入座與接待','選項一｜入座與接待'],['chooseBrowse','自由參觀','選項二｜自由參觀'],['chooseSharedTable','和朋友會合','選項三｜和朋友會合']]){const b=$(id);if(b){b.querySelector('strong').textContent=title;b.querySelector('span').textContent=f('08',key);}}
 gate.querySelector('.visit-help').textContent=f('08','頁尾提醒');
 const nav=document.createElement('nav');nav.className='journey-before-order';nav.setAttribute('aria-label','認識學園祭');nav.append(node('span','選校之前，先看看'),link('認識雙校學生','school-festival-roster-arena-preview.html?noIntro=1#lineup'),link('查看本次獎項','#prizes'),rulesButton());const vote=section('festival-vote-intro','學院應援投票','先選學院，再點該校餐點。餐飲滿 30,000 Gil 並結帳後，每位客人可為所選學院應援 1 票，並獲得 1 張抽獎券；餐飲累計每滿 200,000 Gil 再加 1 張。可抽所選學院的獎項與共同獎項。');vote.classList.add('festival-vote-callout');$('festival-order').before(vote,nav);
 const p=prizeSection(data);p.hidden=true;const toggle=node('button','查看本次獎項','journey-link');toggle.type='button';toggle.setAttribute('aria-expanded','false');toggle.onclick=()=>{p.hidden=!p.hidden;toggle.setAttribute('aria-expanded',String(!p.hidden));if(!p.hidden)p.scrollIntoView({block:'start',behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});};nav.querySelector('a[href="#prizes"]').replaceWith(toggle);$('festival-order').after(p);
 const cover=document.querySelector('.festival-cover-copy p');if(cover)cover.textContent=f('11','標題');
 const preview=section('festival-menu-preview',f('11','標題'),f('11','尚未領號'));const choices=document.createElement('div'),rows=document.createElement('div');choices.className='preview-school-choices';
 function showMenu(team) {
   rows.replaceChildren();
   const items = (data.menuPreview || []).filter(item => item.team === team);
   if (!items.length) rows.append(node('p', f('11', '沒有上架餐點')));
   for (const item of items) {
     const row = node('article', '', 'preview-menu-row');
     if (item.photo) {
       const image = node('img', '', 'festival-item-image');
       image.alt = item.name;
       image.loading = 'lazy';
       image.addEventListener('error', () => image.remove(), {once:true});
       image.src = item.photo;
       row.append(image);
     }
     row.append(
       node('h3', item.name),
       node('strong', Number(item.price).toLocaleString('zh-TW') + ' Gil'),
       node('p', item.description),
       node('span', item.available ? '活動餐點 · 僅供預覽' : f('11', '暫停供應'))
     );
     rows.append(row);
   }
   for (const button of choices.children) button.setAttribute('aria-pressed', String(button.dataset.team === team));
 }
 for(const team of ['A','B']){const b=node('button',data.teams[team].name,'journey-link');b.type='button';b.dataset.team=team;b.onclick=()=>showMenu(team);choices.append(b);}const join=node('button','前往領號／加入同行桌位','journey-link');join.type='button';join.onclick=()=>{$('queueTab').click();window.scrollTo(0,0);};preview.append(choices,rows,join);const grid=document.querySelector('.festival-guest-grid');grid?.before(preview);showMenu(new URLSearchParams(location.search).get('school')==='B'?'B':'A');function publicPreview(d){preview.hidden=Boolean(d);if(grid)grid.hidden=!d;}publicPreview(window.FestivalPersonalState);window.addEventListener('festival-personal-state',event=>publicPreview(event.detail));
 const sidebar=document.querySelector('.festival-school-sidebar');if(sidebar){sidebar.querySelector('h2').textContent=f('10','標題');sidebar.querySelector('p').textContent=f('10','選校提醒');}
 const service=document.querySelector('.maid-filter-copy');if(service){service.querySelector('h2').textContent=f('13','學生選擇標題');service.querySelector('p').textContent=f('13','介紹');}
 const status=section('festival-support-status','學院應援','');status.setAttribute('aria-live','polite');const state=node('p',f('15','尚未選校'));state.id='festival-support-message';status.append(state,link('查看本次獎項','school-festival-roster-arena-preview.html?noIntro=1#prizes'));$('visitTotalPanel')?.append(status);
 function showState(d){let message;if(!d)message=f('15','尚未選校');else if(d.voteCount===1)message=f('15','已符合資格').replace('〔學院名稱〕',data.teams[d.team]?.name||'所選學院')+'\n\n'+f('15','已投票補充');else if(d.entriesClosed)message=f('15','應援已截止');else if(d.locked)message=f('15','已結帳但未達門檻')+'\n目前已結帳合資格金額：'+Number(d.paidGil||0).toLocaleString('zh-TW')+' Gil。';else message=f('15','尚未完成結帳');state.textContent=message;status.dataset.vote=String(d?.voteCount===1?1:0);}
 window.addEventListener('festival-personal-state',event=>showState(event.detail));showState(window.FestivalPersonalState);
 const requested=new URLSearchParams(location.search).get('school');if(['A','B'].includes(requested)){const hint=node('p','你從'+data.teams[requested].name+'的應援入口前來。請在下方確認學院；首次結帳後無法更換。','school-entry-hint');nav.after(hint);}
}
function init(){window.FestivalPresentation.load().then(data=>{page=window.FestivalPageSchema?.normalize(data.page)||{};window.FestivalCurrentPage=page;home(data);ordering(data);}).catch(()=>{});}if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
