/**
 * pod-culture-notes.cjs — per-target-culture notes for pod generation.
 *
 * The prompt-design workflow found CULTURE_NOTES to be the single biggest lever
 * on output quality (it pins down the slips: un-localised currency, generic
 * drink collapse, MSA-vs-colloquial, contactless-paraphrasing). So notes are
 * sourced from a per-target-CULTURE record (consistent across all scenes of a
 * course), NOT free-form per generation.
 *
 * v1: a curated library keyed by target-language code, with a one-shot
 * Claude-generated fallback for cultures not yet curated (generated ONCE per
 * run and reused across every scene, so a course stays internally consistent).
 * Generated notes should be reviewed + promoted into CURATED after QA.
 *
 * TODO(phase-3): back this with an editable pod_culture_notes table so the
 * library is refined in the dashboard rather than in code.
 */

const fs = require('fs')
const path = require('path')
const { claudeChat } = require('./shared/claude-cli.cjs')
// Canonical variant naming, shared with the course builder — pods must call the
// variety by the SAME name the main course was built as (deu_at = "Austrian
// German", not "German"), or the whole brief renders the standard language.
const { DIALECT_NAMES } = require('./course-builder/lib/language-config.cjs')

// Native-checked register briefs the MAIN COURSE was translated/built against
// (services/briefs/reference-examples/<code>.json — same files translate.cjs
// uses). Pods inherit them so dialogue comes out in the variety the learner has
// actually been taught.
const REFERENCE_DIR = path.join(__dirname, 'briefs', 'reference-examples')

