# en-ga.json — course config for a non-local agent

This is the exported **course config** for the SaySomethingin Irish course
(`en-ga`: known = English, target = Irish/Gaeilge). It is a single ~33 MB JSON
file, `en-ga.json`, sitting next to this README. It is a self-contained snapshot
— you do **not** need Supabase, S3, or any other repo to read it. Everything
below describes exactly what is in the file.

> Reading tip: at 33 MB, don't cat it into an LLM context. Use `jq` (or a
> streaming parser) to pull the slices you need. Paths below are `jq` paths.

## Top level

```
{
  "id":      "en-ga",     // course code
  "known":   "en",        // language the learner already knows
  "target":  "ga",        // language being taught (Irish)
  "status":  "published",
  "version": "1.3.4",
  "introduction": { … },  // the course-intro presentation clip (audio meta)
  "slices":  [ { … } ]    // the course body — this course has ONE slice
}
```

- `known` / `target` are ISO-ish language codes. **Vocabulary is described as
  known / target** in this methodology — never "source". Every phrase the
  learner hears is a `known → target` pair.
- `introduction` is `{cadence, duration, id, role}` — audio metadata for the
  spoken course intro (`role: "presentation"`, `id` = the audio asset id).

## A slice — `.slices[0]`

```
{
  "id", "version",
  "seeds":  [ … ],              // 511 ordered teaching units (the spine)
  "samples": { … },            // audio-clip index, keyed by target sentence text
  "orderedEncouragements": [], // 48 motivational spoken items, played in order
  "pooledEncouragements":  [], // 26 items, drawn from randomly
  "paywallEncouragements": []  // items gated behind the paywall (empty here)
}
```

### `seeds` — the teaching spine (`.slices[0].seeds[]`)

Seeds are **ordered**; array position is teaching order. Each seed:

```
{
  "id": "<UUID>",
  "seed_sentence": { "canonical": "If I speak {target} now." },  // template, {target} is the slot
  "node": { "id", "known": {…}, "target": {…} },                 // the seed's headline known/target pair
  "introduction_items": [ … ]                                    // the legos taught in this seed
}
```

Each **introduction_item** introduces one "lego" (a chunk/building block) and
then drills it:

```
{
  "id",
  "node":  { "id", "known": {…}, "target": {…} },  // the lego's DEBUT form (first time it's shown)
  "nodes": [ { "id", "known": {…}, "target": {…} }, … ],  // practice PHRASES that use this lego
  "presentation": "The Irish for 'I want', is: ... 'tá mé ag iarraidh' ..."  // spoken teaching text
}
```

- `introduction_item.node` = the lego's debut (a fragment, e.g. `if` → `má`).
- `introduction_item.nodes[]` = the practice phrases built from that lego
  (full utterances). This is where the bulk of the course lives — ~13,455
  practice phrases across the whole course.

### The known/target node shape

Every `known` and `target` value is:

```
{
  "lemmas": ["if","i","want","to","speak"],   // dictionary forms, for matching
  "text":   "If I want to speak",              // the display / spoken string
  "tokens": ["if","i","want","to","speak"]     // surface tokens
}
```

Use `.text` for what the learner reads/hears; `lemmas`/`tokens` are for
alignment and lookup.

### `samples` — the audio index (`.slices[0].samples`)

An object **keyed by the target-language sentence text**. Each value is an array
of clip descriptors:

```
"Má labhraím Gaeilge anois": [
  { "cadence": "natural", "duration": 4.056, "id": "<AUDIO-UUID>", "role": "target1" },
  { "cadence": "natural", "duration": 3.744, "id": "<AUDIO-UUID>", "role": "target2" }
]
```

- Look up a phrase's audio by its **target text** (the `target.text` from a
  node). `role` distinguishes the voices (`target1` / `target2`); `id` is the
  audio asset id.

## Handy jq recipes

```bash
# course metadata
jq '{id,known,target,status,version}' en-ga.json

# how many seeds
jq '.slices[0].seeds | length' en-ga.json

# every debut lego, in teaching order (known → target)
jq -r '.slices[0].seeds[].introduction_items[].node
        | "\(.known.text)  →  \(.target.text)"' en-ga.json

# all practice phrases for a given seed index (e.g. seed 2)
jq -r '.slices[0].seeds[2].introduction_items[].nodes[]
        | "\(.known.text)  →  \(.target.text)"' en-ga.json

# find the audio clips for one target sentence
jq '.slices[0].samples["Má labhraím Gaeilge anois"]' en-ga.json
```

## Notes / gotchas

- **This is a read-only export.** The live source of truth for course content
  is Supabase (`course_seeds` / `course_legos` / `course_practice_phrases` /
  `course_audio`), not this file. If the DB changes, this snapshot will drift —
  it's `version` 1.3.4 as exported.
- `seed_sentence.canonical` uses a literal `{target}` placeholder; the concrete
  target string lives in the seed's `node`/`nodes`, not by substituting the
  template.
- Irish orthography includes fadas (á é í ó ú) and lenition/eclipsis — keep the
  file UTF-8; don't normalize or strip diacritics.
