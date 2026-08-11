# Casting state across all 73 listening pods — against the two-voice rule

**11 Aug 2026. Read-only survey.** No database write, no audio, nothing triggered on popty.app.
Every number below comes from one script, committed beside this doc as
`docs/pods/scope-scout-2026-08-11/casting-state-survey.cjs`, run against the live database; its raw
per-pod output is `docs/pods/scope-scout-2026-08-11/casting-state.json`.

---

## The headline

**Three courses in the estate have a cast of record at all.** `courses.voice_config.podCast` is
non-empty on exactly `cym_n_for_eng`, `cym_s_for_eng` and `zzz_test_for_eng` — 3 of 144 courses.
The other 141 have no `podCast` key with content in it.

So the question the brief asks — "what does the cast of record say, what does the pod map say, do
they agree?" — has an answer for four real pods and one test pod. **For the other 68 pods there is
nothing to disagree with: `listening_pods.speakers` is the only casting that exists**, written by
generation-side colouring, never by a person choosing a cast.

That reframes class (B). The Welsh-class mismatch — a real named cast in `podCast` and stale ids in
`speakers` — **can only occur on a course that has a `podCast`. Only Welsh did, and f0a90a5f fixed
it. Class (B) is empty. There are no cheap metadata-only fixes waiting.**

The estate's actual shape is: 41 pods on two target voices, 30 pods on 3–6, 2 pods on none.

---

## 1. Where the definitions live

`castFlags` is a Vue `computed` in the dashboard PodLab page:

**`src/views/admin/PodLab.vue:1355`** (on `origin/main`; added in `3ad2073e`, "casting approval
lives in PodLab, on the surface Tom uses"). It sits on top of three helpers in the same file:

| helper | line | what it does |
|---|---|---|
| `canonSpeakerName` | 1254 | strips parentheticals — "Friend (7 pm)" and "Friend" are one cast key |
| `resolveSpeakerVoice` | 1257 | `speakers[label] → {name, voice_id, provider, locale, gender}` per track; falls back to `_default`; legacy top-level shape counts as `target`, provider defaults to `xai` |
| `voiceKey` | 1276 | `provider\|voice_id\|locale` — **this is what "distinct voice" means** |
| `castRows(track)` | 1334 | one row per distinct voice, with its labels, line count and **line share** |

`castFlags` itself raises, in order: labels resolving to **no** target voice (bad); **`voiced.length !== 2`**
(bad — "Aran's rule is a two-hander"); if exactly two, **genders must include one `f` and one `m`**
(bad); target voices steered at a **locale that isn't the course's target language** (bad, via
`ISO3_TO_ISO1` at 1309); locale uncheckable (warn); known-track locale wrong (warn); and **line share
— two voices at ≥70/30 is flagged bad**, otherwise reported `ok`.

My survey script re-implements those five functions verbatim, so what follows is what the product
itself would say on each pod. Two definitional caveats that matter for reading the numbers:

- **Gender in `castFlags` is the *character's* gender, not the voice's.** `resolveSpeakerVoice`
  reads `entry.gender`, which is the speaker's marker. When one voice reads several characters,
  the gender PodLab attributes to that voice is whichever character it resolved through first.
  Worked example: `nor_for_eng:pod-0` shows `nb-NO-PernilleNeural` as **male** — Pernille is a
  female Azure voice reading Waiter (m), Barista (f), Narrator (n) and Bartender (m).
- **The two-voice rule bites on the TARGET track only.** The known track gets a locale check and
  nothing else. 34 pods carry **7** distinct known voices and 2 carry **8**; that is untouched by
  the rule as written.

The Welsh alignment tool is `tools/pod-cast-align-to-people.cjs` (commit `f0a90a5f`, branch
`fix/welsh-cast-two-voice-2026-08-11`). It refuses outright unless `podCast` covers every speaker
label on every pod of the course — which is why it cannot be pointed at any other course today.

---

## 2. Classification — the counts

| class | meaning | pods | courses |
|---|---|---|---|
| **A — agree, two voices, clean** | `podCast` and `speakers` name the same two voices | **4** | 2 (`cym_n_for_eng`, `cym_s_for_eng`) |
| **B — Welsh-class mismatch** | real named cast vs stale/placeholder ids | **0** | 0 |
| **C — agree, >2 target voices** | a cast of record deliberately holding 3+ | **0** | 0 |
| **D — genuinely uncast** | no target voice resolves at all | **2** | 2 |
| **E — no cast of record; `speakers` is the only casting** | `podCast` empty | **67** | 63 |
| ├ E-clean-2 | exactly 2 target voices, m+f, share under 70/30 | 19 | 19 |
| ├ E-skew-2 | exactly 2 target voices, **line share ≥70/30 → bad** | 18 | 18 |
| └ E-multi | 3–6 target voices | 30 | 29 |

Distribution of distinct target voices across all 73 pods: **0 → 2 pods, 2 → 41, 3 → 3, 4 → 4,
5 → 18, 6 → 5.**

### Class D — genuinely uncast (named, actionable)

| pod | what's there |
|---|---|
| **`fin_for_eng:pod-0`** | 142 lines, 23 characters, **27 speaker labels resolve to no target voice and none to a known voice**; zero audio of any kind. `voice_config.voices` does hold a course voice set (`target1` = `human_kai_fin`, `target2` = `sal`), but `listening_pods.speakers` is empty of voices, so the pod is unrenderable as it stands. |
| **`zzz_test_for_eng:pod-0`** | the e2e test course. 6 lines, 2 labels, both unvoiced in `speakers`; `podCast` holds the two e2e human voices and 6 target clips exist against them. Test fixture, not product — exclude from any sweep. |

**`fin_for_eng` is the only real class-D course**, and it is not blocked for want of voices: the xai
pod pool carries **4 Finnish voices, 2 female and 2 male** (`tools/pod-voices-xai.json`, key `fi`).
It has never been cast, that's all.

### Class A — the four Welsh pods

`cym_n_for_eng` and `cym_s_for_eng`, `pod-0` and `pod-0-unrecorded` each. Two human voices
(Aran + Catrin), genders m+f, line share 62/38 on the 232-line pods, `podCast` (23 entries) and
`speakers` in exact agreement. The only flag is `target_locale_unknown` (warn) — human voice entries
carry no `locale`, so PodLab can't check it and says so. The two `pod-0` rows hold 0 sentences (the
gated placeholders), so they have no share to report.

