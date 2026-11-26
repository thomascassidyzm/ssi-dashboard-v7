#!/usr/bin/env node
// prod-deploy.cjs — the ONLY thing that ships popty.app production (cs #537).
//
// WHY. 259 production deployments in the 7 days to 26 Nov (Tom: "259????!!!!! that's too many - it's screwing us").
// 250 were ignore-step skips Vercel still bills; the rest were Vercel builds. Tom, 26 Nov: "popty will have to build
// locally too - perhaps on a schedule, to not choke the machines". So:
//   • git pushes create NO Vercel deployment (vercel.json git.deploymentEnabled.main = false);
//   • this script builds origin/main HERE, on watson-1 (`vercel build --prod`), and uploads the output prebuilt
//     (`vercel deploy --prebuilt --prod`) — Vercel runs no build and bills no build minutes;
//   • it ships only when a file popty.app actually SHIPS changed since the live commit (tools/release/deployed-changed.cjs),
//   • at most once an hour on the timer (TICK), unless the newest unshipped commits include a [hotfix]/[release]
//     subject — that is a worker's "ship now", honoured on the next 10-minute tick;
//   • `--now` (popty-prod-ship-now.service) is Tom's / a worker's manual ship-now: no hour floor.
// The unit runs at Nice 19, idle IO, CPUWeight 10, MemoryMax 7G (ops/systemd/popty-prod-deploy.service), so a build
// never chokes the box; both units share one flock, so two builds never run at once.
//
// Usage: node tools/release/prod-deploy.cjs [--now] [--force] [--dry-run] [--build-only]
//   --now         ignore the one-an-hour floor          --force   build even if nothing deployable changed
//   --dry-run     decide and say, build nothing         --build-only  build, upload nothing
// Exit 0 shipped or nothing to do · 1 failed (a failed build is not retried until main moves)
"use strict";
const fs = require("fs");
const os = require("os");
const path = require("path");
const { execFileSync } = require("child_process");

const TEAM = "team_XcEJhX2yjHfaRczroR0QOOdf";
const PROJECT = "prj_FUHJ5A3KZjnJqIBIpk1syH6ttHPY"; // ssi-dashboard-v7 → popty.app
const DOMAIN = "popty.app";
const REMOTE = "https://github.com/thomascassidyzm/ssi-dashboard-v7.git";
const HOME = os.homedir();
const CLONE = process.env.POPTY_DEPLOY_CLONE || path.join(HOME, ".cs-builds", "popty-prod-prebuilt");
const CACHE = path.join(HOME, ".cache", "cs-prebuilt"); // shared with the Zenjin/SSi prebuilt routes: node + vercel CLI
const STATE = path.join(HOME, ".local", "state", "watson-builds");
const FAILED = path.join(STATE, "popty-prod-failed.sha");
const HOUR_FLOOR_MS = 55 * 60e3; // "hourly": a 10-min tick, and at most one ship per ~hour
const MARKER = /^\[(release|hotfix)\]/;

