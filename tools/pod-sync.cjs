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
  // Spanish
  'ana', 'elena', 'maría', 'maria', 'amiga', 'sofía', 'sofia', 'lucía', 'lucia',
  'marta', 'pilar', 'carmen', 'teresa', 'isabel', 'laura', 'clara', 'rosa',
  'vecina', 'camarera', 'cliente femenina', 'amiga', 'cajera', 'recepcionista',
  // English / mixed European
  'sarah', 'anna', 'emma', 'olivia', 'sophie', 'jessica', 'rachel', 'hannah',
  'chloe', 'lucy', 'lily', 'amy', 'kate', 'katie', 'eve', 'mary', 'jane',
  'nurse', 'receptionist', 'barista', 'greengrocer', 'florist', 'cashier',
  'shopkeeper', 'host', 'hostess', 'mum', 'mother', 'sister', 'daughter',
  'waitress',
  // German / Italian / French / Portuguese common
  'frau', 'signora', 'signorina', 'madame', 'senhora', 'mademoiselle',
  'giulia', 'francesca', 'sofia', 'alessia', 'chiara',
  'claire', 'marie', 'sophie', 'amélie', 'amelie', 'camille',
  'catarina', 'inês', 'ines', 'mariana', 'beatriz',
  // French roles (-e / -euse / -ière / -ère / -trice)
  'voisine', 'serveuse', 'amie', 'cliente', 'vendeuse', 'pharmacienne',
  'touriste', 'locale', 'passagère', 'réceptionniste',
  'boulangère', 'bouchère', 'pâtissière', 'patissière', 'fromagère',
  'caissière', 'coiffeuse', 'infirmière', 'institutrice', 'employée',
  'directrice', 'commerçante', 'épicière', 'fleuriste',
  // Italian roles
  'cameriera', 'amica', 'vicina', 'cliente', 'commessa', 'farmacista',
  'turista', 'passeggera',
  // Slavic feminine roles + names (Croatian/Polish/Czech/Slovak/Russian/Ukrainian/Bulgarian/Slovene)
  'ivana', 'jana', 'mira', 'zofia', 'magdalena', 'olga', 'anya', 'anja',
  'tatiana', 'natasha', 'ksenija', 'milena', 'svetlana', 'irina', 'natalia',
  'konobarica', 'recepcionarka', 'ljekarnica', 'putnica', 'lokalka',
  'klijentica', 'prijateljica', 'susjeda', 'turistkinja', 'prodavačica',
  'kasiranka', 'liječnica',
  'kelnerka', 'sąsiadka', 'klientka', 'sprzedawczyni', 'turystka',
  'farmaceutka', 'recepcjonistka', 'pasażerka', 'przyjaciółka',
  'sousedka', 'klientka', 'prodavačka',
  'соседка', 'клиентка', 'официантка', 'продавщица', 'туристка',
  // Greek
  'σερβιτόρα', 'γείτονα', 'πελάτισσα', 'τουρίστρια',
  // Nordic
  'nabo', 'kvinde', 'kvinna', 'kona', 'flicka', 'pige', 'jente',
  // Welsh
  'cymdoges', 'gweinyddes', 'ffrind', 'cwsmer benyw',
  // Generic feminine role keywords (catches "Customer (woman)", "Vendor — F", etc.)
  'woman', 'female', 'lady', 'girl',
  // Hindi
  'priya', 'diya', 'sita', 'aarti', 'rani',
  // Japanese (limited names; Japanese typically uses honorifics)
  'sakura', 'yuki', 'mei', 'aiko', 'mayu',
  // Korean
  'sun-hi', 'yujin', 'mi-rae',
  // Hebrew
  'sara', 'rachel', 'noa', 'shira', 'hila',
  // Arabic
  'fatima', 'aisha', 'zariyah', 'salma', 'amany', 'layla', 'yasmin',
]);
const MALE_NAMES = new Set([
  // Spanish
  'pablo', 'dani', 'javier', 'juan', 'carlos', 'miguel', 'jose', 'josé',
  'antonio', 'luis', 'manuel', 'francisco', 'david', 'sergio',
  'vecino', 'camarero', 'cliente masculino', 'cajero', 'recepcionista varón',
  // English / mixed European
  'james', 'tom', 'thomas', 'jack', 'henry', 'oliver', 'william', 'george',
  'harry', 'charlie', 'daniel', 'liam', 'lucas', 'ethan', 'sam', 'mark',
  'paul', 'peter', 'john', 'alex', 'matt', 'ben', 'andrew', 'simon',
  'bartender', 'waiter', 'driver', 'pharmacist', 'vendor', 'local', 'guest',
  'neighbour', 'neighbor', 'friend', 'colleague', 'dad', 'father', 'brother', 'son',
  'taxi driver', 'shopkeeper male', 'tourist',
  // Other European
  'herr', 'signore', 'monsieur', 'senhor',
  'felix', 'leon', 'marco', 'pedro', 'pierre', 'michel', 'leonardo',
  // French roles (-eur / -ier)
  'voisin', 'serveur', 'ami', 'client', 'vendeur', 'pharmacien',
  'touriste-h', 'taxi', 'chauffeur', 'passager', 'réceptionniste-h',
  // Italian roles
  'cameriere', 'amico', 'vicino', 'cliente-m', 'commesso', 'tassista',
  // Slavic masculine roles + names
  'marko', 'ivan', 'pavel', 'dmitry', 'aleksandr', 'nikolai', 'vladimir',
  'piotr', 'tomasz', 'wojciech', 'andrzej', 'krzysztof',
  'borislav', 'dragan', 'goran', 'stjepan', 'tomislav', 'mladen',
  'susjed', 'konobar', 'prijatelj', 'prodavač', 'ljekarnik', 'klijent',
  'taksist', 'putnik', 'lokalac', 'recepcionar', 'turist', 'kupac',
  'kelner', 'sąsiad', 'klient', 'sprzedawca', 'kierowca', 'farmaceuta',
  'recepcjonista', 'pasażer', 'przyjaciel',
  'soused', 'řidič', 'lékárník',
  'сосед', 'клиент', 'официант', 'продавец', 'турист', 'таксист',
  // Greek
  'σερβιτόρος', 'γείτονας', 'πελάτης', 'τουρίστας', 'οδηγός',
  // Nordic
  'nabo', 'mand', 'man', 'pojke', 'gut', 'gutt', 'dreng',
  // Welsh
  'cymydog', 'gweinydd', 'ffrind', 'cwsmer gwryw',
  // Generic masculine role keywords
  'man', 'male', 'gentleman', 'boy',
  // Hindi
  'vihaan', 'rahul', 'arjun', 'kunal', 'rohan', 'amit',
  // Japanese (limited; honorific-driven)
  'taro', 'haruto', 'ren', 'naoki', 'tomohiro',
  // Korean
  'min-jun', 'gookmin', 'hyun-woo',
  // Hebrew
  'avi', 'david', 'noam', 'avri',
  // Arabic
  'mohammed', 'ahmed', 'youssef', 'omar', 'hamed', 'laith', 'rami', 'ali',
]);

