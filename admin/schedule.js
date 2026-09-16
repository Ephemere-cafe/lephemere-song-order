(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory();else root.CafeSchedule=factory()})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';
  var GUEST_LIMIT=3,PER_MAID_LIMIT=1;
  function providers(t){return Array.from(new Set((Array.isArray(t.providerIds)?t.providerIds:Object.values(t.providerIds||{})).concat(t.maidId||[]).filter(Boolean)))}
  function onsite(p){return p.isOnsitePhoto===true||(p.isOnsitePhoto!==false&&p.processingMode!=='delivery'&&/^onsite_/.test(p.id||p.productId||''))}
  function finished(t){return ['completed','delivered','cancelled'].indexOf(t.status)!==-1}
  function slots(s){
    if(!/^\d{4}-\d{2}-\d{2}$/.test(s.businessDate||''))throw new Error('請設定有效營業日期。');
    var base=Date.parse(s.businessDate+'T00:00:00+08:00'),first=null,previous=-1;
    return Object.entries(s.rounds||{}).sort(function(a,b){return Number(a[1].sortOrder||0)-Number(b[1].sortOrder||0)||a[0].localeCompare(b[0])}).map(function(pair){
      var r=pair[1];if(!/^([01]\d|2[0-3]):[0-5]\d$/.test(r.startTime||'')||!/^([01]\d|2[0-3]):[0-5]\d$/.test(r.endTime||''))throw new Error('每輪都必須填寫有效的開始與結束時間。');
      var a=r.startTime.split(':').map(Number),b=r.endTime.split(':').map(Number),start=a[0]*60+a[1],end=b[0]*60+b[1];
      if(first===null)first=start;else if(start<first)start+=1440;
      if(start>=1440)end+=1440;if(end<start)end+=1440;
      if(end===start||end-start>720||start<previous)throw new Error('拍攝時段不可重疊、倒置或超過 12 小時；跨午夜時段請放在最後。');
      previous=end;return{id:pair[0],round:r,start:base+start*60000,end:base+end*60000};
    });
  }
  function next(s,time){return slots(s).find(function(r){return r.end>time})||null}
  function effective(s,t,time){
    if(t.taskType!=='shoot'||finished(t)||t.status==='shooting')return t.roundId||'';
    var rs=slots(s),original=rs.find(function(r){return r.id===t.roundId});
    if(original&&original.end>time)return original.id;
    var n=rs.find(function(r){return r.end>time&&(!original||r.start>=original.start)});return n?n.id:'';
  }
  function allTasks(s){var out=[];Object.entries(s.orders||{}).forEach(function(pair){Object.entries(pair[1].tasks||{}).forEach(function(tp){out.push(Object.assign({},tp[1],{orderId:pair[0],taskId:tp[0],createdAt:pair[1].createdAt||tp[1].createdAt||0}))})});return out.sort(function(a,b){return a.createdAt-b.createdAt||String(a.taskNumber||a.taskId).localeCompare(String(b.taskNumber||b.taskId))})}
  function onsiteTask(s,t){var p=(s.products||{})[t.productId]||{};return t.isOnsitePhoto===true||(t.isOnsitePhoto!==false&&onsite(Object.assign({},p,{id:t.productId,processingMode:t.taskType==='delivery'?'delivery':'round'})))}
  function counts(s,key){var count=0,maids={};allTasks(s).forEach(function(t){if((!key||t.memberKey===key)&&onsiteTask(s,t)&&t.status!=='cancelled'){count++;providers(t).forEach(function(id){maids[id]=(maids[id]||0)+1})}});return{total:count,maids:maids}}
  function quota(s,id){var m=(s.maids||{})[id]||{};return Number.isFinite(Number(m.quota))?Math.max(0,Math.floor(Number(m.quota))):3}
  function assertPurchase(s,selected,key,time){
    var mine=counts(s,key),sold=counts(s),picked=0,seen={};
    selected.forEach(function(p){if(p.processingMode!=='delivery'&&!next(s,time))throw new Error('最後一輪已結束，現場拍攝已停止接單。');if(!onsite(p))return;
      if(s.onsiteSalesOpen===false)throw new Error('本場已停止接受新拍攝登記。');picked++;
      var ids=providers(p);if(!ids.length)throw new Error('此拍攝服務尚未設定女僕。');ids.forEach(function(id){if(!s.maids||!s.maids[id]||s.maids[id].enabled===false)throw new Error('選擇的女僕未開放本場拍攝服務。');if((mine.maids[id]||0)+(seen[id]||0)>=PER_MAID_LIMIT)throw new Error('同一位女僕，每位客人每場最多登記 1 份需拍攝服務。');if((sold.maids[id]||0)+(seen[id]||0)>=quota(s,id))throw new Error('這位女僕本場拍攝服務名額已滿。');seen[id]=(seen[id]||0)+1});
    });if(mine.total+picked>GUEST_LIMIT)throw new Error('每位客人每場最多登記 3 份需拍攝服務。');
  }
  function roll(s,time){var changed=false;allTasks(s).forEach(function(row){var t=s.orders[row.orderId].tasks[row.taskId];if(t.taskType!=='shoot'||finished(t)||t.status==='shooting')return;var id=effective(s,t,time);if(id&&id!==t.roundId){t.originalRoundId=t.originalRoundId||t.roundId;t.roundId=id;t.deferredAt=time;t.awaitingArrangement=false;if(t.status==='deferred')t.status='pending';changed=true}else if(!id&&!t.awaitingArrangement){t.awaitingArrangement=true;changed=true}});if(!next(s,time)&&s.onsiteSalesOpen!==false){s.onsiteSalesOpen=false;changed=true}return changed}
  return{GUEST_LIMIT:GUEST_LIMIT,PER_MAID_LIMIT:PER_MAID_LIMIT,providers:providers,onsite:onsite,onsiteTask:onsiteTask,finished:finished,slots:slots,next:next,effective:effective,allTasks:allTasks,counts:counts,quota:quota,assertPurchase:assertPurchase,roll:roll};
});
