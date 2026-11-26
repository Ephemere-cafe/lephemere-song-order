(() => {
  'use strict';
  const root = document.documentElement;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const byId = id => document.getElementById(id);
  const active = new WeakMap();
  const fade = [{opacity:.35}, {opacity:1}];
  const lift = [{opacity:.35, transform:'translateY(7px)'}, {opacity:1, transform:'translateY(0)'}];
  const highlight = [
    {boxShadow:'0 0 0 3px var(--fp-a, var(--rose, #87596a))'},
    {boxShadow:'0 0 0 0 transparent'}
  ];
  const disappear = [{opacity:1}, {opacity:0}];
  const noMotion = () => reduced.matches || typeof Element.prototype.animate !== 'function';

  function play(element, frames, duration=170, delay=0) {
    if (!element || noMotion() || !element.getClientRects().length) return;
    active.get(element)?.cancel();
    const motion = element.animate(frames, {duration, delay, fill:'backwards', easing:'cubic-bezier(.2,.65,.3,1)'});
    active.set(element,motion);
    const cleanup = () => {
      if (active.get(element) === motion) active.delete(element);
    };
    motion.onfinish = cleanup;
    motion.oncancel = cleanup;
    return motion;
  }

  function whenChanged(element, attributes, read, change) {
    if (!element) return;
    let previous = read(element);
    new MutationObserver(() => {
      const next = read(element);
      if (next === previous) return;
      const old = previous;
      previous = next;
      change(next,old);
    }).observe(element,{attributes:true,attributeFilter:attributes});
  }

  const showDialog = (id, action) => {
    const dialog = byId(id);
    whenChanged(dialog,['open'],node=>node.open,open=>{ if (open) action(dialog); });
  };

  function homeEffects() {
    const hero = document.querySelector('.collage-copy');
    const reveal = () => play(document.querySelector('.collage-copy'),lift,250);
    if (root.hasAttribute('data-festival-loading')) {
      whenChanged(root,['data-festival-loading'],node=>node.hasAttribute('data-festival-loading'),loading=>{ if (!loading) reveal(); });
    } else if (hero) reveal();

    const prizes = byId('prizes');
    function watchPrizes(section) {
      if (typeof IntersectionObserver !== 'function' || !section) return;
      const watcher = new IntersectionObserver(entries => {
        if (!entries.some(entry=>entry.isIntersecting)) return;
        watcher.disconnect();
        play(section.querySelector('.prize-shared-v173'),lift,180);
        play(section.querySelector('.prize-school-grid'),fade,180,70);
      },{threshold:.12});
      watcher.observe(section);
    }
    if (prizes) watchPrizes(prizes);
    else {
      const main = document.querySelector('.festival-layout');
      if (main) {
        const watcher = new MutationObserver(() => {
          const section = byId('prizes');
          if (section) { watcher.disconnect(); watchPrizes(section); }
        });
        watcher.observe(main,{childList:true});
      }
    }
    showDialog('member-profile',dialog=>{
      play(dialog.querySelector('#profile-photo'),fade,185);
      play(dialog.querySelector('.profile-copy-v143, #profile-name'),lift,190,25);
    });
    whenChanged(root,['data-festival-theme'],node=>node.dataset.festivalTheme,()=>play(document.querySelector('[data-festival-theme-toggle]'),highlight,150));
  }

  let ticketVisit = '';
  let knownTickets = new Set();
  let pendingTickets = new Set();
  function showNewTickets() {
    const panel = byId('festival-consumption-tickets');
    if (!panel?.getClientRects().length || !pendingTickets.size) return;
    let delay = 0;
    for (const ticket of panel.querySelectorAll('span')) {
      if (!pendingTickets.delete(ticket.textContent)) continue;
      play(ticket,lift,165,delay);
      delay = Math.min(delay+35,105);
    }
  }
  function tickets(visit) {
    if (ticketVisit !== visit) {
      knownTickets = new Set();
      pendingTickets = new Set();
      ticketVisit = visit;
    }
    const current = new Set([...byId('festival-consumption-tickets').querySelectorAll('span')].map(node=>node.textContent));
    for (const number of pendingTickets) if (!current.has(number)) pendingTickets.delete(number);
    for (const number of current) if (!knownTickets.has(number)) pendingTickets.add(number);
    knownTickets = current;
    showNewTickets();
  }
  let lastVisit = '';
  let lastStatus = '';
  let pendingReception = false;
  function showReception() {
    const badge = byId('visitStatusBadge');
    if (!pendingReception || !badge?.getClientRects().length) return;
    pendingReception = false;
    play(badge,highlight,190);
  }
  function reception(visit,status) {
    if (visit!==lastVisit) pendingReception=false;
    else if (lastStatus==='waiting' && ['assigned','serving'].includes(status)) pendingReception=true;
    if (!['assigned','serving'].includes(status)) pendingReception=false;
    lastVisit = visit;
    lastStatus = status;
    showReception();
  }

  function orderEffects() {
    whenChanged(byId('queueSuccessOverlay'),['hidden'],node=>node.hidden,hidden=>{
      if (!hidden) play(document.querySelector('.queue-success-ticket'),lift,180);
    });
    const receipt = byId('visitTotalPanel');
    whenChanged(receipt,['hidden','style'],node=>Boolean(node.getClientRects().length),visible=>{ if (visible) showNewTickets(); });
    whenChanged(byId('visitStatusPanel'),['hidden','style'],node=>Boolean(node.getClientRects().length),visible=>{ if (visible) showReception(); });
    showDialog('festival-order-confirm',dialog=>play(dialog,lift,170));
    showDialog('festival-order-sent',dialog=>play(dialog.querySelector('.cafe-motion-check'),[
      {opacity:.12,transform:'scale(.8)'}, {opacity:1,transform:'scale(1)'}
    ],165));
    const native = byId('photoNativeRoot');
    if (!native) return;
    native.addEventListener('click',event=>{
      const member = event.target.closest('#np-maidNav [data-maid]');
      if (member && !member.classList.contains('active')) requestAnimationFrame(()=>play(byId('np-productGrid'),fade,165));
      if (event.target.closest('[data-example-index]')) {
        requestAnimationFrame(()=>{
          const photo = byId('np-exampleMainImage');
          const source = photo?.src;
          if (source) readyImage(photo).then(ready=>{if(ready && photo.src===source)play(photo,fade,185);});
        });
      }
    },true);
  }

  function readyImage(image) {
    if (image.complete) return Promise.resolve(Boolean(image.naturalWidth));
    if (image.decode) return image.decode().then(()=>true,()=>false);
    return new Promise(resolve=>{
      image.addEventListener('load',()=>resolve(true),{once:true});
      image.addEventListener('error',()=>resolve(false),{once:true});
    });
  }

  let memberRequest = 0;
  let previousLayer;
  function switchMember(source, commit) {
    const request = ++memberRequest;
    if (previousLayer) { previousLayer.remove(); previousLayer=null; }
    const portrait = byId('portrait');
    portrait?.style.removeProperty('visibility');
    if (!source || noMotion() || !portrait?.getClientRects().length || portrait.src === new URL(source, document.baseURI).href) {
      commit();
      return;
    }
    const incoming = new Image();
    incoming.src = source;
    let timeout;
    Promise.race([
      readyImage(incoming),
      new Promise(resolve=>{timeout=setTimeout(()=>resolve(false),650);})
    ]).then(ready=>{
      clearTimeout(timeout);
      if(request!==memberRequest) return;
      const layer = ready && portrait.naturalWidth ? portrait.cloneNode(true) : null;
      if (layer) {
        layer.removeAttribute('id');
        layer.setAttribute('aria-hidden','true');
        layer.classList.add('cafe-portrait-previous');
        portrait.parentElement.append(layer);
        previousLayer=layer;
      }
      commit();
      if (layer) {
        const effect = play(layer,disappear,210);
        if (effect) effect.finished.then(()=>layer.remove(),()=>layer.remove());
        else layer.remove();
      } else if (!ready) {
        const expected = portrait.src;
        if (expected) {
          portrait.style.visibility='hidden';
          readyImage(portrait).then(()=>{
            if (request===memberRequest && portrait.src===expected) portrait.style.removeProperty('visibility');
          });
        }
      }
      play(byId('stageName'),fade,210);
      play(byId('portraitName'),fade,210);
    });
  }

  function officialEffects() {
    let sourceRect = null;
    byId('portraitOpen')?.addEventListener('click',()=>{
      sourceRect=byId('portrait')?.getBoundingClientRect();
    },true);
    showDialog('imageDialog',dialog=>{
      const from=sourceRect;
      sourceRect=null;
      const image=byId('largeImage');
      const source=image.src;
      if (!from || noMotion()) return;
      readyImage(image).then(ready=>{
        if(!ready || !dialog.open || image.src!==source)return;
        const to=image.getBoundingClientRect();
        if(!to.width || !to.height)return;
        const x=from.left+from.width/2-to.left-to.width/2;
        const y=from.top+from.height/2-to.top-to.height/2;
        const scale=Math.min(from.width/to.width,from.height/to.height,1);
        play(image,[{opacity:.72,transform:'translate('+x+'px,'+y+'px) scale('+scale+')'},
          {opacity:1,transform:'none'}],230);
      });
    });
    const steps=document.querySelector('.arrival-steps');
    if(steps) {
      let current=steps.querySelector('[aria-selected=true]');
      new MutationObserver(()=>{
        const selected=steps.querySelector('[aria-selected=true]');
        if(!selected || current===selected)return;
        current=selected;
        play(selected,highlight,150);
        play(byId('arrivalDescription'),lift,175);
      }).observe(steps,{subtree:true,attributes:true,attributeFilter:['aria-selected']});
    }
  }

  window.CafeMotion = {
    school: button=>{play(button,highlight,180);play(byId('festival-support-state'),fade,160);},
    cart: ()=>{for(const id of ['festival-total','festival-mobile-total'])play(byId(id),highlight,170);},
    companion: row=>{play(row,lift,180);play(byId('visitPartyCount'),fade,160);},
    reception, tickets, switchMember,
    addressCopied: ()=>{play(byId('copyAddress'),highlight,170);play(byId('toast'),fade,160);}
  };
  if (byId('festival-home-loading')) homeEffects();
  if (byId('siteLoader')) orderEffects();
  if (byId('page-members')) officialEffects();
})();
