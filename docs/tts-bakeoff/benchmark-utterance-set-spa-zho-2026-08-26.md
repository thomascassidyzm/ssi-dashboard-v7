# Benchmark utterance sets — Spanish and Mandarin Chinese

**Two more languages for the phase-1 bake-off, built with the same generator, the same ten
categories and the same schema as the English and Welsh sets. 99 utterances each, every one
traceable to a live DB row. Chinese is the one that earned its place: it broke the generator in
exactly the way it was sent in to break it.**

2026-08-26. Spend: **£0.00** — no audio generated, no paid API called.

Files:
- `tools/tts-bakeoff/data/utterances-spa.json` — 99 utterances, spa_for_eng + spa_mx_for_eng
- `tools/tts-bakeoff/data/utterances-zho.json` — 99 utterances, zho_for_eng
- `tools/tts-bakeoff/build-utterance-set.cjs` — the generator, now with `spa` and `zho` packs

Reproduce byte-for-byte:

```
node tools/tts-bakeoff/build-utterance-set.cjs --language spa \
  --courses spa_for_eng,spa_mx_for_eng --date 2026-08-26
node tools/tts-bakeoff/build-utterance-set.cjs --language zho \
  --courses zho_for_eng --date 2026-08-26
```

---

## Lead

| | spa | zho |
|---|---|---|
| Utterances | **99** | **99** |
| Categories filled | **10 / 10** | **10 / 10** |
| Candidate rows after dedupe | 29,576 | 14,922 |
| Source courses | spa_for_eng (live), spa_mx_for_eng (beta) | zho_for_eng (live) |
| Variety tagged per utterance | **yes** — 50 es-ES, 49 es-MX | n/a, single course |
| Repeat probe | 1 utterance × 20 | 1 utterance × 20 |
| Utterances with invented text | **0** | **0** |
| Provenance rows sampled and re-resolved live | 24 / 24 | 21 / 21 |

Category counts are identical for both languages and identical to English:
`hard_pronunciation 14, isolated_word 12, very_short_lego 12, medium_chunk 12, full_sentence 12,
question 10, minimal_pair 10, numbers 8, proper_noun 8, repeat_probe 1`.

Both files regenerate byte-identically on a second run. `utterances-eng.json` and
`utterances-cym.json` also regenerate **byte-identically after every change below** — that is the
backward-compatibility check, and it was run after each edit, not once at the end.

---

## 1. What the generator needed in order to travel

Four things. The first is the important one, and it is exactly the failure the brief predicted.

### 1a. Tokenisation was hard-wired to whitespace

`words()` split on spaces. Chinese writes no spaces, so **every Chinese string scored one token**.
Six of the ten categories are size-banded on that token count, so a naive `--language zho` run
would have produced: `isolated_word` full of whole sentences, and `very_short_lego`,
`medium_chunk`, `full_sentence` and `question` **all empty**. The file would have looked like it
built. It would have been junk.

Fix: tokenisation is now a language property. `WHITESPACE_TOKENISER` stays the default and every
Latin/Cyrillic/Greek-script course in the estate keeps it. A pack may supply its own; `zho` supplies
`cjkTokeniser`, which makes each Han character its own token and keeps runs of Latin letters or
digits whole. Category size bands moved into `DEFAULT_BANDS`, overridable per pack, because
Chinese bands are in characters and are therefore numerically different (isolated_word 1–2
characters, full_sentence 8–18, and so on).

### 1b. The apostrophe trap — and why the eng/cym re-check earns its keep

Adding CJK full-width punctuation to the strip class was necessary for Chinese to tokenise at all.
The first version of that change also swept in `’` U+2019. That is punctuation in English and the
**apostrophe inside Welsh words** — `chi’n`, `efo’ch`. Stripping it split one Welsh word into two,
changed every Welsh word count, and silently rewrote the committed `utterances-cym.json`. The
regeneration check caught it immediately; without that check it would have shipped as a quiet
corruption of a sibling's finished work. `’` is now excluded from the strip class with a comment
saying why.

### 1c. Latin-script assumptions in the minimal-pair miner

`editPairsFrom` filtered candidate words with `/[^a-z’']/`, which throws away **every accented
Spanish word** — that is most of them, and all of the interesting ones. The character class is now
pack-supplied. `describeDiff` also only knew the five plain vowels, so it could not see that
`esta`/`está` differ, and it rejected all insertions, so it could not see `pero`/`perro` either.
Both are now handled, both pack-gated so no other language picks them up by accident.

