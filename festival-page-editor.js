(()=>{
 const schema=window.FestivalPageSchema;let app,adapter,revision=0,dirty=false,busy=false;
 const panel=document.createElement('details');panel.id='festival-page-editor';panel.hidden=true;panel.innerHTML='<summary>主題頁內容與彈窗</summary><div class="page-editor-body"><p class="page-editor-note">編輯主視覺合照、邀請函、活動介紹彈窗與中立方完整人設。成員與學院資料請用上方「活動頁面與學院設定」。活動說明文字不會改變發券計算規則。</p><div class="page-editor-toolbar"><button type="button" data-page-load>讀取目前內容</button><button type="button" data-page-save disabled>儲存並更新主題頁</button><a href="school-festival-roster-arena-preview.html?intro=1" target="_blank" rel="noopener">查看入口彈窗 ↗</a></div><p class="page-editor-status" role="status"></p><form hidden></form></div>';
 const form=panel.querySelector('form'),status=panel.querySelector('[role=status]'),save=panel.querySelector('[data-page-save]'),load=panel.querySelector('[data-page-load]');
 const byName=key=>form.elements.namedItem(key);
 function sync(){if(!window.FestivalPageEditorAdapter){panel.hidden=document.getElementById('festival-appearance')?.hidden!==false;if(panel.hidden){form.hidden=true;save.disabled=true;dirty=false;}}}
 function render(raw){const page=schema.normalize(raw);revision=page._revision;form.replaceChildren();
  schema.groups.forEach((group,index)=>{const box=document.createElement('details');box.className='page-editor-group';box.open=index===0;const title=document.createElement('summary');title.textContent=group.title;box.append(title);const grid=document.createElement('div');grid.className='page-editor-grid';
   for(const [key,caption,type]of group.fields){const label=document.createElement('label');label.className='page-field'+(type==='area'?' wide':'');const name=document.createElement('span');name.textContent=caption;label.append(name);let input;
    if(type==='font'){input=document.createElement('select');for(const [value,text]of [['sans','思源黑體／Noto Sans TC'],['system','微軟正黑體']]){const o=document.createElement('option');o.value=value;o.textContent=text;input.append(o);}input.value=page[key];}
    else if(type==='boolean'){input=document.createElement('input');input.type='checkbox';input.checked=page[key];label.classList.add('checkbox-field');}
    else{input=document.createElement(type==='area'?'textarea':'input');if(type!=='area')input.type='text';input.value=page[key];input.maxLength=key==='chairmanBiography'?5000:key==='introRules'?3000:1000;if(type==='area')input.rows=key==='chairmanBiography'?8:3;}
    input.name=key;label.append(input);grid.append(label);
    if(type==='photo'){const tools=document.createElement('div');tools.className='page-photo-tools';const photo=document.createElement('img');photo.alt=caption+'預覽';photo.hidden=!page[key];if(page[key])photo.src=page[key];tools.append(photo);
     if(window.FestivalPageEditorAdapter){const hint=document.createElement('small');hint.textContent='本機範例使用既有照片路徑；正式工作台提供圖片上傳。';tools.append(hint);}
     else{const upload=document.createElement('input');upload.type='file';upload.accept='image/png,image/jpeg,image/webp';upload.setAttribute('aria-label','上傳'+caption);upload.addEventListener('change',async()=>{if(!upload.files?.[0]||busy)return;setBusy(true);status.textContent='照片上傳中，完成後仍須按儲存才會公開。';try{input.value=await uploadPhoto(upload.files[0]);photo.src=input.value;photo.hidden=false;dirty=true;status.textContent='上傳完成，請儲存設定。';}catch(e){status.textContent=e.message;}finally{setBusy(false);}});tools.append(upload);}
     input.addEventListener('input',()=>{const url=schema.safePhoto(input.value);photo.hidden=!url;if(url)photo.src=url;});grid.append(tools);
    }
   }box.append(grid);form.append(box);
  });form.hidden=false;dirty=false;save.disabled=false;
 }
 function setBusy(value){busy=value;load.disabled=value;save.disabled=value||form.hidden;form.querySelectorAll('input,textarea,select').forEach(el=>el.disabled=value);}
 async function uploadPhoto(file){if(file.size>12*1024*1024)throw Error('請選擇 12 MB 以下照片。');const url=URL.createObjectURL(file);try{const img=new Image();await new Promise((ok,no)=>{img.onload=ok;img.onerror=()=>no(Error('無法讀取照片。'));img.src=url;});const canvas=document.createElement('canvas'),scale=Math.min(1,1200/Math.max(img.width,img.height));canvas.width=Math.max(1,Math.round(img.width*scale));canvas.height=Math.max(1,Math.round(img.height*scale));canvas.getContext('2d').drawImage(img,0,0,canvas.width,canvas.height);const image=canvas.toDataURL('image/webp',.82).split(',')[1];if(!image||image.length>1_066_000)throw Error('照片壓縮後仍太大，請縮小後再上傳。');const reply=await app.functions('asia-southeast1').httpsCallable('festivalMemberPhotoV102')({image});return reply.data.photo;}finally{URL.revokeObjectURL(url);}}
 load.onclick=async()=>{if(busy)return;if(dirty&&!confirm('目前有未儲存的草稿，確定重新讀取？'))return;setBusy(true);try{const data=await adapter.load();render(data.page);status.textContent='已讀取。按儲存後才會更新公開頁。';}catch(e){status.textContent=e.message||'無法讀取。';}finally{setBusy(false);}};
 save.onclick=async()=>{if(busy||form.hidden)return;const page={};for(const group of schema.groups)for(const [key,,type]of group.fields)page[key]=type==='boolean'?byName(key).checked:byName(key).value;
  setBusy(true);try{const result=await adapter.save(schema.normalize(page),revision);revision=result._revision;dirty=false;status.textContent=window.FestivalPageEditorAdapter?'已儲存在本機範例，未修改正式站。':'已儲存。重新整理公開主題頁即可看到更新。';}catch(e){status.textContent=e.message||'無法儲存，草稿已保留。';}finally{setBusy(false);}
 };
 form.addEventListener('submit',e=>e.preventDefault());form.addEventListener('input',()=>{dirty=true;});window.addEventListener('beforeunload',e=>{if(dirty||busy){e.preventDefault();e.returnValue='';}});
 function init(){if(window.FestivalPageEditorAdapter){adapter=window.FestivalPageEditorAdapter;document.querySelector('main').append(panel);panel.hidden=false;panel.open=true;load.click();return;}
  try{app=firebase.app('school-festival-read');}catch{return;}
  const anchor=document.getElementById('festival-appearance');if(!anchor)return;anchor.after(panel);
  adapter={load:()=>app.functions('asia-southeast1').httpsCallable('festivalPresentationV100')({}).then(r=>r.data),save:(page,expectedRevision)=>app.functions('asia-southeast1').httpsCallable('festivalPresentationV100')({action:'savePage',page,expectedRevision}).then(r=>r.data)};
  new MutationObserver(sync).observe(anchor,{attributes:true,attributeFilter:['hidden']});app.auth().onAuthStateChanged(()=>{dirty=false;sync();});sync();
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
