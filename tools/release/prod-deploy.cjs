#!/usr/bin/env node
// prod-deploy.cjs — the ONLY thing that starts a popty.app production build (cs #537, Tom 26 Nov: "259????!!!!! that's
// too many - it's screwing us"; r-2026-11-26-vercel-prod-builds-happen-only-when).
//
// WHY. The cs #948 ignore step already refused every main push that was not [release]/[hotfix], but Vercel still CREATED
// a deployment for each push, cloned the repo and ran the ignore command: 250 of 264 production deployments in the 7 days
// to 26 Nov were those CANCELED skips, and Vercel bills a canceled ignore-step deployment as a build. So git pushes no
// longer create deployments at all (vercel.json git.deploymentEnabled.main = false — NOT the project setting
// gitProviderOptions.createDeployments, which only governs GitHub deployment records), and this script,
// on a 10-minute timer, builds the newest [release]/[hotfix] commit on main through the API — once. Bursts batch for free:
// five [hotfix] pushes inside one tick are ONE build of the newest of them (it contains the rest).
//
// The commit-subject contract is unchanged for workers: START the subject with [hotfix] (or [release]) and popty.app
// builds it within ~10 minutes. The ignore step stays on the project as a second lock (an API deployment of a marker
// commit passes it).
//
// Usage: node tools/release/prod-deploy.cjs [--dry-run] [--force <sha>]
//   --force <sha>  build that exact main commit even if already deployed (a proof run / a redeploy)
// Exit 0 nothing to do or build started · 1 failed (the unit shows failed; the next tick tries again)
"use strict";
const fs = require("fs");
const os = require("os");
const path = require("path");
const https = require("https");
const { execFileSync } = require("child_process");

const TEAM = "team_XcEJhX2yjHfaRczroR0QOOdf";
const PROJECT = "prj_FUHJ5A3KZjnJqIBIpk1syH6ttHPY"; // ssi-dashboard-v7 → popty.app
const NAME = "ssi-dashboard-v7";
const REPO_ID = 1073369067;
const REMOTE = "https://github.com/thomascassidyzm/ssi-dashboard-v7.git";
const CLONE = process.env.POPTY_DEPLOY_CLONE || path.join(os.homedir(), ".cs-builds", "popty-prod-deploy");
const MARKER = /^\[(release|hotfix)\]/;

const args = process.argv.slice(2);
const DRY = args.includes("--dry-run");
const FORCE = args.includes("--force") ? args[args.indexOf("--force") + 1] : null;

function token() {
  const txt = fs.readFileSync(path.join(os.homedir(), ".secrets", "vercel.env"), "utf8");
  const m = txt.match(/^(?:export\s+)?VERCEL_TOKEN=["']?([^"'\s]+)/m);
  if (!m) throw new Error("no VERCEL_TOKEN in ~/.secrets/vercel.env");
  return m[1];
}
function api(method, p, body) {
  const data = body ? JSON.stringify(body) : null;
  return new Promise((resolve, reject) => {
    const req = https.request({ host: "api.vercel.com", path: p, method,
      headers: { Authorization: "Bearer " + token(), ...(data ? { "Content-Type": "application/json", "Content-Length": Buffer.byteLength(data) } : {}) } }, (res) => {
      let d = ""; res.on("data", (c) => (d += c));
      res.on("end", () => { let j; try { j = JSON.parse(d); } catch { j = { raw: d }; }
        res.statusCode >= 300 ? reject(new Error(`Vercel ${method} ${p.split("?")[0]} → ${res.statusCode} ${JSON.stringify(j.error || j).slice(0, 200)}`)) : resolve(j); });
    });
    req.on("error", reject); if (data) req.write(data); req.end();
  });
}
const git = (a) => execFileSync("git", a, { cwd: CLONE, encoding: "utf8" }).trim();
const isAncestor = (a, b) => { try { execFileSync("git", ["merge-base", "--is-ancestor", a, b], { cwd: CLONE }); return true; } catch { return false; } };

// The decision, kept pure: build `marker` unless a live-or-coming production deployment already contains it.
// A deployment of the marker that ERRORed counts as handled — the fix is the next [hotfix], not a rebuild loop.
function decide(marker, deployments, contains) {
  if (!marker) return { build: false, why: "no [release]/[hotfix] commit on main" };
  for (const d of deployments) {
    const sha = d.meta && d.meta.githubCommitSha; if (!sha) continue;
    if (sha === marker) return { build: false, why: `${marker.slice(0, 9)} already has production deployment ${d.uid} (${d.state})` };
    if (/^(READY|BUILDING|QUEUED|INITIALIZING)$/.test(d.state) && contains(sha, marker))
      return { build: false, why: `${marker.slice(0, 9)} is contained in production deployment ${d.uid} of ${sha.slice(0, 9)} (${d.state})` };
  }
  return { build: true, why: `newest marker ${marker.slice(0, 9)} has no production deployment` };
}

async function main() {
  if (!fs.existsSync(path.join(CLONE, ".git"))) execFileSync("git", ["clone", "-q", "--depth", "300", "--branch", "main", REMOTE, CLONE]);
  git(["fetch", "-q", "--depth", "300", "origin", "main"]);
  let sha = FORCE, subject = "";
  if (FORCE) { subject = git(["log", "-1", "--format=%s", FORCE]); }
  else {
    const line = git(["log", "--format=%H %s", "FETCH_HEAD"]).split("\n").find((l) => MARKER.test(l.slice(41)));
    sha = line ? line.slice(0, 40) : null; subject = line ? line.slice(41) : "";
    const list = await api("GET", `/v6/deployments?teamId=${TEAM}&projectId=${PROJECT}&target=production&limit=20`);
    const deps = (list.deployments || []).filter((d) => d.state !== "CANCELED");
    const v = decide(sha, deps, (desc, anc) => isAncestor(anc, desc));
    if (!v.build) { console.log(`popty-prod-deploy: ${v.why} — no build`); return; }
    console.log(`popty-prod-deploy: ${v.why}`);
  }
  if (DRY) { console.log(`popty-prod-deploy: DRY RUN — would build ${sha.slice(0, 9)} "${subject.slice(0, 80)}"`); return; }
  const d = await api("POST", `/v13/deployments?teamId=${TEAM}`, {
    name: NAME, project: PROJECT, target: "production",
    gitSource: { type: "github", repoId: REPO_ID, ref: "main", sha },
  });
  console.log(`popty-prod-deploy: started production build ${d.id} of ${sha.slice(0, 9)} "${subject.slice(0, 80)}"`);
}
module.exports = { decide, MARKER };
if (require.main === module) main().catch((e) => { console.error(`popty-prod-deploy: FAILED ${e.message}`); process.exit(1); });
