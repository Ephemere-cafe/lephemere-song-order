(function(root){'use strict';
 const defaults={'夏沐':['暖杏金','#AD8054'],'彌亞璃卡':['乾燥玫瑰','#A96F8B'],'小顏':['鼠尾草綠','#668E7C'],'玥紅雪':['霧藍灰','#819CB2'],'Naipa':['珊瑚陶紅','#BC796B'],'蒼':['靛青藍','#597BA5'],'璐可':['淡藤紫','#9280B4'],'草莓':['莓果紅','#B55F79'],'諾依':['香檳金','#B39A5E'],'馬鈴薯':['蜜橙','#C08750'],'魔可娜':['湖水青','#5C9A9C'],'琥珀':['煙茶棕','#A18A6A'],'魯德曼':['灰紫羅蘭','#8B739D']};
 function valid(value){return typeof value==='string'&&/^#[0-9a-f]{6}$/i.test(value);}
 function resolve(name,saved){if(valid(saved))return saved.toUpperCase();const key=Object.keys(defaults).find(k=>k.toLowerCase()===String(name).toLowerCase());if(key)return defaults[key][1];let hash=0;for(const c of String(name))hash=(hash*31+c.codePointAt(0))>>>0;return Object.values(defaults)[hash%13][1];}
 function tint(color,dark=false){const bg=dark?[36,32,37]:[248,245,239],c=[1,3,5].map(i=>parseInt(color.slice(i,i+2),16)),weight=dark?.19:.075;return '#'+c.map((v,i)=>Math.round(v*weight+bg[i]*(1-weight)).toString(16).padStart(2,'0')).join('');}
 root.MemberColors={defaults,valid,resolve,tint};
})(typeof globalThis!=='undefined'?globalThis:this);
