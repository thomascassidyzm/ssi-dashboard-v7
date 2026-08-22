# Learner-facing copy surfaces — the inventory

**2026-08-19.** Every piece of prose a learner (or a teacher, or a school admin) reads in the
learning app: where it physically lives, how many words it is, whether it is translated, and
what it would be worth making editable.

This is the first half of the ruling Tom made after the How This Works editor landed: *"We need
this protocol for all coms that appear in the learning app."* The second half — the generalised
machinery, and the next surface live behind it — is at the bottom.

**How it was made.** Three workers read `ssi-learning-app` in parallel (the player and its
overlays; the Library, onboarding and settings; the edges — schools, emails, errors, i18n). I
synthesised, resolved their disagreements against the code, and built the machinery. Every number
below came from counting, not estimating; where a count is soft the report says so.

**Not re-derived.** `ssi-learning-app/docs/htw-coverage-inventory-2026-08-18.md` already enumerates
learner-facing UI *elements* and whether each needs a walkthrough. That asks "what needs
explaining"; this asks "where does editable prose live". Cited, not repeated.

---

## The five things that decide the size of this job

**1. The app is essentially not translated — but not for the reason you would guess.**
There are 22 locale files, not 18. `eng.json` is the single source of truth and the silent
fallback for all the others. But it holds only **365 keys / ~916 words**, against **~10,080 words
of hardcoded English** in templates alone. Roughly **90% of learner-facing prose is hardcoded
English**, and every `t()` call in the entire app lives under `components/` — not one in `views/`,
`containers/`, `insight/` or `missions/`.

**2. "i18n-keyed" is not a synonym for "translated" here.** `modes` (12 keys), `brand` and
`firstBoot` are missing from *every* non-English locale. `resting` is missing 10 of its 18 keys.
`phase` is missing its longest string. `useI18n.ts` falls back to English silently, so these render
in English with no error — the app looks translated and is not, precisely where the warmest copy
lives. Any editing surface has to show which of the two a string actually is.

**3. Over half the translated dictionary is dead.** ~159 of 273 non-language keys have zero
references anywhere in source, yet have been translated into 21 languages. `download`, `report`,
`home`, `profile`, `driving`, `onboarding`, `browser`, `app` are entirely orphaned. (Soft number:
the test is a literal key-string match, so a runtime instrument should confirm before anyone
deletes.)

**4. The biggest body of learner prose is not in the repo at all.** Aran's spoken meta-cognitive
track — the between-rounds talks and encouragements — lives in `shared_audio` in the database:
**~10,000 English words**, already translated into 71 languages, **with recorded audio against
every row**. That last clause is the whole story: a text edit there changes nothing the learner
hears. An editor that let someone reword an instruction without flagging "the learner still hears
the old recording" would be actively harmful.

**5. A second copy editor already exists in the estate.** `/admin/onboarding` is a working,
DB-backed, live-editable page over the `onboarding_messages` table (7 messages, 668 words, all
`active=false`, no sender built). Its own header comment reads *"Content as data, editable without
a deploy."* Someone independently arrived at the same pattern Tom has now made standard. **Two
copy editors in one estate fails the "simpler" leg.** Reconciling them is an architectural
decision, and it is the one thing in this document I would put in front of Tom. See "Needs you".

---

## The inventory

Ranked across the whole app. "Mechanism" is where the words physically are.

