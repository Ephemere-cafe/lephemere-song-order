(function(){
  'use strict';

  function ready(){
    var header=document.querySelector('.header');
    var identity=document.querySelector('.global-identity');
    var control=document.querySelector('.global-identity-control');
    var clock=document.querySelector('.header>.clock');
    var tabs=document.getElementById('mainTabs');
    var account=tabs&&tabs.querySelector('.main-tab-account');
    var select=document.getElementById('globalStaffSelect');
    var autoState=document.getElementById('receptionAutoState');
    var consolePanel=document.querySelector('.reception-console');
    var adminArea=document.getElementById('adminArea');

    if(header&&identity) header.appendChild(identity);
    function updateAuthVisibility(){if(identity&&adminArea)identity.hidden=adminArea.style.display==='none';}
    if(adminArea){new MutationObserver(updateAuthVisibility).observe(adminArea,{attributes:true,attributeFilter:['style']});updateAuthVisibility();}

    if(clock&&control){
      var connection=clock.querySelector('div');
      var theme=clock.querySelector('.theme-toggle');
      if(connection){connection.classList.add('reference-connection');control.insertBefore(connection,control.firstChild);}
      if(theme&&tabs){
        var themeSlot=document.createElement('div');
        themeSlot.className='sidebar-theme-slot';
        themeSlot.appendChild(theme);
        tabs.insertBefore(themeSlot,account||null);
      }
      clock.remove();
    }

    var copy=identity&&identity.querySelector('.global-identity-copy strong');
    if(copy){
      var now=new Date();
      copy.textContent=[now.getFullYear(),String(now.getMonth()+1).padStart(2,'0'),String(now.getDate()).padStart(2,'0')].join(' / ')+'　・　現場';
    }

    if(select&&control&&!select.closest('.reference-operator-select')){
      var operatorLabel=document.createElement('label');
      operatorLabel.className='reference-operator-select';
      operatorLabel.appendChild(document.createTextNode('目前操作：'));
      select.parentNode.insertBefore(operatorLabel,select);
      operatorLabel.appendChild(select);
    }

    var sidebarOperator=document.createElement('div');
    sidebarOperator.className='sidebar-operator';
    sidebarOperator.innerHTML='<span><strong id="sidebarOperatorName">尚未選擇</strong><small>目前操作身分</small></span>';
    if(tabs&&account)tabs.insertBefore(sidebarOperator,account);

    function updateOperator(){
      var target=document.getElementById('sidebarOperatorName');
      if(target&&select)target.textContent=select.options[select.selectedIndex]&&select.value?select.options[select.selectedIndex].text:'尚未選擇';
    }
    if(select){select.addEventListener('change',updateOperator);new MutationObserver(updateOperator).observe(select,{childList:true,subtree:true});updateOperator();}

    var managementHome=tabs&&tabs.querySelector('.management-home-tab');
    var managerRoutes=tabs&&tabs.querySelector('.manager-route-tabs');
    function updateManagementState(){
      if(!managementHome||!managerRoutes)return;
      managementHome.classList.toggle('section-active',!!managerRoutes.querySelector('.main-tab.active'));
    }
    if(managerRoutes)new MutationObserver(updateManagementState).observe(managerRoutes,{subtree:true,attributes:true,attributeFilter:['class']});
    updateManagementState();

    var managementSearch=document.getElementById('operationsHubSearch');
    if(managementSearch){
      managementSearch.addEventListener('input',function(){
        var keyword=this.value.trim().toLowerCase();
        document.querySelectorAll('#operationsHubGrid .operations-hub-card').forEach(function(card){card.hidden=!!keyword&&card.textContent.toLowerCase().indexOf(keyword)===-1;});
      });
    }
    document.addEventListener('click',function(event){
      var liveTarget=event.target.closest('[data-live-target]');
      if(!liveTarget)return;
      var route=document.querySelector('.main-tab[data-main="'+liveTarget.getAttribute('data-live-target')+'"]');
      if(route)route.click();
    });

    if(autoState&&consolePanel){
      autoState.setAttribute('type','button');
      autoState.setAttribute('aria-expanded','false');
      autoState.addEventListener('click',function(){
        var open=consolePanel.classList.toggle('is-open');
        autoState.setAttribute('aria-expanded',String(open));
      });
      document.addEventListener('click',function(event){
        if(!consolePanel.classList.contains('is-open')||consolePanel.contains(event.target)||autoState.contains(event.target))return;
        consolePanel.classList.remove('is-open');
        autoState.setAttribute('aria-expanded','false');
      });
    }
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',ready);else ready();
})();
