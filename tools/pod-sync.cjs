#!/usr/bin/env node
/**
 * Pod sync — parse a listening-pod markdown file and upsert to
 * listening_pods + listening_pod_sentences.
 *
 * Handles both shapes currently in use:
 *   1. Pod 0 core (spanish-pods.md): scene → sentence, minimal frontmatter
 *   2. Discursive choice (spanish-podcast-music.md): segment → beat → sentence,
 *      host profiles + design notes → listening_pods.metadata
 *
 * Usage:
 *   node tools/pod-sync.cjs <markdown-file> --course=spa_for_eng --type=core --slug=pod-0
 *   node tools/pod-sync.cjs ~/Desktop/spanish-pods.md --course=spa_for_eng --type=core --slug=pod-0
 *   node tools/pod-sync.cjs ~/Desktop/spanish-podcast-music.md --course=spa_for_eng --type=choice --slug=music
 *   node tools/pod-sync.cjs <file> --dry-run   # parse + print summary, don't write
 *
 * Upsert semantics:
 *   - Pod row is upserted by (course_code, slug) — safe to re-run on edits.
 *   - Sentences are replaced wholesale per re-sync (DELETE then INSERT by pod_id).
 *     Audio IDs on course_audio survive because the sentences table has ON DELETE
 *     SET NULL on those FKs — but once sentences are re-inserted, audio links must
 *     be re-established by the Phase 8 pod-audio step (matches on text+role hash).
 */

require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

// ---------------------------------------------------------------------------
// Voice assignment
// ---------------------------------------------------------------------------
// Name-based heuristic: known female/male names get matched voices; unknown
// or generic names fall through to 'sal' (neutral). Each distinct speaker
// within a pod gets a stable assignment so the same speaker name always maps
// to the same voice. Overridable in the dashboard later.

const FEMALE_NAMES = new Set([
  'ana', 'elena', 'maría', 'maria', 'amiga', 'sofía', 'sofia', 'lucía', 'lucia',
  'marta', 'pilar', 'carmen', 'teresa', 'isabel', 'laura', 'clara', 'rosa',
  'vecina', 'camarera', 'receptionist', 'barista',
]);
const MALE_NAMES = new Set([
  'pablo', 'dani', 'javier', 'juan', 'carlos', 'miguel', 'jose', 'josé',
  'antonio', 'luis', 'manuel', 'francisco', 'david', 'sergio',
  'vecino', 'camarero', 'bartender', 'waiter', 'driver', 'pharmacist',
  'vendor', 'local', 'guest',
]);

const FEMALE_VOICE_POOL = ['eve', 'ara'];
const MALE_VOICE_POOL = ['leo', 'rex'];
const NEUTRAL_VOICE = 'sal';

function normaliseName(speaker) {
  return speaker.toLowerCase().replace(/\s*\([^)]*\)\s*/g, '').trim();
}

function assignVoices(speakers) {
  // speakers: array of unique speaker-name strings
  // returns: { [speaker_original_case]: { voice_id, provider, gender } }
  const assignments = {};
  let femaleIdx = 0;
  let maleIdx = 0;

  for (const speaker of speakers) {
    const clean = normaliseName(speaker);
    let voice_id, gender;
    if (FEMALE_NAMES.has(clean)) {
      voice_id = FEMALE_VOICE_POOL[femaleIdx % FEMALE_VOICE_POOL.length];
      femaleIdx++;
      gender = 'f';
    } else if (MALE_NAMES.has(clean)) {
      voice_id = MALE_VOICE_POOL[maleIdx % MALE_VOICE_POOL.length];
      maleIdx++;
      gender = 'm';
    } else {
      voice_id = NEUTRAL_VOICE;
      gender = 'n';
    }
    assignments[speaker] = { voice_id, provider: 'xai', gender };
  }

  // Always include a _default so the generator never chokes on an unmapped
  // speaker later (if markdown is edited to add a new speaker without re-sync).
  assignments._default = { voice_id: NEUTRAL_VOICE, provider: 'xai', gender: 'n' };
  return assignments;
}

// ---------------------------------------------------------------------------
// Markdown parsing
// ---------------------------------------------------------------------------

const RE_H1 = /^#\s+(.+?)\s*$/;
const RE_H2 = /^##\s+(.+?)\s*$/;
const RE_H3 = /^###\s+(.+?)\s*$/;
const RE_TABLE_ROW = /^\|\s*(\d+)\s*\|\s*(.+?)\s*\|\s*(.+?)\s*\|\s*(.+?)\s*\|\s*$/;
const RE_TABLE_HEADER = /^\|\s*#\s*\|/i;
const RE_TABLE_SEPARATOR = /^\|[\s-|]+\|\s*$/;

