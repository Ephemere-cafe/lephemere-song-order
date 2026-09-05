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

  var db, storage, functionsClient, retryDiscordNotificationFn;
  var ordersRef, openDatesRef, reservationsRef, rulesRef, staffRosterRef, todayStaffRef, staffSchedulesRef, menuRef, nextOrderNumberRef, operationStatusRef, dailyReportsRef, adminUsersRef, adminOwnerUidRef, siteMusicRef;
  var visitsRef, visitQueueCounterRef, staffPresenceRef, assignmentHistoryRef;
  var recentOrdersQuery, ordersQuery, todayVisitsQuery, currentVisitsBusinessDate = '';

  var orders = {};
  var visits = {};
  var staffPresence = {};
  var assignmentHistory = {};
  var currentOrderFilter = 'active';
  var currentSpecialFilter = 'all';
  var orderSearchTerm = '';
  var receptionSearchTerm = '';
  var receptionAttentionOnly = false;
  var knownOrderIds = {};
  var ordersSnapshotReady = false;
  var allOrderHistoryLoaded = false;
  var soundEnabled = false;
  var soundPreset = 'chime';
  var soundVolume = 0.7;
  var customSoundData = '';
  var customSoundName = '';
  var orderAudioContext = null;
  var currentStaffId = '';
  var transferModalVisitId = '';
  var transferModalTargetId = '';
  var transferInProgress = false;
  var knownAssignmentHistoryIds = {};
  var assignmentHistoryReady = false;
  var adminSessionId = 'admin-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,8);
  var isDatabaseConnected = false;
  var operationStatus = { isOpen:false, businessDate:'' };
  var currentAuthUser = null;
  var currentAccessRole = 'orders';
  var adminOwnerUid = '';
  var adminUsers = {};
  var accessListListening = false;
  var siteMusicSettings = { enabled:false, title:'曇時店歌', url:'', volume:0.3 };
  var siteMusicPreviewAudio = null;
  var payrollState = {
    businessDate:'',
    initialized:false,
    reservationRevenue:0,
    commonAdjustment:0,
    commonOverride:'',
    selectedStaff:{},
    specialAdjustments:{},
    specialOverrides:{},
    slipStaffId:''
  };
  var payrollResults = [];
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
  var removeEditingMenuImage = false;
  var menuImagePreviewUrls = [];

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
  var DEFAULT_VISIT_CALL_TEMPLATE='/t {角色名}@{伺服器} 主人您好，候位號碼 {候位號碼} 已輪到您，請留意女僕前來接待。';

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
  function todayKey(){
    var d = new Date();
    return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
  }
  function currentBusinessDate(){
    var value = operationStatus && operationStatus.businessDate;
    return isScheduleDate(value) ? value : todayKey();
  }
  function businessDateText(){
    return currentBusinessDate().replace(/-/g,' / ');
  }
  var SCHEDULE_DATE_STORAGE_KEY = 'lephemereAdminScheduleDate';
  function isScheduleDate(value){ return /^\d{4}-\d{2}-\d{2}$/.test(String(value || '')); }
  function rememberedScheduleDate(){
    try{
      var value = localStorage.getItem(SCHEDULE_DATE_STORAGE_KEY) || '';
      return isScheduleDate(value) ? value : '';
    }catch(err){ return ''; }
  }
  function rememberScheduleDate(value){
    if(!isScheduleDate(value)) return;
    try{ localStorage.setItem(SCHEDULE_DATE_STORAGE_KEY, value); }catch(err){}
  }

  function setSystemPill(id, text, state){
    var el = document.getElementById(id);
    if(!el) return;
    el.textContent = text;
    el.className = 'system-pill '+state;
  }

  function renderSystemStatus(){
    setSystemPill('systemDatabase', isDatabaseConnected ? '訂單連線正常' : '訂單連線中斷', isDatabaseConnected ? 'ok' : 'bad');
    setSystemPill('systemOrdering', operationStatus.isOpen===false ? businessDateText()+' 已打烊' : businessDateText()+' 點餐開放中', operationStatus.isOpen===false ? 'warn' : 'ok');
    setSystemPill('systemDiscord', 'Discord 雲端通知', 'ok');
    setSystemPill('systemSound', soundEnabled ? '提示音開啟' : '提示音關閉', soundEnabled ? 'ok' : 'warn');
    var toggle = document.getElementById('operationToggle');
    if(toggle){
      toggle.textContent = operationStatus.isOpen===false ? '開始營業' : '結束營業並產生日報';
      toggle.className = operationStatus.isOpen===false ? 'btn primary small' : 'btn primary small';
    }
    var dateInput = document.getElementById('businessDateInput');
    if(dateInput){
      if(document.activeElement!==dateInput || operationStatus.isOpen!==false) dateInput.value = currentBusinessDate();
      dateInput.disabled = operationStatus.isOpen!==false;
    }
    var title = document.getElementById('businessSessionTitle');
    var help = document.getElementById('businessSessionHelp');
    if(title) title.textContent = operationStatus.isOpen===false ? businessDateText()+' 已打烊' : businessDateText()+' 營業中';
    if(help) help.textContent = operationStatus.isOpen===false
      ? '可調整上方日期後按「開始營業」；開店後日期會鎖定，直到本場打烊。'
      : '目前場次已鎖定，不會在午夜自動換日；請於本場結束後再打烊。';
    renderTodayOverview();
  }

  function tickClock(){
    var d=new Date();
    document.getElementById('connText').textContent=String(d.getHours()).padStart(2,'0')+':'+String(d.getMinutes()).padStart(2,'0');
  }
  tickClock();
  setInterval(tickClock,15000);
  setInterval(function(){ updateElapsedLabels(); renderStats(); renderReception(); renderTodayOverview(); },30000);
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

  function playTransferSound(){
    if(!soundEnabled) return;
    var previousPreset=soundPreset;
    soundPreset='soft';
    playBuiltInSound();
    soundPreset=previousPreset;
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
    document.getElementById('todayTab').style.display = 'none';
    document.getElementById('receptionTab').style.display = 'none';
    document.getElementById('ordersTab').style.display = 'block';
    document.getElementById('specialServicesTab').style.display = 'none';
    document.getElementById('operationsTab').style.display = 'none';
    document.getElementById('menuTab').style.display = 'none';
    document.getElementById('staffTab').style.display = 'none';
    document.getElementById('reservationsTab').style.display = 'none';
    document.getElementById('payrollTab').style.display = 'none';
    document.getElementById('siteSettingsTab').style.display = 'none';
    document.getElementById('accessTab').style.display = 'none';
  }

  function showReceptionTab(){
    document.querySelectorAll('.main-tab').forEach(function(t){ t.classList.remove('active'); });
    var tab = document.querySelector('.main-tab[data-main="reception"]');
    if(tab) tab.classList.add('active');
    document.getElementById('todayTab').style.display = 'none';
    document.getElementById('receptionTab').style.display = 'block';
    document.getElementById('ordersTab').style.display = 'none';
    document.getElementById('specialServicesTab').style.display = 'none';
    document.getElementById('operationsTab').style.display = 'none';
    document.getElementById('menuTab').style.display = 'none';
    document.getElementById('staffTab').style.display = 'none';
    document.getElementById('reservationsTab').style.display = 'none';
    document.getElementById('payrollTab').style.display = 'none';
    document.getElementById('siteSettingsTab').style.display = 'none';
    document.getElementById('accessTab').style.display = 'none';
  }

  function showTodayTab(){
    if(!isManager()){ showReceptionTab(); return; }
    document.querySelectorAll('.main-tab').forEach(function(t){ t.classList.remove('active'); });
    var tab = document.querySelector('.main-tab[data-main="today"]');
    if(tab) tab.classList.add('active');
    document.getElementById('todayTab').style.display = 'block';
    document.getElementById('receptionTab').style.display = 'none';
    document.getElementById('ordersTab').style.display = 'none';
    document.getElementById('specialServicesTab').style.display = 'none';
    document.getElementById('operationsTab').style.display = 'none';
    document.getElementById('menuTab').style.display = 'none';
    document.getElementById('staffTab').style.display = 'none';
    document.getElementById('reservationsTab').style.display = 'none';
    document.getElementById('payrollTab').style.display = 'none';
    document.getElementById('siteSettingsTab').style.display = 'none';
    document.getElementById('accessTab').style.display = 'none';
    renderTodayOverview();
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
    else if(document.querySelector('.main-tab.active[data-main="today"]')) showTodayTab();
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
    functionsClient = firebase.app().functions('asia-southeast1');
    retryDiscordNotificationFn = functionsClient.httpsCallable('retryDiscordNotification');
    ordersRef = db.ref('lephemere/orders');
    nextOrderNumberRef = db.ref('lephemere/nextOrderNumber');
    openDatesRef = db.ref('lephemere/openDates');
    reservationsRef = db.ref('lephemere/reservations');
    rulesRef = db.ref('lephemere/rules');
    staffRosterRef = db.ref('lephemere/staffRoster');
    todayStaffRef = db.ref('lephemere/todayStaff');
    staffSchedulesRef = db.ref('lephemere/staffSchedules');
    menuRef = db.ref('lephemere/menu');
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
    todayVisitsQuery = null;

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
  function watchBusinessVisits(date){
    if(!visitsRef || !isScheduleDate(date) || currentVisitsBusinessDate===date) return;
    if(todayVisitsQuery) todayVisitsQuery.off();
    currentVisitsBusinessDate = date;
    todayVisitsQuery = visitsRef.orderByChild('businessDate').equalTo(date);
    todayVisitsQuery.on('value', function(snap){
      visits = snap.val() || {};
      renderReception();
    }, function(err){
      console.error('Business visit sync failed', err);
      visits = {};
      renderReception();
    });
  }

  function setOrderHistoryStatus(text, state){
    var el = document.getElementById('orderHistoryStatus');
    if(!el) return;
    el.textContent = text;
    el.classList.toggle('is-loading', state==='loading');
    el.classList.toggle('is-error', state==='error');
  }

  function handleOrdersSnapshot(snap){
    var nextOrders = snap.val() || {};
    if(ordersSnapshotReady){
      var newOrderIds = Object.keys(nextOrders).filter(function(id){
        return !knownOrderIds[id] && nextOrders[id].status==='pending';
      });
      if(newOrderIds.length) playOrderSound();
    }
    knownOrderIds = {};
    Object.keys(nextOrders).forEach(function(id){ knownOrderIds[id] = true; });
    ordersSnapshotReady = true;
    orders = nextOrders;
    renderStats();
    renderOrders();
    renderReception();
    renderPayroll();
  }

  function watchOrders(query, mode){
    if(ordersQuery) ordersQuery.off();
    ordersQuery = query;
    ordersSnapshotReady = false;
    ordersQuery.on('value', function(snap){
      handleOrdersSnapshot(snap);
      if(mode==='all'){
        allOrderHistoryLoaded = true;
        setOrderHistoryStatus('已載入全部歷史訂單', 'ready');
      }else{
        setOrderHistoryStatus('目前載入近 30 天；點「歷史訂單」可查看更早紀錄', 'ready');
      }
    }, function(err){
      console.error('Order sync failed', err);
      if(mode==='all') allOrderHistoryLoaded = false;
      setOrderHistoryStatus('訂單載入失敗，請確認登入權限與連線', 'error');
    });
  }

  function loadAllOrderHistory(){
    if(!isManager()) return;
    setOrderHistoryStatus('正在載入全部歷史訂單…', 'loading');
    watchOrders(ordersRef.orderByChild('createdAt'), 'all');
  }

  function attachData(){
    if(attached) return;
    attached = true;

    watchOrders(recentOrdersQuery, 'recent');

    watchBusinessVisits(currentBusinessDate());

    staffPresenceRef.on('value', function(snap){
      staffPresence = snap.val() || {};
      renderReception();
    });

    assignmentHistoryRef.limitToLast(30).on('value',function(snap){
      var nextHistory=snap.val()||{};
      Object.keys(nextHistory).forEach(function(id){
        var row=nextHistory[id]||{};
        if(assignmentHistoryReady && !knownAssignmentHistoryIds[id] && row.action==='transfer' && row.toStaffId===currentStaffId && row.bySessionId!==adminSessionId){
          var guest=row.queueNumber||((visits[row.visitId]||{}).queueNumber)||'這組主人';
          var operator=row.byStaffName||'其他店員';
          showCopyToast(guest+' 已由 '+operator+' 轉交給你',true);
          playTransferSound();
        }
        knownAssignmentHistoryIds[id]=true;
      });
      assignmentHistoryReady=true;
      assignmentHistory=nextHistory;
      renderAssignmentHistory();
      renderTodayOverview();
    });

    operationStatusRef.on('value', function(snap){
      operationStatus = snap.val() || { isOpen:false, businessDate:todayKey() };
      if(!isScheduleDate(operationStatus.businessDate)){
        operationStatus.businessDate = todayKey();
        if(operationStatus.isOpen===true && isManager()){
          operationStatusRef.update({businessDate:operationStatus.businessDate, sessionId:operationStatus.sessionId||('session-'+operationStatus.businessDate+'-'+Date.now()), updatedAt:Date.now()});
        }
      }
      watchBusinessVisits(currentBusinessDate());
      renderSystemStatus();
      renderCurrentStaffSelect();
      renderReception();
      renderOrders();
      renderStats();
      renderPayroll();
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
      renderServiceStaffOptions();
      renderCurrentStaffSelect();
      renderReceptionStaffSelect();
      renderReception();
      renderOrders();
      renderPayroll();
    });

    todayStaffRef.on('value', function(snap){
      todayStaff = snap.val() || {};
      var dateInput = document.getElementById('onDutyDate');
      if(dateInput && !dateInput.value){
        dateInput.value = rememberedScheduleDate() || currentBusinessDate();
        rememberScheduleDate(dateInput.value);
      }
      renderStaffCheckList();
    });

    staffSchedulesRef.on('value', function(snap){
      legacyStaffSchedules = snap.val() || {};
      rebuildStaffSchedules();
      renderStaffCheckList();
      renderCurrentStaffSelect();
      renderReceptionStaffSelect();
      renderReception();
      renderOrders();
      renderPayroll();
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
      renderPayroll();
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
    document.getElementById('todayTab').style.display = target==='today' ? 'block' : 'none';
    document.getElementById('receptionTab').style.display = target==='reception' ? 'block' : 'none';
    document.getElementById('ordersTab').style.display = target==='orders' ? 'block' : 'none';
    document.getElementById('specialServicesTab').style.display = target==='special' ? 'block' : 'none';
    document.getElementById('operationsTab').style.display = target==='operations' ? 'block' : 'none';
    document.getElementById('menuTab').style.display = target==='menu' ? 'block' : 'none';
    document.getElementById('staffTab').style.display = target==='staff' ? 'block' : 'none';
    document.getElementById('reservationsTab').style.display = target==='reservations' ? 'block' : 'none';
    document.getElementById('payrollTab').style.display = target==='payroll' ? 'block' : 'none';
    document.getElementById('siteSettingsTab').style.display = target==='site' ? 'block' : 'none';
    document.getElementById('accessTab').style.display = target==='access' ? 'block' : 'none';
    if(target==='payroll') renderPayroll();
    if(target==='today') renderTodayOverview();
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
    if(currentOrderFilter==='history' && !allOrderHistoryLoaded){
      loadAllOrderHistory();
      return;
    }
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

  function scheduleForDate(date){
    var schedule = staffSchedules && staffSchedules[date];
    if(schedule && Array.isArray(schedule.staffIds)) return schedule;
    if(todayStaff && todayStaff.date===date && Array.isArray(todayStaff.staffIds)) return todayStaff;
    return null;
  }

  function dutyIdsForDate(date){
    var schedule = scheduleForDate(date);
    return schedule ? schedule.staffIds.filter(function(id){ return !!staffRoster[id]; }) : [];
  }

  function activeDutyDate(){
    return currentBusinessDate();
  }

  function activeDutyIds(){ return dutyIdsForDate(activeDutyDate()); }

  function dutyDateLabel(date){
    var parts = String(date || '').split('-');
    if(parts.length!==3) return String(date || '目前日期');
    return Number(parts[1])+'/'+Number(parts[2]);
  }

  function renderCurrentStaffSelect(){
    var select = document.getElementById('globalStaffSelect');
    if(!select) return;
    var dutyDate = activeDutyDate();
    var activeSchedule = scheduleForDate(dutyDate);
    var onDutyIds = activeDutyIds();
    var ids = activeSchedule ? onDutyIds.slice() : Object.keys(staffRoster);
    ids.sort(function(a,b){
      return String(staffRoster[a].name||'').localeCompare(String(staffRoster[b].name||''), 'zh-Hant');
    });
    if(activeSchedule && currentStaffId && onDutyIds.indexOf(currentStaffId)===-1){
      currentStaffId = '';
      try{ localStorage.removeItem('lephemereCurrentStaffId'); }catch(e){}
    }
    var dateLabel = dutyDateLabel(dutyDate);
    var html = '<option value="">'+(activeSchedule && !ids.length ? dateLabel+' 尚未安排值班店員' : '請先選擇店員')+'</option>';
    ids.forEach(function(id){
      var duty = activeSchedule ? '（'+dateLabel+' 值班）' : '';
      html += '<option value="'+id+'" '+(id===currentStaffId?'selected':'')+'>'+escapeHtml(staffRoster[id].name||'未命名店員')+duty+'</option>';
    });
    select.innerHTML = html;
    var hint = document.getElementById('globalDutyDateHint');
    if(hint) hint.textContent = '目前營業場次 '+dutyDate.replace(/-/g,' / ')+'；此身分會套用接待、訂單、特殊服務與交接紀錄。';
    var name=currentStaffId&&staffRoster[currentStaffId]?staffRoster[currentStaffId].name||'未命名女僕':'尚未選擇';
    document.getElementById('receptionStaffDisplay').textContent=name;
    document.getElementById('orderStaffDisplay').textContent=name;
    var operatorBadge=document.getElementById('operatorLiveBadge');
    if(operatorBadge){operatorBadge.innerHTML='<i></i> '+escapeHtml(currentStaffId?'本機操作者：'+name:'尚未選擇操作者');operatorBadge.classList.toggle('ready',!!currentStaffId);}
    renderReceptionCallTemplate();
  }

  function renderReceptionCallTemplate(){
    var editor=document.getElementById('receptionCallTemplate');
    var button=document.getElementById('saveReceptionCallTemplate');
    var status=document.getElementById('receptionCallTemplateStatus');
    if(!editor||!button) return;
    var staff=currentStaffId&&staffRoster[currentStaffId];
    editor.disabled=!staff;
    button.disabled=!staff;
    editor.value=staff?String(staff.callTemplate||DEFAULT_VISIT_CALL_TEMPLATE):'';
    editor.placeholder=staff?'輸入自己的接待文字':'請先在上方選擇目前操作女僕';
    if(status) status.textContent=staff?'目前編輯：'+(staff.name||'未命名女僕'):'請先選擇操作女僕';
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
    var operatorBadge=document.getElementById('operatorLiveBadge');
    if(operatorBadge){operatorBadge.innerHTML='<i></i> '+escapeHtml(currentStaffId?'本機操作者：'+name:'尚未選擇操作者');operatorBadge.classList.toggle('ready',!!currentStaffId);}
    renderReceptionCallTemplate();
    renderOrders();
    renderReception();
  }

  function renderReceptionStaffSelect(){
    renderCurrentStaffSelect();
  }

  function visitRows(statuses){
    return Object.keys(visits).map(function(id){ return Object.assign({id:id},visits[id]||{}); }).filter(function(v){
      return v.businessDate===currentBusinessDate() && statuses.indexOf(v.status)>-1;
    }).sort(function(a,b){ return Number(a.createdAt||0)-Number(b.createdAt||0); });
  }

  function waitMinutes(ts){ return Math.max(0,Math.floor((Date.now()-Number(ts||Date.now()))/60000)); }

  function transferOptions(currentId){
    var schedule=scheduleForDate(activeDutyDate());
    var duty=activeDutyIds();
    var ids=(schedule?duty:Object.keys(staffRoster)).filter(function(id){ return staffRoster[id] && id!==currentId; });
    return '<option value="">轉交給…</option>'+ids.map(function(id){ return '<option value="'+escapeAttr(id)+'">'+escapeHtml(staffRoster[id].name||'未命名女僕')+'</option>'; }).join('');
  }

  function ordersForVisit(visitId){
    return Object.keys(orders).map(function(id){ return Object.assign({id:id},orders[id]||{}); }).filter(function(o){ return o.visitId===visitId; }).sort(function(a,b){ return Number(b.createdAt||0)-Number(a.createdAt||0); });
  }

  function specialAssignmentPlan(visitId){
    var missing=[];
    var jobs=[];
    ordersForVisit(visitId).forEach(function(order){
      collectSpecialTasks(order.items||[]).forEach(function(task){
        if(task.type!=='polaroid'&&task.type!=='lens') return;
        if(specialTaskState(order,task)==='completed') return;
        var assignment=specialTaskAssignment(order,task);
        if(!assignment.id){missing.push((task.item&&task.item.name)||task.label||'特殊服務');return;}
        var record=specialTaskRecord(order,task);
        if(record.assignedStaffId===assignment.id) return;
        jobs.push(ordersRef.child(order.id).child('specialServices').child(task.key).update({
          assignedStaffId:assignment.id,
          assignedStaffName:assignment.name,
          assignedAt:Date.now(),
          updatedAt:Date.now()
        }));
      });
    });
    return {missing:missing,jobs:jobs};
  }

  function tryCompleteSpecialVisit(visitId){
    var visit=visits[visitId];
    if(!visitId||!visit||visit.status!=='special_service') return Promise.resolve(false);
    var linked=ordersForVisit(visitId).filter(function(order){return order.status!=='cancelled';});
    var ready=linked.length>0&&linked.every(function(order){
      if(order.status!=='completed') return false;
      return collectSpecialTasks(order.items||[]).every(function(task){return specialTaskState(order,task)==='completed';});
    });
    if(!ready) return Promise.resolve(false);
    return visitsRef.child(visitId).update({status:'completed',completedAt:Date.now(),specialServicesCompletedAt:Date.now(),updatedAt:Date.now()}).then(function(){return true;});
  }

  function itemAssignmentSummary(item){
    if(!item || !Array.isArray(item.assignments) || !item.assignments.length) return '';
    var counts={};
    item.assignments.forEach(function(name){
      var label=String(name||'尚未指定').trim()||'尚未指定';
      counts[label]=(counts[label]||0)+1;
    });
    return Object.keys(counts).map(function(name){ return name+(counts[name]>1?' × '+counts[name]:''); }).join('、');
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
      var items=(o.items||[]).map(function(item){
        var assigned=itemAssignmentSummary(item);
        return escapeHtml(item.name||'品項')+' × '+Number(item.qty||1)+(assigned?'〔'+escapeHtml(assigned)+'〕':'');
      }).join('、');
      var overdue=o.status==='pending' && waitMinutes(o.createdAt)>=10;
      var specialText=collectSpecialTasks(o.items||[]).map(function(task){
        var state=specialTaskState(o,task);
        return task.label+'：'+(state==='completed'?'完成':((state==='preparing'||state==='in_progress')?'進行中':'待處理'));
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
      if(o.status==='pending' && orderBelongsToBusiness(o) && waitMinutes(o.createdAt)>=10) alerts.push({title:'訂單 #'+(o.orderNumber||'—')+' '+(o.name||''),detail:'已等待處理 '+waitMinutes(o.createdAt)+' 分鐘'});
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
    if(Array.isArray(v.partyMembers) && v.partyMembers.length>1){
      tags+='<span class="visit-tag">成員｜'+escapeHtml(v.partyMembers.join('・'))+'</span>';
    }
    var actions='';
    if(isMine){
      if(v.status==='assigned') actions+='<button class="btn primary small" data-start-visit="'+v.id+'">開始接待</button>';
      actions+='<button class="btn ghost small" data-copy-call="'+v.id+'">複製接待文字</button>';
      var hasPendingSpecial=linkedOrders.some(function(order){return collectSpecialTasks(order.items||[]).some(function(task){return specialTaskState(order,task)!=='completed';});});
      actions+='<button class="btn ghost small" data-complete-visit="'+v.id+'">'+(hasPendingSpecial?'桌邊接待完成':'結束接待')+'</button>';
      actions+='<button class="btn transfer small" data-open-transfer="'+v.id+'">更換主要接待</button>';
    }else if(v.status==='waiting'){
      actions+='<button class="btn primary small" data-copy-call="'+v.id+'">複製叫號</button>';
      actions+='<button class="btn ghost small" data-no-show-visit="'+v.id+'">叫號未到</button>';
    }else{
      actions+='<button class="btn ghost small" data-copy-call="'+v.id+'">複製接待文字</button>';
      actions+='<button class="btn transfer small" data-open-transfer="'+v.id+'">更換主要接待</button>';
    }
    var noteAction=isMine?'<div class="guest-note-actions"><button class="btn ghost small" data-edit-visit-note="'+v.id+'">編輯備註</button></div>':'';
    var overview=v.status!=='waiting'?'<div class="guest-overview"><div class="guest-overview-head"><span>訂單與服務</span><span>'+linkedOrders.length+' 筆訂單</span></div><div class="guest-order-list">'+guestOrdersHtml(v)+'</div><details class="guest-note"><summary>店內交接備註｜'+escapeHtml(v.internalNote||'尚未填寫')+'</summary>'+noteAction+'</details></div>':'';
    return '<article class="visit-card '+(index===0&&v.status==='waiting'?'next ':'')+(isMine?'mine ':'')+urgency+'"><div class="visit-card-top"><div><div class="visit-number">'+escapeHtml(v.queueNumber||'—')+'</div><div class="visit-name">'+escapeHtml(v.characterName||'未填角色名')+(v.world?' @ '+escapeHtml(v.world):'')+'</div></div><span class="visit-wait">'+(v.status==='waiting'?'等候 '+waitMinutes(v.createdAt)+' 分':(v.status==='assigned'?'待招呼 '+waitMinutes(v.assignedAt||v.updatedAt)+' 分':'接待 '+waitMinutes(v.serviceStartedAt||v.updatedAt)+' 分'))+'</span></div><div class="visit-owner-line">'+(v.status==='waiting'?'<span>尚未指派</span>':'<span class="visit-owner-label">主要接待</span><strong>'+escapeHtml(v.assignedStaffName||'未命名女僕')+'</strong>')+(isMine?'<span class="visit-owner-badge">我的接待</span>':'')+'</div><div class="visit-meta">'+(v.status==='waiting'?'依序候位中':(v.status==='serving'?'接待進行中':'等待開始接待'))+'</div><div class="visit-tags">'+tags+'</div>'+(actions?'<div class="visit-actions">'+actions+'</div>':'')+overview+'</article>';
  }

  function setNavCount(id,count){
    var el=document.getElementById(id);
    if(!el) return;
    el.textContent=String(count||0);
    el.hidden=!count;
  }

  function activeOrdersForToday(){
    return Object.keys(orders).map(function(id){return Object.assign({id:id},orders[id]||{});}).filter(function(order){
      return orderBelongsToBusiness(order) && (order.status==='pending'||order.status==='preparing'||order.status==='served');
    });
  }

  function activeReservationsForDate(date){
    return Object.keys(reservations).map(function(id){return Object.assign({id:id},reservations[id]||{});}).filter(function(reservation){
      return isActiveReservation(reservation) && reservation.date===date;
    });
  }

  function pendingSpecialCount(){
    var count=0;
    activeOrdersForToday().forEach(function(order){
      collectSpecialTasks(order.items||[]).forEach(function(task){if(specialTaskState(order,task)!=='completed') count++;});
    });
    return count;
  }

  function todayAttentionData(){
    var entries=[];
    visitRows(['waiting']).forEach(function(visit){
      var minutes=waitMinutes(visit.createdAt);
      if(minutes>=10) entries.push({weight:minutes>=20?0:1,kind:'候位 '+minutes+' 分',title:(visit.queueNumber||'候位')+'・'+(visit.characterName||'未填角色名'),detail:'請確認主人是否仍在店內',target:'reception',action:'前往接待'});
    });
    activeOrdersForToday().forEach(function(order){
      if(order.status!=='pending') return;
      var minutes=waitMinutes(order.createdAt);
      if(minutes>=10) entries.push({weight:minutes>=20?0:1,kind:'訂單待接',title:'#'+(order.orderNumber||'—')+'・'+(order.name||'未填主人名'),detail:'已等待處理 '+minutes+' 分鐘',target:'orders',action:'查看訂單'});
    });
    activeReservationsForDate(currentBusinessDate()).forEach(function(reservation){
      entries.push({weight:2,kind:'本場預約',title:(reservation.name||'未填姓名')+'・'+Number(reservation.size||1)+' 位',detail:reservation.maid?'指定成員：'+reservation.maid:'未指定接待成員',target:'reservations',action:'查看預約'});
    });
    return entries.sort(function(a,b){return a.weight-b.weight;}).slice(0,5);
  }

  function renderTodayOverview(){
    var todayTab=document.getElementById('todayTab');
    if(!todayTab) return;
    var date=currentBusinessDate();
    var waiting=visitRows(['waiting']);
    var activeOrders=activeOrdersForToday();
    var reservationsToday=activeReservationsForDate(date);
    var schedule=scheduleForDate(activeDutyDate());
    var dutyIds=activeDutyIds().filter(function(id){return !!staffRoster[id];});
    var available=dutyIds.filter(function(id){return (staffPresence[id]||{}).status==='available';}).length;
    var specialPending=pendingSpecialCount();
    var attentions=todayAttentionData();

    document.getElementById('todayOverviewDate').textContent=orderDateLabel(date)+'・即時整理既有營業資料';
    var operationEl=document.getElementById('todayOperationState');
    operationEl.innerHTML='<i></i> '+(operationStatus.isOpen===false?'本場已打烊':'本場營業中');
    operationEl.className='today-operation-state '+(operationStatus.isOpen===false?'is-closed':'is-open');
    document.getElementById('todayWaitingCount').textContent=waiting.length;
    document.getElementById('todayActiveOrderCount').textContent=activeOrders.length;
    document.getElementById('todayReservationCount').textContent=reservationsToday.length;
    document.getElementById('todayAvailableCount').textContent=available;

    setNavCount('navReceptionCount',waiting.length);
    setNavCount('navOrderCount',activeOrders.filter(function(order){return order.status==='pending';}).length);
    setNavCount('navSpecialCount',specialPending);
    setNavCount('navReservationCount',reservationsToday.length);

    document.getElementById('todayAttentionCount').textContent=attentions.length+' 項';
    document.getElementById('todayAttentionList').innerHTML=attentions.length?attentions.map(function(entry){
      return '<div class="today-attention-item"><span class="today-attention-kind">'+escapeHtml(entry.kind)+'</span><div class="today-attention-copy"><strong>'+escapeHtml(entry.title)+'</strong><span>'+escapeHtml(entry.detail)+'</span></div><button type="button" class="btn ghost small" data-dashboard-target="'+escapeAttr(entry.target)+'">'+escapeHtml(entry.action)+'</button></div>';
    }).join(''):'<div class="today-empty">目前沒有需要優先處理的項目。</div>';

    var presenceLabels={available:'可接待',serving:'接待中',photo:'拍照中',away:'暫離'};
    document.getElementById('todayDutyCount').textContent=dutyIds.length+' 位成員';
    document.getElementById('todayDutyList').innerHTML=dutyIds.length?dutyIds.map(function(id){
      var staff=staffRoster[id]||{};
      var presence=staffPresence[id]||{};
      var stale=presence.lastSeenAt&&Date.now()-Number(presence.lastSeenAt)>300000;
      var state=stale?'狀態可能已過期':(presenceLabels[presence.status]||'尚未回報');
      return '<div class="today-duty-row"><span class="today-duty-mark">'+escapeHtml(String(staff.name||'?').slice(0,1))+'</span><div class="today-duty-copy"><strong>'+escapeHtml(staff.name||'未命名成員')+'</strong><span>'+(id===currentStaffId?'本機操作者':'本場值班')+'</span></div><span class="today-duty-state">'+escapeHtml(state)+'</span></div>';
    }).join(''):'<div class="today-empty">'+(schedule?'本場尚未安排值班成員。':'本場值班名單尚未公布。')+'</div>';

    var checks=[
      {done:!!schedule&&dutyIds.length>0,label:'本場值班名單已公布'},
      {done:Object.keys(menuItems).length>0,label:'菜單與供應資料已載入'},
      {done:isDatabaseConnected,label:'Firebase 即時資料已連線'},
      {done:operationStatus.isOpen!==false,label:'本場點餐已開放'}
    ];
    var doneCount=checks.filter(function(check){return check.done;}).length;
    document.getElementById('todayCheckCount').textContent=doneCount+' / '+checks.length;
    document.getElementById('todayCheckList').innerHTML=checks.map(function(check){return '<div class="today-check-row '+(check.done?'is-done':'')+'"><i>'+(check.done?'✓':'')+'</i><span>'+escapeHtml(check.label)+'</span></div>';}).join('');

    var history=Object.keys(assignmentHistory).map(function(id){return assignmentHistory[id]||{};}).sort(function(a,b){return Number(b.createdAt||0)-Number(a.createdAt||0);})[0];
    var recent=document.getElementById('todayRecentAction');
    var recentText='尚無接待操作紀錄';
    if(history){
      var labels={claim:'認領接待',transfer:'轉交接待','order-page-transfer':'由訂單頁轉交','reset-daily-queue':'重置本場候位','reset-daily-orders':'重置本場訂單'};
      recentText=fmtTime(history.createdAt)+'・'+(history.byStaffName||'管理人員')+' '+(labels[history.action]||history.action||'更新接待');
    }
    recent.querySelector('strong').textContent=recentText;
  }

  function renderReception(){
    var waiting=visitRows(['waiting']);
    var visibleWaiting=waiting.filter(function(visit){
      var search=[visit.queueNumber,visit.characterName,visit.world,Array.isArray(visit.partyMembers)?visit.partyMembers.join(' '):''].join(' ').toLowerCase();
      var matchesSearch=!receptionSearchTerm||search.indexOf(receptionSearchTerm)>-1;
      var matchesAttention=!receptionAttentionOnly||!!visitUrgency(visit,ordersForVisit(visit.id));
      return matchesSearch&&matchesAttention;
    });
    var active=visitRows(['assigned','serving']);
    active.sort(function(a,b){
      var am=currentStaffId && a.assignedStaffId===currentStaffId?0:1, bm=currentStaffId && b.assignedStaffId===currentStaffId?0:1;
      return am!==bm?am-bm:Number(a.assignedAt||0)-Number(b.assignedAt||0);
    });
    var schedule=scheduleForDate(activeDutyDate());
    var duty=activeDutyIds();
    var ids=(schedule?duty:Object.keys(staffRoster)).filter(function(id){return staffRoster[id];});
    var available=ids.filter(function(id){return (staffPresence[id]||{}).status==='available';}).length;
    var alerts=receptionAlertsData(waiting,active);
    document.getElementById('visitWaitingCount').textContent=(receptionSearchTerm||receptionAttentionOnly)?visibleWaiting.length+' / '+waiting.length:waiting.length;
    var mine=currentStaffId?active.filter(function(v){return v.assignedStaffId===currentStaffId;}):[];
    var teammates=active.filter(function(v){return !currentStaffId||v.assignedStaffId!==currentStaffId;});
    document.getElementById('myVisitCount').textContent=mine.length;
    document.getElementById('teamVisitCount').textContent=teammates.length;
    document.getElementById('receptionWaitingMetric').textContent=waiting.length;
    document.getElementById('receptionActiveMetric').textContent=active.length;
    document.getElementById('receptionAvailableMetric').textContent=available;
    document.getElementById('receptionAlertMetric').textContent=alerts.length;
    document.getElementById('receptionAlertCount').textContent=alerts.length+' 項';
    document.getElementById('receptionAlerts').classList.toggle('visible',alerts.length>0);
    document.getElementById('receptionAlertList').innerHTML=alerts.map(function(a){return '<div class="reception-alert-item"><strong>'+escapeHtml(a.title)+'</strong><span>'+escapeHtml(a.detail)+'</span></div>';}).join('');
    document.getElementById('visitWaitingList').innerHTML=visibleWaiting.length?visibleWaiting.map(function(v,i){return visitCard(v,i,false);}).join(''):(waiting.length?'<div class="queue-empty">沒有符合搜尋或篩選條件的候位主人。</div>':'<div class="queue-empty">目前沒有人候位。<br>自由參觀的客人不會出現在這裡。</div>');
    document.getElementById('myVisitList').innerHTML=mine.length?mine.map(function(v,i){return visitCard(v,i,true);}).join(''):'<div class="queue-empty">你目前沒有接待中的主人。<br>有空時可接待下一組。</div>';
    document.getElementById('teamVisitList').innerHTML=teammates.length?teammates.map(function(v,i){return visitCard(v,i,false);}).join(''):'<div class="queue-empty">其他女僕目前沒有接待中的主人。</div>';
    var label={available:'可接待',serving:'接待中',photo:'拍照中',away:'暫離'};
    document.getElementById('staffPresenceCount').textContent=ids.length;
    document.getElementById('staffPresenceList').innerHTML=ids.length?ids.map(function(id){
      var presence=staffPresence[id]||{};
      var stale=presence.lastSeenAt && Date.now()-Number(presence.lastSeenAt)>300000;
      var state=stale?'stale':(presence.status||'away');
      var count=visitRows(['assigned','serving']).filter(function(v){return v.assignedStaffId===id;}).length;
      return '<div class="team-staff"><span>'+escapeHtml(staffRoster[id].name||'未命名女僕')+'</span><span class="team-state">'+(state==='stale'?'狀態可能已過期':(label[state]||'暫離'))+(count?'・'+count+' 組':'')+'</span></div>';
    }).join(''):'<div class="queue-empty">尚未設定 '+escapeHtml(dutyDateLabel(activeDutyDate()))+' 值班女僕</div>';
    document.querySelectorAll('[data-presence]').forEach(function(btn){ btn.classList.toggle('active',!!currentStaffId && ((staffPresence[currentStaffId]||{}).status===btn.getAttribute('data-presence'))); });
    document.getElementById('claimNextVisit').disabled=!currentStaffId;
    renderAssignmentHistory();
    renderTodayOverview();
  }

  function syncVisitOrdersAssignee(visitId,staffId,staffName){
    var jobs=[];
    Object.keys(orders).forEach(function(id){
      var o=orders[id]||{};
      if(o.visitId===visitId && o.status!=='completed' && o.status!=='cancelled') jobs.push(ordersRef.child(id).update({assignedStaffId:staffId,assignedStaffName:staffName,assignedAt:Date.now()}));
    });
    return Promise.all(jobs);
  }

  function presenceLabel(id){
    var labels={available:'可接待',serving:'接待中',photo:'拍照中',away:'暫離'};
    var presence=staffPresence[id]||{};
    var stale=presence.lastSeenAt && Date.now()-Number(presence.lastSeenAt)>300000;
    return stale?'狀態可能已過期':(labels[presence.status]||'暫離');
  }

  function transferStaffIds(){
    var schedule=scheduleForDate(activeDutyDate());
    var ids=(schedule?activeDutyIds():Object.keys(staffRoster)).filter(function(id){return staffRoster[id];});
    return ids.sort(function(a,b){return String((staffRoster[a]||{}).name||'').localeCompare(String((staffRoster[b]||{}).name||''),'zh-Hant');});
  }

  function renderTransferModal(){
    var visit=visits[transferModalVisitId];
    var overlay=document.getElementById('transferModalOverlay');
    if(!overlay || !visit){ closeTransferModal(); return; }
    document.getElementById('transferGuestSummary').innerHTML='<span>'+escapeHtml(visit.queueNumber||'—')+'</span><strong>'+escapeHtml(visit.characterName||'未填角色名')+'</strong><small>目前主要接待：'+escapeHtml(visit.assignedStaffName||'未指派')+'</small>';
    var ids=transferStaffIds();
    document.getElementById('transferRoster').innerHTML=ids.map(function(id){
      var staff=staffRoster[id]||{};
      var count=visitRows(['assigned','serving']).filter(function(v){return v.assignedStaffId===id;}).length;
      var current=id===visit.assignedStaffId;
      var selected=id===transferModalTargetId;
      return '<button type="button" class="transfer-person'+(current?' current':'')+(selected?' selected':'')+'" data-transfer-target="'+escapeAttr(id)+'" role="radio" aria-checked="'+(selected?'true':'false')+'" '+(current?'disabled':'')+'><span class="transfer-person-mark">'+escapeHtml(String(staff.name||'?').slice(0,1))+'</span><span><strong>'+escapeHtml(staff.name||'未命名女僕')+'</strong><small>'+escapeHtml(presenceLabel(id))+'・目前 '+count+' 組'+(current?'・現任接待':'')+'</small></span></button>';
    }).join('')||'<div class="queue-empty">目前沒有可選擇的值班人員</div>';
    var target=staffRoster[transferModalTargetId]||null;
    document.getElementById('transferModalStatus').textContent=target?'將立即轉交給 '+(target.name||'未命名女僕'):'請選擇新的主要接待';
    document.getElementById('transferModalConfirm').disabled=!target||transferInProgress;
  }

  function openTransferModal(visitId){
    if(!currentStaffId){ alert('請先選擇目前操作女僕，系統才能留下正確的交接紀錄。'); return; }
    var visit=visits[visitId];
    if(!visit || (visit.status!=='assigned'&&visit.status!=='serving')) return;
    transferModalVisitId=visitId; transferModalTargetId=''; transferInProgress=false;
    var overlay=document.getElementById('transferModalOverlay');
    overlay.hidden=false; document.body.classList.add('modal-open');
    renderTransferModal();
  }

  function closeTransferModal(){
    var overlay=document.getElementById('transferModalOverlay');
    if(overlay) overlay.hidden=true;
    document.body.classList.remove('modal-open');
    transferModalVisitId=''; transferModalTargetId=''; transferInProgress=false;
  }

  function transferVisit(visitId,targetId,action){
    var visit=visits[visitId], target=staffRoster[targetId], fromId=visit&&visit.assignedStaffId||'';
    if(!visit || !target || !fromId || fromId===targetId) return Promise.reject(new Error('轉交資料已變更，請重新選擇。'));
    var now=Date.now(), targetName=target.name||'未命名女僕', operator=staffRoster[currentStaffId]||{};
    var historyKey=assignmentHistoryRef.push().key, updates={};
    updates['lephemere/visits/'+visitId+'/assignedStaffId']=targetId;
    updates['lephemere/visits/'+visitId+'/assignedStaffName']=targetName;
    updates['lephemere/visits/'+visitId+'/transferredAt']=now;
    updates['lephemere/visits/'+visitId+'/updatedAt']=now;
    updates['lephemere/visits/'+visitId+'/lastTransferFromStaffId']=fromId;
    Object.keys(orders).forEach(function(id){
      var order=orders[id]||{};
      if(order.visitId!==visitId || order.status==='completed' || order.status==='cancelled') return;
      updates['lephemere/orders/'+id+'/assignedStaffId']=targetId;
      updates['lephemere/orders/'+id+'/assignedStaffName']=targetName;
      updates['lephemere/orders/'+id+'/assignedAt']=now;
    });
    var targetStatus=(staffPresence[targetId]||{}).status;
    if(!targetStatus || targetStatus==='available' || targetStatus==='serving'){
      updates['lephemere/staffPresence/'+targetId+'/status']='serving';
      updates['lephemere/staffPresence/'+targetId+'/updatedAt']=now;
    }
    var sourceHasOther=visitRows(['assigned','serving']).some(function(row){return row.id!==visitId&&row.assignedStaffId===fromId;});
    if(!sourceHasOther && (staffPresence[fromId]||{}).status==='serving'){
      updates['lephemere/staffPresence/'+fromId+'/status']='available';
      updates['lephemere/staffPresence/'+fromId+'/updatedAt']=now;
    }
    updates['lephemere/assignmentHistory/'+historyKey]={visitId:visitId,queueNumber:visit.queueNumber||'',characterName:visit.characterName||'',fromStaffId:fromId,fromStaffName:(staffRoster[fromId]||{}).name||visit.assignedStaffName||'',toStaffId:targetId,toStaffName:targetName,action:action||'transfer',byUid:currentAuthUser?currentAuthUser.uid:'',byStaffId:currentStaffId||'',byStaffName:operator.name||'管理人員',bySessionId:adminSessionId,businessDate:visit.businessDate||currentBusinessDate(),createdAt:now};
    return db.ref().update(updates);
  }

  function recordVisitAssignment(visitId,fromId,toId,action){
    if(!assignmentHistoryRef) return Promise.resolve();
    return assignmentHistoryRef.push({visitId:visitId,fromStaffId:fromId||'',toStaffId:toId||'',action:action,byUid:currentAuthUser?currentAuthUser.uid:'',createdAt:Date.now()});
  }

  function renderAssignmentHistory(){
    var el=document.getElementById('assignmentHistoryList'); if(!el) return;
    var labels={claim:'認領接待',transfer:'轉交接待','order-page-transfer':'由訂單頁轉交','reset-daily-queue':'重置本場候位','reset-daily-orders':'重置本場訂單'};
    var rows=Object.keys(assignmentHistory).map(function(id){return assignmentHistory[id]||{};}).sort(function(a,b){return Number(b.createdAt||0)-Number(a.createdAt||0);});
    if(!rows.length){el.innerHTML='<div class="queue-empty">尚無操作紀錄</div>';return;}
    el.innerHTML=rows.map(function(row){
      var visit=visits[row.visitId]||{};
      var from=row.fromStaffId&&staffRoster[row.fromStaffId]?staffRoster[row.fromStaffId].name:'';
      var to=row.toStaffId&&staffRoster[row.toStaffId]?staffRoster[row.toStaffId].name:'';
      var detail=from&&to?from+' → '+to:(to||from||'管理人員');
      var operator=row.byStaffName?('・由 '+row.byStaffName+' 操作'):'';
      return '<div class="audit-row"><span>'+fmtTime(row.createdAt)+'</span><strong>'+escapeHtml(labels[row.action]||row.action||'接待操作')+((row.queueNumber||visit.queueNumber)?'・'+escapeHtml(row.queueNumber||visit.queueNumber):'')+'</strong><span>'+escapeHtml(detail+operator)+'</span></div>';
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
    var world=String(v.world||'').replace(/\s+/g,'').trim();
    var number=v.queueNumber||'目前號碼';
    var staffId=v.assignedStaffId||currentStaffId||'';
    if(!staffId && v.assignedStaffName){
      staffId=Object.keys(staffRoster).find(function(id){return String((staffRoster[id]||{}).name||'')===String(v.assignedStaffName||'');})||'';
    }
    var staff=staffRoster[staffId]||{};
    var staffName=String(staff.name||v.assignedStaffName||'女僕').trim();
    var template=String(staff.callTemplate||DEFAULT_VISIT_CALL_TEMPLATE).trim()||DEFAULT_VISIT_CALL_TEMPLATE;
    if(!world && template===DEFAULT_VISIT_CALL_TEMPLATE){
      return '/sh '+guest+' 主人您好，候位號碼 '+number+' 已輪到您，請留意女僕前來接待。';
    }
    return template
      .replace(/\{角色名\}/g,guest)
      .replace(/\{伺服器\}/g,world)
      .replace(/\{候位號碼\}/g,number)
      .replace(/\{女僕名\}/g,staffName);
  }

  var copyToastTimer=null;
  function showCopyToast(message,important){
    var toast=document.getElementById('copyToast');
    toast.textContent=message||'叫號文字已複製';
    toast.classList.toggle('important',!!important);
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
    var transfer=e.target.closest('[data-open-transfer]');
    if(transfer){ openTransferModal(transfer.getAttribute('data-open-transfer')); return; }
    var btn=e.target.closest('[data-copy-call]');
    if(!btn) return;
    var visit=visits[btn.getAttribute('data-copy-call')];
    if(visit) copyReceptionText(visitCallText(visit));
  });

  document.getElementById('todayTab').addEventListener('click',function(e){
    var target=e.target.closest('[data-dashboard-target]');
    if(!target) return;
    var tab=document.querySelector('.main-tab[data-main="'+target.getAttribute('data-dashboard-target')+'"]');
    if(tab) tab.click();
  });
  document.getElementById('receptionSearch').addEventListener('input',function(){
    receptionSearchTerm=this.value.trim().toLowerCase();
    renderReception();
  });
  document.getElementById('receptionAttentionOnly').addEventListener('change',function(){
    receptionAttentionOnly=this.checked;
    renderReception();
  });

  document.getElementById('globalStaffSelect').addEventListener('change',function(){ setCurrentStaff(this.value); });
  document.getElementById('saveReceptionCallTemplate').addEventListener('click',function(){
    if(!currentStaffId||!staffRoster[currentStaffId]){alert('請先選擇目前操作女僕。');return;}
    var editor=document.getElementById('receptionCallTemplate');
    var status=document.getElementById('receptionCallTemplateStatus');
    var template=editor.value.trim()||DEFAULT_VISIT_CALL_TEMPLATE;
    if(template.indexOf('{角色名}')===-1){alert('接待文字需要包含 {角色名}。');return;}
    if(template.indexOf('{候位號碼}')===-1){alert('接待文字需要包含 {候位號碼}。');return;}
    this.disabled=true;
    var button=this;
    staffRosterRef.child(currentStaffId).child('callTemplate').set(template).then(function(){
      if(status) status.textContent='已儲存，下一次複製立即套用';
    }).catch(function(){
      if(status) status.textContent='儲存失敗，請確認 Firebase 規則已更新';
    }).then(function(){button.disabled=false;});
  });
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
    var message='確定重置本場候位號碼嗎？\n\n下一位客人會從 A001 重新開始。';
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
    Promise.all([resetVisits,visitQueueCounterRef.child(currentBusinessDate()).set(0),recordVisitAssignment('',currentStaffId,'','reset-daily-queue')]).then(function(){
      alert('本場候位已重置，下一位客人將取得 A001。');
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
      var linkedOrders=ordersForVisit(id);
      var unfinishedOrders=linkedOrders.filter(function(order){return order.status!=='completed'&&order.status!=='cancelled';});
      if(unfinishedOrders.length){
        alert('這組主人還有 '+unfinishedOrders.length+' 筆一般訂單尚未完成，請先送餐並完成訂單。');
        return;
      }
      var pendingSpecial=[];
      var pendingTableService=[];
      linkedOrders.forEach(function(order){collectSpecialTasks(order.items||[]).forEach(function(task){
        if(specialTaskState(order,task)==='completed') return;
        if(task.type==='polaroid'||task.type==='lens') pendingSpecial.push(task); else pendingTableService.push(task);
      });});
      if(pendingTableService.length){
        alert('這組主人還有桌邊特殊服務尚未完成，請先完成蛋包飯魔法等桌邊項目。');
        return;
      }
      if(pendingSpecial.length){
        var plan=specialAssignmentPlan(id);
        if(plan.missing.length){
          alert('以下特殊服務尚未指定負責女僕：\n'+plan.missing.join('、')+'\n\n請先到「特殊服務」指派，或在菜單品項設定預設負責女僕。');
          return;
        }
        Promise.all(plan.jobs).then(function(){
          return visitsRef.child(id).update({status:'special_service',tableServiceCompletedAt:Date.now(),tableServiceCompletedById:currentStaffId,tableServiceCompletedByName:(staffRoster[currentStaffId]||{}).name||'',updatedAt:Date.now()});
        }).then(function(){
          var other=visitRows(['assigned','serving']).some(function(v){return v.id!==id&&v.assignedStaffId===currentStaffId;});
          if(!other) return staffPresenceRef.child(currentStaffId).set({status:'available',updatedAt:Date.now()});
        });
        return;
      }
      if(!confirm('確定結束 '+(visits[id].queueNumber||'這組')+' 的接待嗎？')) return;
      visitsRef.child(id).update({status:'completed',completedAt:Date.now(),updatedAt:Date.now()}).then(function(){
        var other=visitRows(['assigned','serving']).some(function(v){return v.id!==id&&v.assignedStaffId===currentStaffId;});
        if(!other) staffPresenceRef.child(currentStaffId).set({status:'available',updatedAt:Date.now()});
      });
    }
  });
  document.getElementById('transferRoster').addEventListener('click',function(e){
    var target=e.target.closest('[data-transfer-target]'); if(!target || target.disabled) return;
    transferModalTargetId=target.getAttribute('data-transfer-target'); renderTransferModal();
  });
  document.getElementById('transferModalConfirm').addEventListener('click',function(){
    if(transferInProgress || !transferModalVisitId || !transferModalTargetId) return;
    transferInProgress=true; renderTransferModal();
    transferVisit(transferModalVisitId,transferModalTargetId,'transfer').then(function(){
      var target=staffRoster[transferModalTargetId]||{};
      showCopyToast('已轉交給 '+(target.name||'新接待'),true); playTransferSound(); closeTransferModal();
    }).catch(function(err){
      transferInProgress=false; renderTransferModal();
      document.getElementById('transferModalStatus').textContent='轉交失敗：'+((err&&err.message)||'請稍後再試');
    });
  });
  document.getElementById('transferModalClose').addEventListener('click',closeTransferModal);
  document.getElementById('transferModalCancel').addEventListener('click',closeTransferModal);
  document.getElementById('transferModalOverlay').addEventListener('click',function(e){if(e.target===this) closeTransferModal();});
  document.addEventListener('keydown',function(e){if(e.key==='Escape'&&transferModalVisitId) closeTransferModal();});

  document.addEventListener('pointerdown', function unlockOrderAudio(){
    if(!soundEnabled) return;
    var AudioCtx = window.AudioContext || window.webkitAudioContext;
    if(!AudioCtx) return;
    if(!orderAudioContext) orderAudioContext = new AudioCtx();
    if(orderAudioContext.state==='suspended') orderAudioContext.resume().catch(function(){});
  }, {once:true});

  function orderBusinessDate(order){
    return order && order.businessDate ? order.businessDate : orderDateKey(order && order.createdAt);
  }

  function orderBelongsToBusiness(order, date){
    return orderBusinessDate(order) === (date || currentBusinessDate());
  }

  function notificationHtml(record, type, id){
    var notice = record && record.notification || {};
    var status = notice.status || 'pending';
    var label = status==='sent' ? 'Discord 已通知' : (status==='failed' ? 'Discord 通知失敗' : (status==='sending' ? 'Discord 通知中' : 'Discord 等待通知'));
    var detail = status==='failed' && notice.error ? ' title="'+escapeAttr(notice.error)+'"' : '';
    var stalePending = status==='pending' && record && record.createdAt && Date.now()-Number(record.createdAt)>120000;
    var retry = (status==='failed' || stalePending) && retryDiscordNotificationFn
      ? '<button class="notification-retry" data-retry-notification="'+escapeAttr(type)+'" data-notification-id="'+escapeAttr(id)+'">重試通知</button>'
      : '';
    return '<span class="notification-state '+status+'"'+detail+'>'+label+'</span>'+retry;
  }

  function bindNotificationRetries(root){
    if(!root || !retryDiscordNotificationFn) return;
    root.querySelectorAll('[data-retry-notification]').forEach(function(btn){
      btn.addEventListener('click', function(){
        var original = btn.textContent;
        btn.disabled = true;
        btn.textContent = '重試中…';
        retryDiscordNotificationFn({type:btn.getAttribute('data-retry-notification'), id:btn.getAttribute('data-notification-id')})
          .then(function(){ btn.textContent = '已送出'; })
          .catch(function(err){
            btn.disabled = false;
            btn.textContent = original;
            alert('Discord 通知重試失敗：'+((err && err.message) || '請稍後再試'));
          });
      });
    });
  }

  function renderStats(){
    var pending=0, preparing=0, completed=0, gil=0, unassigned=0, overdue=0, specialPending=0;
    Object.keys(orders).forEach(function(id){
      var o = orders[id];
      if(!orderBelongsToBusiness(o)) return;
      if(o.status==='pending') pending++;
      if(o.status==='preparing' || o.status==='served') preparing++;
      if(o.status==='completed') completed++;
      if(o.status!=='cancelled') gil += (o.total||0);
      if((o.status==='pending' || o.status==='preparing' || o.status==='served') && !o.assignedStaffId) unassigned++;
      if(o.status==='pending' && o.createdAt && Date.now()-o.createdAt >= 600000) overdue++;
      if(o.status==='pending' || o.status==='preparing' || o.status==='served'){
        collectSpecialTasks(o.items||[]).forEach(function(task){
          if(specialTaskState(o,task)!=='completed') specialPending++;
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
    document.getElementById('overviewDate').textContent = currentBusinessDate().replace(/-/g,' / ')+'・即時整理本場訂單與待處理事項';
    renderTodayOverview();
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

  function specialItemKey(type,item,index,unitIndex){
    var source=String(item&&item.id||'item-'+index).replace(/[.#$\[\]\/]/g,'_');
    return type+'__'+source+'__'+index+(unitIndex==null?'':'__unit'+unitIndex);
  }

  function collectSpecialTasks(items){
    var tasks=[];
    (items||[]).forEach(function(item,index){
      var type=standaloneSpecialType(item);
      if(type!=='polaroid'&&type!=='lens') return;
      var assignments=Array.isArray(item.assignments)&&item.assignments.length ? item.assignments : null;
      if(assignments){
        var qty=Math.max(1,Number(item.qty||1));
        for(var unit=0;unit<qty;unit++){
          tasks.push({
            key:specialItemKey(type,item,index,unit),
            type:type,
            label:(type==='polaroid'?'📷 ':'✦ ')+(item.name|| (type==='polaroid'?'拍立得':'個人攝影')),
            item:item,
            index:index,
            unitIndex:unit,
            dinerName:assignments[unit]||'尚未指定'
          });
        }
      }else{
        tasks.push({
          key:specialItemKey(type,item,index),
          type:type,
          label:(type==='polaroid'?'📷 ':'✦ ')+(item.name|| (type==='polaroid'?'拍立得':'個人攝影')),
          item:item,
          index:index
        });
      }
    });
    if(collectSpecialTags(items).some(function(tag){return tag.key==='magic';})){
      tasks.push({key:'magic',type:'magic',label:'♥ 蛋包飯魔法'});
    }
    return tasks;
  }

  function specialTaskState(order,task){
    var states=order.specialServices||{};
    if(states[task.key]&&states[task.key].status) return states[task.key].status;
    if(task.key!==task.type&&states[task.type]&&states[task.type].status) return states[task.type].status;
    return 'pending';
  }

  function specialTaskRecord(order,task){
    var states=order.specialServices||{};
    if(states[task.key]) return states[task.key];
    if(task.key!==task.type&&states[task.type]) return states[task.type];
    return {};
  }

  function inferredServiceStaff(task){
    var item=task.item||{};
    var menuItem=menuItems[item.id]||{};
    var configuredId=menuItem.serviceStaffId||item.serviceStaffId||'';
    if(configuredId){
      return {id:configuredId,name:(staffRoster[configuredId]&&staffRoster[configuredId].name)||menuItem.serviceStaffName||item.serviceStaffName||'未命名女僕',source:'menu'};
    }
    var source=String(item.name||menuItem.name||'').toLowerCase();
    var matches=Object.keys(staffRoster).filter(function(id){
      var name=String((staffRoster[id]||{}).name||'').trim();
      return name && source.indexOf(name.toLowerCase())>-1;
    }).sort(function(a,b){return String(staffRoster[b].name||'').length-String(staffRoster[a].name||'').length;});
    if(matches.length===1){
      return {id:matches[0],name:staffRoster[matches[0]].name||'未命名女僕',source:'name'};
    }
    return {id:'',name:'未指派',source:''};
  }

  function specialTaskAssignment(order,task){
    var record=specialTaskRecord(order,task);
    if(record.assignedStaffId){
      return {id:record.assignedStaffId,name:(staffRoster[record.assignedStaffId]&&staffRoster[record.assignedStaffId].name)||record.assignedStaffName||'未命名女僕',source:'task'};
    }
    return inferredServiceStaff(task);
  }

  function payrollItemUnitPrice(item){
    var menuItem=menuItems[item&&item.id]||{};
    var value=item&&item.price!==undefined?item.price:menuItem.price;
    value=Number(value||0);
    return isFinite(value)&&value>0?value:0;
  }

  function payrollOrderFallbackTotal(order){
    return (order.items||[]).reduce(function(sum,item){
      var qty=Math.max(1,Number(item.qty||1));
      var addon=item.addon&&Number(item.addon.price||0)>0?Number(item.addon.price||0)*qty:0;
      return sum+payrollItemUnitPrice(item)*qty+addon;
    },0);
  }

  function payrollCompletedData(){
    var commonRevenue=0;
    var specialRevenue=0;
    var unassignedRevenue=0;
    var specialByStaff={};
    var specialStaffNames={};
    Object.keys(orders).forEach(function(id){
      var order=orders[id]||{};
      if(order.status!=='completed'||!orderBelongsToBusiness(order)) return;
      var tasks=collectSpecialTasks(order.items||[]);
      var specialBase=0;
      (order.items||[]).forEach(function(item,index){
        var type=standaloneSpecialType(item);
        if(type!=='polaroid'&&type!=='lens') return;
        var qty=Math.max(1,Number(item.qty||1));
        var unitPrice=payrollItemUnitPrice(item);
        var itemSpecial=unitPrice*qty;
        specialBase+=itemSpecial;
        specialRevenue+=itemSpecial;
        var itemTasks=tasks.filter(function(task){return task.index===index&&(task.type==='polaroid'||task.type==='lens');});
        if(!itemTasks.length){unassignedRevenue+=itemSpecial;return;}
        var splitByUnit=itemTasks.some(function(task){return task.unitIndex!==undefined&&task.unitIndex!==null;});
        itemTasks.forEach(function(task,taskIndex){
          var amount=splitByUnit?unitPrice:(taskIndex===0?itemSpecial:0);
          if(!amount) return;
          var assignment=specialTaskAssignment(order,task);
          if(!assignment.id){unassignedRevenue+=amount;return;}
          specialByStaff[assignment.id]=(specialByStaff[assignment.id]||0)+amount;
          specialStaffNames[assignment.id]=assignment.name||((staffRoster[assignment.id]||{}).name)||'未命名女僕';
        });
      });
      var recordedTotal=Number(order.total);
      var orderTotal=isFinite(recordedTotal)?recordedTotal:payrollOrderFallbackTotal(order);
      commonRevenue+=Math.max(0,orderTotal-specialBase);
    });
    return {commonRevenue:commonRevenue,specialRevenue:specialRevenue,unassignedRevenue:unassignedRevenue,specialByStaff:specialByStaff,specialStaffNames:specialStaffNames};
  }

  function ensurePayrollDefaults(){
    var tab=document.getElementById('payrollTab');
    if(payrollState.initialized||!Object.keys(staffRoster).length||!tab||tab.style.display==='none') return;
    var ids=activeDutyIds().filter(function(id){return !!staffRoster[id];});
    if(!ids.length) ids=Object.keys(staffRoster);
    ids.forEach(function(id){payrollState.selectedStaff[id]=true;});
    payrollState.slipStaffId=ids[0]||'';
    payrollState.initialized=true;
  }

  function resetPayrollForBusinessDate(date){
    if(payrollState.businessDate===date) return;
    payrollState.businessDate=date;
    payrollState.initialized=false;
    payrollState.reservationRevenue=0;
    payrollState.commonAdjustment=0;
    payrollState.commonOverride='';
    payrollState.selectedStaff={};
    payrollState.specialAdjustments={};
    payrollState.specialOverrides={};
    payrollState.slipStaffId='';
    document.getElementById('payrollReservationRevenue').value='0';
    document.getElementById('payrollCommonAdjustment').value='0';
    document.getElementById('payrollCommonOverride').value='';
  }

  function payrollNumber(value){
    value=Number(value||0);
    return isFinite(value)?value:0;
  }

  function renderPayrollStaffChecks(){
    var container=document.getElementById('payrollStaffChecks');
    if(!container) return;
    var ids=Object.keys(staffRoster).sort(function(a,b){return String((staffRoster[a]||{}).name||'').localeCompare(String((staffRoster[b]||{}).name||''),'zh-Hant');});
    if(!ids.length){container.innerHTML='<span class="payroll-count-note">尚未建立店員名單</span>';return;}
    container.innerHTML=ids.map(function(id){
      var checked=payrollState.selectedStaff[id]===true?' checked':'';
      return '<label class="payroll-staff-check"><input type="checkbox" data-payroll-staff="'+escapeAttr(id)+'"'+checked+'><span>'+escapeHtml((staffRoster[id]||{}).name||'未命名女僕')+'</span></label>';
    }).join('');
  }

  function renderPayrollSlip(){
    var select=document.getElementById('payrollSlipStaff');
    var slip=document.getElementById('payrollSlip');
    if(!select||!slip) return;
    var result=payrollResults.filter(function(row){return row.id===select.value;})[0]||payrollResults[0];
    if(!result){slip.textContent='尚無可顯示資料';return;}
    payrollState.slipStaffId=result.id;
    slip.textContent='曇時 Cafe l’Éphémère｜本場薪資條\n'
      +'日期：'+currentBusinessDate().replace(/-/g,' / ')+'\n'
      +'女僕：'+result.name+'\n'
      +'共同營業額分紅：'+fmtGil(result.common)+'\n'
      +'個人特殊服務收入：'+fmtGil(result.special)+'\n'
      +'本場薪資合計：'+fmtGil(result.total);
  }

  function renderPayroll(){
    var tab=document.getElementById('payrollTab');
    if(!tab) return;
    resetPayrollForBusinessDate(currentBusinessDate());
    ensurePayrollDefaults();
    var data=payrollCompletedData();
    var commonOverride=String(payrollState.commonOverride===undefined?'':payrollState.commonOverride).trim();
    var commonTotal=commonOverride!==''?payrollNumber(commonOverride):data.commonRevenue+payrollNumber(payrollState.reservationRevenue)+payrollNumber(payrollState.commonAdjustment);
    commonTotal=Math.max(0,commonTotal);
    var selectedCount=Object.keys(payrollState.selectedStaff).filter(function(id){return payrollState.selectedStaff[id]===true&&!!staffRoster[id];}).length;
    var share=selectedCount?Math.round(commonTotal/selectedCount):0;
    var allIds=Object.keys(staffRoster);
    Object.keys(data.specialByStaff).forEach(function(id){if(allIds.indexOf(id)===-1) allIds.push(id);});
    allIds.sort(function(a,b){
      var aName=(staffRoster[a]&&staffRoster[a].name)||data.specialStaffNames[a]||'';
      var bName=(staffRoster[b]&&staffRoster[b].name)||data.specialStaffNames[b]||'';
      return String(aName).localeCompare(String(bName),'zh-Hant');
    });
    payrollResults=allIds.map(function(id){
      var systemSpecial=payrollNumber(data.specialByStaff[id]);
      var override=payrollState.specialOverrides[id];
      var special=override!==undefined&&String(override).trim()!==''?payrollNumber(override):systemSpecial+payrollNumber(payrollState.specialAdjustments[id]);
      special=Math.max(0,special);
      var common=payrollState.selectedStaff[id]===true?share:0;
      return {id:id,name:(staffRoster[id]&&staffRoster[id].name)||data.specialStaffNames[id]||'未命名女僕',common:common,systemSpecial:systemSpecial,special:special,total:common+special};
    });
    var adjustedSpecialTotal=payrollResults.reduce(function(sum,row){return sum+row.special;},0)+data.unassignedRevenue;
    document.getElementById('payrollBusinessDate').textContent=currentBusinessDate().replace(/-/g,' / ');
    document.getElementById('payrollAutoCommon').value=String(Math.round(data.commonRevenue));
    document.getElementById('payrollCommonTotal').textContent=fmtGil(Math.round(commonTotal));
    document.getElementById('payrollShareValue').textContent=fmtGil(share);
    document.getElementById('payrollSpecialTotal').textContent=fmtGil(Math.round(adjustedSpecialTotal));
    renderPayrollStaffChecks();
    var countNote=document.getElementById('payrollCountNote');
    countNote.textContent=selectedCount?'共同營業額將由已勾選的 '+selectedCount+' 位成員平分。':'請至少勾選一位參與共同分紅的成員。';
    countNote.classList.toggle('is-warning',selectedCount===0);
    var warning=document.getElementById('payrollUnassignedWarning');
    warning.hidden=!data.unassignedRevenue;
    warning.textContent=data.unassignedRevenue?'有 '+fmtGil(data.unassignedRevenue)+' 的特殊服務尚未指定任務負責女僕，因此目前未列入任何人的薪資。':'';
    var rows=document.getElementById('payrollRows');
    rows.innerHTML=payrollResults.length?payrollResults.map(function(row){
      var adjustment=payrollState.specialAdjustments[row.id]===undefined?0:payrollState.specialAdjustments[row.id];
      var override=payrollState.specialOverrides[row.id]===undefined?'':payrollState.specialOverrides[row.id];
      return '<tr><td class="payroll-name">'+escapeHtml(row.name)+'</td>'
        +'<td class="payroll-number">'+fmtGil(row.common)+'</td>'
        +'<td class="payroll-number">'+fmtGil(row.systemSpecial)+'</td>'
        +'<td><input type="number" data-payroll-special-adjust="'+escapeAttr(row.id)+'" value="'+escapeAttr(String(adjustment))+'" aria-label="'+escapeAttr(row.name)+'特殊收入調整"></td>'
        +'<td><input type="number" data-payroll-special-override="'+escapeAttr(row.id)+'" value="'+escapeAttr(String(override))+'" placeholder="留空" min="0" aria-label="'+escapeAttr(row.name)+'特殊收入覆蓋"></td>'
        +'<td class="payroll-number payroll-final">'+fmtGil(row.total)+'</td>'
        +'<td><button class="btn ghost small" type="button" data-payroll-slip="'+escapeAttr(row.id)+'">薪資條</button></td></tr>';
    }).join(''):'<tr><td class="payroll-empty" colspan="7">尚無店員資料</td></tr>';
    var slipSelect=document.getElementById('payrollSlipStaff');
    slipSelect.innerHTML=payrollResults.map(function(row){return '<option value="'+escapeAttr(row.id)+'">'+escapeHtml(row.name)+'</option>';}).join('');
    if(payrollResults.some(function(row){return row.id===payrollState.slipStaffId;})) slipSelect.value=payrollState.slipStaffId;
    else if(payrollResults[0]){payrollState.slipStaffId=payrollResults[0].id;slipSelect.value=payrollResults[0].id;}
    renderPayrollSlip();
  }

  function syncPayrollCommonInput(target){
    if(target.id==='payrollReservationRevenue') payrollState.reservationRevenue=payrollNumber(target.value);
    else if(target.id==='payrollCommonAdjustment') payrollState.commonAdjustment=payrollNumber(target.value);
    else if(target.id==='payrollCommonOverride') payrollState.commonOverride=target.value;
    else return false;
    return true;
  }

  document.getElementById('payrollTab').addEventListener('input',function(event){
    if(syncPayrollCommonInput(event.target)) renderPayroll();
  });
  document.getElementById('payrollTab').addEventListener('change',function(event){
    var staffId=event.target.getAttribute('data-payroll-staff');
    if(staffId){payrollState.selectedStaff[staffId]=event.target.checked;renderPayroll();return;}
    var adjustId=event.target.getAttribute('data-payroll-special-adjust');
    if(adjustId){payrollState.specialAdjustments[adjustId]=payrollNumber(event.target.value);renderPayroll();return;}
    var overrideId=event.target.getAttribute('data-payroll-special-override');
    if(overrideId){payrollState.specialOverrides[overrideId]=event.target.value;renderPayroll();}
  });
  document.getElementById('payrollTab').addEventListener('click',function(event){
    var slipButton=event.target.closest('[data-payroll-slip]');
    if(!slipButton) return;
    payrollState.slipStaffId=slipButton.getAttribute('data-payroll-slip');
    document.getElementById('payrollSlipStaff').value=payrollState.slipStaffId;
    renderPayrollSlip();
  });
  document.getElementById('payrollSlipStaff').addEventListener('change',renderPayrollSlip);
  document.getElementById('payrollRecalculate').addEventListener('click',renderPayroll);
  document.getElementById('payrollCopySlip').addEventListener('click',function(){
    var button=this;
    var text=document.getElementById('payrollSlip').textContent||'';
    function done(){button.textContent='已複製';setTimeout(function(){button.textContent='複製薪資條';},1200);}
    if(navigator.clipboard&&navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(done).catch(function(){fallbackCopy(text);done();});
    else{fallbackCopy(text);done();}
  });

  function specialStaffOptions(selectedId){
    var ids=activeDutyIds();
    if(!ids.length) ids=Object.keys(staffRoster);
    if(selectedId&&staffRoster[selectedId]&&ids.indexOf(selectedId)===-1) ids.push(selectedId);
    ids.sort(function(a,b){return String((staffRoster[a]||{}).name||'').localeCompare(String((staffRoster[b]||{}).name||''),'zh-Hant');});
    var html='<option value="">未指派</option>';
    ids.forEach(function(id){html+='<option value="'+escapeAttr(id)+'" '+(id===selectedId?'selected':'')+'>'+escapeHtml((staffRoster[id]||{}).name||'未命名女僕')+'</option>';});
    return html;
  }

  function findSpecialTask(order,key){
    return collectSpecialTasks(order&&order.items||[]).filter(function(task){return task.key===key;})[0]||null;
  }

  function specialQueueCard(order, task){
    var state = specialTaskState(order,task);
    var assignment=specialTaskAssignment(order,task);
    var item = task.item||{};
    var itemText = (item.name||'特殊服務')+(task.unitIndex==null && Number(item.qty||1)>1?' × '+Number(item.qty):'');
    if(task.dinerName) itemText += '｜服務對象：'+task.dinerName;
    return '<div class="special-queue-card '+(state==='completed'?'is-completed ':'')+(assignment.id===currentStaffId&&currentStaffId?'is-mine ':'')+(!assignment.id?'is-unassigned':'')+'">'
      +'<div><div class="special-queue-order">訂單 #'+escapeHtml(order.orderNumber||'—')+'</div>'
      +'<div class="special-queue-name">'+escapeHtml(order.name||'未填寫主人名稱')+'</div>'
      +'<div class="special-queue-items">'+escapeHtml(itemText)+'</div>'
      +'<div class="special-queue-staff">主要接待：'+escapeHtml(order.assignedStaffName||'尚未指派')+'</div>'
      +'<div class="special-queue-owner">拍立得負責：'+escapeHtml(assignment.name)+'</div></div>'
      +'<div class="special-queue-assignment"><label>任務負責女僕</label><select data-special-assignee="'+escapeAttr(order.id)+'" data-special-key="'+escapeAttr(task.key)+'" aria-label="指派 '+escapeAttr(item.name||'特殊服務')+' 負責女僕">'+specialStaffOptions(assignment.id)+'</select></div>'
      +'<div class="special-queue-actions"><select data-special-queue="'+escapeAttr(order.id)+'" data-special-key="'+escapeAttr(task.key)+'" aria-label="更新訂單 #'+escapeAttr(order.orderNumber||'')+' '+escapeAttr(item.name||'特殊服務')+'進度">'
      +'<option value="pending" '+(state==='pending'?'selected':'')+'>待處理</option>'
      +'<option value="in_progress" '+(state==='in_progress'?'selected':'')+'>進行中</option>'
      +'<option value="completed" '+(state==='completed'?'selected':'')+'>已完成</option>'
      +'</select>'
      +(isManager()?'<button class="btn ghost small special-task-reset" type="button" data-reset-special="'+escapeAttr(order.id)+'" data-special-key="'+escapeAttr(task.key)+'">重置進度</button>':'')
      +'</div></div>';
  }

  function renderSpecialServiceWorkspace(){
    var activeOrders = Object.keys(orders).map(function(id){
      var order = orders[id];
      return Object.assign({id:id}, order);
    }).filter(function(order){ return order.status!=='cancelled' && orderBelongsToBusiness(order); });
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
      var matching = [];
      activeOrders.forEach(function(order){
        collectSpecialTasks(order.items||[]).filter(function(task){return task.type===type;}).forEach(function(task){
          matching.push({order:order,task:task});
        });
      });
      matching=matching.filter(function(entry){
        var assignment=specialTaskAssignment(entry.order,entry.task);
        if(currentSpecialFilter==='mine') return !!currentStaffId&&assignment.id===currentStaffId;
        if(currentSpecialFilter==='unassigned') return !assignment.id;
        return true;
      });
      matching.sort(function(a,b){
        function taskWeight(entry){var state=specialTaskState(entry.order,entry.task);return state==='in_progress'?0:(state==='pending'?1:2);}
        return taskWeight(a)-taskWeight(b)||Number(a.order.createdAt||0)-Number(b.order.createdAt||0);
      });
      var pendingCount = matching.filter(function(entry){
        return specialTaskState(entry.order,entry.task)!=='completed';
      }).length;
      countEl.textContent = String(pendingCount);
      el.innerHTML = matching.length ? matching.map(function(entry){ return specialQueueCard(entry.order,entry.task); }).join('') : '<div class="special-queue-empty">目前沒有待處理服務</div>';
    });

    document.querySelectorAll('[data-special-queue]').forEach(function(select){
      select.addEventListener('change', function(){
        var id = select.getAttribute('data-special-queue');
        var key = select.getAttribute('data-special-key');
        var order=orders[id]||{};
        var task=findSpecialTask(order,key);
        var assignment=task?specialTaskAssignment(order,task):{id:'',name:''};
        var update={status:select.value,updatedAt:Date.now()};
        if(assignment.id){update.assignedStaffId=assignment.id;update.assignedStaffName=assignment.name;}
        ordersRef.child(id).child('specialServices').child(key).update(update).then(function(){
          return ordersRef.child(id).once('value');
        }).then(function(snapshot){
          orders[id]=snapshot.val()||{};
          return tryCompleteSpecialVisit(orders[id].visitId||'');
        });
      });
    });
    document.querySelectorAll('[data-special-assignee]').forEach(function(select){
      select.addEventListener('change',function(){
        var id=select.getAttribute('data-special-assignee');
        var key=select.getAttribute('data-special-key');
        var staffId=select.value;
        var staff=staffRoster[staffId]||{};
        ordersRef.child(id).child('specialServices').child(key).update({
          assignedStaffId:staffId||null,
          assignedStaffName:staffId?(staff.name||'未命名女僕'):null,
          assignedAt:staffId?Date.now():null,
          updatedAt:Date.now()
        });
      });
    });
    document.querySelectorAll('[data-reset-special]').forEach(function(btn){
      btn.addEventListener('click',function(){
        if(!isManager()) return;
        var id=btn.getAttribute('data-reset-special');
        var key=btn.getAttribute('data-special-key');
        var order=orders[id]||{};
        var task=findSpecialTask(order,key);
        var label=task&&task.label||'特殊服務';
        if(!confirm('確定要把「'+label+'」重置為待處理嗎？\n\n負責女僕會保留；只清除這一項的完成進度。')) return;
        btn.disabled=true;
        var reset=ordersRef.child(id).child('specialServices').child(key).update({
          status:'pending',
          startedAt:null,
          completedAt:null,
          updatedAt:Date.now()
        });
        var visitId=order.visitId||'';
        if(visitId && visits[visitId] && visits[visitId].status==='completed'){
          reset=reset.then(function(){
            return visitsRef.child(visitId).update({status:'special_service',completedAt:null,specialServicesCompletedAt:null,updatedAt:Date.now()});
          });
        }
        reset.catch(function(err){
          console.error('Reset special service failed',err);
          btn.disabled=false;
          alert('特殊服務重置失敗，請確認登入權限與連線。');
        });
      });
    });
  }

  document.getElementById('specialTaskFilters').addEventListener('click',function(e){
    var btn=e.target.closest('[data-special-filter]');
    if(!btn) return;
    currentSpecialFilter=btn.getAttribute('data-special-filter')||'all';
    this.querySelectorAll('[data-special-filter]').forEach(function(item){item.classList.toggle('active',item===btn);});
    renderSpecialServiceWorkspace();
  });

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
      var knownItem = menuItems[id] || {};
      if(knownItem.stockEnabled!==true) return changeAt(index+1);
      return menuRef.child(id).child('stockRemaining').transaction(function(current){
        var remaining = Math.max(0, Number(current||0));
        if(direction < 0 && remaining<qty) return;
        return remaining + direction*qty;
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
      if(currentOrderFilter==='active') return orderBelongsToBusiness(o) && (o.status==='pending' || o.status==='preparing' || o.status==='served');
      if(currentOrderFilter==='mine') return orderBelongsToBusiness(o) && !!currentStaffId && o.assignedStaffId===currentStaffId && (o.status==='pending' || o.status==='preparing' || o.status==='served');
      if(currentOrderFilter==='unassigned') return orderBelongsToBusiness(o) && (o.status==='pending' || o.status==='preparing' || o.status==='served') && !o.assignedStaffId;
      if(currentOrderFilter==='completed') return o.status==='completed';
      if(currentOrderFilter==='cancelled') return o.status==='cancelled';
      if(currentOrderFilter==='history') return !orderBelongsToBusiness(o);
      return true;
    });
    if(orderSearchTerm){
      arr = arr.filter(function(o){
        var itemText = (o.items||[]).map(function(item){
          return (item.name||'')+' '+(item.addon && item.addon.label || '')+' '+(Array.isArray(item.assignments)?item.assignments.join(' '):'');
        }).join(' ');
        var haystack = [o.orderNumber, o.queueNumber, o.name, o.note, o.internalNote, o.assignedStaffName, Array.isArray(o.diners)?o.diners.join(' '):'', itemText].join(' ').toLowerCase();
        return haystack.indexOf(orderSearchTerm) > -1;
      });
    }
    document.getElementById('orderSearchHint').textContent = orderSearchTerm ? '找到 '+arr.length+' 筆' : '';
    var groupByDate = currentOrderFilter==='completed' || currentOrderFilter==='cancelled' || currentOrderFilter==='all' || currentOrderFilter==='history';
    arr.sort(function(a,b){
      return groupByDate ? (b.createdAt||0) - (a.createdAt||0) : (a.createdAt||0) - (b.createdAt||0);
    });

    if(arr.length===0){ el.innerHTML = '<p class="empty">目前沒有符合條件的訂單</p>'; return; }

    var dayStats = {};
    if(groupByDate){
      arr.forEach(function(o){
        var key = orderBusinessDate(o);
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
        var dateKey = orderBusinessDate(o);
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
        var assigned=itemAssignmentSummary(it);
        return '<div>'+escapeHtml(it.name)+' × '+escapeHtml(String(Number(it.qty)||0))+extra+'</div>'
          +(assigned?'<div class="order-item-assignment">歸屬：'+escapeHtml(assigned)+'</div>':'');
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

      var dutyDate = activeDutyDate();
      var activeSchedule = scheduleForDate(dutyDate);
      var onDutyIds = activeDutyIds();
      var staffIds = activeSchedule ? onDutyIds.slice() : Object.keys(staffRoster);
      if(assignedId && staffRoster[assignedId] && staffIds.indexOf(assignedId)===-1) staffIds.push(assignedId);
      staffIds.sort(function(a,b){
        var aDuty = onDutyIds.indexOf(a) > -1 ? 0 : 1;
        var bDuty = onDutyIds.indexOf(b) > -1 ? 0 : 1;
        if(aDuty !== bDuty) return aDuty - bDuty;
        return String(staffRoster[a].name||'').localeCompare(String(staffRoster[b].name||''), 'zh-Hant');
      });
      var staffOptions = '<option value="">尚未指派</option>';
      staffIds.forEach(function(staffId){
        var staff = staffRoster[staffId] || {};
        var dutyMark = onDutyIds.indexOf(staffId) > -1 ? '（'+dutyDateLabel(dutyDate)+' 值班）' : '';
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
        + '<div>'+notificationHtml(o, 'order', o.id)+'</div>'
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
    bindNotificationRetries(el);

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
          });
          return;
        }
        var staff = staffRoster[staffId] || {};
        if(linkedVisitId && visits[linkedVisitId]){
          var previous=visits[linkedVisitId].assignedStaffId||'';
          transferVisit(linkedVisitId,staffId,'order-page-transfer').catch(function(err){alert('轉交失敗：'+((err&&err.message)||'請稍後再試'));renderOrders();});
          return;
        }
        ordersRef.child(id).update({
          assignedStaffId: staffId,
          assignedStaffName: staff.name || '未命名店員',
          assignedAt: Date.now()
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
        });
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
    var date = currentBusinessDate();
    var list = Object.keys(orders).map(function(id){ return orders[id]; }).filter(function(o){ return orderBelongsToBusiness(o, date); });
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
        collectSpecialTasks(o.items||[]).forEach(function(task){
          special.total++;
          if(specialTaskState(o,task)==='completed') special.completed++;
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
      var input = document.getElementById('businessDateInput');
      var businessDate = input && input.value.trim();
      if(!isScheduleDate(businessDate)){ alert('請先選擇這一場的營業日期。'); return; }
      operationStatusRef.set({ isOpen:true, label:'營業中', businessDate:businessDate, sessionId:'session-'+businessDate+'-'+Date.now(), openedAt:Date.now(), updatedAt:Date.now() });
      return;
    }
    var preview = buildDailyReport();
    var waitingVisits=visitRows(['waiting']);
    var warning = preview.data.activeCount>0 ? '目前仍有 '+preview.data.activeCount+' 筆進行中訂單。\n\n' : '';
    if(waitingVisits.length) warning+='目前另有 '+waitingVisits.length+' 組候位，打烊後會自動取消並通知客人頁面。\n\n';
    if(!confirm(warning+'確定要結束本場線上點餐並產生日報嗎？已送出的訂單仍會保留。')) return;
    var report = showDailyReport(true);
    var visitUpdates={};
    waitingVisits.forEach(function(v){visitUpdates[v.id+'/status']='cancelled';visitUpdates[v.id+'/cancelledAt']=Date.now();visitUpdates[v.id+'/updatedAt']=Date.now();visitUpdates[v.id+'/cancelReason']='business_closed';});
    var closeWaiting=Object.keys(visitUpdates).length?visitsRef.update(visitUpdates):Promise.resolve();
    closeWaiting.then(function(){return operationStatusRef.set({ isOpen:false, label:'已打烊', businessDate:currentBusinessDate(), sessionId:operationStatus.sessionId||'', updatedAt:Date.now(), reportDate:report.data.date });});
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

  document.getElementById('resetTodayOrders').addEventListener('click', function(){
    if(!isConfigured || !isManager()) return;
    if(operationStatus.isOpen!==false){alert('為避免正式營業中的訂單被清除，請先結束營業再重置本場訂單。');return;}
    var date=currentBusinessDate();
    var ids=Object.keys(orders).filter(function(id){return orderBelongsToBusiness(orders[id],date);});
    if(!ids.length){
      if(confirm('目前營業日期 '+date+' 沒有訂單。是否仍將下一筆訂單編號重置為 #1？')) nextOrderNumberRef.set(0);
      return;
    }
    var message='確定永久刪除 '+date+' 的全部 '+ids.length+' 筆訂單嗎？\n\n此操作會一併清除訂單內的特殊服務進度、歸還尚未歸還的限量名額，並讓下一筆訂單從 #1 開始。\n其他日期、候位、預約、菜單與排班不會更動。此操作無法復原。';
    if(!confirm(message)) return;
    var button=this;
    button.disabled=true;
    button.textContent='重置中…';
    Promise.all(ids.map(function(id){return releaseOrderStock(orders[id]);})).then(function(){
      var removals={};
      ids.forEach(function(id){removals[id]=null;});
      return Promise.all([
        ordersRef.update(removals),
        nextOrderNumberRef.set(0),
        recordVisitAssignment('',currentStaffId,'','reset-daily-orders')
      ]);
    }).then(function(){
      alert(date+' 的 '+ids.length+' 筆訂單已重置，下一筆將從 #1 開始。');
    }).catch(function(err){
      console.error('Reset daily orders failed',err);
      alert('本場訂單重置失敗，請確認 Firebase 權限與連線後再試。');
    }).then(function(){
      button.disabled=false;
      button.textContent='重置本場全部訂單';
    });
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

  function setMenuImagePreview(id, src, emptyText){
    var el = document.getElementById(id);
    if(!el) return;
    if(src){
      el.classList.remove('empty');
      el.innerHTML = '';
      var img = document.createElement('img');
      img.src = src;
      img.alt = '料理圖片預覽';
      el.appendChild(img);
    }else{
      el.classList.add('empty');
      el.innerHTML = '<span>'+escapeHtml(emptyText || '尚未選擇圖片')+'</span>';
    }
  }

  function previewMenuImageFile(input, previewId, emptyText){
    var file = input && input.files && input.files[0];
    if(!file){ setMenuImagePreview(previewId, '', emptyText); return; }
    if(!/^image\/(jpeg|png|webp)$/i.test(file.type)){
      alert('請選擇 JPG、PNG 或 WebP 圖片。');
      input.value = '';
      setMenuImagePreview(previewId, '', emptyText);
      return;
    }
    if(file.size > 12 * 1024 * 1024){
      alert('原始圖片請勿超過 12MB。');
      input.value = '';
      setMenuImagePreview(previewId, '', emptyText);
      return;
    }
    var url = URL.createObjectURL(file);
    menuImagePreviewUrls.push(url);
    setMenuImagePreview(previewId, url, emptyText);
  }

  function menuImageBlob(file){
    return new Promise(function(resolve, reject){
      if(!file){ resolve(null); return; }
      if(!/^image\/(jpeg|png|webp)$/i.test(file.type)){ reject(new Error('menu-image-type')); return; }
      if(file.size > 12 * 1024 * 1024){ reject(new Error('menu-image-size')); return; }
      var url = URL.createObjectURL(file);
      var img = new Image();
      img.onload = function(){
        URL.revokeObjectURL(url);
        var maxEdge = 1200;
        var ratio = Math.min(1, maxEdge / Math.max(img.naturalWidth, img.naturalHeight));
        var canvas = document.createElement('canvas');
        canvas.width = Math.max(1, Math.round(img.naturalWidth * ratio));
        canvas.height = Math.max(1, Math.round(img.naturalHeight * ratio));
        var context = canvas.getContext('2d');
        context.imageSmoothingEnabled = true;
        context.imageSmoothingQuality = 'high';
        context.drawImage(img, 0, 0, canvas.width, canvas.height);
        canvas.toBlob(function(blob){ blob ? resolve(blob) : reject(new Error('menu-image-convert')); }, 'image/webp', .9);
      };
      img.onerror = function(){ URL.revokeObjectURL(url); reject(new Error('menu-image-load')); };
      img.src = url;
    });
  }

  function uploadMenuImage(itemId, file){
    if(!file) return Promise.resolve(null);
    var path = 'menu-images/' + itemId + '.webp';
    return menuImageBlob(file).then(function(blob){
      return storage.ref(path).put(blob, {contentType:'image/webp', cacheControl:'public,max-age=3600'});
    }).then(function(snapshot){
      return snapshot.ref.getDownloadURL();
    }).then(function(url){ return {imageUrl:url, imageStoragePath:path}; });
  }

  function isAssignableServiceType(type){return type==='polaroid'||type==='lens';}

  function fillServiceStaffSelect(select,type,selectedId){
    if(!select) return;
    var enabled=isAssignableServiceType(type);
    var html='<option value="">'+(enabled?'請選擇負責女僕':'此類型不需指定')+'</option>';
    Object.keys(staffRoster).sort(function(a,b){return String((staffRoster[a]||{}).name||'').localeCompare(String((staffRoster[b]||{}).name||''),'zh-Hant');}).forEach(function(id){
      html+='<option value="'+escapeAttr(id)+'">'+escapeHtml((staffRoster[id]||{}).name||'未命名女僕')+'</option>';
    });
    select.innerHTML=html;
    select.disabled=!enabled;
    if(enabled&&selectedId&&staffRoster[selectedId]) select.value=selectedId;
  }

  function renderServiceStaffOptions(){
    var newSelect=document.getElementById('newItemServiceStaff');
    var editSelect=document.getElementById('editItemServiceStaff');
    fillServiceStaffSelect(newSelect,document.getElementById('newItemServiceType').value,newSelect&&newSelect.value);
    fillServiceStaffSelect(editSelect,document.getElementById('editItemServiceType').value,editSelect&&editSelect.value);
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
    fillServiceStaffSelect(document.getElementById('editItemServiceStaff'),item.serviceType||'food',item.serviceStaffId||'');
    document.getElementById('editItemNote').value = item.note || '';
    document.getElementById('editItemAddonLabel').value = item.addonLabel || '';
    document.getElementById('editItemAddonPrice').value = Number(item.addonPrice || 0);
    document.getElementById('editItemAvailable').checked = item.available !== false;
    document.getElementById('editItemStockEnabled').checked = item.stockEnabled === true;
    document.getElementById('editItemStockRemaining').value = Number(item.stockRemaining || 0);
    document.getElementById('editItemStockRemaining').disabled = item.stockEnabled !== true;
    document.getElementById('editItemImage').value = '';
    removeEditingMenuImage = false;
    document.getElementById('removeItemImage').disabled = !item.imageUrl;
    setMenuImagePreview('editItemImagePreview', item.imageUrl || '', '目前沒有圖片');
    document.getElementById('menuEditOverlay').classList.add('open');
    setTimeout(function(){ document.getElementById('editItemName').focus(); }, 0);
  }

  function closeMenuEditor(){
    editingMenuItemId = null;
    removeEditingMenuImage = false;
    document.getElementById('editItemImage').value = '';
    document.getElementById('menuEditOverlay').classList.remove('open');
  }

  function saveMenuItemChanges(){
    if(!editingMenuItemId || !menuItems[editingMenuItemId]) return;
    var category = document.getElementById('editItemCategory').value.trim();
    var name = document.getElementById('editItemName').value.trim();
    var price = Number(document.getElementById('editItemPrice').value);
    var serviceType = document.getElementById('editItemServiceType').value || 'food';
    var serviceStaffId = document.getElementById('editItemServiceStaff').value || '';
    var note = document.getElementById('editItemNote').value.trim();
    var addonLabel = document.getElementById('editItemAddonLabel').value.trim();
    var addonPriceText = document.getElementById('editItemAddonPrice').value;
    var addonPrice = addonPriceText === '' ? 0 : Number(addonPriceText);
    var available = document.getElementById('editItemAvailable').checked;
    var stockEnabled = document.getElementById('editItemStockEnabled').checked;
    var stockRemaining = Number(document.getElementById('editItemStockRemaining').value || 0);
    var imageFile = document.getElementById('editItemImage').files[0] || null;
    var oldImageStoragePath = menuItems[editingMenuItemId].imageStoragePath || '';

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
    if(isAssignableServiceType(serviceType)&&serviceStaffId){
      data.serviceStaffId=serviceStaffId;
      data.serviceStaffName=(staffRoster[serviceStaffId]||{}).name||'未命名女僕';
    }else{
      delete data.serviceStaffId;
      delete data.serviceStaffName;
    }
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
    var imagePromise = imageFile ? uploadMenuImage(id, imageFile) : Promise.resolve(null);
    imagePromise.then(function(uploadedImage){
      if(uploadedImage){
        data.imageUrl = uploadedImage.imageUrl;
        data.imageStoragePath = uploadedImage.imageStoragePath;
        data.imageUpdatedAt = Date.now();
      }else if(removeEditingMenuImage){
        delete data.imageUrl;
        delete data.imageStoragePath;
        delete data.imageUpdatedAt;
      }
      return menuRef.child(id).set(data);
    }).then(function(){
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
      if(removeEditingMenuImage && oldImageStoragePath){
        return storage.ref(oldImageStoragePath).delete().catch(function(error){
          if(error.code !== 'storage/object-not-found') console.warn('舊菜單圖片刪除失敗', error);
        });
      }
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
      if(err && /^menu-image-/.test(err.message || '')) message = '料理圖片處理失敗，請改用 JPG、PNG 或 WebP 並確認檔案小於 12MB。';
      if(err && err.code && String(err.code).indexOf('storage/')===0) message = '料理圖片上傳失敗，請先發布本版本附帶的 Firebase Storage 規則後再試。';
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
          + (item.imageUrl ? '<div class="menu-manage-image"><img src="'+escapeAttr(item.imageUrl)+'" alt=""></div>' : '')
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
          var itemId = btn.getAttribute('data-remove-item');
          var item = menuItems[itemId] || {};
          menuRef.child(itemId).remove().then(function(){
            if(item.imageStoragePath) return storage.ref(item.imageStoragePath).delete().catch(function(error){
              if(error.code !== 'storage/object-not-found') console.warn('菜單圖片刪除失敗', error);
            });
          });
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
    var serviceStaffId = document.getElementById('newItemServiceStaff').value || '';
    var imageFile = document.getElementById('newItemImage').files[0] || null;

    if(!category || !name || !price || price < 0){
      alert('請至少填寫分類、品名跟價格');
      return;
    }
    var maxSortOrder = Object.keys(menuItems).reduce(function(max,id){ return Math.max(max, Number(menuItems[id].sortOrder||0)); }, 0);
    var data = { category:category, name:name, price:price, serviceType:serviceType, available:true, sortOrder:maxSortOrder+1 };
    if(isAssignableServiceType(serviceType)&&serviceStaffId){data.serviceStaffId=serviceStaffId;data.serviceStaffName=(staffRoster[serviceStaffId]||{}).name||'未命名女僕';}
    if(note) data.note = note;
    if(addonLabel && addonPrice){ data.addonLabel = addonLabel; data.addonPrice = addonPrice; }

    var key = menuRef.push().key;
    var button = this;
    button.disabled = true;
    button.textContent = imageFile ? '圖片上傳中…' : '新增中…';
    uploadMenuImage(key, imageFile).then(function(uploadedImage){
      if(uploadedImage){
        data.imageUrl = uploadedImage.imageUrl;
        data.imageStoragePath = uploadedImage.imageStoragePath;
        data.imageUpdatedAt = Date.now();
      }
      return menuRef.child(key).set(data);
    }).then(function(){
      document.getElementById('newItemCategory').value = '';
      document.getElementById('newItemName').value = '';
      document.getElementById('newItemPrice').value = '';
      document.getElementById('newItemNote').value = '';
      document.getElementById('newItemAddonLabel').value = '';
      document.getElementById('newItemAddonPrice').value = '';
      document.getElementById('newItemServiceType').value = 'food';
      document.getElementById('newItemImage').value = '';
      setMenuImagePreview('newItemImagePreview', '', '尚未選擇圖片');
      renderServiceStaffOptions();
    }).catch(function(error){
      console.error('新增菜單與圖片失敗', error);
      var message = error && error.code && String(error.code).indexOf('storage/')===0
        ? '圖片上傳失敗，請確認 Firebase Storage 規則已發布。'
        : '新增菜單失敗，請確認圖片格式與網路連線後再試。';
      alert(message);
    }).finally(function(){
      button.disabled = false;
      button.textContent = '新增到菜單';
    });
  });

  document.getElementById('newItemImage').addEventListener('change', function(){
    previewMenuImageFile(this, 'newItemImagePreview', '尚未選擇圖片');
  });
  document.getElementById('editItemImage').addEventListener('change', function(){
    removeEditingMenuImage = false;
    document.getElementById('removeItemImage').disabled = false;
    previewMenuImageFile(this, 'editItemImagePreview', '目前沒有圖片');
  });
  document.getElementById('removeItemImage').addEventListener('click', function(){
    removeEditingMenuImage = true;
    document.getElementById('editItemImage').value = '';
    this.disabled = true;
    setMenuImagePreview('editItemImagePreview', '', '儲存後移除圖片');
  });

  document.getElementById('newItemServiceType').addEventListener('change',renderServiceStaffOptions);
  document.getElementById('editItemServiceType').addEventListener('change',renderServiceStaffOptions);

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
    staffSchedules = Object.assign({}, legacyStaffSchedules);
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

  function renderDutySummary(overrideIds, overrideDate, overrideReservationIds){
    var el = document.getElementById('dutySummaryText');
    if(!el) return;
    var selectedDate = overrideDate || document.getElementById('onDutyDate').value.trim() || todayKey();
    var schedule = staffSchedules[selectedDate];
    var ids = Array.isArray(overrideIds)
      ? overrideIds
      : (schedule && schedule.staffIds ? schedule.staffIds : []);
    var reservationIds = Array.isArray(overrideReservationIds)
      ? overrideReservationIds
      : (schedule && Array.isArray(schedule.reservationStaffIds) ? schedule.reservationStaffIds : ids);
    var names = ids.map(function(id){
      return staffRoster[id] && staffRoster[id].name;
    }).filter(Boolean);
    if(names.length){
      el.textContent = selectedDate+'：'+names.join('、')+'｜可指名 '+reservationIds.length+' 位';
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
    var reservationChecked = document.querySelectorAll('#reservationStaffCheckList input[type=checkbox]:checked');
    var reservationIds = Array.prototype.map.call(reservationChecked, function(cb){ return cb.getAttribute('data-reservation-staff-id'); })
      .filter(function(id){ return ids.indexOf(id)>-1; });
    var date = document.getElementById('onDutyDate').value.trim() || todayKey();
    return {date:date, staffIds:ids, reservationStaffIds:reservationIds, updatedAt:Date.now()};
  }

  function persistSchedule(data){
    if(!isConfigured) return Promise.resolve();
    rememberScheduleDate(data.date);
    setScheduleSaveStatus('正在同步至所有頁面…', 'saving');
    return staffSchedulesRef.child(data.date).set(data).then(function(){
      staffSchedules[data.date] = data;
      setScheduleSaveStatus('已同步至所有頁面', 'saved');
      if(data.date===currentBusinessDate()){
        renderCurrentStaffSelect();
        renderReception();
        renderOrders();
      }
    }).catch(function(err){
      console.error('Schedule sync failed', err);
      var denied = err && (err.code === 'PERMISSION_DENIED' || /permission/i.test(String(err.message || '')));
      setScheduleSaveStatus(denied ? '登入權限已失效，請重新登入後重試' : '同步失敗，請按「立即儲存」重試', 'error');
    });
  }

  function queueScheduleAutoSave(){
    var data = collectScheduleForm();
    renderDutySummary(data.staffIds, data.date, data.reservationStaffIds);
    setScheduleSaveStatus('變更尚未送出…', 'saving');
    if(scheduleSaveTimer) clearTimeout(scheduleSaveTimer);
    scheduleSaveTimer = setTimeout(function(){ persistSchedule(data); }, 450);
  }

  function renderStaffCheckList(){
    renderDutySummary();
    var el = document.getElementById('staffCheckList');
    var reservationEl = document.getElementById('reservationStaffCheckList');
    var keys = staffSortKeys();
    if(keys.length===0){
      el.innerHTML = '尚未建立店員名單';
      if(reservationEl) reservationEl.innerHTML = '尚未建立店員名單';
      return;
    }
    var selectedDate = document.getElementById('onDutyDate').value.trim() || todayKey();
    var selectedSchedule = staffSchedules[selectedDate];
    var currentOnDuty = selectedSchedule && selectedSchedule.staffIds ? selectedSchedule.staffIds : [];
    var currentReservation = selectedSchedule && Array.isArray(selectedSchedule.reservationStaffIds)
      ? selectedSchedule.reservationStaffIds
      : currentOnDuty.slice();
    var html = '';
    var reservationHtml = '';
    keys.forEach(function(k){
      var s = staffRoster[k];
      var checked = currentOnDuty.indexOf(k) > -1 ? 'checked' : '';
      var canReserve = currentOnDuty.indexOf(k) > -1;
      var reservationChecked = canReserve && currentReservation.indexOf(k) > -1 ? 'checked' : '';
      var photoInner = s.photo ? '<img src="'+escapeAttr(s.photo)+'" alt="">' : escapeHtml((s.name || '?').slice(0,1));
      html += '<div class="staff-check"><input type="checkbox" data-staff-id="'+k+'" '+checked+'>'
        + '<div class="staff-check-photo">'+photoInner+'</div>'
        + '<label>'+escapeHtml(s.name)+' <span style="color:var(--parchment-dim);font-size:11px;">· '+escapeHtml(s.role||'')+'</span></label>'
        + '</div>';
      reservationHtml += '<div class="staff-check '+(canReserve?'':'is-disabled')+'"><input type="checkbox" data-reservation-staff-id="'+k+'" '+reservationChecked+' '+(canReserve?'':'disabled')+'>'
        + '<div class="staff-check-photo">'+photoInner+'</div>'
        + '<label>'+escapeHtml(s.name)+' <span style="color:var(--parchment-dim);font-size:11px;">· '+(canReserve?'可設定':'未排入當日出勤')+'</span></label>'
        + '</div>';
    });
    el.innerHTML = html;
    if(reservationEl) reservationEl.innerHTML = reservationHtml;
    el.querySelectorAll('input[type=checkbox][data-staff-id]').forEach(function(cb){
      cb.addEventListener('change', function(){
        var reservationCb = document.querySelector('#reservationStaffCheckList [data-reservation-staff-id="'+cb.getAttribute('data-staff-id')+'"]');
        if(reservationCb){
          reservationCb.disabled = !cb.checked;
          reservationCb.closest('.staff-check').classList.toggle('is-disabled', !cb.checked);
          if(!cb.checked) reservationCb.checked = false;
        }
        queueScheduleAutoSave();
      });
    });
    if(reservationEl) reservationEl.querySelectorAll('input[type=checkbox][data-reservation-staff-id]').forEach(function(cb){
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
    var selectedDate = this.value.trim();
    if(!isScheduleDate(selectedDate)){
      selectedDate = rememberedScheduleDate() || todayKey();
      this.value = selectedDate;
    }
    rememberScheduleDate(selectedDate);
    setScheduleSaveStatus('勾選後會自動儲存', '');
    renderStaffCheckList();
  });

  // ---------- staff portrait upload + independent website previews ----------
  var PHOTO_LONG_EDGE = 2000;
  var PHOTO_OUTPUT_QUALITY = 0.90;
  var photoEditStaffId = null;
  var photoImg = null;
  var photoHasNewFile = false;
  var photoModes = ['Directory','Profile'];

  function photoNumber(value, fallback, min, max){
    value = Number(value);
    if(!isFinite(value)) value = fallback;
    return Math.max(min, Math.min(max, value));
  }
  function photoLayoutFor(entry, mode){
    var saved = entry && entry.photoLayout && entry.photoLayout[mode.toLowerCase()] || {};
    return {
      x:photoNumber(saved.x,50,0,100),
      y:photoNumber(saved.y,50,0,100),
      zoom:photoNumber(saved.zoom,100,100,220)
    };
  }
  function setPhotoModeControls(mode, values){
    document.getElementById('photo'+mode+'X').value = values.x;
    document.getElementById('photo'+mode+'Y').value = values.y;
    document.getElementById('photo'+mode+'Zoom').value = values.zoom;
    updatePhotoPreview(mode);
  }
  function currentPhotoMode(mode){
    return {
      x:photoNumber(document.getElementById('photo'+mode+'X').value,50,0,100),
      y:photoNumber(document.getElementById('photo'+mode+'Y').value,50,0,100),
      zoom:photoNumber(document.getElementById('photo'+mode+'Zoom').value,100,100,220)
    };
  }
  function updatePhotoPreview(mode){
    var values = currentPhotoMode(mode);
    var img = document.getElementById('photo'+mode+'Preview');
    document.getElementById('photo'+mode+'XValue').textContent = values.x+'%';
    document.getElementById('photo'+mode+'YValue').textContent = values.y+'%';
    document.getElementById('photo'+mode+'ZoomValue').textContent = values.zoom+'%';
    img.style.objectPosition = values.x+'% '+values.y+'%';
    img.style.transformOrigin = values.x+'% '+values.y+'%';
    img.style.transform = 'scale('+(values.zoom/100)+')';
  }
  function showPhotoInPreviews(src){
    photoModes.forEach(function(mode){
      var img = document.getElementById('photo'+mode+'Preview');
      img.src = src || '';
      img.style.visibility = src ? 'visible' : 'hidden';
      updatePhotoPreview(mode);
    });
  }
  function openPhotoEditor(staffId){
    var entry = staffRoster[staffId] || {};
    photoEditStaffId = staffId;
    photoImg = null;
    photoHasNewFile = false;
    document.getElementById('photoFileInput').value = '';
    document.getElementById('photoEditorStaffName').textContent = entry.name || '未命名成員';
    setPhotoModeControls('Directory',photoLayoutFor(entry,'directory'));
    setPhotoModeControls('Profile',photoLayoutFor(entry,'profile'));
    showPhotoInPreviews(entry.photo || '');
    if(entry.photo){
      var im = new Image();
      im.onload = function(){ photoImg = im; };
      im.src = entry.photo;
    }
    document.getElementById('photoModalOverlay').classList.add('open');
  }
  function closePhotoEditor(){
    document.getElementById('photoModalOverlay').classList.remove('open');
    photoEditStaffId = null;
    photoImg = null;
    photoHasNewFile = false;
  }
  var fileInputEl = document.getElementById('photoFileInput');
  if(fileInputEl) fileInputEl.addEventListener('change', function(e){
    var file = e.target.files && e.target.files[0];
    if(!file) return;
    if(!/^image\/(jpeg|png|webp)$/i.test(file.type)){ alert('請選擇 JPG、PNG 或 WebP 圖片。'); e.target.value=''; return; }
    var reader = new FileReader();
    reader.onload = function(ev){
      var im = new Image();
      im.onload = function(){ photoImg = im; photoHasNewFile = true; showPhotoInPreviews(im.src); };
      im.onerror = function(){ alert('照片讀取失敗，請改用另一張圖片。'); };
      im.src = ev.target.result;
    };
    reader.readAsDataURL(file);
  });
  photoModes.forEach(function(mode){
    ['X','Y','Zoom'].forEach(function(part){
      var input = document.getElementById('photo'+mode+part);
      if(input) input.addEventListener('input',function(){ updatePhotoPreview(mode); });
    });
  });
  var cancelBtn = document.getElementById('photoModalCancel');
  if(cancelBtn) cancelBtn.addEventListener('click', closePhotoEditor);
  var saveBtn = document.getElementById('photoModalSave');
  if(saveBtn) saveBtn.addEventListener('click', function(){
    if(!photoEditStaffId){ closePhotoEditor(); return; }
    var staffId = photoEditStaffId;
    var update = {photoLayout:{directory:currentPhotoMode('Directory'),profile:currentPhotoMode('Profile')},photoLayoutUpdatedAt:Date.now()};
    saveBtn.disabled = true;
    saveBtn.textContent = photoHasNewFile ? '上傳原比例照片中…' : '儲存位置中…';
    function finishSave(promise){
      promise.then(function(){
        saveBtn.disabled=false;saveBtn.textContent='儲存照片與位置';closePhotoEditor();
      }).catch(function(error){
        saveBtn.disabled=false;saveBtn.textContent='儲存照片與位置';
        alert('照片設定儲存失敗，請確認 Firebase 權限與網路連線。'+(error&&error.message?'\n'+error.message:''));
      });
    }
    if(!photoHasNewFile){ finishSave(staffRosterRef.child(staffId).update(update)); return; }
    if(!photoImg){ saveBtn.disabled=false;saveBtn.textContent='儲存照片與位置';alert('照片尚未載入完成。');return; }
    var ratio = Math.min(1,PHOTO_LONG_EDGE/Math.max(photoImg.naturalWidth||photoImg.width,photoImg.naturalHeight||photoImg.height));
    var out = document.createElement('canvas');
    out.width = Math.max(1,Math.round((photoImg.naturalWidth||photoImg.width)*ratio));
    out.height = Math.max(1,Math.round((photoImg.naturalHeight||photoImg.height)*ratio));
    var octx = out.getContext('2d');
    octx.imageSmoothingEnabled = true;
    octx.imageSmoothingQuality = 'high';
    octx.drawImage(photoImg,0,0,out.width,out.height);
    out.toBlob(function(blob){
      if(!blob){saveBtn.disabled=false;saveBtn.textContent='儲存照片與位置';alert('照片轉換失敗，請改用另一張圖片。');return;}
      var fileRef=storage.ref('staff-photos/'+staffId+'.webp');
      fileRef.put(blob,{contentType:'image/webp',cacheControl:'public,max-age=86400'}).then(function(snapshot){return snapshot.ref.getDownloadURL();}).then(function(url){
        update.photo=url;update.photoUpdatedAt=Date.now();
        return staffRosterRef.child(staffId).update(update);
      }).then(function(){saveBtn.disabled=false;saveBtn.textContent='儲存照片與位置';closePhotoEditor();}).catch(function(error){saveBtn.disabled=false;saveBtn.textContent='儲存照片與位置';alert('照片儲存失敗，請確認 Firebase Storage 規則已發布。'+(error&&error.message?'\n'+error.message:''));});
    },'image/webp',PHOTO_OUTPUT_QUALITY);
  });

  // ---------- open dates ----------
  function isActiveReservation(reservation){
    return !!reservation && reservation.status!=='cancelled';
  }

  function renderOpenDateManageList(){
    var el = document.getElementById('openDateManageList');
    var keys = Object.keys(openDates).sort();
    if(keys.length===0){ el.innerHTML = '<span style="color:var(--parchment-dim);font-size:12px;">尚未開放任何日期</span>'; return; }
    var reservedDates = {};
    Object.keys(reservations).forEach(function(id){
      var reservation=reservations[id];
      if(isActiveReservation(reservation)) reservedDates[reservation.date] = true;
    });
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
      btn.addEventListener('click', function(){
        var date=btn.getAttribute('data-remove-date');
        if(!confirm('確定要取消開放 '+date+' 的預約嗎？\n既有預約紀錄不會被刪除。')) return;
        openDatesRef.child(date).remove();
      });
    });
  }

  document.getElementById('addOpenDate').addEventListener('click', function(){
    if(!isConfigured) return;
    var date = document.getElementById('newOpenDate').value.trim();
    if(!date) return;
    if(!/^\d{4}-\d{2}-\d{2}$/.test(date)){ alert('請選擇有效的預約日期。'); return; }
    openDatesRef.child(date).set(true);
    document.getElementById('newOpenDate').value = '';
  });

  // ---------- reservations list ----------
  function renderAdminReservations(){
    var el = document.getElementById('adminReservationList');
    var keys = Object.keys(reservations);
    if(keys.length===0){ el.innerHTML = '尚無預約'; renderTodayOverview(); return; }
    var arr = keys.map(function(id){ return Object.assign({id:id},reservations[id]||{}); });
    arr.sort(function(a,b){
      var byDate=String(a.date||'').localeCompare(String(b.date||''));
      if(byDate) return byDate;
      return Number(a.status==='cancelled')-Number(b.status==='cancelled');
    });
    var html = '<div class="reservation-admin-list">';
    arr.forEach(function(r){
      var cancelled=r.status==='cancelled';
      var songs = (r.songs||[]).map(function(s){ return s.title; }).join('、') || '（未選歌曲）';
      html += '<div class="reservation-admin-row'+(cancelled?' is-cancelled':'')+'">'
        + '<div class="reservation-admin-head">'
        + '<span>'+escapeHtml(r.date||'日期未填')+' · '+escapeHtml(r.name||'未填姓名')+' · '+escapeHtml(String(r.size||'—'))+'位'+(r.maid?' · 指名：'+escapeHtml(r.maid):'')+(r.note?' · '+escapeHtml(r.note):'')+'</span>'
        + '<span class="reservation-admin-actions">'+(cancelled?'<span class="reservation-cancelled-badge">已取消</span>':notificationHtml(r, 'reservation', r.id)+' <button class="btn ghost small reservation-cancel-button" type="button" data-cancel-reservation="'+escapeAttr(r.id)+'">取消預約</button>')+'</span>'
        + '</div>'
        + '<div class="reservation-admin-songs">點歌：'+escapeHtml(songs)+'</div>'
        + '</div>';
    });
    html += '</div>';
    el.innerHTML = html;
    renderTodayOverview();
    bindNotificationRetries(el);
    el.querySelectorAll('[data-cancel-reservation]').forEach(function(btn){
      btn.addEventListener('click', function(){
        var id=btn.getAttribute('data-cancel-reservation');
        var reservation=reservations[id]||{};
        var summary=(reservation.date||'未填日期')+'・'+(reservation.name||'未填姓名');
        if(!confirm('確定要取消 '+summary+' 的預約嗎？\n\n紀錄會保留，該日期可再次接受預約。')) return;
        btn.disabled=true;
        reservationsRef.child(id).update({
          status:'cancelled',
          cancelledAt:Date.now(),
          updatedAt:Date.now(),
          cancelledByUid:currentAuthUser?currentAuthUser.uid:''
        }).catch(function(){
          btn.disabled=false;
          alert('取消預約失敗，請確認登入權限與連線後再試。');
        });
      });
    });
  }

})();
