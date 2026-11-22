/* Additional event portraits; commerce identities and saved primary images remain intact. */
(()=>{'use strict';
const assets={amber:['amber-candy.png'],naipa:['naipa-candy.png'],noi:['noi-candy.png','noi-library.png'],mokona:['mokona-candy.png'],potato:['potato-melty.png']};
function init(){const dialog=document.getElementById('member-profile'),photo=document.getElementById('profile-photo');if(!dialog||!photo)return;
let nav;
document.addEventListener('click',event=>{const card=event.target.closest('.member[data-staff-name]');if(!card)return;
nav?.remove();nav=null;
const record=window.FestivalCharacters?.find(card.dataset.staffName,'B'),extras=assets[record?.id];if(!extras)return;
const img=photo.querySelector('img');if(!img)return;
const original={src:img.getAttribute('src'),fit:img.style.objectFit,position:img.style.objectPosition};
const sources=[original.src,...extras.map(name=>'school-photos/gallery-v128/'+name)].filter((value,index,list)=>list.indexOf(value)===index);
nav=document.createElement('div');nav.className='festival-photo-choices';nav.setAttribute('role','group');nav.setAttribute('aria-label',card.dataset.staffName+'的照片');
sources.forEach((src,index)=>{const button=document.createElement('button');button.type='button';button.setAttribute('aria-label',card.dataset.staffName+' 照片 '+(index+1));button.setAttribute('aria-pressed',String(index===0));const thumb=document.createElement('img');thumb.src=src;thumb.alt='';thumb.loading='lazy';button.append(thumb);button.addEventListener('click',()=>{img.src=src;img.alt=card.dataset.staffName+'的學園祭照片 '+(index+1);img.style.objectFit=index===0?original.fit:'contain';img.style.objectPosition=index===0?original.position:'center';nav.querySelectorAll('button').forEach(b=>b.setAttribute('aria-pressed',String(b===button)));});nav.append(button);});
photo.after(nav);
});
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
