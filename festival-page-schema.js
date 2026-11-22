(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory();else root.FestivalPageSchema=factory();})(typeof globalThis!=='undefined'?globalThis:this,function(){
 'use strict';
 const defaults={
  _revision:0,font:'sans',introEnabled:true,showChairman:true,
  groupPhoto:'school-photos/group.png',groupCaption:'曇華女子學院・全員集合',
  invitationTitle:'學姊的邀請函',invitationQuote:'「哎呀～兩邊都這麼努力，看來我準備的獎勵還不夠呢？」',
  invitationSteps:'領號或加入共桌\n選校並點該校餐點\n結清後取得應援票與抽獎券',
  orderButton:'前往學園祭點餐',rulesButton:'查看完整活動規則',
  introTitle:'歡迎來到曇時學園祭',introText:'曇華女子學院 × 曇光女子學院\n選一所想支持的學院，和我們一起留下今晚的回憶。',
  introRules:'領號或加入共桌後，每位客人可選擇一所學院。\n該校活動餐飲結清滿 30,000 Gil，取得 1 票應援與 1 張基本抽獎券。\n餐飲每累計滿 200,000 Gil，再多 1 張抽獎券。\n首次結清後鎖定學院。停止投票與發券後，仍可照常點餐。',
  introButton:'我了解了',introFootnote:'點任意位置即可關閉，隨時可從上方「活動規則」再次查看。',
  chairmanLabel:'兩校聯合執行委員會',chairmanBadge:'中立方',chairmanPhoto:'',
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
 function safePhoto(raw){if(typeof raw!=='string')return '';const value=raw.trim().slice(0,700);if(/^(school-festival-assets|school-photos)\/[\w.-]+\.(png|jpe?g|webp|avif)$/i.test(value))return value;try{const url=new URL(value);if(url.protocol==='https:'&&!url.username&&!url.password)return url.href;}catch{}return '';}
 function normalize(raw){const input=raw&&typeof raw==='object'?raw:{};const out={...defaults};for(const [key,value]of Object.entries(defaults)){if(key==='_revision')continue;if(typeof value==='boolean')out[key]=typeof input[key]==='boolean'?input[key]:value;else if(key==='font')out[key]=input[key]==='system'?'system':'sans';else if(key.endsWith('Photo'))out[key]=input[key]===undefined?value:safePhoto(input[key]);else if(typeof input[key]==='string')out[key]=input[key].trim().slice(0,key==='chairmanBiography'?5000:key==='introRules'?3000:1000);}
  out._revision=Number.isSafeInteger(input._revision)&&input._revision>=0?input._revision:0;
  for(const key of ['introTitle','introButton','orderButton','chairmanName'])if(!out[key])out[key]=defaults[key];
  return out;
 }
 return {defaults,groups,normalize,safePhoto};
});
