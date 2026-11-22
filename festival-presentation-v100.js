(function(){
  const defaults={title:'曇時學園祭',welcome:'選一所想支持的學院，再挑選該學院的活動餐點。',teams:{A:{name:'曇華女子學院',color:'#385c72'},B:{name:'曇光女子學院',color:'#774958'}}};
  let pending;
  function load(){
    if(!pending) pending=fetch('https://asia-southeast1-lephemere-queue-c38d5.cloudfunctions.net/festivalPresentationV100',{
      method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({data:{}})
    }).then(response=>{
      if(!response.ok) throw new Error('無法載入活動外觀。');
      return response.json();
    }).then(body=>body.result || body.data || defaults).catch(()=>defaults);
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

