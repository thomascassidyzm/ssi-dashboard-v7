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

const { claudeChat } = require('./shared/claude-cli.cjs')

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
  eng: 'English', spa: 'Spanish', spa_mx: 'Mexican Spanish', fra: 'French', fra_ca: 'Canadian French',
  deu: 'German', ita: 'Italian', por: 'Portuguese', por_br: 'Brazilian Portuguese', nld: 'Dutch',
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
  mlt: 'Maltese', ara: 'Arabic', ara_eg: 'Egyptian Arabic', ara_sy: 'Syrian Arabic', arz: 'Egyptian Arabic',
  heb: 'Hebrew', fas: 'Persian', hye: 'Armenian', jpn: 'Japanese', zho: 'Chinese', kor: 'Korean',
  tha: 'Thai', hin: 'Hindi', ben: 'Bengali', guj: 'Gujarati', tam: 'Tamil', nep: 'Nepali', sin: 'Sinhala',
  swa: 'Swahili', aze: 'Azerbaijani',
}

function languageName(code) {
  if (!code) return 'the target language'
  return LANG_NAMES[code] || LANG_NAMES[String(code).split('_')[0]] || code
}

function buildNotesPrompt(targetName) {
  return `You are briefing a native-${targetName} scriptwriter who will write short, everyday service/peer dialogues (café, pub, restaurant, market, hotel, pharmacy, directions, taxi, greetings) set authentically in the culture where ${targetName} is spoken. Write a concise CULTURE NOTES brief they can rely on for consistency across all scenes.

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
async function getCultureNotes(targetCode) {
  const name = languageName(targetCode)
  if (CURATED[targetCode]) return { notes: CURATED[targetCode], source: 'curated', languageName: name }
  const base = String(targetCode || '').split('_')[0]
  if (CURATED[base]) return { notes: CURATED[base], source: 'curated', languageName: name }
  const notes = await claudeChat(buildNotesPrompt(name), { model: 'sonnet', timeout: 120000 })
  return { notes: (notes || '').trim(), source: 'generated', languageName: name }
}

module.exports = { getCultureNotes, languageName, CURATED, LANG_NAMES }
