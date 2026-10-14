// Booth recording screen — mockup helpers shared by the three options (job #419).
// Not live code. Nothing records: the "mic" is a drawn trace and a "take" is a timer.
(function () {
  const B = window.BOOTH;
  const TABS = B.tabs;

  B.navbar = function (el) {
    el.innerHTML = `<div class="in"><span class="brand">Popty</span>
      <nav><a>Courses</a><a>Pedagogy</a><a class="on">Booth</a><a>Admin</a></nav>
      <span class="acct">Aran ▾</span></div>`;
  };

  B.tabs = function (el) {
    el.innerHTML = TABS.map((t) => `<button class="booth-tab ${t === B.activeTab ? 'on' : ''}">${t}</button>`).join('');
  };

  // A level trace from a canvas: busy while "speaking", flat while paused.
  B.wave = function (canvas, isLive) {
    const ctx = canvas.getContext('2d');
    const dpr = 2; canvas.width = canvas.clientWidth * dpr; canvas.height = canvas.clientHeight * dpr;
    const n = 36; const hist = new Array(n).fill(0.05); let t = 0;
    (function tick() {
      t++;
      if (t % 3 === 0) { hist.shift(); hist.push(isLive() ? 0.15 + Math.abs(Math.sin(t / 9)) * 0.55 * Math.random() + 0.1 * Math.random() : 0.03); }
      const w = canvas.width, h = canvas.height; ctx.clearRect(0, 0, w, h);
      const col = getComputedStyle(canvas).color;
      ctx.fillStyle = col;
      const bw = w / n;
      hist.forEach((v, i) => { const bh = Math.max(2, v * h); ctx.fillRect(i * bw + 1, (h - bh) / 2, bw - 2, bh); });
      requestAnimationFrame(tick);
    })();
  };

  // Takes: id → 'up' (on its way) → 'saved'.
  B.takes = {};
  B.file = function (i, onChange) {
    B.takes[i] = 'up'; onChange && onChange();
    setTimeout(() => { B.takes[i] = 'saved'; onChange && onChange(); }, 1300);
  };
  B.recordedCount = () => Object.keys(B.takes).length;
  B.esc = (s) => String(s || '').replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
  B.kindWords = (l) => `Sentence ${l.n} · already in the course · second voice`;
})();