// Voice pools live in app_config.pod_voice_pools (JSONB). See migration
// 20260505_app_config_pod_voice_pools.sql for shape and policy.
async function loadVoicePools() {
  const { data, error } = await supabase
    .from('app_config').select('value').eq('key', 'pod_voice_pools').single();
  if (error) throw new Error(`load pod_voice_pools: ${error.message}`);
  return data.value;
}

function normaliseName(speaker) {
  return speaker.toLowerCase().replace(/\s*\([^)]*\)\s*/g, '').trim();
}

// Canonical speaker name = original case, all parens stripped.
// "Susjed (08:00) (M)" → "Susjed". Used as the stable key so timed/marked
// variants of the same character collapse to one voice assignment.
function canonicalSpeakerName(speaker) {
  return speaker.replace(/\s*\([^)]*\)\s*/g, ' ').replace(/\s+/g, ' ').trim();
}

// Explicit gender marker in speaker column: "Konobar (M)", "Susjeda (F)".
// Standalone paren group required — "Susjed (08:00) (M)" works, "(08:00, M)" doesn't.
// Returns 'f' | 'm' | 'n' | null.
function extractGenderMarker(speakerRaw) {
  const m = speakerRaw.match(/\(\s*([FMN])\s*\)/);
  return m ? m[1].toLowerCase() : null;
}

