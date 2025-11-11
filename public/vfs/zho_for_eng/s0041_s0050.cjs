const fs = require('fs');
const sp = JSON.parse(fs.readFileSync('seed_pairs.json', 'utf8'));
const ex = JSON.parse(fs.readFileSync('lego_extraction.json', 'utf8'));
const reg = new Map();
ex.seeds.forEach(s => s.legos.forEach(l => { if (l.new) reg.set(l.target, l); }));
let c = ex.seeds[ex.seeds.length - 1].cumulative_legos;
const add = (o) => {
  const r = o.legos.map(l => l.target).join('');
  const exp = o.seed_pair[0].replace(/[，。！？：；、""''（）《》【】]/g, '');
  const got = r.replace(/[，。！？：；、""''（）《》【】]/g, '');
  const ok = got === exp;
  console.log(o.seed_id + ': ' + (ok ? '✓' : '✗'));
  if (!ok) { console.log('  Exp:', exp); console.log('  Got:', got); process.exit(1); }
  o.legos.forEach(l => { if (l.new) { reg.set(l.target, l); c++; }});
  o.cumulative_legos = c;
  ex.seeds.push(o);
};

// S0041-S0050
[
  {id:'S0041',l:[{i:'S0001L01',t:'A',ta:'我',k:'I',r:'S0001'},{i:'S0026L02',t:'A',ta:'感觉',k:'feel',r:'S0026'},{i:'S0041L01',t:'A',ta:'还好',k:'okay',n:1},{i:'S0041L02',t:'M',ta:'但我开始感到累',k:"but I'm starting to feel tired",n:1,c:[['但我','but I'],['开始','starting'],['感到','feel'],['累','tired']]}],p:['P30_kaishi_start']},
  {id:'S0042',l:[{i:'S0001L01',t:'A',ta:'我',k:'I',r:'S0001'},{i:'S0042L01',t:'M',ta:'开始感觉',k:'was starting to feel',n:1,c:[['开始','starting'],['感觉','feel']]},{i:'S0042L02',t:'M',ta:'比昨晚好',k:'better than last night',n:1,c:[['比','than'],['昨晚','last night'],['好','better']]}],p:['P31_past_progressive']},
  {id:'S0043',l:[{i:'S0001L01',t:'A',ta:'我',k:'I',r:'S0001'},{i:'S0043L01',t:'M',ta:'没在想',k:"I wasn't thinking",n:1,c:[['没','not'],['在','progressive'],['想','think']]},{i:'S0043L02',t:'M',ta:'怎么回答',k:'how to answer',n:1,c:[['怎么','how to'],['回答','answer']]}],p:['P32_mei_negative_progressive']},
  {id:'S0044',l:[{i:'S0044L01',t:'A',ta:'或者',k:'or',n:1},{i:'S0001L01',t:'A',ta:'我',k:'I',r:'S0001'},{i:'S0044L02',t:'M',ta:'是不是',k:'if',n:1,c:[['是','is'],['不是','not is']]},{i:'S0044L03',t:'A',ta:'需要',k:'need',n:1},{i:'S0044L04',t:'A',ta:'提高',k:'to improve',n:1}],p:['P33_shi_bu_shi']},
  {id:'S0045',l:[{i:'S0001L01',t:'A',ta:'我',k:'I',r:'S0001'},{i:'S0045L01',t:'M',ta:'不需要',k:"I don't need",n:1,c:[['不','not'],['需要','need']]},{i:'S0045L02',t:'A',ta:'知道',k:'know',n:1},{i:'S0045L03',t:'M',ta:'所有事',k:'everything',n:1,c:[['所有','all'],['事','things']]}],p:['P34_buyao_negative']},
  {id:'S0046',l:[{i:'S0019L01',t:'A',ta:'但',k:'but',r:'S0019'},{i:'S0001L01',t:'A',ta:'我',k:'I',r:'S0001'},{i:'S0046L01',t:'M',ta:'不担心',k:"I don't worry",n:1,c:[['不','not'],['担心','worry']]},{i:'S0046L02',t:'A',ta:'犯错',k:'making mistakes',n:1}],p:['P35_danxin_worry']},
  {id:'S0047',l:[{i:'S0022L01',t:'A',ta:'因为',k:'because',r:'S0022'},{i:'S0001L01',t:'A',ta:'我',k:'I',r:'S0001'},{i:'S0047L01',t:'A',ta:'觉得',k:'think',n:1},{i:'S0047L02',t:'M',ta:'犯错是好事',k:"that it's a good thing to make mistakes",n:1,c:[['犯错','make mistakes'],['是','is'],['好事','good thing']]}],p:['P36_juede_think']},
  {id:'S0048',l:[{i:'S0001L01',t:'A',ta:'我',k:'I',r:'S0001'},{i:'S0048L01',t:'M',ta:'不在乎',k:"I don't care",n:1,c:[['不','not'],['在乎','care']]},{i:'S0046L02',t:'A',ta:'犯错',k:'making mistakes',r:'S0046'}],p:['P37_zaihu_care']},
  {id:'S0049',l:[{i:'S0049L01',t:'M',ta:'是这样的',k:"it's like this",n:1,c:[['是','is'],['这样','this way'],['的','marker']]},{i:'S0049L02',t:'M',ta:'如果你明白我的意思',k:'if you know what I mean',n:1,c:[['如果','if'],['你','you'],['明白','know'],['我的意思','what I mean']]}],p:['P38_ruguo_if']},
  {id:'S0050',l:[{i:'S0001L01',t:'A',ta:'我',k:'I',r:'S0001'},{i:'S0050L01',t:'M',ta:'不是想',k:"I'm not trying",n:1,c:[['不是','not'],['想','trying']]},{i:'S0050L02',t:'A',ta:'尽快',k:'as quickly as possible',n:1},{i:'S0050L03',t:'A',ta:'结束',k:'finish',n:1}],p:['P39_bu_shi_trying']}
].forEach(s => {
  s.seed_pair = sp.translations[s.id];
  s.legos = s.l.map(x => ({
    id: x.i,
    type: x.t,
    target: x.ta,
    known: x.k,
    ...(x.n ? {new: true} : {}),
    ...(x.r ? {ref: x.r} : {}),
    ...(x.c ? {components: x.c} : {})
  }));
  s.patterns = s.p;
  delete s.l; delete s.p;
  add(s);
});

fs.writeFileSync('lego_extraction.json', JSON.stringify(ex, null, 2), 'utf8');
console.log('\\n✅ S0041-S0050 | Total: 50 seeds, ' + c + ' LEGOs');