### 1d. Names cannot be matched as tokens in a script with no word boundaries

A single-character proper-noun list would find 中 inside 中间 and call it "China". Packs may now
supply `properNounPhrases`, matched as substrings, longest first so 星期一 beats 星期.

Three smaller additions, all opt-in per pack and all no-ops for eng/cym: `contrastRank` (rank the
minimal-pair contrasts a language actually cares about), `qualityPenalty` (push splice-marked pod
rows down without banning them), and `categoryNotes` (replace the generic listening note where it
is wrong for the language — see §3).

---

## 2. Spanish

### Why these two courses

`spa_for_eng` is live, 668 seeds, 79,722 clips, xAI-voiced, Tier A and in migration scope — the
largest live non-English TTS language in the estate. `spa_mx_for_eng` is beta with the same 668
seeds and 44,566 clips. Both are drawn from, roughly 50/50.

**Variety tagging.** The brief asked for provenance tagged so a peninsular/Mexican split can be made
later, "the way #669 dialect-tagged north and south Welsh". That method does not transfer: Welsh
carries `north`/`south` in `courses.dialect`, but **both Spanish courses say `dialect: "standard"`**,
so that column carries no variety information at all. The variety is therefore derived from the
course code by an explicit map in the pack, and every Spanish utterance carries
`provenance.variety` of `es-ES (peninsular)` or `es-MX (Mexican)` — 50 and 49 respectively.
`utterances-spa.json` still records `dialect: "standard"`, which is what the DB says; the useful
field is `variety`.

### The hard cases, and where they came from

Twelve rules, each matched against real corpus strings, each carrying a note that says what to
listen for. The ones worth naming:

- **seseo / distinción** (`ce/ci/z`, 5,719 rows in spa_for_eng). The peninsular /θ/ versus the
  Mexican /s/. This is the single most useful Spanish axis for this bake-off, because it is not a
  "can it pronounce it" test — it is a **consistency** test. A voice must pick one and hold it for
  40,000 clips. Drift between /θ/ and /s/ inside a course teaches an accent no human has, and it
  goes straight at Tom's axis D.
- **rr trill vs r tap** — the classic. See the minimal pair below.
- **jota** (`j`, `g` before e/i), 2,573 rows — English-trained models read `j` as /dʒ/.
- **written accent**, 9,305 rows — in Spanish the diacritic marks lexical stress and nothing else.
  A pure test of whether the model reads it or discards it.
- **ñ**, **intervocalic d**, **b/v as one phoneme**, **silent h**, **synalepha**, **x**, and the
  **inverted `¿`/`¡`** as a text-normalisation probe.

### The minimal pairs are the best thing in the Spanish set

Ranked by contrast quality rather than by hash, so the ten slots go to the pairs that matter:

| pair | contrast | why |
|---|---|---|
| pero / perro | tap /ɾ/ vs trill /r/ | the pair every Spanish learner is taught, and the one most TTS voices flatten. Both attested: 2,532 and 244 rows |
| como / cómo | written stress accent | pure stress |
| que / qué | written stress accent | pure stress |
| hacia / hacía | written stress accent | pure stress, and a genuine ambiguity |
| donde / dónde | written stress accent | pure stress |

If a candidate renders `pero` and `perro` the same, it is finished for Spanish course work and no
further listening is needed.

### Where the Spanish evidence did NOT come from — read this before trusting the brief

The brief pointed at three sources of defect provenance. **All three came up empty, and I am
reporting that rather than dressing rule-derived cases up as defect-derived ones:**

1. **`rerecord_wanted` is empty.** Zero non-null rows across spa_for_eng, spa_mx_for_eng and
   zho_for_eng. The generator's defect-provenance seats — the first three `hard_pronunciation`
   slots, which in Welsh are filled from that ledger — had nothing to fill them with.
2. **`quality_notes` does not exist on `course_audio`.** The column is not in the table. What is
   there is a veracity block (`veracity_pass`, `veracity_reason`, `veracity_cer`), which would have
   been better evidence — except that **only 86 / 21 / 12 rows across the three courses have ever
   been veracity-checked, and not one of them failed.** Nothing to mine.
3. **The named Spanish defect class is not a pronunciation class.** The memory note
   "spa defects are known-side overreach" and section A4 of
   `docs/spa-for-eng-lego-reclassified-250-300-2026-08-24.md` describe the English prompt running
   ahead of the taught LEGOs, so the Spanish improvises — a methodology and content defect. Real,
   serious, and **irrelevant to TTS**: it says nothing about what a voice will mispronounce.

