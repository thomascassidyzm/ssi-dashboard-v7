/**
 * stage0-tuner/build-html.cjs — inline clips.json (base64 data URIs) into
 * template.html and emit the single self-contained tuner at ~/Desktop.
 * No network, no DB. Pure file assembly.
 */
const fs = require('fs');
const path = require('path');
const os = require('os');

const DIR = path.join(process.cwd(), 'scripts/experiments/stage0-tuner');
const template = fs.readFileSync(path.join(DIR, 'template.html'), 'utf8');
const clips = fs.readFileSync(path.join(DIR, 'clips.json'), 'utf8');

// The JSON sits inside a <script type="application/json"> block, so the only
// sequence we must neutralise is a literal "</script>" (none expected in
// base64/text, but be safe) — escape the slash.
const safe = clips.replace(/<\/script>/gi, '<\\/script>');

const html = template.replace('__CLIPS_JSON__', safe);

const out = path.join(os.homedir(), 'Desktop', 'stage0-tuner.html');
fs.writeFileSync(out, html);

const kb = (fs.statSync(out).size / 1024).toFixed(1);
console.log('wrote', out);
console.log('size', kb, 'KB');
console.log('clips inlined:', Object.keys(JSON.parse(clips).clips).length);
