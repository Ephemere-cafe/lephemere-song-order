(()=>{
  const endpoint='https://asia-southeast1-lephemere-queue-c38d5.cloudfunctions.net/festivalPresentationV100';
  const dialog=document.getElementById('festival-results-notice');
  const title=document.getElementById('festival-results-heading');
  const summary=document.getElementById('festival-results-totals');
  const seen=new Set();
  let currentSession='',pending=null,busy=false,started=false;

  function showPending(){
    if(!pending || pending.sessionId!==currentSession || document.hidden || document.querySelector('dialog[open]'))return;
    const result=pending;
    const key='festival-published-result:'+result.sessionId+':'+result.publishedAt;
    if(seen.has(key))return;
    try{if(sessionStorage.getItem(key)){seen.add(key);return;}}catch{}
    const {A:a,B:b}=result.votes;
    title.textContent=a===b?'兩校平手':result.teams[a>b?'A':'B']+'獲勝';
    for(const team of ['A','B']){
      summary.querySelector('[data-team="'+team+'"] span').textContent=result.teams[team];
      summary.querySelector('[data-team="'+team+'"] strong').textContent=result.votes[team]+' 票';
    }
    dialog.showModal();seen.add(key);
    try{sessionStorage.setItem(key,'shown');}catch{}
  }

  async function readResult(){
    if(busy || document.hidden || !currentSession)return;
    busy=true;
    try{
      const response=await fetch(endpoint,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({data:{resultOnly:true}}),signal:AbortSignal.timeout(6500)});
      if(!response.ok)return;
      const result=(await response.json()).result?.result;
      if(result?.sessionId!==currentSession || !Number.isSafeInteger(result.publishedAt) ||
         !Number.isSafeInteger(result.votes?.A) || !Number.isSafeInteger(result.votes?.B) || !result.teams?.A || !result.teams?.B)return;
      pending=result;showPending();
    }catch{}finally{busy=false;}
  }

  window.FestivalResultNotice175={
    watch(sessionId){
      if(currentSession===sessionId && started)return;
      currentSession=sessionId || '';pending=null;
      if(!started){started=true;window.setInterval(readResult,15000);}
      void readResult();
    },
    refresh:readResult,
  };
  document.addEventListener('visibilitychange',()=>{showPending();void readResult();});
  document.addEventListener('close',showPending,true);
})();
