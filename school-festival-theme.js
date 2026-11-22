/* Shared public theme preference. No database writes or order behavior. */
(()=>{
 'use strict';
 const key='ephemereFestivalTheme';
 const palettes={"light":{"bg":"#f5f7fc","surface":"#ffffff","panel":"#e4ebf5","ink":"#213653","muted":"#4b607d","line":"#c7d3e4","a":"#284b80","b":"#9a422e","aw":"#e3eaf5","bw":"#f5e7df","button":"#ffffff"},"dark":{"bg":"#131e31","surface":"#1d2d46","panel":"#253956","ink":"#f0f4fc","muted":"#bac9df","line":"#536884","a":"#b9d4ff","b":"#ffd1ac","aw":"#263c5b","bw":"#493b34","button":"#172238"}};
 let selected='light';try{selected=localStorage.getItem(key)==='dark'?'dark':'light';}catch{}
 function apply(value,persist=false){
  selected=value==='dark'?'dark':'light';const p=palettes[selected];
  document.documentElement.dataset.festivalTheme=selected;
  const tokens={...Object.fromEntries(Object.entries(p).map(([k,v])=>['--fp-'+k,v])),'--paper':p.bg,'--paper2':p.surface,'--ink':p.ink,'--muted':p.muted,'--line':p.line,'--rose':p.b,'--night':p.a,'--gold':p.b,'--sage':p.a,'--card':p.surface,'--ink-deep':p.ink,'--parchment':p.ink,'--parchment-dim':p.muted,'--mist':p.a,'--wine':p.b,'--wine-dark':p.b,'--a':p.a,'--b':p.b,'--ap':p.aw,'--bp':p.bw,'--academy-a':p.a,'--academy-b':p.b,'--academy-a-paper':p.aw,'--academy-b-paper':p.bw,'--academy-paper':p.bg,'--academy-sheet':p.surface,'--academy-ink':p.ink,'--academy-muted':p.muted,'--academy-line':p.line,'--school-a':p.a,'--school-b':p.b,'--school-ap':p.aw,'--school-bp':p.bw,'--festival-accent-a':p.a,'--festival-accent-b':p.b};
  for(const target of [document.documentElement,document.body].filter(Boolean))for(const [name,color]of Object.entries(tokens))target.style.setProperty(name,color,'important');
  document.querySelectorAll('[data-festival-theme-toggle]').forEach(button=>{button.textContent=selected==='dark'?'切換淺色':'切換深色';button.setAttribute('aria-pressed',String(selected==='dark'));button.setAttribute('aria-label',selected==='dark'?'目前為深色，切換淺色模式':'目前為淺色，切換深色模式');});
  if(persist)try{localStorage.setItem(key,selected);}catch{}
  window.dispatchEvent(new CustomEvent('festival-theme-change',{detail:{theme:selected}}));
 }
 window.SchoolFestivalTheme={set:value=>apply(value,true),refresh:()=>apply(selected),get current(){return selected;}};
 apply(selected);
 function init(){
  let button=document.querySelector('[data-festival-theme-toggle]')||document.getElementById('festival-theme');
  if(!button){button=document.createElement('button');button.type='button';button.className='festival-theme-toggle';const host=document.querySelector('.festival-guest-tools')||document.querySelector('header nav')||document.querySelector('.masthead-tools');if(host)host.append(button);}
  if(button){button.setAttribute('data-festival-theme-toggle','');button.classList.add('festival-theme-toggle');button.addEventListener('click',event=>{event.preventDefault();event.stopImmediatePropagation();apply(selected==='dark'?'light':'dark',true);},true);}
  apply(selected);
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
 window.addEventListener('storage',event=>{if(event.key===key)apply(event.newValue==='dark'?'dark':'light');});
})();