| # | Surface | Where it lives | Mechanism | Words | Reader, and when | Translated? | Worth making editable? |
|---|---|---|---|---:|---|---|---|
| **1** | **How this works / Why this works** — the app's whole documentation layer | `explainer/learnerExplainers.ts:91-254`; rendered by `components/me/HowThisWorksLearner.vue`, `WhyThisWorks.vue` (which hold 12 and 3 words of chrome between them) | HARDCODED, in a dedicated prose module | 1,131 | Any learner, from the Library, when they choose to find out what the method is | **ENGLISH-ONLY** | **Done — this is the reference row**, live at popty.app/htw-copy. Prose separated from pixels; the shape everything else should copy |
| **2** | **The little walks a learner can ask for** — the six guided walks: where you are, choose something else, go back over something, reading the course list, what your numbers mean, save your progress | `walkthrough/pack.json` (18 walks; 6 carry `personas:['learner']`), 19 steps. Overlay in `components/admin/WalkOverlay.vue` — the directory name lies, it is the learner's overlay | HARDCODED, in a versioned, compile-gated JSON pack | 755 | Every learner who taps a question in the Library; the app then points at real things on their own screen | **ENGLISH-ONLY** | **Highest-value gap, and now DONE** — see below. The htw export explicitly declined to include it, so Aran has half the story |
| **3** | **Aran's between-rounds talks** — the 48 ordered instruction pieces | DB `shared_audio`, `audio_type='instruction'`; fetched `providers/CourseDataProvider.ts:728-763` | **DATABASE** | **8,054** | Every learner, mid-session, between rounds — unskippable, the app's main voice | **TRANSLATED — 71 languages**, 3,396 rows, **every row has recorded audio** | Highest value by volume and the hardest. Needs a different pipe *and* a re-record consequence attached to every save |
| **4** | **Aran's encouragements** — the 50-strong random pool | DB `shared_audio`, `audio_type='encouragement'`; `CourseDataProvider.ts:771-796` | **DATABASE** | 1,954 | Every learner, between rounds, randomly | **TRANSLATED — 71 languages**, same audio coupling | High, and the easier of the two DB surfaces: short, self-contained, tone-carrying |
| **5** | **The Settings screen** | `components/SettingsScreen.vue:1370-2401` | **MIXED** — 42 `t()` calls over the `settings` namespace, everything else hardcoded | 760 hardcoded **+** 217 translated | Every signed-in learner, via the gear | **SPLIT, in the same visual list** | **The biggest body of hardcoded prose a learner actually reaches**, and it is consequential: reset-progress and delete-account warnings, the microphone privacy sentence, the £15/£25 price lines. Two defects: "lego sequences" and "LEGO info" ship internal vocabulary to learners |
| **6** | **The code doors and sign-in** — redeem an invite, join a group, the OTP dance | `views/RedeemCode.vue:695-1064`; `components/auth/SignInModal.vue:303-537`; `AuthPrompt.vue` | HARDCODED (RedeemCode has zero `t()`) | 956 | A learner at their most fragile moment — a pupil typing a code, someone waiting on an email a school filter ate | **ENGLISH-ONLY** | High value, low volume. "School email filters often block these codes outright…" is exactly the copy nobody reviews and everybody reads |
| **7** | **The paywall** — "You've reached the end of the free preview / £15/month" | `LearningPlayer.vue:15231-15252` | HARDCODED | **47** | Any free learner hitting the ceiling — the highest-stakes commercial moment in the app | **ENGLISH-ONLY** — a Spanish-known learner reads English at the point of sale | **Cheapest high-value win in the estate.** Also: the price is hardcoded **twice** and is not read from Paddle, so a price change is a code deploy |
| **8** | **The offline download sheet + the lease-lapsed screen** | `LearningPlayer.vue:15075-15165` and `15256-15285` | HARDCODED | ~375 | Learner choosing what to carry offline; learner locked out when the 30-day lease ends | **ENGLISH-ONLY** (`eng.json` has a `download` section — nothing consumes it) | High. Densest explanatory prose in the player chrome, and the lapse screen is commercial *and* emotional |
| **9** | **The Library's own chrome** — header, guest banner, Activity stats, course cards, "Teach with SaySomethingin" | `components/BrowseScreen.vue:415-717`. Course *names* come from `courses.display_name` in the DB | MIXED (5 `t()` calls) | ~99 + DB names | Every learner who opens the app's main hub | Chrome English-only; language names translated | Small in words, enormous in leverage — micro-labels, several of which the coverage inventory flags as actively misleading (the "Words" stat is a seed ordinal, not words) |
| **10** | **Returning-learner + resting-state copy** — "Welcome back. Your brain remembers more than you think." | `LearningPlayer.vue:6596-6600`; `PlayerRestingState.vue:107`; `ProgressModal.vue:340-442` | MIXED — `resting.*` keys plus hardcoded belt-strip strings | ~107 | Learner returning after 3 / 7 / 30 days | **Nominally translated, actually English** — 10 of 18 keys missing everywhere | Good value: the app's warmest copy, currently half-shipped |
| **11** | **Phase coaching** — "get ready to speak", "listen carefully", "Just listen now — without effort but with attention, like listening to birdsong" | `LearningPlayer.vue:6999-7015`; `phase.*`, 4 keys | I18N KEYS | **25** | Every learner, every cycle — **the most-read words in the app by impressions** | 3 of 4 translated; the longest string is missing from every non-English locale | Very high value per word. Four strings, seen thousands of times each |
| **12** | **The schools / teacher dashboard** — class detail, school dashboard, setup wizard, teachers list, upgrade/seats, join codes, 13 surfaces | `views/schools/**` (10 files), `components/schools/**` (15) | HARDCODED, **zero `t()` calls in the entire tree** | **2,760** | **A teacher or school admin — never a learner.** Managing other people's learning, on a laptop, in a working day | **ENGLISH-ONLY without exception** — a teacher in Wales or Sri Lanka reads English | High for a paying customer. **The duplication is the argument**: "No classes yet" appears **12 times**; three other sentences appear 2–3× each, with nothing keeping them in step |
| **13** | **The admin / org-tree surfaces** — node home, user detail, structure, invites | `views/admin/**` (21 files), `components/admin/**` (30) | HARDCODED, zero `t()` | **2,282** | SSi admins **and real school/government admins** | **ENGLISH-ONLY** | The surprise of this inventory: more words than the schools tree, read by paying customers, and easy to dismiss as "internal" and miss |
| **14** | **The signup doors** — set up your school / start teaching / set up your organisation | `views/onboarding/Onboarding.vue:783-1307` | HARDCODED | 648 | A school admin, tutor or org leader at the moment of signing up and paying | **ENGLISH-ONLY** | Real prose, high commercial stakes — but founder-voice material, so it belongs under Tom's own prose rail rather than a general editor |
| **15** | **The onboarding email series** — 7 messages over a learner's first week | DB `onboarding_messages`; editor at `/admin/onboarding`; API `api/admin/onboarding-messages.ts` | **DATABASE, already editable** | 668 | A new learner, in their inbox — **except all 7 rows are `active=false` and no sender exists** | **ENGLISH-ONLY** | Already done, by a different editor. **This is the reconciliation decision** — see "Needs you" |
| **16** | **The invite email** | `api/_utils/inviteEmailTemplate.ts`; sent via Resend from `noreply@contact.saysomethingin.app` | HARDCODED | **~40** | A prospective learner or teacher, in their inbox, deciding whether to click | **ENGLISH-ONLY** | **Highest consequence-per-word in the estate.** Five strings |
| **17** | **The sign-in emails** — the 6-digit code every learner and teacher receives | **NOT IN THIS REPO.** Supabase Auth templates, edited in the Supabase dashboard. No `supabase/config.toml`, no template file anywhere; six live `signInWithOtp` call sites | **SUPABASE DASHBOARD** | **UNKNOWN** | Everyone, at the front door | Unknown | **The single most actionable gap.** Copy that escapes version control entirely, unreviewable in a diff, invisible to any machinery we build. Word count unknown because nobody in this job had dashboard access |
| **18** | **The listening and pronunciation overlay chrome** | `ListeningOverlay.vue:2004-2343` (**zero `t()` in 3,267 lines**); `PronunciationOverlay.vue:659-791`; `ProsodyFeedback.vue:128-136` | HARDCODED | ~64 | Learner in listening or pronunciation mode | **ENGLISH-ONLY** | Medium. "Length / Syllables / Shape" are the only words explaining what the feedback means |
| **19** | **The five interruption modals** — install, update, sign-in prompt, tester feedback, report issue | `InstallBanner.vue`, `PwaUpdatePrompt.vue`, `AuthPrompt.vue`, `TesterFeedback.vue`, `ReportIssueButton.vue` | HARDCODED in all five | ~74 | Learner interrupted mid-flow | **ENGLISH-ONLY** | Low-medium individually; they cluster, so one page could own all five |
| **20** | **The install guide** | `views/InstallGuide.vue:108-307` | HARDCODED | 159 | A learner told to install the PWA | **ENGLISH-ONLY** | Genuine step-by-step prose, and it describes *another vendor's* UI, which changes under us |
| **21** | **End-of-session + contribution copy** — "You're helping keep {language} alive." | `SessionComplete.vue:152-226`; `ProgressModal.vue:308-327` | I18N KEYS | ~123 | Every learner at session end; minority-language learners especially | **Genuinely translated, complete in all 22 locales** | Medium-high — mission copy for exactly the language-activist audience |
| **22** | **Error messages and empty states, app-wide** | ~120 client-side error strings across 33 files; ~309 distinct API error strings, of which perhaps 60–100 are shown verbatim to a person via `data.error \|\| '<fallback>'` | HARDCODED — **`eng.json` has no error section at all** | ~150–250 that matter, buried in 120 catch blocks | Everyone, at their worst moment | **ENGLISH-ONLY, all of it** | **Do not make the whole population editable.** Extract the shortlist by hand: sign-in failed, code expired, payment couldn't open, class couldn't be created, plus ~15 empty states |
| **23** | **Legal, methodology and marketing static pages** | `packages/player-vue/public/{terms,privacy,refunds,methodology,docs}/*.html` | STATIC HTML, **outside the SPA entirely** | 1,873 legal + 10,295 methodology + 12,508 docs | Anyone, before paying | **ENGLISH-ONLY** | Large but genuinely static. Needs a *different* mechanism; leave it out of the first cut rather than let it inflate the estimate |
| **24** | **PWA manifest + HTML meta** | `vite.config.js:214`; `packages/player-vue/index.html` | BUILD CONFIG / STATIC | ~37 | Search engines, and the home-screen icon | English-only | Tiny, but **the two descriptions disagree with each other** and one uses a hyphen where an em-dash belongs. Exactly the drift an editable surface exists to kill |
| **25** | **`/me` profile panels, and `/methodology`** | `views/me/ProfileView.vue` + 8 panels; `views/methodology/**` | HARDCODED | ~760 + 611 | **Nobody**, and **admins only**, respectively | English-only | **Do not build here.** `/me` is unlinked from every screen (grep returns nothing outside the router); `/methodology` is behind the admin guard |
| **26** | **Orphaned translated copy** | `locales/*.json`, all 22 files — `download`, `report`, `home`, `profile`, `driving`, `onboarding`, `browser`, `app` | I18N KEYS with **no consumer** | 163 English × 22 languages | Nobody | Translated, pointlessly | **Negative value.** The value is in deleting them — or in finding out whether `driving` and `onboarding` were features that got cut |