So every Spanish hard case is **rule-derived and corpus-matched**, not defect-nominated. That is
the same standing as the Welsh pack's rules, which is fine — but it is a weaker claim than "the
estate has already had to re-record this string", and it should not be reported as if it were.

### Spanish gaps

- **No digits anywhere in the seed corpus.** Zero digit strings in `course_seeds`, `course_legos`
  and `course_practice_phrases` for either course. Every digit in Spanish lives in `course_audio`
  pod rows — 58 in spa_for_eng, 2 in spa_mx_for_eng. The `numbers` category is filled from those
  plus number words, so digit normalisation **is** tested (`B-14`, `709`, `30 euros`, `los años 30`)
  but only in long pod sentences, not in short isolated probes. Same shape #669 found in English.
- **9 pipe/arrow annotation rows excluded as a data defect** — `spa_for_eng:S0466L01C01`
  `"deja | me → me"`, `S0466L02C01`, `S0500L02C01` and their audio rows. This is authoring debris
  sitting in speakable text; if it were ever rendered, a learner would hear the pipe. It is the same
  class already logged in the methodology canon for `spa S0495L01C01`.
- **English leaking into Spanish pod rows.** Not excluded, because it is not detectable by script in
  a Latin-script language, but observed and worth a separate look: e.g.
  `"¿Van a cenar". means are you going to eat. "esta noche". means tonight.` — a Spanish target row
  carrying English gloss text inline.
- **Proper nouns are thin.** The corpus has `español` 4,360 times and then falls off a cliff:
  `españa` 24, `inglés` 20, `londres` 8, `maría` 8, `josé` 4, `madrid` 3, `méxico` 3, `américa` 2,
  and `francés`, `navidad`, `gales`, `europa` **zero**. The category is filled with names in real
  sentences, but there is not much of a bench.

---

## 3. Mandarin Chinese

### Why it is here, and what it actually stressed

`zho_for_eng` is live, 668 seeds, 41,446 clips, xAI-voiced, Tier A, migration scope. It was sent in
to stress non-Latin script and tone. It did: see §1a. Beyond tokenisation it also forced the
`categoryNotes` hook, because the default listening notes are written in a vocabulary Chinese does
not have. Telling a listener to check "lexical stress on the wrong syllable" in Mandarin points them
at nothing that exists. All six generic categories now carry Chinese-specific notes telling the
listener to check tone contours, sandhi, neutral-tone syllables, and — for questions — that Mandarin
marks most questions **lexically** (吗, 呢, A-not-A), so over-applying an English rise is as wrong as
flattening it.

### Hard pronunciation — ten rules, all tone-and-sandhi first

| rule | corpus hits | what it probes |
|---|---|---|
| `bu-sandhi` | 965 | 不 before a fourth tone becomes second: 不是 is **bú** shì. Mandatory, unwritten. |
| `yi-sandhi` | 1,615 | 一 has three readings decided entirely by what follows: 一个 is **yí** ge, 一点 is **yì** diǎn. |
| `t3-sandhi` | 4,655 | two third tones in a row — the first becomes second. 你好 is **ní** hǎo. Everywhere in the course. |
| `v-bu-v` | 278 | the A-不-A question frame (是不是, 能不能): 不 goes neutral and the frame is one prosodic unit. |
| `neutral-tone` | 6,253 | lexical neutral tone on a second syllable (什么, 朋友, 谢谢). Full dictionary tones here is the classic robotic Mandarin. |
| `erhua` | 263 | 儿 is not a syllable, it retroflexes the preceding vowel. 一点儿 is two syllables, not three. |
| `retroflex-vs-alveolar` | 1,603 | a string carrying BOTH zh/ch/sh and z/c/s — 四 sì vs 十 shí. Merged by many speakers and most TTS. |
| `final-particle` | — | 吗/呢/吧/啊: toneless, carrying the sentence's pragmatic force. |
| `de-triple` | — | 的/得/地 — three characters, one neutral "de", and 得 is also děi and dé. |
| `tone4-run` | — | consecutive fourth tones; models flatten the second or insert a reset pause. |

### The minimal pairs are heteronyms, and that was the right call

The brief's judgement here was correct and it is the sharpest thing in either file. Chinese has no
phoneme-swap minimal pairs worth mining out of an orthography that does not write phonemes. What it
has is **heteronyms** — one character, two readings, chosen by meaning and by nothing in the writing.
I probed 29 candidate heteronyms against the corpus and kept only those where **both readings are
attested in real rows**. Eleven survived; the ten slots went to the first five, each contributing
both members:

