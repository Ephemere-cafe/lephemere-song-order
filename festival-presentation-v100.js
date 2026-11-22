(function(){
  const defaults={title:'曇時學園祭',welcome:'選一所想支持的學院，再挑選該學院的活動餐點。',teams:{A:{name:'曇華女子學院',color:'#385c72'},B:{name:'曇光女子學院',color:'#774958'}}};
  let pending;
  function load(){
    if(!pending) pending=fetch('https://asia-southeast1-lephemere-queue-c38d5.cloudfunctions.net/festivalPresentationV100',{
      method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({data:{includeMenu:Boolean(document.getElementById("festival-order"))}})
    }).then(response=>{
      if(!response.ok) throw new Error('無法載入活動外觀。');
      return response.json();
    }).then(body=>{const data=body.result||body.data||defaults;const pairs=[["曇華女子學院・全員集合","曇華女子學院・學園祭紀念合照"],["領號或加入共桌\n選校並點該校餐點\n結清後取得應援票與抽獎券","領取號碼牌，或加入同行者的桌位\n選擇支持的學院，享用該校活動餐點\n結帳後領取應援票與抽獎券"],["領號或加入共桌後，每位客人可選擇一所學院。","領取號碼牌或加入共桌後，每位來賓皆可選擇一所支持的學院。"],["該校活動餐飲結清滿 30,000 Gil，取得 1 票應援與 1 張基本抽獎券。","支持學院的活動餐飲結帳滿 30,000 Gil，即可獲得 1 票應援與 1 張基本抽獎券。"],["餐飲每累計滿 200,000 Gil，再多 1 張抽獎券。","餐飲消費每累計滿 200,000 Gil，可再獲得 1 張抽獎券。"],["首次結清後鎖定學院。停止投票與發券後，仍可照常點餐。","首次結帳後，支持的學院即確定，無法再更換。應援投票與抽獎券發放結束後，仍歡迎繼續點餐。"],["點任意位置即可關閉，隨時可從上方「活動規則」再次查看。","準備好就按「我了解了」。活動期間，隨時可從上方「活動規則」再次查看。"]];if(data.page)for(const key of Object.keys(data.page))if(typeof data.page[key]==='string')for(const [a,b]of pairs)data.page[key]=data.page[key].replaceAll(a,b);return data;}).catch(()=>defaults);
    return pending;
  }
  function apply(data){
    for(const node of document.querySelectorAll('[data-festival-title]')) node.textContent=data.title;
    for(const node of document.querySelectorAll('[data-festival-welcome]')) node.textContent=data.welcome;
    for(const node of document.querySelectorAll('[data-school-name]')){
      const team=data.teams[node.dataset.schoolName];
      if(team) node.textContent=team.name;
    }
    for(const id of ['A','B']){
      const color=data.teams[id].color;
      if(!/^#[0-9a-f]{6}$/i.test(color)) continue;
      const key=id.toLowerCase();
      document.documentElement.style.setProperty('--festival-accent-'+key,color);
    }
  }
  window.FestivalPresentation={ defaults,load,apply };
})();

