(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory();else root.FestivalPageSchema=factory();})(typeof globalThis!=='undefined'?globalThis:this,function(){
 'use strict';
 const defaults={
  _revision:0,font:'sans',introEnabled:true,showChairman:true,
  groupPhoto:'school-photos/group.png',groupCaption:'曇華女子學院・學園祭紀念合照',
  invitationTitle:'學姊的邀請函',invitationQuote:'「哎呀～兩邊都這麼努力，看來我準備的獎勵還不夠呢？」',
  invitationSteps:'領取號碼牌，或加入同行者的桌位\n選擇支持的學院，享用該校活動餐點\n結帳後領取應援票與抽獎券',
  orderButton:'前往學園祭點餐',rulesButton:'查看完整活動規則',
  introTitle:'歡迎來到曇時學園祭',introText:'曇華女子學院 × 曇光女子學院\n選一所想支持的學院，和我們一起留下今晚的回憶。',
  introRules:'領取號碼牌或加入共桌後，每位來賓皆可選擇一所支持的學院。\n支持學院的活動餐飲結帳滿 30,000 Gil，即可獲得 1 票應援與 1 張基本抽獎券。\n餐飲消費每累計滿 200,000 Gil，可再獲得 1 張抽獎券。\n首次結帳後，支持的學院即確定，無法再更換。應援投票與抽獎券發放結束後，仍歡迎繼續點餐。',
  introButton:'我了解了',introFootnote:'準備好就按「我了解了」。活動期間，隨時可從上方「活動規則」再次查看。',
  chairmanLabel:'兩校聯合執行委員會',chairmanBadge:'中立方',chairmanPhoto:'school-photos/natsume-miyuki.png',
  chairmanName:'夏目 美雪',chairmanRomanized:'Natsume Miyuki',chairmanTalent:'超高校級的學姊',chairmanSecret:'真正的才能不明',
  chairmanRole:'學園祭總執行委員長／特別贊助人',chairmanAffiliation:'兩校聯合學園祭（中立方）',
  chairmanQuote:'「呵呵～我的才能？這個嘛……就當作是秘密吧♡」',
  chairmanPersonality:'溫柔優雅、成熟可靠、略帶腹黑，喜歡捉弄有趣的學妹，但意外地不擅長應付別人的稱讚。',
  chairmanBiography:'曾在學生時代被冠上「超高校級」稱號的傳奇學姊。即使畢業多年，兩校依然流傳著關於她的各種傳聞，卻沒人知道她真正的才能，甚至連她畢業於哪所學校都眾說紛紜。\n\n這次以特別贊助人的身分回到校園，擔任聯合學園祭的總執行委員長。\n\n平時總是笑咪咪地照顧學妹們，偶爾卻會故意煽風點火，欣賞兩校互相較勁的模樣。不過真遇到麻煩時，她又會認真替大家收拾善後。\n\n看似什麼都能從容應對，實際上只要被認真稱讚，就會露出不知所措的一面。',
  chairmanClosingQuote:'「哎呀～兩邊都這麼努力，看來我準備的獎勵還不夠呢？」',chairmanMore:'認識這位學姊'
 };
 const groups=[
  {title:'主視覺與邀請函',fields:[['font','字體','font'],['groupPhoto','主視覺合照','photo'],['groupCaption','合照標題'],['invitationTitle','邀請函標題'],['invitationQuote','邀請函引言','area'],['invitationSteps','來店步驟（每行一項）','area'],['orderButton','點餐按鈕文字'],['rulesButton','規則按鈕文字']]},
  {title:'入口活動介紹／規則彈窗',fields:[['introEnabled','進入主題頁時顯示彈窗','boolean'],['introTitle','彈窗標題'],['introText','開場介紹','area'],['introRules','活動規則（每行一項）','area'],['introButton','確認按鈕文字'],['introFootnote','關閉方式提示']]},
  {title:'中立方／執行委員長',fields:[['showChairman','顯示獨立介紹區','boolean'],['chairmanPhoto','角色照片','photo'],['chairmanLabel','組織名稱'],['chairmanBadge','身分標籤'],['chairmanName','角色姓名'],['chairmanRomanized','外文姓名'],['chairmanTalent','稱號'],['chairmanSecret','稱號補充'],['chairmanRole','職稱'],['chairmanAffiliation','所屬'],['chairmanQuote','代表台詞','area'],['chairmanPersonality','個性','area'],['chairmanBiography','完整人設／背景','area'],['chairmanClosingQuote','結尾台詞','area'],['chairmanMore','介紹按鈕文字']]}
 ];
 const extras=typeof module==='object'&&module.exports?require('./public-copy-fields-v132.js'):globalThis.FestivalCopyFields;Object.assign(defaults,extras.defaults);groups.push(...extras.groups);
 const copyMigration={"orderButton":{"from":["前往學園祭點餐","前往學園祭點餐"],"to":"前往學園祭點餐"},"invitationTitle":{"from":["學姊的邀請函","學姊的邀請函"],"to":"來自學姊的邀請函"},"invitationQuote":{"from":["「哎呀～兩邊都這麼努力，看來我準備的獎勵還不夠呢？」","「哎呀～兩邊都這麼努力，看來我準備的獎勵還不夠呢？」"],"to":"「哎呀～兩邊都這麼有自信，看來今年的學園祭會很有趣呢♡」"},"chairmanQuote":{"from":["「呵呵～我的才能？這個嘛……就當作是秘密吧♡」","「呵呵～我的才能？這個嘛……就當作是秘密吧♡」"],"to":"「我的才能？這個嘛……就當作是秘密吧♡」"},"chairmanMore":{"from":["認識這位學姊","認識這位學姊"],"to":"認識夏目學姊"},"introTitle":{"from":["歡迎來到曇時學園祭","歡迎來到曇時學園祭"],"to":"把你的一票，送給喜歡的學院"},"introText":{"from":["曇華女子學院 × 曇光女子學院\n選一所想支持的學院，和我們一起留下今晚的回憶。","曇華女子學院 × 曇光女子學院\n選一所想支持的學院，和我們一起留下今晚的回憶。"],"to":"今晚，你會支持哪一所學院呢？\n\n先認識學生們、看看獎項，再決定也不遲～！"},"introRules":{"from":["領取號碼牌或加入共桌後，每位來賓皆可選擇一所支持的學院。\n支持學院的活動餐飲結帳滿 30,000 Gil，即可獲得 1 票應援與 1 張基本抽獎券。\n餐飲消費每累計滿 200,000 Gil，可再獲得 1 張抽獎券。\n首次結帳後，支持的學院即確定，無法再更換。應援投票與抽獎券發放結束後，仍歡迎繼續點餐。","領號或加入共桌後，每位客人可選擇一所學院。\n該校活動餐飲結清滿 30,000 Gil，取得 1 票應援與 1 張基本抽獎券。\n餐飲每累計滿 200,000 Gil，再多 1 張抽獎券。\n首次結清後鎖定學院。停止投票與發券後，仍可照常點餐。"],"to":"領取號碼牌或加入同行桌位後，每位主人都可以選擇一所支持的學院。\n符合資格的餐飲消費累計滿 30,000 Gil，並完成結帳後，即可為所選學院投下 1 票，同時取得 1 張基本抽獎券。\n餐飲消費每累計滿 200,000 Gil，可以再獲得 1 張抽獎券。\n每位主人只有 1 票應援票，追加消費不會增加學院票數。\n首次結帳後，支持的學院就會確定，無法再次更換。\n應援與抽獎券發放截止後，仍然可以正常點餐，但不會再增加本次票數或抽獎券。"},"introButton":{"from":["我了解了","我了解了"],"to":"我了解了，前往點餐"}};const hiddenCopyKeys=new Set(["copy01_5","copy02_0","copy02_1","copy02_4","copy02_5","copy06_0","copy06_1","copy06_5","copy06_3"]);for(const [key,change]of Object.entries(copyMigration))defaults[key]=change.to;for(const group of groups)group.fields=group.fields.filter(([key])=>!hiddenCopyKeys.has(key));
 function safePhoto(raw){if(typeof raw!=='string')return '';const value=raw.trim().slice(0,700);if(/^(school-festival-assets|school-photos)\/[\w.-]+\.(png|jpe?g|webp|avif)$/i.test(value))return value;try{const url=new URL(value);if(url.protocol==='https:'&&!url.username&&!url.password)return url.href;}catch{}return '';}
 function normalizeChairmanComposition(raw){
  if(!raw||typeof raw!=='object'||Array.isArray(raw))return null;
  const number=(key,min,max,fallback)=>{
   const value=raw[key];
   return typeof value==='number'&&Number.isFinite(value)?Math.min(max,Math.max(min,value)):fallback;
  };
  return {fit:raw.fit==='contain'?'contain':'cover',x:number('x',0,100,50),y:number('y',0,100,29),zoom:number('zoom',1,2.5,1),rotate:number('rotate',-30,30,0),...(raw.compositionVersion===2?{compositionVersion:2}:{})};
 }

 function normalize(raw){const input=raw&&typeof raw==='object'?{...raw}:{};for(const [key,change]of Object.entries(copyMigration))if(input[key]===undefined||change.from.includes(input[key]))input[key]=change.to;const out={...defaults};for(const [key,value]of Object.entries(defaults)){if(key==='_revision')continue;if(typeof value==='boolean')out[key]=typeof input[key]==='boolean'?input[key]:value;else if(key==='font')out[key]=input[key]==='system'?'system':'sans';else if(key.endsWith('Photo'))out[key]=input[key]===undefined?value:safePhoto(input[key]);else if(typeof input[key]==='string')out[key]=input[key].trim().slice(0,key==='chairmanBiography'?5000:key==='introRules'?3000:1000);}
  if(!out.chairmanPhoto)out.chairmanPhoto=defaults.chairmanPhoto;
  out.chairmanComposition=normalizeChairmanComposition(input.chairmanComposition);
  out._revision=Number.isSafeInteger(input._revision)&&input._revision>=0?input._revision:0;
  for(const key of ['introTitle','introButton','orderButton','chairmanName'])if(!out[key])out[key]=defaults[key];
  return out;
 }
 return {defaults,groups,normalize,safePhoto,normalizeChairmanComposition};
});
