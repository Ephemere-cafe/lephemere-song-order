(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory();else root.FestivalPhotos=factory();})(typeof globalThis!=='undefined'?globalThis:this,function(){
'use strict';
const clamp=(value,min,max,fallback)=>value!==null&&value!==''&&Number.isFinite(Number(value))?Math.min(max,Math.max(min,Number(value))):fallback;
function url(value){if(typeof value!=='string')return '';value=value.trim().slice(0,700);if(/^(school-photos|school-festival-assets)\/(?:gallery-v128\/)?[\w.-]+\.(png|jpe?g|webp|avif)$/i.test(value))return value;try{const u=new URL(value);if(u.protocol==='https:'&&!u.username&&!u.password)return u.href;}catch{}return '';}
function photo(raw){const p=typeof raw==='string'?{src:raw}:raw||{};return {src:url(p.src),fit:p.fit==='contain'?'contain':'cover',x:clamp(p.x,0,100,50),y:clamp(p.y,0,100,28),zoom:clamp(p.zoom,1,2.5,1),rotate:clamp(p.rotate,-30,30,0),...(p.compositionVersion===2?{compositionVersion:2}:{})};}
function normalize(values){return Array.isArray(values)?values.slice(0,8).map(photo).filter(p=>p.src):[];}
const extras={amber:['amber-candy.png'],naipa:['naipa-candy.png'],noi:['noi-candy.png','noi-library.png'],mokona:['mokona-candy.png'],potato:['potato-melty.png']};
function list(member){if(Array.isArray(member.photos))return normalize(member.photos);const main=photo({src:member.photo,fit:member.photoFit,x:member.photoX,y:member.photoY,zoom:member.photoZoom,rotate:member.photoRotate});const id=typeof window!=='undefined'?window.FestivalCharacters?.find(member.name,'B')?.id:null;return normalize([main,...(extras[id]||[]).map(name=>({src:'school-photos/gallery-v128/'+name,fit:'contain',y:50}))]);}
function apply(img,p){if(img.getAttribute('src')!==p.src)img.src=p.src;const camera=globalThis.PhotoCameraV152;if(camera?.render(img,p))return;camera?.clear(img);img.style.setProperty('object-fit',p.fit,'important');img.style.setProperty('object-position',p.x+'% '+p.y+'%','important');img.style.transform='scale('+p.zoom+') rotate('+p.rotate+'deg)';}
return {url,photo,normalize,list,apply};
});
