# T-21: the casting page called every production voice male — the generator, not the store

*Diagnosis, 2026-08-17. Read-and-diagnose only: nothing was written to `listening_pods`,
`course_audio`, `app_config.pod_voice_pools` or `pod_voice_approvals`, and no audio was generated.*

The listening page **[Pod casting: every language, one listen](https://watson-1.tail4968cb.ts.net/d/afdcc743)**
labels all 41 of its "In production now" entries **male**. Twenty of those 41 are female.

## 1. Which layer was wrong: the generator

**The store is correct. Every store is correct.** The generator printed "male" without asking any of them.

The canonical voice-metadata store is the **`voices` table** — 302 rows, `gender` column under a
`CHECK (gender IN ('f','m'))`, filled on 2026-08-11 straight from xAI's own API
(`metadata_source = 'xai:GET /v1/tts/voices/{id}'`). Queried for every production voice on the page,
matching bare and `xai_`-prefixed spellings:

```
ara          | Ara        | f     | xai:GET /v1/tts/voices/{id}
eve          | Eve        | f     | xai:GET /v1/tts/voices/{id}
247783ebdd51 | Noor       | f     | xai:GET /v1/tts/voices/{id}
3a7889066fa2 | Lena       | f     | xai:GET /v1/tts/voices/{id}
23be42535a45 | Ji-yeon    | f     | xai:GET /v1/tts/voices/{id}
1b12d5daee6b | Aleksandra | f     | xai:GET /v1/tts/voices/{id}
```

Three further independent stores agree, and not one of them says male:

- `tools/pod-voices-xai.json` — `multilingual` has ara=f, eve=f; `nl` has Noor=f; `de` has Lena=f;
  `ko` has Ji-yeon=f; `pl` has Aleksandra=f.
- `app_config.pod_voice_pools` — `cat.f` contains `ca-ES-AlbaNeural` ("Alba"), which the page prints
  as *male*. The generator printed her **name**, so it had a record in hand that keys her under `f`.
- `listening_pods.speakers` — `deu_for_eng` stores `3a7889066fa2` as `{name: "Lena", gender: "f"}`.

**There is no store anywhere that records these voices as male.** The label was manufactured at print
time. Three further facts pin it to the generator:

1. **`course_audio` has no gender column.** The production block is derived from `course_audio`
   (voice ids + clip counts), so the generator had *no* gender to carry through from its own data
   source and had to look one up. It did not.
2. **The official-pool block, on the same page, is 100% correct** — see §4. That block's gender comes
   free from the pools' `f`/`m` keys, structurally. Where gender was structural the page is right;
   where gender needed a lookup the page is uniformly "male". That is a defaulting signature.
3. **41 of 41, with no exceptions**, including a voice whose friendly name the generator resolved
   from a record that files her under `f`. A store defect would be patchy; this is categorical.

The renderer that produced the clips, `tools/pod-cast-sample-render.cjs`, is **not** the culprit and
needs no change. It takes gender from an input brief's explicit `m`/`f` cast seats and emits a render
log — it never writes markdown and never invents a gender. Its documented `seatFor` behaviour
(unmarked `n` falls to the male seat, as pod-sync does) is deliberate and correct.

## 2. What was fixed — EXPLICIT GAP: the generator is unrecoverable

**No code fix was made, because the faulty code no longer exists and never did exist in a repo.**

Established by search, not assumed:

- The page was published from `/home/tomcassidy/SSi/wt-pods-2026-08-14/docs/pods/pod-casting-listening-page-2026-08-14.md`
  (`published_docs` row `afdcc743`), committed as `2cd3a093` on branch `docs/pods-end-to-end-2026-08-14`.
- **That commit contains the markdown and nothing else** — one file, 1,009 insertions. The generator
  and its brief were never committed.
- The producing job (`9540e054`, "pods end-to-end") ran with cwd = the main repo. Neither that repo's
  gitignored `scripts/` workspace nor the worktree contains any pod-casting page builder; the
  worktree has no `scripts/` directory at all.
- An estate-wide search for the 41-language brief and its render log finds only the earlier Spanish
  A/B pair (`docs/pods/spa-cast-sample-2026-08-11.brief{,-render-log}.json`). The 41-language brief
  and log are gone.
- `git log --all` for a casting page builder: nothing. No deleted file to recover.

Per the brief, I did not invent a replacement or hunt beyond these repos.

**I also checked whether any *live* code path repeats the defect, and it does not.** The one
`gender === 'f' ? 'female' : 'male'` ternary in the pod path (`services/voice-engine/pods-cast.cjs:561`)
is reached only inside a loop over `report.genderMismatches`, which `tools/pod-voice-colour-n.cjs:240`
pushes to only when both genders are known `'f'`/`'m'`. Neutral and unknown cannot reach it. Nothing
to fix there, so nothing was touched.

The practical consequence: **the published page cannot be trusted for gender and should be read
alongside the table in §3.** Any future build of this page must resolve gender from the `voices`
table (matching bare *and* `xai_`-prefixed spellings), falling back to `pod_voice_pools` / 
`pod-voices-xai.json`, and must render *unknown* as unknown rather than as male — Azure voices in
`voices` currently carry a NULL gender, which is exactly the input that produced this defect.

## 3. The mislabel list

Twenty of the 41 production rows are wrong, across seven distinct voices. Tom caught four by ear;
three more were found by this pass — **Ji-yeon (Korean), Aleksandra (Polish) and Alba (Catalan)**.

| Voice id | Friendly name | Doc said | Truth | Languages affected (as printed on the page) |
|---|---|---|---|---|
| `ara` / `xai_ara` | Ara | male | **female** | ara, zho, dan, fra, hin, jpn, por_br, swe, tha, tur (10) |
| `eve` / `xai_eve` | Eve | male | **female** | ara_eg, ita, por, spa, spa_mx (5) |
| `247783ebdd51` | Noor | male | **female** | nld |
| `3a7889066fa2` | Lena | male | **female** | deu |
| `23be42535a45` | Ji-yeon | male | **female** | kor |
| `1b12d5daee6b` | Aleksandra | male | **female** | pol |
| `ca-ES-AlbaNeural` | Alba | male | **female** | cat |

The remaining 21 production rows (19 distinct voices) are correctly labelled male: Khalid
`70013edeb8e8`, Rex `rex` (ara_eg, por, spa_mx), Jian `jpi39icg`, Kasper `0ih5oi34`, Thijs
`a13662ba951c`, Remi `0p0rt7o1`, Enric `ca-ES-EnricNeural`, Jean `fr-CA-JeanNeural`, Moritz
`41321eb41295`, Karan `89q2pnko`, Enzo `x7avnu1k`, Ren `b1a7441b97a1`, Jun-seo `bf9fe5b5f981`,
Mateusz `37329fd8895a`, Mateus `abfbdf26f115`, Manuel `yis75yfp`, Axel `e22152e06fd8`, Krit
`908c4626660f`, Emre `670a0c3ac005`.

Corrected, the page reads **21 male / 20 female** — the near-clean pair per language you would expect,
which is itself a check on the result.

**`sal` does not appear in the production block at all**, so its known gender-neutral ambiguity is not
in play here and nothing was changed for it.

### Blast radius — confirmed, and wider than the page shows

The page's per-language attribution is confirmed exactly: `ara` in 10 languages, `eve` in 5, `rex` in
3. But the page lists only the top two pod voices per language. Estate-wide, counting both spellings,
`course_audio` shows these voices reach much further:

| Voice | Courses | Pod clips | All clips |
|---|---|---|---|
| `ara` (**f**) | 35 | 2,228 | 70,680 |
| `eve` (**f**) | 37 | 1,742 | 162,906 |
| `rex` (m) | 20 | 461 | 1,283 |
| `247783ebdd51` Noor (**f**) | 1 | 182 | 341 |
| `3a7889066fa2` Lena (**f**) | 2 (deu_for_eng, deu_for_jpn) | 168 | 361 |
| `23be42535a45` Ji-yeon (**f**) | 1 | 165 | 307 |
| `1b12d5daee6b` Aleksandra (**f**) | 1 | 144 | 284 |
| `ca-ES-AlbaNeural` Alba (**f**) | 2 (cat_for_eng, cat_for_spa) | 78 | 5,692 |

Two female multilingual voices are carrying pod work in 35 and 37 courses respectively. Any casting
decision taken from the page's male labels would be reasoning about the wrong half of the estate.

## 4. The second inventory: `app_config.pod_voice_pools`

The page's two blocks come from two different inventories, which is why one prints friendly names and
the other prints raw ids.

**Official pool** = the `pod_voice_pools` key in the **`app_config`** table. 46 languages, each
`{ f: [...], m: [...] }`, every entry `{ name, provider, voice_id }`. Gender is the *key*, not a
field — so the block is correct by construction, and friendly names are sitting right there to print.
This is the inventory the page calls "what the config says".

Verified, not assumed: all 82 official-pool rows checked against the store — **0 gender mismatches,
0 provider mismatches**. The four rows with no own pool entry (ara_eg ×2, deu_at ×2) correctly inherit
the parent language's pool (Youssef/Yasmin from `ara`, Felix/Sonja from `deu`). Corroborated
independently by the 2026-08-11 xAI metadata pass
(`docs/voice-engine/pod-cast/xai-voice-metadata-applied-log.json`), which checked 47 pool slots
against xAI's own API and found `pool_mismatch: 0`.

This also settles the naming puzzle. `pod_voice_pools` genuinely does not hold the names in
`tools/pod-voices-xai.json` — the pools' `da` block is Kasper/Lars/Ida while the page prints
Mads/Astrid; `zh-CN` is Jian/Hao/Xia against Wei/Hui; `nl` is Thijs/Femke/Noor/Ruben against
Bas/Lieke. `pod_voice_pools` is the curated **casting** pool and `pod-voices-xai.json` is the xAI
**catalogue**; they are different inventories with different memberships, and only the pools carry
provider-neutral Azure entries.

**In production now** = an aggregate over `course_audio` (voice ids and clip counts per course). That
table stores no name and no gender, which is precisely why the block prints raw ids and why its
gender had to be looked up — and was not.

---

*Verified by direct SQL against `voices`, `app_config`, `course_audio` and `listening_pods`, and by
reading `tools/pod-voices-xai.json`, `tools/pod-cast-sample-render.cjs` and the published markdown of
doc `afdcc743`. No table was written.*