function inferGenderFromName(speaker) {
  // Try the full canonical name first, then with trailing index stripped
  // ("Klijentica 1" → "klijentica") so numbered variants of the same role
  // resolve via the role's gender.
  const clean = normaliseName(speaker);
  const stripped = clean.replace(/\s+\d+$/, '').trim();
  if (FEMALE_NAMES.has(clean) || FEMALE_NAMES.has(stripped)) return 'f';
  if (MALE_NAMES.has(clean)   || MALE_NAMES.has(stripped))   return 'm';
  return null;
}

function langKey(lang) {
  return (lang || '').toLowerCase().split(/[_-]/)[0];
}

async function assignVoices(rawSpeakers, targetLang, knownLang) {
  // rawSpeakers: array of speaker-name strings as written in the markdown
  //   (e.g. ["Susjed (08:00)", "Susjed (M)", "Ana (F)", "Ana"]).
  //   Variants of the same character collapse to one canonical key.
  // returns: {
  //   [canonicalSpeaker]: {
  //     gender, target: { provider, voice_id, name }, known: { ... }
  //   }
  // }
  const pools = await loadVoicePools();
  const tk = langKey(targetLang);
  const kk = langKey(knownLang);
  const targetPool = pools[tk] || { f: [], m: [] };
  const knownPool  = pools[kk] || { f: [], m: [] };

  // Group raw variants by canonical name, preserving first-seen order.
  const variantsByCanon = new Map();  // canonical → [raw, raw, ...]
  for (const raw of rawSpeakers) {
    const canon = canonicalSpeakerName(raw);
    if (!variantsByCanon.has(canon)) variantsByCanon.set(canon, []);
    variantsByCanon.get(canon).push(raw);
  }

  const counters = { f: 0, m: 0 };
  const ungendered = [];
  const assignments = {};

  for (const [canon, variants] of variantsByCanon) {
    // Gender resolution: any variant with an explicit (F)/(M)/(N) marker wins;
    // else fall through to the name heuristic on the canonical form; else 'n'.
    let gender = null;
    for (const v of variants) {
      gender = extractGenderMarker(v);
      if (gender) break;
    }
    if (!gender) gender = inferGenderFromName(canon) || 'n';
    if (gender === 'n') ungendered.push(canon);
    // 'n' → male default for voice picking; override with explicit marker.
    const pickGender = gender === 'n' ? 'm' : gender;
    const idx = counters[pickGender]++;
    const tPool = targetPool[pickGender] || [];
    const kPool = knownPool[pickGender] || [];
    if (tPool.length === 0) {
      throw new Error(`No target voice available: pod_voice_pools["${tk}"]["${pickGender}"] is empty (speaker "${canon}")`);
    }
    if (kPool.length === 0) {
      throw new Error(`No known voice available: pod_voice_pools["${kk}"]["${pickGender}"] is empty (speaker "${canon}")`);
    }
    // Known voice rank is locked to target rank: characters who share a target
    // voice (same Croatian Gabrijela in hrv, where there's only 1 F target
    // voice) must share the same known voice. Otherwise listeners hear the
    // same "person" in Croatian but different people in English.
    const tIdx = idx % tPool.length;
    const kIdx = tIdx % kPool.length;
    const t = tPool[tIdx];
    const k = kPool[kIdx];
    assignments[canon] = {
      gender,
      variants,
      target: { provider: t.provider, voice_id: t.voice_id, name: t.name },
      known:  { provider: k.provider, voice_id: k.voice_id, name: k.name },
    };
  }

  // _default for re-run safety (markdown adds a speaker between re-syncs).
  const defT = (targetPool.m || [])[0];
  const defK = (knownPool.m  || [])[0];
  if (defT && defK) {
    assignments._default = {
      gender: 'n',
      target: { provider: defT.provider, voice_id: defT.voice_id, name: defT.name },
      known:  { provider: defK.provider, voice_id: defK.voice_id, name: defK.name },
    };
  }

  if (ungendered.length) {
    console.warn(`⚠️  Speakers without explicit (F)/(M) marker, defaulted to male: ${ungendered.join(', ')}`);
    console.warn(`   Add (F) or (M) in the markdown speaker column to override, then re-sync.`);
  }
  return assignments;
}

// ---------------------------------------------------------------------------
// Markdown parsing
// ---------------------------------------------------------------------------