/**
 * Extract frontmatter (the narrative block above the first `---`) as text.
 * Also extracts labelled key:value-like lines into a dict for easy consumption.
 */
function extractFrontmatter(lines) {
  const frontmatter = { raw: '', fields: {} };
  let inside = false;
  let sawFirstHr = false;
  const collected = [];
  for (const line of lines) {
    if (line.trim() === '---') {
      if (sawFirstHr) break;
      sawFirstHr = true;
      continue;
    }
    if (line.match(RE_H1)) { inside = true; continue; }
    if (inside) collected.push(line);
  }
  frontmatter.raw = collected.join('\n').trim();

  // Pull labelled lines like "**Hosts**: Elena (...) + Dani (...)"
  for (const line of collected) {
    const m = line.match(/^\*\*([A-Za-z\s]+?)\*\*\s*[:：]\s*(.+?)\s*$/);
    if (m) {
      const key = m[1].trim().toLowerCase().replace(/\s+/g, '_');
      frontmatter.fields[key] = m[2].trim();
    }
  }
  return frontmatter;
}

/**
 * Parse hosts from a frontmatter `hosts` field of the form:
 *   "Elena (30s, journalist, reflective, analytical) + Dani (20s, enthusiast, pop-culture-fluent, emotional)"
 * Returns: [{ name: 'Elena', description: '...' }, ...]
 */
function parseHosts(hostsField) {
  if (!hostsField) return [];
  const hosts = [];
  // Split on " + " or " & " or ","
  const parts = hostsField.split(/\s*\+\s*|\s*&\s*/);
  for (const part of parts) {
    const m = part.trim().match(/^([^\(]+?)(?:\s*\(([^)]+)\))?\s*$/);
    if (m) {
      hosts.push({ name: m[1].trim(), description: (m[2] || '').trim() });
    }
  }
  return hosts;
}

/**
 * Parse H2 header into { scene_number, title, subtitle, raw_label }.
 * Accepts all three observed shapes:
 *   "## 1. Introductions — *Mucho gusto*"             (old Pod 0 numbered)
 *   "## Pod 0 · A Day of Greetings — *De la mañana...*" (Pod 0 labelled)
 *   "## Segment 1 · La música que nos marcó — *the music that shaped us*"
 */
function parseH2(text) {
  // Strip leading "Pod N · ", "Segment N · ", or "N. "
  let label = null;
  let body = text;

  const prefixLabel = text.match(/^(Pod|Segment|Scene|Cluster|Chapter|Part|Ep\.?|Episode)\s+(\S+)\s*·\s*(.+)$/i);
  const numberedDot = text.match(/^(\d+)\.\s+(.+)$/);

  if (prefixLabel) {
    label = prefixLabel[1] + ' ' + prefixLabel[2];
    body = prefixLabel[3];
  } else if (numberedDot) {
    label = numberedDot[1];
    body = numberedDot[2];
  }

  // Now body looks like "Title — *Subtitle*" (em dash + italics subtitle)
  const titleSubtitle = body.match(/^(.+?)\s+[—–-]\s*\*(.+?)\*\s*$/);
  if (titleSubtitle) {
    return { label, title: titleSubtitle[1].trim(), subtitle: titleSubtitle[2].trim() };
  }
  return { label, title: body.trim(), subtitle: null };
}

/**
 * Main parser. Returns a structured pod object.
 */
