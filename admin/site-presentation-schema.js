'use strict';
(() => {
  const field=(key,label,selector,value,type='text',max=160)=>({key,label,selector,default:value,type,max});
  const groups=[
    {key:'home',label:'首頁與關於曇時',route:'#home',fields:[
      field('title','首頁店名','.d-heading h1','曇時'),field('subtitle','首頁外文店名','.d-heading>p','Cafe l’Éphémère'),
      field('intro','首頁介紹','.d-heading>span','時光如曇花般轉瞬即逝。\n在這段短暫的停留裡，願我們為你多留一點溫度。','textarea',1200),
      field('closingTitle','首頁下方標題','.home-bottom h2','留一點時間，給今晚。'),field('closingCopy','首頁下方說明','.home-bottom p','餐點、拍攝與紀念服務，都在這裡。','textarea',800),
      field('aboutTitle','關於曇時標題','.official-about h2','短暫，所以用心款待。'),
      field('aboutLead','關於曇時第一段','.official-about>div:last-child p:nth-child(1)','因為想在短暫的相遇裡多留一點溫度，我們聚在了這裡。','textarea',1500),
      field('aboutBody','關於曇時第二段','.official-about>div:last-child p:nth-child(2)','「曇時」的想法就是這樣誕生的——與其說是開一間店，不如說是想找個地方，讓大家可以聚在一起，喝杯茶、聊聊天，享受這種只屬於當下的悠閒時光。','textarea',3000),
      field('aboutEnd','關於曇時結語','.official-about>div:last-child p:nth-child(3)','短暫相遇，也值得被好好記住。')
    ]},
    {key:'event',label:'首頁活動入口',route:'#home',fields:[
      field('enabled','顯示活動入口','',true,'checkbox'),field('kicker','活動小標','.g-event .activity-kicker','本月主題日'),
      field('title','活動名稱','.g-event .activity-title','曇時\n學園祭','textarea',160),field('schoolA','第一所學院名稱','','曇華女子學院'),field('schoolB','第二所學院名稱','','曇光女子學院'),
      field('coverUrl','活動封面圖片網址（留白使用預設圖）','.g-event .activity-photo','','image',2000),
      field('entryLabel','活動按鈕文字','.g-event .photo-entry','查看活動'),field('link','活動頁面網址','','https://ephemere-order.pages.dev/school-festival-roster-arena-preview.html','url',2000),
      field('description','活動彈窗說明','#eventDialog>p:not(.event-schools):last-of-type','點入活動頁，查看雙校陣容與活動規則。','textarea',1500)
    ]},
    {key:'menu',label:'菜單封面與說明',route:'#menu',fields:[
      field('coverName','封面外文店名','.menu-cafe-name','Cafe l’Éphémère'),field('coverTitle','封面標題','.menu-book-cover h2','MENU'),
      field('signatureUrl','簽名圖片網址（留白使用原簽名）','.menu-signature','','image',2000),field('coverCopy','封面文案','.menu-book-cover>p','時光如曇花般轉瞬即逝。\n在這段短暫的停留裡，\n願我們為你多留一點溫度。','textarea',1200),
      field('coverFooter','封面頁尾','.menu-cover-footer','曇時・今晚菜單'),field('heading','右頁標題','.menu-book-sheet header h2','今晚菜單'),
      field('pageTitle','菜單與服務頁標題','#page-menu .experience-heading h1','菜單 與服務'),field('pageIntro','菜單與服務頁介紹','#page-menu .experience-heading>div>p','餐點、拍攝與紀念服務，都在這裡。','textarea',1000),
      field('notice','供應說明','.menu-supply-note','以下為曇時常設菜單，當日供應品項與最終價格請以線上點餐頁面為準。','textarea',1000),
      field('orderLabel','完整菜單按鈕','.menu-book-bottom>a','開啟完整菜單')
    ]},
    {key:'service',label:'服務介紹',route:'#menu-photo',fields:[
      field('title','拍攝服務主標題','.memory-copy h2','拍攝與\n紀念服務','textarea',160),field('types','服務副標題','.memory-types','拍立得 ／ 個人攝影'),
      field('intro','服務介紹','.memory-copy>p:not(.memory-types):not(.muted)','領號並送出餐點後，可在點餐頁面的「拍攝／紀念服務」選擇自己的角色與服務。','textarea',1500),
      field('note','消費說明','.memory-copy>p.muted','相關消費獨立計算，不列入餐點低消。','textarea',1000),
      field('buttonLabel','服務按鈕文字','.memory-copy>a.btn','查看拍攝與紀念服務'),field('sectionKicker','延伸服務小標','.service-notes-title>.editorial-eyebrow','今晚還可以體驗'),
      field('sectionTitle','延伸服務標題','.service-notes-title h2','把相遇\n留在今晚。','textarea',160),
      field('cards','延伸服務內容','#siteServiceCards',[
        {title:'餐桌隱藏魔法',body:'點選蛋包飯時可一併加購魔法服務，女僕將在桌邊與你一起完成專屬儀式。',label:'查看今晚菜單',url:'https://order.ephemereffxiv.com/',note:''},
        {title:'拍攝／紀念服務',body:'送出餐點後，可在點餐頁選購拍立得、純拍、繪圖與簽繪服務。',label:'',url:'',note:'實際開放項目與安排，以當日點餐頁面及接待說明為準。'}
      ],'cards')
    ]},
    {key:'rules',label:'店內規則',route:'#rules',fields:[
      field('coverTitle','規則封面標題','.rules-cover h1','在曇時，\n好好相遇。','textarea',160),field('intro','入店說明','.rules-cover>p','為了維持舒適的用餐與 RP 空間，入店前請主人閱讀以下事項。','textarea',1500),
      field('heading','規則標題','.rules-heading h2','店內規則'),field('subtitle','規則副標題','.rules-heading>span','願每一段相遇，都被好好對待。'),field('thanks','頁尾文案','.rules-thanks','曇時 Cafe 感謝主人的光臨。'),
      field('items','規則內容','.rules-columns',[
        {title:'氛圍與界線',body:'本店僅提供餐點與合照，嚴禁任何違規、色情或令人不適的言行。'},
        {title:'空間與動線',body:'入店後請協助收起武器，並安置您的隨行小寵物。'},
        {title:'入店模式',body:'請切換「走路模式」，並關閉情感動作的聊天欄文字。'},
        {title:'服裝規範',body:'請避免強烈發光、內衣或搞怪等不符合店內氛圍的服飾。'},
        {title:'RP 與隱私',body:'女僕均以 RP 身份服務，請勿打探現實生活等個人隱私。'},
        {title:'互相尊重',body:'請保持社交禮儀；女僕有權拒絕任何令人不適的請求。'},
        {title:'拍攝規範',body:'嚴禁錄影、Mod 改圖及 R18+ 拍攝；若畫面包含其他主人，請先取得對方同意。'},
        {title:'線下邊界',body:'非營業時間嚴禁任何形式的跟蹤女僕或騷擾行為。'}
      ],'rules')
    ]},
    {key:'visit',label:'來店資訊',route:'#visit',fields:[
      field('intro','來店資訊小標','.visit-heading>p','在這裡找到我們。'),field('server','伺服器','.visit-letter>p','巴哈姆特'),
      field('address','店址','.visit-letter h2','薰衣草苗圃\n第 1 區 6 號','textarea',240),field('operation','營業公告說明','.visit-operation>p','不定期營業，請查看當次公告。','textarea',1000),
      field('threadsUrl','官方 Threads 網址','.visit-operation a','https://www.threads.com/@lephemere.ff14','url',2000),
      field('arrivalHeading','接待流程標題','.arrival-heading h2','第一次來曇時'),field('arrivalIntro','接待流程說明','.arrival-heading>p','從領號到入座，\n一步一步認識接待流程。','textarea',1000),
      field('step0Title','領號步驟標題','','領取號碼牌'),field('step0Body','領號步驟說明','','進入點餐頁面，依指示領取號碼牌。同行客人可以依原本共桌流程加入。','textarea',1000),
      field('step1Title','點餐步驟標題','','點餐與等候'),field('step1Body','點餐步驟說明','','領號後可依點餐頁面的指示送出餐點，並等候現場接待。','textarea',1000),
      field('step2Title','接待步驟標題','','接待與帶位'),field('step2Body','接待步驟說明','','與接待女僕會合後，依原本的接待與帶位流程入座。','textarea',1000),
      field('step3Title','追加步驟標題','','追加與服務'),field('step3Body','追加步驟說明','','入座後可使用原本的點餐頁面追加餐點；拍攝與紀念服務也在該頁選擇。','textarea',1000),
      field('faqTitle','常見問題標題','.faq>div:first-child h2','常見問題'),field('faqs','常見問題','.faq>div:last-child',[
        {title:'如何領取號碼牌？',body:'進入線上點餐頁面，依頁面指示領取號碼牌；同行客人可依原有共桌流程加入。'},
        {title:'拍攝服務包含在餐點低消裡嗎？',body:'拍攝與紀念服務消費獨立計算，不列入餐點低消。'}
      ],'faqs')
    ]},
    {key:'guestbook',label:'留言頁文案',route:'#guestbook',fields:[
      field('title','留言頁標題','.guestbook-heading h1','把今晚，\n好好收起來。','textarea',160),field('intro','留言頁介紹','.guestbook-heading>p','在離席以前，把今晚未說完的心情留在這裡。\n寫給曇時，也寫給今晚陪伴你的那一位。','textarea',1500),
      field('publicTitle','公開留言標題','#publicLettersTitle','曇時珍藏的來信'),field('publicIntro','公開留言說明','.public-letters-heading>p','經主人同意後，收進這裡的片刻。','textarea',800),
      field('formTitle','寫信表單標題','#guestbookFormTitle','寫下今晚的話'),field('formIntro','寫信表單說明','.letter-preview-note','若想把話送給某位成員，也可以悄悄指定她的名字。','textarea',1000)
    ]}
  ];
  function url(value){try{const u=new URL(String(value));return u.protocol==='https:'&&!u.username&&!u.password?u.href:'';}catch{return '';}}
  function clean(field,value){
    if(field.type==='checkbox')return typeof value==='boolean'?value:field.default;
    if(['cards','rules','faqs'].includes(field.type)){
      if(!Array.isArray(value))return structuredClone(field.default);
      return value.slice(0,field.type==='cards'?12:30).filter(r=>r&&typeof r==='object').map(r=>{
        const row={title:String(r.title||'').slice(0,80),body:String(r.body||'').slice(0,1500)};
        if(field.type==='cards'){row.note=String(r.note||'').slice(0,1000);row.label=String(r.label||'').slice(0,80);row.url=url(r.url);}
        return row;
      });
    }
    const s=typeof value==='string'?value.slice(0,field.max):field.default;
    return field.type==='url'||field.type==='image'?(s?url(s):''):s;
  }
  function values(group,record){const raw=record?.values||{};return Object.fromEntries(group.fields.map(f=>[f.key,clean(f,raw[f.key]===undefined?f.default:raw[f.key])]));}
  window.EphemereSitePresentation=Object.freeze({groups,url,clean,values,path:'lephemere/siteContent/presentation'});
})();
