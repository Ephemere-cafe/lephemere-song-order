const mast=document.querySelector('header .shell strong');mast.innerHTML='<img src="site-assets/logo.webp" alt="">曇時 <small>Cafe l’Éphémère</small>';
document.querySelector('.type-main').insertAdjacentHTML('beforeend','<p class="cover-message">今夜的相遇，<br>由你寫下序章。</p>');
document.querySelector('.type-overline').textContent='曇時・本月主題日';
document.querySelector('.festival-aside .aside-block:not([hidden]) h2').textContent='學園祭邀請函';
document.querySelector('.festival-aside ol').insertAdjacentHTML('afterend','<p class="invitation-rule">每人一次應援<br>餐飲累積，增加抽獎機會。</p>');
document.querySelectorAll('.member .initial').forEach(el=>el.insertAdjacentHTML('afterend','<small class="photo-pending">照片待補</small>'));
document.querySelector('.selected-member').insertAdjacentHTML('beforeend','<p class="aside-note">選一所學院，<br>留下今晚的應援。</p>');
document.body.insertAdjacentHTML('beforeend','<div class="preview-label">現有頁面改版預覽・不寫入正式資料</div>');

// The supplied originals stay intact; framing is CSS only.
const cover=document.querySelector('.type-cover');
cover.querySelector('.cover-message').textContent='曇華女子學院 × 曇光女子學院';
cover.insertAdjacentHTML('beforeend','<figure class="campus-group"><img src="school-photos/group.png" alt="曇華女子學院五人合照"><figcaption>曇華女子學院・全員集合</figcaption></figure>');
document.querySelector('.selected-member').insertAdjacentHTML('beforeend','<button type="button" class="featured-student"><img src="school-photos/miarica.png" alt="彌亞璃卡"><span>彌亞璃卡<small>曇華女子學院</small></span></button>');
document.querySelector('.featured-student').onclick=()=>document.querySelector('#school-a .member').click();
document.querySelector('.aside-note').remove();
