/**
 * gendered-speech.cjs — single source of truth for "does this text reveal the
 * SPEAKER'S gender, and which?" Shared by:
 *   - tools/audio-gender-lint.cjs  (flag voice↔text gender mismatches)
 *   - tools/pod-recolour.cjs       (pick a gender-matching voice per speaker)
 *
 * Some languages encode the speaker's own gender in ordinary speech — Thai
 * polite particles (ครับ male / ค่ะ female), gendered first-person pronouns,
 * gendered verb/adjective forms for "I". A voice whose gender doesn't match
 * these sounds wrong (a man on ค่ะ reads as effeminate/mocking in Thai).
 *
 * Keep patterns HIGH PRECISION — a false read that miscasts a correct voice is
 * worse than a miss. Add a language by adding a {female, male} entry.
 */

// female/male: regexes matching text that reveals the SPEAKER's gender.
const GENDERED_FORMS = {
  // Thai: sentence-final polite particles + gendered 1st-person pronouns.
  // ครับ = male; ค่ะ/คะ = female; ผม = male "I"; ดิฉัน = female "I".
  // (ฉัน is gender-neutral-leaning and deliberately excluded.)
  tha: {
    name: 'Thai',
    female: /ค่ะ|คะ|ดิฉัน|ดิ?ชั้น/,
    male: /ครับ|(?:^|[\s"“(])ผม(?![฀-๿])/, // ผม as pronoun, not inside a longer word
  },
  // Hebrew: the SPEAKER's gender shows in 1st-person present verbs & predicate
  // adjectives (masc base vs fem +ת/+ה). We anchor on אני ("I") + an optional
  // adverb + a gendered form, and use a Hebrew-letter negative lookahead as the
  // word boundary — JS \b is ASCII-only and silently fails on Hebrew.
  // Only forms whose masc/fem spelling differs UNVOCALISED are listed (רוצה /
  // שותה / רואה / עושה are identical for both genders → deliberately omitted).
  heb: {
    name: 'Hebrew',
    female: /אני (?:לא |גם |מאוד |ממש |כבר |עדיין |פשוט |כל כך |עוד )*(?:יכולה|צריכה|חושבת|מדברת|הולכת|יודעת|עובדת|מבינה|מרגישה|גרה|אוכלת|לובשת|מצטערת|בטוחה|עייפה|מוכנה|שמחה|עסוקה|אומרת|לוקחת|נותנת|מחפשת|אוהבת|מקבלת|יושבת|מתעייפת|מודָה)(?![א-ת])/,
    male: /אני (?:לא |גם |מאוד |ממש |כבר |עדיין |פשוט |כל כך |עוד )*(?:יכול|צריך|חושב|מדבר|הולך|יודע|עובד|מבין|מרגיש|גר|אוכל|לובש|מצטער|בטוח|עייף|מוכן|שמח|עסוק|אומר|לוקח|נותן|מחפש|אוהב|מקבל|יושב|מתעייף)(?![א-ת])/,
    note: 'anchored on אני + gendered 1st-person verb/adjective; precision over recall',
  },
  // Arabic: 1st-person VERBS don't inflect for gender (أنا أذهب is unisex), so
  // the speaker's gender shows in predicate ADJECTIVES / participles. These are
  // ambiguous out of context (أنت جاهز = "you(m) are ready" is the ADDRESSEE,
  // not the speaker), so we anchor strictly on أنا ("I") + optional adverb +
  // the adjective — precision over recall. Covers MSA + Levantine participles.
  ara: {
    name: 'Arabic',
    female: /أنا (?:مش |ما |كتير |كمان |هلق |لسا |بعدني |جداً |جدا )*(?:سعيدة|متأكدة|جاهزة|متعبة|تعبانة|مبسوطة|محتاجة|جوعانة|عارفة|رايحة|قادرة|مستعدة|ممنونة|آسفة|زعلانة|واثقة|مشغولة|مبسوطة|فرحانة)(?![ء-ي])/,
    male: /أنا (?:مش |ما |كتير |كمان |هلق |لسا |بعدني |جداً |جدا )*(?:سعيد|متأكد|جاهز|متعب|تعبان|مبسوط|محتاج|جوعان|عارف|رايح|قادر|مستعد|ممنون|آسف|زعلان|واثق|مشغول|فرحان)(?![ء-ي])/,
    note: 'anchored on أنا + gendered predicate adjective/participle; precision over recall',
  },
  // ── Slavic: the speaker's gender shows in the 1st-person PAST (l-participle).
  // Anchored on the 1st-person aux / pronoun to avoid 3rd-person (он был) hits.
  pol: { // Polish — 1st-person past ends -łem (m) / -łam (f); very frequent.
    name: 'Polish',
    female: /\w+łam\b|jest[eae]m (?:bardzo |trochę |już )?(?:gotowa|zmęczona|pewna|głodna|zajęta|szczęśliwa|smutna|spóźniona|zmarznięta|chora|zadowolona)\b/,
    male: /\w+łem\b|jest[eae]m (?:bardzo |trochę |już )?(?:gotowy|zmęczony|pewien|pewny|głodny|zajęty|szczęśliwy|smutny|spóźniony|zmarznięty|chory|zadowolony)\b/,
    note: '-łem/-łam 1st-person past + jestem-anchored adjectives',
  },
  hrv: { // Croatian — l-participle + aux "sam"; anchor on sam to avoid 3rd person.
    name: 'Croatian',
    female: /\bsam \w*(?:la|jela|šla)\b|\b(?:bila|htjela|radila|išla|mogla|došla|rekla|vidjela|znala|morala|trebala|umorna|spremna|sigurna|gladna|sretna|zauzeta) sam\b/,
    male: /\bsam \w*(?:ao|io)\b|\b(?:bio|htio|radio|išao|mogao|došao|rekao|vidio|znao|morao|trebao|umoran|spreman|siguran|gladan|sretan|zauzet) sam\b/,
    note: 'l-participle anchored on 1st-person aux "sam"',
  },
  ukr: { // Ukrainian — 1st-person past -в (m) / -ла (f); anchor on я.
    name: 'Ukrainian',
    female: /\bя (?:\S+ ){0,2}(?:була|робила|ходила|хотіла|зробила|прийшла|бачила|знала|могла|думала|готова|голодна|втомлена|впевнена|рада|зайнята)\b/,
    male: /\bя (?:\S+ ){0,2}(?:був|робив|ходив|хотів|зробив|прийшов|бачив|знав|міг|думав|готовий|голодний|втомлений|впевнений|радий|зайнятий)\b/,
    note: 'я + 1st-person past/adjective',
  },
  // ── Indo-Aryan: 1st-person verb + gender agreement (हूँ ता/ती).
  hin: {
    name: 'Hindi',
    female: /(?:ती हूँ|ती थी|यी हूँ|रही हूँ|आयी हूँ|गयी हूँ|चाहती हूँ|सकती हूँ|पाती हूँ)|मैं \S*ी\b/,
    male: /(?:ता हूँ|ता था|या हूँ|रहा हूँ|आया हूँ|गया हूँ|चाहता हूँ|सकता हूँ|पाता हूँ)/,
    note: '1st-person habitual/perfect verb gender (ता/ती हूँ)',
  },
  // ── Romance: predicate adjectives about the speaker, anchored on the copula.
  spa: {
    name: 'Spanish',
    female: /\b(?:soy|estoy|estaba|estuve|me siento) (?:un |una |muy |tan |ya |bastante )*(?:cansada|lista|segura|contenta|preocupada|ocupada|perdida|nerviosa|enferma|encantada|sentada|casada|sola|aburrida|dispuesta|agradecida|preparada)\b/,
    male: /\b(?:soy|estoy|estaba|estuve|me siento) (?:un |muy |tan |ya |bastante )*(?:cansado|listo|seguro|contento|preocupado|ocupado|perdido|nervioso|enfermo|encantado|sentado|casado|solo|aburrido|dispuesto|agradecido|preparado)\b/,
    note: 'copula + gendered predicate adjective',
  },
  ita: {
    name: 'Italian',
    female: /\b(?:sono|mi sento|ero) (?:molto |un po'? |già |tanto )*(?:stanca|pronta|sicura|contenta|preoccupata|occupata|persa|nervosa|malata|seduta|sposata|sola|stufa|disposta|arrabbiata)\b/,
    male: /\b(?:sono|mi sento|ero) (?:molto |un po'? |già |tanto )*(?:stanco|pronto|sicuro|contento|preoccupato|occupato|perso|nervoso|malato|seduto|sposato|solo|stufo|disposto|arrabbiato)\b/,
    note: 'copula + gendered predicate adjective',
  },
  por: {
    name: 'Portuguese',
    female: /\b(?:sou|estou|estava|fiquei|me sinto|sinto-me) (?:muito |um pouco |já |bastante )*(?:cansada|pronta|segura|contente|preocupada|ocupada|perdida|nervosa|doente|sentada|casada|sozinha|grata|preparada)\b/,
    male: /\b(?:sou|estou|estava|fiquei|me sinto|sinto-me) (?:muito |um pouco |já |bastante )*(?:cansado|pronto|seguro|contente|preocupado|ocupado|perdido|nervoso|doente|sentado|casado|sozinho|grato|preparado)\b/,
    note: 'copula + gendered predicate adjective',
  },
  fra: {
    name: 'French',
    female: /\bje suis (?:très |un peu |déjà |bien )*(?:fatiguée|prête|sûre|contente|occupée|perdue|assise|mariée|seule|inquiète|désolée|ravie|heureuse|prête|malade)\b/,
    male: /\bje suis (?:très |un peu |déjà |bien )*(?:fatigué|prêt|sûr|content|occupé|perdu|assis|marié|seul|inquiet|désolé|ravi|heureux|malade)\b(?!e)/,
    note: 'je suis + gendered adjective (é/ée, prêt/prête)',
  },
  cat: {
    name: 'Catalan',
    female: /\b(?:soc|sóc|estic|em sento) (?:molt |una mica |ja )*(?:cansada|preparada|segura|contenta|preocupada|ocupada|perduda|malalta|asseguda|casada|sola|tipa|contenta)\b/,
    male: /\b(?:soc|sóc|estic|em sento) (?:molt |una mica |ja )*(?:cansat|preparat|segur|content|preocupat|ocupat|perdut|malalt|assegut|casat|sol|tip)\b/,
    note: 'copula + gendered adjective',
  },
  ron: {
    name: 'Romanian',
    female: /\b(?:sunt|sînt|mă simt|eram) (?:foarte |puțin |cam |deja )*(?:obosită|pregătită|sigură|mulțumită|ocupată|pierdută|bolnavă|așezată|căsătorită|singură|gata|fericită)\b/,
    male: /\b(?:sunt|sînt|mă simt|eram) (?:foarte |puțin |cam |deja )*(?:obosit|pregătit|sigur|mulțumit|ocupat|pierdut|bolnav|așezat|căsătorit|singur|fericit)\b/,
    note: 'copula + gendered adjective',
  },
  // ── Greek: predicate adjectives, anchored on είμαι.
  ell: {
    name: 'Greek',
    female: /\bείμαι (?:πολύ |λίγο |ήδη )*(?:κουρασμένη|έτοιμη|σίγουρη|χαρούμενη|απασχολημένη|χαμένη|άρρωστη|μόνη|ενθουσιασμένη|καθισμένη|παντρεμένη)\b/,
    male: /\bείμαι (?:πολύ |λίγο |ήδη )*(?:κουρασμένος|έτοιμος|σίγουρος|χαρούμενος|απασχολημένος|χαμένος|άρρωστος|μόνος|ενθουσιασμένος|καθισμένος|παντρεμένος)\b/,
    note: 'είμαι + gendered adjective (-ος/-η)',
  },
  // ── Icelandic + Baltic: predicate adjectives, anchored on the copula.
  isl: {
    name: 'Icelandic',
    female: /\bég er (?:mjög |svolítið |núna )*(?:þreytt|tilbúin|viss|ánægð|upptekin|týnd|veik|ein|svöng|tilbúin)\b/,
    male: /\bég er (?:mjög |svolítið |núna )*(?:þreyttur|tilbúinn|viss|ánægður|upptekinn|týndur|veikur|einn|svangur)\b/,
    note: 'ég er + gendered adjective',
  },
  lav: {
    name: 'Latvian',
    female: /\besmu (?:ļoti |mazliet )*(?:gatava|nogurusi|pārliecināta|priecīga|aizņemta|izsalkusi|slima|viena|apmierināta)\b/,
    male: /\besmu (?:ļoti |mazliet )*(?:gatavs|noguris|pārliecināts|priecīgs|aizņemts|izsalcis|slims|viens|apmierināts)\b/,
    note: 'esmu + gendered adjective',
  },
  lit: {
    name: 'Lithuanian',
    female: /\besu (?:labai |šiek tiek )*(?:pasiruošusi|pavargusi|tikra|laiminga|užsiėmusi|pasiklydusi|alkana|viena|patenkinta)\b/,
    male: /\besu (?:labai |šiek tiek )*(?:pasiruošęs|pavargęs|tikras|laimingas|užsiėmęs|pasiklydęs|alkanas|vienas|patenkintas)\b/,
    note: 'esu + gendered adjective',
  },
  // Japanese: INTENTIONALLY not detected (decision 2026-07-17, not a gap).
  // The pods use the polite です/ます register, which is GENDER-NEUTRAL — men and
  // women speak identically. Gendered pronouns (僕/俺/あたし) and sentence-final
  // particles (わ/ぞ/かしら/わよ) only surface in CASUAL speech. Verified on
  // jpn_for_eng:pod-0: 142 lines, 115 polite, ZERO real gender markers (the ぞ
  // hits were どうぞ, the のよ hit was どのような). No speaker-gender is encoded in
  // the text → no audible voice/text mismatch is possible → no line check needed.
  jpn: { name: 'Japanese', female: null, male: null, note: 'gender-neutral in polite です/ます register — no line-level gender to detect (verified jpn_for_eng 2026-07-17)' },
}

/** Does this language mark the speaker's gender in ordinary speech (patterns exist)? */
function isGenderedSpeechLang(langCode) {
  const f = GENDERED_FORMS[langCode]
  return !!(f && (f.female || f.male))
}

/**
 * Classify a single text: 'f' | 'm' | null (none, or BOTH genders present —
 * i.e. two speakers quoted in one line, which we don't judge).
 */
function textGender(text, langCode) {
  const f = GENDERED_FORMS[langCode]
  if (!f) return null
  const hasF = f.female && f.female.test(text || '')
  const hasM = f.male && f.male.test(text || '')
  if (hasF === hasM) return null // neither, or both (mixed)
  return hasF ? 'f' : 'm'
}

/**
 * Infer a SPEAKER's gender from their collection of lines. Returns 'f' | 'm' |
 * null. Returns null when there's no gendered evidence OR the lines conflict
 * (some female, some male) — a conflict means the script itself is
 * inconsistent, so we don't guess; the caller falls back to other signals and
 * the lint will flag it.
 */
function detectGenderFromTexts(texts, langCode) {
  if (!isGenderedSpeechLang(langCode)) return null
  let fem = 0, male = 0
  for (const t of texts || []) {
    const g = textGender(t, langCode)
    if (g === 'f') fem++; else if (g === 'm') male++
  }
  if (fem > 0 && male === 0) return 'f'
  if (male > 0 && fem === 0) return 'm'
  return null // no evidence, or conflicting
}

module.exports = { GENDERED_FORMS, isGenderedSpeechLang, textGender, detectGenderFromTexts }
