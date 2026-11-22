(function(){
  'use strict';
  if(!window.firebase || !firebase.apps || !firebase.apps.length) return;
  var db=firebase.database();
  var form=document.getElementById('guestbookForm');
  var list=document.getElementById('guestbookPublicList');
  if(!form || !list) return;
  var recipient=document.getElementById('guestbookRecipient');
  var author=document.getElementById('guestbookAuthorName');
  var message=document.getElementById('guestbookMessage');
  var confirmBox=document.getElementById('guestbookConfirm');
  var submit=document.getElementById('guestbookSubmit');
  var status=document.getElementById('guestbookStatus');
  var layout=form.closest('.guestbook-layout');
  var heading=document.querySelector('#guestbook .guestbook-heading');
  var lastSubmitAt=0;
  var motionUi=null;

  function clean(value,max){return String(value||'').trim().slice(0,max);}
  function setStatus(text,state){status.textContent=text||'';status.dataset.state=state||'';}
  function selectedConsent(){var input=form.querySelector('input[name="guestbookConsent"]:checked');return input?input.value:'private';}
  function element(tag,className,text){var node=document.createElement(tag);if(className)node.className=className;if(text!==undefined)node.textContent=text;return node;}

  function createModal(content,className,label){
    var modal=element('div','guestbook-letter-modal');modal.hidden=true;
    var dialog=element('div','guestbook-letter-dialog '+className);dialog.setAttribute('role','dialog');dialog.setAttribute('aria-modal','true');dialog.setAttribute('aria-label',label);
    var closeButton=element('button','guestbook-modal-close','×');closeButton.type='button';closeButton.setAttribute('aria-label','關閉');
    dialog.append(closeButton,content);modal.appendChild(dialog);document.body.appendChild(modal);
    function hide(){modal.hidden=true;document.body.classList.remove('guest-letter-modal-open');if(modal.returnFocus&&document.contains(modal.returnFocus))modal.returnFocus.focus();}
    closeButton.addEventListener('click',hide);modal.addEventListener('click',function(event){if(event.target===modal)hide();});modal.hideGuestbookModal=hide;
    return modal;
  }
  function showModal(modal,opener){modal.returnFocus=opener||document.activeElement;modal.hidden=false;document.body.classList.add('guest-letter-modal-open');modal.querySelector('.guestbook-modal-close').focus();}

  function createThanksModal(){
    var cast=[
      ['夏沐','xiamu.png'],['彌亞璃卡','miarica.png'],['玥紅雪','yuehongxue.png'],['奈帕','naipa.png'],
      ['小顏','xiaoyan.png'],['蒼','cang.png'],['璐可','ruko.png'],['草莓','strawberry.png'],
      ['諾依','noi.png'],['馬鈴薯','potato.png'],['魔可娜','mokona.png']
    ];
    var content=element('div','guestbook-thanks-content');
    content.append(element('p','guestbook-thanks-eyebrow','Letter received'),element('h3','', '今晚的心意，我們收到了'));
    content.appendChild(element('p','guestbook-thanks-copy','謝謝你把這段心情留給曇時。願今晚的溫柔，陪你走到下一次相見。'));
    var chibis=element('div','guestbook-thanks-chibis');
    cast.forEach(function(member){
      var figure=element('span','guestbook-thanks-chibi');
      var image=document.createElement('img');image.src='assets/chibi-cast/'+member[1];image.alt=member[0];image.loading='eager';
      figure.appendChild(image);chibis.appendChild(figure);
    });
    content.append(chibis,element('p','guestbook-thanks-caption','曇時全體成員 ・ 謝謝你的來信'));
    var button=element('button','guestbook-thanks-button','收好這份回憶');button.type='button';content.appendChild(button);
    var modal=createModal(content,'guestbook-thanks-dialog','來信已送達');
    button.addEventListener('click',function(){modal.hideGuestbookModal();});
    return modal;
  }

  function setupMotionUi(){
    if(window.ephemereInlineGuestbook)return null;
    if(!layout||!heading)return null;
    var stage=element('section','guestbook-motion-stage');stage.setAttribute('aria-label','曇時珍藏的來信');
    var intro=element('div','guestbook-motion-intro');
    var introTitle=element('div');introTitle.append(element('p','eyebrow','Letters we keep'),element('h3','', '曇時珍藏的來信'));
    intro.append(introTitle,element('p','', '被珍惜的片刻，會像晚風一樣輕輕經過。點一封信，讀完它留下的心情。'));
    var lanes=element('div','guestbook-motion-lanes');
    var laneOne=element('div','guestbook-motion-lane');var laneTwo=element('div','guestbook-motion-lane');lanes.append(laneOne,laneTwo);
    var empty=element('p','guestbook-motion-empty','正在展開曇時珍藏的來信…');
    var invite=element('div','guestbook-write-invite');
    var inviteCopy=element('p','', '今夜，也想留下一句話嗎？');inviteCopy.appendChild(element('small','', '寫給曇時，或寫給今晚陪伴你的那一位。'));
    var writeButton=element('button','guestbook-write-cta','寫一封信給曇時');writeButton.type='button';invite.append(inviteCopy,writeButton);
    stage.append(intro,lanes,empty,invite);heading.insertAdjacentElement('afterend',stage);

    var writeModal=createModal(form,'guestbook-write-dialog','寫一封信給曇時');
    var messageContent=element('div');var messageQuote=element('blockquote');var messageMeta=element('p');messageContent.append(messageQuote,messageMeta);
    var messageModal=createModal(messageContent,'guestbook-message-dialog','完整留言');
    var thanksModal=createThanksModal();
    writeButton.addEventListener('click',function(){showModal(writeModal,writeButton);});
    document.body.classList.add('guest-motion-ready');
    return {lanes:lanes,laneOne:laneOne,laneTwo:laneTwo,empty:empty,writeButton:writeButton,writeModal:writeModal,messageModal:messageModal,thanksModal:thanksModal,messageQuote:messageQuote,messageMeta:messageMeta};
  }

  function renderRecipients(value){
    var current=recipient.value;
    var records=Object.keys(value||{}).map(function(id){return {id:id,data:value[id]||{}};})
      .filter(function(item){return item.data.name && item.data.websiteVisible!==false;})
      .sort(function(a,b){return Number(a.data.sortOrder||0)-Number(b.data.sortOrder||0)||String(a.data.name).localeCompare(String(b.data.name),'zh-Hant');});
    recipient.replaceChildren();
    var all=document.createElement('option');all.value='';all.textContent='曇時全體成員';recipient.appendChild(all);
    records.forEach(function(item){var option=document.createElement('option');option.value=item.id;option.textContent=clean(item.data.name,40);recipient.appendChild(option);});
    if(Array.prototype.some.call(recipient.options,function(option){return option.value===current;})) recipient.value=current;
  }
  function updateNameRequirement(){
    var named=selectedConsent()==='named';
    author.required=named;
    document.getElementById('guestbookNameHint').textContent=named?'（具名公開必填；官網只顯示名字）':'（不公開／匿名公開可留白）';
  }
  function openPublicMessage(item,opener){
    if(!motionUi)return;
    var displayName=item.displayMode==='named'&&clean(item.displayName,40)?clean(item.displayName,40):'一位旅人';
    var recipientLabel=clean(item.recipientLabel,40)||'曇時全體成員';
    motionUi.messageQuote.textContent='「'+clean(item.displayText,1000)+'」';
    motionUi.messageMeta.textContent='— '+displayName+' ・ 給 '+recipientLabel;
    showModal(motionUi.messageModal,opener);
  }
  function letterCard(item,duplicate){
    var card=element('button','floating-letter');card.type='button';card.setAttribute('aria-label','閱讀完整留言');
    var body=element('span');var quote=element('p','',clean(item.displayText,1000));
    var meta=element('span','floating-letter-meta');
    var displayName=item.displayMode==='named'&&clean(item.displayName,40)?clean(item.displayName,40):'一位旅人';
    meta.append(element('span','', '— '+displayName),element('span','', '給 '+(clean(item.recipientLabel,40)||'曇時全體成員')));
    body.append(quote,meta);card.appendChild(body);
    if(duplicate){card.tabIndex=-1;card.setAttribute('aria-hidden','true');}else card.addEventListener('click',function(){openPublicMessage(item,card);});
    return card;
  }
  function fillLane(lane,items,animate){
    lane.replaceChildren();lane.classList.toggle('is-static',!animate);
    var first=element('div','guestbook-motion-group');items.forEach(function(item){first.appendChild(letterCard(item,false));});lane.appendChild(first);
    if(animate){var duplicate=element('div','guestbook-motion-group');duplicate.setAttribute('aria-hidden','true');items.forEach(function(item){duplicate.appendChild(letterCard(item,true));});lane.appendChild(duplicate);}
  }
  function renderPublic(value){
    var rows=Object.keys(value||{}).map(function(id){return Object.assign({id:id},value[id]||{});})
      .filter(function(item){return (item.displayMode==='anonymous'||item.displayMode==='named')&&clean(item.displayText,1000);})
      .sort(function(a,b){return Number(b.publishedAt||0)-Number(a.publishedAt||0)||Number(a.sortOrder||0)-Number(b.sortOrder||0);})
      .slice(0,24);
    if(window.ephemereInlineGuestbook){window.ephemereInlineGuestbook.render(rows);return;}
    if(!motionUi)return;
    if(!rows.length){motionUi.lanes.hidden=true;motionUi.empty.textContent='公開留言正在慢慢收集。也歡迎留下今晚的心情。';motionUi.empty.hidden=false;motionUi.laneOne.replaceChildren();motionUi.laneTwo.replaceChildren();return;}
    motionUi.empty.hidden=true;motionUi.lanes.hidden=false;
    var animate=rows.length>=3;var offset=Math.max(1,Math.floor(rows.length/2));var alternate=rows.slice(offset).concat(rows.slice(0,offset));
    fillLane(motionUi.laneOne,rows,animate);
    if(animate){motionUi.laneTwo.hidden=false;fillLane(motionUi.laneTwo,alternate,true);}else{motionUi.laneTwo.hidden=true;motionUi.laneTwo.replaceChildren();}
  }

  form.addEventListener('change',function(event){if(event.target.name==='guestbookConsent') updateNameRequirement();});
  form.addEventListener('submit',function(event){
    event.preventDefault();
    var consent=selectedConsent();
    var authorName=clean(author.value,40);
    var messageText=clean(message.value,1000);
    var website=clean(document.getElementById('guestbookWebsite').value,200);
    if(website){setStatus('留言未能送出，請重新整理後再試。','error');return;}
    if(consent==='named'&&!authorName){author.focus();setStatus('選擇具名公開時，請填寫希望顯示的名字。','error');return;}
    if(messageText.length<2){message.focus();setStatus('請至少寫下兩個字的留言。','error');return;}
    if(!confirmBox.checked){confirmBox.focus();setStatus('請先確認已閱讀投稿須知。','error');return;}
    if(Date.now()-lastSubmitAt<20000){setStatus('留言正在送出或剛剛已送出，請稍候再試。','error');return;}
    var selected=recipient.options[recipient.selectedIndex];
    var record={
      recipientStaffId:clean(recipient.value,80),
      recipientNameSnapshot:clean(selected?selected.textContent:'曇時全體成員',40)||'曇時全體成員',
      authorName:authorName,
      messageOriginal:messageText,
      consentMode:consent,
      createdAt:firebase.database.ServerValue.TIMESTAMP,
      schemaVersion:1
    };
    submit.disabled=true;submit.textContent='正在送出…';setStatus('正在替你把信收好…','');lastSubmitAt=Date.now();
    db.ref('lephemere/guestbookSubmissions').push(record).then(function(){
      form.reset();updateNameRequirement();setStatus('信已收到。謝謝你把今晚的心情留給曇時。','success');
      if(motionUi){motionUi.writeModal.hideGuestbookModal();showModal(motionUi.thanksModal,motionUi.writeButton);}
    }).catch(function(error){
      lastSubmitAt=0;console.error('Guestbook submission failed',error);setStatus('留言未能送出，請確認連線後再試一次。','error');
    }).then(function(){submit.disabled=false;submit.textContent='把這封信交給曇時';});
  });

  document.addEventListener('keydown',function(event){if(event.key==='Escape'&&motionUi){if(!motionUi.writeModal.hidden)motionUi.writeModal.hideGuestbookModal();if(!motionUi.messageModal.hidden)motionUi.messageModal.hideGuestbookModal();if(!motionUi.thanksModal.hidden)motionUi.thanksModal.hideGuestbookModal();}});
  motionUi=setupMotionUi();
  updateNameRequirement();
  db.ref('lephemere/staffRoster').on('value',function(snapshot){renderRecipients(snapshot.val());},function(){renderRecipients({});});
  db.ref('lephemere/guestbookPublic').on('value',function(snapshot){renderPublic(snapshot.val());},function(){renderPublic({});});
})();
