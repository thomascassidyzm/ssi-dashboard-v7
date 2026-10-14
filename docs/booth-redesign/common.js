// Shared helpers for the three booth mockups (job #335). Hash routing so every screen has its own address.
const B = window.BOOTH;
const $ = (s) => document.querySelector(s);
const esc = (s) => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const pct = (d, t) => t ? Math.round(100 * d / t) : 0;
const bar = (d, t) => `<div class="bar"><i style="width:${Math.max(pct(d, t), d ? 1 : 0)}%"></i></div>`;
const n = (x) => x.toLocaleString('en-GB');
const allTracks = () => [...B.main, ...B.other];
const track = (id) => allTracks().find(t => t.id === id);
const kindClass = (t) => ({ sent: 'k-sent', p1: 'k-p1', p2: 'k-p2' }[t.id] || 'k-other');
const go = (h) => { location.hash = h; };
const lineList = (lines, from = 0, max = 400) => `<ol class="lines">${lines.slice(from, from + max).map((l, i) =>
  `<li><span class="num">${l.done ? '<span class="tick">✓</span>' : from + i + 1}</span><div><div class="cy">${esc(l.cy)}${l.tag ? `<span class="tag">${esc(l.tag)}</span>` : ''}</div><div class="en">${esc(l.en)}</div></div></li>`).join('')}</ol>`;
// The recording screen every option shares; `where` is the option's own way of saying where you are.
function stage(b, i, where, nextHash, stopHash) {
  if (!b.lines) return `<div class="wrap" style="padding-top:60px;text-align:center"><h2>(Mockup)</h2><p class="sub">The live booth only sends the lines of the batch that is open now, so this batch has no real lines in the mockup.</p><button class="btn ghost" onclick="go('${stopHash}')">Back</button></div>`;
  const l = b.lines[i], nx = b.lines[i + 1];
  return `<div class="stage">
    <div class="row"><div class="grow where">${where}</div><span class="live">● Recording</span></div>
    ${bar(i, b.size)}<div class="sub">Line ${i + 1} of ${b.size} in this batch</div>
    <div class="line"><div class="cy">${esc(l.cy)}</div><div class="en">${esc(l.en)}</div></div>
    ${nx ? `<div class="nextup">Next: ${esc(nx.cy)}</div>` : ''}
    <div class="ctrls"><button class="btn ghost">Again</button><button class="btn ghost" onclick="go('${nextHash}')">Next</button></div>
    <button class="btn ghost" style="margin-top:10px" onclick="go('${stopHash}')">Stop here — your takes are saved</button>
  </div>`;
}
function route(render) { const r = () => { document.body.innerHTML = render(decodeURIComponent(location.hash.slice(1))) ; window.scrollTo(0, 0); }; window.addEventListener('hashchange', r); r(); }
