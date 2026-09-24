(function(){
  'use strict';

  var tabs=document.getElementById('mainTabs');
  var badge=document.getElementById('currentAccessBadge');
  if(!tabs||!badge)return;

  function isManager(){return badge.classList.contains('manager');}

  function syncRoleUI(){
    var manager=isManager();
    tabs.querySelectorAll('.staff-only').forEach(function(button){button.hidden=manager;});
    var photoLabel=tabs.querySelector('.main-tab[data-main="polaroid"] span:nth-child(2)');
    if(photoLabel)photoLabel.textContent=manager?'拍立得管理':'拍立得工作';
  }

  function revealActiveFolder(button){
    var folder=button&&button.closest('.main-tab-folder');
    if(folder)folder.open=true;
  }

  tabs.addEventListener('click',function(event){
    var button=event.target.closest('.main-tab');
    if(!button)return;
    revealActiveFolder(button);
    if(button.hasAttribute('data-staff-completed')){
      window.setTimeout(function(){
        var completed=document.querySelector('#orderSubTabs [data-filter="completed"]');
        if(completed)completed.click();
      },0);
    }
    if(window.matchMedia('(max-width:760px)').matches){
      window.setTimeout(function(){window.scrollTo({top:0,behavior:'smooth'});},0);
    }
  });

  new MutationObserver(syncRoleUI).observe(badge,{attributes:true,childList:true,subtree:true});
  syncRoleUI();
})();
