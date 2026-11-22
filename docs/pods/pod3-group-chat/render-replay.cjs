#!/usr/bin/env node
// Pod 3 group chat (#961·AI): turn a chain run (out-<topic>.json) into
//  1. a script in the Caryl Churchill overlap convention:
//       "/"  = where the NEXT speaker starts over this line
//       "—"  = this line is cut off
//       "(Dean: mm)" = a short back-channel, mid-line, where it lands
//  2. a single static timed chat-replay page (no voicing): lines type at speaking pace, an
//     overlapping line starts while the earlier one is still typing, a cut-off line stops mid-word.
// Usage: node render-replay.cjs <topic> <title> <outDir for html>
const fs = require('fs');
const path = require('path');
const [, , topic, title, htmlDir] = process.argv;
const run = JSON.parse(fs.readFileSync(path.join(__dirname, `out-${topic}.json`), 'utf8'));
const T = run.T;
// v4 (#992): layer-3 move tags, judged in chain.cjs, shown as stage directions (never in the spoken text)
const MOVES = Object.fromEntries(require('../../../services/shared/metagraph/moves.json').moves.map(m => [m.id, m]));
const moveLabel = id => id ? `${id} ${MOVES[id] ? MOVES[id].name : ''}`.trim() : null;

// Where does the next speaker come in on line i? Character offset into T[i].line, or null.
// Cut-in: the cut speaker gets a word or two out after the interrupter starts (that is what an
// interruption sounds like), then stops at the cut point. Overlap without a cut: the next speaker
// starts over the last few words.
function slashAt(i) {
  const next = T[i + 1];
  if (!next || !(next.cutIn || next.overlap)) return null;
  const line = T[i].line;
  const words = [...line.matchAll(/\S+/g)];
  const back = next.cutIn ? (words.length >= 6 ? 2 : 1) : Math.min(3, Math.max(1, words.length - 1));
  if (words.length <= back) return 0;
  return words[words.length - back].index;
}

// back-channel insertion offsets (after the anchor words), de-duplicated
function bcList(e) {
  const out = [], seen = new Set();
  for (const b of e.backchannels || []) {
    if (seen.has(b.after)) continue;
    const k = e.line.indexOf(b.after);
    if (k < 0) continue;
    seen.add(b.after);
    out.push({ at: k + b.after.length, who: b.who, text: b.text });
  }
  return out.sort((a, b) => a.at - b.at);
}

const lines = T.map((e, i) => ({
  speaker: e.speaker,
  text: e.line,
  slash: slashAt(i),
  cutOff: !!e.cutOff,
  cutIn: !!e.cutIn,
  overlap: !!e.overlap,
  bcs: bcList(e),
  move: moveLabel(e.move),
  event: e.event || null,
}));

// ---- 1. Churchill script ----
function scriptLine(l) {
  const ins = l.bcs.map(b => ({ at: b.at, s: ` (${b.who}: ${b.text})` }));
  if (l.slash !== null) ins.push({ at: l.slash, s: '/', slash: true });
  ins.sort((a, b) => a.at - b.at || (a.slash ? 1 : -1));
  let s = '', k = 0;
  for (const x of ins) { s += l.text.slice(k, x.at) + x.s; k = x.at; }
  s += l.text.slice(k);
  if (l.cutOff) s = s.replace(/[\s,;:.]+$/, '') + '—';
  return `${l.event ? `*[${l.event}]*\n\n` : ''}**${l.speaker.toUpperCase()}**${l.move ? ` *[move ${l.move}]*` : ''} ${s}`;
}
const scriptMd = `# ${title} (script)

*How to read it:* a **/** marks where the next speaker starts talking over the line. A line ending in **—** is cut off there. Short back-channels like *(Dean: mm)* sit in brackets where they land. *[Hugh's pint goes over]* is something physical happening at the table. *[move F16 …]* is a stage direction naming the layer-3 group-contribution move that turn performs (metagraph id); it is never spoken. [Watch it as a timed replay](https://watson-1.tail4968cb.ts.net/evidence/pod3-group-chat/${topic}.html).

*${run.topic}*

${lines.map(scriptLine).join('\n\n')}
`;
fs.writeFileSync(path.join(__dirname, `script-${topic}.md`), scriptMd);