function parseMarkdown(markdown) {
  const lines = markdown.split('\n');

  // H1 title
  let podTitle = null;
  for (const line of lines) {
    const m = line.match(RE_H1);
    if (m) { podTitle = m[1].trim(); break; }
  }

  // Frontmatter
  const frontmatter = extractFrontmatter(lines);

  // Walk lines and build sections
  const sections = [];  // [{number, title, subtitle, label, beats: [{label, sentences: [...]}]}]
  let currentSection = null;
  let currentBeat = null;
  let sawFirstH2 = false;
  let globalOrder = 0;
  let sentenceNumInSection = 0;

  for (const line of lines) {
    const h2 = line.match(RE_H2);
    const h3 = line.match(RE_H3);
    const row = line.match(RE_TABLE_ROW);

    if (h2) {
      // ONLY treat an H2 as a real section if it matches the expected shape:
      //   "## N. Title ..." | "## Pod N ..." | "## Segment N ..."
      // Anything else (## Design notes, ## Segment counts, ## Outline, ## Total
      // wordcount & register summary, etc.) is meta and gets ignored.
      const text = h2[1].trim();
      const isSectionShape = /^(Segment|Pod|Scene|Ep\.?|Episode|Cluster|Chapter|Part)\s+\S+\s*[·:—–-]/i.test(text) ||
                             /^\d+\.\s+/.test(text);
      if (!isSectionShape) {
        currentSection = null;
        currentBeat = null;
        continue;
      }
      const parsed = parseH2(text);
      sawFirstH2 = true;
      sentenceNumInSection = 0;
      currentSection = {
        number: sections.length + 1,
        label: parsed.label,
        title: parsed.title,
        subtitle: parsed.subtitle,
        sentences: [],
      };
      sections.push(currentSection);
      currentBeat = null;
    } else if (h3 && currentSection) {
      // Could be a beat ("### Beat 1 — Opening *(1–4)*") or an outline bullet
      const text = h3[1].trim();
      if (/^beat\b/i.test(text) || /^[✦•*]/.test(text)) {
        currentBeat = text;
      } else {
        // Other H3 inside a section — treat as additional label only if it's
        // clearly part of content structure, otherwise ignore.
        currentBeat = text;
      }
    } else if (row && currentSection && !RE_TABLE_HEADER.test(line) && !RE_TABLE_SEPARATOR.test(line)) {
      const [, num, speakerRaw, targetRaw, knownRaw] = row;
      const speaker = speakerRaw.trim();
      // Skip "##" or "---" style table separators that match loosely
      if (!speaker || speaker === '#') continue;

      globalOrder++;
      sentenceNumInSection++;
      currentSection.sentences.push({
        sentence_number: sentenceNumInSection,
        global_order: globalOrder,
        speaker,
        target_text: targetRaw.trim(),
        known_text: knownRaw.trim(),
        beat_label: currentBeat,
      });
    }
  }

  // Build metadata JSONB from frontmatter
  const metadata = {};
  if (frontmatter.fields.hosts) {
    metadata.hosts = parseHosts(frontmatter.fields.hosts);
  }
  for (const key of ['register', 'format', 'target_size', 'status', 'design_notes', 'purpose']) {
    if (frontmatter.fields[key]) metadata[key] = frontmatter.fields[key];
  }
  if (frontmatter.raw) metadata._frontmatter_raw = frontmatter.raw;

  // Summarise sections into metadata.sections for outline preservation
  metadata.sections = sections.map(s => ({
    number: s.number,
    label: s.label,
    title: s.title,
    subtitle: s.subtitle,
    sentence_count: s.sentences.length,
  }));

  // Collect unique speakers across all sections
  const uniqueSpeakers = [];
  const seen = new Set();
  for (const s of sections) {
    for (const sent of s.sentences) {
      if (!seen.has(sent.speaker)) {
        seen.add(sent.speaker);
        uniqueSpeakers.push(sent.speaker);
      }
    }
  }

  return {
    pod_title: podTitle,
    metadata,
    sections,
    uniqueSpeakers,
    totalSentences: globalOrder,
  };
}

// ---------------------------------------------------------------------------
// DB upsert
// ---------------------------------------------------------------------------