---

## 3. Why 30 pods show 3–6 target voices

**It is neither a deliberate multi-character cast nor copy-paste drift. It is one generation-side
template, applied per language before the two-voice rule existed** (Tom's ruling is 2026-07-17;
default-two is 2026-08-06).

The proof is that the *line-share signature* repeats identically across unrelated languages:

| share signature | pods |
|---|---|
| `39/33/12/10/6` | 11 — por_br, swe, ara, dan, hin, zho (×2), fra (×2), tur, jpn |
| `33/32/12/10/7/6` | 5 — deu (×2), nld, pol, kor |
| `35/33/18/12/2` | 3 — spa (×2), ita |
| `35/33/18/14` | 3 — spa_mx, por, ara_eg |

Same character-to-voice-count mapping, different locales. **25 of the 30 multi-voice pods include at
least one of the five shared "house" xai voices** (`ara`, `eve`, `rex`, `sal`, `leo`) alongside
language-specific ids — e.g. `deu_for_eng` runs Lena/Moritz/Clara/Niklas (German xai ids) *plus*
`ara` and `eve` covering two characters each. That is the 4–5-colour solver doing its job, not a
casting decision anybody made per course.

**Human vs TTS — the rule bites differently.** Every multi-voice pod is TTS: xai (25 pods), Azure
(`cat`, `fra_ca`, `nor`), or a mixed Azure+ElevenLabs cast (`hrv_for_eng:pod-0`). **No human-recorded
cast anywhere in the estate holds more than two voices.** For a human cast, "more voices" means more
people to recruit and schedule and the rule protects the recording effort — that's the community-course
argument in `pods-cast.cjs:32-50`. For a TTS cast, extra voices cost nothing to *assign*; the cost is
**re-rendering** on a cut, and it lands on the audio-generation gate:

