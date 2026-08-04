# Yiddish → English — `yid_for_eng`

**Verdict: viable core, flagged edges.** The model handles core Yiddish well; the idiom edges and
the Hebrew/Aramaic lexical layer need escalation. **Ship-blocked until we find a native checker**
(none confirmed as of 2026-07-03). Adapted structurally from the German course, but Yiddish is
**not** "German in Hebrew script" — ~⅓ of the vocabulary isn't shared with German.

**Status:** Fable probe only. No DB rows, no LEGOs, no audio. Use `yid` (3-letter) if registered —
**never 2-letter `yi`** (breaks the direction regex).

Sources: [Wikipedia: Yiddish grammar](https://en.wikipedia.org/wiki/Yiddish_grammar) ·
[Yiddish orthography](https://en.wikipedia.org/wiki/Yiddish_orthography) · [YIVO](https://yivo.org/Yiddish-Alphabet) ·
Wiktionary verb entries · [Daytshmerish](https://en.wikipedia.org/wiki/Daytshmerish).

---

## 1. Orthography decision: Hebrew script (YIVO SYO) canonical + YIVO romanization alongside

Store Hebrew script in **YIVO standardized orthography (SYO)** as `target_text`, with **YIVO
romanization** in `target_text_roman` (the repo already has that column + a backfill pattern for 15
non-Latin `for_eng` courses — Yiddish slots straight in). Rationale: SSi is audio-first so the script
question is about display/DB/TTS, not the learning mechanism; romanization-only would match no
real-world Yiddish (all books/signage/media are Hebrew script); script-only leaves the English
learner unable to connect audio to text for the whole Hebrew-origin layer; YIVO romanization is
phonemically lossless, so it's also the safest review surface.

**YIVO vs Hasidic:** SYO (1935, Litvish-based) is the only self-consistent standard and matches all
teaching materials — use it. But nearly all *native daily* speakers are Hasidic/Haredi, who use
non-YIVO spellings (*אידיש* for *ייִדיש*) and Southern pronunciation. A Hasidic checker may "correct"
YIVO forms — brief them that YIVO is the intended convention. **Open question: does the target
audience skew academic/heritage (YIVO fine) or Hasidic-adjacent (reconsider pronunciation model)?**

Format: *ייִדיש* / *yidish* / Yiddish · *איך* / *ikh* / I · *משפּחה* / *mishpokhe* / family
(Hebrew-origin: etymological spelling, Ashkenazi pronunciation — never Modern-Hebrew *mishpacha*).

## 2. Where "just tweak the German" fails

- **~⅓ of vocab isn't German.** Hebrew/Aramaic layer replaces everyday "German" words:
  *efsher* (maybe, not *vielleicht*), *mishpokhe* (family), *afile* (even), *mistome* (probably),
  *emes* (truth). Slavic layer: *zeyde/bobe* (grandpa/grandma), *take* (indeed). This is exactly
  where a German-primed model produces wrong-but-plausible output.
- **`redn` is "to speak"**, not *shprekhn* — the latter is **daytshmerish** (Germanised Yiddish that
  native speakers reject). Daytshmerish contamination is the **#1 risk** for a German-adapted course.
- **No preterite** — past is periphrastic only (*ikh hob geredt*).
- **Three cases, no genitive**; masc acc/dat collapse to *dem*.
- **V2 even in subordinate clauses**: *ikh veys az er **redt yidish*** (not German-style verb-final
  *az er yidish redt*). Modal + infinitive are adjacent (*ikh vil redn yidish mit dir*), no German bracket.
- **Periphrastic/light-verb constructions** with Hebrew participles, no German counterpart:
  *maskem zayn* (agree), *khasene hobn* (marry), *lib hobn* (love).
- **Required double negation** (*keyner iz nisht geven* "nobody was there").
- **False friends**: *darfn* = must/need (German *dürfen* = be allowed — near-opposite);
  *kenen* = both "can" and "know a language"; *shul* = synagogue.

## 3. Core verb forms (present) — script / YIVO

- **veln (want)**: איך וויל *ikh vil* · דו ווילסט *du vilst* · ער וויל *er vil* · מיר ווילן *mir viln* · איר ווילט *ir vilt* · זיי ווילן *zey viln*
- **veln (future aux, irregular)**: איך וועל *ikh vel* · **דו וועסט *du vest*** · **ער וועט *er vet*** · מיר וועלן *mir veln* · איר וועט *ir vet* · זיי וועלן *zey veln*
  ⚠ **`vil` (want) vs `vel` (future) — one vowel apart, the whole course lives on this minimal pair.**
  Future is *vest/vet*, NOT *velst/velt* (those belong to an unrelated verb "to boil milk").
- **redn (speak)**: איך רעד *ikh red* · דו רעדסט · ער רעדט · מיר רעדן · איר רעדט · זיי רעדן
- **zayn (be)**: איך בין *ikh bin* · דו ביסט · ער איז · מיר זענען *mir zenen* · איר זענט · זיי זענען ⚠ *zenen/zent* vs *zaynen/zayt* — pick one course-wide
- **pruvn (try)**: איך פּרוּוו *ikh pruv* · דו פּרוּווסט · ער פּרוּווט · מיר פּרוּוון (doublet *prubirn*; *tsu*-complement unconfirmed)
- **kenen (can/know)**: איך קען *ikh ken* · דו קענסט · ער קען · מיר קענען
- **darfn (need/must)**: איך דאַרף *ikh darf* · דו דאַרפֿסט · ער דאַרף · מיר דאַרפֿן

Pronouns: *ikh, du* (informal sg — course default), *ir* (formal + plural; acc/dat *aykh*), *mir* (we
— ⚠ also the dative of "I"). Negation: **nisht** course-wide (not *nit*); indefinites take *keyn*.

## 4. Seeds 1–10 (Fable candidate — SYO + YIVO, not native-verified)

| # | English | Yiddish (SYO) | YIVO roman | Conf. | Flag |
|---|---|---|---|---|---|
| 1 | I want to speak Yiddish with you now | איך וויל איצט רעדן ייִדיש מיט דיר | ikh vil itst redn yidish mit dir | HIGH | — |
| 2 | I'm trying to learn | איך פּרוּוו זיך צו לערנען | ikh pruv zikh tsu lernen | MED-HIGH | check A (`pruvn tsu`) |
| 3 | how to speak as often as possible | ווי אַזוי צו רעדן וואָס אָפֿטער | vi azoy tsu redn vos ofter | LOW-MED | **YES** — "as often as possible" idiom |
| 4 | how to say something in Yiddish | ווי אַזוי צו זאָגן עפּעס אויף ייִדיש | vi azoy tsu zogn epes af yidish | HIGH | — |
| 5 | I'm going to practise speaking with someone else | איך וועל פּראַקטיצירן רעדן מיט עמעצן אַנדערש | ikh vel praktitsirn redn mit emetsn andersh | LOW-MED | **YES** — "practise" verb weak; *khazern*? |
| 6 | I'm trying to remember a word | איך פּרוּוו זיך צו דערמאָנען אַ וואָרט | ikh pruv zikh tsu dermonen a vort | MED | **YES** — `zikh dermonen` valency (check B) |
| 7 | I want to try as hard as I can today | איך וויל הײַנט פּרוּוון אַזוי שטאַרק ווי איך קען | ikh vil haynt pruvn azoy shtark vi ikh ken | LOW-MED | **YES** — idiom for "try as hard as I can" |
| 8 | I'm going to try to explain what I mean | איך וועל פּרוּוון צו דערקלערן וואָס איך מיין | ikh vel pruvn tsu derklern vos ikh meyn | MED-HIGH | check A |
| 9 | I speak a little Yiddish now | איך רעד איצט אַ ביסל ייִדיש | ikh red itst a bisl yidish | HIGH | — |
| 10 | I'm not sure if I can remember the whole sentence | איך בין נישט זיכער צי איך קען זיך דערמאָנען דעם גאַנצן זאַץ | ikh bin nisht zikher tsi ikh ken zikh dermonen dem gantsn zats | MED | **YES** — check B; *tsi* vs *oyb*; *dermonen* vs *gedenken* |

Solid as-is: **1, 4, 9** (core verified vocab + syntax), 8 modulo check A. Baked-in course
decisions: *nisht*, informal *du*, no daytshmerish, no German reflexive-dative in seed 10.

## 5. Opus-escalation guidance — two construction rulings clear most flags

- **Check A — `pruvn tsu` + infinitive** (seeds 2, 6, 8; bare *pruvn* in 7). Fable's one "attestation"
  turned out to be a separable prefix, not the complementizer — so conjugation is verified but the
  *tsu*-complement pattern is not. One native confirmation clears three seeds. Also confirm clitic
  placement (*pruv **zikh** tsu lernen*).
- **Check B — `zikh dermonen` valency** (seeds 6, 10): direct object (*a vort*) vs prepositional
  (*on/in a vort*); and whether seed 10 wants *gedenken* (retain) over *dermonen* (call to mind) —
  a real semantic split English "remember" hides.

Seed-level: **3** ("as often as possible" — *vos ofter* vs calque-risk *azoy oft vi meglekh*);
**5** ("practise" — no verified verb; Hebrew-layer *khazern/aynkhazern* may be what a native teacher
says); **7** (idiom choice, high-leverage since it's a repeated seed); **10** (*tsi* vs *oyb*).

**Daytshmerish scan** (the key cheap defect catcher): whenever Yiddish output looks like transliterated
German for a Hebrew/Slavic-layer concept, escalate — *shprekhn* (→*redn*), *filaykht* (→*efsher*),
*zogar* (→*afile*), *אידיש* spelling, doubled consonants, Modern-Hebrew vowels (*shalom*→*sholem*).

## 6. Native-checker / open items
- YIVO vs Hasidic audience skew (pronunciation model).
- Post-verb constituent order in "speak Yiddish with you"; *zenen/zaynen*; *nit/nisht* (locked *nisht*).
- Check A & B above; *pruvn* vs *prubirn*.
- **Unicode canonical form** — pasekh tsvey yudn has 3 encodings, digraphs וו/יי/וי have single+two-char
  forms; decide one and test against the `text_normalized` trigger + TTS before any DB load.
- **TTS is unsolved** — a multilingual model fed Hebrew script likely reads it as Modern Hebrew (wrong
  vowels). Voice recording or heavy SSML testing needed; flag before any audio planning (cost-gated).
- Every Hebrew-script string above should be eyeballed by a Yiddish reader before it enters the DB.
