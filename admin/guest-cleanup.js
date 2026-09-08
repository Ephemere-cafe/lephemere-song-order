(function(){'use strict';const core=window.GuestCore;
 const stable=x=>JSON.stringify(x,function(k,v){return v&&typeof v==='object'&&!Array.isArray(v)?Object.fromEntries(Object.keys(v).sort().map(k=>[k,v[k]])):v;});
 function apply(value,plan,sources,auth,now=Date.now()){
  if(!auth.manager||!auth.uid)throw Error('只有管理員可以套用整理名單');
  if(!plan||plan.format!=='ephemere-approved-cleanup-v1'||!Array.isArray(plan.rows)||plan.rows.length>1000||!Array.isArray(plan.names)||plan.names.some(n=>typeof n!=='string'||n.length>80)||!/^approved-[A-Za-z0-9_-]+$/.test(plan.planId||''))throw Error('整理檔格式不正確');
  const r=core.clone(value||{});if(r.appliedPlans?.[plan.planId])return {state:r,result:{replayed:true,...r.appliedPlans[plan.planId]}};
  const aliases=plan.aliases||{},norm=n=>String(aliases[core.clean(n)]||core.clean(n));
  r.profiles||={};r.exclusions||={};r.allocations||={};r.memberOverrides||={};
  const result={retained:0,excluded:0,skipped:0,created:0},targets=Object.create(null);
  function guest(name){
   if(targets[name])return targets[name];
   const matches=[...new Set(Object.entries(r.profiles).filter(([id,p])=>norm(p.name)===name||Object.values(p.aliases||{}).some(a=>norm(a.name)===name)).map(([id])=>core.canonical(r.profiles,id)))];
   if(matches.length>1)throw Error('同名客人有多筆，請先確認：'+name);
   let id=matches[0];if(id&&r.exclusions['guest_'+id]?.active)throw Error('保留客人目前已被刪除，請先還原：'+name);
   if(!id){id='g_legacy_'+core.key(name);r.profiles[id]={name,world:'',createdAt:now,enabled:false};result.created++;}
   const p=r.profiles[id];p.aliases||={};if(p.name!==name)p.aliases[core.identity(p.name,p.world)]={name:p.name,world:p.world||''};
   for(const [old,current] of Object.entries(aliases))if(current===name)p.aliases[core.identity(old,p.world)]={name:old,world:p.world||''};
   p.name=name;targets[name]=id;return id;
  }
  for(const row of plan.rows){
   if(!row||!['orders','visits'].includes(row.sourceKind)||!['retain','exclude'].includes(row.decision)||typeof row.id!=='string'||!/^[-A-Za-z0-9_]+$/.test(row.id))throw Error('整理項目格式不正確');
   const original=sources[row.sourceKind]?.[row.sourceId],pending=r.pending?.[row.id];
   if(!original||!pending||core.key(stable(original))!==row.sourceHash){result.skipped++;continue;}
   if(row.decision==='exclude'){
    if(r.exclusions['pending_'+row.id]?.active){result.skipped++;continue;}
    r.exclusions['pending_'+row.id]={kind:'pending',id:row.id,active:true,snapshot:pending,deletedAt:now,byUid:auth.uid,byStaffId:auth.staffId||'',reason:'',planId:plan.planId};result.excluded++;continue;
   }
   if(!plan.names.includes(row.name))throw Error('保留姓名不在確認名單');
   const gid=guest(row.name);
   if(pending.kind==='member'){
    const member=core.members(original)[pending.memberIndex];if(!member){result.skipped++;continue;}
    r.memberOverrides[core.key(pending.visitId+':'+pending.memberIndex)]={guestId:gid,visitId:pending.visitId,index:pending.memberIndex,fingerprint:core.key(JSON.stringify(member))};
   }else{
    const ledger=r.ledger?.[row.id];if(!ledger?.fingerprint||!core.dateOK(ledger.businessDate)||!core.money(ledger.amount)||!['food','special'].includes(ledger.kind)){result.skipped++;continue;}
    r.allocations[row.id]={guestId:gid,amount:ledger.amount,businessDate:ledger.businessDate,fingerprint:ledger.fingerprint};
   }
   result.retained++;
  }
  r.appliedPlans||={};r.appliedPlans[plan.planId]={...result,at:now,uid:auth.uid};r.audit||={};r.audit[plan.planId]={action:'approvedCleanup',target:'guestRegistry',before:null,after:result,reason:'',uid:auth.uid,staffId:auth.staffId||'',createdAt:now};r.revision=(r.revision||0)+1;
  return {state:r,result};
 }
 window.GuestCleanup={apply};
})();