// ---- 2. replay page ----
const COLOURS = { Maggie: '#b07cd8', Dean: '#e0a040', Priya: '#e0607a', Gaz: '#5fa8e0', Ana: '#4fbf8a', Toby: '#d8c050', Rhi: '#e0a040', Hugh: '#4fbf8a', Jess: '#e0607a', Femi: '#5fa8e0', Danny: '#b07cd8', Sunny: '#d8c050' };
const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<title>${title} (replay)</title>
<style>
:root{--bg:#15191f;--card:#1f252e;--text:#e3e8ef;--muted:#8d97a6;--line:#323a46}
@media (prefers-color-scheme:light){:root{--bg:#f1f3f6;--card:#fff;--text:#1c2430;--muted:#5b6678;--line:#d3d9e2}}
*{box-sizing:border-box}
body{margin:0;background:var(--bg);color:var(--text);font:16px/1.5 -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif}
header{max-width:720px;margin:0 auto;padding:calc(8px + env(safe-area-inset-top)) 14px 0}
.bar{position:fixed;left:0;right:0;bottom:0;z-index:3;background:var(--bg);border-top:1px solid var(--line);padding:8px 10px calc(8px + env(safe-area-inset-bottom))}
.bar .ctl{max-width:720px;margin:0 auto;justify-content:center}
h1{font-size:16px;margin:0 0 2px}
.q{font-size:13px;color:var(--muted);margin:0 0 8px}
.ctl{display:flex;gap:6px;flex-wrap:nowrap;align-items:center}
button{font:inherit;font-size:14px;min-height:38px;background:var(--card);color:var(--text);border:1px solid var(--line);border-radius:9px;padding:7px 13px;cursor:pointer}
button.on{border-color:var(--text)}
.key{font-size:12px;color:var(--muted);margin-top:6px}
#feed{max-width:720px;margin:0 auto;padding:4px 12px 45vh}
.msg{background:var(--card);border:1px solid var(--line);border-left:4px solid var(--c);border-radius:12px;padding:8px 12px;margin:10px 0;animation:in .2s ease}
.msg.over{margin-left:22px;margin-top:-4px}
.msg.over::before{content:"talking over";display:block;font-size:11px;color:var(--muted);letter-spacing:.03em;text-transform:uppercase}
.who{font-weight:700;color:var(--c);font-size:13px;margin-right:6px}
.typing .t::after{content:"▌";opacity:.5;animation:blink 1s steps(1) infinite}
.cut{color:var(--muted)}
.bc{font-size:13px;color:var(--muted);font-style:italic;animation:in .25s ease}
.sl{color:var(--muted);font-weight:700;padding:0 1px}
.ev{display:block;font-size:13px;color:var(--muted);font-style:italic;margin:2px 0 4px}
.mv{display:block;font-size:11px;color:var(--muted);letter-spacing:.02em;font-style:italic}
@keyframes in{from{opacity:0;transform:translateY(4px)}to{opacity:1}}
@keyframes blink{50%{opacity:0}}
</style></head><body>
<header>
<h1>${title}</h1>
<p class="q">${run.topic.replace(/</g, '&lt;')}</p>
<div class="key">/ = the next speaker starts here · — = cut off · (Name: mm) = back-channel · indented = talking over · <i>move F…</i> = the group-contribution move that turn makes</div>
</header>
<div class="bar"><div class="ctl">
<button id="play">Pause</button><button id="restart">↺</button>
<button data-s="0.75">¾×</button><button data-s="1" class="on">1×</button><button data-s="1.5">1½×</button><button data-s="2">2×</button>
</div></div>
<div id="feed"></div>
<script>
const LINES = ${JSON.stringify(lines)};
const COL = ${JSON.stringify(COLOURS)};
const CPS = 14.5;        // characters a second at 1×, about 165 words a minute of speech
const GAP = 450;         // ms of silence between turns that do not overlap
// Build a timeline in "speech ms". Each line: start, and the time to type n characters = n/CPS.
// A cut-off line stops partway through its last word, then the dash.
function shown(l){
  if(!l.cutOff) return l.text;
  const t=l.text.replace(/[\\s,;:.]+$/,''); const m=t.match(/(\\S+)$/); if(!m) return t;
  const w=m[1]; const keep=Math.max(1,Math.ceil(w.length*0.55));
  return t.slice(0,t.length-w.length)+w.slice(0,keep);
}
const plan=[]; let t=0;
LINES.forEach((l,i)=>{
  const s=shown(l);
  const start = i===0 ? 600 : plan[i-1].nextStart;
  const end = start + s.length/CPS*1000;
  const nextStart = l.slash!==null ? start + Math.min(l.slash,s.length)/CPS*1000 : end + GAP + (l.text.length<25?0:150);
  plan.push({start,end,nextStart,s});
});
const feed=document.getElementById('feed'); let els=[]; let speed=1, playing=true, clock=0, last=null;
function esc(x){return x.replace(/&/g,'&amp;').replace(/</g,'&lt;')}
function build(){feed.innerHTML='';els=LINES.map((l,i)=>{const d=document.createElement('div');d.className='msg'+(l.cutIn||l.overlap?' over':'');d.style.setProperty('--c',COL[l.speaker]||'#999');d.innerHTML=(l.event?'<span class="ev">'+esc(l.event)+'</span>':'')+(l.move?'<span class="mv">move '+esc(l.move)+'</span>':'')+'<span class="who">'+l.speaker+'</span><span class="t"></span>';d.hidden=true;feed.appendChild(d);return {d,t:d.querySelector('.t'),n:-1}})}
function render(i,n){
  const l=LINES[i],p=plan[i],e=els[i]; if(e.n===n) return; e.n=n;
  let h='',k=0; const ins=[];
  l.bcs.forEach(b=>{if(b.at<=n)ins.push({at:b.at,h:' <span class="bc">('+esc(b.who)+': '+esc(b.text)+')</span>'})});
  if(l.slash!==null&&l.slash<=n)ins.push({at:l.slash,h:'<span class="sl">/</span>'});
  ins.sort((a,b)=>a.at-b.at);
  const txt=p.s.slice(0,n);
  ins.forEach(x=>{const a=Math.min(x.at,txt.length);h+=esc(txt.slice(k,a))+x.h;k=a});
  h+=esc(txt.slice(k));
  const done=n>=p.s.length;
  if(done&&l.cutOff)h+='<span class="cut">—</span>';
  e.t.innerHTML=h; e.d.classList.toggle('typing',!done);
}
function tick(now){
  if(last!==null&&playing)clock+=(now-last)*speed; last=now;
  let newest=-1;
  plan.forEach((p,i)=>{
    if(clock<p.start){els[i].d.hidden=true;return}
    if(els[i].d.hidden){els[i].d.hidden=false;newest=i}
    render(i,Math.min(p.s.length,Math.floor((clock-p.start)/1000*CPS)));
  });
  if(newest>=0)els[newest].d.scrollIntoView({behavior:'smooth',block:'center'});
  requestAnimationFrame(tick);
}
document.getElementById('play').onclick=e=>{playing=!playing;e.target.textContent=playing?'Pause':'Play'};
document.getElementById('restart').onclick=()=>{clock=0;build();window.scrollTo(0,0);playing=true;document.getElementById('play').textContent='Pause'};
document.querySelectorAll('[data-s]').forEach(b=>b.onclick=()=>{speed=+b.dataset.s;document.querySelectorAll('[data-s]').forEach(x=>x.classList.toggle('on',x===b))});
build(); requestAnimationFrame(tick);
</script></body></html>`;
fs.mkdirSync(htmlDir, { recursive: true });
fs.writeFileSync(path.join(htmlDir, `${topic}.html`), html);
console.log('ok', topic, lines.filter(l => l.slash !== null).length, 'overlap points');
