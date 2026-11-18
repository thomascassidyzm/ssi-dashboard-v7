/*
 * unit-restart-set.cjs — which Popty units does a change actually touch?
 *
 * Job #96 (Tom, 2026-11-02: "Yes to both second waves" — the "Restart-free by
 * construction" proposal). Before this, auto-deploy-prod.cjs answered one
 * boolean for all three units, so a course-builder-only change restarted the
 * production API and dropped every recordist and proofreader session for
 * nothing. Now each unit's require graph is DERIVED from its own entry point
 * (plus tools/check-service-syntax.cjs, which every unit runs in ExecStartPre)
 * and a unit restarts only when a changed file is in that graph.
 *
 * THE RULE THAT MUST HOLD: narrowing only ever happens on PROOF. The worst
 * outcome here is a unit left running old code while the deploy marker says
 * it is current — far worse than a needless restart. So every doubt is a
 * restart of EVERY unit (the #255 rule that an unknown path errs toward
 * restarting), specifically:
 *   - a changed file no unit's graph holds and no unit's code even names
 *     (by basename or by any ancestor directory) is UNPLACEABLE → restart all;
 *     this covers deleted/renamed files (the new tree cannot place them) and
 *     files read by a path the walk cannot see;
 *   - a file a unit's code names but does not require (readFileSync of a root
 *     doc, prompts/, docs/pair-contracts, a forked script) restarts THAT unit;
 *   - a unit whose walk met a require it could not resolve (require(someVar))
 *     is INCOMPLETE and is never spared on anything;
 *   - package.json, the lockfile, env files and ops/systemd change everything.
 *
 * Shape copied from command-surface/restart-need.js (job #127): pure
 * classification with an injected reader, derived not listed, doubt = restart.
 * Not imported across repos on purpose.
 */
const path = require('path');

const JS = /\.(c|m)?js$/;
// Changes that alter the process environment of every unit, not just code.
const EVERYTHING = [
  /(^|\/)(package\.json|package-lock\.json|pnpm-lock\.yaml|npm-shrinkwrap\.json|\.npmrc|\.nvmrc)$/,
  /^\.env(\.|$)/,
  /^ops\/systemd\//,
  /^ops\/launchd\//,
];

// Comments are deliberately NOT stripped before the walk. A regex stripper
// swallowed real code in production-api.cjs (a `/*` inside a string or regex
// ate everything up to the next `*/`, and with it the recordist-router
// require — found by the replay, 2026-11-02). A require in a comment only
// adds a file to the set, which is the safe direction; a stripper that drops
// a real require is the unsafe one.

/**
 * Every require(...) / require.resolve(...) / import(...) in src, with its full
 * argument text (parens balanced, so `require(path.join(__dirname, '../x'))`
 * is one call, not a truncated one).
 */
function requireArgs (src) {
  const out = [];
  const re = /\b(?:require(?:\.resolve)?|import)\s*\(/g;
  let m;
  while ((m = re.exec(src))) {
    let depth = 1, i = re.lastIndex;
    for (; i < src.length && depth; i++) {
      if (src[i] === '(') depth++;
      else if (src[i] === ')') depth--;
    }
    if (depth) break;
    out.push(src.slice(re.lastIndex, i - 1).trim());
    re.lastIndex = i;
  }
  return out;
}

/**
 * Turn one require argument into candidate specs. A plain literal is itself.
 * `path.join(__dirname|ROOT|…, 'lit', 'lit')` becomes the joined literals; a
 * template with `${}` becomes a directory prefix (everything under it is
 * loaded). Returns { specs:[{spec, prefix}], resolvable } — resolvable:false
 * means nothing path-like could be read out of it (require(someVar)).
 */
function specsOf (arg) {
  // require() / require(...) in prose: no identifier, nothing it could load.
  if (!/[\w$]/.test(arg)) return { specs: [], resolvable: true };
  const lit = /^(["'])([^"'`$]*)\1$/.exec(arg);
  if (lit) return { specs: [{ spec: lit[2] }], resolvable: true, literal: true };
  const tpl = /^`([^`]*)`$/.exec(arg);
  if (tpl) {
    const i = tpl[1].indexOf('${');
    if (i < 0) return { specs: [{ spec: tpl[1] }], resolvable: true };
    const prefix = tpl[1].slice(0, i);
    return prefix.includes('/') ? { specs: [{ spec: prefix.slice(0, prefix.lastIndexOf('/') + 1), prefix: true }], resolvable: true } : { specs: [], resolvable: false };
  }
  // path.join(...)/path.resolve(...): the string literals inside, joined.
  const lits = [...arg.matchAll(/(["'])([^"'`$]*)\1/g)].map((x) => x[2]);
  if (!lits.length) return { specs: [], resolvable: false };
  const joined = lits.join('/').replace(/\/+/g, '/');
  return { specs: [{ spec: joined }], resolvable: true };
}