**Cutting a multi-voice pod to its top two voices would strand 41–71 already-rendered target clips
per pod** (of 142). Measured against each clip's own `course_audio.voice_id`, not the cast label:
`fra_ca_for_eng` 58 off-cast, `tha_for_eng` 71, `cat_for_spa` 31 (the lightest), median ~48.
**Across the 29 real multi-voice courses that is roughly 1,400 target clips to re-render.** No such
run should start without a plan and Tom's approval.

Two things inside the multi-voice group that are genuinely off, not just multi:

- **`fra_ca_for_eng:pod-0` — 3 male voices and 1 female** (Jean, Antoine, Thierry, Sylvie). Whatever
  the voice count, that's a cast, not a conversation.
- **`nor_for_eng:pod-0` — `nb-NO-PernilleNeural`, a female voice, reads Waiter and Bartender.**
  Cross-gender casting the flags can't see, because the gender check only runs when there are
  exactly two voices.

---

## 4. The 18 two-voice pods that still fail — line-share skew

These already satisfy "exactly two, one male one female" and fail `castFlags` on share alone:

- **16 × `eng_for_*`** — every `eng_for_*` pod in the estate (ara, ben, deu, fra, guj, hin, ita,
  jpn, kor, pan, por, sin, spa, tam, urd, zho) all at **f 23% / m 77%**, cast Tom (`gfzdpspr5fdp`) + Olivia (`bedd6226`). One
  shared English cast, one shared skew — it is the same defect written 16 times, and one decision
  fixes all of them.
- **`ara_sy_for_eng`** 28/72, **`heb_for_eng`** 21/79 — both Azure two-handers.

Nothing here needs re-recording: the skew is which character each voice was given, and it is a
`speakers` edit of the same shape as the Welsh fix. It *would* invalidate any approval on record and
re-render the affected lines.

---

## 5. Taste calls for Tom — flagged, not decided

**T1. Cutting 5–6 voices to 2 is a product regression, not a repair, on at least three pods.**
`tha_for_eng` (31 characters), `ita_for_jpn` (24) and `hrv_for_eng:pod-1` (29) carry more characters
than the 23-character norm. Everywhere else the pods have 22–23 characters covered today by 5 voices;
two voices means one voice reading 13–15 characters. Welsh proves that's acceptable to you when the
voices are people — it is a different call when it costs ~1,400 TTS re-renders across 29 courses to
achieve it.

**T2. Languages where no two-voice pair exists at the needed quality.** Checked against both
registries the code uses — `voices` (Supabase, 190 rows) and `tools/pod-voices-xai.json`:

| language | what exists | note |
|---|---|---|
| **`cym` Welsh** | 9 rows in `voices`, incl. Azure `cy-GB-Aled`/`cy-GB-Nia`, plus the human ids | **no Welsh voices in the xai pod pool**; Welsh pods are human by design. The T-14 doc's "cym isn't in the pod voice pool at all" is right about the *pod* pool, and Azure Welsh TTS does exist in `voices` if you ever wanted a stopgap — which I'd expect you to refuse. |
| **`ita` Italian, `es` Spanish (xai)** | **0 female** language-specific xai voices each (it: 4m; es: 4m) | today's female roles are filled by the multilingual house voices `ara`/`eve`. A strict "two native-locale voices" reading has no female Italian or Spanish xai voice to reach for. |
| **`fin` Finnish** | 4 xai (2f/2m); **no Finnish voice in the `voices` table at all** | castable from the pod pool; the registry gap is real and worth knowing. |
| `eng` in `voices` | 24 rows | plentiful; the `eng_for_*` skew is a casting choice, not scarcity. |

**T3. `fin_for_eng` — cast it or leave it dark?** It is the one course with content and no casting
and no audio. One sentence either way.

**T4. Does the two-voice rule apply to the known track?** It is not checked today. 34 pods run 7
known voices, 2 run 8. If the rule is about how many people a learner hears, the known side is
half the pod.

---

## 6. Per-pod table

Class key: **A** agree/two/clean · **B** mismatch · **C** agree/>2 · **D** uncast ·
**E-clean/E-skew/E-multi** no cast of record.

