(()=>{'use strict';const api=window.FestivalPhotos;
function init(){const dialog=document.getElementById('member-profile'),photo=document.getElementById('profile-photo');if(!dialog||!photo)return;const layout=photo.parentElement,copy=photo.nextElementSibling,media=document.createElement('div');media.className='profile-media-v143';photo.before(media);media.append(photo);if(copy){copy.classList.add('profile-copy-v143');copy.tabIndex=0;copy.setAttribute('role','region');copy.setAttribute('aria-label','成員自我介紹');}let timer,nav;
const reduced=matchMedia('(prefers-reduced-motion: reduce)');
dialog.addEventListener('close',()=>{if(dialog.open)return;clearInterval(timer);nav?.remove();nav=null;});
window.FestivalPresentation.load().then(data=>{
for(const team of ['A','B'])for(const [i,card]of [...document.querySelectorAll('#school-'+team.toLowerCase()+' .member')].entries()){const first=api.list(data.teams[team].members[i]||{})[0],img=card.querySelector('img');if(first&&img)api.apply(img,first);}
document.addEventListener('click',event=>{const card=event.target.closest('.member[data-staff-name]');if(!card)return;clearInterval(timer);nav?.remove();nav=null;
const member=['A','B'].flatMap(key=>data.teams[key].members).find(m=>m.name===card.dataset.staffName);if(!member)return;const photos=api.list(member),img=photo.querySelector('img');if(copy)copy.scrollTop=0;layout.scrollTop=0;media.scrollTop=0;dialog.scrollTop=0;if(!img||!photos.length)return;
let index=0,paused=member.galleryAuto===false||reduced.matches;
nav=document.createElement('div');nav.className='festival-photo-choices';nav.setAttribute('role','group');nav.setAttribute('aria-label',member.name+'的照片');
const status=document.createElement('span');status.className='gallery-count';status.setAttribute('aria-live','polite');
const strip=document.createElement('div');strip.className='gallery-thumbnails-v143';strip.setAttribute('aria-label','選擇照片');nav.append(strip);const thumbs=[];function show(i){index=(i+photos.length)%photos.length;api.apply(img,photos[index]);img.alt=member.name+'的照片 '+(index+1);status.textContent=(index+1)+' / '+photos.length;thumbs.forEach((b,j)=>b.setAttribute('aria-pressed',String(j===index)));}
function button(label,fn){const b=document.createElement('button');b.type='button';b.textContent=label;b.onclick=fn;return b;}
for(const [i,p]of photos.entries()){const b=button('',()=>{paused=true;pause.textContent='播放';show(i);});b.setAttribute('aria-label',member.name+' 照片 '+(i+1));const thumb=document.createElement('img');thumb.src=p.src;thumb.alt='';b.append(thumb);thumbs.push(b);strip.append(b);}
const pause=button(paused?'播放':'暫停',()=>{paused=!paused;pause.textContent=paused?'播放':'暫停';pause.setAttribute('aria-pressed',String(paused));});pause.setAttribute('aria-pressed',String(paused));
const controls=document.createElement('div');controls.className='gallery-controls';controls.append(button('上一張',()=>show(index-1)),status,button('下一張',()=>show(index+1)),pause);controls.hidden=photos.length<2;nav.append(controls);photo.after(nav);show(0);
timer=setInterval(()=>{if(dialog.open&&!paused&&!document.hidden&&!nav.matches(':hover')&&!nav.contains(document.activeElement))show(index+1);},6000);
});
});}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
