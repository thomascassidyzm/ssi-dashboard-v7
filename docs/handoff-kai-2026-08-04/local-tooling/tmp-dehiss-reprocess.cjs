/*
 * Floor-gated xAI de-hiss reprocess. For each xAI audio row: download, MEASURE
 * the noise floor, and only de-hiss (afftdn) if it is actually hissy (> -75dB).
 * Clean clips are skipped (idempotent — safe to re-run, never double-denoises).
 * Reversible: writes a NEW s3_key (old object kept) and logs old->new to a jsonl;
 * only course_audio.s3_key changes (minimal-payload guardrail).
 *
 * Scope: eng_for_* (post-07-29 only; pre are already clean) + zho_for_tam,
 * kor_for_hin, kor_for_tam (all). Excludes mar + zho_for_hin (already clean).
 * Resumable via the done-log. Rollback: --rollback <log.jsonl>.
 */
require("dotenv").config({ quiet: true });
const os = require("os"), path = require("path"), fs = require("fs");
const { execFile } = require("child_process");
const { promisify } = require("util");
const execFileP = promisify(execFile);
const sb = require("/Users/kaisaraceno/Documents/GitHub/ssi-dashboard-v7/services/supabase-client.cjs").getClient();
const { ffmpegFilterToLameMp3 } = require("/Users/kaisaraceno/Documents/GitHub/ssi-dashboard-v7/services/audio-processor.cjs");
const { S3Client, GetObjectCommand, PutObjectCommand } = require("@aws-sdk/client-s3");
const { v4: uuidv4 } = require("uuid");
const s3 = new S3Client({ region: process.env.AWS_REGION || "eu-west-1" });
const BUCKET = process.env.S3_BUCKET || "ssi-audio-stage";

const CUTOFF = "2026-07-29T13:32:00Z";
const DENOISE = "afftdn=nf=-25:nt=w";
const HISS_THRESHOLD = -75; // RMS trough above this = hiss bed present
const WORKERS = 20;
const XAISET = new Set(["eve", "ara", "leo", "rex", "sal", "bedd6226", "gfzdpspr5fdp"]);
const isXai = v => /^xai_/i.test(v || "") || XAISET.has((v || "").toLowerCase());

const LOG = "/Users/kaisaraceno/Documents/GitHub/ssi-dashboard-v7/scripts/dehiss-done-log.jsonl";
const COURSES = [
  // dateFilter:false everywhere now — floor gate + done-log make it safe & idempotent.
  // Excludes eng_for_mar + zho_for_hin (verified clean). Post rows already in done-log → skipped.
  ...["hin", "ben", "kan", "tel", "guj", "pan", "urd", "sin", "tam"].map(x => ({ cc: `eng_for_${x}`, dateFilter: false })),
  { cc: "zho_for_tam", dateFilter: false }, { cc: "kor_for_hin", dateFilter: false }, { cc: "kor_for_tam", dateFilter: false },
];

async function dl(key, f) {
  const r = await s3.send(new GetObjectCommand({ Bucket: BUCKET, Key: key }));
  await new Promise((res, rej) => { const w = fs.createWriteStream(f); r.Body.pipe(w); r.Body.on("error", rej); w.on("finish", res); });
}
async function floorDb(f) {
  const { stderr } = await execFileP("ffmpeg", ["-i", f, "-af", "astats=metadata=1:reset=0", "-f", "null", "-"], { maxBuffer: 1 << 25 }).catch(e => ({ stderr: e.stderr || "" }));
  const m = stderr.match(/RMS trough dB:\s*(-?[\d.]+|inf)/i);
  return m && m[1] !== "inf" ? parseFloat(m[1]) : null;
}

