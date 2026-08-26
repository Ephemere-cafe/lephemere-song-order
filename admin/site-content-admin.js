(function(){
  'use strict';

  var DEFAULT_HERO = 'https://ephemereffxiv.com/about-staff-20260817.webp';
  var ROOT = 'lephemere/siteContent';
  var MANAGER_EMAIL = 'tanjicafe@gmail.com';
  var MAX_FILE_BYTES = 12 * 1024 * 1024;
  var db = firebase.database();
  var storage = firebase.storage();
  var auth = firebase.auth();
  var currentUser = null;
  var canManage = false;
  var siteContentReady = false;
  var heroSettings = {};
  var polaroids = [];
  var staffRoster = {};
  var pendingHeroUrls = { desktop: '', mobile: '' };

  function byId(id){ return document.getElementById(id); }
  function clamp(value, min, max){ return Math.min(max, Math.max(min, Number(value) || 0)); }
  function now(){ return firebase.database.ServerValue.TIMESTAMP; }
  function status(id, message, state){
    var node = byId(id);
    if(!node) return;
    node.textContent = message;
    node.dataset.state = state || '';
  }
  function setBusy(button, busy, label){
    if(!button) return;
    if(busy){ button.dataset.originalLabel = button.textContent; button.textContent = label || '處理中…'; }
    else if(button.dataset.originalLabel){ button.textContent = button.dataset.originalLabel; delete button.dataset.originalLabel; }
    button.disabled = !!busy;
  }
  function safeUrl(value){
    try { var url = new URL(String(value || '')); return url.protocol === 'https:' ? url.href : ''; }
    catch(_error){ return ''; }
  }
  function validImage(file){
    if(!file) throw new Error('請先選擇圖片。');
    if(!/^image\/(jpeg|png|webp)$/i.test(file.type)) throw new Error('僅支援 JPG、PNG 或 WebP 圖片。');
    if(file.size > MAX_FILE_BYTES) throw new Error('圖片不可超過 12MB。');
  }
  function loadBitmap(file){
    return new Promise(function(resolve, reject){
      var img = new Image();
      var objectUrl = URL.createObjectURL(file);
      img.onload = function(){ URL.revokeObjectURL(objectUrl); resolve(img); };
      img.onerror = function(){ URL.revokeObjectURL(objectUrl); reject(new Error('無法讀取這張圖片。')); };
      img.src = objectUrl;
    });
  }
  async function imageBlob(file, maxEdge, quality){
    validImage(file);
    var img = await loadBitmap(file);
    var ratio = Math.min(1, maxEdge / Math.max(img.naturalWidth, img.naturalHeight));
    var canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(img.naturalWidth * ratio));
    canvas.height = Math.max(1, Math.round(img.naturalHeight * ratio));
    var context = canvas.getContext('2d', { alpha: false });
    context.imageSmoothingEnabled = true;
    context.imageSmoothingQuality = 'high';
    context.drawImage(img, 0, 0, canvas.width, canvas.height);
    return new Promise(function(resolve, reject){
      canvas.toBlob(function(blob){ blob ? resolve(blob) : reject(new Error('圖片壓縮失敗。')); }, 'image/webp', quality);
    });
  }
  async function uploadImage(file, path, maxEdge, quality){
    var blob = await imageBlob(file, maxEdge, quality);
    var ref = storage.ref(path);
    await ref.put(blob, { contentType: 'image/webp', cacheControl: 'public,max-age=3600' });
    return ref.getDownloadURL();
  }
  async function checkManager(user){
    if(!user) return false;
    if(String(user.email || '').toLowerCase() === MANAGER_EMAIL) return true;
    var snapshots = await Promise.all([
      db.ref('lephemere/todayStaff/_access/ownerUid').once('value'),
      db.ref('lephemere/todayStaff/_access/users/' + user.uid + '/role').once('value')
    ]);
    return snapshots[0].val() === user.uid || snapshots[1].val() === 'manager';
  }
  function requireManager(){
    if(canManage) return true;
    status('siteHeroStatus', '目前帳號沒有管理網站內容的權限。', 'error');
    status('sitePolaroidStatus', '目前帳號沒有管理網站內容的權限。', 'error');
    return false;
  }
  function requireSiteContentAccess(){
    if(!requireManager()) return false;
    if(siteContentReady) return true;
    var message = '網站內容權限尚未就緒，已停止上傳；請先發佈 Firebase siteContent 規則後重新整理。';
    status('siteHeroStatus', message, 'error');
    status('sitePolaroidStatus', message, 'error');
    return false;
  }
  function setSiteContentActionsDisabled(disabled){
    ['saveSiteHero','resetSiteHero','addSitePolaroid'].forEach(function(id){
      var button = byId(id);
      if(button) button.disabled = !!disabled;
    });
  }
  async function removeUploadedPaths(paths){
    await Promise.all((paths || []).map(async function(path){
      try { await storage.ref(path).delete(); }
      catch(_error){ /* Best effort: never mask the original database error. */ }
    }));
  }

  function bindSiteContentTab(){
    var tabs = byId('mainTabs');
    var panel = byId('siteContentTab');
    if(!tabs || !panel) return;
    tabs.addEventListener('click', function(event){
      var tab = event.target.closest('[data-main]');
      if(!tab) return;
      panel.style.display = tab.dataset.main === 'site-content' ? 'block' : 'none';
    });
  }
  function focal(device, axis){ return byId('hero' + device + 'Focal' + axis); }
  function zoom(device){ return byId('hero' + device + 'Zoom'); }
  function preview(device){ return byId('hero' + device + 'PreviewImage'); }
  function refreshPreview(device){
    var x = clamp(focal(device, 'X').value, 0, 100);
    var y = clamp(focal(device, 'Y').value, 0, 100);
    byId('hero' + device + 'FocalXValue').textContent = x + '%';
    byId('hero' + device + 'FocalYValue').textContent = y + '%';
    var scale = clamp(zoom(device).value, 100, 180);
    byId('hero' + device + 'ZoomValue').textContent = scale + '%';
    preview(device).style.objectPosition = x + '% ' + y + '%';
    preview(device).style.transformOrigin = x + '% ' + y + '%';
    preview(device).style.transform = 'scale(' + (scale / 100) + ')';
  }
  function setHeroControls(data){
    heroSettings = data || {};
    var desktopUrl = safeUrl(heroSettings.desktopUrl) || DEFAULT_HERO;
    var mobileUrl = safeUrl(heroSettings.mobileUrl) || desktopUrl;
    preview('Desktop').src = pendingHeroUrls.desktop || desktopUrl;
    preview('Mobile').src = pendingHeroUrls.mobile || mobileUrl;
    focal('Desktop', 'X').value = clamp(heroSettings.desktopFocalX == null ? 50 : heroSettings.desktopFocalX, 0, 100);
    focal('Desktop', 'Y').value = clamp(heroSettings.desktopFocalY == null ? 50 : heroSettings.desktopFocalY, 0, 100);
    focal('Mobile', 'X').value = clamp(heroSettings.mobileFocalX == null ? 50 : heroSettings.mobileFocalX, 0, 100);
    focal('Mobile', 'Y').value = clamp(heroSettings.mobileFocalY == null ? 50 : heroSettings.mobileFocalY, 0, 100);
    zoom('Desktop').value = clamp(heroSettings.desktopZoom == null ? 100 : heroSettings.desktopZoom, 100, 180);
    zoom('Mobile').value = clamp(heroSettings.mobileZoom == null ? 100 : heroSettings.mobileZoom, 100, 180);
    refreshPreview('Desktop');
    refreshPreview('Mobile');
  }
  function bindHeroPreview(device, inputId){
    ['X','Y'].forEach(function(axis){ focal(device, axis).addEventListener('input', function(){
      if(Number(this.value) !== 50 && Number(zoom(device).value) === 100) zoom(device).value = 110;
      refreshPreview(device);
    }); });
    zoom(device).addEventListener('input', function(){ refreshPreview(device); });
    byId(inputId).addEventListener('change', function(){
      var file = this.files && this.files[0];
      if(!file) return;
      try { validImage(file); }
      catch(error){ status('siteHeroStatus', error.message, 'error'); this.value = ''; return; }
      if(pendingHeroUrls[device.toLowerCase()]) URL.revokeObjectURL(pendingHeroUrls[device.toLowerCase()]);
      pendingHeroUrls[device.toLowerCase()] = URL.createObjectURL(file);
      preview(device).src = pendingHeroUrls[device.toLowerCase()];
      status('siteHeroStatus', '已載入預覽；按「儲存並同步首頁」才會發佈。', '');
    });
  }
  function bindHeroPresets(){
    document.querySelectorAll('[data-hero-device][data-hero-x]').forEach(function(button){
      button.addEventListener('click', function(){
        var device = button.dataset.heroDevice;
        focal(device, 'X').value = clamp(button.dataset.heroX, 0, 100);
        if(Number(button.dataset.heroX) !== 50 && Number(zoom(device).value) === 100) zoom(device).value = 110;
        refreshPreview(device);
      });
    });
  }
  async function saveHero(){
    if(!requireSiteContentAccess()) return;
    var button = byId('saveSiteHero');
    var uploadedPaths = [];
    setBusy(button, true, '上傳中…');
    status('siteHeroStatus', '正在壓縮並同步首頁照片…', 'busy');
    try {
      var data = {
        desktopUrl: safeUrl(heroSettings.desktopUrl),
        mobileUrl: safeUrl(heroSettings.mobileUrl),
        desktopFocalX: clamp(focal('Desktop','X').value, 0, 100),
        desktopFocalY: clamp(focal('Desktop','Y').value, 0, 100),
        mobileFocalX: clamp(focal('Mobile','X').value, 0, 100),
        mobileFocalY: clamp(focal('Mobile','Y').value, 0, 100),
        desktopZoom: clamp(zoom('Desktop').value, 100, 180),
        mobileZoom: clamp(zoom('Mobile').value, 100, 180),
        updatedAt: now()
      };
      var desktopFile = byId('siteHeroDesktopFile').files[0];
      var mobileFile = byId('siteHeroMobileFile').files[0];
      var version = Date.now() + '-' + currentUser.uid;
      if(desktopFile){
        var desktopPath = 'site-content/home/hero-desktop-' + version + '.webp';
        data.desktopUrl = await uploadImage(desktopFile, desktopPath, 2400, .9);
        uploadedPaths.push(desktopPath);
      }
      if(mobileFile){
        var mobilePath = 'site-content/home/hero-mobile-' + version + '.webp';
        data.mobileUrl = await uploadImage(mobileFile, mobilePath, 2000, .9);
        uploadedPaths.push(mobilePath);
      }
      await db.ref(ROOT + '/homeHero').set(data);
      byId('siteHeroDesktopFile').value = '';
      byId('siteHeroMobileFile').value = '';
      Object.keys(pendingHeroUrls).forEach(function(key){ if(pendingHeroUrls[key]) URL.revokeObjectURL(pendingHeroUrls[key]); pendingHeroUrls[key] = ''; });
      status('siteHeroStatus', '已儲存，官網重新整理後會顯示最新照片與焦點。', 'success');
    } catch(error){
      await removeUploadedPaths(uploadedPaths);
      status('siteHeroStatus', '儲存失敗：' + (error.message || error) + '（本次上傳檔案已清理）', 'error');
    }
    finally { setBusy(button, false); }
  }
  async function resetHero(){
    if(!requireSiteContentAccess()) return;
    if(!window.confirm('要移除自訂首頁設定，恢復官網原本的預設合照嗎？')) return;
    var button = byId('resetSiteHero');
    setBusy(button, true, '處理中…');
    try {
      Object.keys(pendingHeroUrls).forEach(function(key){ if(pendingHeroUrls[key]) URL.revokeObjectURL(pendingHeroUrls[key]); pendingHeroUrls[key] = ''; });
      byId('siteHeroDesktopFile').value = '';
      byId('siteHeroMobileFile').value = '';
      await db.ref(ROOT + '/homeHero').remove();
      status('siteHeroStatus', '已恢復官網預設合照。先前上傳的檔案仍保留，可再次覆蓋使用。', 'success');
    } catch(error){ status('siteHeroStatus', '恢復失敗：' + (error.message || error), 'error'); }
    finally { setBusy(button, false); }
  }

  function normalizedPolaroids(value){
    return Object.keys(value || {}).map(function(id){ return Object.assign({ id: id }, value[id] || {}); })
      .sort(function(a,b){ return Number(a.sortOrder || 0) - Number(b.sortOrder || 0) || Number(a.createdAt || 0) - Number(b.createdAt || 0); });
  }
  function field(labelText, value, key, wide){
    var label = document.createElement('label');
    if(wide) label.className = 'wide';
    label.appendChild(document.createTextNode(labelText));
    var input = key === 'caption' ? document.createElement('textarea') : document.createElement('input');
    input.value = value || '';
    input.dataset.field = key;
    input.maxLength = key === 'title' ? 60 : key === 'caption' ? 160 : 120;
    if(input.tagName === 'TEXTAREA') input.rows = 2;
    label.appendChild(input);
    return label;
  }
  function staffSelectField(item){
    var label=document.createElement('label');
    label.appendChild(document.createTextNode('所屬女僕'));
    var select=document.createElement('select');
    select.dataset.field='staffId';
    var other=document.createElement('option');
    other.value='';other.textContent='其他作品／尚未指定';select.appendChild(other);
    Object.keys(staffRoster).sort(function(a,b){return String((staffRoster[a]||{}).name||'').localeCompare(String((staffRoster[b]||{}).name||''),'zh-Hant');}).forEach(function(id){
      var option=document.createElement('option');
      option.value=id;option.textContent=(staffRoster[id]||{}).name||'未命名女僕';
      if(id===item.staffId) option.selected=true;
      select.appendChild(option);
    });
    if(item.staffId && !staffRoster[item.staffId]){
      var legacy=document.createElement('option');
      legacy.value=item.staffId;legacy.textContent=(item.staffName||'已移除的女僕')+'（名單已移除）';legacy.selected=true;select.appendChild(legacy);
    }
    label.appendChild(select);
    return label;
  }
  function renderAddStaffOptions(){
    var select=byId('sitePolaroidStaff');if(!select) return;
    var current=select.value;
    select.replaceChildren();
    var other=document.createElement('option');other.value='';other.textContent='其他作品／尚未指定';select.appendChild(other);
    Object.keys(staffRoster).sort(function(a,b){return String((staffRoster[a]||{}).name||'').localeCompare(String((staffRoster[b]||{}).name||''),'zh-Hant');}).forEach(function(id){
      var option=document.createElement('option');option.value=id;option.textContent=(staffRoster[id]||{}).name||'未命名女僕';select.appendChild(option);
    });
    if(Array.prototype.some.call(select.options,function(option){return option.value===current;})) select.value=current;
  }
  function actionButton(text, action, extraClass){
    var button = document.createElement('button');
    button.type = 'button';
    button.className = 'btn ' + (extraClass || 'ghost');
    button.dataset.action = action;
    button.textContent = text;
    return button;
  }
  function renderPolaroids(){
    var list = byId('sitePolaroidList');
    list.replaceChildren();
    if(!polaroids.length){
      var empty = document.createElement('span');
      empty.className = 'empty';
      empty.textContent = '目前沒有自訂範例；官網會顯示原本的兩張靜態範例。';
      list.appendChild(empty);
      return;
    }
    polaroids.forEach(function(item, index){
      var card = document.createElement('article');
      card.className = 'site-polaroid-card' + (item.visible === false ? ' site-polaroid-hidden' : '');
      card.dataset.id = item.id;
      var img = document.createElement('img');
      img.className = 'site-polaroid-thumb';
      img.src = safeUrl(item.imageUrl);
      img.alt = '';
      var fields = document.createElement('div');
      fields.className = 'site-polaroid-fields';
      fields.append(staffSelectField(item));
      fields.append(field('作品名稱', item.title, 'title'));
      fields.append(field('圖片替代文字', item.alt, 'alt'));
      fields.append(field('補充文字', item.caption, 'caption', true));
      var visibleLabel = document.createElement('label');
      visibleLabel.className = 'wide site-check-field';
      var visible = document.createElement('input');
      visible.type = 'checkbox'; visible.checked = item.visible !== false; visible.dataset.field = 'visible';
      visibleLabel.append(visible, document.createTextNode('顯示在官網'));
      fields.append(visibleLabel);
      var actions = document.createElement('div');
      actions.className = 'site-polaroid-actions';
      var up = actionButton('上移', 'up'); up.disabled = index === 0;
      var down = actionButton('下移', 'down'); down.disabled = index === polaroids.length - 1;
      actions.append(up, down, actionButton('儲存', 'save', 'primary'), actionButton('刪除', 'delete', 'danger'));
      card.append(img, fields, actions);
      list.appendChild(card);
    });
  }
  async function addPolaroid(){
    if(!requireSiteContentAccess()) return;
    var file = byId('sitePolaroidFile').files[0];
    var button = byId('addSitePolaroid');
    try { validImage(file); }
    catch(error){ status('sitePolaroidStatus', error.message, 'error'); return; }
    setBusy(button, true, '上傳中…');
    status('sitePolaroidStatus', '正在壓縮並上傳拍立得圖片…', 'busy');
    var recordRef = db.ref(ROOT + '/polaroids').push();
    var path = 'site-content/polaroids/' + recordRef.key + '.webp';
    try {
      var imageUrl = await uploadImage(file, path, 1800, .88);
      var maxOrder = polaroids.reduce(function(max, item){ return Math.max(max, Number(item.sortOrder || 0)); }, 0);
      var selectedStaffId=byId('sitePolaroidStaff').value;
      var selectedStaff=staffRoster[selectedStaffId]||{};
      await recordRef.set({
        imageUrl: imageUrl,
        storagePath: path,
        title: byId('sitePolaroidTitle').value.trim() || ('拍立得作品 ' + String(polaroids.length + 1).padStart(2,'0')),
        staffId:selectedStaffId || '',
        staffName:selectedStaffId ? (selectedStaff.name || '未命名女僕') : '其他作品',
        caption: byId('sitePolaroidCaption').value.trim(),
        alt: byId('sitePolaroidAlt').value.trim() || '曇時 Cafe l’Éphémère 拍立得成品範例',
        visible: byId('sitePolaroidVisible').checked,
        sortOrder: maxOrder + 100,
        createdAt: now(),
        updatedAt: now()
      });
      ['sitePolaroidFile','sitePolaroidTitle','sitePolaroidCaption','sitePolaroidAlt'].forEach(function(id){ byId(id).value = ''; });
      byId('sitePolaroidStaff').value='';
      byId('sitePolaroidVisible').checked = true;
      status('sitePolaroidStatus', '已新增並同步官網。', 'success');
    } catch(error){
      await removeUploadedPaths([path]);
      status('sitePolaroidStatus', '新增失敗：' + (error.message || error) + '（本次上傳檔案已清理）', 'error');
    }
    finally { setBusy(button, false); }
  }
  async function saveCard(card){
    var id = card.dataset.id;
    var existing=polaroids.find(function(item){return item.id===id;})||{};
    var value = function(name){ return card.querySelector('[data-field="' + name + '"]'); };
    var selectedStaffId=value('staffId').value;
    var selectedStaff=staffRoster[selectedStaffId]||{};
    await db.ref(ROOT + '/polaroids/' + id).update({
      staffId:selectedStaffId || '',
      staffName:selectedStaffId ? (selectedStaff.name || existing.staffName || '未命名女僕') : '其他作品',
      title: value('title').value.trim(),
      alt: value('alt').value.trim(),
      caption: value('caption').value.trim(),
      visible: value('visible').checked,
      updatedAt: now()
    });
    status('sitePolaroidStatus', '已儲存這張範例。', 'success');
  }
  async function moveCard(id, direction){
    var index = polaroids.findIndex(function(item){ return item.id === id; });
    var otherIndex = index + direction;
    if(index < 0 || otherIndex < 0 || otherIndex >= polaroids.length) return;
    var current = polaroids[index];
    var other = polaroids[otherIndex];
    var updates = {};
    updates[ROOT + '/polaroids/' + current.id + '/sortOrder'] = Number(other.sortOrder || otherIndex * 100);
    updates[ROOT + '/polaroids/' + other.id + '/sortOrder'] = Number(current.sortOrder || index * 100);
    updates[ROOT + '/polaroids/' + current.id + '/updatedAt'] = now();
    updates[ROOT + '/polaroids/' + other.id + '/updatedAt'] = now();
    await db.ref().update(updates);
  }
  async function deleteCard(item){
    if(!window.confirm('確定要刪除「' + (item.title || '這張拍立得') + '」嗎？')) return;
    var storageWarning = '';
    if(item.storagePath){
      try { await storage.ref(item.storagePath).delete(); }
      catch(error){ if(error.code !== 'storage/object-not-found') storageWarning = '（圖片檔未能一併刪除）'; }
    }
    await db.ref(ROOT + '/polaroids/' + item.id).remove();
    status('sitePolaroidStatus', '已刪除拍立得範例。' + storageWarning, storageWarning ? 'error' : 'success');
  }
  function bindPolaroidActions(){
    byId('sitePolaroidList').addEventListener('click', async function(event){
      var button = event.target.closest('[data-action]');
      var card = event.target.closest('.site-polaroid-card');
      if(!button || !card || !requireSiteContentAccess()) return;
      var item = polaroids.find(function(entry){ return entry.id === card.dataset.id; });
      if(!item) return;
      setBusy(button, true, '處理中…');
      try {
        if(button.dataset.action === 'save') await saveCard(card);
        if(button.dataset.action === 'up') await moveCard(item.id, -1);
        if(button.dataset.action === 'down') await moveCard(item.id, 1);
        if(button.dataset.action === 'delete') await deleteCard(item);
      } catch(error){ status('sitePolaroidStatus', '操作失敗：' + (error.message || error), 'error'); }
      finally { setBusy(button, false); }
    });
  }
  function subscribe(){
    db.ref('lephemere/staffRoster').on('value',function(snapshot){
      staffRoster=snapshot.val()||{};
      renderAddStaffOptions();
      renderPolaroids();
    },function(error){status('sitePolaroidStatus','店員名單讀取失敗：'+error.message,'error');});
    db.ref(ROOT + '/homeHero').on('value', function(snapshot){
      setHeroControls(snapshot.val() || {});
      status('siteHeroStatus', snapshot.exists() ? '已讀取目前官網設定。' : '目前使用官網預設合照。', '');
    }, function(error){ status('siteHeroStatus', '讀取失敗：' + error.message, 'error'); });
    db.ref(ROOT + '/polaroids').on('value', function(snapshot){
      polaroids = normalizedPolaroids(snapshot.val());
      renderPolaroids();
      status('sitePolaroidStatus', polaroids.length ? '已讀取 ' + polaroids.length + ' 張自訂範例。' : '目前使用官網原本的靜態範例。', '');
    }, function(error){ status('sitePolaroidStatus', '讀取失敗：' + error.message, 'error'); });
  }

  bindSiteContentTab();
  bindHeroPreview('Desktop', 'siteHeroDesktopFile');
  bindHeroPreview('Mobile', 'siteHeroMobileFile');
  bindHeroPresets();
  bindPolaroidActions();
  byId('saveSiteHero').addEventListener('click', saveHero);
  byId('resetSiteHero').addEventListener('click', resetHero);
  byId('addSitePolaroid').addEventListener('click', addPolaroid);
  setHeroControls({});
  auth.onAuthStateChanged(async function(user){
    currentUser = user;
    siteContentReady = false;
    setSiteContentActionsDisabled(true);
    try { canManage = await checkManager(user); }
    catch(_error){ canManage = false; }
    if(user && canManage){
      try {
        await db.ref(ROOT).once('value');
        siteContentReady = true;
        setSiteContentActionsDisabled(false);
        subscribe();
      } catch(error){
        var message = '網站內容權限尚未發佈，為避免殘留圖片已停止上傳：' + (error.message || error);
        status('siteHeroStatus', message, 'error');
        status('sitePolaroidStatus', message, 'error');
      }
    }
  });
})();
