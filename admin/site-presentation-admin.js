'use strict';
(() => {
  const schema=window.EphemereSitePresentation,host=document.getElementById('siteContentTab');
  if(!schema||!host||!window.firebase?.apps?.length)return;
  const db=firebase.database(),auth=firebase.auth(),ref=db.ref(schema.path);
  let user=null,allowed=false,loaded=false,authRevision=0,unsubscribe=null;
  const states=new Map();const root=document.createElement('section');root.className='site-presentation-admin';root.hidden=true;
  const el=(tag,value,className)=>{const n=document.createElement(tag);if(value)n.textContent=value;if(className)n.className=className;return n;};
  root.append(el('h3','官網文字與版面內容'),el('p','分區編輯後按「儲存並同步官網」才會公開。成員照片、菜單品項、拍立得作品、棚景及留言審核繼續使用原本管理區；這裡不更改訂單、低消計算或投稿同意規則。'));
  const globalStatus=el('p','','presentation-status');globalStatus.setAttribute('role','status');root.append(globalStatus);host.prepend(root);
  function status(state,message,error=false){state.status.textContent=message;state.status.dataset.error=String(error);}
  async function manager(account){
    if(!account)return false;if(String(account.email||'').toLowerCase()==='tanjicafe@gmail.com')return true;
    const [owner,role]=await Promise.all([db.ref('lephemere/todayStaff/_access/ownerUid').once('value'),db.ref('lephemere/todayStaff/_access/users/'+account.uid+'/role').once('value')]);
    return owner.val()===account.uid||role.val()==='manager';
  }
  async function requireManager(){const account=auth.currentUser,revision=authRevision;if(!account||account.uid!==user?.uid||!await manager(account)||revision!==authRevision||auth.currentUser?.uid!==account.uid)throw Error('目前帳號沒有管理官網內容的權限。');return account;}
  function busy(state,value){state.busy=value;for(const n of state.form.querySelectorAll('input,textarea,button'))n.disabled=!allowed||!loaded||value||n.dataset.boundary==='true';}
  function mark(state){state.dirty=true;status(state,'此區有尚未儲存的修改。');}
  function input(field,labelText,value){const label=el('label','','presentation-field');label.append(el('span',labelText));const n=document.createElement(field.type==='textarea'?'textarea':'input');
    if(field.type==='textarea'){n.rows=3;label.classList.add('is-wide');}else n.type=field.type==='checkbox'?'checkbox':field.type==='url'||field.type==='image'?'url':'text';
    if(field.type==='checkbox')n.checked=value===true;else n.value=String(value??'');
    if(field.max)n.maxLength=field.max;if(n.type==='url'){n.pattern='https://.+';n.placeholder=field.type==='image'?'留白使用原有圖片；或上傳新圖':'https://...';}
    label.append(n);return {label,node:n,read:()=>n.type==='checkbox'?n.checked:n.value,set:v=>{if(n.type==='checkbox')n.checked=v===true;else n.value=String(v??'');}};
  }
  function listControl(field,state,value){
    const wrap=el('div','','presentation-repeater');wrap.append(el('h4',field.label));const rows=document.createElement('div');wrap.append(rows);
    let items=[];
    const keys=field.type==='cards'?[['title','服務名稱',80],['body','服務說明',1500],['note','補充說明',1000],['label','連結文字（選填）',80],['url','連結網址（選填）',2000]]:[['title','規則標題',80],['body','規則說明',1500]];
    function read(){return items.map(item=>Object.fromEntries(keys.map(([key])=>[key,item.controls[key].read()])));}
    function draw(values){rows.replaceChildren();items=[];values.forEach((value,index)=>{
      const row=el('div','','presentation-repeat-row'),controls={};
      for(const [key,label,max]of keys){const control=input({type:key==='body'||key==='note'?'textarea':key==='url'?'url':'text',max},label,value[key]||'');controls[key]=control;row.append(control.label);}
      const tools=el('div','','row-tools');tools.append(el('span',(index+1)+' / '+values.length));
      for(const [label,delta]of [['上移',-1],['下移',1]]){const b=el('button',label);b.type='button';b.disabled=index+delta<0||index+delta>=values.length;b.dataset.boundary=String(b.disabled);b.addEventListener('click',()=>{const values=read(),next=index+delta;if(next<0||next>=values.length)return;[values[index],values[next]]=[values[next],values[index]];draw(values);mark(state);});tools.append(b);}
      const remove=el('button','移除此項');remove.type='button';remove.addEventListener('click',()=>{const values=read();values.splice(index,1);draw(values);mark(state);});tools.append(remove);row.append(tools);rows.append(row);items.push({controls});
    });}
    const add=el('button',field.type==='cards'?'新增服務介紹':field.type==='faqs'?'新增問題':'新增規則');add.type='button';add.addEventListener('click',()=>{const values=read(),max=field.type==='cards'?12:30;if(values.length>=max){status(state,'此區最多 '+max+' 項。',true);return;}values.push({title:'',body:''});draw(values);mark(state);});wrap.append(add);draw(value);
    return {label:wrap,read,set:draw};
  }
  for(const group of schema.groups){
    const details=document.createElement('details');details.dataset.presentationGroup=group.key;details.append(el('summary',group.label));
    const form=el('form','','presentation-form'),fields=el('div','','presentation-fields'),message=el('p','','presentation-status');message.setAttribute('role','status');
    const state={group,form,status:message,controls:{},baseline:0,record:null,dirty:false,busy:false};states.set(group.key,state);
    for(const field of group.fields){
      const control=['cards','rules','faqs'].includes(field.type)?listControl(field,state,field.default):input(field,field.label,field.default);state.controls[field.key]=control;fields.append(control.label);
      if(field.type==='image'){
        const outer=el('div','','presentation-field is-wide');control.label.replaceWith(outer);outer.append(control.label);
        const upload=el('div','','presentation-upload'),file=document.createElement('input');file.type='file';file.accept='image/png,image/jpeg,image/webp';file.setAttribute('aria-label','選擇'+field.label+'圖片');const b=el('button','上傳圖片');b.type='button';upload.append(file,b);outer.append(upload);
        const preview=document.createElement('img'),caption=el('small','目前使用官網預設圖');preview.className='presentation-image-preview';preview.alt=field.label+'預覽';preview.hidden=true;outer.append(preview,caption);
        function imagePreview(){const url=schema.url(control.read());preview.hidden=!url;caption.textContent=url?'圖片預覽':'目前使用官網預設圖';if(url&&preview.getAttribute('src')!==url)preview.src=url;if(!url)preview.removeAttribute('src');}
        const setImage=control.set;control.set=value=>{setImage(value);imagePreview();};control.node.addEventListener('change',imagePreview);preview.addEventListener('error',()=>{caption.textContent='圖片暫時無法載入，請確認網址或重新上傳。';});imagePreview();
        b.addEventListener('click',async()=>{
          if(state.busy)return;busy(state,true);
          try{const account=await requireManager(),f=file.files[0];if(!f)throw Error('請先選擇圖片。');if(!['image/png','image/jpeg','image/webp'].includes(f.type)||f.size>=12*1024*1024)throw Error('請選擇小於 12MB 的 PNG、JPG 或 WebP 圖片。');
            const revision=authRevision;busy(state,true);status(state,'正在上傳圖片…');const ext=f.type==='image/png'?'png':f.type==='image/jpeg'?'jpg':'webp';const object=firebase.storage().ref('site-content/presentation/'+group.key+'-'+field.key+'-'+account.uid+'-'+Date.now()+'.'+ext);
            await object.put(f,{contentType:f.type,cacheControl:'public,max-age=3600'});const url=await object.getDownloadURL();if(revision!==authRevision)throw Error('登入身分已變更，這次圖片未套用。');control.set(url);state.dirty=true;status(state,'圖片已上傳；按下本區儲存後才會顯示於官網。');file.value='';
          }catch(error){status(state,error.message||'圖片上傳失敗。',true);}finally{busy(state,false);}
        });
      }
    }
    const actions=el('div','','presentation-actions'),save=el('button','儲存並同步官網','primary');save.type='submit';save.dataset.presentationSave=group.key;
    const reload=el('button','重新讀取此區'),reset=el('button','填入此區預設');reload.type=reset.type='button';
    const view=el('a','查看官網');view.href='https://ephemereffxiv.com/'+group.route;view.target='_blank';view.rel='noopener';actions.append(save,reload,reset,view);form.append(fields,actions,message);details.append(form);root.append(details);
    form.addEventListener('input',()=>mark(state));form.addEventListener('change',()=>mark(state));
    const fill=record=>{const values=schema.values(group,record);for(const f of group.fields)state.controls[f.key].set(values[f.key]);state.record=record;state.baseline=Number(record?.revision)||0;state.dirty=false;};state.fill=fill;
    reload.addEventListener('click',async()=>{if(state.dirty&&!window.confirm('要放棄此區尚未儲存的修改，重新讀取官網設定嗎？'))return;try{busy(state,true);fill((await ref.child(group.key).once('value')).val());status(state,'已重新讀取。');}catch(e){status(state,e.message,true);}finally{busy(state,false);}});
    reset.addEventListener('click',()=>{for(const f of group.fields)state.controls[f.key].set(structuredClone(f.default));mark(state);status(state,'已填入預設內容，尚未儲存至官網。');});
    form.addEventListener('submit',async event=>{
      event.preventDefault();if(state.busy||!form.reportValidity())return;busy(state,true);
      try{
        await requireManager();if(!loaded)throw Error('尚未讀取官網設定，請稍候。');
        const values={};for(const f of group.fields){const raw=state.controls[f.key].read();
          if((f.type==='url'||f.type==='image')&&raw&&!schema.url(raw))throw Error(f.label+'請使用完整的 HTTPS 網址。');
          if(['cards','rules','faqs'].includes(f.type)&&raw.some(r=>!r.title.trim()||!r.body.trim()))throw Error(f.label+'每一項都需要填寫名稱與說明。');
          values[f.key]=schema.clean(f,raw);
        }
        const revision=authRevision,baseline=state.baseline;busy(state,true);status(state,'正在儲存…');
        const target=ref.child(group.key);await target.once('value');
        const result=await target.transaction(current=>{if(revision!==authRevision||(Number(current?.revision)||0)!==baseline)return;return {...(current||{}),values:{...(current?.values||{}),...values},revision:baseline+1,updatedAt:firebase.database.ServerValue.TIMESTAMP};});
        if(revision!==authRevision)return;if(!result.committed)throw Error('此區已被其他管理員更新。請先重新讀取，再確認你的修改。');
        fill(result.snapshot.val());status(state,'已儲存，官網會同步更新。');
      }catch(error){status(state,error.message||'儲存失敗，修改仍保留在畫面上。',true);}finally{busy(state,false);}
    });busy(state,false);
  }
  window.addEventListener('beforeunload',event=>{if([...states.values()].some(state=>state.dirty||state.busy)){event.preventDefault();event.returnValue='';}});
  auth.onAuthStateChanged(async account=>{
    const revision=++authRevision;user=account;allowed=false;loaded=false;root.hidden=true;if(unsubscribe){unsubscribe();unsubscribe=null;}for(const state of states.values()){state.fill(null);busy(state,false);}
    try{
      const ok=await manager(account);if(revision!==authRevision||!ok)return;allowed=true;root.hidden=false;globalStatus.textContent='正在讀取官網文字設定…';
      const callback=snapshot=>{if(revision!==authRevision)return;loaded=true;const data=snapshot.val()||{};for(const [key,state]of states){const next=data[key]||null;if(!state.dirty)state.fill(next);else if((Number(next?.revision)||0)!==state.baseline&&!state.busy)status(state,'此區有其他管理員的新版本。你的修改已保留，儲存前請重新讀取。',true);busy(state,state.busy);}globalStatus.textContent='只修改此頁的新官網設定，不會更動既有菜單、照片、訂單或留言紀錄。';};
      ref.on('value',callback,error=>{loaded=false;globalStatus.textContent='設定無法讀取：'+error.message;for(const state of states.values())busy(state,false);});unsubscribe=()=>ref.off('value',callback);
    }catch(error){if(revision===authRevision)globalStatus.textContent='無法確認管理權限：'+error.message;}
  });
})();