| character | reading A (utterance) | reading B (utterance) |
|---|---|---|
| 行 | xíng — `不行` | háng — `经过银行吗?` |
| 长 | cháng — `长时间` | zhǎng — `长大` |
| 了 | le — `好了` | liǎo — `了解` |
| 得 | de — `说得` | děi — `得去` |
| 乐 | lè — `新年快乐` | yuè — `音乐` |

Each utterance names its own reading, its partner's text and its partner's reading, so a listener
plays the two back to back and the test is binary: **they must differ.** A model that picks the
wrong reading produces a word the learner has never heard, and it is the most audible Chinese TTS
failure there is.

Seven tone-only pairs are also defined in the pack and verified present in the corpus — 买/卖
(mǎi/mài), 问/文, 想/像, 找/照, 里/力, 马/妈, 睡/水 — as top-up if the heteronym pool ever shrinks.
They did not reach the file because the heteronyms filled the quota first.

The eighteen heteronyms I probed and **rejected** are as informative: 重, 觉, 还, 好, 教, 空, 差,
干, 种, 便, 着, 少, 大, 都, 相, 转, 朝, 给 all appear in this corpus with **one** reading only. Mining
them would have meant inventing the second member, which is forbidden.

### Chinese numbers — better than expected

Chinese is the only one of the four languages with **digits in target-role rows**: `19。`, `20。`,
`21。`, `80。`, `90。` as bare `target1` clips, plus `一百万。80。90。两点。十点。`,
`房间在三楼，709号房。` and `谢谢您。房间在三楼,308号。` — 12 digit rows in total. The category also
picks up `一共是十二英镑五十便士。` and `每四到六个小时一次,一天不要超过八片。`, which test counted
nouns and measure words rather than bare quantities. This is the strongest numbers coverage of the
four sets.

One near-miss worth recording: the first version of the wrong-script check threw those bare digit
rows away, because they contain no Han characters. The check now excludes a row only if it has
**letters** and none of them are in the target script, so digit-only rows stay. The purest digit
probe in the estate was nearly discarded by a rule meant to catch English.

### Chinese gaps

- **Two genuine wrong-language target rows.** `course_audio` `9b2ca25c…` (`target1`) and
  `dd908796…` (`target2`), both with `text = "to be quiet"`, both voiced by Mandarin voices
  (`azure_zh-CN-XiaoxiaoMultilingualNeural`, `azure_zh-CN-YunyiMultilingualNeural`). English text in
  a Chinese target slot, rendered by a Chinese voice. Worth a separate fix.
- **51 English pod-explainer rows filed under `language=zho` are NOT a defect** — the explainer
  speaks the known language by design. They are excluded from a target-voice benchmark for that
  reason. The first version of this report would have called all 58 rows broken; it would have been
  wrong, and the count is now split.
- **Proper nouns are very thin.** Outside 中文 (941), the corpus has 意大利 36, 英语 5, 法国 4,
  星期一 4, 星期六 3, 伦敦 3, 北京 2, 上海 1, and no 美国, 德国, 西班牙, 日本, 威尔士, 汉语 or 广东
  at all. Three of the eight slots are names in real sentences (北京, 英语, 法国); the other five are
  day-and-month drill rows, because the corpus has nothing better. Real gap, not padded.
- **`rerecord_wanted` and veracity are empty here too** (0 flags; 12 rows ever checked, 0 failures).
  Every Chinese hard case is rule-derived, same standing as Spanish.

---

## 4. What I did not do

- **No audio.** Phase 1 spends zero. Nothing in either file has been synthesised by anything.
- **No schema, category-set or generator redesign.** `schema_version` is still 1, the ten categories
  are unchanged, and everything added is an opt-in pack hook.
- **No native-speaker verification.** The pinyin readings, tone assignments and sandhi rules in the
  `zho` pack are mine, not a native reviewer's. They are standard textbook Mandarin and I am
  confident in them, but nobody has checked them and the file should not be treated as if somebody
  had. Same for the Spanish phonological notes. If a native reviewer is available before phase 2
  listening starts, the two packs are ~250 lines and would take under an hour to check.
- **`spa_for_jpn`, `spa_for_zho`, `zho_for_hin`, `zho_for_jpn`, `zho_for_tam`** all exist at beta
  and were not drawn from. The brief named spa_for_eng, spa_mx_for_eng and zho_for_eng, and within
  a target language the seed corpus is largely shared, so a fifth course buys little.