// ---- rollback ----
if (process.argv[2] === "--rollback") {
  (async () => {
    const lines = fs.readFileSync(process.argv[3], "utf8").trim().split("\n").filter(Boolean).map(JSON.parse).filter(r => r.action === "dehissed");
    console.log(`Rolling back ${lines.length} rows to old s3_key...`);
    let n = 0;
    for (const r of lines) { const { error } = await sb.from("course_audio").update({ s3_key: r.oldKey }).eq("id", r.id); if (!error) n++; }
    console.log(`Rolled back ${n}.`); process.exit(0);
  })();
} else {
  (async () => {
    const done = new Set();
    if (fs.existsSync(LOG)) for (const l of fs.readFileSync(LOG, "utf8").trim().split("\n").filter(Boolean)) { try { done.add(JSON.parse(l).id); } catch {} }
    const logStream = fs.createWriteStream(LOG, { flags: "a" });
    const DRY = process.argv.includes("--dry-run");
    const LIMIT = (process.argv.find(a => a.startsWith("--limit=")) || "").split("=")[1];

    // gather rows
    let rows = [];
    for (const { cc, dateFilter } of COURSES) {
      let from = 0;
      while (true) {
        let q = sb.from("course_audio").select("id,course_code,voice_id,s3_key,created_at").eq("course_code", cc);
        if (dateFilter) q = q.gte("created_at", CUTOFF);
        const { data } = await q.range(from, from + 999);
        if (!data || !data.length) break;
        for (const r of data) if (r.s3_key && isXai(r.voice_id) && !done.has(r.id)) rows.push(r);
        if (data.length < 1000) break; from += 1000;
      }
    }
    if (LIMIT) rows = rows.slice(0, parseInt(LIMIT, 10));
    console.log(`[dehiss] ${rows.length} candidate xAI rows (dry=${DRY}, workers=${WORKERS}). Threshold ${HISS_THRESHOLD}dB.`);

    const tmp = await fs.promises.mkdtemp(path.join(os.tmpdir(), "dh-"));
    const stats = { dehissed: 0, clean: 0, err: 0 };
    let cursor = 0;
    const worker = async (wid) => {
      while (true) {
        const i = cursor++; if (i >= rows.length) return;
        const r = rows[i];
        const fin = path.join(tmp, `in-${wid}.mp3`), fout = path.join(tmp, `out-${wid}.mp3`);
        try {
          await dl(r.s3_key, fin);
          const fl = await floorDb(fin);
          if (fl == null || fl <= HISS_THRESHOLD) { stats.clean++; logStream.write(JSON.stringify({ id: r.id, action: "skip-clean", floorDb: fl }) + "\n"); continue; }
          if (DRY) { stats.dehissed++; logStream.write(JSON.stringify({ id: r.id, action: "would-dehiss", floorDb: fl }) + "\n"); continue; }
          await ffmpegFilterToLameMp3(fin, fout, { filterChain: DENOISE, bitrate: 96, sampleRate: 48000, channels: 1, quality: 2 });
          const newKey = `mastered/${uuidv4().toUpperCase()}.mp3`;
          await s3.send(new PutObjectCommand({ Bucket: BUCKET, Key: newKey, Body: fs.readFileSync(fout), ContentType: "audio/mpeg" }));
          const { error } = await sb.from("course_audio").update({ s3_key: newKey }).eq("id", r.id);
          if (error) throw error;
          stats.dehissed++;
          logStream.write(JSON.stringify({ id: r.id, course: r.course_code, action: "dehissed", oldKey: r.s3_key, newKey, floorDb: fl }) + "\n");
        } catch (e) { stats.err++; logStream.write(JSON.stringify({ id: r.id, action: "error", error: e.message }) + "\n"); }
        if ((stats.dehissed + stats.clean + stats.err) % 500 === 0) console.log(`  progress: dehissed=${stats.dehissed} clean=${stats.clean} err=${stats.err} / ${rows.length}`);
      }
    };
    await Promise.all(Array.from({ length: WORKERS }, (_, i) => worker(i)));
    console.log(`[dehiss] DONE: dehissed=${stats.dehissed} clean-skipped=${stats.clean} err=${stats.err}`);
    process.exit(0);
  })();
}