// Keyed by target-language code (the language the pod is IN).
const CURATED = {
  fin: `TARGET CULTURE: Finland (Finnish).
- Script/variety: Latin script with ä/ö. For everyday service + peer scenes use spoken Finnish (puhekieli) — colloquial pronouns mä/sä, clitics (-s, -kö/-kös), dropped endings — NOT stiff written kirjakieli. Keep it the natural café/street register, not slang-heavy.
- Register/address: Finnish is informal and direct; no T/V distinction in practice (sinä throughout). Minimal politeness formulae — Finns do NOT pepper speech with "please/sir". "Kiitos" (thanks) is used; an explicit "please" is usually carried by tone/conditional ("saisinko", "voisinko"), not a word. Do not over-politen.
- Currency: euro (€), said as "euroa" + "senttiä". A coffee in a city café is ~3–5 €; a coffee + cake ~7–9 €. Say amounts as spoken words (e.g. "kahdeksan euroa neljäkymmentä", or "kahdeksan neljäkymmentä").
- Food/drink: kahvila café culture. flat white / cappuccino / americano are kept as everyday loanwords (Finns say "flat white", "cappuccino", "americano"). Oat milk = kauramaito. Chamomile tea = kamomillatee. Carrot cake = porkkanakakku. Tap water = hanavesi (free, normal to ask for).
- Payment: card is default; contactless = "lähimaksu" (use this real word, not an English transliteration or PIN description). "Korttimaksu" for card. Cash = käteinen.
- Names/greetings: first names like Mikko, Anna, Saara, Janne, Liisa. Greetings: "Hei", "Moi", "Huomenta" (morning), "Päivää", "Hei hei" / "Moikka" (bye). "Mitäs saisi olla?" (what can I get you).
- Seating: "Tässäkö vai mukaan?" (sit-in or takeaway), "mukaan" = takeaway, "tässä/jään tänne" = sit-in.
- DO-NOT (never leave literal): pounds/pence, "flat white" left untranslated is fine but the PRICE must be euros, British names, over-formal "please sir", PIN-machine descriptions for contactless.`,

  ara_eg: `TARGET CULTURE: Egypt (Egyptian Arabic).
- Script/variety: Arabic script (RTL). Use EGYPTIAN COLLOQUIAL (Masri / عامية مصرية) — the spoken dialect, NOT Modern Standard Arabic. MSA would sound stilted and wrong for a café/street scene. Use everyday Masri forms (e.g. عايز/عايزة for "want", إزيك, ماشي, حاضر, تمام).
- Register/address: polite-but-warm everyday register. Politeness via لو سمحت / من فضلك and حضرتك for respectful address to strangers/staff; friends drop it. Egyptians are warm and use more social formulae than e.g. Finns — but keep it natural, not flowery.
- Currency: Egyptian pound (جنيه). Use realistic CURRENT Cairo prices (not cheap): a specialty coffee ~55–90 جنيه; coffee + a slice of cake ~130–200 جنيه; a kilo of tomatoes ~30–45 جنيه; a short city taxi ride ~90–160 جنيه; a simple restaurant main ~150–300 جنيه. Distinct totals must stay distinct. Say amounts spoken-aloud in words. NEVER leave pounds sterling.
- Food/drink: ahwa / café culture. cappuccino, اسبريسو (espresso), امريكانو (americano) are real loanwords locals say — keep them. "flat white" is known in specialty cafés as فلات وايت (loanword) — keep it as the named item, do NOT collapse to "coffee with milk"; treat all the named drinks consistently as loanwords. Oat milk = لبن الشوفان. Chamomile = شاي بابونج / بابونج. Carrot cake = كيكة الجزر. Water: Egyptians normally order BOTTLED water مياه معدنية (a سيزن/قزازة مياه) rather than free tap; only use الحنفية if the line insists on "tap".
- Masri lexicon (push borderline-MSA to colloquial): feel = حس/حاسس (not شعر); wine = نبيت (not نبيذ); "for me" = ليا (not لِي); a bunch of produce = ربطة (not رزمة); throat lozenges = أقراص استحلاب / بستيلية (not bare أقراص); busy day = يوم مزحوم / مليان (not مشغول); and respect addressee gender (man: تصبح على خير / إزيك; woman: تصبحي على خير / إزيك).
- NUMBER ORTHOGRAPHY — write numbers in EGYPTIAN colloquial spelling, not MSA, so TTS pronounces them Egyptian: مية/ميه (not مائة), ميتين (not مائتين), تلاتمية (not ثلاثمائة), تمانين (not ثمانين), تلاتين (not ثلاثين), سبعين/أربعين spelled plainly. Breakfast = فطار (not the Ramadan-register إفطار); a full cooked breakfast = فطار مصري.
- Payment: card widely used in cafés; contactless = الدفع بدون تلامس / "كونتاكتلس" (locals also say the English term); cash = كاش/نقدي. Don't describe a PIN machine — use the term.
- Names/greetings: first names like Ahmed, Mona, Yasmin, Kareem, Hana. Greetings صباح الخير / صباح الفل, إزيك, مع السلامة, أهلاً.
- Seating: "هتقعد هنا ولا تيك أواي؟" (sit-in or takeaway); تيك أواي is the common term for takeaway.
- DO-NOT (never leave literal): MSA stiffness, pounds sterling, British names, "flat white" collapsed to a generic milk-coffee, English-transliterated descriptions where a real Masri word exists.`,
}