const flags = new Set(process.argv.slice(2));
const NOW = flags.has("--now"), FORCE = flags.has("--force"), DRY = flags.has("--dry-run"), BUILD_ONLY = flags.has("--build-only");
const log = (m) => console.log(`popty-prod-deploy: ${m}`);
const TOKEN = () => fs.readFileSync(path.join(HOME, ".secrets", "vercel.env"), "utf8").match(/^(?:export\s+)?VERCEL_TOKEN=["']?([^"'\s]+)/m)[1];
const api = async (p) => (await fetch(`https://api.vercel.com${p}${p.includes("?") ? "&" : "?"}teamId=${TEAM}`, { headers: { Authorization: `Bearer ${TOKEN()}` } })).json();
const sh = (cmd, args, opts = {}) => execFileSync(cmd, args, { encoding: "utf8", stdio: ["ignore", "pipe", "inherit"], ...opts }).trim();
const git = (args) => sh("git", args, { cwd: CLONE });

// The decision, kept pure so it can be read in one place.
//   live: { sha, createdMs } of what popty.app serves; head: origin/main sha; changed: 0 deployable files changed,
//   1 none changed, 2 could not tell (treated as changed); marked: a [hotfix]/[release] subject in live..head.
function decide({ live, head, changed, marked, failedSha, nowMs, now, force }) {
  if (head === failedSha && !force) return { ship: false, why: `${head.slice(0, 9)} failed to build last time; waiting for main to move` };
  if (live && live.sha === head && !force) return { ship: false, why: `${DOMAIN} already serves ${head.slice(0, 9)}` };
  if (changed === 1 && !force) return { ship: false, why: `main moved to ${head.slice(0, 9)} but nothing ${DOMAIN} ships changed since ${live.sha.slice(0, 9)}` };
  const age = live ? nowMs - live.createdMs : Infinity;
  if (!now && !marked && !force && age < HOUR_FLOOR_MS)
    return { ship: false, why: `deployable change waiting; last ship ${Math.round(age / 60e3)} min ago, next within the hour (ship now: systemctl --user start popty-prod-ship-now)` };
  return { ship: true, why: `${changed === 0 ? "deployable files changed" : changed === 2 ? "could not tell what changed" : "forced"} ${live ? live.sha.slice(0, 9) : "?"}..${head.slice(0, 9)}${marked ? " (hotfix marker)" : now ? " (ship now)" : ""}` };
}

async function liveDeployment() {
  const alias = await api(`/v4/aliases/${DOMAIN}`);
  if (!alias.deploymentId) return null;
  const d = await api(`/v13/deployments/${alias.deploymentId}`);
  return { id: d.id, sha: d.meta && d.meta.githubCommitSha, createdMs: d.createdAt || d.created, state: d.readyState };
}

function nodeBin() {
  const dir = path.join(CACHE, "node22");
  const found = fs.existsSync(dir) && fs.readdirSync(dir).find((d) => d.startsWith("node-v22") && !d.endsWith(".xz"));
  if (!found) throw new Error(`no node 22 in ${dir} (the Zenjin/SSi prebuilt routes fetch it; run one, or add it)`);
  return path.join(dir, found, "bin");
}

async function main() {
  fs.mkdirSync(STATE, { recursive: true });
  if (!fs.existsSync(path.join(CLONE, ".git"))) sh("git", ["clone", "-q", "--branch", "main", REMOTE, CLONE]);
  git(["fetch", "-q", "origin", "main"]);
  git(["reset", "-q", "--hard", "origin/main"]);
  git(["clean", "-qfdx", "-e", "node_modules", "-e", ".vercel/project.json"]);
  const head = git(["rev-parse", "HEAD"]);
  const live = await liveDeployment();
  let changed = 2, marked = false;
  if (live && live.sha) {
    try { execFileSync("git", ["cat-file", "-e", `${live.sha}^{commit}`], { cwd: CLONE }); } catch { git(["fetch", "-q", "origin", live.sha]); }
    try { execFileSync("node", ["tools/release/deployed-changed.cjs", live.sha, head], { cwd: CLONE, stdio: "ignore" }); changed = 0; }
    catch (e) { changed = e.status === 1 ? 1 : 2; }
    marked = git(["log", "--format=%s", `${live.sha}..${head}`]).split("\n").some((s) => MARKER.test(s));
  }
  const failedSha = fs.existsSync(FAILED) ? fs.readFileSync(FAILED, "utf8").trim() : "";
  const v = decide({ live, head, changed, marked, failedSha, nowMs: Date.now(), now: NOW, force: FORCE });
  log(v.why + (v.ship ? "" : " — no build"));
  if (!v.ship || DRY) return;

  const PATH = `${nodeBin()}:${process.env.PATH}`;
  const vercel = path.join(CACHE, "vercel-cli", "node_modules", ".bin", "vercel");
  if (!fs.existsSync(vercel)) throw new Error(`no vercel CLI at ${vercel}`);
  fs.mkdirSync(path.join(CLONE, ".vercel"), { recursive: true });
  fs.writeFileSync(path.join(CLONE, ".vercel", "project.json"), JSON.stringify({ orgId: TEAM, projectId: PROJECT }));
  const env = { ...process.env, PATH, VERCEL_TOKEN: TOKEN(), NODE_OPTIONS: "--max-old-space-size=6144" };
  const run = (args, stdio) => execFileSync(vercel, args, { cwd: CLONE, env, encoding: "utf8", stdio: stdio || ["ignore", "inherit", "inherit"] });
  const t0 = Date.now();
  try {
    run(["pull", "--yes", "--environment=production"]);
    run(["build", "--yes", "--prod"]);
  } catch (e) {
    fs.writeFileSync(FAILED, head + "\n");
    log(`BUILD FAILED at ${head.slice(0, 9)} — not retried until main moves (${FAILED})`);
    throw e;
  } finally {
    for (const f of fs.readdirSync(path.join(CLONE, ".vercel"))) if (f.startsWith(".env")) fs.rmSync(path.join(CLONE, ".vercel", f));
  }
  const built = Math.round((Date.now() - t0) / 1000);
  if (BUILD_ONLY) { log(`built ${head.slice(0, 9)} in ${built} s into ${CLONE}/.vercel/output; nothing uploaded`); return; }
  // Over the CLI's 15,000-file limit the output goes up as one archive.
  const files = Number(sh("bash", ["-c", "find .vercel/output -type f | wc -l"], { cwd: CLONE }));
  const subject = git(["log", "-1", "--format=%s", head]);
  const t1 = Date.now();
  run(["deploy", "--prebuilt", "--prod", "--yes", ...(files > 12000 ? ["--archive=tgz"] : []),
    "--meta", "githubCommitRef=main", "--meta", `githubCommitSha=${head}`, "--meta", `githubCommitMessage=${subject.slice(0, 200)}`, "--meta", "cs=popty-prod-deploy"],
  ["ignore", "pipe", "inherit"]);
  const now = await liveDeployment();
  const ok = now && now.state === "READY" && now.sha === head;
  log(`${head.slice(0, 9)} built in ${built} s (${files} files), uploaded in ${Math.round((Date.now() - t1) / 1000)} s; ${DOMAIN} → ${now && now.id} ${now && now.state} ${String(now && now.sha || "").slice(0, 9)}${ok ? "" : " — NOT this build"}`);
  if (!ok) process.exit(1);
}
module.exports = { decide, MARKER, HOUR_FLOOR_MS };
if (require.main === module) main().catch((e) => { console.error(`popty-prod-deploy: FAILED ${String(e && e.message || e).split("\n")[0]}`); process.exit(1); });
