(function(){

  var firebaseConfig = {
    apiKey: "AIzaSyAPIpmaLgXp3TVTV7y-yrH63xkMtAuYMSQ",
    authDomain: "lephemere-queue-c38d5.firebaseapp.com",
    databaseURL: "https://lephemere-queue-c38d5-default-rtdb.asia-southeast1.firebasedatabase.app",
    projectId: "lephemere-queue-c38d5",
    storageBucket: "lephemere-queue-c38d5.firebasestorage.app",
    messagingSenderId: "35595928973",
    appId: "1:35595928973:web:36a8a4695fd293061d29c4"
  };

  var isConfigured = firebaseConfig.apiKey.indexOf('貼上') === -1;
  if(!isConfigured){ document.getElementById('configWarn').style.display = 'block'; }

  var db, storage;
  var ordersRef, openDatesRef, reservationsRef, rulesRef, staffRosterRef, todayStaffRef, staffSchedulesRef, menuRef, nextOrderNumberRef, webhookRef, operationStatusRef, dailyReportsRef, adminUsersRef, adminOwnerUidRef, siteMusicRef;
  var visitsRef, visitQueueCounterRef, staffPresenceRef, assignmentHistoryRef;
  var recentOrdersQuery, todayVisitsQuery;

  var orders = {};
  var visits = {};
  var staffPresence = {};
  var assignmentHistory = {};
  var currentOrderFilter = 'active';
  var orderSearchTerm = '';
  var webhookUrl = '';
  var knownOrderIds = {};
  var ordersSnapshotReady = false;
  var soundEnabled = false;
  var soundPreset = 'chime';
  var soundVolume = 0.7;
  var customSoundData = '';
  var customSoundName = '';
  var orderAudioContext = null;
  var currentStaffId = '';
  var adminSessionId = 'admin-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,8);
  var isDatabaseConnected = false;
  var operationStatus = { isOpen:true };
  var currentAuthUser = null;
  var currentAccessRole = 'orders';
  var adminOwnerUid = '';
  var adminUsers = {};
  var accessListListening = false;
  var siteMusicSettings = { enabled:false, title:'曇時店歌', url:'', volume:0.3 };
  var siteMusicPreviewAudio = null;
  var PRIMARY_MANAGER_EMAILS = ['tanjicafe@gmail.com'];
  try{ soundEnabled = localStorage.getItem('lephemereOrderSound') === 'on'; }catch(e){}
  try{ soundPreset = localStorage.getItem('lephemereOrderSoundPreset') || 'chime'; }catch(e){}
  try{ soundVolume = Math.min(1, Math.max(.1, Number(localStorage.getItem('lephemereOrderSoundVolume') || .7))); }catch(e){}
  try{ customSoundData = localStorage.getItem('lephemereCustomOrderSound') || ''; }catch(e){}
  try{ customSoundName = localStorage.getItem('lephemereCustomOrderSoundName') || ''; }catch(e){}
  try{ currentStaffId = localStorage.getItem('lephemereCurrentStaffId') || ''; }catch(e){}

  var menuItems = {};
  var menuCategoryOrder = [];
  var editingMenuItemId = null;

  var DEFAULT_MENU = [
    { category:'Appetizer 前菜', name:'黑衣森林傘蕈溫沙拉', price:10000 },
    { category:'Appetizer 前菜', name:'庫爾蘋果新薯沙拉', price:10000 },
    { category:'Soup 湯品', name:'法式焗烤起司洋蔥湯', price:14000 },
    { category:'Main Course 主食', name:'巨匠特製紅醬蛋包飯', price:20000, addonLabel:'加購隱藏魔法（店員到桌服務）', addonPrice:5000 },
    { category:'Main Course 主食', name:'黑松露野菇燉飯', price:20000 },
    { category:'Drinks 飲品', name:'三倍絲滑鮮奶油咖啡', price:12000 },
    { category:'Drinks 飲品', name:'絲絨醇厚熱巧克力', price:12000 },
    { category:'Drinks 飲品', name:'伊修加爾德皇家奶茶', price:12000 },
    { category:'Dessert 甜品', name:'莊園黑巧奶油蛋糕', price:12000 },
    { category:'Dessert 甜品', name:'現煎黃金法式吐司', price:12000 },
    { category:'Dessert 甜品', name:'秋實手工柿子布丁', price:12000 },
    { category:'Set 無菜單料理', name:'主廚精選五道套餐（店長隨機出餐）', price:40000, note:'共5道菜，內容由店長現場決定' }
  ];

  var openDates = {};
  var reservations = {};
  var staffRoster = {};
  var todayStaff = {};
  var staffSchedules = {};
  var legacyStaffSchedules = {};
  var legacySchedulesMigrated = false;

  var STATUS_LABEL = { pending:'待接單', preparing:'服務中', served:'服務中', completed:'已完成', cancelled:'已取消' };
  var NEXT_STATUS = { pending:'preparing', preparing:'completed', served:'completed' };
  var NEXT_LABEL = { pending:'開始服務', preparing:'完成服務', served:'完成服務' };
  var PREV_STATUS = { preparing:'pending', served:'preparing', completed:'preparing', cancelled:'pending' };
  var PREV_LABEL = { preparing:'退回待接單', served:'退回服務中', completed:'退回服務中', cancelled:'恢復訂單' };

  function escapeHtml(s){var d=document.createElement('div');d.textContent=s;return d.innerHTML;}
  function escapeAttr(s){return escapeHtml(s).replace(/"/g,'&quot;').replace(/'/g,'&#39;');}
  function fmtGil(n){ return (n||0).toLocaleString('en-US') + ' Gil'; }
  function fmtTime(ts){
    var d = new Date(ts);
    return String(d.getHours()).padStart(2,'0')+':'+String(d.getMinutes()).padStart(2,'0');
  }
  function orderDateKey(ts){
    if(!ts) return 'unknown';
    var d = new Date(ts);
    return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
  }
  function orderDateLabel(key){
    if(key==='unknown') return '日期未記錄';
    var text = key.replace(/-/g,' / ');
    return key===todayKey() ? '今天・'+text : text;
  }
  function discordFieldValue(value){
    var text = String(value || '—');
    return text.length > 1024 ? text.slice(0,1023)+'…' : text;
  }
  function sendDiscordAssignmentUpdate(order, staffName){
    if(!webhookUrl) return Promise.resolve();
    var assigned = !!staffName;
    return fetch(webhookUrl, {
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify({
        username:'曇時 Cafe｜接待通知',
        allowed_mentions:{parse:[]},
        embeds:[{
          title:assigned ? '👥 接待店員已更新' : '↩️ 接待指派已取消',
          color:assigned ? 13279339 : 12614538,
          fields:[
            {name:'訂單編號',value:'#'+discordFieldValue(order.orderNumber),inline:true},
            {name:'主人',value:discordFieldValue(order.name||'未填寫'),inline:true},
            {name:'目前服務店員',value:discordFieldValue(staffName||'尚未指派'),inline:false}
          ],
          footer:{text:"曇時 Cafe l'Éphémère｜點餐後台"},
          timestamp:new Date().toISOString()
        }]
      })
    }).catch(function(err){ console.warn('Discord update failed', err); });
  }
  function sendDiscordNewOrder(order){
    function deliver(url){
      if(!url) return Promise.resolve();
      var items=(order.items||[]).map(function(item){return (item.name||'品項')+' × '+Number(item.qty||1);}).join('\n');
      return fetch(url,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({
        username:'曇時 Cafe｜新訂單',allowed_mentions:{parse:[]},embeds:[{
          title:'🍽️ 新的點餐訂單 #'+discordFieldValue(order.orderNumber),color:13279339,
          fields:[
            {name:'主人',value:discordFieldValue(order.name||'未填寫'),inline:true},
            {name:'候位',value:discordFieldValue(order.queueNumber||'—'),inline:true},
            {name:'負責女僕',value:discordFieldValue(order.assignedStaffName||'尚未指派'),inline:true},
            {name:'品項',value:discordFieldValue(items||'未列出品項'),inline:false},
            {name:'合計',value:discordFieldValue(fmtGil(Number(order.total||0))),inline:false}
          ],footer:{text:"曇時 Cafe l'Éphémère｜安全後台通知"},timestamp:new Date().toISOString()
        }]})
      }).catch(function(err){console.warn('Discord new order failed',err);});
    }
    if(webhookUrl) return deliver(webhookUrl);
    return webhookRef.once('value').then(function(snap){webhookUrl=snap.val()||'';return deliver(webhookUrl);});
  }
  function todayKey(){
    var d = new Date();
    return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
  }

  function setSystemPill(id, text, state){
    var el = document.getElementById(id);
    if(!el) return;
    el.textContent = text;
    el.className = 'system-pill '+state;
  }

  function renderSystemStatus(){
    setSystemPill('systemDatabase', isDatabaseConnected ? '訂單連線正常' : '訂單連線中斷', isDatabaseConnected ? 'ok' : 'bad');
    setSystemPill('systemOrdering', operationStatus.isOpen===false ? '線上點餐已打烊' : '線上點餐開放中', operationStatus.isOpen===false ? 'warn' : 'ok');
    setSystemPill('systemDiscord', webhookUrl ? 'Discord 已設定' : 'Discord 未設定', webhookUrl ? 'ok' : 'warn');
    setSystemPill('systemSound', soundEnabled ? '提示音開啟' : '提示音關閉', soundEnabled ? 'ok' : 'warn');
    var toggle = document.getElementById('operationToggle');
    if(toggle){
      toggle.textContent = operationStatus.isOpen===false ? '開始營業' : '結束營業並產生日報';
      toggle.className = operationStatus.isOpen===false ? 'btn primary small' : 'btn primary small';
    }
  }

  function tickClock(){
    var d=new Date();
    document.getElementById('connText').textContent=String(d.getHours()).padStart(2,'0')+':'+String(d.getMinutes()).padStart(2,'0');
  }
  tickClock();
  setInterval(tickClock,15000);
  setInterval(function(){ updateElapsedLabels(); renderStats(); renderReception(); },30000);
  setInterval(function(){
    if(currentStaffId&&currentAuthUser&&!document.hidden&&staffPresenceRef){
      staffPresenceRef.child(currentStaffId).update({lastSeenAt:Date.now(),sessionId:adminSessionId});
    }
  },60000);

  function updateSoundButton(){
    var btn = document.getElementById('soundToggle');
    if(!btn) return;
    btn.textContent = soundEnabled ? '提醒已開啟' : '開啟提醒';
    btn.classList.toggle('enabled', soundEnabled);
    var preset = document.getElementById('soundPreset');
    if(preset) preset.value = soundPreset;
    var volume = document.getElementById('soundVolume');
    if(volume) volume.value = String(Math.round(soundVolume*100));
    var volumeText = document.getElementById('soundVolumeValue');
    if(volumeText) volumeText.textContent = Math.round(soundVolume*100)+'%';
    var label = document.getElementById('soundCurrentLabel');
    var presetLabels = {chime:'清亮提示',bell:'咖啡鈴聲',soft:'柔和三音'};
    var currentName = customSoundData ? ('自訂・'+(customSoundName || '提示音')) : (presetLabels[soundPreset] || '清亮提示');
    if(label) label.textContent = soundEnabled ? ('目前使用 '+currentName) : ('提示音關閉・已選擇 '+currentName);
    var customStatus = document.getElementById('customSoundStatus');
    if(customStatus) customStatus.textContent = customSoundData ? ('自訂音效：'+(customSoundName || '已上傳音效')+'（只保存在這台裝置）') : '可上傳 1.5 MB 內的短音效，設定只保存在這台裝置。';
    renderSystemStatus();
  }

  function playBuiltInSound(){
    var AudioCtx = window.AudioContext || window.webkitAudioContext;
    if(!AudioCtx) return;
    if(!orderAudioContext) orderAudioContext = new AudioCtx();
    var play = function(){
      var now = orderAudioContext.currentTime;
      var patterns = {
        chime:[{f:660,t:0,d:.24,a:.20},{f:880,t:.14,d:.32,a:.18}],
        bell:[{f:1046,t:0,d:.42,a:.16},{f:1318,t:.12,d:.50,a:.13}],
        soft:[{f:523,t:0,d:.20,a:.13},{f:659,t:.16,d:.22,a:.12},{f:784,t:.32,d:.30,a:.11}]
      };
      (patterns[soundPreset] || patterns.chime).forEach(function(tone){
        var gain = orderAudioContext.createGain();
        var osc = orderAudioContext.createOscillator();
        var start = now+tone.t;
        osc.type = soundPreset==='bell' ? 'triangle' : 'sine';
        osc.frequency.setValueAtTime(tone.f, start);
        gain.gain.setValueAtTime(.0001, start);
        gain.gain.exponentialRampToValueAtTime(Math.max(.0001,tone.a*soundVolume), start+.018);
        gain.gain.exponentialRampToValueAtTime(.0001, start+tone.d);
        osc.connect(gain);
        gain.connect(orderAudioContext.destination);
        osc.start(start);
        osc.stop(start+tone.d+.03);
      });
    };
    if(orderAudioContext.state==='suspended'){
      orderAudioContext.resume().then(play).catch(function(){});
    }else{
      play();
    }
  }

  function playOrderSound(force){
    if(!soundEnabled && !force) return;
    if(customSoundData){
      try{
        var audio = new Audio(customSoundData);
        audio.volume = soundVolume;
        audio.play().catch(function(){ playBuiltInSound(); });
        return;
      }catch(e){}
    }
    playBuiltInSound();
  }

  function normalizeSiteMusicSettings(value){
    value = value && typeof value === 'object' ? value : {};
    return {
      enabled:value.enabled === true,
      title:String(value.title || '曇時店歌').trim() || '曇時店歌',
      url:String(value.url || '').trim(),
      volume:Math.min(1,Math.max(.05,Number(value.volume || .3)))
    };
  }

  function setSiteMusicStatus(text,state){
    var el = document.getElementById('siteMusicStatus');
    if(!el) return;
    el.textContent = text || '';
    el.className = 'site-music-status'+(state ? ' '+state : '');
  }

  function renderSiteMusicSettings(){
    var title = document.getElementById('siteMusicTitle');
    var url = document.getElementById('siteMusicUrl');
    var enabled = document.getElementById('siteMusicEnabled');
    var volume = document.getElementById('siteMusicVolume');
    var volumeValue = document.getElementById('siteMusicVolumeValue');
    if(title) title.value = siteMusicSettings.title;
    if(url) url.value = siteMusicSettings.url;
    if(enabled) enabled.checked = siteMusicSettings.enabled;
    if(volume) volume.value = String(Math.round(siteMusicSettings.volume*100));
    if(volumeValue) volumeValue.textContent = Math.round(siteMusicSettings.volume*100)+'%';
    setSiteMusicStatus(siteMusicSettings.url
      ? (siteMusicSettings.enabled ? '官網背景音樂目前已啟用' : '音樂資料已儲存，但官網播放器目前關閉')
      : '尚未設定音樂檔網址', siteMusicSettings.url ? 'saved' : '');
  }

  function stopSiteMusicPreview(){
    if(siteMusicPreviewAudio){
      siteMusicPreviewAudio.pause();
      siteMusicPreviewAudio.removeAttribute('src');
      siteMusicPreviewAudio.load();
      siteMusicPreviewAudio = null;
    }
  }

  function validMusicUrl(value){
    try{ return new URL(value).protocol === 'https:'; }catch(e){ return false; }
  }

  function formatRulesText(text){
    var lines = text.split('\n');
    var html = '';
    for(var i=0;i<lines.length;i++){
      var line = lines[i].trim();
      if(line === '') continue;
      html += '<div>' + escapeHtml(line) + '</div>';
    }
    return html;
  }

  function isManager(){
    return currentAccessRole === 'manager';
  }

  function isPrimaryManagerEmail(email){
    return PRIMARY_MANAGER_EMAILS.indexOf(String(email || '').trim().toLowerCase()) > -1;
  }

  function showOrdersTab(){
    document.querySelectorAll('.main-tab').forEach(function(t){ t.classList.remove('active'); });
    var ordersMainTab = document.querySelector('.main-tab[data-main="orders"]');
    if(ordersMainTab) ordersMainTab.classList.add('active');
    document.getElementById('receptionTab').style.display = 'none';
    document.getElementById('ordersTab').style.display = 'block';
    document.getElementById('specialServicesTab').style.display = 'none';
    document.getElementById('operationsTab').style.display = 'none';
    document.getElementById('menuTab').style.display = 'none';
    document.getElementById('staffTab').style.display = 'none';
    document.getElementById('reservationsTab').style.display = 'none';
    document.getElementById('siteSettingsTab').style.display = 'none';
    document.getElementById('accessTab').style.display = 'none';
  }

  function showReceptionTab(){
    document.querySelectorAll('.main-tab').forEach(function(t){ t.classList.remove('active'); });
    var tab = document.querySelector('.main-tab[data-main="reception"]');
    if(tab) tab.classList.add('active');
    document.getElementById('receptionTab').style.display = 'block';
    document.getElementById('ordersTab').style.display = 'none';
    document.getElementById('specialServicesTab').style.display = 'none';
    document.getElementById('operationsTab').style.display = 'none';
    document.getElementById('menuTab').style.display = 'none';
    document.getElementById('staffTab').style.display = 'none';
    document.getElementById('reservationsTab').style.display = 'none';
    document.getElementById('siteSettingsTab').style.display = 'none';
    document.getElementById('accessTab').style.display = 'none';
  }

  function accessUsersValueHandler(snap){
    adminUsers = snap.val() || {};
    renderAccessUserList();
  }

  function syncAccessListListener(){
    if(!adminUsersRef) return;
    if(isManager() && !accessListListening){
      accessListListening = true;
      adminUsersRef.on('value', accessUsersValueHandler);
    }else if(!isManager() && accessListListening){
      accessListListening = false;
      adminUsersRef.off('value', accessUsersValueHandler);
      adminUsers = {};
    }
  }

  function applyAccessUI(){
    var manager = isManager();
    document.querySelectorAll('.manager-only').forEach(function(el){ el.hidden = !manager; });
    var badge = document.getElementById('currentAccessBadge');
    if(badge){
      badge.textContent = manager ? '管理人員' : '訂單人員';
      badge.className = 'access-badge'+(manager ? ' manager' : '');
    }
    if(!manager) showReceptionTab();
    syncAccessListListener();
    if(attached) renderOrders();
  }

  function setAccessMessage(text, isError){
    var el = document.getElementById('accessMessage');
    if(!el) return;
    el.textContent = text || '';
    el.className = 'access-message'+(isError ? ' error' : '');
  }

  function setLoginLoading(loading){
    var btn = document.getElementById('adminLoginBtn');
    if(!btn) return;
    btn.disabled = !!loading;
    btn.textContent = loading ? '正在登入…' : '登入';
  }

  function loginErrorMessage(err){
    var code = err && err.code || '';
    if(code==='auth/invalid-credential' || code==='auth/user-not-found' || code==='auth/wrong-password') return '帳號尚未在 Firebase 建立，或密碼不正確';
    if(code==='auth/too-many-requests') return '登入嘗試次數過多，請稍候幾分鐘再試';
    if(code==='auth/operation-not-allowed') return 'Firebase 尚未開啟 Email／密碼登入方式';
    if(code==='auth/network-request-failed') return '目前無法連線至登入服務，請確認網路後重試';
    return '登入失敗，請稍後再試';
  }

  function accessDateText(ts){
    if(!ts) return '尚無登入紀錄';
    var d = new Date(ts);
    if(isNaN(d.getTime())) return '登入時間未記錄';
    return d.getFullYear()+'/'+String(d.getMonth()+1).padStart(2,'0')+'/'+String(d.getDate()).padStart(2,'0')+' '+String(d.getHours()).padStart(2,'0')+':'+String(d.getMinutes()).padStart(2,'0');
  }

  function maskAccessEmail(email){
    var parts = String(email || '').split('@');
    if(parts.length!==2) return '後台帳號';
    var local = parts[0];
    var visible = local ? local.charAt(0) : '';
    return visible+'***@'+parts[1];
  }

  function renderAccessUserList(){
    var el = document.getElementById('accessUserList');
    if(!el || !isManager()) return;
    var ids = Object.keys(adminUsers).sort(function(a,b){
      if(a===adminOwnerUid) return -1;
      if(b===adminOwnerUid) return 1;
      return String(adminUsers[a].emailLabel||'').localeCompare(String(adminUsers[b].emailLabel||''));
    });
    if(!ids.length){
      el.innerHTML = '<span class="empty">尚無後台帳號紀錄</span>';
      return;
    }
    var html = '';
    ids.forEach(function(uid){
      var user = adminUsers[uid] || {};
      var owner = uid === adminOwnerUid;
      var role = owner ? 'manager' : (user.role === 'manager' ? 'manager' : 'orders');
      html += '<div class="access-user">'
        + '<div><div class="access-user-email">'+escapeHtml(user.emailLabel || '後台帳號')+'</div>'
        + '<div class="access-user-meta">帳號識別 '+escapeHtml(uid.slice(-6))+'・最近登入：'+escapeHtml(accessDateText(user.lastLoginAt))+'</div></div>';
      if(owner){
        html += '<div class="access-owner-note">主要管理帳號・完整權限</div>';
      }else{
        html += '<select data-access-role="'+escapeAttr(uid)+'" aria-label="設定 '+escapeAttr(user.emailLabel || '帳號')+' 的權限">'
          + '<option value="orders" '+(role==='orders'?'selected':'')+'>訂單人員</option>'
          + '<option value="manager" '+(role==='manager'?'selected':'')+'>管理人員</option>'
          + '</select>';
      }
      html += '</div>';
    });
    el.innerHTML = html;
  }

  function initializeAccess(user){
    currentAuthUser = user;
    var primaryManager = isPrimaryManagerEmail(user.email);
    var ownerPromise = primaryManager
      ? adminOwnerUidRef.set(user.uid).then(function(){ adminOwnerUid = user.uid; }).catch(function(err){ adminOwnerUid = user.uid; console.warn('Owner record sync failed', err); })
      : adminOwnerUidRef.once('value').then(function(snap){ adminOwnerUid = snap.val() || ''; }).catch(function(err){ adminOwnerUid = ''; console.warn('Owner record read failed', err); });
    return ownerPromise.then(function(){
      return adminUsersRef.child(user.uid).once('value').catch(function(err){ console.warn('Access record read failed', err); return null; });
    }).then(function(snap){
      var existing = snap && snap.val ? (snap.val() || {}) : {};
      currentAccessRole = primaryManager ? 'manager' : (existing.role==='manager' ? 'manager' : 'orders');
      var update = { emailLabel:maskAccessEmail(user.email), role:currentAccessRole, lastLoginAt:Date.now() };
      if(!existing.createdAt) update.createdAt = Date.now();
      applyAccessUI();
      return adminUsersRef.child(user.uid).update(update).catch(function(err){ console.warn('Access record sync failed', err); });
    }).then(function(){
      adminUsersRef.child(user.uid).on('value', function(snap){
        if(!currentAuthUser || currentAuthUser.uid!==user.uid) return;
        var record = snap.val() || {};
        currentAccessRole = isPrimaryManagerEmail(user.email) ? 'manager' : (record.role==='manager' ? 'manager' : 'orders');
        applyAccessUI();
      });
      applyAccessUI();
    });
  }

  if(isConfigured){
    firebase.initializeApp(firebaseConfig);
    db = firebase.database();
    storage = firebase.storage();
    ordersRef = db.ref('lephemere/orders');
    nextOrderNumberRef = db.ref('lephemere/nextOrderNumber');
    openDatesRef = db.ref('lephemere/openDates');
    reservationsRef = db.ref('lephemere/reservations');
    rulesRef = db.ref('lephemere/rules');
    staffRosterRef = db.ref('lephemere/staffRoster');
    todayStaffRef = db.ref('lephemere/todayStaff');
    staffSchedulesRef = db.ref('lephemere/staffSchedules');
    menuRef = db.ref('lephemere/menu');
    webhookRef = db.ref('lephemere/webhookUrl');
    operationStatusRef = db.ref('lephemere/operationStatus');
    dailyReportsRef = db.ref('lephemere/dailyReports');
    adminUsersRef = todayStaffRef.child('_access/users');
    adminOwnerUidRef = todayStaffRef.child('_access/ownerUid');
    siteMusicRef = todayStaffRef.child('_site/backgroundMusic');
    visitsRef = db.ref('lephemere/visits');
    visitQueueCounterRef = db.ref('lephemere/visitQueueCounter');
    staffPresenceRef = db.ref('lephemere/staffPresence');
    assignmentHistoryRef = db.ref('lephemere/assignmentHistory');
    recentOrdersQuery = ordersRef.orderByChild('createdAt').startAt(Date.now()-30*86400000);
    todayVisitsQuery = visitsRef.orderByChild('businessDate').equalTo(todayKey());

    db.ref('.info/connected').on('value', function(snap){
      isDatabaseConnected = snap.val()===true;
      document.getElementById('connDot').className = isDatabaseConnected ? 'dot online' : 'dot offline';
      renderSystemStatus();
    });

    firebase.auth().onAuthStateChanged(function(user){
      if(user){
        document.getElementById('loginBox').style.display = 'none';
        document.getElementById('adminArea').style.display = 'none';
        initializeAccess(user).then(function(){
          setLoginLoading(false);
          document.getElementById('adminArea').style.display = 'block';
          attachData();
        }).catch(function(err){
          console.error('Access initialization failed', err);
          document.getElementById('loginBox').style.display = 'block';
          document.getElementById('adminArea').style.display = 'none';
          var errorEl = document.getElementById('loginError');
          errorEl.textContent = '無法確認帳號權限，請檢查資料庫連線後重試';
          errorEl.style.display = 'block';
          setLoginLoading(false);
        });
      }else{
        if(currentAuthUser && adminUsersRef) adminUsersRef.child(currentAuthUser.uid).off();
        currentAuthUser = null;
        currentAccessRole = 'orders';
        syncAccessListListener();
        document.getElementById('loginBox').style.display = 'block';
        document.getElementById('adminArea').style.display = 'none';
        setLoginLoading(false);
      }
    });
  }

  var attached = false;
  function attachData(){
    if(attached) return;
    attached = true;

    recentOrdersQuery.on('value', function(snap){
      var nextOrders = snap.val() || {};
      if(ordersSnapshotReady){
        var newOrderIds = Object.keys(nextOrders).filter(function(id){
          return !knownOrderIds[id] && nextOrders[id].status==='pending';
        });
        if(newOrderIds.length){
          playOrderSound();
          newOrderIds.forEach(function(id){sendDiscordNewOrder(nextOrders[id]);});
        }
      }
      knownOrderIds = {};
      Object.keys(nextOrders).forEach(function(id){ knownOrderIds[id] = true; });
      ordersSnapshotReady = true;
      orders = nextOrders;
      renderStats();
      renderOrders();
      renderReception();
    });

    todayVisitsQuery.on('value', function(snap){
      visits = snap.val() || {};
      renderReception();
    });

    staffPresenceRef.on('value', function(snap){
      staffPresence = snap.val() || {};
      renderReception();
    });

    assignmentHistoryRef.limitToLast(30).on('value',function(snap){
      assignmentHistory=snap.val()||{};
      renderAssignmentHistory();
    });

    webhookRef.on('value', function(snap){
      webhookUrl = snap.val() || '';
      renderSystemStatus();
    });

    operationStatusRef.on('value', function(snap){
      operationStatus = snap.val() || { isOpen:true };
      renderSystemStatus();
    });

    rulesRef.on('value', function(snap){
      var text = snap.val() || '';
      document.getElementById('rulesEditor').value = text;
    });

    staffRosterRef.on('value', function(snap){
      staffRoster = snap.val() || {};
      if(currentStaffId && !staffRoster[currentStaffId]){
        currentStaffId = '';
        try{ localStorage.removeItem('lephemereCurrentStaffId'); }catch(e){}
      }
      renderStaffManageList();
      renderStaffCheckList();
      renderCurrentStaffSelect();
      renderReceptionStaffSelect();
      renderReception();
      renderOrders();
    });

    todayStaffRef.on('value', function(snap){
      todayStaff = snap.val() || {};
      rebuildStaffSchedules();
      var dateInput = document.getElementById('onDutyDate');
      if(dateInput && !dateInput.value){
        dateInput.value = todayStaff.date || todayKey();
      }
      renderStaffCheckList();
      renderCurrentStaffSelect();
      renderReceptionStaffSelect();
      renderReception();
      migrateLegacySchedules();
      renderOrders();
    });

    staffSchedulesRef.on('value', function(snap){
      legacyStaffSchedules = snap.val() || {};
      rebuildStaffSchedules();
      renderStaffCheckList();
      migrateLegacySchedules();
    });

    menuRef.on('value', function(snap){
      menuItems = snap.val() || {};
      menuCategoryOrder = [];
      Object.keys(menuItems).sort(function(a,b){
        return Number(menuItems[a].sortOrder || 0) - Number(menuItems[b].sortOrder || 0);
      }).forEach(function(id){
        var cat = menuItems[id].category || '其他';
        if(menuCategoryOrder.indexOf(cat) === -1) menuCategoryOrder.push(cat);
      });
      renderMenuManageList();
      renderOrders();
      renderReception();
    });

    openDatesRef.on('value', function(snap){
      openDates = snap.val() || {};
      renderOpenDateManageList();
    });

    reservationsRef.on('value', function(snap){
      reservations = snap.val() || {};
      renderOpenDateManageList();
      renderAdminReservations();
    });

    siteMusicRef.on('value', function(snap){
      siteMusicSettings = normalizeSiteMusicSettings(snap.val());
      renderSiteMusicSettings();
    });
  }

  document.getElementById('adminLoginBtn').addEventListener('click', function(){
    if(!isConfigured) return;
    var email = document.getElementById('adminEmail').value.trim();
    var pw = document.getElementById('adminPassword').value;
    var loginErrorEl = document.getElementById('loginError');
    loginErrorEl.style.display = 'none';
    if(!email || !pw){
      loginErrorEl.textContent = '請輸入帳號與密碼';
      loginErrorEl.style.display = 'block';
      return;
    }
    setLoginLoading(true);
    firebase.auth().signInWithEmailAndPassword(email, pw).then(function(){
      document.getElementById('loginError').style.display = 'none';
      document.getElementById('adminPassword').value = '';
    }).catch(function(err){
      setLoginLoading(false);
      document.getElementById('loginError').textContent = loginErrorMessage(err);
      document.getElementById('loginError').style.display = 'block';
    });
  });
  document.getElementById('adminPassword').addEventListener('keydown', function(e){
    if(e.key==='Enter') document.getElementById('adminLoginBtn').click();
  });
  document.getElementById('adminLogoutBtn').addEventListener('click', function(){ firebase.auth().signOut(); });

  document.getElementById('adminArea').addEventListener('click', function(e){
    var restricted = e.target.closest('[data-manager-only]');
    if(restricted && !isManager()){
      e.preventDefault();
      e.stopImmediatePropagation();
      showReceptionTab();
    }
  }, true);

  document.getElementById('accessUserList').addEventListener('change', function(e){
    var select = e.target.closest('[data-access-role]');
    if(!select || !isManager()) return;
    var uid = select.getAttribute('data-access-role');
    if(!uid || uid===adminOwnerUid) return;
    var nextRole = select.value==='manager' ? 'manager' : 'orders';
    select.disabled = true;
    setAccessMessage('正在更新權限…', false);
    adminUsersRef.child(uid).update({ role:nextRole, roleUpdatedAt:Date.now(), roleUpdatedBy:currentAuthUser ? currentAuthUser.uid : '' }).then(function(){
      setAccessMessage('權限已更新；對方不需重新登入，畫面會自動切換。', false);
    }).catch(function(err){
      console.error('Access role update failed', err);
      setAccessMessage('權限更新失敗，請稍後再試。', true);
      renderAccessUserList();
    }).then(function(){ select.disabled = false; });
  });

  // ---------- main tabs ----------
  document.getElementById('mainTabs').addEventListener('click', function(e){
    var tab = e.target.closest('.main-tab');
    if(!tab) return;
    var target = tab.getAttribute('data-main');
    if(target!=='reception' && target!=='orders' && target!=='special' && !isManager()){
      showReceptionTab();
      return;
    }
    document.querySelectorAll('.main-tab').forEach(function(t){ t.classList.remove('active'); });
    tab.classList.add('active');
    document.getElementById('receptionTab').style.display = target==='reception' ? 'block' : 'none';
    document.getElementById('ordersTab').style.display = target==='orders' ? 'block' : 'none';
    document.getElementById('specialServicesTab').style.display = target==='special' ? 'block' : 'none';
    document.getElementById('operationsTab').style.display = target==='operations' ? 'block' : 'none';
    document.getElementById('menuTab').style.display = target==='menu' ? 'block' : 'none';
    document.getElementById('staffTab').style.display = target==='staff' ? 'block' : 'none';
    document.getElementById('reservationsTab').style.display = target==='reservations' ? 'block' : 'none';
    document.getElementById('siteSettingsTab').style.display = target==='site' ? 'block' : 'none';
    document.getElementById('accessTab').style.display = target==='access' ? 'block' : 'none';
  });

  document.getElementById('siteMusicVolume').addEventListener('input', function(e){
    document.getElementById('siteMusicVolumeValue').textContent = String(e.target.value)+'%';
    if(siteMusicPreviewAudio) siteMusicPreviewAudio.volume = Math.min(1,Math.max(.05,Number(e.target.value||30)/100));
  });

  document.getElementById('previewSiteMusic').addEventListener('click', function(){
    var url = document.getElementById('siteMusicUrl').value.trim();
    if(!validMusicUrl(url)){
      setSiteMusicStatus('請先填入可公開播放的 HTTPS 音樂網址。','error');
      return;
    }
    stopSiteMusicPreview();
    siteMusicPreviewAudio = new Audio(url);
    siteMusicPreviewAudio.loop = true;
    siteMusicPreviewAudio.volume = Math.min(1,Math.max(.05,Number(document.getElementById('siteMusicVolume').value||30)/100));
    siteMusicPreviewAudio.play().then(function(){
      setSiteMusicStatus('正在試播；確認無誤後請記得儲存設定。','saved');
    }).catch(function(){
      stopSiteMusicPreview();
      setSiteMusicStatus('無法試播，請確認網址能直接開啟音樂檔。','error');
    });
  });

  document.getElementById('stopSiteMusicPreview').addEventListener('click', function(){
    stopSiteMusicPreview();
    setSiteMusicStatus('已停止試播。','');
  });

  document.getElementById('saveSiteMusic').addEventListener('click', function(){
    if(!isManager() || !siteMusicRef) return;
    var btn = this;
    var next = normalizeSiteMusicSettings({
      enabled:document.getElementById('siteMusicEnabled').checked,
      title:document.getElementById('siteMusicTitle').value,
      url:document.getElementById('siteMusicUrl').value,
      volume:Number(document.getElementById('siteMusicVolume').value||30)/100
    });
    if(next.url && !validMusicUrl(next.url)){
      setSiteMusicStatus('音樂網址必須以 https:// 開頭。','error');
      return;
    }
    if(next.enabled && !next.url){
      setSiteMusicStatus('啟用前請先填入音樂檔網址。','error');
      return;
    }
    stopSiteMusicPreview();
    btn.disabled = true;
    btn.textContent = '同步中…';
    setSiteMusicStatus('正在同步至官網…','');
    siteMusicRef.set({
      enabled:next.enabled,
      title:next.title,
      url:next.url,
      volume:next.volume,
      updatedAt:Date.now()
    }).then(function(){
      setSiteMusicStatus('已儲存，官網播放器會立即更新。','saved');
    }).catch(function(err){
      console.error('Site music sync failed',err);
      setSiteMusicStatus('同步失敗，請確認登入權限後再試。','error');
    }).then(function(){
      btn.disabled = false;
      btn.textContent = '儲存並同步官網';
    });
  });

  // ================= 訂單管理 =================
  document.getElementById('orderSubTabs').addEventListener('click', function(e){
    var tab = e.target.closest('.tab');
    if(!tab) return;
    currentOrderFilter = tab.getAttribute('data-filter');
    document.querySelectorAll('#orderSubTabs .tab').forEach(function(t){ t.classList.remove('active'); });
    tab.classList.add('active');
    renderOrders();
  });

  document.getElementById('orderSearch').addEventListener('input', function(e){
    orderSearchTerm = e.target.value.trim().toLowerCase();
    renderOrders();
  });

  document.getElementById('soundToggle').addEventListener('click', function(){
    soundEnabled = !soundEnabled;
    try{ localStorage.setItem('lephemereOrderSound', soundEnabled ? 'on' : 'off'); }catch(e){}
    updateSoundButton();
    if(soundEnabled) playOrderSound();
  });
  document.getElementById('soundTest').addEventListener('click', function(){ playOrderSound(true); });
  document.getElementById('soundPreset').addEventListener('change', function(e){
    soundPreset = e.target.value || 'chime';
    try{ localStorage.setItem('lephemereOrderSoundPreset', soundPreset); }catch(err){}
    updateSoundButton();
    playOrderSound(true);
  });
  document.getElementById('soundVolume').addEventListener('input', function(e){
    soundVolume = Math.min(1, Math.max(.1, Number(e.target.value||70)/100));
    try{ localStorage.setItem('lephemereOrderSoundVolume', String(soundVolume)); }catch(err){}
    document.getElementById('soundVolumeValue').textContent = Math.round(soundVolume*100)+'%';
  });
  document.getElementById('customSoundFile').addEventListener('change', function(e){
    var file = e.target.files && e.target.files[0];
    if(!file) return;
    if(file.size > 1572864){
      alert('自訂音效請控制在 1.5 MB 以內，建議使用 1～3 秒的 MP3 或 WAV。');
      e.target.value = '';
      return;
    }
    var reader = new FileReader();
    reader.onload = function(){
      try{
        customSoundData = String(reader.result || '');
        customSoundName = file.name;
        localStorage.setItem('lephemereCustomOrderSound', customSoundData);
        localStorage.setItem('lephemereCustomOrderSoundName', customSoundName);
        updateSoundButton();
        playOrderSound(true);
      }catch(err){
        customSoundData = '';
        customSoundName = '';
        alert('這個檔案無法保存在瀏覽器，請改用較短或較小的音效。');
      }
      e.target.value = '';
    };
    reader.readAsDataURL(file);
  });
  document.getElementById('clearCustomSound').addEventListener('click', function(){
    customSoundData = '';
    customSoundName = '';
    try{
      localStorage.removeItem('lephemereCustomOrderSound');
      localStorage.removeItem('lephemereCustomOrderSoundName');
    }catch(err){}
    updateSoundButton();
    playOrderSound(true);
  });
  updateSoundButton();

  function renderCurrentStaffSelect(){
    var select = document.getElementById('globalStaffSelect');
    if(!select) return;
    var onDutyIds = todayStaff.staffIds || [];
    var ids = Object.keys(staffRoster);
    ids.sort(function(a,b){
      var aDuty = onDutyIds.indexOf(a) > -1 ? 0 : 1;
      var bDuty = onDutyIds.indexOf(b) > -1 ? 0 : 1;
      if(aDuty!==bDuty) return aDuty-bDuty;
      return String(staffRoster[a].name||'').localeCompare(String(staffRoster[b].name||''), 'zh-Hant');
    });
    var html = '<option value="">請先選擇店員</option>';
    ids.forEach(function(id){
      var duty = onDutyIds.indexOf(id) > -1 ? '（今日值班）' : '';
      html += '<option value="'+id+'" '+(id===currentStaffId?'selected':'')+'>'+escapeHtml(staffRoster[id].name||'未命名店員')+duty+'</option>';
    });
    select.innerHTML = html;
    var name=currentStaffId&&staffRoster[currentStaffId]?staffRoster[currentStaffId].name||'未命名女僕':'尚未選擇';
    document.getElementById('receptionStaffDisplay').textContent=name;
    document.getElementById('orderStaffDisplay').textContent=name;
  }

  function setCurrentStaff(id){
    currentStaffId = id || '';
    try{
      if(currentStaffId) localStorage.setItem('lephemereCurrentStaffId', currentStaffId);
      else localStorage.removeItem('lephemereCurrentStaffId');
    }catch(err){}
    var globalSelect=document.getElementById('globalStaffSelect');
    if(globalSelect) globalSelect.value=currentStaffId;
    var name=currentStaffId&&staffRoster[currentStaffId]?staffRoster[currentStaffId].name||'未命名女僕':'尚未選擇';
    document.getElementById('receptionStaffDisplay').textContent=name;
    document.getElementById('orderStaffDisplay').textContent=name;
    renderOrders();
    renderReception();
  }

  function renderReceptionStaffSelect(){
    renderCurrentStaffSelect();
  }

  function visitRows(statuses){
    return Object.keys(visits).map(function(id){ return Object.assign({id:id},visits[id]||{}); }).filter(function(v){
      return v.businessDate===todayKey() && statuses.indexOf(v.status)>-1;
    }).sort(function(a,b){ return Number(a.createdAt||0)-Number(b.createdAt||0); });
  }

  function waitMinutes(ts){ return Math.max(0,Math.floor((Date.now()-Number(ts||Date.now()))/60000)); }

  function transferOptions(currentId){
    var duty=todayStaff.staffIds||[];
    var ids=(duty.length?duty:Object.keys(staffRoster)).filter(function(id){ return staffRoster[id] && id!==currentId; });
    return '<option value="">轉交給…</option>'+ids.map(function(id){ return '<option value="'+escapeAttr(id)+'">'+escapeHtml(staffRoster[id].name||'未命名女僕')+'</option>'; }).join('');
  }

  function ordersForVisit(visitId){
    return Object.keys(orders).map(function(id){ return Object.assign({id:id},orders[id]||{}); }).filter(function(o){ return o.visitId===visitId; }).sort(function(a,b){ return Number(b.createdAt||0)-Number(a.createdAt||0); });
  }

  function visitUrgency(v,linkedOrders){
    var level='';
    if(v.status==='waiting'){
      var waiting=waitMinutes(v.createdAt);
      if(waiting>=20) level='urgent'; else if(waiting>=10) level='warning';
    }else if(v.status==='assigned'){
      var assigned=waitMinutes(v.assignedAt||v.updatedAt);
      if(assigned>=10) level='urgent'; else if(assigned>=5) level='warning';
    }
    (linkedOrders||[]).forEach(function(o){
      if(o.status!=='pending') return;
      var minutes=waitMinutes(o.createdAt);
      if(minutes>=20) level='urgent'; else if(minutes>=10 && level!=='urgent') level='warning';
    });
    return level;
  }

  function guestOrdersHtml(v){
    var linked=ordersForVisit(v.id);
    if(!linked.length) return '<div class="guest-order-empty">目前尚未送出訂單</div>';
    return linked.map(function(o){
      var items=(o.items||[]).map(function(item){ return escapeHtml(item.name||'品項')+' × '+Number(item.qty||1); }).join('、');
      var overdue=o.status==='pending' && waitMinutes(o.createdAt)>=10;
      var specialText=collectSpecialTags(o.items||[]).map(function(tag){
        var state=o.specialServices&&o.specialServices[tag.key]&&o.specialServices[tag.key].status||'pending';
        return tag.label+'：'+(state==='completed'?'完成':(state==='preparing'?'進行中':'待處理'));
      }).join('・');
      return '<div class="guest-order"><div class="guest-order-top"><span>#'+escapeHtml(o.orderNumber||'—')+'・'+escapeHtml(STATUS_LABEL[o.status]||o.status||'處理中')+'</span><span class="'+(overdue?'guest-order-alert':'')+'">'+(overdue?'待處理 '+waitMinutes(o.createdAt)+' 分':'')+(o.total?' '+fmtGil(o.total):'')+'</span></div><div class="guest-order-items">'+(items||'未列出品項')+(specialText?'<br>'+escapeHtml(specialText):'')+'</div></div>';
    }).join('');
  }

  function receptionAlertsData(waiting,active){
    var alerts=[];
    waiting.forEach(function(v){
      var minutes=waitMinutes(v.createdAt);
      if(minutes>=10) alerts.push({title:(v.queueNumber||'候位')+' '+(v.characterName||'未填角色名'),detail:'已候位 '+minutes+' 分鐘，請確認是否仍在店內'});
    });
    active.forEach(function(v){
      if(v.status==='assigned'){
        var minutes=waitMinutes(v.assignedAt||v.updatedAt);
        if(minutes>=5) alerts.push({title:(v.queueNumber||'候位')+' '+(v.characterName||'未填角色名'),detail:'已認領 '+minutes+' 分鐘，尚未按開始接待'});
      }
    });
    Object.keys(orders).forEach(function(id){
      var o=orders[id]||{};
      if(o.status==='pending' && isToday(o.createdAt) && waitMinutes(o.createdAt)>=10) alerts.push({title:'訂單 #'+(o.orderNumber||'—')+' '+(o.name||''),detail:'已等待處理 '+waitMinutes(o.createdAt)+' 分鐘'});
    });
    return alerts;
  }

  function visitCard(v,index,isMine){
    var linkedOrders=ordersForVisit(v.id);
    var urgency=visitUrgency(v,linkedOrders);
    var tags='';
    if(v.visitKind==='reservation') tags+='<span class="visit-tag reservation">預約'+(v.reservationRef?'｜'+escapeHtml(v.reservationRef):'')+'</span>';
    if(v.preferredStaffName) tags+='<span class="visit-tag">希望 '+escapeHtml(v.preferredStaffName)+'</span>';
    tags+='<span class="visit-tag">'+Number(v.partySize||1)+' 人同行</span>';
    var actions='';
    if(isMine){
      if(v.status==='assigned') actions+='<button class="btn primary small" data-start-visit="'+v.id+'">開始接待</button>';
      actions+='<button class="btn ghost small" data-copy-call="'+v.id+'">複製接待文字</button>';
      actions+='<button class="btn ghost small" data-complete-visit="'+v.id+'">結束接待</button>';
      actions+='<select data-transfer-visit="'+v.id+'">'+transferOptions(currentStaffId)+'</select>';
    }else if(v.status==='waiting'){
      actions+='<button class="btn primary small" data-copy-call="'+v.id+'">複製叫號</button>';
      actions+='<button class="btn ghost small" data-no-show-visit="'+v.id+'">叫號未到</button>';
    }else{
      actions+='<button class="btn ghost small" data-copy-call="'+v.id+'">複製接待文字</button>';
    }
    var noteAction=isMine?'<div class="guest-note-actions"><button class="btn ghost small" data-edit-visit-note="'+v.id+'">編輯備註</button></div>':'';
    var overview=v.status!=='waiting'?'<div class="guest-overview"><div class="guest-overview-head"><span>訂單與服務</span><span>'+linkedOrders.length+' 筆訂單</span></div><div class="guest-order-list">'+guestOrdersHtml(v)+'</div><details class="guest-note"><summary>店內交接備註｜'+escapeHtml(v.internalNote||'尚未填寫')+'</summary>'+noteAction+'</details></div>':'';
    return '<article class="visit-card '+(index===0&&v.status==='waiting'?'next ':'')+(isMine?'mine ':'')+urgency+'"><div class="visit-card-top"><div><div class="visit-number">'+escapeHtml(v.queueNumber||'—')+'</div><div class="visit-name">'+escapeHtml(v.characterName||'未填角色名')+(v.world?' @ '+escapeHtml(v.world):'')+'</div></div><span class="visit-wait">'+(v.status==='waiting'?'等候 '+waitMinutes(v.createdAt)+' 分':(v.status==='assigned'?'待招呼 '+waitMinutes(v.assignedAt||v.updatedAt)+' 分':'接待 '+waitMinutes(v.serviceStartedAt||v.updatedAt)+' 分'))+'</span></div><div class="visit-meta">'+(v.status==='waiting'?'依序候位中':'負責｜'+escapeHtml(v.assignedStaffName||'未命名女僕')+'・'+(v.status==='serving'?'接待進行中':'等待開始接待'))+'</div><div class="visit-tags">'+tags+'</div>'+(actions?'<div class="visit-actions">'+actions+'</div>':'')+overview+'</article>';
  }

  function renderReception(){
    var waiting=visitRows(['waiting']);
    var active=visitRows(['assigned','serving']);
    active.sort(function(a,b){
      var am=currentStaffId && a.assignedStaffId===currentStaffId?0:1, bm=currentStaffId && b.assignedStaffId===currentStaffId?0:1;
      return am!==bm?am-bm:Number(a.assignedAt||0)-Number(b.assignedAt||0);
    });
    var duty=todayStaff.staffIds||[];
    var ids=(duty.length?duty:Object.keys(staffRoster)).filter(function(id){return staffRoster[id];});
    var available=ids.filter(function(id){return (staffPresence[id]||{}).status==='available';}).length;
    var alerts=receptionAlertsData(waiting,active);
    document.getElementById('visitWaitingCount').textContent=waiting.length;
    document.getElementById('myVisitCount').textContent=active.length;
    document.getElementById('receptionWaitingMetric').textContent=waiting.length;
    document.getElementById('receptionActiveMetric').textContent=active.length;
    document.getElementById('receptionAvailableMetric').textContent=available;
    document.getElementById('receptionAlertMetric').textContent=alerts.length;
    document.getElementById('receptionAlertCount').textContent=alerts.length+' 項';
    document.getElementById('receptionAlerts').classList.toggle('visible',alerts.length>0);
    document.getElementById('receptionAlertList').innerHTML=alerts.map(function(a){return '<div class="reception-alert-item"><strong>'+escapeHtml(a.title)+'</strong><span>'+escapeHtml(a.detail)+'</span></div>';}).join('');
    document.getElementById('visitWaitingList').innerHTML=waiting.length?waiting.map(function(v,i){return visitCard(v,i,false);}).join(''):'<div class="queue-empty">目前沒有人候位。<br>自由參觀的客人不會出現在這裡。</div>';
    document.getElementById('myVisitList').innerHTML=active.length?active.map(function(v,i){return visitCard(v,i,!!currentStaffId&&v.assignedStaffId===currentStaffId);}).join(''):'<div class="queue-empty">目前沒有進行中的接待。<br>有空時可接待下一組。</div>';
    var label={available:'可接待',serving:'接待中',photo:'拍照中',away:'暫離'};
    document.getElementById('staffPresenceList').innerHTML=ids.length?ids.map(function(id){
      var presence=staffPresence[id]||{};
      var stale=presence.lastSeenAt && Date.now()-Number(presence.lastSeenAt)>300000;
      var state=stale?'stale':(presence.status||'away');
      var count=visitRows(['assigned','serving']).filter(function(v){return v.assignedStaffId===id;}).length;
      return '<div class="team-staff"><span>'+escapeHtml(staffRoster[id].name||'未命名女僕')+'</span><span class="team-state">'+(state==='stale'?'狀態可能已過期':(label[state]||'暫離'))+(count?'・'+count+' 組':'')+'</span></div>';
    }).join(''):'<div class="queue-empty">尚未設定今日值班女僕</div>';
    document.querySelectorAll('[data-presence]').forEach(function(btn){ btn.classList.toggle('active',!!currentStaffId && ((staffPresence[currentStaffId]||{}).status===btn.getAttribute('data-presence'))); });
    document.getElementById('claimNextVisit').disabled=!currentStaffId;
    renderAssignmentHistory();
  }

  function syncVisitOrdersAssignee(visitId,staffId,staffName){
    var jobs=[];
    Object.keys(orders).forEach(function(id){
      var o=orders[id]||{};
      if(o.visitId===visitId && o.status!=='completed' && o.status!=='cancelled') jobs.push(ordersRef.child(id).update({assignedStaffId:staffId,assignedStaffName:staffName,assignedAt:Date.now()}));
    });
    return Promise.all(jobs);
  }

  function recordVisitAssignment(visitId,fromId,toId,action){
    if(!assignmentHistoryRef) return Promise.resolve();
    return assignmentHistoryRef.push({visitId:visitId,fromStaffId:fromId||'',toStaffId:toId||'',action:action,byUid:currentAuthUser?currentAuthUser.uid:'',createdAt:Date.now()});
  }

  function renderAssignmentHistory(){
    var el=document.getElementById('assignmentHistoryList'); if(!el) return;
    var labels={claim:'認領接待',transfer:'轉交接待','order-page-transfer':'由訂單頁轉交','reset-daily-queue':'重置今日候位'};
    var rows=Object.keys(assignmentHistory).map(function(id){return assignmentHistory[id]||{};}).sort(function(a,b){return Number(b.createdAt||0)-Number(a.createdAt||0);});
    if(!rows.length){el.innerHTML='<div class="queue-empty">尚無操作紀錄</div>';return;}
    el.innerHTML=rows.map(function(row){
      var visit=visits[row.visitId]||{};
      var from=row.fromStaffId&&staffRoster[row.fromStaffId]?staffRoster[row.fromStaffId].name:'';
      var to=row.toStaffId&&staffRoster[row.toStaffId]?staffRoster[row.toStaffId].name:'';
      var detail=from&&to?from+' → '+to:(to||from||'管理人員');
      return '<div class="audit-row"><span>'+fmtTime(row.createdAt)+'</span><strong>'+escapeHtml(labels[row.action]||row.action||'接待操作')+(visit.queueNumber?'・'+escapeHtml(visit.queueNumber):'')+'</strong><span>'+escapeHtml(detail)+'</span></div>';
    }).join('');
  }

  function claimVisit(v){
    var staff=staffRoster[currentStaffId];
    if(!staff){ alert('請先選擇目前操作女僕。'); return Promise.resolve(); }
    return visitsRef.child(v.id).transaction(function(current){
      if(!current || current.status!=='waiting' || current.assignedStaffId) return;
      current.status='assigned'; current.assignedStaffId=currentStaffId; current.assignedStaffName=staff.name||'未命名女僕'; current.assignedAt=Date.now(); current.updatedAt=Date.now();
      return current;
    }).then(function(result){
      if(!result.committed){ alert('這組主人剛剛已被其他女僕接下。'); return; }
      return Promise.all([staffPresenceRef.child(currentStaffId).set({status:'serving',updatedAt:Date.now()}),recordVisitAssignment(v.id,'',currentStaffId,'claim')]);
    });
  }

  function visitCallText(v){
    var guest=String(v.characterName||'主人').replace(/\s+/g,' ').trim();
    var number=v.queueNumber||'目前號碼';
    if(v.assignedStaffName) return '/sh '+guest+' 主人您好，候位號碼 '+number+'，現在由 '+v.assignedStaffName+' 女僕為您接待，請留意遊戲內的招呼。';
    return '/sh '+guest+' 主人您好，候位號碼 '+number+' 已輪到您，請留意女僕前來接待。';
  }

  var copyToastTimer=null;
  function showCopyToast(){
    var toast=document.getElementById('copyToast');
    toast.classList.add('show');
    clearTimeout(copyToastTimer);
    copyToastTimer=setTimeout(function(){toast.classList.remove('show');},1800);
  }

  function copyReceptionText(text){
    var fallback=function(){
      var area=document.createElement('textarea');
      area.value=text; area.setAttribute('readonly',''); area.style.position='fixed'; area.style.opacity='0';
      document.body.appendChild(area); area.select();
      try{document.execCommand('copy');showCopyToast();}catch(err){prompt('請複製以下叫號文字：',text);}
      document.body.removeChild(area);
    };
    if(navigator.clipboard && window.isSecureContext) navigator.clipboard.writeText(text).then(showCopyToast).catch(fallback);
    else fallback();
  }

  document.getElementById('receptionTab').addEventListener('click',function(e){
    var btn=e.target.closest('[data-copy-call]');
    if(!btn) return;
    var visit=visits[btn.getAttribute('data-copy-call')];
    if(visit) copyReceptionText(visitCallText(visit));
  });

  document.getElementById('globalStaffSelect').addEventListener('change',function(){ setCurrentStaff(this.value); });
  document.getElementById('claimNextVisit').addEventListener('click',function(){
    if(!currentStaffId){ alert('請先選擇目前操作女僕。'); return; }
    var next=visitRows(['waiting']).find(function(v){ return !v.preferredStaffId || v.preferredStaffId===currentStaffId; });
    if(!next){ alert('目前沒有可由你接待的候位主人；指定其他女僕的主人會保留在原隊列。'); return; }
    claimVisit(next);
  });
  document.getElementById('resetVisitQueue').addEventListener('click',function(){
    if(!isManager()) return;
    if(operationStatus.isOpen!==false){alert('為避免正式營業中出現重複號碼，請先結束營業再重置候位。');return;}
    var active=visitRows(['waiting','assigned','serving']);
    var message='確定重置今天的候位號碼嗎？\n\n下一位客人會從 A001 重新開始。';
    if(active.length) message+='\n目前 '+active.length+' 組進行中的候位會一併標記為取消，避免產生重複號碼。';
    message+='\n已完成的接待與既有訂單不會刪除。';
    if(!confirm(message)) return;
    var updates={};
    active.forEach(function(v){
      updates[v.id+'/status']='cancelled';
      updates[v.id+'/cancelledAt']=Date.now();
      updates[v.id+'/updatedAt']=Date.now();
      updates[v.id+'/cancelReason']='manager_queue_reset';
    });
    var resetVisits=Object.keys(updates).length ? visitsRef.update(updates) : Promise.resolve();
    Promise.all([resetVisits,visitQueueCounterRef.child(todayKey()).set(0),recordVisitAssignment('',currentStaffId,'','reset-daily-queue')]).then(function(){
      alert('今日候位已重置，下一位客人將取得 A001。');
    }).catch(function(err){
      console.error('Reset visit queue failed',err);
      alert('候位重置失敗，請確認 Firebase 規則已更新。');
    });
  });
  document.getElementById('presenceButtons').addEventListener('click',function(e){
    var btn=e.target.closest('[data-presence]'); if(!btn) return;
    if(!currentStaffId){ alert('請先選擇目前操作女僕。'); return; }
    staffPresenceRef.child(currentStaffId).set({status:btn.getAttribute('data-presence'),updatedAt:Date.now(),lastSeenAt:Date.now(),sessionId:adminSessionId});
  });
  document.getElementById('visitWaitingList').addEventListener('click',function(e){
    var btn=e.target.closest('[data-no-show-visit]'); if(!btn) return;
    var id=btn.getAttribute('data-no-show-visit'), visit=visits[id];
    if(!visit || visit.status!=='waiting') return;
    if(!confirm('已在遊戲內叫號，但 '+(visit.queueNumber||'這組')+' 沒有回應嗎？\n確認後會移出候位隊列。')) return;
    visitsRef.child(id).update({status:'no_show',noShowAt:Date.now(),updatedAt:Date.now()});
  });
  document.getElementById('myVisitList').addEventListener('click',function(e){
    var edit=e.target.closest('[data-edit-visit-note]');
    if(edit){
      var noteId=edit.getAttribute('data-edit-visit-note'), noteVisit=visits[noteId];
      if(!noteVisit || noteVisit.assignedStaffId!==currentStaffId) return;
      var nextNote=prompt('輸入這組主人的店內交接備註：',noteVisit.internalNote||'');
      if(nextNote!==null) visitsRef.child(noteId).update({internalNote:nextNote.trim().slice(0,240)||null,internalNoteUpdatedAt:Date.now(),updatedAt:Date.now()});
      return;
    }
    var start=e.target.closest('[data-start-visit]'), complete=e.target.closest('[data-complete-visit]');
    var id=start?start.getAttribute('data-start-visit'):(complete?complete.getAttribute('data-complete-visit'):'');
    if(!id || !visits[id] || visits[id].assignedStaffId!==currentStaffId) return;
    if(start) visitsRef.child(id).update({status:'serving',serviceStartedAt:Date.now(),updatedAt:Date.now()});
    if(complete){
      var unfinished=ordersForVisit(id).filter(function(order){
        if(order.status!=='completed'&&order.status!=='cancelled') return true;
        var states=order.specialServices||{};
        return collectSpecialTags(order.items||[]).some(function(tag){return !states[tag.key]||states[tag.key].status!=='completed';});
      });
      if(unfinished.length){
        alert('這組主人還有 '+unfinished.length+' 筆未完成的訂單或特殊服務，請先處理完成後再結束接待。');
        return;
      }
      if(!confirm('確定結束 '+(visits[id].queueNumber||'這組')+' 的接待嗎？')) return;
      visitsRef.child(id).update({status:'completed',completedAt:Date.now(),updatedAt:Date.now()}).then(function(){
        var other=visitRows(['assigned','serving']).some(function(v){return v.id!==id&&v.assignedStaffId===currentStaffId;});
        if(!other) staffPresenceRef.child(currentStaffId).set({status:'available',updatedAt:Date.now()});
      });
    }
  });
  document.getElementById('myVisitList').addEventListener('change',function(e){
    var select=e.target.closest('[data-transfer-visit]'); if(!select || !select.value) return;
    var id=select.getAttribute('data-transfer-visit'), target=select.value, targetStaff=staffRoster[target];
    if(!visits[id] || visits[id].assignedStaffId!==currentStaffId || !targetStaff) return;
    if(!confirm('確定把 '+(visits[id].queueNumber||'這組')+' 轉交給 '+(targetStaff.name||'這位女僕')+' 嗎？')){select.value='';return;}
    var from=currentStaffId, name=targetStaff.name||'未命名女僕';
    visitsRef.child(id).update({assignedStaffId:target,assignedStaffName:name,transferredAt:Date.now(),updatedAt:Date.now()}).then(function(){
      return Promise.all([syncVisitOrdersAssignee(id,target,name),staffPresenceRef.child(target).set({status:'serving',updatedAt:Date.now()}),recordVisitAssignment(id,from,target,'transfer')]);
    });
  });

  document.addEventListener('pointerdown', function unlockOrderAudio(){
    if(!soundEnabled) return;
    var AudioCtx = window.AudioContext || window.webkitAudioContext;
    if(!AudioCtx) return;
    if(!orderAudioContext) orderAudioContext = new AudioCtx();
    if(orderAudioContext.state==='suspended') orderAudioContext.resume().catch(function(){});
  }, {once:true});

  function isToday(ts){
    var d = new Date(ts), now = new Date();
    return d.getFullYear()===now.getFullYear() && d.getMonth()===now.getMonth() && d.getDate()===now.getDate();
  }

  function renderStats(){
    var pending=0, preparing=0, completed=0, gil=0, unassigned=0, overdue=0, specialPending=0;
    Object.keys(orders).forEach(function(id){
      var o = orders[id];
      if(!isToday(o.createdAt)) return;
      if(o.status==='pending') pending++;
      if(o.status==='preparing' || o.status==='served') preparing++;
      if(o.status==='completed') completed++;
      if(o.status!=='cancelled') gil += (o.total||0);
      if((o.status==='pending' || o.status==='preparing' || o.status==='served') && !o.assignedStaffId) unassigned++;
      if(o.status==='pending' && o.createdAt && Date.now()-o.createdAt >= 600000) overdue++;
      if(o.status==='pending' || o.status==='preparing' || o.status==='served'){
        var states = o.specialServices || {};
        collectSpecialTags(o.items||[]).forEach(function(tag){
          if(!states[tag.key] || states[tag.key].status!=='completed') specialPending++;
        });
      }
    });
    document.getElementById('statPending').textContent = pending;
    document.getElementById('statUnassigned').textContent = unassigned;
    document.getElementById('statOverdue').textContent = overdue;
    document.getElementById('statSpecialPending').textContent = specialPending;
    document.getElementById('statPreparing').textContent = preparing;
    document.getElementById('statCompleted').textContent = completed;
    document.getElementById('statTotalGil').textContent = fmtGil(gil);
    document.getElementById('overviewDate').textContent = todayKey().replace(/-/g,' / ')+'・即時整理今天的訂單與待處理事項';
  }

  function addSpecialTag(tags, key, label){
    if(tags.some(function(tag){ return tag.key===key; })) return;
    tags.push({ key:key, label:label });
  }

  function collectSpecialTags(items){
    var tags = [];
    (items||[]).forEach(function(item){
      var menuItem = menuItems[item.id] || {};
      var explicitType = item.serviceType || menuItem.serviceType || '';
      if(explicitType==='polaroid') addSpecialTag(tags,'polaroid','📷 拍立得');
      if(explicitType==='lens') addSpecialTag(tags,'lens','✦ 個人攝影');
      if(explicitType==='magic') addSpecialTag(tags,'magic','♥ 蛋包飯魔法');
      var source = [item.name, menuItem.name, menuItem.category, item.note, menuItem.note].filter(Boolean).join(' ');
      if(!explicitType && /拍立得|簽繪|cheki|小顏.*抹茶|naipa.*蘆薈水果凍/i.test(source)){
        addSpecialTag(tags, 'polaroid', '📷 拍立得');
      }
      if(!explicitType && /個人攝影|專屬留影|lens|純拍/i.test(source)){
        addSpecialTag(tags, 'lens', '✦ 個人攝影');
      }
      if(item.addon && /魔法|萌え|萌萌/i.test(item.addon.label||'')){
        addSpecialTag(tags, 'magic', '♥ 蛋包飯魔法');
      }
    });
    return tags;
  }

  function standaloneSpecialType(item){
    var menuItem = menuItems[item.id] || {};
    var explicitType = item.serviceType || menuItem.serviceType || '';
    if(explicitType==='polaroid'||explicitType==='lens') return explicitType;
    var source = [item.name, menuItem.name, menuItem.category, item.note, menuItem.note].filter(Boolean).join(' ');
    if(/拍立得|簽繪|cheki|小顏.*抹茶|naipa.*蘆薈水果凍/i.test(source)) return 'polaroid';
    if(/個人攝影|專屬留影|lens|純拍/i.test(source)) return 'lens';
    return '';
  }

  function specialQueueCard(order, type){
    var items = (order.items||[]).filter(function(item){ return standaloneSpecialType(item)===type; });
    if(!items.length) return '';
    var state = order.specialServices && order.specialServices[type] && order.specialServices[type].status || 'pending';
    var itemText = items.map(function(item){ return (item.name||'特殊服務')+(Number(item.qty||1)>1?' × '+Number(item.qty):''); }).join('、');
    return '<div class="special-queue-card '+(state==='completed'?'is-completed':'')+'">'
      +'<div><div class="special-queue-order">訂單 #'+escapeHtml(order.orderNumber||'—')+'</div>'
      +'<div class="special-queue-name">'+escapeHtml(order.name||'未填寫主人名稱')+'</div>'
      +'<div class="special-queue-items">'+escapeHtml(itemText)+'</div>'
      +'<div class="special-queue-staff">接待：'+escapeHtml(order.assignedStaffName||'尚未指派')+'</div></div>'
      +'<select data-special-queue="'+escapeAttr(order.id)+'" data-special-key="'+type+'" aria-label="更新訂單 #'+escapeAttr(order.orderNumber||'')+' 特殊服務進度">'
      +'<option value="pending" '+(state==='pending'?'selected':'')+'>待處理</option>'
      +'<option value="in_progress" '+(state==='in_progress'?'selected':'')+'>進行中</option>'
      +'<option value="completed" '+(state==='completed'?'selected':'')+'>已完成</option>'
      +'</select></div>';
  }

  function renderSpecialServiceWorkspace(){
    var activeOrders = Object.keys(orders).map(function(id){
      var order = orders[id];
      return Object.assign({id:id}, order);
    }).filter(function(order){ return order.status!=='cancelled' && isToday(order.createdAt); });
    activeOrders.sort(function(a,b){
      function weight(order){
        var states = order.specialServices || {};
        var values = ['polaroid','lens'].map(function(key){ return states[key] && states[key].status || 'pending'; });
        if(values.indexOf('in_progress')>-1) return 0;
        if(values.indexOf('pending')>-1) return 1;
        return 2;
      }
      return weight(a)-weight(b) || Number(a.createdAt||0)-Number(b.createdAt||0);
    });

    ['polaroid','lens'].forEach(function(type){
      var el = document.getElementById(type+'Queue');
      var countEl = document.getElementById(type+'QueueCount');
      if(!el || !countEl) return;
      var matching = activeOrders.filter(function(order){
        return (order.items||[]).some(function(item){ return standaloneSpecialType(item)===type; });
      });
      var pendingCount = matching.filter(function(order){
        return !(order.specialServices && order.specialServices[type] && order.specialServices[type].status==='completed');
      }).length;
      countEl.textContent = String(pendingCount);
      el.innerHTML = matching.length ? matching.map(function(order){ return specialQueueCard(order,type); }).join('') : '<div class="special-queue-empty">目前沒有待處理服務</div>';
    });

    document.querySelectorAll('[data-special-queue]').forEach(function(select){
      select.addEventListener('change', function(){
        var id = select.getAttribute('data-special-queue');
        var key = select.getAttribute('data-special-key');
        ordersRef.child(id).child('specialServices').child(key).update({status:select.value,updatedAt:Date.now()});
      });
    });
  }

  function specialTagsHtml(order){
    var tags = collectSpecialTags(order.items||[]).filter(function(tag){ return tag.key==='magic'; });
    if(!tags.length) return '';
    var states = order.specialServices || {};
    return '<div class="special-service-list">'+tags.map(function(tag){
      var current = states[tag.key] && states[tag.key].status || 'pending';
      return '<div class="special-service-row '+(current==='completed'?'is-completed':'')+'">'
        +'<span class="special-tag '+tag.key+'">'+tag.label+'</span>'
        +'<select data-special-progress="'+order.id+'" data-special-key="'+tag.key+'" aria-label="'+tag.label+'進度">'
        +'<option value="pending" '+(current==='pending'?'selected':'')+'>待處理</option>'
        +'<option value="in_progress" '+(current==='in_progress'?'selected':'')+'>進行中</option>'
        +'<option value="completed" '+(current==='completed'?'selected':'')+'>已完成</option>'
        +'</select></div>';
    }).join('')+'</div>';
  }

  function applyStockDelta(reservations, direction){
    var keys = Object.keys(reservations || {});
    if(!keys.length) return Promise.resolve();
    var applied = [];
    function changeAt(index){
      if(index>=keys.length) return Promise.resolve();
      var id = keys[index];
      var qty = Number(reservations[id]||0);
      if(!qty) return changeAt(index+1);
      return menuRef.child(id).transaction(function(item){
        if(!item) return;
        if(direction < 0){
          if(item.available===false || item.stockEnabled!==true || Number(item.stockRemaining||0)<qty) return;
          item.stockRemaining = Number(item.stockRemaining||0)-qty;
        }else{
          if(item.stockRemaining===undefined && item.stockEnabled!==true) return item;
          item.stockRemaining = Number(item.stockRemaining||0)+qty;
        }
        return item;
      }).then(function(result){
        if(!result.committed) throw new Error('stock-unavailable');
        applied.push(id);
        return changeAt(index+1);
      });
    }
    function rollback(){
      return Promise.all(applied.map(function(id){
        var qty = Number(reservations[id]||0);
        return menuRef.child(id).child('stockRemaining').transaction(function(current){
          return Math.max(0, Number(current||0)-direction*qty);
        });
      }));
    }
    return changeAt(0).catch(function(err){
      return rollback().then(function(){ throw err; });
    });
  }

  function releaseOrderStock(order){
    if(!order || order.stockReleased===true || !order.stockReservations) return Promise.resolve();
    return applyStockDelta(order.stockReservations, 1);
  }

  function reserveOrderStock(order){
    if(!order || order.stockReleased!==true || !order.stockReservations) return Promise.resolve();
    return applyStockDelta(order.stockReservations, -1);
  }

  function updateElapsedLabels(){
    document.querySelectorAll('[data-elapsed-start]').forEach(function(el){
      var start = Number(el.getAttribute('data-elapsed-start'));
      var status = el.getAttribute('data-elapsed-status');
      if(!start){ el.textContent=''; return; }
      var minutes = Math.max(0, Math.floor((Date.now()-start)/60000));
      el.className = 'order-elapsed';
      if(status==='pending'){
        el.textContent = '已等待 '+minutes+' 分鐘';
        if(minutes>=20) el.classList.add('urgent');
        else if(minutes>=10) el.classList.add('warning');
      }else{
        el.textContent = '服務中 '+minutes+' 分鐘';
      }
    });
  }

  function renderOrders(){
    renderSpecialServiceWorkspace();
    var el = document.getElementById('orderList');
    if(currentOrderFilter==='mine' && !currentStaffId){
      document.getElementById('orderSearchHint').textContent = '';
      el.innerHTML = '<p class="empty">請先在上方選擇「我現在是」哪位店員。</p>';
      return;
    }
    var arr = Object.keys(orders).map(function(id){ var o=orders[id]; o.id=id; return o; });

    arr = arr.filter(function(o){
      if(currentOrderFilter==='active') return o.status==='pending' || o.status==='preparing' || o.status==='served';
      if(currentOrderFilter==='mine') return !!currentStaffId && o.assignedStaffId===currentStaffId && (o.status==='pending' || o.status==='preparing' || o.status==='served');
      if(currentOrderFilter==='unassigned') return (o.status==='pending' || o.status==='preparing' || o.status==='served') && !o.assignedStaffId;
      if(currentOrderFilter==='completed') return o.status==='completed';
      if(currentOrderFilter==='cancelled') return o.status==='cancelled';
      return true;
    });
    if(orderSearchTerm){
      arr = arr.filter(function(o){
        var itemText = (o.items||[]).map(function(item){
          return (item.name||'')+' '+(item.addon && item.addon.label || '');
        }).join(' ');
        var haystack = [o.orderNumber, o.queueNumber, o.name, o.note, o.internalNote, o.assignedStaffName, itemText].join(' ').toLowerCase();
        return haystack.indexOf(orderSearchTerm) > -1;
      });
    }
    document.getElementById('orderSearchHint').textContent = orderSearchTerm ? '找到 '+arr.length+' 筆' : '';
    var groupByDate = currentOrderFilter==='completed' || currentOrderFilter==='cancelled' || currentOrderFilter==='all';
    arr.sort(function(a,b){
      return groupByDate ? (b.createdAt||0) - (a.createdAt||0) : (a.createdAt||0) - (b.createdAt||0);
    });

    if(arr.length===0){ el.innerHTML = '<p class="empty">目前沒有符合條件的訂單</p>'; return; }

    var dayStats = {};
    if(groupByDate){
      arr.forEach(function(o){
        var key = orderDateKey(o.createdAt);
        if(!dayStats[key]) dayStats[key] = { count:0, gil:0 };
        dayStats[key].count++;
        if(o.status!=='cancelled') dayStats[key].gil += (o.total||0);
      });
    }

    var html = '';
    var openDay = null;
    var dayIndex = 0;
    arr.forEach(function(o){
      if(groupByDate){
        var dateKey = orderDateKey(o.createdAt);
        if(dateKey!==openDay){
          if(openDay!==null) html += '</div></details>';
          var stat = dayStats[dateKey];
          var meta = stat.count+' 筆'+(stat.gil ? '・'+fmtGil(stat.gil) : '');
          html += '<details class="order-day-group" '+(dayIndex===0?'open':'')+'>'
            +'<summary><span class="order-day-title">'+orderDateLabel(dateKey)+'</span>'
            +'<span class="order-day-meta">'+meta+'<span class="order-day-arrow">⌄</span></span></summary>'
            +'<div class="order-day-list">';
          openDay = dateKey;
          dayIndex++;
        }
      }
      var regularItems = (o.items||[]).filter(function(it){ return !standaloneSpecialType(it); });
      var itemsHtml = regularItems.map(function(it){
        var addonQty = Number(it.qty) || 1;
        var extra = it.addon
          ? '（＋'+escapeHtml(it.addon.label)+' × '+addonQty+'　'+fmtGil(it.addon.price*addonQty)+'）'
          : '';
        return '<div>'+escapeHtml(it.name)+' × '+escapeHtml(String(Number(it.qty)||0))+extra+'</div>';
      }).join('');
      if(!itemsHtml) itemsHtml = '<div class="order-items-empty">此單為特殊服務，請至「特殊服務」分頁處理。</div>';
      var elapsedStart = o.status==='pending' ? o.createdAt : (o.statusUpdatedAt||o.createdAt);
      var elapsedHtml = (o.status==='pending' || o.status==='preparing' || o.status==='served') && elapsedStart
        ? '<span class="order-elapsed" data-elapsed-start="'+elapsedStart+'" data-elapsed-status="'+o.status+'"></span>'
        : '';
      var tagsHtml = specialTagsHtml(o);
      var safeStatus = STATUS_LABEL[o.status] ? o.status : 'pending';

      var assignedId = o.assignedStaffId || '';
      var actionsHtml = '';
      if(NEXT_STATUS[o.status]){
        actionsHtml += '<button class="btn primary small" data-advance="'+o.id+'">'+NEXT_LABEL[o.status]+'</button>';
      }
      if(PREV_STATUS[o.status]){
        actionsHtml += '<button class="btn ghost small" data-revert-order="'+o.id+'">↶ '+PREV_LABEL[o.status]+'</button>';
      }
      if(o.status!=='completed' && o.status!=='cancelled'){
        actionsHtml += '<button class="btn ghost small" data-cancel-order="'+o.id+'">取消訂單</button>';
      }
      if(!assignedId && currentStaffId && o.status!=='completed' && o.status!=='cancelled'){
        actionsHtml = '<button class="btn ghost small" data-claim-order="'+o.id+'">由我接待</button>'+actionsHtml;
      }
      if(isManager()) actionsHtml += '<button class="btn ghost small" data-delete-order="'+o.id+'" style="border-color:var(--rose-dim);color:var(--rose);">刪除</button>';

      var staffIds = Object.keys(staffRoster);
      var onDutyIds = todayStaff.staffIds || [];
      staffIds.sort(function(a,b){
        var aDuty = onDutyIds.indexOf(a) > -1 ? 0 : 1;
        var bDuty = onDutyIds.indexOf(b) > -1 ? 0 : 1;
        if(aDuty !== bDuty) return aDuty - bDuty;
        return String(staffRoster[a].name||'').localeCompare(String(staffRoster[b].name||''), 'zh-Hant');
      });
      var staffOptions = '<option value="">尚未指派</option>';
      staffIds.forEach(function(staffId){
        var staff = staffRoster[staffId] || {};
        var dutyMark = onDutyIds.indexOf(staffId) > -1 ? '（今日值班）' : '';
        staffOptions += '<option value="'+staffId+'" '+(assignedId===staffId?'selected':'')+'>'
          +escapeHtml(staff.name||'未命名店員')+dutyMark+'</option>';
      });
      if(assignedId && !staffRoster[assignedId]){
        staffOptions += '<option value="'+assignedId+'" selected>'+escapeHtml(o.assignedStaffName||'已離開名單的店員')+'</option>';
      }
      var serviceHtml = '<div class="order-service '+(assignedId?'':'unassigned')+'">'
        +'<label for="assignee-'+o.id+'">目前服務店員</label>'
        +'<select id="assignee-'+o.id+'" data-assignee="'+o.id+'">'+staffOptions+'</select>'
        +'</div>';
      var internalNoteText = o.internalNote || '';
      var internalNoteHtml = '<details class="handoff-note">'
        +'<summary><span>店內交接備註</span><span class="handoff-note-preview">'+(internalNoteText ? escapeHtml(internalNoteText) : '尚未填寫')+'</span></summary>'
        +'<div class="handoff-note-body"><textarea data-internal-note="'+o.id+'" maxlength="240" placeholder="例如：靠窗座位、同行兩位、稍後拍立得">'+escapeHtml(internalNoteText)+'</textarea>'
        +'<div class="row" style="justify-content:flex-end;margin-top:7px;"><button class="btn ghost small" data-save-internal-note="'+o.id+'">儲存交接備註</button></div></div>'
        +'</details>';

      html += '<div class="order-card">'
        + '<div class="order-top">'
        + '<div><span class="order-num">#'+escapeHtml(String(o.orderNumber||'—'))+'</span> '+(o.queueNumber?'<span class="visit-tag">候位 '+escapeHtml(o.queueNumber)+'</span> ':'')+'<span class="status-badge status-'+safeStatus+'">'+STATUS_LABEL[safeStatus]+'</span>'
        + '<div class="order-name">'+escapeHtml(o.name||'')+'</div>'
        + (o.note ? '<div class="order-note">備註：'+escapeHtml(o.note)+'</div>' : '')
        + '</div>'
        + '<div class="order-time">'+fmtTime(o.createdAt)+elapsedHtml+'</div>'
        + '</div>'
        + tagsHtml
        + '<div class="order-items">'+itemsHtml+'</div>'
        + '<div class="order-total">合計 '+fmtGil(o.total)+'</div>'
        + serviceHtml
        + internalNoteHtml
        + '<div class="order-actions">'+actionsHtml+'</div>'
        + '</div>';
    });
    if(groupByDate && openDay!==null) html += '</div></details>';
    el.innerHTML = html;
    updateElapsedLabels();

    el.querySelectorAll('[data-special-progress]').forEach(function(select){
      select.addEventListener('change', function(){
        var id = select.getAttribute('data-special-progress');
        var key = select.getAttribute('data-special-key');
        ordersRef.child(id).child('specialServices').child(key).update({
          status: select.value,
          updatedAt: Date.now()
        });
      });
    });

    el.querySelectorAll('[data-assignee]').forEach(function(select){
      select.addEventListener('change', function(){
        var id = select.getAttribute('data-assignee');
        var staffId = select.value;
        var linkedVisitId = (orders[id] || {}).visitId || '';
        if(!staffId){
          if(linkedVisitId){
            alert('已建立接待歸屬的訂單不能在訂單頁解除指派；請到「接待」頁正式轉交。');
            renderOrders();
            return;
          }
          ordersRef.child(id).update({
            assignedStaffId: null,
            assignedStaffName: null,
            assignedAt: null
          }).then(function(){
            var order = orders[id] || {};
            return sendDiscordAssignmentUpdate(order, null);
          });
          return;
        }
        var staff = staffRoster[staffId] || {};
        if(linkedVisitId && visits[linkedVisitId]){
          var previous=visits[linkedVisitId].assignedStaffId||'';
          visitsRef.child(linkedVisitId).update({assignedStaffId:staffId,assignedStaffName:staff.name||'未命名店員',transferredAt:Date.now(),updatedAt:Date.now()}).then(function(){
            return Promise.all([syncVisitOrdersAssignee(linkedVisitId,staffId,staff.name||'未命名店員'),recordVisitAssignment(linkedVisitId,previous,staffId,'order-page-transfer')]);
          });
          return;
        }
        ordersRef.child(id).update({
          assignedStaffId: staffId,
          assignedStaffName: staff.name || '未命名店員',
          assignedAt: Date.now()
        }).then(function(){
          var order = orders[id] || {};
          return sendDiscordAssignmentUpdate(order, staff.name||'未命名店員');
        });
      });
    });

    el.querySelectorAll('[data-claim-order]').forEach(function(btn){
      btn.addEventListener('click', function(){
        var id = btn.getAttribute('data-claim-order');
        var staff = staffRoster[currentStaffId];
        if(!staff){ alert('請先在上方選擇「我現在是」哪位店員。'); return; }
        ordersRef.child(id).update({
          assignedStaffId: currentStaffId,
          assignedStaffName: staff.name || '未命名店員',
          assignedAt: Date.now()
        }).then(function(){ return sendDiscordAssignmentUpdate(orders[id]||{}, staff.name||'未命名店員'); });
      });
    });

    el.querySelectorAll('[data-save-internal-note]').forEach(function(btn){
      btn.addEventListener('click', function(){
        var id = btn.getAttribute('data-save-internal-note');
        var input = el.querySelector('[data-internal-note="'+id+'"]');
        var text = input ? input.value.trim() : '';
        ordersRef.child(id).update({ internalNote:text || null, internalNoteUpdatedAt:Date.now() });
      });
    });

    el.querySelectorAll('[data-advance]').forEach(function(btn){
      btn.addEventListener('click', function(){
        var id = btn.getAttribute('data-advance');
        var next = NEXT_STATUS[orders[id].status];
        if(next){
          var statusUpdate = { status:next, statusUpdatedAt:Date.now() };
          if(next==='completed') statusUpdate.completedAt = Date.now();
          ordersRef.child(id).update(statusUpdate);
        }
      });
    });
    el.querySelectorAll('[data-revert-order]').forEach(function(btn){
      btn.addEventListener('click', function(){
        var id = btn.getAttribute('data-revert-order');
        var previous = PREV_STATUS[orders[id].status];
        if(!previous) return;
        if(confirm('確定要將這筆訂單'+PREV_LABEL[orders[id].status]+'嗎？')){
          var order = orders[id];
          var stockPromise = order.status==='cancelled' ? reserveOrderStock(order) : Promise.resolve();
          stockPromise.then(function(){
            return ordersRef.child(id).update({
              status: previous,
              statusUpdatedAt: Date.now(),
              completedAt: null,
              cancelledAt: null,
              stockReleased: false
            });
          }).catch(function(){ alert('限量服務的名額不足，請先到菜單管理補回名額後再恢復訂單。'); });
        }
      });
    });
    el.querySelectorAll('[data-cancel-order]').forEach(function(btn){
      btn.addEventListener('click', function(){
        var id = btn.getAttribute('data-cancel-order');
        if(confirm('確定要取消這筆訂單嗎？')){
          releaseOrderStock(orders[id]).then(function(){
            return ordersRef.child(id).update({ status:'cancelled', statusUpdatedAt:Date.now(), cancelledAt:Date.now(), stockReleased:true });
          }).catch(function(){ alert('名額歸還失敗，請確認連線後再試一次。'); });
        }
      });
    });
    el.querySelectorAll('[data-delete-order]').forEach(function(btn){
      btn.addEventListener('click', function(){
        var id = btn.getAttribute('data-delete-order');
        if(confirm('確定要永久刪除這筆訂單嗎？此動作無法復原。')){
          var order = orders[id];
          var shouldRelease = order && order.status!=='completed' && order.status!=='cancelled';
          (shouldRelease ? releaseOrderStock(order) : Promise.resolve()).then(function(){ return ordersRef.child(id).remove(); });
        }
      });
    });
  }

  function buildDailyReport(){
    var date = todayKey();
    var list = Object.keys(orders).map(function(id){ return orders[id]; }).filter(function(o){ return isToday(o.createdAt); });
    var active=0, completed=0, cancelled=0, totalGil=0;
    var staffCounts = {};
    var special = { total:0, completed:0 };
    list.forEach(function(o){
      if(o.status==='completed') completed++;
      else if(o.status==='cancelled') cancelled++;
      else active++;
      if(o.status!=='cancelled'){
        totalGil += Number(o.total||0);
        if(o.assignedStaffName) staffCounts[o.assignedStaffName] = (staffCounts[o.assignedStaffName]||0)+1;
      }
      if(o.status!=='cancelled'){
        var states = o.specialServices || {};
        collectSpecialTags(o.items||[]).forEach(function(tag){
          special.total++;
          if(states[tag.key] && states[tag.key].status==='completed') special.completed++;
        });
      }
    });
    var staffLines = Object.keys(staffCounts).sort().map(function(name){ return '・'+name+'：'+staffCounts[name]+' 筆'; });
    if(!staffLines.length) staffLines.push('・尚無店員接待紀錄');
    var text = '【曇時營業日報｜'+date+'】\n'
      +'訂單：'+list.length+' 筆（完成 '+completed+'／進行中 '+active+'／取消 '+cancelled+'）\n'
      +'訂單總額：'+fmtGil(totalGil)+'\n'
      +'特別服務：完成 '+special.completed+'／共 '+special.total+' 項\n\n'
      +'接待紀錄\n'+staffLines.join('\n');
    return {
      text:text,
      data:{ date:date, orderCount:list.length, activeCount:active, completedCount:completed, cancelledCount:cancelled, totalGil:totalGil, specialTotal:special.total, specialCompleted:special.completed, staffCounts:staffCounts, text:text, generatedAt:Date.now() }
    };
  }

  function showDailyReport(save){
    var report = buildDailyReport();
    document.getElementById('reportText').textContent = report.text;
    document.getElementById('reportOverlay').classList.add('open');
    if(save && dailyReportsRef) dailyReportsRef.child(report.data.date).set(report.data);
    return report;
  }

  document.getElementById('viewDailyReport').addEventListener('click', function(){ showDailyReport(false); });
  document.getElementById('operationToggle').addEventListener('click', function(){
    if(operationStatus.isOpen===false){
      operationStatusRef.set({ isOpen:true, label:'營業中', updatedAt:Date.now() });
      return;
    }
    var preview = buildDailyReport();
    var waitingVisits=visitRows(['waiting']);
    var warning = preview.data.activeCount>0 ? '目前仍有 '+preview.data.activeCount+' 筆進行中訂單。\n\n' : '';
    if(waitingVisits.length) warning+='目前另有 '+waitingVisits.length+' 組候位，打烊後會自動取消並通知客人頁面。\n\n';
    if(!confirm(warning+'確定要結束今天的線上點餐並產生日報嗎？已送出的訂單仍會保留。')) return;
    var report = showDailyReport(true);
    var visitUpdates={};
    waitingVisits.forEach(function(v){visitUpdates[v.id+'/status']='cancelled';visitUpdates[v.id+'/cancelledAt']=Date.now();visitUpdates[v.id+'/updatedAt']=Date.now();visitUpdates[v.id+'/cancelReason']='business_closed';});
    var closeWaiting=Object.keys(visitUpdates).length?visitsRef.update(visitUpdates):Promise.resolve();
    closeWaiting.then(function(){return operationStatusRef.set({ isOpen:false, label:'已打烊', updatedAt:Date.now(), reportDate:report.data.date });});
  });
  document.getElementById('reportClose').addEventListener('click', function(){ document.getElementById('reportOverlay').classList.remove('open'); });
  document.getElementById('reportOverlay').addEventListener('click', function(e){ if(e.target===this) this.classList.remove('open'); });
  document.getElementById('reportCopy').addEventListener('click', function(){
    var text = document.getElementById('reportText').textContent;
    var done = function(){
      var btn = document.getElementById('reportCopy');
      btn.textContent = '已複製';
      setTimeout(function(){ btn.textContent='複製日報'; }, 1400);
    };
    if(navigator.clipboard && navigator.clipboard.writeText){
      navigator.clipboard.writeText(text).then(done).catch(function(){ fallbackCopy(text); done(); });
    }else{ fallbackCopy(text); done(); }
  });
  function fallbackCopy(text){
    var area = document.createElement('textarea');
    area.value=text; area.style.position='fixed'; area.style.opacity='0';
    document.body.appendChild(area); area.select(); document.execCommand('copy'); area.remove();
  }

  document.getElementById('resetOrderNumber').addEventListener('click', function(){
    if(!isConfigured) return;
    if(operationStatus.isOpen!==false){alert('為避免營業中出現重複訂單編號，請先結束營業再重置。');return;}
    if(confirm('確定要把訂單編號重置成從 #1 開始嗎？既有的訂單紀錄不會被刪除或更動。')){
      nextOrderNumberRef.set(0);
    }
  });

  // ================= 菜單管理 =================

  function buildMenuGroups(){
    var groups = {};
    menuCategoryOrder.forEach(function(c){ groups[c] = []; });
    Object.keys(menuItems).forEach(function(id){
      var item = menuItems[id];
      var cat = item.category || '其他';
      if(!groups[cat]) groups[cat] = [];
      groups[cat].push(Object.assign({id:id}, item));
    });
    Object.keys(groups).forEach(function(cat){
      groups[cat].sort(function(a,b){ return Number(a.sortOrder||0)-Number(b.sortOrder||0); });
    });
    return groups;
  }

  function menuItemData(item){
    var data = {};
    Object.keys(item).forEach(function(key){
      if(key !== 'id') data[key] = item[key];
    });
    return data;
  }

  function saveMenuOrder(categoryOrder, groups){
    var updates = {};
    var sortOrder = 1;
    categoryOrder.forEach(function(cat, categoryIndex){
      (groups[cat] || []).forEach(function(item){
        updates[item.id+'/sortOrder'] = sortOrder++;
        updates[item.id+'/categoryOrder'] = categoryIndex+1;
      });
    });
    menuRef.update(updates).catch(function(){
      alert('菜單順序儲存失敗，請稍後再試一次。');
    });
  }

  function moveMenuCategory(index, direction){
    var target = index + direction;
    if(index < 0 || target < 0 || target >= menuCategoryOrder.length) return;
    var order = menuCategoryOrder.slice();
    var moved = order.splice(index, 1)[0];
    order.splice(target, 0, moved);
    saveMenuOrder(order, buildMenuGroups());
  }

  function moveMenuItem(id, direction){
    var item = menuItems[id];
    if(!item) return;
    var cat = item.category || '其他';
    var groups = buildMenuGroups();
    var items = groups[cat] || [];
    var index = items.findIndex(function(entry){ return entry.id === id; });
    var target = index + direction;
    if(index < 0 || target < 0 || target >= items.length) return;
    var moved = items.splice(index, 1)[0];
    items.splice(target, 0, moved);
    saveMenuOrder(menuCategoryOrder.slice(), groups);
  }

  function editMenuItem(id){
    var item = menuItems[id];
    if(!item) return;
    editingMenuItemId = id;
    document.getElementById('editItemCategory').value = item.category || '其他';
    document.getElementById('editItemName').value = item.name || '';
    document.getElementById('editItemPrice').value = Number(item.price || 0);
    document.getElementById('editItemServiceType').value = item.serviceType || 'food';
    document.getElementById('editItemNote').value = item.note || '';
    document.getElementById('editItemAddonLabel').value = item.addonLabel || '';
    document.getElementById('editItemAddonPrice').value = Number(item.addonPrice || 0);
    document.getElementById('editItemAvailable').checked = item.available !== false;
    document.getElementById('editItemStockEnabled').checked = item.stockEnabled === true;
    document.getElementById('editItemStockRemaining').value = Number(item.stockRemaining || 0);
    document.getElementById('editItemStockRemaining').disabled = item.stockEnabled !== true;
    document.getElementById('menuEditOverlay').classList.add('open');
    setTimeout(function(){ document.getElementById('editItemName').focus(); }, 0);
  }

  function closeMenuEditor(){
    editingMenuItemId = null;
    document.getElementById('menuEditOverlay').classList.remove('open');
  }

  function saveMenuItemChanges(){
    if(!editingMenuItemId || !menuItems[editingMenuItemId]) return;
    var category = document.getElementById('editItemCategory').value.trim();
    var name = document.getElementById('editItemName').value.trim();
    var price = Number(document.getElementById('editItemPrice').value);
    var serviceType = document.getElementById('editItemServiceType').value || 'food';
    var note = document.getElementById('editItemNote').value.trim();
    var addonLabel = document.getElementById('editItemAddonLabel').value.trim();
    var addonPriceText = document.getElementById('editItemAddonPrice').value;
    var addonPrice = addonPriceText === '' ? 0 : Number(addonPriceText);
    var available = document.getElementById('editItemAvailable').checked;
    var stockEnabled = document.getElementById('editItemStockEnabled').checked;
    var stockRemaining = Number(document.getElementById('editItemStockRemaining').value || 0);

    if(!category){ alert('請填寫分類名稱。'); return; }
    if(!name){ alert('請填寫菜單名稱。'); return; }
    if(!Number.isInteger(price) || price < 0){ alert('價格請輸入 0 以上的整數。'); return; }
    if(addonLabel && (!Number.isInteger(addonPrice) || addonPrice < 0)){
      alert('加購價格請輸入 0 以上的整數。');
      return;
    }
    if(stockEnabled && (!Number.isInteger(stockRemaining) || stockRemaining < 0)){
      alert('剩餘份數請輸入 0 以上的整數。');
      return;
    }

    var data = menuItemData(menuItems[editingMenuItemId]);
    data.category = category;
    data.name = name;
    data.price = price;
    data.serviceType = serviceType;
    if(note) data.note = note; else delete data.note;
    if(addonLabel){
      data.addonLabel = addonLabel;
      data.addonPrice = addonPrice;
    }else{
      delete data.addonLabel;
      delete data.addonPrice;
    }
    data.available = available;
    data.stockEnabled = stockEnabled;
    if(stockEnabled) data.stockRemaining = stockRemaining;
    else delete data.stockRemaining;
    data.updatedAt = Date.now();

    var saveBtn = document.getElementById('menuEditSave');
    var statusEl = document.getElementById('menuSaveStatus');
    var id = editingMenuItemId;
    saveBtn.disabled = true;
    saveBtn.textContent = '儲存中…';
    if(statusEl){
      statusEl.textContent = '正在儲存並確認前台同步資料…';
      statusEl.style.color = 'var(--gold)';
    }
    menuRef.child(id).set(data).then(function(){
      return menuRef.child(id).once('value');
    }).then(function(snap){
      var saved = snap.val() || {};
      var verified = saved.name === name &&
        Number(saved.price) === price &&
        saved.available === available &&
        saved.stockEnabled === stockEnabled &&
        (!stockEnabled || Number(saved.stockRemaining) === stockRemaining);
      if(!verified) throw new Error('menu-verify-failed');
      var publicItemUrl = firebaseConfig.databaseURL.replace(/\/$/, '') + '/lephemere/menu/' + encodeURIComponent(id) + '.json';
      return fetch(publicItemUrl, {cache:'no-store'}).then(function(response){
        if(!response.ok) throw new Error('menu-public-read-failed');
        return response.json();
      }).then(function(publicItem){
        publicItem = publicItem || {};
        var publicVerified = publicItem.name === name &&
          Number(publicItem.price) === price &&
          publicItem.available === available &&
          publicItem.stockEnabled === stockEnabled &&
          (!stockEnabled || Number(publicItem.stockRemaining) === stockRemaining);
        if(!publicVerified) throw new Error('menu-public-verify-failed');
      });
    }).then(function(){
      if(statusEl){
        statusEl.textContent = '已寫入並通過公開菜單驗證・' + new Date().toLocaleTimeString('zh-TW', {hour:'2-digit', minute:'2-digit', second:'2-digit'});
        statusEl.style.color = 'var(--sage)';
      }
      closeMenuEditor();
    }).catch(function(err){
      if(statusEl){
        statusEl.textContent = '同步失敗，資料尚未確認寫入，請再試一次。';
        statusEl.style.color = 'var(--rose)';
      }
      var message = '菜單修改儲存失敗，請確認網路後再試一次。';
      if(err && err.message === 'menu-verify-failed') message = 'Firebase 寫入後讀回結果不一致，請重新整理後再試一次。';
      if(err && err.message === 'menu-public-read-failed') message = '資料已寫入，但無法從公開菜單讀回；請檢查 Firebase Database Rules 的讀取權限。';
      if(err && err.message === 'menu-public-verify-failed') message = '後台資料已寫入，但公開菜單仍是舊值；請檢查 Firebase Database Rules 或代理快取。';
      alert(message);
    }).finally(function(){
      saveBtn.disabled = false;
      saveBtn.textContent = '儲存修改';
    });
  }

  function renderMenuManageList(){
    var el = document.getElementById('menuManageList');
    if(menuCategoryOrder.length === 0){ el.innerHTML = '尚未設定菜單'; return; }
    var groups = buildMenuGroups();
    var html = '';
    menuCategoryOrder.forEach(function(cat, catIndex){
      var items = groups[cat] || [];
      if(items.length === 0) return;
      html += '<div class="menu-category-head">'
        + '<p class="panel-title">'+escapeHtml(cat)+'</p>'
        + '<div class="menu-sort-actions">'
        + '<button class="icon-btn" data-move-category="'+catIndex+'" data-direction="-1" title="分類往上" aria-label="'+escapeHtml(cat)+'分類往上" '+(catIndex===0?'disabled':'')+'>↑</button>'
        + '<button class="icon-btn" data-move-category="'+catIndex+'" data-direction="1" title="分類往下" aria-label="'+escapeHtml(cat)+'分類往下" '+(catIndex===menuCategoryOrder.length-1?'disabled':'')+'>↓</button>'
        + '</div></div>';
      items.forEach(function(item, itemIndex){
        var stockBadge = '';
        if(item.available===false){
          stockBadge = '<span class="stock-badge soldout">暫停供應</span>';
        }else if(item.stockEnabled===true){
          stockBadge = Number(item.stockRemaining||0)>0
            ? '<span class="stock-badge limited">剩 '+Number(item.stockRemaining||0)+' 份</span>'
            : '<span class="stock-badge soldout">本次額滿</span>';
        }
        html += '<div class="staff-check">'
          + '<label style="flex:1;">'+escapeHtml(item.name)+' <span style="color:var(--gold-dim);">'+fmtGil(item.price)+'</span>'+stockBadge
          + (item.note ? '<div style="font-size:11px;color:var(--parchment-dim);">'+escapeHtml(item.note)+'</div>' : '')
          + (item.addonLabel ? '<div style="font-size:11px;color:var(--mist);">加購：'+escapeHtml(item.addonLabel)+' ＋'+fmtGil(item.addonPrice)+'</div>' : '')
          + '</label>'
          + '<div class="menu-sort-actions">'
          + '<button class="icon-btn" data-move-item="'+item.id+'" data-direction="-1" title="品項往上" aria-label="'+escapeHtml(item.name)+'往上" '+(itemIndex===0?'disabled':'')+'>↑</button>'
          + '<button class="icon-btn" data-move-item="'+item.id+'" data-direction="1" title="品項往下" aria-label="'+escapeHtml(item.name)+'往下" '+(itemIndex===items.length-1?'disabled':'')+'>↓</button>'
          + '<button class="btn small menu-edit-btn" data-edit-item="'+item.id+'" title="編輯品項" aria-label="編輯'+escapeHtml(item.name)+'">編輯</button>'
          + '<button class="icon-btn" data-remove-item="'+item.id+'" title="從菜單刪除">✕</button>'
          + '</div>'
          + '</div>';
      });
    });
    el.innerHTML = html || '尚未設定菜單';
    el.querySelectorAll('[data-move-category]').forEach(function(btn){
      btn.addEventListener('click', function(){
        moveMenuCategory(
          parseInt(btn.getAttribute('data-move-category'), 10),
          parseInt(btn.getAttribute('data-direction'), 10)
        );
      });
    });
    el.querySelectorAll('[data-move-item]').forEach(function(btn){
      btn.addEventListener('click', function(){
        moveMenuItem(
          btn.getAttribute('data-move-item'),
          parseInt(btn.getAttribute('data-direction'), 10)
        );
      });
    });
    el.querySelectorAll('[data-edit-item]').forEach(function(btn){
      btn.addEventListener('click', function(){
        editMenuItem(btn.getAttribute('data-edit-item'));
      });
    });
    el.querySelectorAll('[data-remove-item]').forEach(function(btn){
      btn.addEventListener('click', function(){
        if(confirm('確定要從菜單移除這個品項嗎？')){
          menuRef.child(btn.getAttribute('data-remove-item')).remove();
        }
      });
    });
  }

  document.getElementById('addMenuItem').addEventListener('click', function(){
    if(!isConfigured) return;
    var category = document.getElementById('newItemCategory').value.trim();
    var name = document.getElementById('newItemName').value.trim();
    var price = parseInt(document.getElementById('newItemPrice').value, 10);
    var note = document.getElementById('newItemNote').value.trim();
    var addonLabel = document.getElementById('newItemAddonLabel').value.trim();
    var addonPrice = parseInt(document.getElementById('newItemAddonPrice').value, 10);
    var serviceType = document.getElementById('newItemServiceType').value || 'food';

    if(!category || !name || !price || price < 0){
      alert('請至少填寫分類、品名跟價格');
      return;
    }
    var maxSortOrder = Object.keys(menuItems).reduce(function(max,id){ return Math.max(max, Number(menuItems[id].sortOrder||0)); }, 0);
    var data = { category:category, name:name, price:price, serviceType:serviceType, available:true, sortOrder:maxSortOrder+1 };
    if(note) data.note = note;
    if(addonLabel && addonPrice){ data.addonLabel = addonLabel; data.addonPrice = addonPrice; }

    var key = menuRef.push().key;
    menuRef.child(key).set(data);

    document.getElementById('newItemCategory').value = '';
    document.getElementById('newItemName').value = '';
    document.getElementById('newItemPrice').value = '';
    document.getElementById('newItemNote').value = '';
    document.getElementById('newItemAddonLabel').value = '';
    document.getElementById('newItemAddonPrice').value = '';
    document.getElementById('newItemServiceType').value = 'food';
  });

  document.getElementById('menuEditCancel').addEventListener('click', closeMenuEditor);
  document.getElementById('menuEditSave').addEventListener('click', saveMenuItemChanges);
  document.getElementById('editItemStockEnabled').addEventListener('change', function(e){
    document.getElementById('editItemStockRemaining').disabled = !e.target.checked;
    if(e.target.checked && document.getElementById('editItemStockRemaining').value===''){
      document.getElementById('editItemStockRemaining').value = 0;
    }
  });
  document.getElementById('menuEditOverlay').addEventListener('click', function(e){
    if(e.target === this) closeMenuEditor();
  });
  document.addEventListener('keydown', function(e){
    if(e.key === 'Escape' && document.getElementById('menuEditOverlay').classList.contains('open')){
      closeMenuEditor();
    }
  });

  document.getElementById('seedDefaultMenu').addEventListener('click', function(){
    if(!isConfigured) return;
    if(Object.keys(menuItems).length > 0){
      alert('菜單目前已經有品項了，這個按鈕只能在菜單全空的時候使用，避免重複匯入。');
      return;
    }
    if(!confirm('確定要匯入後台內建的預設菜單嗎？')) return;
    var updates = {};
    DEFAULT_MENU.forEach(function(item){
      var key = menuRef.push().key;
      updates[key] = item;
    });
    menuRef.update(updates);
  });

  document.getElementById('syncMenuPrices').addEventListener('click', function(){
    if(!isConfigured) return;
    if(Object.keys(menuItems).length === 0){
      alert('目前菜單是空的，請先使用「匯入預設菜單」。');
      return;
    }
    if(!confirm('確定要套用內建預設價格嗎？同名餐點目前的自訂價格會被覆蓋，特別服務與菜單順序不受影響。')) return;

    var priceByName = {};
    DEFAULT_MENU.forEach(function(item){ priceByName[item.name] = item; });
    var updates = {};
    var matched = 0;

    Object.keys(menuItems).forEach(function(id){
      var current = menuItems[id];
      var latest = priceByName[current.name];
      if(!latest) return;
      updates[id + '/price'] = latest.price;
      if(latest.addonPrice !== undefined){
        updates[id + '/addonPrice'] = latest.addonPrice;
      }
      matched++;
    });

    if(matched === 0){
      alert('找不到名稱相符的品項，沒有更新任何價格。');
      return;
    }

    menuRef.update(updates).then(function(){
      alert('已同步 ' + matched + ' 個品項的最新價格。');
    }).catch(function(){
      alert('價格同步失敗，請稍後再試一次。');
    });
  });

  // ================= 預約管理 =================

  // ---------- rules ----------
  document.getElementById('saveRules').addEventListener('click', function(){
    if(!isConfigured) return;
    rulesRef.set(document.getElementById('rulesEditor').value);
  });
  document.getElementById('hideRules').addEventListener('click', function(){
    if(!isConfigured) return;
    rulesRef.set('');
    document.getElementById('rulesEditor').value = '';
  });

  // ---------- staff roster / on-duty ----------
  function rebuildStaffSchedules(){
    var embedded = todayStaff && todayStaff.schedules && typeof todayStaff.schedules === 'object'
      ? todayStaff.schedules
      : {};
    staffSchedules = Object.assign({}, legacyStaffSchedules, embedded);
  }

  function migrateLegacySchedules(){
    if(legacySchedulesMigrated||!isManager()||!todayStaffRef) return;
    var legacyKeys=Object.keys(legacyStaffSchedules||{});
    if(!legacyKeys.length) return;
    var embedded=todayStaff&&todayStaff.schedules&&typeof todayStaff.schedules==='object'?todayStaff.schedules:{};
    var updates={};
    legacyKeys.forEach(function(date){if(!embedded[date]) updates[date]=legacyStaffSchedules[date];});
    legacySchedulesMigrated=true;
    if(Object.keys(updates).length) todayStaffRef.child('schedules').update(updates).catch(function(){legacySchedulesMigrated=false;});
  }

  function staffSortKeys(){
    var original = Object.keys(staffRoster);
    return original.slice().sort(function(a,b){
      var sa = staffRoster[a] || {}, sb = staffRoster[b] || {};
      var oa = Number(sa.sortOrder || (original.indexOf(a) + 1));
      var ob = Number(sb.sortOrder || (original.indexOf(b) + 1));
      if(oa !== ob) return oa - ob;
      return String(sa.name || '').localeCompare(String(sb.name || ''), 'zh-Hant');
    });
  }

  function renderStaffManageList(){
    var el = document.getElementById('staffManageList');
    if(!el) return;
    var keys = staffSortKeys();
    if(!keys.length){ el.innerHTML = '<span class="empty">尚未建立店員名單</span>'; return; }
    var html = '';
    keys.forEach(function(k){
      var s = staffRoster[k] || {};
      var photoInner = s.photo ? '<img src="'+escapeAttr(s.photo)+'" alt="">' : escapeHtml((s.name || '?').slice(0,1));
      html += '<details class="staff-editor-card" data-staff-editor="'+k+'">'
        + '<summary><div class="staff-check-photo">'+photoInner+'</div>'
        + '<div class="staff-editor-summary"><strong>'+escapeHtml(s.name || '未命名店員')+'</strong><span>'+escapeHtml(s.role || '尚未設定職位')+'</span></div>'
        + '<span class="staff-editor-chevron" aria-hidden="true">⌄</span></summary>'
        + '<div class="staff-editor-body"><div class="staff-editor-grid">'
        + '<input type="text" data-staff-field="name" value="'+escapeAttr(s.name || '')+'" placeholder="店員名稱">'
        + '<input type="text" data-staff-field="role" value="'+escapeAttr(s.role || '')+'" placeholder="職位（如：女僕／樂手）">'
        + '<input class="wide" type="text" data-staff-field="quote" value="'+escapeAttr(s.quote || '')+'" placeholder="官網個人介紹（選填）">'
        + '<input class="wide" type="url" data-staff-field="threads" value="'+escapeAttr(s.threads || '')+'" placeholder="Threads 網址（選填）">'
        + '</div><div class="staff-editor-actions">'
        + '<button class="btn primary small" data-save-staff="'+k+'">儲存修改</button>'
        + '<button class="btn ghost small" data-photo-staff="'+k+'">設定頭貼</button>'
        + '<button class="btn ghost small" data-remove-staff="'+k+'" style="border-color:var(--rose-dim);color:var(--rose);">刪除店員</button>'
        + '</div></div></details>';
    });
    el.innerHTML = html;
    el.querySelectorAll('[data-save-staff]').forEach(function(btn){
      btn.addEventListener('click', function(){
        var id = btn.getAttribute('data-save-staff');
        var card = btn.closest('[data-staff-editor]');
        var name = card.querySelector('[data-staff-field="name"]').value.trim();
        var role = card.querySelector('[data-staff-field="role"]').value.trim();
        var quote = card.querySelector('[data-staff-field="quote"]').value.trim();
        var threads = card.querySelector('[data-staff-field="threads"]').value.trim();
        if(!name){ alert('請填寫店員名稱。'); return; }
        if(threads && !/^https:\/\//i.test(threads)){ alert('Threads 網址請以 https:// 開頭。'); return; }
        staffRosterRef.child(id).update({name:name, role:role, quote:quote, threads:threads, updatedAt:Date.now()});
      });
    });
    el.querySelectorAll('[data-photo-staff]').forEach(function(btn){
      btn.addEventListener('click', function(){ openPhotoEditor(btn.getAttribute('data-photo-staff')); });
    });
    el.querySelectorAll('[data-remove-staff]').forEach(function(btn){
      btn.addEventListener('click', function(){
        var id = btn.getAttribute('data-remove-staff');
        var name = (staffRoster[id] && staffRoster[id].name) || '這位店員';
        if(confirm('確定要從名冊刪除「'+name+'」嗎？既有訂單紀錄不會被刪除。')) staffRosterRef.child(id).remove();
      });
    });
  }

  var scheduleSaveTimer = null;

  function renderDutySummary(overrideIds, overrideDate){
    var el = document.getElementById('dutySummaryText');
    if(!el) return;
    var selectedDate = overrideDate || document.getElementById('onDutyDate').value.trim() || todayKey();
    var schedule = staffSchedules[selectedDate];
    var ids = Array.isArray(overrideIds)
      ? overrideIds
      : (schedule && schedule.staffIds ? schedule.staffIds : (todayStaff.date===selectedDate ? (todayStaff.staffIds||[]) : []));
    var names = ids.map(function(id){
      return staffRoster[id] && staffRoster[id].name;
    }).filter(Boolean);
    if(names.length){
      el.textContent = selectedDate+'：'+names.join('、');
    }else if(ids.length){
      el.textContent = selectedDate+'：已選擇 '+ids.length+' 位店員';
    }else{
      el.textContent = selectedDate+'：尚未設定排班';
    }
  }

  function setScheduleSaveStatus(text, state){
    var el = document.getElementById('scheduleSaveStatus');
    if(!el) return;
    el.textContent = text;
    el.className = 'schedule-save-status'+(state ? ' '+state : '');
  }

  function collectScheduleForm(){
    var checked = document.querySelectorAll('#staffCheckList input[type=checkbox]:checked');
    var ids = Array.prototype.map.call(checked, function(cb){ return cb.getAttribute('data-staff-id'); });
    var date = document.getElementById('onDutyDate').value.trim() || todayKey();
    return {date:date, staffIds:ids, updatedAt:Date.now()};
  }

  function persistSchedule(data){
    if(!isConfigured) return Promise.resolve();
    setScheduleSaveStatus('正在同步至預約頁…', 'saving');
    var updates = {};
    updates['schedules/'+data.date] = data;
    if(data.date===todayKey()){
      updates.date = data.date;
      updates.staffIds = data.staffIds;
      updates.updatedAt = data.updatedAt;
    }
    return todayStaffRef.update(updates).then(function(){
      setScheduleSaveStatus('已自動儲存並同步', 'saved');
    }).catch(function(err){
      console.error('Schedule sync failed', err);
      var denied = err && (err.code === 'PERMISSION_DENIED' || /permission/i.test(String(err.message || '')));
      setScheduleSaveStatus(denied ? '登入權限已失效，請重新登入後重試' : '同步失敗，請按「立即儲存」重試', 'error');
    });
  }

  function queueScheduleAutoSave(){
    var data = collectScheduleForm();
    renderDutySummary(data.staffIds, data.date);
    setScheduleSaveStatus('變更尚未送出…', 'saving');
    if(scheduleSaveTimer) clearTimeout(scheduleSaveTimer);
    scheduleSaveTimer = setTimeout(function(){ persistSchedule(data); }, 450);
  }

  function renderStaffCheckList(){
    renderDutySummary();
    var el = document.getElementById('staffCheckList');
    var keys = staffSortKeys();
    if(keys.length===0){ el.innerHTML = '尚未建立店員名單'; return; }
    var selectedDate = document.getElementById('onDutyDate').value.trim() || todayKey();
    var selectedSchedule = staffSchedules[selectedDate];
    var currentOnDuty = selectedSchedule && selectedSchedule.staffIds
      ? selectedSchedule.staffIds
      : (todayStaff.date===selectedDate ? (todayStaff.staffIds||[]) : []);
    var html = '';
    keys.forEach(function(k){
      var s = staffRoster[k];
      var checked = currentOnDuty.indexOf(k) > -1 ? 'checked' : '';
      var photoInner = s.photo ? '<img src="'+escapeAttr(s.photo)+'" alt="">' : escapeHtml((s.name || '?').slice(0,1));
      html += '<div class="staff-check"><input type="checkbox" data-staff-id="'+k+'" '+checked+'>'
        + '<div class="staff-check-photo">'+photoInner+'</div>'
        + '<label>'+escapeHtml(s.name)+' <span style="color:var(--parchment-dim);font-size:11px;">· '+escapeHtml(s.role||'')+'</span></label>'
        + '</div>';
    });
    el.innerHTML = html;
    el.querySelectorAll('input[type=checkbox][data-staff-id]').forEach(function(cb){
      cb.addEventListener('change', queueScheduleAutoSave);
    });
  }

  document.getElementById('addStaff').addEventListener('click', function(){
    if(!isConfigured) return;
    var name = document.getElementById('newStaffName').value.trim();
    var role = document.getElementById('newStaffRole').value.trim();
    var quote = document.getElementById('newStaffQuote').value.trim();
    var threads = document.getElementById('newStaffThreads').value.trim();
    if(!name){ alert('請填寫店員名稱。'); return; }
    if(threads && !/^https:\/\//i.test(threads)){ alert('Threads 網址請以 https:// 開頭。'); return; }
    var key = staffRosterRef.push().key;
    var rosterCount = Object.keys(staffRoster).length;
    var nextOrder = Object.keys(staffRoster).reduce(function(max,id){
      return Math.max(max, Number((staffRoster[id] || {}).sortOrder || 0));
    }, rosterCount) + 1;
    staffRosterRef.child(key).set({ name:name, role:role, quote:quote, threads:threads, sortOrder:nextOrder, createdAt:Date.now() });
    document.getElementById('newStaffName').value = '';
    document.getElementById('newStaffRole').value = '';
    document.getElementById('newStaffQuote').value = '';
    document.getElementById('newStaffThreads').value = '';
  });

  document.getElementById('updateTodayStaff').addEventListener('click', function(){
    if(scheduleSaveTimer){ clearTimeout(scheduleSaveTimer); scheduleSaveTimer = null; }
    persistSchedule(collectScheduleForm());
  });

  document.getElementById('onDutyDate').addEventListener('change', function(){
    if(scheduleSaveTimer){ clearTimeout(scheduleSaveTimer); scheduleSaveTimer = null; }
    setScheduleSaveStatus('勾選後會自動儲存', '');
    renderStaffCheckList();
  });

  // ---------- photo cropper ----------
  var PHOTO_PREVIEW_SIZE = 260;
  var PHOTO_OUTPUT_SIZE = 1200;
  var PHOTO_OUTPUT_QUALITY = 0.90;
  var photoEditStaffId = null;
  var photoImg = null;
  var photoScale = 1, photoBaseScale = 1, photoOffX = 0, photoOffY = 0;
  var photoDragging = false, photoDragStartX = 0, photoDragStartY = 0, photoStartOffX = 0, photoStartOffY = 0;
  var photoCanvas = document.getElementById('photoCropCanvas');
  var photoCtx = photoCanvas ? photoCanvas.getContext('2d') : null;

  function openPhotoEditor(staffId){
    photoEditStaffId = staffId;
    photoImg = null;
    document.getElementById('photoFileInput').value = '';
    document.getElementById('photoZoomSlider').value = 100;
    if(photoCtx) photoCtx.clearRect(0,0,PHOTO_PREVIEW_SIZE,PHOTO_PREVIEW_SIZE);
    var existing = staffRoster[staffId] && staffRoster[staffId].photo;
    if(existing){
      var im = new Image();
      im.onload = function(){ photoImg = im; fitPhotoToStage(); drawPhotoCanvas(); };
      im.src = existing;
    }
    document.getElementById('photoModalOverlay').classList.add('open');
  }
  function closePhotoEditor(){
    document.getElementById('photoModalOverlay').classList.remove('open');
    photoEditStaffId = null;
    photoImg = null;
  }
  function fitPhotoToStage(){
    if(!photoImg) return;
    photoBaseScale = Math.max(PHOTO_PREVIEW_SIZE/photoImg.width, PHOTO_PREVIEW_SIZE/photoImg.height);
    photoScale = 1;
    photoOffX = 0; photoOffY = 0;
    document.getElementById('photoZoomSlider').value = 100;
  }
  function drawPhotoCanvas(){
    if(!photoCtx) return;
    photoCtx.clearRect(0,0,PHOTO_PREVIEW_SIZE,PHOTO_PREVIEW_SIZE);
    if(!photoImg) return;
    var s = photoBaseScale * photoScale;
    var w = photoImg.width * s, h = photoImg.height * s;
    var x = (PHOTO_PREVIEW_SIZE - w)/2 + photoOffX;
    var y = (PHOTO_PREVIEW_SIZE - h)/2 + photoOffY;
    photoCtx.drawImage(photoImg, x, y, w, h);
  }
  var fileInputEl = document.getElementById('photoFileInput');
  if(fileInputEl) fileInputEl.addEventListener('change', function(e){
    var file = e.target.files && e.target.files[0];
    if(!file) return;
    var reader = new FileReader();
    reader.onload = function(ev){
      var im = new Image();
      im.onload = function(){ photoImg = im; fitPhotoToStage(); drawPhotoCanvas(); };
      im.src = ev.target.result;
    };
    reader.readAsDataURL(file);
  });
  var zoomSliderEl = document.getElementById('photoZoomSlider');
  if(zoomSliderEl) zoomSliderEl.addEventListener('input', function(e){
    photoScale = e.target.value / 100;
    drawPhotoCanvas();
  });
  var stageEl = document.getElementById('photoCropStage');
  if(stageEl){
    stageEl.addEventListener('mousedown', function(e){
      if(!photoImg) return;
      photoDragging = true;
      photoDragStartX = e.clientX; photoDragStartY = e.clientY;
      photoStartOffX = photoOffX; photoStartOffY = photoOffY;
    });
    window.addEventListener('mousemove', function(e){
      if(!photoDragging) return;
      photoOffX = photoStartOffX + (e.clientX - photoDragStartX);
      photoOffY = photoStartOffY + (e.clientY - photoDragStartY);
      drawPhotoCanvas();
    });
    window.addEventListener('mouseup', function(){ photoDragging = false; });
    stageEl.addEventListener('touchstart', function(e){
      if(!photoImg || !e.touches[0]) return;
      photoDragging = true;
      photoDragStartX = e.touches[0].clientX; photoDragStartY = e.touches[0].clientY;
      photoStartOffX = photoOffX; photoStartOffY = photoOffY;
    });
    stageEl.addEventListener('touchmove', function(e){
      if(!photoDragging || !e.touches[0]) return;
      photoOffX = photoStartOffX + (e.touches[0].clientX - photoDragStartX);
      photoOffY = photoStartOffY + (e.touches[0].clientY - photoDragStartY);
      drawPhotoCanvas();
      e.preventDefault();
    }, {passive:false});
    stageEl.addEventListener('touchend', function(){ photoDragging = false; });
  }
  var cancelBtn = document.getElementById('photoModalCancel');
  if(cancelBtn) cancelBtn.addEventListener('click', closePhotoEditor);
  var saveBtn = document.getElementById('photoModalSave');
  if(saveBtn) saveBtn.addEventListener('click', function(){
    if(!photoEditStaffId || !photoImg){ closePhotoEditor(); return; }
    var out = document.createElement('canvas');
    out.width = PHOTO_OUTPUT_SIZE; out.height = PHOTO_OUTPUT_SIZE;
    var octx = out.getContext('2d');
    octx.imageSmoothingEnabled = true;
    octx.imageSmoothingQuality = 'high';
    var outputRatio = PHOTO_OUTPUT_SIZE / PHOTO_PREVIEW_SIZE;
    var s = photoBaseScale * photoScale * outputRatio;
    var w = photoImg.width * s, h = photoImg.height * s;
    var x = (PHOTO_OUTPUT_SIZE - w)/2 + photoOffX * outputRatio;
    var y = (PHOTO_OUTPUT_SIZE - h)/2 + photoOffY * outputRatio;
    octx.drawImage(photoImg, x, y, w, h);
    var staffId = photoEditStaffId;
    saveBtn.disabled = true;
    saveBtn.textContent = '儲存高畫質照片中…';
    out.toBlob(function(blob){
      if(!blob){saveBtn.disabled=false;saveBtn.textContent='儲存頭貼';alert('照片轉換失敗，請改用另一張圖片。');return;}
      var fileRef=storage.ref('staff-photos/'+staffId+'.webp');
      fileRef.put(blob,{contentType:'image/webp',cacheControl:'public,max-age=86400'}).then(function(snapshot){return snapshot.ref.getDownloadURL();}).then(function(url){
        return staffRosterRef.child(staffId).update({photo:url,photoUpdatedAt:Date.now()});
      }).then(function(){
        saveBtn.disabled=false;saveBtn.textContent='儲存頭貼';closePhotoEditor();
      }).catch(function(error){
        saveBtn.disabled=false;saveBtn.textContent='儲存頭貼';
        alert('照片儲存失敗，請確認 Firebase Storage 規則已發布。'+(error&&error.message?'\n'+error.message:''));
      });
    },'image/webp',PHOTO_OUTPUT_QUALITY);
  });

  // ---------- open dates ----------
  function renderOpenDateManageList(){
    var el = document.getElementById('openDateManageList');
    var keys = Object.keys(openDates).sort();
    if(keys.length===0){ el.innerHTML = '<span style="color:var(--parchment-dim);font-size:12px;">尚未開放任何日期</span>'; return; }
    var reservedDates = {};
    Object.keys(reservations).forEach(function(id){ reservedDates[reservations[id].date] = true; });
    var html = '<div style="display:flex;flex-direction:column;gap:6px;">';
    keys.forEach(function(d){
      html += '<div style="display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid var(--line);padding-bottom:6px;">'
        + '<span>'+d+(reservedDates[d]?' <span style="color:var(--rose);font-size:11px;">已被預約</span>':' <span style="color:var(--sage);font-size:11px;">可預約</span>')+'</span>'
        + '<button class="icon-btn" data-remove-date="'+d+'" title="取消開放">✕</button>'
        + '</div>';
    });
    html += '</div>';
    el.innerHTML = html;
    el.querySelectorAll('[data-remove-date]').forEach(function(btn){
      btn.addEventListener('click', function(){ openDatesRef.child(btn.getAttribute('data-remove-date')).remove(); });
    });
  }

  document.getElementById('addOpenDate').addEventListener('click', function(){
    if(!isConfigured) return;
    var date = document.getElementById('newOpenDate').value.trim();
    if(!date) return;
    openDatesRef.child(date).set(true);
    document.getElementById('newOpenDate').value = '';
  });

  // ---------- reservations list ----------
  function renderAdminReservations(){
    var el = document.getElementById('adminReservationList');
    var keys = Object.keys(reservations);
    if(keys.length===0){ el.innerHTML = '尚無預約'; return; }
    var arr = keys.map(function(id){ var r=reservations[id]; r.id=id; return r; });
    arr.sort(function(a,b){ return a.date.localeCompare(b.date); });
    var html = '<div style="display:flex;flex-direction:column;gap:8px;">';
    arr.forEach(function(r){
      var songs = (r.songs||[]).map(function(s){ return s.title; }).join('、') || '（未選歌曲）';
      html += '<div style="border-bottom:1px solid var(--line);padding-bottom:8px;">'
        + '<div style="display:flex;justify-content:space-between;align-items:center;">'
        + '<span>'+r.date+' · '+escapeHtml(r.name)+' · '+r.size+'位'+(r.maid?' · 指名：'+escapeHtml(r.maid):'')+(r.note?' · '+escapeHtml(r.note):'')+'</span>'
        + '<button class="icon-btn" data-cancel-reservation="'+r.id+'" title="取消預約">✕</button>'
        + '</div>'
        + '<div style="font-size:11.5px;color:var(--parchment-dim);margin-top:3px;">點歌：'+escapeHtml(songs)+'</div>'
        + '</div>';
    });
    html += '</div>';
    el.innerHTML = html;
    el.querySelectorAll('[data-cancel-reservation]').forEach(function(btn){
      btn.addEventListener('click', function(){ reservationsRef.child(btn.getAttribute('data-cancel-reservation')).remove(); });
    });
  }

})();