const RE_H1 = /^#\s+(.+?)\s*$/;
const RE_H2 = /^##\s+(.+?)\s*$/;
const RE_H3 = /^###\s+(.+?)\s*$/;
// Two markdown shapes supported:
//   Legacy (4 cols):  | # | Speaker | Target | Known |
//   Chunked (5 cols): | # | Speaker | Target | Known | + |
//
// In the chunked shape, `#` allows a sub-letter (1, 2a, 2b, 3a) and the
// trailing `+` column carries the glue-to-next marker (presence of any
// non-whitespace token in that cell = glued; empty = end of utterance).
const RE_TABLE_ROW_LEGACY  = /^\|\s*(\d+[a-z]?)\s*\|\s*(.+?)\s*\|\s*(.+?)\s*\|\s*(.+?)\s*\|\s*$/;
const RE_TABLE_ROW_CHUNKED = /^\|\s*(\d+[a-z]?)\s*\|\s*(.+?)\s*\|\s*(.+?)\s*\|\s*(.+?)\s*\|\s*([^|]*?)\s*\|\s*$/;
const RE_TABLE_HEADER = /^\|\s*#\s*\|/i;
const RE_TABLE_SEPARATOR = /^\|[\s-|]+\|\s*$/;

/**
 * Match a content row in either legacy or chunked shape.
 * Returns { num, speaker, target, known, glueToNext } or null.
 * glueToNext is undefined for legacy rows (4 cols), boolean for chunked.
 */
function matchTableRow(line) {
  const chunked = line.match(RE_TABLE_ROW_CHUNKED);
  if (chunked) {
    const [, num, speaker, target, known, glueCell] = chunked;
    return {
      num,
      speaker: speaker.trim(),
      target: target.trim(),
      known: known.trim(),
      glueToNext: /\S/.test(glueCell),
    };
  }
  const legacy = line.match(RE_TABLE_ROW_LEGACY);
  if (legacy) {
    const [, num, speaker, target, known] = legacy;
    return {
      num,
      speaker: speaker.trim(),
      target: target.trim(),
      known: known.trim(),
      glueToNext: undefined,
    };
  }
  return null;
}

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
    const row = (RE_TABLE_HEADER.test(line) || RE_TABLE_SEPARATOR.test(line))
      ? null
      : matchTableRow(line);

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
    } else if (row && currentSection) {
      const { speaker, target, known, glueToNext } = row;
      // Skip stray rows where speaker cell looks like header/separator content
      if (!speaker || speaker === '#') continue;

      globalOrder++;
      sentenceNumInSection++;
      currentSection.sentences.push({
        sentence_number: sentenceNumInSection,
        global_order: globalOrder,
        speaker,
        target_text: target,
        known_text: known,
        beat_label: currentBeat,
        // glueToNext is undefined for legacy 4-col files; let the writer
        // default it. For chunked 5-col files, carry the explicit boolean.
        glue_to_next: glueToNext,
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
  // courseCode shape: "<target>_for_<known>" or "<target>_<region>_for_<known>"
  // e.g. "hrv_for_eng" → target=hrv, known=eng
  //      "fra_ca_for_eng" → target=fra (region stripped to ISO 639-3), known=eng
  const [targetPart, knownPart] = courseCode.split('_for_');
  if (!targetPart || !knownPart) {
    throw new Error(`Course code "${courseCode}" is not in <target>_for_<known> form`);
  }
  const targetLang = targetPart.split('_')[0];
  const knownLang = knownPart.split('_')[0];
  const speakers = await assignVoices(parsed.uniqueSpeakers, targetLang, knownLang);

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
      const t = `${v.target.provider}/${v.target.name}`;
      const k = `${v.known.provider}/${v.known.name}`;
      console.log(`     ${sp.padEnd(22)} (${v.gender})  target=${t.padEnd(20)} known=${k}`);
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
        // Carry glue marker through. For legacy 4-col markdown, sent.glue_to_next
        // is undefined → DB default (false) applies. Explicit boolean wins
        // when the chunked 5-col format is used.
        ...(typeof sent.glue_to_next === 'boolean' && { glue_to_next: sent.glue_to_next }),
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

module.exports = {
  parseMarkdown, syncPod, assignVoices,
  canonicalSpeakerName, extractGenderMarker, inferGenderFromName,
  loadVoicePools,
};
