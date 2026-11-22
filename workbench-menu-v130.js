(()=>{'use strict';function init(){const nav=document.querySelector('.wb-nav'),panel=document.getElementById('festival-menu-editor'),live=document.getElementById('festival-live-admin');if(!nav||!panel||!live)return;
 const toolbar=document.createElement('div');toolbar.className='management-shortcuts';const note=document.createElement('p');note.textContent='在這裡管理本場開放時間與票券；活動餐點、價格、庫存及特殊服務請由下方入口管理。';toolbar.append(note);
 let pending;
 function jump(kind){pending?.disconnect();nav.querySelector('[data-target="festival-menu-editor"]')?.click();if(!kind)return;const form=document.getElementById('fest-menu-form');function apply(){if(form.hidden)return;pending?.disconnect();const field=form.elements.kind;document.getElementById('fest-menu-new').click();field.value=kind;field.dispatchEvent(new Event('change'));}if(form.hidden){pending=new MutationObserver(apply);pending.observe(form,{attributes:true,attributeFilter:['hidden']});}else apply();}
 for(const [label,kind]of [['管理全部品項',''],['新增餐點','food'],['新增特殊服務','magic']]){const b=document.createElement('button');b.type='button';b.textContent=label;b.onclick=()=>jump(kind);toolbar.append(b);}live.querySelector('section').prepend(toolbar);
 const hint=document.createElement('p');hint.className='menu-linkage-note';hint.textContent='儲存後同步本場學園祭菜單。餐點計入所屬學院的消費與票券；拍立得、個人攝影及交付服務沿用原拍攝女僕與時段。既有訂單保留成交時的內容。';panel.querySelector('section').prepend(hint);
 const load=document.getElementById('fest-menu-load');load.textContent='重新載入品項';load.title='取得正式後台目前儲存的本場品項，不會儲存或改動設定';
 document.getElementById('festival-load-options').textContent='更新本場開放設定與券號';
 const options=document.getElementById('festival-live-options'),legacy=document.createElement('details'),title=document.createElement('summary');legacy.className='legacy-menu-binding';title.textContent='沿用原菜單的四道餐點（選用）';legacy.append(title);for(const name of ['aBasic','aSpecial','bBasic','bSpecial']){const label=options.elements.namedItem(name)?.closest('label');if(label)legacy.append(label);}options.prepend(legacy);const oldHint=options.querySelector(':scope>p');if(oldHint)oldHint.textContent='活動自訂品項請用上方「管理全部品項」。下列四道原菜單綁定僅供沿用舊配置，可留空。';
 let requested=false;function auto(){if(panel.hidden){requested=false;return;}if(panel.classList.contains('wb-active')&&!requested){requested=true;load.click();}}
 new MutationObserver(auto).observe(panel,{attributes:true,attributeFilter:['hidden','class']});auto();
 const form=document.getElementById('fest-menu-form');new MutationObserver(()=>{if(!form.hidden)requested=true;}).observe(form,{attributes:true,attributeFilter:['hidden']});
 // A readable empty state without hiding creation controls.
 const list=document.getElementById('fest-menu-list'),empty=document.createElement('p');empty.className='menu-empty';empty.textContent='本場還沒有自訂品項。可在下方新增餐點或特殊服務。';list.after(empty);function sync(){empty.hidden=form.hidden||!!list.children.length;}new MutationObserver(sync).observe(list,{childList:true});new MutationObserver(sync).observe(form,{attributes:true});sync();
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();})();
