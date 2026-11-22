(()=>{
 const aside=document.querySelector('.festival-aside');
 aside.setAttribute('aria-label','執行委員長邀請與活動資訊');
 const invitation=aside.querySelector('.aside-block:not([hidden])');
 invitation.classList.add('chairman-invitation');
 invitation.querySelector('h2').textContent='學姊的邀請函';
 invitation.querySelector('ol').insertAdjacentHTML('beforebegin','<blockquote>「哎呀～兩邊都這麼努力，<br>看來我準備的獎勵還不夠呢？」</blockquote>');
 invitation.querySelector('.invitation-rule').remove();
 aside.querySelector('.selected-member').hidden=true;
 const card=document.createElement('section');card.className='chairman-card';card.setAttribute('aria-label','中立方執行委員長');
 card.innerHTML='<div class="chairman-label"><span>兩校聯合執行委員會</span><b>中立方</b></div><button class="chairman-photo" type="button" data-open-chairman aria-label="查看夏目美雪的完整人設"><span class="photo-reserved">照片位置<small>待補學姊的學園祭照片</small></span><span class="chairman-number" aria-hidden="true">00</span></button><div class="chairman-name"><h2>夏目 美雪</h2><small>Natsume Miyuki</small></div><p class="chairman-title">超高校級的學姊</p><p class="chairman-role">總執行委員長／特別贊助人</p><blockquote>「呵呵～我的才能？<br>這個嘛……就當作是秘密吧♡」</blockquote><button class="chairman-more" type="button" data-open-chairman>認識這位學姊 <span aria-hidden="true">↗</span></button>';
 aside.append(card);
 const dialog=document.createElement('dialog');dialog.id='chairman-profile';dialog.setAttribute('aria-labelledby','chairman-profile-name');
 dialog.innerHTML='<div class="chairman-dialog-top"><span>兩校聯合學園祭・人物檔案</span><button type="button" data-close-chairman aria-label="關閉執行委員長介紹">關閉 ×</button></div><div class="chairman-profile-layout"><aside class="chairman-profile-side"><div class="profile-photo-reserved"><span>學姊照片待補</span><b aria-hidden="true">00</b></div><span class="neutral-badge">中立方・兩校聯合學園祭</span><blockquote>「呵呵～我的才能？<br>這個嘛……<br>就當作是秘密吧♡」</blockquote></aside><section class="chairman-profile-copy"><div class="profile-role">學園祭總執行委員長／特別贊助人</div><h2 id="chairman-profile-name">夏目 美雪<small>Natsume Miyuki</small></h2><p class="profile-talent">超高校級的學姊 <span>真正的才能不明</span></p><dl><dt>所屬</dt><dd>兩校聯合學園祭（中立方）</dd><dt>個性</dt><dd>溫柔優雅、成熟可靠、略帶腹黑，喜歡捉弄有趣的學妹，但意外地不擅長應付別人的稱讚。</dd></dl><h3>關於這位學姊</h3><p>曾在學生時代被冠上「超高校級」稱號的傳奇學姊。即使畢業多年，兩校依然流傳著關於她的各種傳聞，卻沒人知道她真正的才能，甚至連她畢業於哪所學校都眾說紛紜。</p><p>這次以特別贊助人的身分回到校園，擔任聯合學園祭的總執行委員長。</p><p>平時總是笑咪咪地照顧學妹們，偶爾卻會故意煽風點火，欣賞兩校互相較勁的模樣。不過真遇到麻煩時，她又會認真替大家收拾善後。</p><p>看似什麼都能從容應對，實際上只要被認真稱讚，就會露出不知所措的一面。</p><blockquote class="profile-ending">「哎呀～兩邊都這麼努力，看來我準備的獎勵還不夠呢？」</blockquote></section></div>';
 document.body.append(dialog);
 document.querySelectorAll('[data-open-chairman]').forEach(button=>button.addEventListener('click',()=>dialog.showModal()));
 dialog.querySelector('[data-close-chairman]').onclick=()=>dialog.close();
 dialog.addEventListener('click',event=>{if(event.target===dialog)dialog.close();});
 // Only a local screenshot convenience; it does not affect production data.
 if(new URLSearchParams(location.search).get('profile')==='miyuki')dialog.showModal();
})();