// English names for the language codes we serve (target side). Fallback = the code.
const LANG_NAMES = {
  eng: 'English', spa: 'Spanish', fra: 'French',
  deu: 'German', ita: 'Italian', por: 'Portuguese', nld: 'Dutch',
  swe: 'Swedish', nor: 'Norwegian', dan: 'Danish', isl: 'Icelandic', fin: 'Finnish', est: 'Estonian',
  lav: 'Latvian', lit: 'Lithuanian', pol: 'Polish', ces: 'Czech', slk: 'Slovak', hun: 'Hungarian',
  ron: 'Romanian', bul: 'Bulgarian', hrv: 'Croatian', srp: 'Serbian', slv: 'Slovenian', mkd: 'Macedonian',
  ukr: 'Ukrainian', rus: 'Russian', ell: 'Greek', tur: 'Turkish', cat: 'Catalan', eus: 'Basque',
  gle: 'Irish', gla: 'Scottish Gaelic', cym: 'Welsh', bre: 'Breton',
  // Welsh dialect variants carry the dialect IN THE NAME so the faithful
  // renderer + culture notes steer register correctly (gog vs hwntw:
  // rŵan/efo/fo vs nawr/gyda/fe). Tom 2026-06-11, human-recorded pods.
  cym_n: 'Northern Welsh (colloquial Gogledd Cymru Welsh)',
  cym_s: 'Southern Welsh (colloquial De Cymru Welsh)',
  mlt: 'Maltese', ara: 'Arabic', arz: 'Egyptian Arabic',
  heb: 'Hebrew', fas: 'Persian', hye: 'Armenian', jpn: 'Japanese', zho: 'Chinese', kor: 'Korean',
  tha: 'Thai', hin: 'Hindi', ben: 'Bengali', guj: 'Gujarati', tam: 'Tamil', nep: 'Nepali', sin: 'Sinhala',
  swa: 'Swahili', aze: 'Azerbaijani',
}

function languageName(code) {
  if (!code) return 'the target language'
  const c = String(code)
  // Pod-specific full-code entries first (cym_n/cym_s carry renderer guidance in
  // the name), then the course builder's canonical variant names — WITHOUT this,
  // a variant like deu_at falls through to its base code and the pod is
  // rendered as the standard language. Base-code fallback comes last.
  return LANG_NAMES[c] || DIALECT_NAMES[c] || LANG_NAMES[c.split('_')[0]] || c
}

/**
 * The main course's native-checked register brief for this variant, if one
 * exists — rendered as a BINDING conventions block appended to the culture
 * notes, so scene rendering AND the consistency ledger inherit the exact
 * variety/register the course itself teaches.
 */
function variantConventions(targetCode, name) {
  let data
  try {
    data = JSON.parse(fs.readFileSync(path.join(REFERENCE_DIR, `${targetCode}.json`), 'utf8'))
  } catch (_) {
    return '' // no reference brief for this code — standard notes suffice
  }
  const examples = (Array.isArray(data.examples) ? data.examples : [])
    .map(e => `- ${e.english}  →  ${e.translation || e.target || e.yoruba}`)
    .filter(l => !l.endsWith('undefined'))
    .join('\n')
  if (!data.note && !examples) return ''
  return `

COURSE VARIANT CONVENTIONS (BINDING — inherited from the ${name} course itself).
This pod belongs to a course that teaches ${name} in ONE specific variety and register, pinned below by the course's own native-checked brief. Every target_text line MUST be written in that variety — the same voice the learner has been hearing throughout the course — NOT the standard/formal language. Where anything above conflicts with this brief, THIS BRIEF WINS.
${data.note ? `\n${data.note}\n` : ''}${examples ? `\nNative-checked reference examples from the course (match this register exactly):\n${examples}` : ''}

REGISTER DISCIPLINE (BINDING):
(a) ONE variety at ONE depth — every scene, every speaker. No drifting toward the standard language, and no drifting DEEPER into dialect than the examples show.
(b) Render the SAME word or formula the SAME way in every line and every scene — never one spelling in one scene and a different one in the next.
(c) Each pair of speakers keeps ONE address level (informal or formal) for an entire conversation — never flip mid-scene.
(d) For anything these conventions do not cover (greetings, farewells, numbers, service formulas): stay at the SAME dialect depth as the examples. If unsure between a dialect spelling and the standard one, use the standard spelling with the variety's grammar — NEVER invent a heavier dialect form than the examples license.`
}

/** Machine-checkable banned forms from the variant reference file, for hard
 *  (reject + retry) and soft (warn) validation of generated scenes. */