---

## Recommended rank order

**Done already:** #1 How this works (the reference row), and **#2 the six learner walks** — shipped
today, see below.

**Next three, in order, and cheap:**
1. **The paywall (#7)** — 47 words, one file, English-only, commercially load-bearing. Bring the
   price out of the code while you are there.
2. **The offline sheet and lease-lapse screens (#8)** — ~375 words, the densest explanatory prose
   in the player chrome.
3. **Phase coaching (#11)** — 25 words with the highest impressions in the entire product.

Those three plus the walks are one page each and share the machinery exactly.

**Then the two that need a decision before a page:**
4. **Aran's spoken track (#3, #4)** — 10,000 words, the app's main voice, and the only surface where
   editing text without re-recording audio would make things worse rather than better. It needs a
   "this line is now out of step with what the learner hears" state, which the current editor does
   not have.
5. **The Supabase auth emails (#17)** — before anything else, someone opens the dashboard and pastes
   the templates out so we know what they even say.

**Deliberately not first:** the schools and admin trees (#12, #13, 5,042 words) — a different reader
and a different register, so worth its own decision rather than being swept in; the static legal and
methodology HTML (#23) — needs a different mechanism; and the error population (#22) — extract a
shortlist, never the whole thing.

---

## What shipped today

**One Copy area in Popty**, generalised from the How This Works page rather than rebuilt:

- **popty.app/copy** — the index: every surface, with how much editing has happened to each.
- **popty.app/copy/&lt;doc-id&gt;** — an editor per surface, identical in behaviour to the one Aran
  already has: 16px textarea so phones do not zoom, autosave two seconds after typing stops, the
  four honest status states, an explicit Save button, a warning on close-with-unsaved-work, and the
  "What has changed" on-page diff against the frozen original.
- **popty.app/htw-copy** still works, unchanged, forever — that link is already in Aran's inbox.
- Storage is the same append-only table, keyed by the `doc_id` column that was already there. **No
  migration, no new column, and the frozen `htw` original row was never touched.**
- Adding the next surface is now a row in `api/lib/copy-docs.js` plus one seeding command — not a
  hand-built page.

**And the second surface is live: popty.app/copy/learner-walks** — the six guided walks (#2). It is
seeded byte-identically from the app's own walkthrough pack, flattened to one heading and one stable
key per string, so mapping the edits back into code is mechanical. The wiring — which element on
screen each step points at — is deliberately *not* in the document: that is not words.

Reading the edits back, from a terminal:

```bash
node tools/htw-copy/diff.cjs                 # How This Works
node tools/htw-copy/diff.cjs learner-walks   # the walks
node tools/htw-copy/diff.cjs --list          # every surface, with save counts
```

The founder content laws travel with the copy: the seed document's own header tells the editor that
**Easy/Fast**, the **no-streaks framing**, the **honest thirty-hours arc**, **no learner-facing
"lego" or "seed"**, and **British English** are settled — fine to raise, but they come back to Tom
rather than being silently applied or silently reverted.

---

## Needs you

**One decision, and it is genuinely architectural.** `/admin/onboarding` is a second, independently
built, DB-backed copy editor over `onboarding_messages` — 7 messages, 668 words, currently dormant.
It works, it is documented, and it predates the ruling. Two copy editors in one estate is the thing
that fails the "simpler" leg. The options are: fold it into the Copy area (one page, one pattern, one
place to look), leave it alone because its content is a send-pipeline concern rather than app copy,
or fold the *pattern* in and leave the page. My read: **fold it in** — it is the same thing wearing
a different hat, and the send pipeline doesn't exist yet, so nothing depends on the current page.
But it is somebody's shipped work and the call is yours.

---

## Explicit gaps

- **Nobody in this job could open the Supabase dashboard**, so the auth email templates (#17) are
  a genuine unknown — not an estimate, not an assumption. Somebody with dashboard access pasting
  them out is a half-hour job that materially changes this inventory.
- **The `shared_audio` word counts are real; the per-course welcome copy is not counted.** A
  `course_audio` query filtered on `role='welcome'` times out (Postgres 57014, unindexed
  predicate). Spot checks show welcomes exist and vary wildly — `spa_for_eng` ~100 words,
  `ita_for_eng` three words, `cym_for_eng` none.
- **`listening_pod_sentences.explainer_text` holds 11,577 rows of prose** with no reference
  anywhere in `player-vue`. Recorded as authoring-side data rather than a live copy surface — but
  it is a very large body of writing sitting one wire away from the learner, and it deserves a
  deliberate decision rather than an accident.
- **The "159 dead keys" figure is a good estimate, not a proof** — the test is a literal key-string
  match and cannot see runtime-assembled keys. Confirm with an instrument before deleting anything.
- **Nothing was exercised in a browser.** Every finding here is source- or database-grounded.
  Reachability claims (`/me` unlinked, `/methodology` admin-guarded) come from the router and
  repo-wide greps.
- **Template word counts undercount interpolated lines**, which are discarded by the extractors.
  The hardcoded totals are therefore floors, not ceilings.
- **The learning-app reads were taken from branch `a159-library-htw`**, which is where the
  walkthrough pack and the htw explainer work currently live — not `dev` and not `main`.
