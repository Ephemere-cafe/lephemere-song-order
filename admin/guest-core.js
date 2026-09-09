(function(){
'use strict';
function sha256(value){
 const b=Array.from(new TextEncoder().encode(String(value))),len=b.length*8;b.push(128);while(b.length%64!==56)b.push(0);for(let i=7;i>=0;i--)b.push(i>=4?0:(len>>>i*8)&255);
 const k=[0x428a2f98,0x71374491,0xb5c0fbcf,0xe9b5dba5,0x3956c25b,0x59f111f1,0x923f82a4,0xab1c5ed5,0xd807aa98,0x12835b01,0x243185be,0x550c7dc3,0x72be5d74,0x80deb1fe,0x9bdc06a7,0xc19bf174,0xe49b69c1,0xefbe4786,0x0fc19dc6,0x240ca1cc,0x2de92c6f,0x4a7484aa,0x5cb0a9dc,0x76f988da,0x983e5152,0xa831c66d,0xb00327c8,0xbf597fc7,0xc6e00bf3,0xd5a79147,0x06ca6351,0x14292967,0x27b70a85,0x2e1b2138,0x4d2c6dfc,0x53380d13,0x650a7354,0x766a0abb,0x81c2c92e,0x92722c85,0xa2bfe8a1,0xa81a664b,0xc24b8b70,0xc76c51a3,0xd192e819,0xd6990624,0xf40e3585,0x106aa070,0x19a4c116,0x1e376c08,0x2748774c,0x34b0bcb5,0x391c0cb3,0x4ed8aa4a,0x5b9cca4f,0x682e6ff3,0x748f82ee,0x78a5636f,0x84c87814,0x8cc70208,0x90befffa,0xa4506ceb,0xbef9a3f7,0xc67178f2],h=[0x6a09e667,0xbb67ae85,0x3c6ef372,0xa54ff53a,0x510e527f,0x9b05688c,0x1f83d9ab,0x5be0cd19],rot=(x,n)=>(x>>>n)|(x<<(32-n));
 for(let off=0;off<b.length;off+=64){const w=[];for(let i=0;i<16;i++)w[i]=(b[off+i*4]<<24)|(b[off+i*4+1]<<16)|(b[off+i*4+2]<<8)|b[off+i*4+3];for(let i=16;i<64;i++){const x=w[i-15],y=w[i-2];w[i]=(w[i-16]+(rot(x,7)^rot(x,18)^(x>>>3))+w[i-7]+(rot(y,17)^rot(y,19)^(y>>>10)))|0;}let [a,c,d,e,f,g,j,l]=h;for(let i=0;i<64;i++){const t=(l+(rot(f,6)^rot(f,11)^rot(f,25))+((f&g)^(~f&j))+k[i]+w[i])|0,u=((rot(a,2)^rot(a,13)^rot(a,22))+((a&c)^(a&d)^(c&d)))|0;l=j;j=g;g=f;f=(e+t)|0;e=d;d=c;c=a;a=(t+u)|0;}[a,c,d,e,f,g,j,l].forEach((v,i)=>h[i]=(h[i]+v)|0);}return h.map(x=>(x>>>0).toString(16).padStart(8,'0')).join('');}

const clone=x=>JSON.parse(JSON.stringify(x));
const key=x=>sha256(x).slice(0,40);
const clean=x=>String(x||'').trim().replace(/\s+/g,' ');
const identity=(name,world)=>key(clean(name)+'｜'+clean(world));
const dateOK=x=>typeof x==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(x)&&!Number.isNaN(Date.parse(x+'T00:00:00Z'))&&new Date(x+'T00:00:00Z').toISOString().slice(0,10)===x;
const money=x=>Number.isSafeInteger(x)&&x>=0;
function members(v){const raw=Array.isArray(v.partyMembers)&&v.partyMembers.length?v.partyMembers:[clean(v.characterName)+'｜'+clean(v.world)];return raw.map((s,i)=>{const p=String(s).split('｜');return {index:i,name:clean(p[0]),world:p.length===2?clean(p[1]):(i===0?clean(v.world):'')};});}
function canonical(profiles,id){const seen=new Set();while(profiles[id]&&profiles[id].mergedInto){if(seen.has(id))throw Error('客人合併關係循環');seen.add(id);id=profiles[id].mergedInto;}return profiles[id]?id:'';}
function taiwanOrderDate(value){if(typeof value!=='number'||!Number.isFinite(value)||value<=0)return '';const d=new Date(value+8*60*60*1000);return Number.isNaN(d.getTime())?'':d.toISOString().slice(0,10);}
function calculate(input,original={},options={}){
 const r=clone(original),now=options.now||Date.now(),profiles=r.profiles||{},settings={visitThreshold:6,spendThreshold:4000000,...r.settings};
 const visits=input.visits||{},orders=input.orders||{},index={},links={},ledger={},pending={},summaries={},interactions={},history={};
 for(const [id,p] of Object.entries(profiles)){const dest=canonical(profiles,id);for(const pair of [{name:p.name,world:p.world},...Object.values(p.aliases||{})]){if(pair.name&&pair.world){const k=identity(pair.name,pair.world);(index[k]||= {})[dest]=true;}}}
 const excludedGuest=id=>!!r.exclusions?.['guest_'+canonical(profiles,id)]?.active;
 const excludedPending=id=>!!r.exclusions?.['pending_'+id]?.active;
 const eligible=v=>options.allHistory||settings.historyImported||Number(v.createdAt)>=Number(settings.activatedAt||now);
 for(const [vid,v] of Object.entries(visits)){
  if(!eligible(v))continue;links[vid]={};
  for(const m of members(v)){
   const override=(r.memberOverrides||{})[key(vid+':'+m.index)];let id=override&&override.fingerprint===key(JSON.stringify(m))?canonical(profiles,override.guestId):'';
   if(!id&&m.name&&m.world){const k=identity(m.name,m.world),ids=Object.keys(index[k]||{});if(ids.length===1)id=ids[0];else if(!ids.length){id='g_'+key(vid+':'+m.index+':'+k);profiles[id]={name:m.name,world:m.world,createdAt:now,enabled:false};(index[k]||={})[id]=true;}}
   links[vid][m.index]={...m,guestId:id};if(!id)pending['member_'+key(vid+':'+m.index)]={kind:'member',visitId:vid,memberIndex:m.index,name:m.name,world:m.world,reason:'客人名稱／伺服器缺失或重複，請指定客人'};
  }
 }
 function rowAdd(row){if(excludedPending(row.sourceKey)||row.guestId&&excludedGuest(row.guestId))return;ledger[row.sourceKey]=row;if(row.reason)pending[row.sourceKey]=row;}
 for(const [oid,o] of Object.entries(orders)){
  if(o.status!=='completed')continue;
  const v=visits[o.visitId];if(v&&!eligible(v))continue;if(!v&&!options.allHistory&&!settings.historyImported&&Number(o.createdAt)<Number(settings.activatedAt||now))continue;
  const items=Array.isArray(o.items)?o.items:[],parts=[];let total=0,invalid=!items.length;
  items.forEach((it,i)=>{if(!money(it.price)||!Number.isSafeInteger(it.qty)||it.qty<1||it.qty>1000){invalid=true;return;}if(it.addon&&!money(it.addon.price)){invalid=true;return;}
   const special=it.serviceType&&it.serviceType!=='food'||/拍立得|簽繪|純拍|Lens|個人攝影|專屬留影|cheki|小顏.*抹茶|naipa.*蘆薈水果凍/i.test(it.name||'');
   for(let n=0;n<it.qty;n++){parts.push({i,n,name:clean(it.name),amount:it.price,kind:special?'special':'food',assignment:(it.assignments||[])[n]||''});total+=it.price;if(it.addon&&it.addon.price){parts.push({i,n,addon:true,name:clean(it.addon.label),amount:it.addon.price,kind:'special',assignment:(it.assignments||[])[n]||''});total+=it.addon.price;}}
  });
  const mismatch=invalid||!money(o.total)||total!==o.total;
  if(invalid){rowAdd({sourceKey:'order_'+key(oid),orderId:oid,visitId:o.visitId||'',amount:money(o.total)?o.total:0,reason:'訂單品項或金額格式不完整；請用消費修正補入',kind:'invalid'});continue;}
  for(const part of parts){const sourceKey=key(oid+':'+part.i+':'+part.n+':'+!!part.addon);const fingerprint=key(JSON.stringify([part,o.total,o.visitId,v&&v.businessDate]));const fix=(r.allocations||{})[sourceKey];const validFix=fix&&fix.fingerprint===fingerprint;
   let date=dateOK(v&&v.businessDate)?v.businessDate:taiwanOrderDate(o.createdAt),dateSource=dateOK(v&&v.businessDate)?'visit':'orderCreatedAt',id='',reason='';const candidates=Object.values(links[o.visitId]||{}).filter(m=>m.name===clean(part.assignment)&&m.guestId);
   if(validFix){id=canonical(profiles,fix.guestId);date=fix.businessDate||date;dateSource='manual';}else if(candidates.length===1&&part.assignment!=='全桌共享'&&part.assignment!=='尚未指定')id=candidates[0].guestId;
   if(!id)reason='消費歸屬待確認';if(!dateOK(date))reason='營業日期待確認';if(mismatch&&!validFix)reason='品項合計與訂單總額不一致，請逐項核對';if(fix&&!validFix)reason='來源訂單已變更，原修正需重新確認';
   rowAdd({sourceKey,fingerprint,orderId:oid,visitId:o.visitId||'',guestId:id,businessDate:date,dateSource,name:part.name,assignment:part.assignment,amount:validFix&&money(fix.amount)?fix.amount:part.amount,kind:part.kind,reason});
  }
 }
 function hrow(id,date){history[id]||={};return history[id][date]||=( {businessDate:date,food:0,special:0,amount:0,staffIds:{},sourceKeys:{}} );}
 const visitsWithSpend={};
 for(const row of Object.values(ledger)){if(row.reason||!row.guestId||row.amount<=0)continue;const h=hrow(row.guestId,row.businessDate);if(row.dateSource==='orderCreatedAt')h.orderDateFallback=true;h[row.kind]+=row.amount;h.amount+=row.amount;h.sourceKeys[row.sourceKey]=true;(visitsWithSpend[row.visitId]||={})[row.guestId]=row.businessDate;}
 const interactionEvents={};
 for(const [vid,guests] of Object.entries(visitsWithSpend)){const v=visits[vid]||{};if(v.status!=='completed'&&!v.tableServiceCompletedAt)continue;const chosen=(r.serviceParticipation||{})[vid];const staffIds=chosen?Object.keys(chosen.staffIds||{}):(v.assignedStaffId?[v.assignedStaffId]:[]);
  for(const [id,date] of Object.entries(guests)){for(const sid of staffIds){interactionEvents[key(id+vid+sid)]={id,sid,date};hrow(id,date).staffIds[sid]=true;}}
 }
 const visitDeltas={},interactionDeltas={};
 for(const adj of Object.values(r.adjustments||{})){if(adj.voided)continue;const id=canonical(profiles,adj.guestId);if(!id||excludedGuest(id)||!dateOK(adj.businessDate))continue;const h=hrow(id,adj.businessDate);if(adj.type==='spend'){h[adj.kind||'food']+=adj.delta;h.amount+=adj.delta;}if(adj.type==='visit')visitDeltas[id]=(visitDeltas[id]||0)+adj.delta;if(adj.type==='interaction'){const k=id+'|'+adj.staffId;interactionDeltas[k]=(interactionDeltas[k]||0)+adj.delta;}}
 for(const e of Object.values(interactionEvents)){interactions[e.id]||={};const x=interactions[e.id][e.sid]||={count:0,lastDate:''};x.count++;x.lastDate=x.lastDate>e.date?x.lastDate:e.date;}
 for(const [k,delta] of Object.entries(interactionDeltas)){const [id,sid]=k.split('|');interactions[id]||={};const x=interactions[id][sid]||={count:0,lastDate:''};x.count=Math.max(0,x.count+delta);}
 for(const [id,p] of Object.entries(profiles)){if(p.mergedInto||excludedGuest(id))continue;const rows=Object.values(history[id]||{}),dates=rows.filter(h=>h.amount>0).map(h=>h.businessDate).sort();const amount=Math.max(0,rows.reduce((s,h)=>s+h.amount,0)),count=Math.max(0,dates.length+(visitDeltas[id]||0));summaries[id]={name:p.name,world:p.world,visitCount:count,totalSpend:amount,firstDate:dates[0]||'',lastDate:dates.at(-1)||'',eligible:count>=settings.visitThreshold||amount>=settings.spendThreshold,enabled:!!p.enabled,enabledAt:p.enabledAt||null};}
 for(const [pid,p] of Object.entries(pending)){
  if(excludedPending(pid)||p.guestId&&excludedGuest(p.guestId)){delete pending[pid];continue;}
  const o=orders[p.orderId]||{},v=visits[p.visitId]||{};
  p.sourceCustomerName=clean(o.name||o.characterName||v.characterName||'');
  p.sourceBusinessDate=clean(v.businessDate||o.businessDate||'');
  p.sourceCreatedAt=Number(o.createdAt||v.createdAt)||0;
  if(p.kind==='member'){p.businessDate=clean(v.businessDate);p.sourceCustomerName=clean(p.name||v.characterName);}
 }
 for(const [vid,entries] of Object.entries(links))for(const [i,m] of Object.entries(entries))if(m.guestId&&excludedGuest(m.guestId))delete entries[i];
 return {profiles,identityIndex:index,visitLinks:links,ledger,pending,summaries,interactions,history,computedAt:now};
}
window.GuestCore={calculate,members,key,identity,canonical,dateOK,money,clean,clone};

})();