# Fourteen languages admitted, Pennsylvania Dutch sealed

*2026-08-14 — both approved items applied, live and verified.*

Both halves of the scoping brief are landed on `main`, deployed to the machine
that runs Popty, and verified against the running services. Option C, as
recommended.

---

## What changed

**1. The guard admits fourteen languages it was only accidentally rejecting.**
`canonicalLanguage()` accepted a language only if the reference CSV gave it a
`database_code`. Thirteen rows gained that cell, and Cantonese gained a row:

    pdc  hak  nan  yue  yor  lmo  rgn
    vec  fur  nap  scn  roh  sme  yid

Nothing gained a TTS locale, so nothing gained a voice it does not have. The
database-side mirror (`language_canonical`) was regenerated from the same CSV by
the same canonicaliser and its 18 new rows applied live — the two copies were
never allowed to drift.

**2. Pennsylvania Dutch is human-voice-only**, on exactly Welsh's terms and by
exactly Welsh's mechanism. This is the half that makes the first half safe: as of
the first commit `pdc` can be **written** as a clip language; as of the second it
can never be **synthesised**.

---

## Verification — item 1

Run against the **production checkout the services actually load from**
(`ssi-dashboard-v7-clean-prod`), after the deploy and restart.

All fourteen resolve:

    pdc -> pdc    hak -> hak    nan -> nan    yue -> yue
    yor -> yor    lmo -> lmo    rgn -> rgn    vec -> vec
    fur -> fur    nap -> nap    scn -> scn    roh -> roh
    sme -> sme    yid -> yid

Nothing else moved. The full live language list — every distinct `known_lang` and
`target_lang` in the `courses` table, **73 languages** — was canonicalised before
and after the change and diffed:

| | |
|---|---|
| rejected before | 14 |
| rejected after | 0 |
| previously-resolving values that changed | **0** |

Spot checks, unmoved: `eng`→eng, `en`→eng, `en-GB`→eng, `zho`→zho, `cmn`→zho,
`zh`→zho, `pt-BR`→por, `fr-CA`→fra, `ar-LB`→ara, `cym`→cym, `glv`→glv,
`ell`→ell, `el`→ell.

Still throws on what is not a language: `auto`, `''`, `klingon` — the fail-open
bug the guard exists to prevent is untouched.

Database side, live: `language_canonical` went 184 → 202 rows, no existing row
changed, and `canonical_language('pdc')` = `pdc`, `('yue')` = `yue`,
`('rm')` = `roh`, `('en-GB')` = `eng`, `('pt-BR')` = `por`.

**The real proof**: real Pennsylvania Dutch course content now gets a clip
identity, which is what used to 400. Three LEGOs straight out of `pdc_for_eng`,
with a human voice:

    "ich will"  -> {language: pdc, text_normalized: "ich will", voice_id: human_doug}
    "schwetze"  -> {language: pdc, text_normalized: "schwetze", voice_id: human_doug}
    "Deitsch"   -> {language: pdc, text_normalized: "deitsch",  voice_id: human_doug}

Zero `course_audio` rows exist under any of the fourteen codes, confirmed live —
so there was nothing to migrate and nothing to reverse.

## Verification — item 2

Same prod checkout, same restarted services:

    isHumanVoiceCourse('pdc_for_eng')  true
    isHumanVoiceCourse('pdc_for_deu')  true    ← prefix rule, future courses
    isHumanVoiceLang('pdc')            true
    isHumanVoiceCourse('eng_for_pdc')  false   ← pdc as KNOWN side, still renderable
    isHumanVoiceLang('deu')            false   ← control

    renderableLangSql('c.target_lang'):
      (c.target_lang NOT IN ('cym','cym_n','cym_s','bre','pdc')
       AND c.target_lang !~ '^cym(_|$)' AND c.target_lang !~ '^pdc(_|$)')

    assertNoHumanVoiceInQueue([{lang:'spa'},{lang:'pdc'}]) → throws

And the one that matters — **a real request at the live phase 8 service**
(`POST localhost:3465/generate/pdc_for_eng`):

    {"skipped":true,"reason":"human-voice-only-course","courseCode":"pdc_for_eng","generated":0}

Byte-for-byte the answer Welsh gives:

    {"skipped":true,"reason":"human-voice-only-course","courseCode":"cym_n_for_eng","generated":0}

No runtime bypass exists — no env var, no `--force`. Reinstating pdc as
TTS-renderable is a code change to `services/shared/human-voice-courses.cjs` with
your sign-off, exactly like Welsh.

## Tests

`services/shared/clip-identity.test.js` and
`services/shared/human-voice-courses.test.js` — **47 passed, 0 failed**, with new
cases asserting the fourteen resolve, the four renamed manifest rows
(`rm`→roh, `se`→sme, `yi`→yid, `yo`→yor) resolve, and every pdc guard above.

Full suite: 1,763 passed. The 12 pre-existing failures are identical to the
baseline on `origin/main` measured by stashing these changes and re-running —
they are Vue component tests unrelated to this work, and this change introduced
none of them.

---

## Explicit gaps

- **No end-to-end phase 8 dry-run exists for the other thirteen languages.** All
  thirteen courses are `draft` with an **empty** `voice_config`, so `/generate`
  refuses them at "Course missing voice configuration" before it ever reaches the
  identity code. The guard is verified at the function and at the database, not
  through a full render path, because no course in those languages can currently
  reach one. pdc, the only one with any voice config, is now deliberately blocked.
- **`GET /api/estate-map` is timing out** — unrelated to this work, and worth
  knowing. The `estate_map()` SQL function takes **166 seconds**; the API's
  statement timeout is shorter, so the endpoint returns
  `canceling statement due to statement timeout`. It reads neither
  `language_canonical` nor `canonical_language`, and the timeout is not something
  this change introduced. Flagging it as found; I have not investigated it.
- **The human-write asymmetry from the scoping brief still stands.** The human
  recording path writes `course.target_lang` raw with no canonicalisation. For
  pdc that hole is now closed by accident — raw `pdc` and canonical `pdc` are the
  same string — but the asymmetry itself applies to every language and remains
  uninvestigated.
