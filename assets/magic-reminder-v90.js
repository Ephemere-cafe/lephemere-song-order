/* V90: no purchase, pricing, cart, storage, or database writes. */
(function(){'use strict';
  var overlay=document.getElementById('magicReminder'),close=document.getElementById('magicReminderClose'),done=document.getElementById('magicReminderDone'),previousFocus=null;
  function isEggRice(item){return !!item&&item.serviceType!=='magic'&&/蛋包飯/.test(item.name||'')&&!/魔法/.test(item.name||'');}
  function isLegacyAddon(item){return isEggRice(item)&&/魔法|萌え|萌萌/i.test(item.addonLabel||'');}
  function open(){previousFocus=document.activeElement;overlay.hidden=false;close.focus();}
  function dismiss(){overlay.hidden=true;if(previousFocus&&previousFocus.isConnected)previousFocus.focus();previousFocus=null;}
  close.addEventListener('click',dismiss);done.addEventListener('click',dismiss);
  overlay.addEventListener('click',function(e){if(e.target===overlay)dismiss();});
  document.addEventListener('keydown',function(e){if(overlay.hidden)return;if(e.key==='Escape'){e.preventDefault();e.stopImmediatePropagation();dismiss();}else if(e.key==='Tab'){if(e.shiftKey&&document.activeElement===close){e.preventDefault();done.focus();}else if(!e.shiftKey&&document.activeElement===done){e.preventDefault();close.focus();}}},true);
  window.LephemereMagicReminder={open:open,isEggRice:isEggRice,isLegacyAddon:isLegacyAddon};
})();
