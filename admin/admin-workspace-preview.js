(function(){
  'use strict';

  var area = document.getElementById('adminArea');
  var preview = document.getElementById('guestWorkspacePreview');
  var select = document.getElementById('guestPreviewRecordSelect');
  if(!area || !preview || !select || typeof firebase === 'undefined') return;

  var mode = 'reception';
  var signedIn = false;
  var businessDate = localDateKey();
  var visits = {};
  var orders = {};
  var visitsQuery = null;
  var ordersQuery = null;
  var operationRef = null;
  var records = [];

  var statusLabels = {
    waiting:'候位中', assigned:'等待接待', serving:'接待中',
    pending:'待接單', preparing:'服務中', served:'服務中',
    completed:'已完成', cancelled:'已取消'
  };

  function localDateKey(){
    var now = new Date();
    var y = now.getFullYear();
    var m = String(now.getMonth()+1).padStart(2,'0');
    var d = String(now.getDate()).padStart(2,'0');
    return y+'-'+m+'-'+d;
  }

  function text(id,value){
    var el=document.getElementById(id);
    if(el) el.textContent=value==null?'':String(value);
  }

  function formatGil(value){
    return Number(value||0).toLocaleString('en-US')+' Gil';
  }

  function minutesSince(value){
    return Math.max(0,Math.floor((Date.now()-Number(value||Date.now()))/60000));
  }

  function normalizeItems(value){
    if(Array.isArray(value)) return value.filter(Boolean);
    if(value && typeof value==='object') return Object.keys(value).map(function(key){return value[key];}).filter(Boolean);
    return [];
  }

  function visitRecords(){
    var priority={waiting:0,assigned:1,serving:2};
    return Object.keys(visits).map(function(id){return Object.assign({id:id},visits[id]||{});})
      .filter(function(v){return v.businessDate===businessDate && priority[v.status]!==undefined;})
      .sort(function(a,b){
        var diff=priority[a.status]-priority[b.status];
        return diff || Number(a.createdAt||0)-Number(b.createdAt||0);
      });
  }

  function orderDate(order){
    if(order.businessDate) return order.businessDate;
    var stamp=Number(order.createdAt||0);
    if(!stamp) return '';
    var date=new Date(stamp);
    return date.getFullYear()+'-'+String(date.getMonth()+1).padStart(2,'0')+'-'+String(date.getDate()).padStart(2,'0');
  }

  function orderRecords(){
    var priority={pending:0,preparing:1,served:2};
    return Object.keys(orders).map(function(id){return Object.assign({id:id},orders[id]||{});})
      .filter(function(o){return orderDate(o)===businessDate && priority[o.status]!==undefined;})
      .sort(function(a,b){
        var diff=priority[a.status]-priority[b.status];
        return diff || Number(a.createdAt||0)-Number(b.createdAt||0);
      });
  }

  function recordLabel(record){
    if(mode==='reception') return (record.queueNumber||'候位')+' · '+(record.characterName||'未填角色名');
    return '#'+(record.orderNumber||'—')+' · '+(record.name||'未填主人名');
  }

  function renderSelect(){
    var previous=select.value;
    records=mode==='reception'?visitRecords():orderRecords();
    select.innerHTML='';
    if(!records.length){
      var emptyOption=document.createElement('option');
      emptyOption.value='';
      emptyOption.textContent=mode==='reception'?'目前沒有候位或接待中的主人':'目前沒有進行中的訂單';
      select.appendChild(emptyOption);
      select.disabled=true;
      renderCard(null);
      return;
    }
    records.forEach(function(record){
      var option=document.createElement('option');
      option.value=record.id;
      option.textContent=recordLabel(record);
      select.appendChild(option);
    });
    select.disabled=false;
    if(records.some(function(record){return record.id===previous;})) select.value=previous;
    renderCard(records.find(function(record){return record.id===select.value;})||records[0]);
  }

  function renderItems(items){
    var container=document.getElementById('guestPreviewItems');
    container.innerHTML='';
    items.forEach(function(item){
      var row=document.createElement('div');
      row.className='guest-preview-item';
      var name=document.createElement('span');
      var qty=document.createElement('span');
      name.textContent=item.name||item.label||'品項';
      qty.textContent='× '+Number(item.qty||1);
      row.appendChild(name);
      row.appendChild(qty);
      container.appendChild(row);
    });
  }

  function renderCard(record){
    var empty=document.getElementById('guestPreviewEmpty');
    var card=document.getElementById('guestPreviewCard');
    if(!record){
      card.hidden=true;
      empty.hidden=false;
      empty.textContent=mode==='reception'?'目前沒有候位或接待中的主人。':'目前沒有進行中的訂單。';
      return;
    }
    empty.hidden=true;
    card.hidden=false;
    text('guestPreviewStatus',statusLabels[record.status]||'處理中');
    if(mode==='reception'){
      text('guestPreviewTicket',record.queueNumber||'—');
      text('guestPreviewTitle',record.characterName||'未填角色名');
      var meta=[];
      if(record.world) meta.push('@ '+record.world);
      meta.push(Number(record.partySize||1)+' 人同行');
      meta.push((record.status==='waiting'?'已等候 ':'已進行 ')+minutesSince(record.createdAt)+' 分鐘');
      text('guestPreviewMeta',meta.join(' · '));
      renderItems([]);
      text('guestPreviewTotal',record.assignedStaffName?'負責接待｜'+record.assignedStaffName:'等待女僕接待');
    }else{
      text('guestPreviewTicket','#'+(record.orderNumber||'—'));
      text('guestPreviewTitle',record.name||'未填主人名');
      var orderMeta=[];
      if(record.queueNumber) orderMeta.push('候位 '+record.queueNumber);
      if(record.assignedStaffName) orderMeta.push('負責｜'+record.assignedStaffName);
      orderMeta.push('建立 '+minutesSince(record.createdAt)+' 分鐘');
      text('guestPreviewMeta',orderMeta.join(' · '));
      renderItems(normalizeItems(record.items));
      text('guestPreviewTotal','合計 '+formatGil(record.total));
    }
  }

  function setMode(nextMode){
    mode=nextMode==='orders'?'orders':'reception';
    text('guestPreviewModeLabel',mode==='reception'?'接待畫面摘要':'訂單畫面摘要');
    renderSelect();
  }

  function activeMainTab(){
    var active=document.querySelector('.main-tab.active[data-main]');
    return active?active.getAttribute('data-main'):'reception';
  }

  function syncWorkspace(){
    var active=activeMainTab();
    var show=signedIn && (active==='reception'||active==='orders');
    area.classList.toggle('workspace-preview-active',show);
    preview.hidden=!show;
    if(show) setMode(active);
  }

  function bindVisits(date){
    if(visitsQuery) visitsQuery.off();
    businessDate=date||localDateKey();
    visitsQuery=firebase.database().ref('lephemere/visits').orderByChild('businessDate').equalTo(businessDate);
    visitsQuery.on('value',function(snapshot){visits=snapshot.val()||{};renderSelect();},function(){visits={};renderSelect();});
  }

  function startReadOnlySync(){
    if(operationRef) return;
    operationRef=firebase.database().ref('lephemere/operationStatus');
    operationRef.on('value',function(snapshot){
      var value=snapshot.val()||{};
      var next=/^\d{4}-\d{2}-\d{2}$/.test(value.businessDate||'')?value.businessDate:localDateKey();
      if(next!==businessDate || !visitsQuery) bindVisits(next);
    });
    ordersQuery=firebase.database().ref('lephemere/orders').orderByChild('createdAt').startAt(Date.now()-30*86400000);
    ordersQuery.on('value',function(snapshot){orders=snapshot.val()||{};renderSelect();},function(){orders={};renderSelect();});
  }

  function stopReadOnlySync(){
    if(visitsQuery){visitsQuery.off();visitsQuery=null;}
    if(ordersQuery){ordersQuery.off();ordersQuery=null;}
    if(operationRef){operationRef.off();operationRef=null;}
    visits={}; orders={}; records=[];
  }

  select.addEventListener('change',function(){
    renderCard(records.find(function(record){return record.id===select.value;})||null);
  });

  document.getElementById('mainTabs').addEventListener('click',function(event){
    if(event.target.closest('.main-tab[data-main]')) setTimeout(syncWorkspace,0);
  });

  firebase.auth().onAuthStateChanged(function(user){
    signedIn=!!user;
    if(signedIn) startReadOnlySync(); else stopReadOnlySync();
    syncWorkspace();
  });
})();
