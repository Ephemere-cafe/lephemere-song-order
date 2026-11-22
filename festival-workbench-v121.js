/* Match admin-reference-v70.css and the original admin's saved preference. */
(()=>{'use strict';const key='lephemereAdminTheme';
 const palettes={light:{bg:'#eef1f4',surface:'#f9fbfc',panel:'#e7edf4',ink:'#202a35',muted:'#526273',line:'#d3dbe3',a:'#46688e',b:'#5f8272',aw:'#e4ecf5',bw:'#e7efe9',button:'#ffffff',side:'#1c2530'},dark:{bg:'#0d0e14',surface:'#14151c',panel:'#1c1f29',ink:'#f3f4f8',muted:'#aeb4c3',line:'#292c36',a:'#3970ff',b:'#7eac97',aw:'#1b2a4a',bw:'#1c302a',button:'#ffffff',side:'#0b0c12'}};
 let theme='light';try{theme=localStorage.getItem(key)==='dark'?'dark':'light';}catch{}
 function apply(value,persist=false){theme=value==='dark'?'dark':'light';const p=palettes[theme],root=document.documentElement;root.dataset.adminTheme=theme;
  const vars={...Object.fromEntries(Object.entries(p).map(([k,v])=>['--fp-'+k,v])),'--paper':p.surface,'--paper2':p.surface,'--ink':p.ink,'--muted':p.muted,'--line':p.line,'--a':p.a,'--b':p.b,'--a-paper':p.aw,'--b-paper':p.bw,'--accent':p.a,'--hint':p.aw,'--warn':p.bw};
  for(const [name,value]of Object.entries(vars))root.style.setProperty(name,value);
  const button=document.getElementById('festival-theme');if(button){button.textContent=theme==='dark'?'日間模式':'夜間模式';button.setAttribute('aria-pressed',String(theme==='dark'));button.setAttribute('aria-label',theme==='dark'?'切換為日間模式':'切換為夜間模式');}
  if(persist)try{localStorage.setItem(key,theme);}catch{}
 }
 window.WorkbenchTheme={set:value=>apply(value,true),get current(){return theme;}};apply(theme);
 document.addEventListener('DOMContentLoaded',()=>{const button=document.getElementById('festival-theme');button?.addEventListener('click',event=>{event.preventDefault();event.stopImmediatePropagation();apply(theme==='dark'?'light':'dark',true);},true);apply(theme);});
 window.addEventListener('storage',event=>{if(event.key===key)apply(event.newValue);});
})();

/* Local navigation only. No network requests, authentication or database writes. */
(()=>{'use strict';
 function init(){
  const desk=document.getElementById('desk'),main=document.querySelector('main');if(!desk||!main||document.querySelector('.wb-shell'))return;
  document.body.classList.add('wb');
  const shell=document.createElement('div');shell.className='wb-shell';main.before(shell);
  const rail=document.createElement('aside');rail.className='wb-rail';rail.setAttribute('aria-label','工作台導覽');
  rail.innerHTML='<div class="wb-brand"><strong>學園祭</strong><span>兩校聯合 · 接待工作台</span></div><small>現場營運 / MANAGEMENT</small><nav class="wb-nav" aria-label="工作台功能"></nav><p class="wb-rail-note">桌次與訂單沿用原後台資料。<br>切換頁籤會保留尚未送出的表單。</p>';
  shell.append(rail,main);const nav=rail.querySelector('nav');
  const groups=[['desk','接待與結帳'],['festival-live-admin','點餐與票券'],['festival-menu-editor','餐點與服務'],['festival-lucky-roll','開獎與取消訂單'],['festival-appearance','學院與成員'],['festival-page-editor','主視覺與彈窗'],['history-cleanup','備份與清理']];
  let active='desk';
  function select(id,focus=false){
   const target=document.getElementById(id);if(id!=='desk'&&(!target||target.hidden))return;
   active=id;
   for(const [key]of groups){const el=document.getElementById(key);if(key==='desk'||!el)continue;el.classList.toggle('wb-active',key===id);if(key===id)el.open=true;}
   desk.querySelector('.columns')?.classList.toggle('wb-desk-hidden',id!=='desk');
   for(const b of nav.children){if(b.dataset.target===id)b.setAttribute('aria-current','page');else b.removeAttribute('aria-current');}
   if(focus){const heading=id==='desk'?document.getElementById('visit-heading'):target.querySelector('summary');if(heading){heading.tabIndex=-1;heading.focus({preventScroll:true});}}
  }
  groups.forEach(([id,label],i)=>{const b=document.createElement('button');b.type='button';b.dataset.target=id;const number=document.createElement('span');number.textContent=String(i+1).padStart(2,'0');b.append(number,document.createTextNode(label));b.addEventListener('click',()=>select(id,true));nav.append(b);});
  function sync(){rail.hidden=desk.hidden;for(const b of nav.children){const el=document.getElementById(b.dataset.target);b.hidden=b.dataset.target!=='desk'&&(!el||el.hidden);}if(active!=='desk'&&document.getElementById(active)?.hidden)select('desk');}
  // Observe permission visibility, including the asynchronously added page editor.
  new MutationObserver(sync).observe(desk,{attributes:true,attributeFilter:['hidden'],childList:true,subtree:true});
  desk.addEventListener('click',e=>{const summary=e.target.closest('summary');if(summary&&summary.parentElement.parentElement===desk&&summary.parentElement.classList.contains('wb-active'))e.preventDefault();});
  select('desk');sync();
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
