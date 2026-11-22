/* Live presentation layer: original member/profile/rules handlers remain attached. */
(()=>{'use strict';
 function init(){
  const main=document.querySelector('.festival-layout'),cover=main?.querySelector('.type-cover'),roster=document.getElementById('lineup');if(!main||!cover||!roster)return;
  document.body.classList.remove('actual-design','roster-design');document.body.classList.add('festival-collage');document.querySelector('.preview-label')?.remove();
  const hero=document.createElement('section');hero.className='collage-hero';hero.setAttribute('aria-label','學園祭封面');main.prepend(hero);hero.append(cover);
  const group=cover.querySelector('.campus-group');if(group)hero.append(group);
  cover.className='collage-copy';cover.querySelector('.type-overline')?.setAttribute('data-festival-title','');
  const welcome=cover.querySelector('.cover-message');if(welcome)welcome.setAttribute('data-festival-welcome','');
  const links=document.createElement('div');links.className='collage-actions';
  const order=document.createElement('a');order.className='action primary';order.href='school-festival-order.html';order.textContent='前往學園祭點餐';
  const cast=document.createElement('a');cast.className='collage-text-link';cast.href='#lineup';cast.textContent='認識雙校學生';links.append(order,cast);cover.append(links);
  const photos=document.createElement('div');photos.className='collage-portraits';hero.append(photos);
  const controls=document.createElement('div');controls.className='collage-controls';
  const previous=document.createElement('button'),next=document.createElement('button'),pause=document.createElement('button');
  for(const button of [previous,next,pause])button.type='button';previous.textContent='上一組';next.textContent='下一組';pause.textContent='暫停封面';pause.setAttribute('aria-pressed','false');controls.append(previous,next,pause);hero.append(controls);
  const invitation=document.querySelector('.chairman-invitation');if(invitation){const quote=invitation.querySelector('blockquote');if(quote)quote.classList.add('collage-quote');}
  const reduce=matchMedia('(prefers-reduced-motion: reduce)');let index=0,stopped=reduce.matches,hover=false,focused=false,rows={A:[],B:[]};
  function draw(){
   photos.replaceChildren();
   for(const [team,slot]of [['A','first'],['B','second']]){
    const available=rows[team];if(!available.length)continue;const m=available[index%available.length];
    const button=document.createElement('button');button.type='button';button.className='collage-portrait '+slot;button.setAttribute('aria-label','查看'+m.name+'的介紹');
    const img=document.createElement('img');img.src=m.photo;img.alt=m.name+'的學園祭照片';img.style.objectPosition='50% '+(Number.isFinite(m.photoY)?m.photoY:28)+'%';img.style.objectFit=m.photoFit==='contain'?'contain':'cover';
    const caption=document.createElement('span');const identity=window.FestivalCharacters?window.FestivalCharacters.identity(m):{name:m.name,shortName:m.name};caption.textContent=identity.shortName;if(identity.name!==m.name){const staff=document.createElement('small');staff.className='character-staff';staff.textContent=m.name;caption.append(staff);}button.setAttribute('aria-label','查看'+identity.name+'（'+m.name+'）的介紹');button.append(img,caption);
    button.addEventListener('click',()=>{const card=[...document.querySelectorAll('#school-'+team.toLowerCase()+' .member')].find(b=>(b.dataset.staffName||b.querySelector('strong')?.textContent)===m.name);card?.click();});photos.append(button);
   }
   const canRotate=Object.values(rows).some(list=>list.length>1);controls.hidden=!canRotate;pause.textContent=stopped?'播放封面':'暫停封面';pause.setAttribute('aria-pressed',String(stopped));
  }
  function move(delta){const count=Math.max(1,...Object.values(rows).map(list=>list.length));index=(index+delta+count)%count;draw();}
  previous.addEventListener('click',()=>move(-1));next.addEventListener('click',()=>move(1));pause.addEventListener('click',()=>{stopped=!stopped;draw();});
  hero.addEventListener('mouseenter',()=>{hover=true;});hero.addEventListener('mouseleave',()=>{hover=false;});hero.addEventListener('focusin',()=>{focused=true;});hero.addEventListener('focusout',e=>{focused=hero.contains(e.relatedTarget);});
  reduce.addEventListener('change',()=>{if(reduce.matches){stopped=true;draw();}});
  const timer=setInterval(()=>{if(!stopped&&!hover&&!focused&&!document.hidden&&!document.querySelector('dialog[open]'))move(1);},6500);window.addEventListener('pagehide',()=>clearInterval(timer),{once:true});
  window.FestivalPresentation.load().then(data=>{
   rows={A:[],B:[]};for(const team of ['A','B'])rows[team]=(data.teams?.[team]?.members||[]).filter(m=>m.photo);
   // Fall back to the original DOM only when the server has no explicit roster setting.
   for(const team of ['A','B'])if(!data.teams?.[team]?.empty&&!data.teams?.[team]?.members)rows[team]=[...document.querySelectorAll('#school-'+team.toLowerCase()+' .member')].map(b=>({name:b.querySelector('strong').textContent,photo:b.querySelector('img')?.getAttribute('src')})).filter(m=>m.photo);
   const schoolText=[data.teams?.A?.name,data.teams?.B?.name].filter(Boolean).join(' × ');if(welcome)welcome.textContent=data.welcome||schoolText;
   if(cover.querySelector('.type-overline'))cover.querySelector('.type-overline').textContent=schoolText;
   if(data.page?.orderButton)order.textContent=data.page.orderButton;const rulesTitle=document.querySelector('#rules-dialog h2');if(rulesTitle)rulesTitle.id='rules-title';draw();window.SchoolFestivalTheme?.refresh();
  });
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