function variantAvoidLists(targetCode) {
  let data
  try {
    data = JSON.parse(fs.readFileSync(path.join(REFERENCE_DIR, `${targetCode}.json`), 'utf8'))
  } catch (_) {
    return { hard: [], soft: [] }
  }
  return {
    hard: Array.isArray(data.avoid) ? data.avoid : [],
    soft: Array.isArray(data.avoid_soft) ? data.avoid_soft : [],
  }
}

function buildNotesPrompt(targetName, { registerPinned = false } = {}) {
  // When the course carries its own native-checked register brief, the notes
  // must NOT fight it — generated register/orthography advice for the base
  // language routinely contradicts the variant brief and the model then splits
  // the difference scene by scene.
  const registerClause = registerPinned
    ? `\n\nIMPORTANT: this course pins its own variety, register and orthography in a separate native-checked brief that the scriptwriter will receive alongside your notes. Do NOT prescribe register, spelling, dialect depth, or T/V guidance — cover ONLY culture facts: currency and realistic prices, food/drink and venue naming, payment norms, typical names and greeting words, and the do-not list of source-culture items.`
    : ''
  return `You are briefing a native-${targetName} scriptwriter who will write short, everyday service/peer dialogues (café, pub, restaurant, market, hotel, pharmacy, directions, taxi, greetings) set authentically in the culture where ${targetName} is spoken. Write a concise CULTURE NOTES brief they can rely on for consistency across all scenes.${registerClause}

Cover, tightly and concretely (a few lines each, no preamble):
- Script & variety: writing system/diacritics; whether to use the spoken/colloquial everyday register vs the formal standard (be explicit, e.g. colloquial dialect not the formal standard if that's what people actually speak).
- Register/address: T/V or honorific system and the DEFAULT level for everyday service + peer exchanges; how much politeness-marking is natural (some cultures over-mark, some under-mark).
- Currency: local currency, how amounts are said aloud, and a realistic price band for a coffee, a coffee+cake, a pint/drink, a simple restaurant meal — so prices are believable and consistent.
- Food/drink & venue: what people genuinely order in these settings and how items are named; explicitly which English item names are KEPT as real local loanwords (e.g. cappuccino) vs what must be swapped; never collapse a specific named item into a generic one.
- Payment & everyday norms: the real local word for contactless, card, cash, tipping, queuing/table service.
- Names & greetings: typical first names and natural greetings/sign-offs.
- A short DO-NOT list of British/source items that must never survive literally.

Return ONLY the brief as plain prose with short labelled lines. No headings markup, no commentary.`
}

/**
 * Get the CULTURE_NOTES blob for a target language. Returns {notes, source, languageName}.
 * Curated entries are used as-is; otherwise one Claude call generates a brief
 * (caller should reuse the returned notes for every scene in the run).
 */
/** The nested Claude CLI inherits the user's global config, whose hooks can
 *  append HTML-comment artifacts to EVERY response — strip them so they never
 *  end up inside a generation prompt. */
function stripCliArtifacts(text) {
  return String(text || '').replace(/<!--[\s\S]*?-->/g, '').trim()
}

async function getCultureNotes(targetCode) {
  const name = languageName(targetCode)
  const conventions = variantConventions(targetCode, name)
  if (CURATED[targetCode]) return { notes: CURATED[targetCode] + conventions, source: 'curated', languageName: name }
  const base = String(targetCode || '').split('_')[0]
  if (CURATED[base]) return { notes: CURATED[base] + conventions, source: 'curated', languageName: name }
  const notes = await claudeChat(buildNotesPrompt(name, { registerPinned: !!conventions }), { model: 'sonnet', timeout: 120000 })
  return { notes: stripCliArtifacts(notes) + conventions, source: 'generated', languageName: name }
}

module.exports = { getCultureNotes, languageName, variantConventions, variantAvoidLists, stripCliArtifacts, CURATED, LANG_NAMES }
