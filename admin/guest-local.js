(function(){'use strict';
 const core=window.GuestCore;
 let api,signature='',unsub=[],timer,epoch=0,running=false,rerun=false;
 let state={},source={visits:{},orders:{}},ready={};
 const root=()=>api.db.ref('lephemere'),registry=()=>root().child('guestRegistry');
 const inputs=r=>({algorithmVersion:19,exclusions:r.exclusions||{},settings:r.settings||{},profiles:r.profiles||{},allocations:r.allocations||{},memberOverrides:r.memberOverrides||{},adjustments:r.adjustments||{},serviceParticipation:r.serviceParticipation||{}});
 const stable=x=>JSON.stringify(x,function(k,v){return v&&typeof v==='object'&&!Array.isArray(v)?Object.fromEntries(Object.keys(v).sort().map(key=>[key,v[key]])):v;});
 const hash=(s,r)=>core.key(stable([s,inputs(r)]));
 function status(message){const el=document.getElementById('grStatus');if(el){el.textContent=message;el.className='gr-status gr-muted';}}
 function schedule(){clearTimeout(timer);if(running){rerun=true;return;}timer=setTimeout(sync,500);}
 async function transaction(ref,fn){const keep=()=>{};ref.on('value',keep);try{await ref.once('value');return await ref.transaction(fn,undefined,false);}finally{ref.off('value',keep);}}
 async function sync(){
  if(running){rerun=true;return;}
  if(!api.context().manager||!ready.visits||!ready.orders||!ready.registry||!state.settings?.activatedAt)return;
  const generation=epoch,snapshot=core.clone(source),before=hash(snapshot,state);if(state.calculationKey===before)return;
  running=true;status('正在更新熟客統計…');
  try{
   const expected=core.key(stable(inputs(state))),derived=core.calculate(snapshot,state);
   const result=await transaction(registry(),current=>{
    if(generation!==epoch||!api.context().manager||core.key(stable(inputs(current||{})))!==expected)return;
    const next={...current,...derived};next.calculationKey=hash(snapshot,next);next.syncStatus={state:'ready',computedAt:derived.computedAt,byUid:api.context().user.uid};return next;
   });
   if(!result.committed)rerun=true;else status('熟客統計已更新；關閉管理員後台後暫停更新。');
  }catch(e){status('熟客統計尚未更新：'+e.message+'。保留上次結果，重新登入可重試。');}
  finally{running=false;if(rerun){rerun=false;schedule();}}
 }
 function refresh(){
  const c=api.context(),next=(c.user?.uid||'')+':'+!!c.manager;if(next===signature)return;
  signature=next;epoch++;clearTimeout(timer);unsub.forEach(f=>f());unsub=[];ready={};state={};source={visits:{},orders:{}};
  if(!c.user||!c.manager)return;
  for(const name of ['visits','orders','guestRegistry']){
   const ref=root().child(name),h=s=>{epoch++;if(name==='guestRegistry'){state=s.val()||{};ready.registry=true;}else{source[name]=s.val()||{};ready[name]=true;}schedule();};
   ref.on('value',h,e=>{ready[name==='guestRegistry'?'registry':name]=false;status('熟客資料讀取失敗：'+e.message);});unsub.push(()=>ref.off('value',h));
  }
 }
 async function readSource(){const [v,o]=await Promise.all([root().child('visits').once('value'),root().child('orders').once('value')]);return {visits:v.val()||{},orders:o.val()||{}};}
 async function command(d){
  const c=api.context();if(!c.user)throw Error('請先登入');const auth={uid:c.user.uid,manager:!!c.manager};
  if(!auth.manager&&!['macro','participation'].includes(d.action))throw Error('只有管理員可以操作客人資料');
  const roster=(await root().child('staffRoster').once('value')).val()||{};
  let visit=null;if(['participation','member'].includes(d.action))visit=(await root().child('visits').child(d.visitId).once('value')).val();
  if(!auth.manager){
   const previous=(await registry().child('audit').child(d.requestId).once('value')).val();if(previous)return {ok:true,replayed:true};
   // Ordinary shared accounts write only these two inputs. Never write totals or profiles.
   const section=d.action==='macro'?'macros':'serviceParticipation',key=d.action==='macro'?d.targetStaffId:d.visitId;
   const old=(await registry().child(section).child(key).once('value')).val();
   const result=window.GuestActions.apply({[section]:{[key]:old}},d,auth,roster,visit);
   const updates={};updates[section+'/'+key]=result.state[section][key];updates['audit/'+d.requestId]=result.state.audit[d.requestId];
   await registry().update(updates);return result.response;
  }
  if(d.action==='preview'){
   const r=(await registry().once('value')).val()||{},s=await readSource(),derived=core.calculate(s,r,{allHistory:true});
   return {profiles:Object.keys(derived.summaries).length,pending:derived.pending,ledgerCount:Object.keys(derived.ledger).length,summaries:derived.summaries,previewToken:core.key(JSON.stringify([s,inputs(r),r.revision||0]))};
  }
  let token='',revision=-1,importSource;
  if(d.action==='import'){
   const r=(await registry().once('value')).val()||{};importSource=await readSource();revision=r.revision||0;token=core.key(JSON.stringify([importSource,inputs(r),revision]));
   if(token!==d.previewToken)throw Error('資料已變更，請重新預覽再匯入');
  }
  let response;const result=await transaction(registry(),value=>{
   if(!api.context().manager||api.context().user?.uid!==auth.uid)return;
   if(d.action==='import'&&core.key(JSON.stringify([importSource,inputs(value||{}),(value||{}).revision||0]))!==token)throw Error('資料已變更，請重新預覽');
   const applied=window.GuestActions.apply(value,d,auth,roster,visit,token,revision);response=applied.response;return applied.state;
  });
  if(!result.committed)throw Error('操作未保存，請重新登入後重試');schedule();return response;
 }
 window.GuestLocal={mount(context){api=context;refresh();},refresh,command};
})();
