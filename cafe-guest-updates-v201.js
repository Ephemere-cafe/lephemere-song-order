(() => {
  'use strict';
  const byId = id => document.getElementById(id);
  const reduce = matchMedia('(prefers-reduced-motion: reduce)');
  const running = new WeakMap();
  const fade = [{opacity:.35,transform:'translateY(5px)'},{opacity:1,transform:'none'}];
  function play(node, frames = fade, duration = 230, delay = 0) {
    if (!node?.getClientRects().length || reduce.matches || !node.animate) return;
    running.get(node)?.cancel();
    const animation = node.animate(frames,{duration,delay,easing:'cubic-bezier(.22,.65,.26,1)',fill:'backwards'});
    running.set(node,animation);
  }
  function marker(text, className, tag = 'span') {
    const node = document.createElement(tag);
    node.textContent = text;
    node.className = className;
    return node;
  }

  function official() {
    const home = byId('page-home'), roster = byId('homeShiftList');
    if (!home || !roster) return;
    const sign = marker('', 'cafe-business-sign');
    sign.setAttribute('role','status');
    sign.hidden = true;
    if (!home.querySelector('.home-concept')) home.prepend(sign);
    function mountSign() {
      const stage = home.querySelector('.home-concept');
      if (stage && sign.parentNode !== stage) stage.append(sign);
    }
    mountSign();
    new MutationObserver(mountSign).observe(home,{childList:true,subtree:true});
    let lastOpen;
    if (window.firebase?.apps?.length) {
      firebase.database().ref('lephemere/operationStatus').on('value',snap=>{
        const open = snap.val()?.isOpen;
        if (typeof open !== 'boolean') {
          lastOpen = undefined;
          sign.hidden = true;
          return;
        }
        if (open === lastOpen) return;
        const flip = lastOpen !== undefined;
        lastOpen = open;
        sign.textContent = open ? '營業中' : '今日已打烊';
        sign.classList.toggle('is-open',open);
        sign.hidden = false;
        if (flip) play(sign,[{transform:'perspective(420px) rotateX(-72deg)',opacity:.5},{transform:'none',opacity:1}],280);
      },()=>{ lastOpen = undefined; sign.hidden = true; });
    }
    let seenRoster = '';
    function revealRoster() {
      const people = [...roster.querySelectorAll('.home-shift-person')];
      const key = byId('homeShiftDate')?.textContent+'|'+people.map(person=>person.querySelector('strong')?.textContent).join('|');
      if (!people.length || key === seenRoster || !people[0].getClientRects().length) return;
      seenRoster = key;
      people.forEach((person,index)=>play(person.querySelector('.home-shift-avatar') || person,fade,180,Math.min(index,5)*40));
    }
    new MutationObserver(revealRoster).observe(roster,{childList:true});
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(entries=>{
        if (entries.some(entry=>entry.isIntersecting)) revealRoster();
      }).observe(roster);
    } else revealRoster();
  }

  const serviceState = new Map();
  function photoAvailability(visit, available, ids) {
    for (const id of ids) {
      const link = byId(id);
      if (!link) continue;
      const previous = serviceState.get(id);
      if (previous?.visit === visit && previous.available === available) continue;
      serviceState.set(id,{visit,available});
      if (!link.dataset.originalLabel) link.dataset.originalLabel = link.textContent;
      link.textContent = available ? '拍攝／紀念服務可預約' : link.dataset.originalLabel;
      link.classList.toggle('cafe-service-available',available);
      if (available && previous?.visit === visit && previous.available === false) {
        play(link,[{boxShadow:'0 0 0 3px #79aa95'},{boxShadow:'0 0 0 0 transparent'}],350);
      }
    }
  }

  const delivered = status => status === 'completed' || status === 'served' || status === 'delivered';
  function deliveryLine(order) {
    if (!['pending','preparing','accepted'].includes(order.status) && !delivered(order.status)) return '';
    const number = Number(order.orderNumber);
    const label = Number.isSafeInteger(number) && number > 0 ? '訂單 #'+number : '餐點訂單';
    const ready = delivered(order.status);
    return '<div class="cafe-delivery-line"><strong>'+label+'</strong><span class="cafe-delivery-status'+
      (ready ? ' is-delivered' : '')+'">'+(ready ? '✓ 已送達' : '準備中')+'</span></div>';
  }
  let deliveryVisit;
  let observedOrders = new Map();
  function deliveryMotion(visit, orders, details) {
    if (deliveryVisit !== visit) {
      deliveryVisit = visit;
      observedOrders.clear();
    }
    const labels = details.querySelectorAll('.cafe-delivery-status');
    let index = 0;
    const next = new Map();
    const updates = [];
    for (const order of orders) {
      if (!deliveryLine(order)) continue;
      const key = order.id || order.orderNumber;
      const ready = delivered(order.status);
      if (key && ready && observedOrders.get(key) === false) updates.push(labels[index]);
      if (key) next.set(key,ready);
      index++;
    }
    observedOrders = next;
    if (updates.length && details.getClientRects().length) {
      updates.forEach(label=>play(label));
      const notice = byId('cafe-receipt-announcement');
      if (notice) notice.textContent = updates.length === 1 ? '有一筆餐點已送達。' : updates.length+' 筆餐點已送達。';
    }
  }

  let lastEntries;
  function entriesClosed(key, closed, note) {
    if (!note) return;
    note.classList.toggle('cafe-entries-closed',closed);
    if (closed && (!lastEntries || lastEntries.key !== key || !lastEntries.closed)) play(note);
    lastEntries = {key,closed};
  }
  function prizeBookmarks(dialog, school, eligible) {
    for (const old of dialog.querySelectorAll('.cafe-prize-bookmark')) old.remove();
    if (!eligible || !['A','B'].includes(school)) return;
    const headings = [
      dialog.querySelector('.prize-shared-v173 h3'),
      dialog.querySelector('.prize-school-v173[data-pool="'+school+'"] h3')
    ];
    headings.forEach((heading,index)=>{
      if (!heading || (index===1 && !heading.parentElement.querySelector('li'))) return;
      const mark = marker('可抽','cafe-prize-bookmark');
      heading.append(mark);
      play(mark,[{opacity:0,transform:'translateX(-6px)'},{opacity:1,transform:'none'}],180,index*50);
    });
  }

  window.CafeGuestUpdates = {photoAvailability,deliveryLine,deliveryMotion,entriesClosed,prizeBookmarks,assignment:node=>play(node)};
  document.addEventListener('DOMContentLoaded',official,{once:true});
})();
