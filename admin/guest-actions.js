(function(){'use strict';const core=window.GuestCore;const fail=s=>{throw Error(s);};
const text=(x,max=500)=>{if(typeof x!=='string'||x.length>max)fail('文字欄位格式不正確');return x.trim();};
const id=x=>{x=text(x,100);if(['__proto__','constructor','prototype'].includes(x)||!/^[A-Za-z0-9_-]+$/.test(x))fail('識別碼格式不正確');return x;};

window.GuestActions={apply:function(value,d,auth,roster,visit,importToken='',importRevision=-1,now=Date.now()){
 const action=text(d.action,60),staffId=d.staffId?id(d.staffId):'',rid=id(d.requestId||'');
 if(!auth.uid)fail('請先登入');if(!auth.manager&&!['macro','participation'].includes(action))fail('只有管理員可以操作客人資料');
 if(staffId&&!roster[staffId])fail('請選擇有效操作女僕');
 const reason=text(d.reason||'',500);
 if(action==='participation'&&(!visit||!Array.isArray(d.staffIds)||d.staffIds.some(s=>!roster[s])))fail('接待或參與女僕名單不正確');
 if(action==='member'&&(!visit||!Number.isSafeInteger(d.memberIndex)||!core.members(visit)[d.memberIndex]))fail('同行者來源不存在');
 let response={ok:true};value=core.clone(value||{});
  const r=value||{};if(r.audit?.[rid]){response={ok:true,replayed:true};return {state:r,response:{ok:true,replayed:true}};}
  r.profiles||={};r.settings||={visitThreshold:6,spendThreshold:4000000};
  let target='',oldValue=null,newValue=null;
  function set(section,k,v){r[section]||={};oldValue=r[section][k]||null;r[section][k]=v;target=section+'/'+k;newValue=v;}
  const getGuest=()=>{const gid=id(d.guestId);if(!r.profiles[gid]||r.profiles[gid].mergedInto||r.exclusions?.['guest_'+gid]?.active)fail('請選擇有效客人');return gid;};
  if(action==='activate'){if(!r.settings.activatedAt)r.settings.activatedAt=now;target='settings';newValue=r.settings;}
  else if(action==='profile'){
   const gid=d.guestId?getGuest():'g_'+rid,name=text(d.name,80),world=text(d.world,80);if(!name||!world)fail('名稱與伺服器必填');
   if(Object.entries(r.profiles).some(([other,p])=>other!==gid&&!p.mergedInto&&core.identity(p.name,p.world)===core.identity(name,world)))fail('已有相同名稱與伺服器的客人，請使用現有資料或合併');
   const p={...(r.profiles[gid]||{createdAt:now,enabled:false})};if(p.name&&(p.name!==name||p.world!==world)){p.aliases||={};p.aliases[core.identity(p.name,p.world)]={name:p.name,world:p.world};}Object.assign(p,{name,world,note:text(d.note||'',2000),updatedAt:now});set('profiles',gid,p);response.guestId=gid;
  }else if(action==='world'){
   const gid=getGuest(),p={...r.profiles[gid]},world=text(d.world,80);if(!world)fail('請填寫伺服器');
   if(Object.entries(r.profiles).some(([other,q])=>other!==gid&&!q.mergedInto&&core.identity(q.name,q.world)===core.identity(p.name,world)))fail('已有相同姓名與伺服器的客人，請先合併客人資料');
   p.aliases={...p.aliases,[core.identity(p.name,p.world)]:{name:p.name,world:p.world||''}};p.world=world;p.updatedAt=now;set('profiles',gid,p);
  }else if(action==='enable'){const gid=getGuest(),p={...r.profiles[gid]};if(typeof d.enabled!=='boolean')fail('啟用狀態不正確');p.enabled=d.enabled;if(d.enabled&&!p.enabledAt)p.enabledAt=now;set('profiles',gid,p);}
  else if(action==='settings'){if(!Number.isSafeInteger(d.visitThreshold)||d.visitThreshold<1||!core.money(d.spendThreshold)||d.spendThreshold<1)fail('門檻須為正整數');oldValue=r.settings;r.settings={...r.settings,visitThreshold:d.visitThreshold,spendThreshold:d.spendThreshold,regularTemplate:text(d.regularTemplate||'',2000)};target='settings';newValue=r.settings;}
  else if(action==='macro'){const sid=id(d.targetStaffId);if(!roster[sid])fail('女僕不存在');set('macros',sid,{regularTemplate:text(d.template||'',2000),updatedAt:now,byUid:auth.uid,byStaffId:staffId});}
  else if(action==='participation'){set('serviceParticipation',id(d.visitId),{staffIds:Object.fromEntries([...new Set(d.staffIds)].map(s=>[s,true])),updatedAt:now,byUid:auth.uid,byStaffId:staffId});}
  else if(action==='member'){const gid=getGuest(),vid=id(d.visitId);set('memberOverrides',core.key(vid+':'+d.memberIndex),{guestId:gid,visitId:vid,index:d.memberIndex,fingerprint:core.key(JSON.stringify(core.members(visit)[d.memberIndex]))});}
  else if(action==='allocate'){const gid=getGuest(),k=id(d.sourceKey),row=r.ledger?.[k];if(!row||!row.fingerprint||row.fingerprint!==d.fingerprint)fail('來源已變更，請重新整理');if(!core.money(d.amount)||!core.dateOK(d.businessDate))fail('金額或日期不正確');set('allocations',k,{guestId:gid,amount:d.amount,businessDate:d.businessDate,fingerprint:row.fingerprint});}
  else if(action==='adjust'){const gid=getGuest();if(!['spend','visit','interaction'].includes(d.type)||!Number.isSafeInteger(d.delta)||Math.abs(d.delta)>1e12||!core.dateOK(d.businessDate))fail('修正欄位不正確');if(d.type==='interaction'&&!roster[d.interactionStaffId])fail('請指定女僕');set('adjustments',rid,{guestId:gid,type:d.type,delta:d.delta,businessDate:d.businessDate,kind:d.kind==='special'?'special':'food',staffId:d.interactionStaffId||'',reason,createdAt:now,byUid:auth.uid});}
  else if(action==='voidAdjustment'){const k=id(d.adjustmentId);if(!r.adjustments?.[k])fail('修正不存在');set('adjustments',k,{...r.adjustments[k],voided:true,voidedAt:now});}
  else if(action==='merge'){const gid=getGuest(),from=id(d.fromGuestId);if(from===gid||!r.profiles[from]||r.profiles[from].mergedInto)fail('合併來源不正確');oldValue={source:r.profiles[from],target:r.profiles[gid]};const src=r.profiles[from],dest=r.profiles[gid];r.profiles[from]={...src,mergedInto:gid};const dates=[src.enabledAt,dest.enabledAt].filter(Boolean);r.profiles[gid]={...dest,enabled:!!(src.enabled||dest.enabled),enabledAt:dates.length?Math.min(...dates):null};target='merge/'+from+'/'+gid;newValue={source:r.profiles[from],target:r.profiles[gid]};}
  else if(action==='import'){if(d.previewToken!==importToken||(r.revision||0)!==importRevision)fail('資料已變更，請重新預覽');oldValue=r.settings;r.settings={...r.settings,historyImported:true,activatedAt:r.settings.activatedAt||now};target='settings';newValue=r.settings;}
  else if(action==='exclude'||action==='restore'){
   if(!Array.isArray(d.targets)||!d.targets.length||d.targets.length>1000)fail('請選擇 1～1000 筆資料');
   const entries={},before={};
   for(const item of d.targets){const kind=item.kind,k=id(item.id);if(!['guest','pending'].includes(kind))fail('刪除類型不正確');const ek=kind+'_'+k;const old=r.exclusions?.[ek]||null;before[ek]=old;
    if(action==='restore'){if(!old?.active)fail('資料已還原或不存在，請重新整理');entries[ek]={...old,active:false,restoredAt:now,restoredBy:auth.uid,restoreReason:reason};continue;}
    if(old?.active)fail('資料已刪除，請重新整理');
    const snapshot=kind==='guest'?r.summaries?.[k]:r.pending?.[k];if(!snapshot)fail('所選資料已變更，請重新整理再選擇');
    entries[ek]={kind,id:k,active:true,snapshot,deletedAt:now,byUid:auth.uid,byStaffId:staffId,reason};
   }
   r.exclusions={...r.exclusions,...entries};target='exclusions';oldValue=before;newValue=entries;
  }
  else fail('未知操作');
  r.audit||={};r.audit[rid]={action,target,before:oldValue,after:newValue,reason,uid:auth.uid,staffId,createdAt:now};r.revision=(r.revision||0)+1;r.recomputeRequest={id:rid,at:now};return {state:r,response};
}};})();