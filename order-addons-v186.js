(() => {
  const id=name=>document.getElementById(name);
  const make=(tag,text,className='')=>{const node=document.createElement(tag);node.textContent=text;node.className=className;return node;};
  const board=id('addon-board'),managerPanel=id('addon-manager'),list=id('addon-orders'),events=id('addon-manager-events');
  let role=null,revision=0,filter='pending',model=null,loading=false,pendingAction=false;
  const monetary=value=>Number(value || 0).toLocaleString('zh-TW')+' Gil';
  const status=state=>({sent:'已送出',failed:'送出失敗',sending:'送出中',uncertain:'結果待確認'}[state] || '尚未送出');
  const elapsed=row=>Math.max(0,Math.floor((Date.now()-row.createdAt)/60000));
  const late=row=>row.pending && elapsed(row)>=2;

  async function call(data){
    const app=window.FestivalDeskBridge?.app;
    const {data:result}=await app.functions('asia-southeast1').httpsCallable('festivalAddonDeskV186',{timeout:18000})(data);
    return result;
  }
  function render(){
    if(!model)return;
    const pending=model.rows.filter(row=>row.pending);
    id('addon-count').textContent='待接 '+pending.length+' 筆 · 逾時 '+pending.filter(late).length+' 筆';
    list.replaceChildren();
    for(const row of filter==='pending'?pending:model.rows){
      const line=make('article','','addon-board-row'),body=make('div',''),actions=make('div','','addon-board-tools');
      const kind=row.kind==='photo'?'拍攝／紀念服務':'餐點';
      body.append(make('strong',row.table+' · #'+row.number+' · '+kind),make('p',row.items.map(item=>item.name+' ×'+item.qty).join('、')+' · '+monetary(row.total)),
        make('small','負責女僕 '+row.staff+' · '+(elapsed(row)?elapsed(row)+' 分鐘前':'剛剛')));
      if(row.pending){
        if(late(row))actions.append(make('span','逾時','addon-board-late'));
        const take=make('button',row.kind==='photo'?'接手服務':'接單備餐');take.type='button';take.disabled=pendingAction;
        take.addEventListener('click',()=>acknowledge(row));actions.append(take);
      }else actions.append(make('strong',row.acknowledgedBy?'已接手 · '+row.acknowledgedBy:'已處理'));
      line.append(body,actions);list.append(line);
    }
    if(!list.children.length)list.append(make('p',filter==='pending'?'目前沒有待接的加點。':'目前沒有加點。'));
    events.replaceChildren();
    managerPanel.hidden=role!=='manager' || model.manager!==true;
    if(managerPanel.hidden)return;
    const alerts=model.rows.filter(row=>late(row) || ['failed','uncertain'].includes(row.delivery?.first) || ['failed','uncertain'].includes(row.delivery?.reminder));
    id('addon-manager-count').textContent='逾時未接 '+pending.filter(late).length+' 筆 · 通知待核對 '+alerts.filter(row=>[row.delivery?.first,row.delivery?.reminder].some(state=>state==='failed'||state==='uncertain')).length+' 筆';
    for(const row of alerts){
      const line=make('div','','addon-board-row');
      line.append(make('strong',row.table+' · #'+row.number+' · '+(row.pending?'待接單':'已處理')),
        make('span','首次通知 '+status(row.delivery?.first)+' · 逾時提醒 '+status(row.delivery?.reminder)));events.append(line);
    }
    if(!events.children.length)events.append(make('p','目前沒有逾時或待核對的通知。'));
  }
  async function refresh(){
    if(!role || loading || document.hidden)return;
    loading=true;const version=revision;
    try{const fresh=await call({action:'list'});if(version===revision){model=fresh;render();}}
    catch(error){if(version===revision)id('addon-count').textContent='暫時無法同步加點。'+(model?'下次更新將重試。':'');}
    finally{loading=false;if(version!==revision && role)void refresh();}
  }
  async function acknowledge(row){
    if(pendingAction)return;
    const staffId=id('globalStaffSelect')?.value;
    if(!staffId){id('addon-count').textContent='請先在上方選擇目前操作的女僕。';return;}
    pendingAction=true;render();const version=revision;
    try{await call({action:'acknowledge',sessionId:model.sessionId,staffId,id:row.id,kind:row.kind});if(version===revision)await refresh();}
    catch(error){if(version===revision){render();id('addon-count').textContent=error.message || '接單結果尚未確認，請重新讀取。';}}
    finally{pendingAction=false;for(const button of list.querySelectorAll('button'))button.disabled=false;}
  }

  id('addon-filters').addEventListener('click',event=>{
    const choice=event.target.closest('button[data-view]');if(!choice)return;
    filter=choice.dataset.view;
    for(const button of event.currentTarget.querySelectorAll('button'))button.setAttribute('aria-pressed',String(button===choice));
    render();
  });
  window.addEventListener('festival-desk-role',event=>{
    revision++;role=event.detail.role;model=null;filter='pending';board.hidden=!role;managerPanel.hidden=true;
    list.replaceChildren();events.replaceChildren();
    if(role){id('addon-count').textContent='正在同步全場加點…';void refresh();}
  });
  id('refresh')?.addEventListener('click',refresh);
  document.addEventListener('visibilitychange',refresh);
  setInterval(refresh,20000);
})();
