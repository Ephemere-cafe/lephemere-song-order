(()=>{'use strict';document.addEventListener('DOMContentLoaded',()=>{
 const b=document.createElement('button');b.type='button';b.textContent='重試同步';b.id='desk-retry-sync';document.getElementById('status').after(b);
 function state(){b.hidden=!localStorage.getItem('festivalDeskPendingAction')||!window.FestivalDeskBridge?.app.auth().currentUser;}
 b.onclick=async()=>{const payload=JSON.parse(localStorage.getItem('festivalDeskPendingAction')||'null');if(!payload)return;b.disabled=true;try{await FestivalDeskBridge.app.functions('asia-southeast1').httpsCallable('festivalStaffActionV102')(payload);localStorage.removeItem('festivalDeskPendingAction');document.getElementById('status').textContent='上一項操作已完成同步。請重新讀取桌次。';}catch(e){document.getElementById('status').textContent=e.message||'暫時無法同步，請再試一次。';}finally{b.disabled=false;state();}};
 new MutationObserver(state).observe(document.getElementById('status'),{childList:true});window.addEventListener('festival-desk-role',state);state();
});})();