async function syncPod(markdownPath, options) {
  const { courseCode, podType, slug, dryRun = false, verbose = false } = options;
  if (!fs.existsSync(markdownPath)) throw new Error(`File not found: ${markdownPath}`);

  const markdown = fs.readFileSync(markdownPath, 'utf8');
  const parsed = parseMarkdown(markdown);

  const podId = `${courseCode}:${slug}`;
  const speakers = assignVoices(parsed.uniqueSpeakers);

  console.log(`\n🎧 Pod Sync: ${markdownPath}`);
  console.log(`   Target:   ${podId}  (type=${podType})`);
  console.log(`   Title:    ${parsed.pod_title || '(none)'}`);
  console.log(`   Sections: ${parsed.sections.length}`);
  console.log(`   Sentences: ${parsed.totalSentences}`);
  console.log(`   Speakers: ${parsed.uniqueSpeakers.length} (${parsed.uniqueSpeakers.join(', ')})`);

  if (verbose) {
    console.log('\n   Voice assignments:');
    for (const [sp, v] of Object.entries(speakers)) {
      if (sp === '_default') continue;
      console.log(`     ${sp.padEnd(20)} → ${v.voice_id} (${v.gender})`);
    }
    console.log('\n   Sections:');
    for (const s of parsed.sections) {
      console.log(`     [${s.number}] ${s.label || '-'}  "${s.title}"  (${s.sentences.length} sentences)`);
    }
  }

  if (dryRun) {
    console.log('\n   (dry-run) no DB writes performed');
    return { parsed, speakers, podId };
  }

  // 1. Upsert the pod
  const podRow = {
    id: podId,
    course_code: courseCode,
    pod_type: podType,
    slug,
    title: parsed.pod_title,
    speakers,
    metadata: parsed.metadata,
    source_file: path.basename(markdownPath),
    updated_at: new Date().toISOString(),
  };
  const { error: podErr } = await supabase.from('listening_pods').upsert(podRow, { onConflict: 'id' });
  if (podErr) throw new Error(`Pod upsert failed: ${podErr.message}`);

  // 2. Wipe + reinsert sentences (wholesale replace semantics on re-sync)
  const { error: delErr } = await supabase.from('listening_pod_sentences').delete().eq('pod_id', podId);
  if (delErr) throw new Error(`Sentence delete failed: ${delErr.message}`);

  const sentenceRows = [];
  for (const section of parsed.sections) {
    for (const sent of section.sentences) {
      sentenceRows.push({
        id: `${podId}:SC${String(section.number).padStart(2, '0')}-S${String(sent.sentence_number).padStart(3, '0')}`,
        pod_id: podId,
        scene_number: section.number,
        sentence_number: sent.sentence_number,
        global_order: sent.global_order,
        speaker: sent.speaker,
        target_text: sent.target_text,
        known_text: sent.known_text,
        beat_label: sent.beat_label,
      });
    }
  }

  // Insert in chunks (Supabase upsert payload size limit)
  const CHUNK = 500;
  for (let i = 0; i < sentenceRows.length; i += CHUNK) {
    const batch = sentenceRows.slice(i, i + CHUNK);
    const { error: insErr } = await supabase.from('listening_pod_sentences').insert(batch);
    if (insErr) throw new Error(`Sentence insert failed (batch ${i / CHUNK}): ${insErr.message}`);
  }

  console.log(`\n✅ Synced: ${sentenceRows.length} sentences written for ${podId}`);
  return { parsed, speakers, podId, sentenceCount: sentenceRows.length };
}

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------

async function main() {
  const args = process.argv.slice(2);
  if (args.length === 0 || args.includes('--help')) {
    console.log(`
Pod Sync — parse pod markdown and upsert to listening_pods + listening_pod_sentences

Usage:
  node tools/pod-sync.cjs <markdown-file> --course=<code> --type=<core|choice> --slug=<slug> [options]

Options:
  --course=<code>     Course code (required) e.g. spa_for_eng
  --type=<type>       'core' or 'choice' (required)
  --slug=<slug>       Pod slug (required) e.g. pod-0, music, travel-situations
  --dry-run           Parse + print summary, do not write to DB
  --verbose           Show per-section and per-speaker breakdown

Examples:
  node tools/pod-sync.cjs ~/Desktop/spanish-pods.md \\
    --course=spa_for_eng --type=core --slug=pod-0

  node tools/pod-sync.cjs ~/Desktop/spanish-podcast-music.md \\
    --course=spa_for_eng --type=choice --slug=music --verbose
`);
    process.exit(0);
  }

  const markdownPath = args[0].startsWith('-') ? null : args[0];
  if (!markdownPath) {
    console.error('❌ First argument must be a markdown file path');
    process.exit(1);
  }

  const getArg = (flag) => {
    for (const a of args) {
      if (a === flag) return true;
      if (a.startsWith(flag + '=')) return a.slice(flag.length + 1);
    }
    return null;
  };

  const courseCode = getArg('--course');
  const podType = getArg('--type');
  const slug = getArg('--slug');
  const dryRun = !!getArg('--dry-run');
  const verbose = !!getArg('--verbose');

  if (!courseCode || !podType || !slug) {
    console.error('❌ --course, --type, and --slug are required');
    process.exit(1);
  }
  if (!['core', 'choice'].includes(podType)) {
    console.error('❌ --type must be "core" or "choice"');
    process.exit(1);
  }

  try {
    await syncPod(path.resolve(markdownPath.replace(/^~/, process.env.HOME)), {
      courseCode, podType, slug, dryRun, verbose,
    });
    console.log('\n✨ Done!\n');
  } catch (err) {
    console.error('\n❌ Error:', err.message);
    process.exit(1);
  }
}

if (require.main === module) main();

module.exports = { parseMarkdown, syncPod, assignVoices };