function resolveSpec (from, spec, exists, isDir, literal = true) {
  if (!spec) return null;
  if (literal && !spec.includes('/') && !spec.startsWith('.')) return null;   // builtin / bare package
  if (/^[a-z@][\w.-]*\//i.test(spec) && !exists(spec) && !isDir(spec)) {
    // 'tools/x.cjs' joined from a repo root constant: try from the repo root
    const roots = [spec];
    for (const c of roots) { const r = tryFile(c, exists); if (r) return r; }
    return null;
  }
  // a joined `path.join(__dirname, 'vad.cjs')` is relative to the file; a
  // joined `path.join(ROOT, 'tools/x.cjs')` is relative to the repo root —
  // try both, the file's own directory first
  const bases = spec.startsWith('.') ? [path.posix.normalize(path.posix.join(path.posix.dirname(from), spec))]
    : [path.posix.normalize(path.posix.join(path.posix.dirname(from), spec)), spec];
  for (const b of bases) { const r = tryFile(b, exists); if (r) return r; }
  return null;
}

function tryFile (base, exists) {
  for (const c of [base, base + '.js', base + '.cjs', base + '.mjs', base + '.json', base + '/index.js', base + '/index.cjs'])
    if (exists(c)) return c;
  return null;
}

/**
 * graphOf({ readFile(rel)→string|null, listDir(rel)→[rel files]|null, entries })
 *  → { loaded:Set<rel>, text:string, unresolved:[{file,arg}] }
 */
function graphOf ({ readFile, listDir = () => null, entries }) {
  const exists = (rel) => readFile(rel) != null;
  const isDir = (rel) => listDir(rel) != null;
  const loaded = new Set(), unresolved = [], texts = [];
  const queue = [...entries];
  while (queue.length) {
    const f = queue.shift();
    if (loaded.has(f)) continue;
    const src = readFile(f);
    if (src == null) { unresolved.push({ file: f, arg: '(entry missing)' }); continue; }
    loaded.add(f);
    texts.push(src);
    if (!JS.test(f)) continue;                      // a required .json is a leaf
    for (const arg of requireArgs(src)) {
      const { specs, resolvable, literal } = specsOf(arg);
      if (!resolvable) { unresolved.push({ file: f, arg: arg.slice(0, 60) }); continue; }
      for (const { spec, prefix } of specs) {
        if (prefix) {
          const dir = spec.startsWith('.') ? path.posix.normalize(path.posix.join(path.posix.dirname(f), spec)) : spec;
          const files = listDir(dir);
          if (!files) { unresolved.push({ file: f, arg: arg.slice(0, 60) }); continue; }
          for (const x of files) queue.push(x);
          continue;
        }
        const r = resolveSpec(f, spec, exists, isDir, literal === true);
        if (r) queue.push(r);
        // a bare package name in a plain literal is node_modules (covered by the
        // lockfile rule); anything else that fails to resolve — a relative path
        // that is not there, or a path.join(VAR, 'x.cjs') whose literal part
        // alone names no file — leaves the walk incomplete.
        // A plain literal that names no file cannot load one either (it is a
        // doc-comment example like require('./services/shared/logger.cjs'),
        // or would throw at runtime) — so only a NON-literal that fails to
        // resolve leaves the walk incomplete.
        else if (!literal) unresolved.push({ file: f, arg: `${arg.slice(0, 60)} (unresolved)` });
      }
    }
  }
  return { loaded, text: texts.join('\n'), unresolved };
}

/** Does this unit's code name the file — by basename or any ancestor dir? */
function mentions (graph, f) {
  const names = [path.posix.basename(f)];
  const parts = f.split('/');
  for (let i = parts.length - 1; i > 0; i--) names.push(parts.slice(0, i).join('/'));
  return names.some((n) => graph.text.includes(n));
}

/**
 * unitsFor(changedLive, graphs) — changedLive: paths already past the static
 * allowlist; graphs: { unitName: graph }. → { units:[names], reasons:[string] }
 * `units` is EVERY unit whenever anything is in doubt.
 */
function unitsFor (changedLive, graphs) {
  const all = Object.keys(graphs);
  const units = new Set(), reasons = [];
  const restartAll = (why) => { for (const u of all) units.add(u); reasons.push(why); };
  for (const [u, g] of Object.entries(graphs)) {
    if (g.unresolved.length) { units.add(u); reasons.push(`${u}: unfollowable require in ${g.unresolved[0].file} (${g.unresolved[0].arg}) — never spared`); }
  }
  for (const f of changedLive) {
    if (EVERYTHING.some((re) => re.test(f))) { restartAll(`${f} changes every unit's environment`); continue; }
    const holders = all.filter((u) => graphs[u].loaded.has(f));
    if (holders.length) {
      // a unit that does not require the file but names it (reads or forks
      // it by path) is touched too — union, never "the graph alone"
      const byName = all.filter((u) => !holders.includes(u) && graphs[u].text.includes(path.posix.basename(f)));
      for (const u of [...holders, ...byName]) units.add(u);
      reasons.push(`${f} loaded by ${holders.join(', ')}${byName.length ? `, named by ${byName.join(', ')}` : ''}`);
      continue;
    }
    const namers = all.filter((u) => mentions(graphs[u], f));
    if (namers.length) { for (const u of namers) units.add(u); reasons.push(`${f} named by ${namers.join(', ')} (read or forked by path)`); continue; }
    restartAll(`${f} cannot be placed in any unit's graph — restarting all to be safe`);
  }
  return { units: all.filter((u) => units.has(u)), reasons };
}

module.exports = { graphOf, unitsFor, requireArgs, specsOf, mentions, EVERYTHING };
