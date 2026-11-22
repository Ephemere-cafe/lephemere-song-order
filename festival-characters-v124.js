/* User-supplied character profiles. Staff identity is kept separately for orders. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.FestivalCharacters=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){
 'use strict';
 const records=[
 {id:'miarica',team:'A',staffName:'彌亞璃卡',aliases:['彌亞','彌亞璃卡'],name:'Miya Rika（宮 梨花）',shortName:'宮 梨花',role:'普通班 - 3年級生',personality:'樂天派女孩、喜歡捉弄「有趣的孩子」、有點叛逆、討厭麻煩的人事物',biography:`亮金色公主切長髮、粉紅色蝴蝶結與短襪，在規矩的水手服裡硬是塞滿自己最愛的顏色。
所以每天都在跟風紀委員玩躲貓貓，被念了也只會眨眼吐舌頭裝傻，堅持「可愛就是正義」。
明明沒有一點外國血統，卻被父母硬是取了一個英文混日文的名字，頂著一頭金髮走在路上，常常被誤認成外國人（很困擾）。
因為在學校總是被說「太花俏了」，這次特別來到曇時，就是希望能讓大家看見她的可愛、讓更多人認可她的專屬打扮！`},
 {id:'noi',team:'B',staffName:'諾依',aliases:['諾依'],name:'千早 愛依',shortName:'千早 愛依',role:'高中部一年級',biography:`有些愛出風頭，個性外向直爽喜歡結交朋友，興趣是經營自己的社群平台內容都是探店、景點和自己的照片。

曾待在某某學院一陣子，但覺得無法融入環境就轉回離家近的學校，眾人問起轉學原因的事情時會笑笑帶過。`,quote:'「午餐要一起吃嗎？今天我有準備自己做的小點心可以分享呦！」'},
 {id:'naipa',team:'B',staffName:'Naipa',aliases:['naipa','奈帕'],name:'奈帆・帕羽（NAHO • PANE）',shortName:'奈帆・帕羽',role:'高中部二年級',biography:`個性膽小怕生，不太擅長與人相處，總是給人一種缺乏自信、沒有主見的印象。
面對他人的請求，即使內心並不願意，也很難開口拒絕
被同學開玩笑時，也總是以尷尬的笑容帶過。

過去曾遭受過排擠，平時在班上幾乎沒有存在感，經常只有在同學需要推託事情時才會被想起。

大家的面前總是一個乖乖牌學生
不過，這些其實都是她在學校刻意展現的一面。
總是默默承受校園裡的一切，或許只是因為她很清楚，自己其實有能力反擊，只是不覺得有那個必要。

私底下的她……`,quote:'「啊、那個……如果不嫌棄的話，我可以幫忙喔……？」'},
 {id:'strawberry',team:'A',staffName:'麻辣草莓湯',aliases:['草莓','麻辣草莓湯'],name:'柿本 草莓',shortName:'柿本 草莓',role:'高中部一年級',personality:'+9',draft:true,biography:`雖然矮小，但氣勢不會輸人。渴望得到別人的贊同，被稱讚時臉色會發紅，但不會給什麼甜頭，只有更兇而已。
會嘲笑其他同學和說同學的壞話，但還是把同學們當作朋友喔！對待客人很不認真，沒什麼耐心。
最喜歡吃辣的東西，給他點好處，他可能也會給你點好處，看心情。
男生只喜歡高富帥，醜男會罵對方ㄐㄐ小。無聊男會說他很無聊，會幫男人進行排名（接待時不會有第一名或最後一名，表演而已）
女生的話可能會分享八卦，或問對方喜歡的類型`,quote:'「是嗎？那你也不過如此吧？」'},
 {id:'rudman',team:'A',staffName:'魯德曼',aliases:['魯德曼'],name:'月宮 瑠（Tsukimiya Ru）',shortName:'月宮 瑠',role:'高中部二年級',personality:'傲嬌',biography:`嘴上嫌麻煩、愛吐槽，對承諾很看重。
實際上很細心，會默默記住朋友的喜好，也總在大家需要時出手幫忙。
被真誠稱讚時則會整個人慌掉，嘴上反駁，臉紅的逃離現場。`,quote:'「你、你笑什麼？我只是有點熱而已！」'},
 {id:'cang',team:'A',staffName:'蒼',aliases:['蒼'],name:'深 蒼',shortName:'深 蒼',role:'高中部三年級',personality:'喜歡音樂,話少,很易進入忘我狀態(演奏時)',biography:'不怎說話,平日不是在作曲就是在演奏,在面對音樂會異常執著,是學院音樂部的部長,旗下有帶領一隊8人組合的樂團「蒼藍的誓言」,在對方打擾她作曲或演奏時會很精準地向對方丟龜殼',quote:'「比起普通的對話,我還是感覺音樂比較可以說出我的心情」'},
 {id:'ruko',team:'A',staffName:'璐可',aliases:['璐可'],name:'美和 璐可（みわルカ／Miwa ruka）',shortName:'美和 璐可',role:'二年級生',personality:`個性親切活潑，待人友善，偶爾有點調皮，喜歡和熟悉的同學互相開玩笑。
平常有些隨性，偶爾還會偷偷摸魚，但答應別人的事情就會認真完成。比起成為眾人矚目的焦點，更喜歡和大家一起熱熱鬧鬧地度過每一天。`,biography:`原本只是想在校園祭期間悠閒地逛逛攤位、吃點好吃的，卻被同學半推半就地拉進了校園祭執行委員會。
對學院裡的各種小道消息相當感興趣，也很喜歡和來訪者閒聊。最大的弱點是甜點，只要聽見哪個班級推出限定點心，就會忍不住想找機會溜過去看看。`,quote:'「欸～難得的校園祭，當然要玩得開心一點呀！工作？我有在做啦～真的！」'},
 {id:'potato',team:'B',staffName:'爌肉馬鈴薯',aliases:['馬鈴薯','爌肉馬鈴薯','鈴薯'],name:'鈴薯',shortName:'鈴薯',role:'普通科高二生',personality:'愛跟流行、喜愛社交、易親近、自信',opening:'「ヤッホーー☆♪」',biography:`天生崇尚美麗事物的鈴薯，為了變成自己心目中最喜歡的模樣，她每天瘋狂研究時尚雜誌、把頭髮染成耀眼的淺金色、畫上精緻又張揚的妝容，穿上現在最流行的泡泡襪配厚底鞋，只希望能變成那個自己心目中最可愛、最美麗的鈴薯。雖然他的外貌讓他看起來有些難以親近，但只要是跟他聊過天的人，都會馬上被他攻略下來，可以說是社交界的恐怖份子。

這股驚人的「攻略力」，源自於她骨子裡那份毫不設防的熱情與自信。在鈴薯的字典裡，從來沒有「距離感」這三個字。對她而言，每一個擦肩而過的人，都可能是還沒交換聯絡方式的新朋友。當別人還在猶豫該怎麼開啟話題時，鈴薯已經帶著比太陽還耀眼的笑容湊了上去，用最自然、最熱絡的語氣大讚對方的穿搭或小物，三言兩語就能把陌生人拉進她的節奏裡。

而讓她成為人群焦點的另一個秘密武器，則是她那堪稱「行動流行雷達」的敏銳嗅覺。無論是剛開幕的話題甜點店、限時快閃的聯名周邊，還是街頭最新流行的拍照姿勢，鈴薯永遠是第一個衝在最前線體驗的人。但她從不把這些新奇事物私藏，反而最喜歡拉著剛認識的朋友一起去打卡、分享戰利品，彷彿要把自己感受到的快樂與潮流能量，通通擴散給身邊的每一個人。

「既然要活，就要活成自己最喜歡的樣子嘛〜☆」這就是鈴薯的生存哲學。她從不在意別人的眼光，也從不吝嗇讚美他人。正是這份將「自信」與「親和力」完美融合的魅力，讓這位頂著金髮厚底鞋的 109 辣妹，無論走到哪裡都能迅速成為整個圈子的中心，讓人一旦靠近就再也無法移開視線。`},
 {id:'amber',team:'B',staffName:'琥珀',aliases:['琥珀'],name:'橘 琥珀（Tachibana Kohaku）',shortName:'橘 琥珀',role:'高中部二年級',personality:`個性溫婉、優雅，舉手投足間散發著大和女子般的氣質，初見時也許感覺上會有些生人勿近，實則比較慢熟，不太擅長與人交流。說話簡潔，習慣直截了當地表達重點，但在緊張時反而會變得多話，雖然不善社交，可當察覺同學有需求時仍會提供幫助。
做事屬於務實派，學姐交代的事務總是能妥善完成，不過偶爾會犯迷糊。
對於八卦相對無感，可如果是跟暗戀對象有關的就會比較在意。
喜歡吃甜食，最喜歡的是薄荷巧克力，偶爾會在放學後特地繞遠路去探店，並買一盒甜點回去宿舍和女侍一起吃。
據說，聽到別人叫她「甜食怪物」會炸毛。`,biography:`橘氏家族的獨生女，其父輩是來自遠東之國的一支豪族，在當地從事紡織經商，為了讓自家寶貝女兒增廣見聞，便安排她和貼身女侍一同到艾歐澤亞的曇光女子學院就讀，目前兩人皆居住於學院提供的宿舍中。
兒時接受私人導師的教育，在花道、茶道上頗有造詣，在學院時期培養出閱讀興趣，喜歡研讀艾歐澤亞各國歷史，特別是那些鮮為人知的野史，因此在一年級時便主動自薦加入圖書委員，平日負責整理及書籍租借。
此外還有參加學校的美術部活動，不過在藝術方面似乎有著自己獨特的見解，偶爾會展現出令人難以理解的抽象品味。
在學校有一名暗戀的對象，但姓名不詳。`,quote:'『 前輩, 妳要找的拉拉菲爾種族大事紀就放在最左邊書架上第五層喔 』'},
 {id:'mokona',team:'B',staffName:'魔可娜',aliases:['魔可娜','mokona'],name:'魔悠奈（Mayu na）',shortName:'魔悠奈',role:'高中部二年級／吉他練習生',title:'神出鬼沒的貓系少女',personality:'寡言少語、我行我素、神祕、慵懶，帶有貓咪般難以捉摸的性格。',biography:`平時總是按照自己的步調行動，經常在校園裡神出鬼沒，手裡拿著一把吉他，卻還處於練習階段，演奏技術仍有待加強。

她不太擅長與人交談，說話簡短，用詞也十分簡單。比起主動搭話，更喜歡安靜地待在角落觀察周遭。

有時候你會突然發現她正站在不遠處，默默注視著你；當你轉過頭時，她又若無其事地移開視線。

她的行為舉止就像一隻貓，總是出現在意想不到的地方。即使被發現，也只會淡淡地說一句：`,quote:'「……喵？吉他……還不會。」'}
 ];
 const key=s=>String(s||'').replace(/\s+/g,'').toLowerCase();
 const find=(name,team)=>records.find(r=>(!team||r.team===team)&&[r.staffName,r.id,...r.aliases].some(n=>key(n)===key(name)));
 function fields(record){return {character:[['姓名',record.name],['職稱／年級',record.role],['稱號',record.title],['個性',record.personality],['備註',record.draft?'角色設定草稿（待編輯）':'']].filter(([,v])=>v).map(([k,v])=>k+'：'+v).join('\n'),intro:[record.opening,record.biography,record.quote].filter(Boolean).join('\n\n')};}
 function enabled(data){return /學園祭/.test(data?.title||'')&&data?.teams?.A?.name==='曇華女子學院'&&data?.teams?.B?.name==='曇光女子學院';}
 function merge(data){if(!enabled(data))return data;const out={...data,teams:{...data.teams}};for(const team of ['A','B']){out.teams[team]={...data.teams[team]};if(Array.isArray(data.teams[team].members))out.teams[team].members=data.teams[team].members.map(member=>{const record=find(member.name,team);if(!record||String(member.character||'').trim())return member;const value=fields(record);return {...member,character:value.character,intro:member.intro||value.intro};});}return out;}
 function identity(member){const match=String(member?.character||'').match(/^(?:姓名|名字|名稱)\s*[：:]\s*(.+)$/m);const name=match?.[1]?.trim()||member?.name||'',record=find(member?.name);return {name,shortName:record?.name===name?record.shortName:(name.replace(/[（(].*$/,'').trim()||name),staffName:member?.name||''};}
 return {records,find,fields,enabled,merge,identity};
});
// Enrich the cached presentation response only. No extra request and no database writes.
if(typeof window!=='undefined'&&window.FestivalPresentation){
 const original=window.FestivalPresentation.load;let pending;
 window.FestivalPresentation.load=function(){return pending||(pending=original().then(window.FestivalCharacters.merge));};
}
