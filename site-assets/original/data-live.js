
(function(){
  // 讀取預約後台同一個 Firebase 專案的女僕頭貼資料，若有自訂頭貼則覆蓋官網原本的照片
  var firebaseConfig = {
    apiKey: "AIzaSyAPIpmaLgXp3TVTV7y-yrH63xkMtAuYMSQ",
    authDomain: "lephemere-queue-c38d5.firebaseapp.com",
    databaseURL: "https://lephemere-queue-c38d5-default-rtdb.asia-southeast1.firebasedatabase.app",
    projectId: "lephemere-queue-c38d5",
    storageBucket: "lephemere-queue-c38d5.firebasestorage.app",
    messagingSenderId: "35595928973",
    appId: "1:35595928973:web:36a8a4695fd293061d29c4"
  };
  try{
    firebase.initializeApp(firebaseConfig);
    var db = firebase.database();
    var liveStaffRoster = {};
    var liveStaffSchedules = {};
    var liveLegacyStaffSchedules = {};
    var liveOperationStatus = {isOpen:false,businessDate:''};
    var siteMusicAudio = document.getElementById('siteMusicAudio');
    var siteMusicPlayer = document.getElementById('siteMusicPlayer');
    var siteMusicToggle = document.getElementById('siteMusicToggle');
    var siteMusicIcon = document.getElementById('siteMusicIcon');
    var siteMusicEyebrow = document.getElementById('siteMusicEyebrow');
    var siteMusicTitle = document.getElementById('siteMusicTitle');
    var siteMusicState = document.getElementById('siteMusicState');
    var siteMusicVolume = document.getElementById('siteMusicVisitorVolume');
    var siteMusicCollapse = document.getElementById('siteMusicCollapse');
    var siteMusicSource = '';
    var visitorMusicVolume = null;
    try{
      var savedMusicVolume = localStorage.getItem('lephemereSiteMusicVolume');
      if(savedMusicVolume !== null) visitorMusicVolume = Math.min(1,Math.max(0,Number(savedMusicVolume)));
    }catch(e){}

    function updateSiteMusicPlayerState(message){
      if(!siteMusicAudio || !siteMusicToggle) return;
      var playing = !siteMusicAudio.paused && !siteMusicAudio.ended;
      var collapsed = !!(siteMusicPlayer && siteMusicPlayer.classList.contains('is-collapsed'));
      if(siteMusicEyebrow) siteMusicEyebrow.textContent = playing ? 'NOW PLAYING' : 'CAFE MUSIC';
      if(collapsed){
        siteMusicIcon.textContent = '♫';
        siteMusicToggle.removeAttribute('aria-pressed');
        siteMusicToggle.setAttribute('aria-expanded','false');
        siteMusicToggle.setAttribute('aria-label','展開音樂播放器');
      }else{
        siteMusicIcon.textContent = playing ? 'Ⅱ' : '▶';
        siteMusicToggle.setAttribute('aria-pressed',String(playing));
        siteMusicToggle.setAttribute('aria-expanded','true');
        siteMusicToggle.setAttribute('aria-label',playing ? '暫停背景音樂' : '播放背景音樂');
      }
      siteMusicState.textContent = message || (playing ? '播放中' : '點擊播放');
    }

    function setSiteMusicCollapsed(collapsed){
      if(!siteMusicPlayer) return;
      siteMusicPlayer.classList.toggle('is-collapsed',collapsed);
      updateSiteMusicPlayerState();
    }

    function pauseSiteMusic(message){
      if(siteMusicAudio) siteMusicAudio.pause();
      try{ localStorage.setItem('lephemereSiteMusicWanted','off'); }catch(e){}
      updateSiteMusicPlayerState(message || '已暫停');
    }

    function playSiteMusic(){
      if(!siteMusicAudio || !siteMusicSource) return;
      siteMusicAudio.play().then(function(){
        try{ localStorage.setItem('lephemereSiteMusicWanted','on'); }catch(e){}
        updateSiteMusicPlayerState('播放中');
      }).catch(function(){
        updateSiteMusicPlayerState('請點擊播放');
      });
    }

    function applySiteMusicSettings(value){
      value = value && typeof value === 'object' ? value : {};
      var enabled = value.enabled === true;
      var url = String(value.url || '').trim();
      var validUrl = /^https:\/\//i.test(url);
      if(!siteMusicPlayer || !siteMusicAudio) return;
      if(!enabled || !validUrl){
        siteMusicAudio.pause();
        siteMusicPlayer.hidden = true;
        siteMusicSource = '';
        siteMusicAudio.removeAttribute('src');
        siteMusicAudio.load();
        return;
      }
      siteMusicPlayer.hidden = false;
      siteMusicTitle.textContent = String(value.title || '曇時店歌').trim() || '曇時店歌';
      var wasPlaying = !siteMusicAudio.paused && !!siteMusicSource;
      if(siteMusicSource !== url){
        siteMusicSource = url;
        siteMusicAudio.src = url;
        siteMusicAudio.load();
      }
      var defaultVolume = Math.min(1,Math.max(.05,Number(value.volume || .3)));
      var volume = visitorMusicVolume === null ? defaultVolume : visitorMusicVolume;
      siteMusicAudio.volume = volume;
      siteMusicVolume.value = String(Math.round(volume*100));
      var wantsMusic = false;
      try{ wantsMusic = localStorage.getItem('lephemereSiteMusicWanted') === 'on'; }catch(e){}
      if(wasPlaying || wantsMusic) playSiteMusic();
      else updateSiteMusicPlayerState('點擊播放');
    }

    if(siteMusicToggle){
      siteMusicToggle.addEventListener('click',function(){
        if(siteMusicPlayer && siteMusicPlayer.classList.contains('is-collapsed')){
          setSiteMusicCollapsed(false);
          return;
        }
        if(siteMusicAudio.paused) playSiteMusic();
        else pauseSiteMusic();
      });
    }
    if(siteMusicCollapse){
      siteMusicCollapse.addEventListener('click',function(){ setSiteMusicCollapsed(true); });
    }
    if(siteMusicVolume){
      siteMusicVolume.addEventListener('input',function(){
        visitorMusicVolume = Math.min(1,Math.max(0,Number(this.value || 0)/100));
        siteMusicAudio.volume = visitorMusicVolume;
        try{ localStorage.setItem('lephemereSiteMusicVolume',String(visitorMusicVolume)); }catch(e){}
      });
    }
    if(siteMusicAudio){
      siteMusicAudio.addEventListener('play',function(){ updateSiteMusicPlayerState('播放中'); });
      siteMusicAudio.addEventListener('pause',function(){ updateSiteMusicPlayerState('已暫停'); });
      siteMusicAudio.addEventListener('waiting',function(){ updateSiteMusicPlayerState('載入中…'); });
      siteMusicAudio.addEventListener('error',function(){ updateSiteMusicPlayerState('音樂暫時無法播放'); });
    }

    function localDateKey(){
      var d = new Date();
      return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
    }

    function shiftDateLabel(dateKey){
      var parts = String(dateKey || '').split('-');
      if(parts.length!==3) return dateKey || '';
      var weekdays = ['日','一','二','三','四','五','六'];
      var date = new Date(Number(parts[0]),Number(parts[1])-1,Number(parts[2]));
      return parts[1]+' / '+parts[2]+'（'+weekdays[date.getDay()]+'）';
    }

    function rebuildLiveStaffSchedules(){
      liveStaffSchedules = Object.assign({}, liveLegacyStaffSchedules);
    }

    function renderHomeShift(){
      var list = document.getElementById('homeShiftList');
      var dateNode = document.getElementById('homeShiftDate');
      var labelNode = document.getElementById('homeShiftLabel');
      var shiftPanel = document.getElementById('homeShift');
      if(!list || !dateNode || !labelNode) return;
      var today = localDateKey();
      var activeDate = liveOperationStatus.isOpen && /^\d{4}-\d{2}-\d{2}$/.test(liveOperationStatus.businessDate||'')
        ? liveOperationStatus.businessDate
        : '';
      var dates = Object.keys(liveStaffSchedules).filter(function(date){
        var schedule = liveStaffSchedules[date];
        return (date>=today || date===activeDate) && schedule && Array.isArray(schedule.staffIds) && schedule.staffIds.length;
      }).sort();
      if(!dates.length){
        if(shiftPanel) shiftPanel.dataset.castState = 'pending';
        labelNode.textContent = '出勤名單';
        dateNode.textContent = '尚未公布';
        list.innerHTML = '<span class="home-shift-empty">本次出勤名單尚未公布，請留意最新營業公告。</span>';
        return;
      }
      var selectedDate = activeDate && dates.indexOf(activeDate)>-1 ? activeDate : dates[0];
      var schedule = liveStaffSchedules[selectedDate] || {};
      var staff = schedule.staffIds.map(function(id){ return {id:id,data:liveStaffRoster[id]}; }).filter(function(item){
        return item.data && item.data.name && item.data.websiteVisible !== false;
      });
      var isCurrentShift = selectedDate===activeDate || selectedDate===today;
      if(shiftPanel) shiftPanel.dataset.castState = isCurrentShift ? 'current' : 'next';
      labelNode.textContent = selectedDate===activeDate ? '本場出勤' : (selectedDate===today ? '今日出勤' : '下一次出勤');
      dateNode.textContent = shiftDateLabel(selectedDate);
      if(!staff.length){
        list.innerHTML = '<span class="home-shift-empty">正在載入女僕名單，請稍候片刻。</span>';
        return;
      }
      var localPhotoFallbacks = {
        '夏沐':'assets/staff-xiamu.jpg',
        '彌亞璃卡':'assets/staff-miarica.webp',
        '小顏':'assets/staff-xiaoyan.webp',
        '玥紅雪':'assets/staff-yuehongxue.webp',
        'Naipa':'assets/staff-naipa.webp',
        '蒼':'assets/staff-cang.jpg'
      };
      var fragment = document.createDocumentFragment();
      staff.forEach(function(item){
        var member = item.data;
        var button = document.createElement('button');
        button.type = 'button';
        button.className = 'home-shift-person';
        button.setAttribute('aria-label','查看 '+member.name+' 的介紹');
        button.title = '前往成員名冊查看 '+member.name;
        var copy = document.createElement('span');
        copy.className = 'home-shift-copy';
        var name = document.createElement('strong');
        name.textContent = member.name;
        var role = document.createElement('small');
        role.textContent = member.role || '駐店成員';
        copy.appendChild(name);
        copy.appendChild(role);
        var avatar = document.createElement('span');
        avatar.className = 'home-shift-avatar';
        var uploadedChibi = String(member.chibiPhoto || '').trim();
        var chibiPhotoUrl = /^https:\/\//i.test(uploadedChibi) ? uploadedChibi :
          (window.ephemereChibiCast ? window.ephemereChibiCast.get(member.name) : '');
        var rawPhotoUrl = String(member.photo || '').trim();
        var remotePhotoUrl = /^(?:https:\/\/|data:image\/(?:png|jpe?g|webp|gif);base64,)/i.test(rawPhotoUrl) ? rawPhotoUrl : '';
        var fallbackPhotoUrl = localPhotoFallbacks[String(member.name || '').trim()] || '';
        var regularPhotoUrl = remotePhotoUrl || fallbackPhotoUrl;
        var photoUrl = chibiPhotoUrl || regularPhotoUrl;
        if(photoUrl){
          var avatarImage = document.createElement('img');
          var savedAvatarLayout = member.photoLayout && member.photoLayout.directory || {};
          var avatarValue = function(value,fallback,min,max){
            var number = Number(value);
            return Math.max(min,Math.min(max,Number.isFinite(number)?number:fallback));
          };
          var avatarLayout = {
            x:avatarValue(savedAvatarLayout.x,50,0,100),
            y:avatarValue(savedAvatarLayout.y,50,0,100),
            zoom:avatarValue(savedAvatarLayout.zoom,100,100,220)
          };
          avatarImage.src = photoUrl;
          avatarImage.alt = '';
          avatarImage.loading = 'lazy';
          avatarImage.decoding = 'async';
          avatarImage.draggable = false;
          if(chibiPhotoUrl){
            avatar.classList.add('has-chibi');
          }else{
            avatarImage.style.objectPosition = avatarLayout.x+'% '+avatarLayout.y+'%';
            avatarImage.style.transformOrigin = avatarLayout.x+'% '+avatarLayout.y+'%';
            avatarImage.style.transform = 'scale('+(avatarLayout.zoom/100)+')';
          }
          avatarImage.addEventListener('error',function(){
            if(chibiPhotoUrl && regularPhotoUrl && avatarImage.getAttribute('src')!==regularPhotoUrl){
              avatar.classList.remove('has-chibi');
              avatarImage.src = regularPhotoUrl;
              avatarImage.style.objectPosition = avatarLayout.x+'% '+avatarLayout.y+'%';
              avatarImage.style.transformOrigin = avatarLayout.x+'% '+avatarLayout.y+'%';
              avatarImage.style.transform = 'scale('+(avatarLayout.zoom/100)+')';
              return;
            }
            avatarImage.remove();
            avatar.textContent = member.name.trim().slice(0,1) || '曇';
          });
          avatar.appendChild(avatarImage);
        }else{
          avatar.textContent = member.name.trim().slice(0,1) || '曇';
        }
        button.appendChild(avatar);
        button.appendChild(copy);
        button.addEventListener('click',function(){
          if(!window.ephemereStaffDirectory || !window.ephemereStaffDirectory.openByName(member.name)) location.hash = '#staff';
        });
        fragment.appendChild(button);
      });
      list.replaceChildren(fragment);
    }

    function formatGil(value){
      return Number(value || 0).toLocaleString('en-US') + ' Gil';
    }

    function renderSiteMenu(menu){
      var grid = document.getElementById('siteMenuGrid');
      if(!grid) return;
      if(!menu){
        grid.innerHTML = '<p class="menu-note" style="grid-column:1/-1;text-align:center;">目前尚未開放菜單，請稍後再查看。</p>';
        return;
      }

      var categoryOrder = [];
      var groups = {};
      function isLegacyPhotoMenuItem(item){
        var type=String(item&&item.type||'').toLowerCase();
        var source=String(item&&item.name||'')+' '+String(item&&item.category||'');
        return type==='polaroid'||type==='lens'||/拍立得|純拍|lens|個人攝影|專屬留影/i.test(source);
      }
      Object.keys(menu).sort(function(a,b){
        return Number(menu[a].sortOrder||0)-Number(menu[b].sortOrder||0);
      }).forEach(function(key){
        var item = menu[key];
        if(!item || !item.name || isLegacyPhotoMenuItem(item)) return;
        var category = item.category || '其他';
        if(!groups[category]){
          groups[category] = [];
          categoryOrder.push(category);
        }
        groups[category].push(item);
      });
      if(!categoryOrder.length){
        grid.innerHTML = '<p class="menu-note" style="grid-column:1/-1;text-align:center;">目前尚未開放菜單，請稍後再查看。</p>';
        return;
      }

      function splitCategoryLabel(category){
        var parts = String(category || '其他').split('※');
        return {
          title: (parts.shift() || '其他').trim(),
          note: parts.join('※').trim()
        };
      }

      var fragment = document.createDocumentFragment();
      categoryOrder.forEach(function(category){
        var items = groups[category];
        var categoryInfo = splitCategoryLabel(category);
        var isSet = /^Set\b/i.test(categoryInfo.title) || categoryInfo.title.indexOf('無菜單料理') !== -1;

        if(isSet){
          items.forEach(function(item){
            var block = document.createElement('div');
            block.className = 'set-block reveal in';

            var copy = document.createElement('div');
            var title = document.createElement('div');
            title.className = 'set-title';
            title.textContent = item.name;
            var description = document.createElement('div');
            description.className = 'set-desc';
            description.textContent = item.note || '內容依當晚安排為準。';
            copy.appendChild(title);
            copy.appendChild(description);

            var price = document.createElement('div');
            price.className = 'set-price';
            price.textContent = formatGil(item.price);
            block.appendChild(copy);
            block.appendChild(price);
            fragment.appendChild(block);
          });
          return;
        }

        var categoryBlock = document.createElement('div');
        categoryBlock.className = 'menu-cat reveal in';
        var heading = document.createElement('h3');
        heading.textContent = categoryInfo.title;
        categoryBlock.appendChild(heading);

        items.forEach(function(item){
          var row = document.createElement('div');
          row.className = 'menu-item';
          var name = document.createElement('span');
          name.className = 'name';
          name.textContent = item.name;
          var dots = document.createElement('span');
          dots.className = 'dots';
          var price = document.createElement('span');
          price.className = 'price';
          price.appendChild(document.createTextNode(formatGil(item.price)));
          var availabilityText = '';
          if(item.available===false) availabilityText = '暫停供應';
          else if(item.stockEnabled===true && Number(item.stockRemaining||0)<=0) availabilityText = '本次額滿';
          else if(item.stockEnabled===true) availabilityText = '剩餘 '+Number(item.stockRemaining||0)+' 份';
          if(availabilityText){
            var availability = document.createElement('small');
            availability.className = 'availability-copy';
            availability.textContent = availabilityText;
            price.appendChild(availability);
          }
          if(item.available===false || (item.stockEnabled===true && Number(item.stockRemaining||0)<=0)) row.classList.add('unavailable');
          row.appendChild(name);
          row.appendChild(dots);
          row.appendChild(price);
          categoryBlock.appendChild(row);
        });
        fragment.appendChild(categoryBlock);
      });

      grid.replaceChildren(fragment);
    }

    db.ref('lephemere/menu').on('value', function(snap){
      renderSiteMenu(snap.val());
    });

    db.ref('lephemere/staffRoster').on('value', function(snap){
      liveStaffRoster = snap.val() || {};
      if(window.ephemereStaffDirectory) window.ephemereStaffDirectory.syncRoster(liveStaffRoster);
      renderHomeShift();
    });

    var homeScheduleRef = null;
    var homeScheduleDate = '';
    function watchHomeSchedule(){
      var date = liveOperationStatus.businessDate || '';
      if(!/^\d{4}-\d{2}-\d{2}$/.test(date)) date = localDateKey();
      if(date === homeScheduleDate) return;
      if(homeScheduleRef) homeScheduleRef.off('value');
      homeScheduleDate = date;
      liveLegacyStaffSchedules = {};
      rebuildLiveStaffSchedules();
      renderHomeShift();
      var ref = db.ref('lephemere/staffSchedules').child(date);
      homeScheduleRef = ref;
      ref.on('value', function(snap){
        if(homeScheduleRef !== ref) return;
        liveLegacyStaffSchedules = {};
        if(snap.exists()) liveLegacyStaffSchedules[date] = snap.val();
        rebuildLiveStaffSchedules();
        renderHomeShift();
      });
    }

    db.ref('lephemere/operationStatus').on('value', function(snap){
      liveOperationStatus = snap.val() || {isOpen:false,businessDate:''};
      watchHomeSchedule();
      renderHomeShift();
    });

    db.ref('lephemere/todayStaff/_site/backgroundMusic').on('value', function(snap){
      applySiteMusicSettings(snap.val());
    });
  }catch(e){ /* 若離線或連線失敗，維持網站原本內建的照片 */ }
})();
