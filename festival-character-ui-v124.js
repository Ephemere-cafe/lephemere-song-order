/* Display and edit character copy without renaming any commerce identity. */
(()=>{'use strict';const api=window.FestivalCharacters;if(!api)return;
 const text=(tag,value,className)=>{const node=document.createElement(tag);node.textContent=value||'';if(className)node.className=className;return node;};
 function facts(value){const rows=[];for(const line of String(value||'').split('\n')){const match=line.match(/^([^：:]{1,18})[：:]\s*(.*)$/);if(match)rows.push({label:match[1],value:match[2]});else if(rows.length)rows[rows.length-1].value+='\n'+line;}return rows;}
 function initPublic(){
  if(!document.getElementById('school-a')&&!document.getElementById('festival-cover-name')&&!document.getElementById('np-maidNav'))return;
  window.FestivalPresentation?.load().then(data=>{
   const all=[];for(const team of ['A','B'])for(const member of data.teams?.[team]?.members||[])all.push({member,team,school:data.teams[team].name});
   for(const team of ['A','B']){
    const host=document.getElementById('school-'+team.toLowerCase());if(!host)continue;
    for(const [index,button]of [...host.querySelectorAll('.member')].entries()){
     const member=data.teams?.[team]?.members?.[index];if(!member)continue;const identity=api.identity(member);button.dataset.staffName=member.name;
     const name=button.querySelector('strong');if(name){name.textContent=identity.shortName;if(identity.name!==identity.staffName)name.append(text('small',identity.staffName,'character-staff'));}
     button.setAttribute('aria-label','查看'+identity.name+'（'+member.name+'）的人設');
     button.addEventListener('click',()=>{
      const heading=document.getElementById('profile-name'),originalFacts=document.getElementById('profile-character'),originalIntro=document.getElementById('profile-intro');if(!heading)return;
      heading.textContent=identity.name;document.getElementById('profile-school').textContent=data.teams[team].name+' · '+member.name;
      originalFacts.hidden=true;originalIntro.hidden=true;
      heading.parentElement.querySelectorAll('.character-facts,.character-story').forEach(el=>el.remove());
      const meta=document.createElement('dl');meta.className='character-facts';
      for(const item of facts(member.character)){if(['姓名','名字','名稱'].includes(item.label))continue;meta.append(text('dt',item.label),text('dd',item.value));}
      const story=document.createElement('div');story.className='character-story';
      for(const paragraph of String(member.intro||'').split(/\n\s*\n/).filter(Boolean))story.append(text('p',paragraph));
      originalFacts.before(meta);originalIntro.after(story);
     });
    }
   }
   const cover=document.getElementById('festival-cover-name');let rendered='';
   function syncCover(){if(!cover||cover.textContent===rendered)return;const value=cover.textContent;for(const {member}of all){const suffix=' · '+member.name;if(!value.endsWith(suffix))continue;const identity=api.identity(member);rendered=value.slice(0,-member.name.length)+identity.shortName+(identity.name!==member.name?'（'+member.name+'）':'');if(rendered!==value)cover.textContent=rendered;return;}}
   if(cover){new MutationObserver(syncCover).observe(cover,{childList:true});syncCover();}
   const staff=document.getElementById('np-maidNav');
   function syncStaff(){if(!staff)return;for(const button of staff.querySelectorAll('[data-maid]:not([data-maid=all])')){
    const span=button.querySelector(':scope>span');if(!span||button.dataset.characterReady==='true')continue;
    const old=span.textContent;const entry=all.find(({member})=>member.name===old)||all.find(({member,team})=>api.find(old,team)?.id===api.find(member.name,team)?.id&&api.find(old,team));if(!entry)continue;
    const identity=api.identity(entry.member);button.dataset.staffName=old;button.dataset.characterReady='true';span.textContent=identity.shortName;
    if(identity.name!==entry.member.name)span.after(text('em',entry.member.name,'character-staff'));button.setAttribute('aria-label',identity.name+'（'+entry.member.name+'）的服務');
   }}
   if(staff){new MutationObserver(syncStaff).observe(staff,{childList:true});syncStaff();}
  });
 }
 function initEditor(){const panel=document.getElementById('festival-appearance'),form=document.getElementById('festival-appearance-form'),teams=document.getElementById('festival-appearance-teams');if(!panel||!form||!teams)return;
  const tools=document.createElement('div');tools.className='character-import-tools';const button=text('button','帶入本次十位人設');button.type='button';button.disabled=true;button.id='festival-import-characters';const note=text('p','角色設定第一行「姓名：」會顯示為本次角色名；成員名稱維持原店員，確保點餐與排程對應。');const status=text('p','','character-import-status');status.setAttribute('role','status');tools.append(button,note,status);panel.querySelector('section').prepend(tools);
  function fill(overwrite=false){if(!overwrite&&(!/學園祭/.test(form.elements.namedItem('title')?.value||'')||form.elements.namedItem('AName')?.value!=='曇華女子學院'||form.elements.namedItem('BName')?.value!=='曇光女子學院'))return 0;let count=0;for(const team of ['A','B'])for(let index=0;index<5;index++){
   const prefix=team+index,name=form.elements.namedItem(prefix+'name'),character=form.elements.namedItem(prefix+'character'),intro=form.elements.namedItem(prefix+'intro');if(!name||!character||!intro)continue;
   const record=api.find(name.value,team);if(!record||(!overwrite&&(character.value.trim()||intro.value.trim())))continue;const fields=api.fields(record);character.value=fields.character;intro.value=fields.intro;count++;
  }if(count)status.textContent='已帶入 '+count+' 位的人設草稿。照片與原店員名稱保留；請檢查後按「儲存並更新學園祭頁」。';return count;}
  button.addEventListener('click',()=>{fill(true);form.dispatchEvent(new Event('input',{bubbles:true}));});
  new MutationObserver(()=>{button.disabled=form.hidden;fill(false);}).observe(teams,{childList:true});new MutationObserver(()=>{button.disabled=form.hidden;}).observe(form,{attributes:true,attributeFilter:['hidden']});
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>{initPublic();initEditor();});else{initPublic();initEditor();}
})();
