(() => {
  'use strict';

  const cast = ['xiamu','miarica','yuehongxue','naipa','xiaoyan','cang','ruko','strawberry','noi','potato','mokona'];
  const rows = new WeakMap();
  const panels = new Map();
  const limit = 8000;
  const grace = 130;

  function populate(row) {
    if (!row?.dataset.castRoot || row.children.length) return;
    const remaining = cast.slice();
    const images = Array.from({length:5}, (_, index)=>{
      const position = Math.floor(Math.random() * remaining.length);
      const [person] = remaining.splice(position,1);
      const img = document.createElement('img');
      img.src = row.dataset.castRoot + person + '.png';
      img.alt='';
      img.width=65;
      img.height=65;
      img.decoding='async';
      img.style.setProperty('--cafe-hop-delay',index*.12+'s');
      img.addEventListener('error',()=>{img.hidden=true;},{once:true});
      return img;
    });
    row.append(...images);
  }

  function show(target, options={}) {
    if (!target?.isConnected) return ()=>{};
    const old = rows.get(target);
    if (old) return old;
    const {inside=false,message='',signal} = options;
    if (signal?.aborted) return ()=>{};
    let widget;
    const start = setTimeout(()=>{
      if (!target.isConnected) return;
      widget = document.createElement('div');
      widget.className = 'cafe-inline-loading' + (inside?' cafe-image-loading':'');
      if (message) {
        widget.setAttribute('role','status');
        const label=document.createElement('span');
        label.textContent=message;
        widget.append(label);
      } else {
        widget.setAttribute('aria-hidden','true');
      }
      const row = document.createElement('div');
      row.className='cafe-loader-cast';
      row.setAttribute('aria-hidden','true');
      row.dataset.castRoot=document.documentElement.dataset.cafeCastRoot;
      populate(row);
      widget.prepend(row);
      if (inside) target.classList.add('cafe-loading-image-host');
      if (inside) target.append(widget); else target.after(widget);
    },grace);
    const timer = setTimeout(stop,limit);
    function stop(){
      clearTimeout(start);
      clearTimeout(timer);
      if (signal) signal.removeEventListener('abort',stop);
      widget?.remove();
      if (inside) target.classList.remove('cafe-loading-image-host');
      if(rows.get(target)===stop)rows.delete(target);
    }
    rows.set(target,stop);
    if(signal)signal.addEventListener('abort',stop,{once:true});
    return stop;
  }

  function watchText(ids,match,anchorSelector) {
    const elements = ids.map(id=>document.getElementById(id)).filter(Boolean);
    if (!elements.length) return;
    const anchor = anchorSelector ? elements[0].closest(anchorSelector) || elements[0] : elements[0];
    let pending = false;
    let stop;
    function sync(){
      const next = elements.some(element=>match.test(element.textContent.trim()));
      if(next===pending)return;
      pending=next;
      if(next)stop=show(anchor);
      else { stop?.(); stop=null; }
    }
    const observer = new MutationObserver(sync);
    for(const element of elements)observer.observe(element,{childList:true,characterData:true,subtree:true});
    sync();
  }

  function watchImages(host, selector) {
    if (!host) return;
    let image, source, stop, abort;
    function sync(){
      const next = host.querySelector(selector);
      const key = next?.getAttribute('src');
      if(image===next && source===key) return;
      abort?.abort();
      stop?.();
      image=next;
      source=key;
      if(!image || !key || image.complete || !image.parentElement)return;
      abort = new AbortController();
      stop=show(image.parentElement,{inside:true,message:'照片載入中…',signal:abort.signal});
      image.addEventListener('load',stop,{once:true,signal:abort.signal});
      image.addEventListener('error',stop,{once:true,signal:abort.signal});
    }
    new MutationObserver(sync).observe(host,{childList:true,attributes:true,subtree:true,attributeFilter:['src','hidden']});
    sync();
  }

  function initialize(){
    document.querySelectorAll('.cafe-loader-cast[data-cast-root]').forEach(populate);
    watchText(['homeShiftList'],/^正在讀取本次出勤名單/);
    watchText(['siteMenuGrid'],/^正在讀取今晚菜單/);
    watchText(['guestbookPublicList'],/^正在讀取曇時珍藏的來信/);
    watchText(['menuSyncStatus'],/^(女僕)?正在(?:整理最新菜單|更新菜單|讀取菜單)/, '.menu-sync-row');
    watchText(['visitTotalDetails','visitTotalStatus'],/^正在(?:讀取|更新)本桌消費…$/);
    watchText(['np-receiptSummary'],/^正在(?:讀取|更新)本桌消費…$/);
    watchImages(document.getElementById('portraitOpen'),'#portrait');
    watchImages(document.getElementById('imageDialog'),'#largeImage');
    watchImages(document.getElementById('studioProfile'),'.studio-profile-main img');
    watchImages(document.getElementById('np-exampleOverlay'),'#np-exampleMainImage');
  }
  window.CafeLoading = {
    populate,
    begin(id,message) {
      const target=document.getElementById(id);
      panels.get(id)?.();
      const stop=show(target,{message});
      panels.set(id,stop);
      return ()=>{
        stop();
        if(panels.get(id)===stop)panels.delete(id);
      };
    }
  };
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',initialize,{once:true});
  else initialize();
})();
