/* Presentation enhancement: preserve every existing form, event handler and API. */
(()=>{'use strict';
function init(){if(document.body.classList.contains('regular-design'))return;document.body.classList.add('regular-design');
 const wrap=document.getElementById('wrap'),header=wrap?.querySelector('.header'),tabs=wrap?.querySelector('.guest-tabs');if(!header||!tabs)return;
 header.append(tabs);
 const guide=document.getElementById('openGuide');if(guide){guide.classList.remove('first-visit-fab');guide.classList.add('regular-guide');guide.textContent='入店流程';header.querySelector('.clock')?.append(guide);}
 const layout=document.querySelector('#orderFlow .order-layout');
 if(layout){const cover=document.createElement('aside');cover.className='regular-menu-cover';cover.setAttribute('aria-label','曇時菜單封面');cover.innerHTML='<span>Cafe l’Éphémère</span><strong>MENU</strong><img src="guest-ui-v122/cafe-signature.png" alt="曇時店家簽名"><p>時光如曇花般轉瞬即逝。<br>在這段短暫的停留裡，<br>願我們為你多留一點溫度。</p><small>曇時 · 今晚菜單</small>';layout.prepend(cover);}
 const title=document.querySelector('#orderFlow .order-heading h2');if(title)title.textContent='今晚，想吃點什麼？';
 // Change only existing button text, so the original navigation listeners stay attached.
 for(const [id,label]of [['queueTab','入店與號碼牌'],['orderTab','今晚菜單'],['photoTab','拍攝與紀念'],['totalTab','本次消費']]){const el=document.getElementById(id);if(el)el.textContent=label;}
 const reduce=matchMedia('(prefers-reduced-motion: reduce)');let turn;
 document.getElementById('categoryNav')?.addEventListener('click',e=>{if(!e.target.closest('[data-category-index]')||reduce.matches)return;requestAnimationFrame(()=>{turn?.cancel();turn=document.getElementById('menuList').animate([{transform:'perspective(1600px) rotateY(13deg)',opacity:.45},{transform:'perspective(1600px) rotateY(0deg)',opacity:1}],{duration:330,easing:'cubic-bezier(.2,.7,.2,1)'});});});
 reduce.addEventListener('change',()=>{if(reduce.matches)turn?.cancel();});
 // Keep native status data in place; visually emphasize the active page only.
 const sync=()=>{const page=document.getElementById('photoTab')?.classList.contains('is-active')?'services':document.getElementById('totalTab')?.classList.contains('is-active')?'receipt':document.getElementById('orderTab')?.classList.contains('is-active')?'menu':'queue';document.body.dataset.regularView=page;};
 new MutationObserver(sync).observe(tabs,{attributes:true,attributeFilter:['class'],subtree:true});sync();
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
