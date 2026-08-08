# Pod recast — the 16 `eng_for_*` courses with corrupted stored casting

**2026-08-07 · A-95 pod redo, phase 1 part 1 · branch `docs/pod-redo-scope-2026-08-07`**

Tool: `tools/pod-recast.cjs`. Logs: `docs/pods/pod-recast-{dryrun,applied}-log.json`.

---

## 1. What was wrong — worse than §4a of the scope doc said

The scope doc reported that 16 `eng_for_*` courses cast their **target** (English) speakers on
xAI Chinese voices at `locale: "zh"`. That is true, and the **known** side is wrong too.

All 16 pods carry a **byte-identical copy of the `zho_for_eng` cast** — same 22 speaker labels,
same 5 target voices (`ara`, `jpi39icg`, `33g9t0jl`, `d18jlf6v`, `eve`, all `locale: zh`), same 7
known voices (`en-GB-SoniaNeural`, `leo`, `bedd6226`, …, all English). So:

- **target** = Chinese voices on English text (the phonology-gate killer the scope doc found), and
- **known** = English voices on Italian / German / Arabic / Japanese … known text.

`zho_for_eng`'s own pod-0 speakers block is identical to all 16. This is one copy-paste event, not
16 independent defects. Both tracks are corrected by the recast.

## 2. The tool

`tools/pod-recast.cjs` — dry-run by default, `--apply` to write.

- **Speaker labels come from the DB**: DISTINCT `speaker` on `listening_pod_sentences`, unioned with
  the keys of `listening_pods.speakers` (so a stored-only label never loses its voice). No markdown
  is parsed; no sentence row is created, deleted or edited.
- **One casting source**: `assignVoices()` from `tools/pod-sync.cjs`, which reads live
  `app_config.pod_voice_pools` and applies Aran's two-voice rule (commit `403718a3`) — one male +
  one female for the whole cast. Casting is not reimplemented here.
  `tools/pod-voice-coverage.cjs` / `pod-recolour.cjs` are deliberately **not** used: that static
  coverage map has diverged from the live pools.
- **MAKE BEFORE BREAK**: `--apply` writes `listening_pods.speakers` and nothing else. It never nulls
  `target_audio_id` / `known_audio_id`. There is no bulk regeneration in this phase, so nulling the
  links would strip working learner-facing audio with nothing to replace it. `pod-recolour.cjs` does
  null them — that is correct only when a regen follows immediately. This is a commented hard rule in
  the file header.
- **Drift guard**: the pod row is re-read immediately before the write and compared against the
  planned before-state; a mismatch aborts that pod with nothing written.

### The `langKey()` bug, worked around here — still live in `pod-sync.cjs`

`pod-sync.cjs`'s `langKey()` does `lang.toLowerCase().split(/[_-]/)[0]`, and `syncPod()` *already*
splits on `_` before calling `assignVoices`. So `ara_sy → ara`, `fra_ca → fra`, `por_br → por`,
`spa_mx → spa`. The live pool has **distinct `ara_sy` / `fra_ca` / `por_br` / `spa_mx` keys that are
therefore unreachable through pod-sync** — a Syrian-Arabic course is silently cast on the MSA pool.

We must not edit `pod-sync.cjs` (another worker owns it this session), so `pod-recast.cjs` corrects
it after the fact: `assignVoices()` resolves on the base key, then `remapExactPool()` re-points each
assignment at the **same rank** in the exact-code pool when the pool actually has that key. Rank is
preserved, so gender resolution and the two-voice rule are untouched.

**FOLLOW-UP REQUIRED:** the bug is still there inside `tools/pod-sync.cjs` itself (`langKey()` at
line 185, and the `.split('_')[0]` at lines 564-565). Any future `pod-sync` run on a regional course
will mis-cast it. The workaround lives only in `pod-recast.cjs`.

### Locale

`app_config.pod_voice_pools` carries **no `locale` field**, but phase-8's `buildPodTTSConfig` prefers
the stored `locale` over `toBcp47(language)`. The tool derives it from live data only, never invents:
Azure voice ids encode it (`en-GB-SoniaNeural → en-GB`); otherwise `toBcp47(lang)` if it is a real
2-letter primary subtag; otherwise the primary subtag borrowed from an Azure voice in the same pool
(this is what stops the Arabic known track being handed `toBcp47('ara') === 'ara'`, which is not a
BCP-47 tag); otherwise omitted, and logged as a warning.

## 3. Dry-run distribution — uniform, all 16

