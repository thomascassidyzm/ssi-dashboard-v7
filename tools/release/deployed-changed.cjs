#!/usr/bin/env node
// deployed-changed.cjs — did anything popty.app actually SHIPS change between two commits? (cs #476·AJ)
//
// WHY. Before the cs #948 gate, 114 production builds in 7 days; most of those pushes touched only ops/, docs/,
// tools/ and services/ that run on watson-1 and never reach Vercel. The weekly [release] then still fired whenever
// main had MOVED, so an ops-only week still cost a build. This answers the narrower question: did the DEPLOYED app
// change? weekly-release.sh skips the release when it did not.
//
// WHAT COUNTS AS DEPLOYED (read from the repo itself, at both commits, so it never goes stale):
//   • whole trees the build or Vercel functions ship: src/ public/ api/ lib/
//   • the build's own inputs: index.html, package.json, package-lock.json, vercel.json, .vercelignore,
//     vite/tailwind/postcss config
//   • the TRANSITIVE closure of relative imports (require / import / import() / export-from, plus the '@/' alias)
//     from every file above into the rest of the repo — e.g. api/ → services/shared/*.cjs, vite.config.js →
//     services/voice-engine/sample-gate.cjs. Bare (npm) specifiers are covered by the package files.
// Dynamic requires with a computed path cannot be seen; that is what a [hotfix] commit is for.
//
// Usage: node tools/release/deployed-changed.cjs <from-rev> [<to-rev>=HEAD] [--list]
// Exit:  0 deployed files changed (prints them) · 1 nothing deployed changed · 2 error (callers treat as changed)
"use strict";
const { execFileSync } = require("child_process");
const path = require("path");

const ROOT_TREES = ["src/", "public/", "api/", "lib/"];
const ROOT_FILES = ["index.html", "package.json", "package-lock.json", "vercel.json", ".vercelignore",
  "vite.config.js", "vite.config.mjs", "vite.config.ts", "tailwind.config.js", "postcss.config.js"];
const CODE = /\.(c|m)?(j|t)sx?$|\.vue$/;
const EXT = ["", ".js", ".cjs", ".mjs", ".ts", ".vue", ".json", "/index.js", "/index.cjs", "/index.ts"];
const IMPORT = /(?:require\s*\(|import\s*\(|\bfrom\s+|^\s*import\s+)\s*['"`]([^'"`]+)['"`]/gm;

const git = (args, opts = {}) => execFileSync("git", args, { encoding: "utf8", maxBuffer: 1 << 28, ...opts });

function readAll(rev, files) {
  // one `git cat-file --batch` for every file, instead of one process each
  const input = files.map((f) => `${rev}:${f}`).join("\n") + "\n";
  const buf = execFileSync("git", ["cat-file", "--batch"], { input, maxBuffer: 1 << 30 });
  const out = new Map(); let i = 0;
  for (const f of files) {
    const nl = buf.indexOf(10, i); const head = buf.slice(i, nl).toString(); i = nl + 1;
    if (head.endsWith(" missing")) continue;
    const size = Number(head.split(" ")[2]); out.set(f, buf.slice(i, i + size).toString("utf8")); i += size + 1;
  }
  return out;
}

function deployedSet(rev) {
  const all = git(["ls-tree", "-r", "--name-only", rev]).split("\n").filter(Boolean);
  const exists = new Set(all);
  const set = new Set(all.filter((f) => ROOT_TREES.some((t) => f.startsWith(t)) || ROOT_FILES.includes(f)));
  const code = all.filter((f) => CODE.test(f) && !f.includes("node_modules/"));
  const text = readAll(rev, code);
  const queue = [...set].filter((f) => text.has(f));
  while (queue.length) {
    const f = queue.pop();
    for (const m of text.get(f).matchAll(IMPORT)) {
      let spec = m[1];
      if (spec.startsWith("@/")) spec = "src/" + spec.slice(2);
      else if (spec.startsWith(".")) spec = path.posix.normalize(path.posix.join(path.posix.dirname(f), spec));
      else continue;
      spec = spec.split("?")[0];
      const hit = EXT.map((e) => spec + e).find((c) => exists.has(c));
      if (hit && !set.has(hit)) { set.add(hit); if (text.has(hit)) queue.push(hit); }
    }
  }
  return set;
}

function main() {
  const args = process.argv.slice(2).filter((a) => !a.startsWith("--"));
  const list = process.argv.includes("--list");
  const [from, to = "HEAD"] = args;
  if (!from) { console.error("usage: deployed-changed.cjs <from-rev> [<to-rev>] [--list]"); process.exit(2); }
  const changed = git(["diff", "--name-only", "--no-renames", from, to]).split("\n").filter(Boolean);
  const deployed = new Set([...deployedSet(from), ...deployedSet(to)]);
  const hits = changed.filter((f) => deployed.has(f));
  if (list || hits.length) for (const f of hits) console.log(f);
  console.error(`deployed-changed: ${hits.length} of ${changed.length} changed files are deployed (${from.slice(0, 9)}..${to.slice(0, 9)})`);
  process.exit(hits.length ? 0 : 1);
}
try { main(); } catch (e) { console.error(`deployed-changed: ERROR ${e.message}`); process.exit(2); }
