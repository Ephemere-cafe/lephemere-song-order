(()=>{
  const make=(tag,text='',className='')=>{
    const element=document.createElement(tag);
    element.textContent=text;
    if(className)element.className=className;
    return element;
  };
  function photo(prize){
    const image=make('img');
    image.src=prize.photo;
    image.alt=prize.name;
    image.loading='lazy';
    return image;
  }
  function description(text){
    let url;
    try{url=new URL(text);}catch{return make('p',text);}
    if(url.protocol!=='https:'||url.username||url.password)return make('p',text);
    const link=make('a',['youtu.be','www.youtube.com','youtube.com'].includes(url.hostname)?'試聽作品':'查看作品');
    link.href=url.href;
    link.target='_blank';
    link.rel='noopener noreferrer';
    return link;
  }
  window.FestivalPrizeLayout173=function(data,emptyText){
    const layout=make('div');
    const prizes=Array.isArray(data.prizes)?data.prizes:[];
    if(!prizes.length){layout.append(make('p',emptyText,'prizes-empty'));return layout;}
    const shared=prizes.filter(prize=>prize.pool==='all');
    if(shared.length){
      const group=make('section','','prize-shared-v173'), header=make('header'), grid=make('div','','prize-feature-grid');
      header.append(make('h3','兩校共同大獎'),make('p','兩校符合抽獎資格的主人皆可參加。'));
      for(const prize of shared){
        const item=make('article','','prize-feature-v173'), details=make('div');
        if(prize.photo)item.append(photo(prize));
        else if(/https:\/\/(youtu\.be|(?:www\.)?youtube\.com)\//i.test(prize.description || '')){
          const icon=make('span','♪','prize-audio-v173');
          icon.setAttribute('aria-hidden','true');
          item.append(icon);
        }
        details.append(make('h4',prize.name),make('p',prize.quantity+' 份'));
        if(prize.description)details.append(description(prize.description));
        item.append(details);grid.append(item);
      }
      group.append(header,grid);layout.append(group);
    }
    const schools=make('div','','prize-school-grid');
    for(const pool of ['A','B']){
      const rows=prizes.filter(prize=>prize.pool===pool);
      const group=make('section','','prize-school-v173'), list=make('ul');
      group.dataset.pool=pool;
      group.append(make('h3',data.teams[pool].name+'專屬'));
      for(const prize of rows){
        const row=make('li'), label=make('span');
        if(prize.photo)label.append(photo(prize));
        const text=make('div',prize.name);
        if(prize.description)text.append(description(prize.description));
        label.append(text);row.append(label,make('small',prize.quantity+' 份'));list.append(row);
      }
      group.append(rows.length?list:make('p','尚未公布專屬獎項。'));schools.append(group);
    }
    layout.append(schools);return layout;
  };
})();
