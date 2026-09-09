(function(){
  'use strict';
  if(!window.firebase || !firebase.apps || !firebase.apps.length) return;
  var db=firebase.database();
  var storage=firebase.storage();
  var auth=firebase.auth();
  var ROOT='lephemere/siteContent/studios';
  var MANAGER_EMAIL='tanjicafe@gmail.com';
  var MAX_FILE_BYTES=12*1024*1024;
  var studios=[];
  var editingId='';
  var draftImages=[];
  var draftCoverId='';
  var removedPaths=[];
  var canManage=false;
  var canUpload=false;
  var listening=false;
  var fallback={
    'legacy-deep-sea':{name:'深海之花',summary:'在光線無法抵達的深海交界處，那座冰冷的鐵籠靜靜佇立——',description:'在光線無法抵達的深海交界處，那座冰冷的鐵籠靜靜佇立——',status:'memory',sortOrder:100,visible:true,coverImageId:'main',images:{main:{imageUrl:'https://ephemereffxiv.com/assets/studio-deep-sea.webp',storagePath:'',alt:'深海之花攝影棚',sortOrder:100}}},
    'legacy-window':{name:'放學後的窗邊',summary:'轉過身，窗外是永不凋零的漫天櫻花，在微風中輕輕搖曳。',description:'轉過身，窗外是永不凋零的漫天櫻花，在微風中輕輕搖曳。',status:'memory',sortOrder:200,visible:true,coverImageId:'main',images:{main:{imageUrl:'https://ephemereffxiv.com/assets/studio-window.webp',storagePath:'',alt:'放學後的窗邊攝影棚',sortOrder:100}}},
    'legacy-ephemeral':{name:'曇花一瞬',summary:'曇華稍縱即逝，花境恆留此時——願框中的這一刻，是屬於你的長存。',description:'曇華稍縱即逝，花境恆留此時——願框中的這一刻，是屬於你的長存。',status:'memory',sortOrder:300,visible:true,coverImageId:'main',images:{main:{imageUrl:'https://ephemereffxiv.com/assets/studio-ephemeral.webp',storagePath:'',alt:'曇花一瞬攝影棚',sortOrder:100}}}
  };
  function byId(id){return document.getElementById(id);}
  function clean(value,max){return String(value||'').trim().slice(0,max);}
  function status(text,state){var node=byId('studioAdminStatus');node.textContent=text||'';node.dataset.state=state||'';}
  function safeUrl(value){try{var url=new URL(String(value||''));return url.protocol==='https:'?url.href:'';}catch(_error){return '';}}
  function clone(value){return JSON.parse(JSON.stringify(value));}
  function manager(user,owner,role){return !!user&&(String(user.email||'').toLowerCase()===MANAGER_EMAIL||owner===user.uid||role==='manager');}
  async function checkManager(user){if(!user)return false;var values=await Promise.all([db.ref('lephemere/todayStaff/_access/ownerUid').once('value'),db.ref('lephemere/todayStaff/_access/users/'+user.uid+'/role').once('value')]);return manager(user,values[0].val(),values[1].val());}
  function normalize(value){var stored=value||{};var source=Object.assign({},fallback,stored);return Object.keys(source).map(function(id){return {id:id,data:source[id]||{},fallback:!Object.prototype.hasOwnProperty.call(stored,id)};}).sort(function(a,b){return Number(a.data.sortOrder||0)-Number(b.data.sortOrder||0);});}
  function imageRows(entry){return Object.keys(entry.images||{}).map(function(id){return Object.assign({id:id},entry.images[id]||{});}).filter(function(item){return safeUrl(item.imageUrl);}).sort(function(a,b){return Number(a.sortOrder||0)-Number(b.sortOrder||0);});}
  function displayUrl(image){return image.objectUrl||safeUrl(image.imageUrl);}
  function cover(entry){var rows=imageRows(entry);return rows.find(function(image){return image.id===entry.coverImageId;})||rows[0]||null;}
  function current(){return studios.find(function(item){return item.id===editingId;})||null;}
  function revokeDraft(){draftImages.forEach(function(image){if(image.objectUrl)URL.revokeObjectURL(image.objectUrl);});}
  function renderList(){
    var list=byId('studioAdminList');list.replaceChildren();if(!studios.length){var empty=document.createElement('span');empty.className='empty';empty.textContent='尚未建立棚景。';list.appendChild(empty);return;}
    studios.forEach(function(item){var row=document.createElement('article');row.className='studio-admin-item';var thumb=document.createElement('div');thumb.className='studio-admin-thumb';var image=cover(item.data);if(image){var img=document.createElement('img');img.src=safeUrl(image.imageUrl);img.alt='';thumb.appendChild(img);}else thumb.textContent='尚無圖片';var copy=document.createElement('div');copy.className='studio-admin-copy';var name=document.createElement('strong');name.textContent=item.data.name||'未命名棚景';var meta=document.createElement('span');meta.textContent=(item.data.status==='active'?'現役':'回憶')+' · 排序 '+Number(item.data.sortOrder||0)+(item.fallback?' · 尚未寫入 Firebase':'');copy.append(name,meta);var button=document.createElement('button');button.type='button';button.className='btn ghost small';button.textContent='編輯';button.addEventListener('click',function(){open(item.id);});row.append(thumb,copy,button);list.appendChild(row);});
  }
  function setFields(item){var data=item?item.data:{};byId('studioEditorTitle').textContent=item?'編輯棚景':'新增棚景';byId('studioName').value=data.name||'';byId('studioStatus').value=data.status==='memory'?'memory':'active';byId('studioSortOrder').value=Number(data.sortOrder||((studios.length+1)*100));byId('studioVisible').checked=data.visible!==false;byId('studioSummary').value=data.summary||'';byId('studioDescription').value=data.description||'';}
  function open(id){revokeDraft();removedPaths=[];editingId=id;var item=current();setFields(item);draftImages=imageRows(item?item.data:{}).map(function(image){return clone(image);});draftCoverId=item&&item.data.coverImageId||draftImages[0]&&draftImages[0].id||'';renderImages();status(item&&item.fallback?'這是官網原本的棚景；首次儲存後才會建立 Firebase 可編輯記錄。':'已載入棚景資料。','');}
  function add(){var id=db.ref(ROOT).push().key;studios.push({id:id,data:{name:'',summary:'',description:'',status:'active',sortOrder:(studios.length+1)*100,visible:true,images:{}},fallback:false,draft:true});renderList();open(id);byId('studioName').focus();}
  function renderImages(){
    var list=byId('studioImageList');list.replaceChildren();if(!draftImages.length){var empty=document.createElement('span');empty.className='empty';empty.textContent='尚未加入圖片。棚景至少需要一張圖片才可顯示。';list.appendChild(empty);return;}
    draftImages.forEach(function(image,index){var item=document.createElement('article');item.className='studio-image-item';var preview=document.createElement('div');preview.className='studio-image-preview';var img=document.createElement('img');img.src=displayUrl(image);img.alt='';preview.appendChild(img);var remove=document.createElement('button');remove.type='button';remove.className='studio-image-remove';remove.setAttribute('aria-label','移除第 '+(index+1)+' 張圖片');remove.textContent='×';remove.addEventListener('click',function(){if(!window.confirm('要從這個棚景移除這張圖片嗎？儲存後才會生效。'))return;if(image.storagePath)removedPaths.push(image.storagePath);if(image.objectUrl)URL.revokeObjectURL(image.objectUrl);draftImages=draftImages.filter(function(row){return row.id!==image.id;});if(draftCoverId===image.id)draftCoverId=draftImages[0]&&draftImages[0].id||'';renderImages();});
      remove.disabled=!canUpload;var info=document.createElement('div');info.className='studio-image-info';var coverLabel=document.createElement('label');var radio=document.createElement('input');radio.type='radio';radio.name='studioCoverImage';radio.checked=draftCoverId===image.id;radio.addEventListener('change',function(){draftCoverId=image.id;});coverLabel.append(radio,document.createTextNode('設為封面'));var alt=document.createElement('input');alt.type='text';alt.maxLength=160;alt.placeholder='圖片替代文字';alt.value=image.alt||'';alt.addEventListener('input',function(){image.alt=clean(alt.value,160);});info.append(coverLabel,alt);item.append(preview,remove,info);list.appendChild(item);});
  }
  function validFile(file){if(!/^image\/(jpeg|png|webp)$/i.test(file.type))throw new Error('僅支援 JPG、PNG 或 WebP 圖片。');if(file.size>MAX_FILE_BYTES)throw new Error('每張圖片不可超過 12 MB。');}
  function addFiles(files){if(!canUpload){status('圖片上傳僅限 tanjicafe@gmail.com。','error');return;}try{Array.prototype.forEach.call(files,function(file){validFile(file);var id=db.ref().push().key;draftImages.push({id:id,file:file,objectUrl:URL.createObjectURL(file),imageUrl:'',storagePath:'',alt:clean(file.name.replace(/\.[^.]+$/,''),160),sortOrder:(draftImages.length+1)*100,isNew:true});if(!draftCoverId)draftCoverId=id;});renderImages();status('圖片已載入預覽；按「儲存棚景」才會上傳。','');}catch(error){status(error.message,'error');}byId('studioImagesInput').value='';}
  function loadImage(file){return new Promise(function(resolve,reject){var img=new Image();var url=URL.createObjectURL(file);img.onload=function(){URL.revokeObjectURL(url);resolve(img);};img.onerror=function(){URL.revokeObjectURL(url);reject(new Error('無法讀取圖片。'));};img.src=url;});}
  async function imageBlob(file){validFile(file);var img=await loadImage(file);var ratio=Math.min(1,2400/Math.max(img.naturalWidth,img.naturalHeight));var canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.round(img.naturalWidth*ratio));canvas.height=Math.max(1,Math.round(img.naturalHeight*ratio));var context=canvas.getContext('2d',{alpha:false});context.imageSmoothingEnabled=true;context.imageSmoothingQuality='high';context.drawImage(img,0,0,canvas.width,canvas.height);return new Promise(function(resolve,reject){canvas.toBlob(function(blob){blob?resolve(blob):reject(new Error('圖片壓縮失敗。'));},'image/webp',.9);});}
  async function upload(image,studioId){var blob=await imageBlob(image.file);var path='site-content/studios/'+studioId+'/'+image.id+'.webp';var ref=storage.ref(path);await ref.put(blob,{contentType:'image/webp',cacheControl:'public,max-age=3600'});return {imageUrl:await ref.getDownloadURL(),storagePath:path};}
  async function save(){
    if(!canManage||!auth.currentUser){status('目前帳號沒有管理攝影棚的權限。','error');return;}var item=current();if(!item){status('請先選擇或新增棚景。','error');return;}var name=clean(byId('studioName').value,80);var summary=clean(byId('studioSummary').value,240);var description=clean(byId('studioDescription').value,3000);var sortOrder=Math.max(0,Math.min(999999,Number(byId('studioSortOrder').value)||0));if(!name){byId('studioName').focus();status('請填寫棚名。','error');return;}if(draftImages.some(function(image){return image.isNew;})&&!canUpload){status('圖片上傳僅限 tanjicafe@gmail.com。','error');return;}if(!draftImages.length){status('請至少加入一張棚景圖片。','error');return;}if(!draftCoverId)draftCoverId=draftImages[0].id;
    var button=byId('studioSave');button.disabled=true;button.textContent='圖片上傳與儲存中…';status('正在壓縮圖片並同步官網…','busy');var uploaded=[];
    try{
      for(var i=0;i<draftImages.length;i++){var image=draftImages[i];if(image.isNew){var result=await upload(image,item.id);image.imageUrl=result.imageUrl;image.storagePath=result.storagePath;uploaded.push(result.storagePath);}}
      var imageData={};draftImages.forEach(function(image,index){imageData[image.id]={imageUrl:safeUrl(image.imageUrl),storagePath:clean(image.storagePath,240),alt:clean(image.alt,160)||name+'攝影棚圖片 '+(index+1),sortOrder:(index+1)*100};});
      var record={name:name,summary:summary,description:description,status:byId('studioStatus').value==='memory'?'memory':'active',sortOrder:sortOrder,visible:byId('studioVisible').checked,coverImageId:draftCoverId,images:imageData,createdAt:item.data.createdAt||firebase.database.ServerValue.TIMESTAMP,updatedAt:firebase.database.ServerValue.TIMESTAMP};
      await db.ref(ROOT+'/'+item.id).set(record);
      await Promise.all(removedPaths.map(function(path){return storage.ref(path).delete().catch(function(error){if(error.code!=='storage/object-not-found')console.warn('Studio image cleanup failed',error);});}));
      removedPaths=[];status('已儲存，官網重新整理後會同步棚景內容。','success');
    }catch(error){await Promise.all(uploaded.map(function(path){return storage.ref(path).delete().catch(function(){});}));status('儲存失敗：'+(error.message||error)+'（本次新上傳圖片已清理）','error');}
    finally{button.disabled=false;button.textContent='儲存棚景並同步官網';}
  }
  function subscribe(){if(listening)return;listening=true;db.ref(ROOT).on('value',function(snapshot){studios=normalize(snapshot.val());renderList();if(editingId&&studios.some(function(item){return item.id===editingId;}))open(editingId);else if(studios.length)open(studios[0].id);},function(error){status('棚景讀取失敗：'+error.message,'error');});}
  byId('studioAdd').addEventListener('click',add);byId('studioCancel').addEventListener('click',function(){var item=current();if(item&&item.draft){studios=studios.filter(function(row){return row.id!==item.id;});editingId='';renderList();if(studios.length)open(studios[0].id);else{revokeDraft();draftImages=[];setFields(null);renderImages();}}else if(item)open(item.id);});byId('studioImagesInput').addEventListener('change',function(){addFiles(this.files);});byId('studioSave').addEventListener('click',save);
  auth.onAuthStateChanged(async function(user){canManage=false;canUpload=!!user&&String(user.email||'').toLowerCase()===MANAGER_EMAIL;if(!user)return;try{canManage=await checkManager(user);}catch(_error){canManage=false;}byId('studioAdd').disabled=!canManage;byId('studioSave').disabled=!canManage;byId('studioImagesInput').disabled=!canUpload;if(canManage)subscribe();});
})();