| pod | lines | chars | target voices | provider | podCast entries | podCast voices | share f/m | audio tgt/known | class | bad flags |
|---|---|---|---|---|---|---|---|---|---|---|
| `ara_eg_for_eng:pod-0` | 142 | 23 | 4 | xai | 0 | 0 | 47/53 | 142/142 | E-multi | not_two_voices |
| `ara_for_eng:pod-0` | 142 | 23 | 5 | xai | 0 | 0 | 45/45/10 | 142/142 | E-multi | not_two_voices |
| `ara_sy_for_eng:pod-0` | 142 | 23 | 2 | azure | 0 | 0 | 28/72 | 142/142 | E-skew | line_share |
| `bul_for_eng:pod-0` | 142 | 23 | 2 | azure | 0 | 0 | 49/51 | 142/142 | E-clean | — |
| `cat_for_eng:pod-0` | 142 | 23 | 3 | azure | 0 | 0 | 35/65 | 142/142 | E-multi | not_two_voices |
| `cat_for_spa:pod-0` | 142 | 23 | 3 | azure | 0 | 0 | 39/61 | 142/142 | E-multi | not_two_voices |
| `cym_n_for_eng:pod-0` | 0 | 22 | 2 | human | 23 | 2 | — | 0/0 | A | — |
| `cym_n_for_eng:pod-0-unrecorded` | 232 | 22 | 2 | human | 23 | 2 | 62/38 | 87/23 | A | — |
| `cym_s_for_eng:pod-0` | 0 | 22 | 2 | human | 23 | 2 | — | 0/0 | A | — |
| `cym_s_for_eng:pod-0-unrecorded` | 232 | 22 | 2 | human | 23 | 2 | 62/38 | 0/0 | A | — |
| `dan_for_eng:pod-0` | 142 | 23 | 5 | xai | 0 | 0 | 45/45/10 | 142/142 | E-multi | not_two_voices |
| `deu_at_for_eng:pod-0` | 232 | 23 | 2 | xai | 0 | 0 | 50/50 | 100/102 | E-clean | — |
| `deu_for_eng:pod-0` | 142 | 23 | 6 | xai | 0 | 0 | 51/39/10 | 142/142 | E-multi | not_two_voices |
| `deu_for_jpn:pod-0` | 142 | 23 | 6 | xai | 0 | 0 | 51/39/10 | 142/142 | E-multi | not_two_voices |
| `ell_for_eng:pod-0` | 142 | 23 | 2 | azure | 0 | 0 | 49/51 | 142/142 | E-clean | — |
| `eng_for_ara:pod-0` | 142 | 23 | 2 | xai | 0 | 0 | 23/77 | 139/142 | E-skew | line_share |
| `eng_for_ben:pod-0` | 142 | 23 | 2 | xai | 0 | 0 | 23/77 | 139/142 | E-skew | line_share |
| `eng_for_deu:pod-0` | 142 | 23 | 2 | xai | 0 | 0 | 23/77 | 139/142 | E-skew | line_share |
| `eng_for_fra:pod-0` | 142 | 23 | 2 | xai | 0 | 0 | 23/77 | 139/142 | E-skew | line_share |
| `eng_for_guj:pod-0` | 142 | 23 | 2 | xai | 0 | 0 | 23/77 | 139/142 | E-skew | line_share |
| `eng_for_hin:pod-0` | 142 | 23 | 2 | xai | 0 | 0 | 23/77 | 139/142 | E-skew | line_share |
| `eng_for_ita:pod-0` | 142 | 23 | 2 | xai | 0 | 0 | 23/77 | 139/142 | E-skew | line_share |
| `eng_for_jpn:pod-0` | 142 | 23 | 2 | xai | 0 | 0 | 23/77 | 139/142 | E-skew | line_share |
| `eng_for_kor:pod-0` | 142 | 23 | 2 | xai | 0 | 0 | 23/77 | 139/142 | E-skew | line_share |
| `eng_for_pan:pod-0` | 142 | 23 | 2 | xai | 0 | 0 | 23/77 | 139/142 | E-skew | line_share |
| `eng_for_por:pod-0` | 142 | 23 | 2 | xai | 0 | 0 | 23/77 | 139/142 | E-skew | line_share |
| `eng_for_sin:pod-0` | 142 | 23 | 2 | xai | 0 | 0 | 23/77 | 139/142 | E-skew | line_share |
| `eng_for_spa:pod-0` | 142 | 23 | 2 | xai | 0 | 0 | 23/77 | 139/142 | E-skew | line_share |
| `eng_for_tam:pod-0` | 142 | 23 | 2 | xai | 0 | 0 | 23/77 | 139/142 | E-skew | line_share |
| `eng_for_urd:pod-0` | 142 | 23 | 2 | xai | 0 | 0 | 23/77 | 139/142 | E-skew | line_share |
| `eng_for_zho:pod-0` | 142 | 23 | 2 | xai | 0 | 0 | 23/77 | 139/142 | E-skew | line_share |
| `est_for_eng:pod-0` | 142 | 23 | 2 | azure | 0 | 0 | 51/49 | 142/142 | E-clean | — |
| `eus_for_eng:pod-0` | 142 | 23 | 2 | azure | 0 | 0 | 51/49 | 142/142 | E-clean | — |
| `eus_for_spa:pod-0` | 142 | 23 | 2 | azure | 0 | 0 | 51/49 | 142/142 | E-clean | — |
| `fas_for_eng:pod-0` | 142 | 23 | 2 | azure | 0 | 0 | 51/49 | 142/142 | E-clean | — |
| `fin_for_eng:pod-0` | 142 | 23 | 0 | — | 0 | 0 | — | 0/0 | D | unvoiced_labels not_two_voices |
| `fra_ca_for_eng:pod-0` | 142 | 23 | 4 | azure | 0 | 0 | 18/82 | 142/142 | E-multi | not_two_voices |
| `fra_for_eng:pod-0` | 142 | 23 | 5 | xai | 0 | 0 | 45/45/10 | 142/68 | E-multi | not_two_voices |
| `fra_for_jpn:pod-0` | 142 | 23 | 5 | xai | 0 | 0 | 45/45/10 | 142/142 | E-multi | not_two_voices |
| `gle_for_eng:pod-0` | 142 | 23 | 2 | azure | 0 | 0 | 51/49 | 142/142 | E-clean | — |
| `heb_for_eng:pod-0` | 142 | 23 | 2 | azure | 0 | 0 | 21/79 | 142/142 | E-skew | line_share |
| `hin_for_eng:pod-0` | 142 | 23 | 5 | xai | 0 | 0 | 45/45/10 | 142/142 | E-multi | not_two_voices |
| `hrv_for_eng:pod-0` | 142 | 23 | 5 | azure/elevenlabs | 0 | 0 | 51/39/10 | 142/142 | E-multi | not_two_voices |
| `hrv_for_eng:pod-1` | 180 | 29 | 2 | azure | 0 | 0 | 43/57 | 180/180 | E-clean | — |
| `hye_for_eng:pod-0` | 142 | 23 | 2 | azure | 0 | 0 | 51/49 | 142/142 | E-clean | — |
| `isl_for_eng:pod-0` | 142 | 23 | 2 | azure | 0 | 0 | 49/51 | 142/142 | E-clean | — |
| `ita_for_eng:pod-0` | 142 | 23 | 5 | xai | 0 | 0 | 45/53/2 | 142/142 | E-multi | not_two_voices |
| `ita_for_jpn:pod-0` | 142 | 24 | 5 | xai | 0 | 0 | 46/51/2 | 142/142 | E-multi | not_two_voices |
| `jpn_for_eng:pod-0` | 142 | 23 | 5 | xai | 0 | 0 | 45/45/10 | 142/142 | E-multi | not_two_voices |
| `kor_for_eng:pod-0` | 142 | 23 | 6 | xai | 0 | 0 | 51/39/10 | 142/142 | E-multi | not_two_voices |
| `lav_for_eng:pod-0` | 142 | 23 | 2 | azure | 0 | 0 | 39/61 | 142/142 | E-clean | — |
| `lit_for_eng:pod-0` | 142 | 23 | 2 | azure | 0 | 0 | 39/61 | 142/142 | E-clean | — |
| `nep_for_eng:pod-0` | 142 | 23 | 2 | azure | 0 | 0 | 51/49 | 142/142 | E-clean | — |
| `nld_for_eng:pod-0` | 142 | 23 | 6 | xai | 0 | 0 | 51/39/10 | 142/142 | E-multi | not_two_voices |
| `nor_for_eng:pod-0` | 142 | 23 | 3 | azure | 0 | 0 | 44/56 | 142/142 | E-multi | not_two_voices |
| `pol_for_eng:pod-0` | 142 | 23 | 6 | xai | 0 | 0 | 51/39/10 | 142/141 | E-multi | not_two_voices |
| `por_br_for_eng:pod-0` | 142 | 23 | 5 | xai | 0 | 0 | 45/45/10 | 142/142 | E-multi | not_two_voices |
| `por_for_eng:pod-0` | 142 | 23 | 4 | xai | 0 | 0 | 47/53 | 142/142 | E-multi | not_two_voices |
| `ron_for_eng:pod-0` | 142 | 23 | 2 | azure | 0 | 0 | 49/51 | 142/142 | E-clean | — |
| `spa_for_eng:music` | 749 | 3 | 2 | xai | 0 | 0 | 51/49 | 0/376 | E-clean | — |
| `spa_for_eng:pod-0` | 142 | 23 | 5 | xai | 0 | 0 | 45/53/2 | 142/133 | E-multi | not_two_voices |
| `spa_for_eng:pod-0-unrecorded` | 232 | 23 | 2 | xai | 0 | 0 | 65/35 | 119/83 | E-clean | — |
| `spa_for_eng:travel-situations` | 72 | 6 | 5 | xai | 0 | 0 | 39/40/21 | 0/0 | E-multi | not_two_voices |
| `spa_for_jpn:pod-0` | 142 | 23 | 5 | xai | 0 | 0 | 45/53/2 | 142/142 | E-multi | not_two_voices |
| `spa_mx_for_eng:pod-0` | 142 | 23 | 4 | xai | 0 | 0 | 47/53 | 142/142 | E-multi | not_two_voices |
| `swa_for_eng:pod-0` | 142 | 23 | 2 | azure | 0 | 0 | 51/49 | 142/142 | E-clean | — |
| `swe_for_eng:pod-0` | 142 | 23 | 5 | xai | 0 | 0 | 45/45/10 | 142/142 | E-multi | not_two_voices |
| `tha_for_eng:pod-0` | 142 | 31 | 5 | xai | 0 | 0 | 59/41 | 142/142 | E-multi | not_two_voices |
| `tur_for_eng:pod-0` | 142 | 23 | 5 | xai | 0 | 0 | 45/45/10 | 142/142 | E-multi | not_two_voices |
| `ukr_for_eng:pod-0` | 142 | 23 | 2 | azure | 0 | 0 | 49/51 | 142/142 | E-clean | — |
| `zho_for_eng:pod-0` | 142 | 23 | 5 | xai | 0 | 0 | 45/45/10 | 142/142 | E-multi | not_two_voices |
| `zho_for_jpn:pod-0` | 142 | 23 | 5 | xai | 0 | 0 | 45/45/10 | 142/142 | E-multi | not_two_voices |
| `zzz_test_for_eng:pod-0` | 6 | 0 | 0 | — | 3 | 2 | — | 6/0 | D | unvoiced_labels not_two_voices |

---

## 7. Explicit gaps

- **I did not verify what any pod sounds like.** Everything here is metadata; no clip was played.
- **`castFlags`' locale check reports `unknown` for every human voice** (they carry no `locale`),
  so the Welsh pods' locale correctness is unproven by this survey either way.
- **`courses.voice_config.podCastVoices` — the opt-in "I meant 3–5 voices" declaration — is set on
  zero courses.** So I cannot distinguish "leader opted into 5 voices" from "nobody ever looked" via
  the field designed to record it; the share-signature evidence in §3 is what I have instead.
- **`GET /cast` collapses a >2-voice `podCast` to two on load and writes the collapse back**
  (`services/voice-engine/pods-router.cjs:207-238`). It reads `podCast`, not `speakers`, so it has
  never fired on the 30 multi-voice pods — their voices live only in `speakers`. Worth knowing before
  anyone assumes opening PodLab fixes anything.
- **`spa_for_eng:travel-situations` (5 voices, 72 lines, zero audio) and `spa_for_eng:music`
  (749 lines, 2 voices, known audio only)** are non-pod-0 content; I classified them with everything
  else but did not investigate what they are for.
- The `hrv_for_eng:pod-1` cast mixes Azure and ElevenLabs providers on one pod. Counted, not judged.
