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

// S0051-S0060
[
  {id:'S0051',l:[{i:'S0001L01',t:'A',ta:'我',k:'I',r:'S0001'},{i:'S0026L01',t:'A',ta:'喜欢',k:'enjoy',r:'S0026'},{i:'S0051L01',t:'M',ta:'和朋友',k:'with my friends',n:1,c:[['和','with'],['朋友','friends']]},{i:'S0051L02',t:'A',ta:'做',k:'doing',n:1},{i:'S0051L03',t:'M',ta:'有趣的事',k:'interesting things',n:1,c:[['有趣','interesting'],['的','marker'],['事','things']]}],p:['P40_enjoy_doing']},
  {id:'S0052',l:[{i:'S0052L01',t:'A',ta:'他',k:'he',n:1},{i:'S0052L02',t:'A',ta:'上星期',k:'last week',n:1},{i:'S0003L01',t:'A',ta:'想',k:'wanted',r:'S0003'},{i:'S0052L03',t:'M',ta:'给他朋友',k:'to his friend',n:1,c:[['给','to/give'],['他','his'],['朋友','friend']]},{i:'S0052L04',t:'M',ta:'写封信',k:'write a letter',n:1,c:[['写','write'],['封','measure word'],['信','letter']]}],p:['P41_gei_to_someone']},
  {id:'S0053',l:[{i:'S0053L01',t:'A',ta:'她',k:'she',n:1},{i:'S0003L01',t:'A',ta:'想',k:'wanted',r:'S0003'},{i:'S0053L02',t:'M',ta:'把他的信',k:'his letter',n:1,c:[['把','marker'],['他的','his'],['信','letter']]},{i:'S0053L03',t:'M',ta:'放在她包里',k:'put in her bag',n:1,c:[['放在','put in'],['她','her'],['包','bag'],['里','inside']]}],p:['P42_ba_construction']},
  {id:'S0054',l:[{i:'S0054L01',t:'A',ta:'我们',k:'we',n:1},{i:'S0003L01',t:'A',ta:'想',k:'wanted',r:'S0003'},{i:'S0054L02',t:'A',ta:'再',k:'again',n:1},{i:'S0054L03',t:'M',ta:'给你',k:'give you',n:1,c:[['给','give'],['你','you']]},{i:'S0009L02',t:'A',ta:'一点',k:'a little',r:'S0009'},{i:'S0054L04',t:'A',ta:'时间',k:'time',n:1}],p:['P43_zai_again']},
  {id:'S0055',l:[{i:'S0055L01',t:'M',ta:'当我没睡好的时候',k:'when I didn\'t sleep very well',n:1,c:[['当','when'],['我','I'],['没','didn\'t'],['睡好','sleep well'],['的时候','marker']]},{i:'S0001L01',t:'A',ta:'我',k:'I',r:'S0001'},{i:'S0003L03',t:'M',ta:'不喜欢',k:'I don\'t enjoy',r:'S0003'},{i:'S0055L02',t:'A',ta:'醒来',k:'waking up',n:1}],p:['P44_dang_when']},
  {id:'S0056',l:[{i:'S0056L01',t:'M',ta:'这样我能',k:'so I can',n:1,c:[['这样','this way'],['我','I'],['能','can']]},{i:'S0010L03',t:'A',ta:'记住',k:'remember',r:'S0010'},{i:'S0004L03',t:'M',ta:'怎么说',k:'how to say',r:'S0004'},{i:'S0056L02',t:'M',ta:'几个词',k:'a few words',n:1,c:[['几个','a few'],['词','words']]}],p:['P45_zheyang_so']},
  {id:'S0057',l:[{i:'S0001L01',t:'A',ta:'我',k:'I',r:'S0001'},{i:'S0057L01',t:'M',ta:'记不住',k:'can\'t remember',n:1,c:[['记','remember'],['不','not'],['住','complement']]},{i:'S0004L03',t:'M',ta:'怎么说',k:'how to say',r:'S0004'},{i:'S0057L02',t:'M',ta:'我想说的',k:'what I wanted to say',n:1,c:[['我','I'],['想','wanted'],['说','say'],['的','marker']]}],p:['P46_bu_potential_complement']},
  {id:'S0058',l:[{i:'S0058L01',t:'M',ta:'当你懂',k:'when you understand',n:1,c:[['当','when'],['你','you'],['懂','understand']]},{i:'S0058L02',t:'M',ta:'足够的词的时候',k:'enough words',n:1,c:[['足够','enough'],['的','marker'],['词','words'],['的时候','marker']]},{i:'S0027L02',t:'A',ta:'很有趣',k:'interesting',r:'S0027'}],p:['P47_donng_understand']},
  {id:'S0059',l:[{i:'S0001L01',t:'A',ta:'我',k:'I',r:'S0001'},{i:'S0005L01',t:'A',ta:'知道',k:'know',r:'S0005'},{i:'S0059L01',t:'M',ta:'下星期怎么做',k:'how to do next week',n:1,c:[['下星期','next week'],['怎么','how to'],['做','do']]},{i:'S0059L02',t:'M',ta:'我需要做的',k:'what I need to do',n:1,c:[['我','I'],['需要','need'],['做','do'],['的','marker']]}],p:['P48_need_to_do']},
  {id:'S0060',l:[{i:'S0001L01',t:'A',ta:'我',k:'I',r:'S0001'},{i:'S0060L01',t:'A',ta:'还',k:'yet',n:1},{i:'S0005L03',t:'M',ta:'不知道',k:'I don\'t know',r:'S0005'},{i:'S0004L03',t:'M',ta:'怎么说',k:'how to say',r:'S0004'},{i:'S0060L02',t:'M',ta:'足够不同的词',k:'enough different words',n:1,c:[['足够','enough'],['不同','different'],['的','marker'],['词','words']]}],p:['P49_hai_yet']}
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
console.log('\n✅ S0051-S0060 | Total: 60 seeds, ' + c + ' LEGOs');
