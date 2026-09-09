(function(){
  'use strict';
  if(!window.firebase || !firebase.apps || !firebase.apps.length) return;
  var db=firebase.database();
  var auth=firebase.auth();
  var ROOT='lephemere/guestbookSubmissions';
  var PUBLIC_ROOT='lephemere/guestbookPublic';
  var MANAGER_EMAIL='tanjicafe@gmail.com';
  var submissions=[];
  var publications=[];
  var selectedId='';
  var filter='all';
  var canManage=false;
  var listening=false;
  var submissionsRef=db.ref(ROOT);
  var publicRef=db.ref(PUBLIC_ROOT);

  function byId(id){return document.getElementById(id);}
  function clean(value,max){return String(value||'').trim().slice(0,max);}
  function status(id,text,state){var node=byId(id);if(!node)return;node.textContent=text||'';node.dataset.state=state||'';}
  function managerExpression(user,owner,role){return !!user&&(String(user.email||'').toLowerCase()===MANAGER_EMAIL||owner===user.uid||role==='manager');}
  async function checkManager(user){if(!user)return false;var values=await Promise.all([db.ref('lephemere/todayStaff/_access/ownerUid').once('value'),db.ref('lephemere/todayStaff/_access/users/'+user.uid+'/role').once('value')]);return managerExpression(user,values[0].val(),values[1].val());}
  function timeLabel(value){if(!Number(value))return '時間待同步';try{return new Date(Number(value)).toLocaleString('zh-TW',{timeZone:'Asia/Taipei',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hour12:false});}catch(_error){return '';}}
  function consentLabel(value){return value==='named'?'具名可公開':value==='anonymous'?'匿名可公開':'不公開';}
  function publicationFor(item){var id=item&&item.management&&item.management.publicationId;return id?publications.find(function(row){return row.id===id;})||null:null;}
  function submissionIdForPublication(publicationId){var item=submissions.find(function(row){return row.management&&row.management.publicationId===publicationId;});return item?item.id:'';}
  function tag(text,className){var node=document.createElement('span');node.className='guestbook-admin-tag'+(className?' '+className:'');node.textContent=text;return node;}
  function normalize(value){return Object.keys(value||{}).map(function(id){return Object.assign({id:id},value[id]||{});}).sort(function(a,b){return Number(b.createdAt||b.publishedAt||0)-Number(a.createdAt||a.publishedAt||0);});}
  function setManagerUI(){
    var tab=byId('guestbookAdminTab');if(!tab)return;
    tab.querySelectorAll('.manager-only').forEach(function(node){node.hidden=!canManage;});
    byId('guestbookReadonlyNote').hidden=canManage;
  }
  function renderMetrics(){
    var unread=submissions.filter(function(item){return !(item.management&&item.management.readAt);}).length;
    byId('guestbookUnreadCount').textContent=unread;
    byId('guestbookAllowedCount').textContent=submissions.filter(function(item){return item.consentMode==='anonymous'||item.consentMode==='named';}).length;
    byId('guestbookPublishedCount').textContent=publications.length;
    byId('guestbookPrivateCount').textContent=submissions.filter(function(item){return item.consentMode==='private';}).length;
    var nav=byId('navGuestbookCount');if(nav){nav.textContent=unread;nav.hidden=!unread;}
  }
  function filteredRows(){return submissions.filter(function(item){var published=!!publicationFor(item);if(filter==='unread')return !(item.management&&item.management.readAt);if(filter==='published')return published;if(filter==='private')return item.consentMode==='private';return true;});}
  function renderList(){
    var list=byId('guestbookSubmissionList');list.replaceChildren();var rows=filteredRows();
    if(!rows.length){var empty=document.createElement('span');empty.className='empty';empty.textContent='此篩選目前沒有留言。';list.appendChild(empty);return;}
    rows.forEach(function(item){
      var button=document.createElement('button');button.type='button';button.className='guestbook-admin-item'+(selectedId===item.id?' active':'');button.dataset.id=item.id;
      var head=document.createElement('div');head.className='guestbook-admin-item-head';if(!(item.management&&item.management.readAt))head.appendChild(tag('未讀','unread'));if(publicationFor(item))head.appendChild(tag('已刊登','published'));head.appendChild(tag(consentLabel(item.consentMode)));
      var title=document.createElement('strong');title.textContent='給 '+(clean(item.recipientNameSnapshot,40)||'曇時全體成員');var time=document.createElement('time');time.textContent=timeLabel(item.createdAt);head.append(title,time);
      var preview=document.createElement('p');preview.textContent=clean(item.messageOriginal,1000);button.append(head,preview);button.addEventListener('click',function(){selectedId=item.id;renderList();renderDetail();});list.appendChild(button);
    });
  }
  function addMeta(list,label,value){var dt=document.createElement('dt');dt.textContent=label;var dd=document.createElement('dd');dd.textContent=value;list.append(dt,dd);}
  function renderDetail(){
    var item=submissions.find(function(row){return row.id===selectedId;});var empty=byId('guestbookDetailEmpty');var detail=byId('guestbookDetail');
    if(!item){empty.hidden=false;detail.hidden=true;return;}empty.hidden=true;detail.hidden=false;
    var published=publicationFor(item);var tags=byId('guestbookDetailTags');tags.replaceChildren(tag('客人原始投稿'),tag(consentLabel(item.consentMode)),published?tag('已刊登','published'):tag('尚未刊登'));
    byId('guestbookDetailTitle').textContent='給 '+(clean(item.recipientNameSnapshot,40)||'曇時全體成員')+' 的留言';
    var meta=byId('guestbookDetailMeta');meta.replaceChildren();addMeta(meta,'公開選擇',consentLabel(item.consentMode));addMeta(meta,'內部名字',clean(item.authorName,40)||'未填寫');addMeta(meta,'投稿時間',timeLabel(item.createdAt));addMeta(meta,'投稿來源','客人官網留言箱');
    byId('guestbookOriginalText').textContent=clean(item.messageOriginal,1000);byId('guestbookDisplayText').value=published?clean(published.displayText,1000):clean(item.messageOriginal,1000);
    byId('guestbookPublish').disabled=!canManage||item.consentMode==='private';byId('guestbookPublish').textContent=published?'更新官網展示文字':item.consentMode==='anonymous'?'刊登匿名留言':'刊登具名留言';byId('guestbookUnpublish').disabled=!canManage||!published;byId('guestbookMarkRead').disabled=!canManage||!!(item.management&&item.management.readAt);byId('guestbookDelete').disabled=!canManage;
    setManagerUI();status('guestbookAdminStatus',item.consentMode==='private'?'客人選擇不公開，管理員不能刊登此投稿。':'原文與展示版本會分開保存。','');
  }
  function renderPublicAdmin(){
    var list=byId('guestbookPublicAdminList');list.replaceChildren();if(!publications.length){var empty=document.createElement('span');empty.className='empty';empty.textContent='目前沒有官網已刊登留言。';list.appendChild(empty);return;}
    publications.forEach(function(item){
      var row=document.createElement('article');row.className='guestbook-public-admin-item';row.appendChild(tag(item.sourceType==='admin'?'管理員新增':'客人投稿'));
      var text=document.createElement('p');text.textContent=(item.displayMode==='named'&&item.displayName?'— '+clean(item.displayName,40)+'　':'匿名主人　')+clean(item.displayText,1000);row.appendChild(text);
      var actions=document.createElement('div');actions.className='guestbook-public-admin-actions';var edit=document.createElement('button');edit.type='button';edit.className='btn ghost small';edit.textContent='編輯';edit.addEventListener('click',function(){editPublication(item);});var remove=document.createElement('button');remove.type='button';remove.className='btn ghost small';remove.textContent='取消刊登';remove.addEventListener('click',function(){unpublishById(item.id,submissionIdForPublication(item.id));});actions.append(edit,remove);row.appendChild(actions);list.appendChild(row);
    });
  }
  function renderAll(){renderMetrics();renderList();renderDetail();renderPublicAdmin();setManagerUI();}
  async function markRead(){if(!canManage||!selectedId)return;await submissionsRef.child(selectedId+'/management').update({readAt:firebase.database.ServerValue.TIMESTAMP,readByUid:auth.currentUser.uid,updatedAt:firebase.database.ServerValue.TIMESTAMP,updatedByUid:auth.currentUser.uid});}
  async function publishSelected(){
    if(!canManage)return;var item=submissions.find(function(row){return row.id===selectedId;});if(!item)return;if(item.consentMode==='private'){status('guestbookAdminStatus','客人選擇不公開，不能刊登。','error');return;}
    var displayText=clean(byId('guestbookDisplayText').value,1000);if(displayText.length<2){status('guestbookAdminStatus','官網展示文字至少需要兩個字。','error');return;}if(item.consentMode==='named'&&!clean(item.authorName,40)){status('guestbookAdminStatus','此具名投稿沒有名字，不能刊登。','error');return;}
    var existing=publicationFor(item);var id=existing?existing.id:publicRef.push().key;var value={displayMode:item.consentMode,displayText:displayText,recipientLabel:clean(item.recipientNameSnapshot,40)||'曇時全體成員',sourceType:'guest',sortOrder:existing?Number(existing.sortOrder||0):Date.now(),publishedAt:existing&&existing.publishedAt?existing.publishedAt:firebase.database.ServerValue.TIMESTAMP,updatedAt:firebase.database.ServerValue.TIMESTAMP};if(item.consentMode==='named')value.displayName=clean(item.authorName,40);
    var updates={};updates[PUBLIC_ROOT+'/'+id]=value;updates[ROOT+'/'+item.id+'/management/publicationId']=id;updates[ROOT+'/'+item.id+'/management/readAt']=item.management&&item.management.readAt||firebase.database.ServerValue.TIMESTAMP;updates[ROOT+'/'+item.id+'/management/readByUid']=auth.currentUser.uid;updates[ROOT+'/'+item.id+'/management/updatedAt']=firebase.database.ServerValue.TIMESTAMP;updates[ROOT+'/'+item.id+'/management/updatedByUid']=auth.currentUser.uid;
    status('guestbookAdminStatus','正在儲存並同步官網…','busy');await db.ref().update(updates);status('guestbookAdminStatus','已儲存，官網會顯示安全處理後的展示版本。','success');
  }
  async function unpublishById(publicationId,submissionId){if(!canManage||!publicationId)return;if(!window.confirm('確定要取消刊登這則留言嗎？客人原始投稿仍會保留。'))return;var updates={};updates[PUBLIC_ROOT+'/'+publicationId]=null;if(submissionId){updates[ROOT+'/'+submissionId+'/management/publicationId']=null;updates[ROOT+'/'+submissionId+'/management/updatedAt']=firebase.database.ServerValue.TIMESTAMP;updates[ROOT+'/'+submissionId+'/management/updatedByUid']=auth.currentUser.uid;}await db.ref().update(updates);}
  function unpublishSelected(){var item=submissions.find(function(row){return row.id===selectedId;});var publication=publicationFor(item);if(publication)unpublishById(publication.id,item.id);}
  async function deleteSelected(){
    if(!canManage||!selectedId)return;var item=submissions.find(function(row){return row.id===selectedId;});if(!item)return;var publication=publicationFor(item);
    var warning=publication?'確定永久刪除這封投稿嗎？此操作會同時移除官網已刊登留言，且無法復原。':'確定永久刪除這封投稿嗎？刪除後無法復原。';
    if(!window.confirm(warning))return;
    var deletingId=item.id;var updates={};updates[ROOT+'/'+deletingId]=null;if(publication)updates[PUBLIC_ROOT+'/'+publication.id]=null;
    status('guestbookAdminStatus','正在永久刪除留言…','busy');await db.ref().update(updates);selectedId='';renderAll();
  }
  async function editPublication(item){if(!canManage)return;var next=window.prompt('編輯官網展示文字（客人原文不會被修改）',clean(item.displayText,1000));if(next===null)return;next=clean(next,1000);if(next.length<2){window.alert('展示文字至少需要兩個字。');return;}await publicRef.child(item.id).update({displayText:next,updatedAt:firebase.database.ServerValue.TIMESTAMP});}
  async function saveManual(){
    if(!canManage)return;var mode=byId('guestbookManualMode').value==='named'?'named':'anonymous';var name=clean(byId('guestbookManualName').value,40);var recipient=clean(byId('guestbookManualRecipient').value,40)||'曇時全體成員';var text=clean(byId('guestbookManualText').value,1000);if(mode==='named'&&!name){status('guestbookManualStatus','具名公開請填寫顯示名字。','error');return;}if(text.length<2){status('guestbookManualStatus','展示文字至少需要兩個字。','error');return;}
    var value={displayMode:mode,displayText:text,recipientLabel:recipient,sourceType:'admin',sortOrder:Date.now(),publishedAt:firebase.database.ServerValue.TIMESTAMP,updatedAt:firebase.database.ServerValue.TIMESTAMP};if(mode==='named')value.displayName=name;
    status('guestbookManualStatus','正在新增官網留言…','busy');await publicRef.push(value);byId('guestbookManualText').value='';byId('guestbookManualName').value='';status('guestbookManualStatus','已新增並同步官網。','success');
  }
  function bind(){
    document.querySelectorAll('[data-guestbook-filter]').forEach(function(button){button.addEventListener('click',function(){filter=button.dataset.guestbookFilter;document.querySelectorAll('[data-guestbook-filter]').forEach(function(node){node.classList.toggle('active',node===button);});renderList();});});
    byId('guestbookMarkRead').addEventListener('click',function(){markRead().catch(function(error){status('guestbookAdminStatus','操作失敗：'+error.message,'error');});});byId('guestbookPublish').addEventListener('click',function(){publishSelected().catch(function(error){status('guestbookAdminStatus','刊登失敗：'+error.message,'error');});});byId('guestbookUnpublish').addEventListener('click',function(){unpublishSelected();});byId('guestbookDelete').addEventListener('click',function(){deleteSelected().catch(function(error){status('guestbookAdminStatus','刪除失敗：'+error.message,'error');});});
    byId('guestbookAddDisplay').addEventListener('click',function(){byId('guestbookManualPanel').hidden=false;byId('guestbookManualPanel').scrollIntoView({behavior:'smooth',block:'start'});});byId('guestbookManualClose').addEventListener('click',function(){byId('guestbookManualPanel').hidden=true;});byId('guestbookManualSave').addEventListener('click',function(){saveManual().catch(function(error){status('guestbookManualStatus','新增失敗：'+error.message,'error');});});
  }
  function subscribe(){if(listening)return;listening=true;submissionsRef.on('value',function(snapshot){submissions=normalize(snapshot.val());if(selectedId&&!submissions.some(function(row){return row.id===selectedId;}))selectedId='';renderAll();},function(error){var list=byId('guestbookSubmissionList');var message=document.createElement('span');message.className='empty';message.textContent='讀取失敗：'+clean(error.message,120);list.replaceChildren(message);});publicRef.on('value',function(snapshot){publications=normalize(snapshot.val());renderAll();});}
  bind();
  auth.onAuthStateChanged(async function(user){canManage=false;setManagerUI();if(!user)return;try{canManage=await checkManager(user);}catch(_error){canManage=false;}setManagerUI();subscribe();});
})();