Every course: 1 pod (`<course>:pod-0`), 142 sentences, 22 speakers, **46 voice changes**
(22 speakers × 2 tracks + `_default` × 2). Distinct voices **target 5 → 2, known 7 → 2** everywhere.
No stored speaker was dropped; no locale warning fired on any course.

10 healthy · 6 blocked on a missing known-language pool — exactly the split §5 of the scope doc
predicted.

## 4. Applied — 10 courses, verified by re-reading the DB

Verification re-read `listening_pods.speakers` fresh after the write and asserted, per course:
exactly 2 distinct target voices, both `locale: en` **and both members of the live `eng` pool**;
exactly 2 distinct known voices, both members of that course's own known-language pool.

| Course | target (2, locale `en`) | known (2) | known locale | verdict |
|---|---|---|---|---|
| `eng_for_ara` | `gfzdpspr5fdp`, `bedd6226` | `5f0c2251`, `025a38c5` | `ar` | PASS |
| `eng_for_deu` | `gfzdpspr5fdp`, `bedd6226` | `e1fc5a89`, `44c91d64` | `de` | PASS |
| `eng_for_fra` | `gfzdpspr5fdp`, `bedd6226` | `fr-FR-CelesteNeural`, `fr-FR-HenriNeural` | `fr-FR` | PASS |
| `eng_for_hin` | `gfzdpspr5fdp`, `bedd6226` | `a00ce99a`, `bcf738e4` | `hi` | PASS |
| `eng_for_ita` | `gfzdpspr5fdp`, `bedd6226` | `57700f39`, `43423dee` | `it` | PASS |
| `eng_for_jpn` | `gfzdpspr5fdp`, `bedd6226` | `ja-JP-MayuNeural`, `ja-JP-NaokiNeural` | `ja-JP` | PASS |
| `eng_for_kor` | `gfzdpspr5fdp`, `bedd6226` | `d74461c6`, `ko-KR-YuJinNeural` | `ko`, `ko-KR` | PASS |
| `eng_for_por` | `gfzdpspr5fdp`, `bedd6226` | `pt-PT-DuarteNeural`, `pt-PT-RaquelNeural` | `pt-PT` | PASS |
| `eng_for_spa` | `gfzdpspr5fdp`, `bedd6226` | `d2313a0d`, `f2f41225` | `es` | PASS |
| `eng_for_zho` | `gfzdpspr5fdp`, `bedd6226` | `9ab26871`, `e521cc67` | `zh` | PASS |

Target voices are the live `eng` pool's first female (`bedd6226`, "Olivia", xAI) and first male
(`gfzdpspr5fdp`, "Tom", xAI).

**Audio links untouched, verified:** all 16 pods — the 10 applied and the 6 untouched — still show
139 target + 139 known audio ids across 142 sentences. The 3 unlinked sentences per pod are
pre-existing (identical count on the untouched courses), not caused by this pass.

## 5. EXPLICIT GAP — 6 courses still corrupted

`eng_for_ben`, `eng_for_guj`, `eng_for_pan`, `eng_for_sin`, `eng_for_tam`, `eng_for_urd`.

`app_config.pod_voice_pools` has **no `ben`/`guj`/`pan`/`sin`/`tam`/`urd` key**, so there is no known
voice to cast at all; `pod-recast.cjs` refuses them rather than guessing. They still carry the full
`zho_for_eng` copy on both tracks and would fail 100% of clips on any re-render.

A second worker is creating those 6 pools now. **When the pools land, this is a one-liner:**

```
node tools/pod-recast.cjs --apply --courses=eng_for_ben,eng_for_guj,eng_for_pan,eng_for_sin,eng_for_tam,eng_for_urd
```

Nothing else about the 6 needs doing, and no pool was created by this pass.

## 6. Surprises

1. **The corruption is both-track and a single copy-paste event**, not target-only as §4a recorded.
   The known side of all 16 is English on non-English text.
2. **The pools carry no `locale`**, yet phase-8 reads one; every healthy course in the estate has a
   locale that came from the *stale* coverage map via `pod-recolour.cjs`. Recasting from the live
   pools alone would have written no locale at all and quietly changed xAI steering — hence the
   derivation rules in §2. Worth a proper `locale` column in `pod_voice_pools` as its own follow-up.
3. **`assignVoices` defaults 8 of the 22 labels to male** on the name heuristic (Narrator, Customer,
   Customer 1/2/3, Passenger, Assistant, Learner). Harmless under the two-voice rule — everyone of a
   gender lands on the same voice — but it means the male voice carries the majority of the cast.
   Not changed here; that is `pod-sync`'s call, not the recast's.
