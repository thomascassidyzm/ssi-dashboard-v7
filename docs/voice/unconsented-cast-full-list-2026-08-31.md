# Unconsented cast voices — the full list

**9 voices, 2073 cast sites**, currently cast in the estate with no valid consent on record.

Read-only census. Nothing here changed the database. Reproduced from the two tools named in
`docs/voice/consent-hard-block-2026-08-31.md` §2, plus a full (non-truncated) export of every
individual cast site — the summary tool caps its printout at 40 sites per voice; this does not.
The full machine-readable list is `docs/voice/unconsented-cast-full-list-2026-08-31.json`.

**"When" caveat, stated plainly:** nothing in this schema records the moment an individual role
or speaker leg was cast. The `when` given per site is the *container's* `updated_at` —
`courses.voice_config.updatedAt` for course roles/podCast, `listening_pods.updated_at` for pod
speaker legs — which is an **upper bound** on the cast date (the container may have been
touched by something unrelated after the cast), never the cast date itself. Where a course or
pod has no `updated_at`, that is marked `unknown` rather than guessed.

## Coverage — what this does and does not see

Cast surfaces checked, per the doc: `courses.voice_config` (roles), `courses.voice_config.podCast`
(speakers), `voice_language_roles` (0 rows — re-verified below, not assumed), `listening_pods.speakers`
(known/target legs per speaker). All four are queried directly against the live DB by
`tools/voice/census-unconsented-cast-voices.cjs`, which this report's full export re-runs without
its 40-per-voice print cap. **Not covered by the two named tools, checked separately below:**
`course_audio.voice_id` — already-rendered clips (see the dedicated section). **Not covered at
all in this census:** anywhere a voice id might be hardcoded in application code rather than data
(that's a code grep, not a DB census); and any table outside the ones named here that this session
did not independently discover.

**Re-verified**: `voice_language_roles` holds 0 rows at the time of this run — confirmed directly, not assumed from the prior doc.

**One cast surface the two census tools do not enumerate, found and checked separately:**
`course_audio.voice_id` — already-rendered clips. This is not a *cast* site (nothing here is a
config assignment a human made), it's *output* already produced by one, and the consent-hard-block
doc (§5) already names "serving already-rendered audio" as a known, deliberate gap — pulling
shipped audio is destructive and Tom's decision, not this census's. Counted here so the number is
on record rather than assumed small:

| Voice | Rendered `course_audio` rows |
|---|---:|
| `gfzdpspr5fdp` | 183194 |
| `human_aran_cym_n` | 107 |
| `human_catrinlliar_cym_n` | 56 |
| `human_aran_cym_s` | 0 |
| `human_catrinlliar_cym_s` | 0 |
| `human_tom_zzz` | 13 |
| `human_test_f_zzz` | 0 |
| `human_sasha_wanasky_deu_at` | 225 |
| `human_kai_fin` | 44 |

`gfzdpspr5fdp` alone accounts for 183,194 of the estate's 2,597,473 `course_audio` rows (7.1%).
This count is **not** included in the headline cast-site total below — that total answers the
brief's question (where is each voice *cast*), and this answers a different, adjacent one (what
has already been *rendered* from those casts).

## Headline

| Voice | Consent | What it is | Total sites | Courses touched |
|---|---|---|---:|---:|
| `gfzdpspr5fdp` | not_recorded | clone | 1826 | 60 |
| `human_aran_cym_n` | no voices row | human recordist (no row) | 82 | 2 |
| `human_catrinlliar_cym_n` | no voices row | human recordist (no row) | 58 | 2 |
| `human_aran_cym_s` | no voices row | human recordist (no row) | 56 | 1 |
| `human_catrinlliar_cym_s` | no voices row | human recordist (no row) | 44 | 1 |
| `human_tom_zzz` | no voices row | human recordist (no row) | 3 | 2 |
| `human_test_f_zzz` | no voices row | human recordist (no row) | 2 | 2 |
| `human_sasha_wanasky_deu_at` | no voices row | human recordist (no row) | 1 | 1 |
| `human_kai_fin` | not_recorded | human | 1 | 1 |

## `gfzdpspr5fdp` — 1826 site(s)

- voices row: type=`tts`, consent_status=`not_recorded`, metadata_source=`human-known: Tom's own voice clone (en-GB male); xAI clone id, absent from the by-id catalogue`, display_name=`Tom`, created=`Sat Jul 04`

### courses.voice_config — 20 site(s)

- `deu_for_eng` / `known` — updated `2026-08-07`
- `deu_for_eng` / `presentation` — updated `2026-08-07`
- `eng_for_ara` / `target2` — updated `2026-06-19`
- `eng_for_ben` / `target2` — updated `2026-07-31`
- `eng_for_guj` / `target2` — updated `2026-06-19`
- `eng_for_hin` / `target2` — updated `2026-07-31`
- `eng_for_jpn` / `target2` — updated `2026-06-19`
- `eng_for_kan` / `target2` — updated `2026-07-07`
- `eng_for_mar` / `target2` — updated `2026-07-06`
- `eng_for_pan` / `target2` — updated `2026-06-19`
- `eng_for_sin` / `target2` — updated `2026-06-19`
- `eng_for_tam` / `target2` — updated `2026-06-19`
- `eng_for_tel` / `target2` — updated `2026-07-06`
- `eng_for_urd` / `target2` — updated `2026-06-19`
- `eng_for_zho` / `target2` — updated `2026-06-19`
- `fra_ca_for_eng` / `known` — updated `2026-07-28`
- `fra_for_eng` / `known` — updated `2026-08-07`
- `fra_for_eng` / `presentation` — updated `2026-08-07`
- `por_br_for_eng` / `known` — updated `2026-07-28`
- `spa_mx_for_eng` / `known` — updated `2026-07-28`

### listening_pods.speakers — 1806 site(s)

**ara_eg_for_eng** — 51 site(s) across 3 pod(s)

- `ara_eg_for_eng:pod-0-retired-2026-08-22` (19 legs, updated `2026-08-23`): Assistant.known, Bartender.known, Customer 1.known, Customer 2.known, Customer 3.known, Customer.known, Driver.known, Friend.known, Guest.known, James.known, Learner.known, Local.known, Narrator.known, Neighbour.known, Passenger.known, Pharmacist.known, Tourist.known, Waiter.known, _default.known
- `ara_eg_for_eng:pod-1` (17 legs, updated `2026-08-24`): Assistant.known, Barista.known, Bartender.known, Cafe Customer 1.known, Cafe Customer 2.known, Cafe Customer 3.known, Friend.known, Guest.known, Interlocutor.known, James.known, Local.known, Narrator.known, Neighbour.known, Passenger.known, Pharmacist.known, Staff.known, Waiter.known
- `ara_eg_for_eng:pod-1-retired-2026-08-24` (15 legs, updated `2026-08-24`): Assistant.known, Barista.known, Bartender.known, Cafe Customer 1.known, Cafe Customer 2.known, Cafe Customer 3.known, Friend.known, Guest.known, James.known, Local.known, Narrator.known, Neighbour.known, Passenger.known, Pharmacist.known, Waiter.known

**ara_for_eng** — 50 site(s) across 3 pod(s)

- `ara_for_eng:pod-0-retired-2026-08-22` (18 legs, updated `2026-08-23`): Assistant.known, Bartender.known, Customer 1.known, Customer 2.known, Customer 3.known, Customer.known, Driver.known, Friend.known, Guest.known, James.known, Local.known, Narrator.known, Neighbour.known, Passenger.known, Pharmacist.known, Tourist.known, Waiter.known, _default.known
- `ara_for_eng:pod-1` (17 legs, updated `2026-08-24`): Assistant.known, Barista.known, Bartender.known, Cafe Customer 1.known, Cafe Customer 2.known, Cafe Customer 3.known, Friend.known, Guest.known, Interlocutor.known, James.known, Local.known, Narrator.known, Neighbour.known, Passenger.known, Pharmacist.known, Staff.known, Waiter.known
- `ara_for_eng:pod-1-retired-2026-08-24` (15 legs, updated `2026-08-24`): Assistant.known, Barista.known, Bartender.known, Cafe Customer 1.known, Cafe Customer 2.known, Cafe Customer 3.known, Friend.known, Guest.known, James.known, Local.known, Narrator.known, Neighbour.known, Passenger.known, Pharmacist.known, Waiter.known

**ara_sy_for_eng** — 30 site(s) across 2 pod(s)

- `ara_sy_for_eng:pod-0` (15 legs, updated `2026-08-23`): Assistant.known, Barista.known, Bartender.known, Cafe Customer 1.known, Cafe Customer 2.known, Cafe Customer 3.known, Friend.known, Guest.known, James.known, Local.known, Narrator.known, Neighbour.known, Passenger.known, Pharmacist.known, Waiter.known
- `ara_sy_for_eng:pod-1-staged-2026-08-23` (15 legs, updated `2026-08-23`): Assistant.known, Barista.known, Bartender.known, Cafe Customer 1.known, Cafe Customer 2.known, Cafe Customer 3.known, Friend.known, Guest.known, James.known, Local.known, Narrator.known, Neighbour.known, Passenger.known, Pharmacist.known, Waiter.known

**bul_for_eng** — 30 site(s) across 2 pod(s)

- `bul_for_eng:pod-0` (15 legs, updated `2026-08-23`): Assistant.known, Barista.known, Bartender.known, Cafe Customer 1.known, Cafe Customer 2.known, Cafe Customer 3.known, Friend.known, Guest.known, James.known, Local.known, Narrator.known, Neighbour.known, Passenger.known, Pharmacist.known, Waiter.known
- `bul_for_eng:pod-0-unrecorded` (15 legs, updated `2026-08-23`): Assistant.known, Barista.known, Bartender.known, Cafe Customer 1.known, Cafe Customer 2.known, Cafe Customer 3.known, Friend.known, Guest.known, James.known, Local.known, Narrator.known, Neighbour.known, Passenger.known, Pharmacist.known, Waiter.known

**cat_for_eng** — 30 site(s) across 2 pod(s)

- `cat_for_eng:pod-0` (15 legs, updated `2026-08-23`): Assistant.known, Barista.known, Bartender.known, Cafe Customer 1.known, Cafe Customer 2.known, Cafe Customer 3.known, Friend.known, Guest.known, James.known, Local.known, Narrator.known, Neighbour.known, Passenger.known, Pharmacist.known, Waiter.known
- `cat_for_eng:pod-0-unrecorded` (15 legs, updated `2026-08-23`): Assistant.known, Barista.known, Bartender.known, Cafe Customer 1.known, Cafe Customer 2.known, Cafe Customer 3.known, Friend.known, Guest.known, James.known, Local.known, Narrator.known, Neighbour.known, Passenger.known, Pharmacist.known, Waiter.known

**dan_for_eng** — 30 site(s) across 2 pod(s)

- `dan_for_eng:pod-0` (15 legs, updated `2026-08-23`): Assistant.known, Barista.known, Bartender.known, Cafe Customer 1.known, Cafe Customer 2.known, Cafe Customer 3.known, Friend.known, Guest.known, James.known, Local.known, Narrator.known, Neighbour.known, Passenger.known, Pharmacist.known, Waiter.known
- `dan_for_eng:pod-0-unrecorded` (15 legs, updated `2026-08-23`): Assistant.known, Barista.known, Bartender.known, Cafe Customer 1.known, Cafe Customer 2.known, Cafe Customer 3.known, Friend.known, Guest.known, James.known, Local.known, Narrator.known, Neighbour.known, Passenger.known, Pharmacist.known, Waiter.known

**deu_at_for_eng** — 32 site(s) across 2 pod(s)

- `deu_at_for_eng:pod-0-retired-2026-08-24` (15 legs, updated `2026-08-24`): Assistant.known, Barista.known, Bartender.known, Cafe Customer 1.known, Cafe Customer 2.known, Cafe Customer 3.known, Friend.known, Guest.known, James.known, Local.known, Narrator.known, Neighbour.known, Passenger.known, Pharmacist.known, Waiter.known
- `deu_at_for_eng:pod-1` (17 legs, updated `2026-08-25`): Assistant.known, Barista.known, Bartender.known, Cafe Customer 1.known, Cafe Customer 2.known, Cafe Customer 3.known, Friend.known, Guest.known, Interlocutor.known, James.known, Local.known, Narrator.known, Neighbour.known, Passenger.known, Pharmacist.known, Staff.known, Waiter.known

**deu_for_eng** — 50 site(s) across 3 pod(s)

- `deu_for_eng:pod-0-retired-2026-08-22` (18 legs, updated `2026-08-23`): Assistant.known, Bartender.known, Customer 1.known, Customer 2.known, Customer 3.known, Customer.known, Driver.known, Friend.known, Guest.known, James.known, Local.known, Narrator.known, Neighbour.known, Passenger.known, Pharmacist.known, Tourist.known, Waiter.known, _default.known
- `deu_for_eng:pod-1` (17 legs, updated `2026-08-24`): Assistant.known, Barista.known, Bartender.known, Cafe Customer 1.known, Cafe Customer 2.known, Cafe Customer 3.known, Friend.known, Guest.known, Interlocutor.known, James.known, Local.known, Narrator.known, Neighbour.known, Passenger.known, Pharmacist.known, Staff.known, Waiter.known
- `deu_for_eng:pod-1-retired-2026-08-24` (15 legs, updated `2026-08-24`): Assistant.known, Barista.known, Bartender.known, Cafe Customer 1.known, Cafe Customer 2.known, Cafe Customer 3.known, Friend.known, Guest.known, James.known, Local.known, Narrator.known, Neighbour.known, Passenger.known, Pharmacist.known, Waiter.known

**ell_for_eng** — 30 site(s) across 2 pod(s)

- `ell_for_eng:pod-0` (15 legs, updated `2026-08-23`): Assistant.known, Barista.known, Bartender.known, Cafe Customer 1.known, Cafe Customer 2.known, Cafe Customer 3.known, Friend.known, Guest.known, James.known, Local.known, Narrator.known, Neighbour.known, Passenger.known, Pharmacist.known, Waiter.known
- `ell_for_eng:pod-0-unrecorded` (15 legs, updated `2026-08-23`): Assistant.known, Barista.known, Bartender.known, Cafe Customer 1.known, Cafe Customer 2.known, Cafe Customer 3.known, Friend.known, Guest.known, James.known, Local.known, Narrator.known, Neighbour.known, Passenger.known, Pharmacist.known, Waiter.known

**eng_for_ara** — 15 site(s) across 1 pod(s)

- `eng_for_ara:pod-0` (15 legs, updated `2026-08-23`): Assistant.target, Barista.target, Bartender.target, Cafe Customer 1.target, Cafe Customer 2.target, Cafe Customer 3.target, Friend.target, Guest.target, James.target, Local.target, Narrator.target, Neighbour.target, Passenger.target, Pharmacist.target, Waiter.target

**eng_for_ben** — 15 site(s) across 1 pod(s)

- `eng_for_ben:pod-0` (15 legs, updated `2026-08-23`): Assistant.target, Barista.target, Bartender.target, Cafe Customer 1.target, Cafe Customer 2.target, Cafe Customer 3.target, Friend.target, Guest.target, James.target, Local.target, Narrator.target, Neighbour.target, Passenger.target, Pharmacist.target, Waiter.target

**eng_for_deu** — 15 site(s) across 1 pod(s)

- `eng_for_deu:pod-0` (15 legs, updated `2026-08-23`): Assistant.target, Barista.target, Bartender.target, Cafe Customer 1.target, Cafe Customer 2.target, Cafe Customer 3.target, Friend.target, Guest.target, James.target, Local.target, Narrator.target, Neighbour.target, Passenger.target, Pharmacist.target, Waiter.target

**eng_for_fra** — 15 site(s) across 1 pod(s)

- `eng_for_fra:pod-0` (15 legs, updated `2026-08-23`): Assistant.target, Barista.target, Bartender.target, Cafe Customer 1.target, Cafe Customer 2.target, Cafe Customer 3.target, Friend.target, Guest.target, James.target, Local.target, Narrator.target, Neighbour.target, Passenger.target, Pharmacist.target, Waiter.target

**eng_for_guj** — 15 site(s) across 1 pod(s)

- `eng_for_guj:pod-0` (15 legs, updated `2026-08-23`): Assistant.target, Barista.target, Bartender.target, Cafe Customer 1.target, Cafe Customer 2.target, Cafe Customer 3.target, Friend.target, Guest.target, James.target, Local.target, Narrator.target, Neighbour.target, Passenger.target, Pharmacist.target, Waiter.target

**eng_for_hin** — 15 site(s) across 1 pod(s)

- `eng_for_hin:pod-0` (15 legs, updated `2026-08-23`): Assistant.target, Barista.target, Bartender.target, Cafe Customer 1.target, Cafe Customer 2.target, Cafe Customer 3.target, Friend.target, Guest.target, James.target, Local.target, Narrator.target, Neighbour.target, Passenger.target, Pharmacist.target, Waiter.target

**eng_for_ita** — 15 site(s) across 1 pod(s)

- `eng_for_ita:pod-0` (15 legs, updated `2026-08-23`): Assistant.target, Barista.target, Bartender.target, Cafe Customer 1.target, Cafe Customer 2.target, Cafe Customer 3.target, Friend.target, Guest.target, James.target, Local.target, Narrator.target, Neighbour.target, Passenger.target, Pharmacist.target, Waiter.target

**eng_for_jpn** — 15 site(s) across 1 pod(s)

- `eng_for_jpn:pod-0` (15 legs, updated `2026-08-23`): Assistant.target, Barista.target, Bartender.target, Cafe Customer 1.target, Cafe Customer 2.target, Cafe Customer 3.target, Friend.target, Guest.target, James.target, Local.target, Narrator.target, Neighbour.target, Passenger.target, Pharmacist.target, Waiter.target

**eng_for_kor** — 15 site(s) across 1 pod(s)

- `eng_for_kor:pod-0` (15 legs, updated `2026-08-23`): Assistant.target, Barista.target, Bartender.target, Cafe Customer 1.target, Cafe Customer 2.target, Cafe Customer 3.target, Friend.target, Guest.target, James.target, Local.target, Narrator.target, Neighbour.target, Passenger.target, Pharmacist.target, Waiter.target

**eng_for_pan** — 15 site(s) across 1 pod(s)

- `eng_for_pan:pod-0` (15 legs, updated `2026-08-23`): Assistant.target, Barista.target, Bartender.target, Cafe Customer 1.target, Cafe Customer 2.target, Cafe Customer 3.target, Friend.target, Guest.target, James.target, Local.target, Narrator.target, Neighbour.target, Passenger.target, Pharmacist.target, Waiter.target

**eng_for_por** — 15 site(s) across 1 pod(s)

- `eng_for_por:pod-0` (15 legs, updated `2026-08-23`): Assistant.target, Barista.target, Bartender.target, Cafe Customer 1.target, Cafe Customer 2.target, Cafe Customer 3.target, Friend.target, Guest.target, James.target, Local.target, Narrator.target, Neighbour.target, Passenger.target, Pharmacist.target, Waiter.target

**eng_for_sin** — 15 site(s) across 1 pod(s)

- `eng_for_sin:pod-0` (15 legs, updated `2026-08-23`): Assistant.target, Barista.target, Bartender.target, Cafe Customer 1.target, Cafe Customer 2.target, Cafe Customer 3.target, Friend.target, Guest.target, James.target, Local.target, Narrator.target, Neighbour.target, Passenger.target, Pharmacist.target, Waiter.target

**eng_for_spa** — 15 site(s) across 1 pod(s)

- `eng_for_spa:pod-0` (15 legs, updated `2026-08-23`): Assistant.target, Barista.target, Bartender.target, Cafe Customer 1.target, Cafe Customer 2.target, Cafe Customer 3.target, Friend.target, Guest.target, James.target, Local.target, Narrator.target, Neighbour.target, Passenger.target, Pharmacist.target, Waiter.target

**eng_for_tam** — 15 site(s) across 1 pod(s)

- `eng_for_tam:pod-0` (15 legs, updated `2026-08-23`): Assistant.target, Barista.target, Bartender.target, Cafe Customer 1.target, Cafe Customer 2.target, Cafe Customer 3.target, Friend.target, Guest.target, James.target, Local.target, Narrator.target, Neighbour.target, Passenger.target, Pharmacist.target, Waiter.target

**eng_for_urd** — 15 site(s) across 1 pod(s)

- `eng_for_urd:pod-0` (15 legs, updated `2026-08-23`): Assistant.target, Barista.target, Bartender.target, Cafe Customer 1.target, Cafe Customer 2.target, Cafe Customer 3.target, Friend.target, Guest.target, James.target, Local.target, Narrator.target, Neighbour.target, Passenger.target, Pharmacist.target, Waiter.target

**eng_for_zho** — 15 site(s) across 1 pod(s)

- `eng_for_zho:pod-0` (15 legs, updated `2026-08-23`): Assistant.target, Barista.target, Bartender.target, Cafe Customer 1.target, Cafe Customer 2.target, Cafe Customer 3.target, Friend.target, Guest.target, James.target, Local.target, Narrator.target, Neighbour.target, Passenger.target, Pharmacist.target, Waiter.target

**est_for_eng** — 30 site(s) across 2 pod(s)

- `est_for_eng:pod-0` (15 legs, updated `2026-08-23`): Assistant.known, Barista.known, Bartender.known, Cafe Customer 1.known, Cafe Customer 2.known, Cafe Customer 3.known, Friend.known, Guest.known, James.known, Local.known, Narrator.known, Neighbour.known, Passenger.known, Pharmacist.known, Waiter.known
- `est_for_eng:pod-0-unrecorded` (15 legs, updated `2026-08-23`): Assistant.known, Barista.known, Bartender.known, Cafe Customer 1.known, Cafe Customer 2.known, Cafe Customer 3.known, Friend.known, Guest.known, James.known, Local.known, Narrator.known, Neighbour.known, Passenger.known, Pharmacist.known, Waiter.known

**eus_for_eng** — 50 site(s) across 3 pod(s)

- `eus_for_eng:pod-0-retired-2026-08-22` (18 legs, updated `2026-08-23`): Assistant.known, Bartender.known, Customer 1.known, Customer 2.known, Customer 3.known, Customer.known, Driver.known, Friend.known, Guest.known, James.known, Local.known, Narrator.known, Neighbour.known, Passenger.known, Pharmacist.known, Tourist.known, Waiter.known, _default.known
- `eus_for_eng:pod-1` (17 legs, updated `2026-08-24`): Assistant.known, Barista.known, Bartender.known, Cafe Customer 1.known, Cafe Customer 2.known, Cafe Customer 3.known, Friend.known, Guest.known, Interlocutor.known, James.known, Local.known, Narrator.known, Neighbour.known, Passenger.known, Pharmacist.known, Staff.known, Waiter.known
- `eus_for_eng:pod-1-retired-2026-08-24` (15 legs, updated `2026-08-24`): Assistant.known, Barista.known, Bartender.known, Cafe Customer 1.known, Cafe Customer 2.known, Cafe Customer 3.known, Friend.known, Guest.known, James.known, Local.known, Narrator.known, Neighbour.known, Passenger.known, Pharmacist.known, Waiter.known

**fas_for_eng** — 30 site(s) across 2 pod(s)

- `fas_for_eng:pod-0` (15 legs, updated `2026-08-23`): Assistant.known, Barista.known, Bartender.known, Cafe Customer 1.known, Cafe Customer 2.known, Cafe Customer 3.known, Friend.known, Guest.known, James.known, Local.known, Narrator.known, Neighbour.known, Passenger.known, Pharmacist.known, Waiter.known
- `fas_for_eng:pod-0-unrecorded` (15 legs, updated `2026-08-23`): Assistant.known, Barista.known, Bartender.known, Cafe Customer 1.known, Cafe Customer 2.known, Cafe Customer 3.known, Friend.known, Guest.known, James.known, Local.known, Narrator.known, Neighbour.known, Passenger.known, Pharmacist.known, Waiter.known

**fin_for_eng** — 18 site(s) across 1 pod(s)

- `fin_for_eng:pod-0` (18 legs, updated `2026-08-11`): Assistant.known, Bartender.known, Customer 1.known, Customer 2.known, Customer 3.known, Customer.known, Driver.known, Friend.known, Guest.known, James.known, Local.known, Narrator.known, Neighbour.known, Passenger.known, Pharmacist.known, Tourist.known, Waiter.known, _default.known

**fra_ca_for_eng** — 32 site(s) across 2 pod(s)

- `fra_ca_for_eng:pod-0-retired-2026-08-24` (15 legs, updated `2026-08-24`): Assistant.known, Barista.known, Bartender.known, Cafe Customer 1.known, Cafe Customer 2.known, Cafe Customer 3.known, Friend.known, Guest.known, James.known, Local.known, Narrator.known, Neighbour.known, Passenger.known, Pharmacist.known, Waiter.known
- `fra_ca_for_eng:pod-1` (17 legs, updated `2026-08-24`): Assistant.known, Barista.known, Bartender.known, Cafe Customer 1.known, Cafe Customer 2.known, Cafe Customer 3.known, Friend.known, Guest.known, Interlocutor.known, James.known, Local.known, Narrator.known, Neighbour.known, Passenger.known, Pharmacist.known, Staff.known, Waiter.known

**fra_for_eng** — 50 site(s) across 3 pod(s)

- `fra_for_eng:pod-0-retired-2026-08-22` (18 legs, updated `2026-08-23`): Assistant.known, Bartender.known, Customer 1.known, Customer 2.known, Customer 3.known, Customer.known, Driver.known, Friend.known, Guest.known, James.known, Local.known, Narrator.known, Neighbour.known, Passenger.known, Pharmacist.known, Tourist.known, Waiter.known, _default.known
- `fra_for_eng:pod-1` (17 legs, updated `2026-08-24`): Assistant.known, Barista.known, Bartender.known, Cafe Customer 1.known, Cafe Customer 2.known, Cafe Customer 3.known, Friend.known, Guest.known, Interlocutor.known, James.known, Local.known, Narrator.known, Neighbour.known, Passenger.known, Pharmacist.known, Staff.known, Waiter.known
- `fra_for_eng:pod-1-retired-2026-08-24` (15 legs, updated `2026-08-24`): Assistant.known, Barista.known, Bartender.known, Cafe Customer 1.known, Cafe Customer 2.known, Cafe Customer 3.known, Friend.known, Guest.known, James.known, Local.known, Narrator.known, Neighbour.known, Passenger.known, Pharmacist.known, Waiter.known

**gle_for_eng** — 32 site(s) across 2 pod(s)

- `gle_for_eng:pod-0-retired-2026-08-24` (15 legs, updated `2026-08-24`): Assistant.known, Barista.known, Bartender.known, Cafe Customer 1.known, Cafe Customer 2.known, Cafe Customer 3.known, Friend.known, Guest.known, James.known, Local.known, Narrator.known, Neighbour.known, Passenger.known, Pharmacist.known, Waiter.known
- `gle_for_eng:pod-1` (17 legs, updated `2026-08-24`): Assistant.known, Barista.known, Bartender.known, Cafe Customer 1.known, Cafe Customer 2.known, Cafe Customer 3.known, Friend.known, Guest.known, Interlocutor.known, James.known, Local.known, Narrator.known, Neighbour.known, Passenger.known, Pharmacist.known, Staff.known, Waiter.known

**heb_for_eng** — 30 site(s) across 2 pod(s)

- `heb_for_eng:pod-0` (15 legs, updated `2026-08-23`): Assistant.known, Barista.known, Bartender.known, Cafe Customer 1.known, Cafe Customer 2.known, Cafe Customer 3.known, Friend.known, Guest.known, James.known, Local.known, Narrator.known, Neighbour.known, Passenger.known, Pharmacist.known, Waiter.known
- `heb_for_eng:pod-0-unrecorded` (15 legs, updated `2026-08-23`): Assistant.known, Barista.known, Bartender.known, Cafe Customer 1.known, Cafe Customer 2.known, Cafe Customer 3.known, Friend.known, Guest.known, James.known, Local.known, Narrator.known, Neighbour.known, Passenger.known, Pharmacist.known, Waiter.known

**hin_for_eng** — 32 site(s) across 2 pod(s)

- `hin_for_eng:pod-0-retired-2026-08-24` (15 legs, updated `2026-08-24`): Assistant.known, Barista.known, Bartender.known, Cafe Customer 1.known, Cafe Customer 2.known, Cafe Customer 3.known, Friend.known, Guest.known, James.known, Local.known, Narrator.known, Neighbour.known, Passenger.known, Pharmacist.known, Waiter.known
- `hin_for_eng:pod-1` (17 legs, updated `2026-08-24`): Assistant.known, Barista.known, Bartender.known, Cafe Customer 1.known, Cafe Customer 2.known, Cafe Customer 3.known, Friend.known, Guest.known, Interlocutor.known, James.known, Local.known, Narrator.known, Neighbour.known, Passenger.known, Pharmacist.known, Staff.known, Waiter.known

**hrv_for_eng** — 59 site(s) across 4 pod(s)

- `hrv_for_eng:pod-0-retired-2026-08-22` (18 legs, updated `2026-08-23`): Assistant.known, Bartender.known, Customer 1.known, Customer 2.known, Customer 3.known, Customer.known, Driver.known, Friend.known, Guest.known, James.known, Local.known, Narrator.known, Neighbour.known, Passenger.known, Pharmacist.known, Tourist.known, Waiter.known, _default.known
- `hrv_for_eng:pod-1` (12 legs, updated `2026-08-24`): Anna.known, Bar Customer 1.known, Bar Customer 2.known, Bar Customer 3.known, Cafe Barista.known, Customer.known, Diner 1.known, Diner 2.known, Driver.known, Learner.known, Receptionist.known, Tourist.known
- `hrv_for_eng:pod-1-retired-2026-08-22` (17 legs, updated `2026-08-23`): Adam.known, Ali.known, Ben.known, Dan.known, Grace.known, Jack.known, Josh.known, Leo.known, Mark.known, Owen.known, Ruth.known, Ryan.known, Sam.known, Tim.known, Tom.known, Will.known, _default.known
- `hrv_for_eng:pod-1-retired-2026-08-24` (12 legs, updated `2026-08-24`): Anna.known, Bar Customer 1.known, Bar Customer 2.known, Bar Customer 3.known, Cafe Barista.known, Customer.known, Diner 1.known, Diner 2.known, Driver.known, Learner.known, Receptionist.known, Tourist.known

**hye_for_eng** — 30 site(s) across 2 pod(s)

- `hye_for_eng:pod-0` (15 legs, updated `2026-08-23`): Assistant.known, Barista.known, Bartender.known, Cafe Customer 1.known, Cafe Customer 2.known, Cafe Customer 3.known, Friend.known, Guest.known, James.known, Local.known, Narrator.known, Neighbour.known, Passenger.known, Pharmacist.known, Waiter.known
- `hye_for_eng:pod-0-unrecorded` (15 legs, updated `2026-08-23`): Assistant.known, Barista.known, Bartender.known, Cafe Customer 1.known, Cafe Customer 2.known, Cafe Customer 3.known, Friend.known, Guest.known, James.known, Local.known, Narrator.known, Neighbour.known, Passenger.known, Pharmacist.known, Waiter.known

**isl_for_eng** — 32 site(s) across 2 pod(s)

- `isl_for_eng:pod-0-retired-2026-08-24` (15 legs, updated `2026-08-24`): Assistant.known, Barista.known, Bartender.known, Cafe Customer 1.known, Cafe Customer 2.known, Cafe Customer 3.known, Friend.known, Guest.known, James.known, Local.known, Narrator.known, Neighbour.known, Passenger.known, Pharmacist.known, Waiter.known
- `isl_for_eng:pod-1` (17 legs, updated `2026-08-24`): Assistant.known, Barista.known, Bartender.known, Cafe Customer 1.known, Cafe Customer 2.known, Cafe Customer 3.known, Friend.known, Guest.known, Interlocutor.known, James.known, Local.known, Narrator.known, Neighbour.known, Passenger.known, Pharmacist.known, Staff.known, Waiter.known

**ita_for_eng** — 51 site(s) across 3 pod(s)

- `ita_for_eng:pod-0-retired-2026-08-22` (19 legs, updated `2026-08-23`): Assistant.known, Bartender.known, Customer 1.known, Customer 2.known, Customer 3.known, Customer.known, Driver.known, Friend.known, Guest.known, James.known, Learner.known, Local.known, Narrator.known, Neighbour.known, Passenger.known, Pharmacist.known, Tourist.known, Waiter.known, _default.known
- `ita_for_eng:pod-1` (17 legs, updated `2026-08-24`): Assistant.known, Barista.known, Bartender.known, Cafe Customer 1.known, Cafe Customer 2.known, Cafe Customer 3.known, Friend.known, Guest.known, Interlocutor.known, James.known, Local.known, Narrator.known, Neighbour.known, Passenger.known, Pharmacist.known, Staff.known, Waiter.known
- `ita_for_eng:pod-1-retired-2026-08-24` (15 legs, updated `2026-08-24`): Assistant.known, Barista.known, Bartender.known, Cafe Customer 1.known, Cafe Customer 2.known, Cafe Customer 3.known, Friend.known, Guest.known, James.known, Local.known, Narrator.known, Neighbour.known, Passenger.known, Pharmacist.known, Waiter.known

**jpn_for_eng** — 50 site(s) across 3 pod(s)

- `jpn_for_eng:pod-0-retired-2026-08-22` (18 legs, updated `2026-08-23`): Assistant.known, Bartender.known, Customer 1.known, Customer 2.known, Customer 3.known, Customer.known, Driver.known, Friend.known, Guest.known, James.known, Local.known, Narrator.known, Neighbour.known, Passenger.known, Pharmacist.known, Tourist.known, Waiter.known, _default.known
- `jpn_for_eng:pod-1` (17 legs, updated `2026-08-24`): Assistant.known, Barista.known, Bartender.known, Cafe Customer 1.known, Cafe Customer 2.known, Cafe Customer 3.known, Friend.known, Guest.known, Interlocutor.known, James.known, Local.known, Narrator.known, Neighbour.known, Passenger.known, Pharmacist.known, Staff.known, Waiter.known
- `jpn_for_eng:pod-1-retired-2026-08-24` (15 legs, updated `2026-08-24`): Assistant.known, Barista.known, Bartender.known, Cafe Customer 1.known, Cafe Customer 2.known, Cafe Customer 3.known, Friend.known, Guest.known, James.known, Local.known, Narrator.known, Neighbour.known, Passenger.known, Pharmacist.known, Waiter.known

**kor_for_eng** — 50 site(s) across 3 pod(s)

- `kor_for_eng:pod-0-retired-2026-08-22` (18 legs, updated `2026-08-23`): Assistant.known, Bartender.known, Customer 1.known, Customer 2.known, Customer 3.known, Customer.known, Driver.known, Friend.known, Guest.known, James.known, Local.known, Narrator.known, Neighbour.known, Passenger.known, Pharmacist.known, Tourist.known, Waiter.known, _default.known
- `kor_for_eng:pod-1` (17 legs, updated `2026-08-24`): Assistant.known, Barista.known, Bartender.known, Cafe Customer 1.known, Cafe Customer 2.known, Cafe Customer 3.known, Friend.known, Guest.known, Interlocutor.known, James.known, Local.known, Narrator.known, Neighbour.known, Passenger.known, Pharmacist.known, Staff.known, Waiter.known
- `kor_for_eng:pod-1-retired-2026-08-24` (15 legs, updated `2026-08-24`): Assistant.known, Barista.known, Bartender.known, Cafe Customer 1.known, Cafe Customer 2.known, Cafe Customer 3.known, Friend.known, Guest.known, James.known, Local.known, Narrator.known, Neighbour.known, Passenger.known, Pharmacist.known, Waiter.known

**lav_for_eng** — 30 site(s) across 2 pod(s)

- `lav_for_eng:pod-0` (15 legs, updated `2026-08-23`): Assistant.known, Barista.known, Bartender.known, Cafe Customer 1.known, Cafe Customer 2.known, Cafe Customer 3.known, Friend.known, Guest.known, James.known, Local.known, Narrator.known, Neighbour.known, Passenger.known, Pharmacist.known, Waiter.known
- `lav_for_eng:pod-0-unrecorded` (15 legs, updated `2026-08-23`): Assistant.known, Barista.known, Bartender.known, Cafe Customer 1.known, Cafe Customer 2.known, Cafe Customer 3.known, Friend.known, Guest.known, James.known, Local.known, Narrator.known, Neighbour.known, Passenger.known, Pharmacist.known, Waiter.known

**lit_for_eng** — 30 site(s) across 2 pod(s)

- `lit_for_eng:pod-0` (15 legs, updated `2026-08-23`): Assistant.known, Barista.known, Bartender.known, Cafe Customer 1.known, Cafe Customer 2.known, Cafe Customer 3.known, Friend.known, Guest.known, James.known, Local.known, Narrator.known, Neighbour.known, Passenger.known, Pharmacist.known, Waiter.known
- `lit_for_eng:pod-0-unrecorded` (15 legs, updated `2026-08-23`): Assistant.known, Barista.known, Bartender.known, Cafe Customer 1.known, Cafe Customer 2.known, Cafe Customer 3.known, Friend.known, Guest.known, James.known, Local.known, Narrator.known, Neighbour.known, Passenger.known, Pharmacist.known, Waiter.known

**nep_for_eng** — 30 site(s) across 2 pod(s)

- `nep_for_eng:pod-0` (15 legs, updated `2026-08-23`): Assistant.known, Barista.known, Bartender.known, Cafe Customer 1.known, Cafe Customer 2.known, Cafe Customer 3.known, Friend.known, Guest.known, James.known, Local.known, Narrator.known, Neighbour.known, Passenger.known, Pharmacist.known, Waiter.known
- `nep_for_eng:pod-0-unrecorded` (15 legs, updated `2026-08-23`): Assistant.known, Barista.known, Bartender.known, Cafe Customer 1.known, Cafe Customer 2.known, Cafe Customer 3.known, Friend.known, Guest.known, James.known, Local.known, Narrator.known, Neighbour.known, Passenger.known, Pharmacist.known, Waiter.known

**nld_for_eng** — 32 site(s) across 2 pod(s)

- `nld_for_eng:pod-0-retired-2026-08-24` (15 legs, updated `2026-08-24`): Assistant.known, Barista.known, Bartender.known, Cafe Customer 1.known, Cafe Customer 2.known, Cafe Customer 3.known, Friend.known, Guest.known, James.known, Local.known, Narrator.known, Neighbour.known, Passenger.known, Pharmacist.known, Waiter.known
- `nld_for_eng:pod-1` (17 legs, updated `2026-08-24`): Assistant.known, Barista.known, Bartender.known, Cafe Customer 1.known, Cafe Customer 2.known, Cafe Customer 3.known, Friend.known, Guest.known, Interlocutor.known, James.known, Local.known, Narrator.known, Neighbour.known, Passenger.known, Pharmacist.known, Staff.known, Waiter.known

**nor_for_eng** — 30 site(s) across 2 pod(s)

- `nor_for_eng:pod-0` (15 legs, updated `2026-08-23`): Assistant.known, Barista.known, Bartender.known, Cafe Customer 1.known, Cafe Customer 2.known, Cafe Customer 3.known, Friend.known, Guest.known, James.known, Local.known, Narrator.known, Neighbour.known, Passenger.known, Pharmacist.known, Waiter.known
- `nor_for_eng:pod-0-unrecorded` (15 legs, updated `2026-08-23`): Assistant.known, Barista.known, Bartender.known, Cafe Customer 1.known, Cafe Customer 2.known, Cafe Customer 3.known, Friend.known, Guest.known, James.known, Local.known, Narrator.known, Neighbour.known, Passenger.known, Pharmacist.known, Waiter.known

**pol_for_eng** — 30 site(s) across 2 pod(s)

- `pol_for_eng:pod-0` (15 legs, updated `2026-08-23`): Assistant.known, Barista.known, Bartender.known, Cafe Customer 1.known, Cafe Customer 2.known, Cafe Customer 3.known, Friend.known, Guest.known, James.known, Local.known, Narrator.known, Neighbour.known, Passenger.known, Pharmacist.known, Waiter.known
- `pol_for_eng:pod-0-unrecorded` (15 legs, updated `2026-08-23`): Assistant.known, Barista.known, Bartender.known, Cafe Customer 1.known, Cafe Customer 2.known, Cafe Customer 3.known, Friend.known, Guest.known, James.known, Local.known, Narrator.known, Neighbour.known, Passenger.known, Pharmacist.known, Waiter.known

**por_br_for_eng** — 50 site(s) across 3 pod(s)

- `por_br_for_eng:pod-0-retired-2026-08-22` (18 legs, updated `2026-08-23`): Assistant.known, Bartender.known, Customer 1.known, Customer 2.known, Customer 3.known, Customer.known, Driver.known, Friend.known, Guest.known, James.known, Local.known, Narrator.known, Neighbour.known, Passenger.known, Pharmacist.known, Tourist.known, Waiter.known, _default.known
- `por_br_for_eng:pod-1` (17 legs, updated `2026-08-24`): Assistant.known, Barista.known, Bartender.known, Cafe Customer 1.known, Cafe Customer 2.known, Cafe Customer 3.known, Friend.known, Guest.known, Interlocutor.known, James.known, Local.known, Narrator.known, Neighbour.known, Passenger.known, Pharmacist.known, Staff.known, Waiter.known
- `por_br_for_eng:pod-1-retired-2026-08-24` (15 legs, updated `2026-08-24`): Assistant.known, Barista.known, Bartender.known, Cafe Customer 1.known, Cafe Customer 2.known, Cafe Customer 3.known, Friend.known, Guest.known, James.known, Local.known, Narrator.known, Neighbour.known, Passenger.known, Pharmacist.known, Waiter.known

**por_for_eng** — 50 site(s) across 3 pod(s)

- `por_for_eng:pod-0-retired-2026-08-22` (18 legs, updated `2026-08-23`): Assistant.known, Bartender.known, Customer 1.known, Customer 2.known, Customer 3.known, Customer.known, Driver.known, Friend.known, Guest.known, James.known, Local.known, Narrator.known, Neighbour.known, Passenger.known, Pharmacist.known, Tourist.known, Waiter.known, _default.known
- `por_for_eng:pod-1` (17 legs, updated `2026-08-24`): Assistant.known, Barista.known, Bartender.known, Cafe Customer 1.known, Cafe Customer 2.known, Cafe Customer 3.known, Friend.known, Guest.known, Interlocutor.known, James.known, Local.known, Narrator.known, Neighbour.known, Passenger.known, Pharmacist.known, Staff.known, Waiter.known
- `por_for_eng:pod-1-retired-2026-08-24` (15 legs, updated `2026-08-24`): Assistant.known, Barista.known, Bartender.known, Cafe Customer 1.known, Cafe Customer 2.known, Cafe Customer 3.known, Friend.known, Guest.known, James.known, Local.known, Narrator.known, Neighbour.known, Passenger.known, Pharmacist.known, Waiter.known

**ron_for_eng** — 50 site(s) across 3 pod(s)

- `ron_for_eng:pod-0-retired-2026-08-22` (18 legs, updated `2026-08-23`): Assistant.known, Bartender.known, Customer 1.known, Customer 2.known, Customer 3.known, Customer.known, Driver.known, Friend.known, Guest.known, James.known, Local.known, Narrator.known, Neighbour.known, Passenger.known, Pharmacist.known, Tourist.known, Waiter.known, _default.known
- `ron_for_eng:pod-1` (17 legs, updated `2026-08-24`): Assistant.known, Barista.known, Bartender.known, Cafe Customer 1.known, Cafe Customer 2.known, Cafe Customer 3.known, Friend.known, Guest.known, Interlocutor.known, James.known, Local.known, Narrator.known, Neighbour.known, Passenger.known, Pharmacist.known, Staff.known, Waiter.known
- `ron_for_eng:pod-1-retired-2026-08-24` (15 legs, updated `2026-08-24`): Assistant.known, Barista.known, Bartender.known, Cafe Customer 1.known, Cafe Customer 2.known, Cafe Customer 3.known, Friend.known, Guest.known, James.known, Local.known, Narrator.known, Neighbour.known, Passenger.known, Pharmacist.known, Waiter.known

**spa_for_eng** — 51 site(s) across 3 pod(s)

- `spa_for_eng:pod-0-retired-2026-08-22` (19 legs, updated `2026-08-23`): Assistant.known, Bartender.known, Customer 1.known, Customer 2.known, Customer 3.known, Customer.known, Driver.known, Friend.known, Guest.known, James.known, Learner.known, Local.known, Narrator.known, Neighbour.known, Passenger.known, Pharmacist.known, Tourist.known, Waiter.known, _default.known
- `spa_for_eng:pod-1` (17 legs, updated `2026-08-24`): Assistant.known, Barista.known, Bartender.known, Cafe Customer 1.known, Cafe Customer 2.known, Cafe Customer 3.known, Friend.known, Guest.known, Interlocutor.known, James.known, Local.known, Narrator.known, Neighbour.known, Passenger.known, Pharmacist.known, Staff.known, Waiter.known
- `spa_for_eng:pod-1-retired-2026-08-24` (15 legs, updated `2026-08-24`): Assistant.known, Barista.known, Bartender.known, Cafe Customer 1.known, Cafe Customer 2.known, Cafe Customer 3.known, Friend.known, Guest.known, James.known, Local.known, Narrator.known, Neighbour.known, Passenger.known, Pharmacist.known, Waiter.known

**spa_mx_for_eng** — 50 site(s) across 3 pod(s)

- `spa_mx_for_eng:pod-0-retired-2026-08-22` (18 legs, updated `2026-08-23`): Assistant.known, Bartender.known, Customer 1.known, Customer 2.known, Customer 3.known, Customer.known, Driver.known, Friend.known, Guest.known, James.known, Local.known, Narrator.known, Neighbour.known, Passenger.known, Pharmacist.known, Tourist.known, Waiter.known, _default.known
- `spa_mx_for_eng:pod-1` (17 legs, updated `2026-08-24`): Assistant.known, Barista.known, Bartender.known, Cafe Customer 1.known, Cafe Customer 2.known, Cafe Customer 3.known, Friend.known, Guest.known, Interlocutor.known, James.known, Local.known, Narrator.known, Neighbour.known, Passenger.known, Pharmacist.known, Staff.known, Waiter.known
- `spa_mx_for_eng:pod-1-retired-2026-08-24` (15 legs, updated `2026-08-24`): Assistant.known, Barista.known, Bartender.known, Cafe Customer 1.known, Cafe Customer 2.known, Cafe Customer 3.known, Friend.known, Guest.known, James.known, Local.known, Narrator.known, Neighbour.known, Passenger.known, Pharmacist.known, Waiter.known

**swa_for_eng** — 30 site(s) across 2 pod(s)

- `swa_for_eng:pod-0` (15 legs, updated `2026-08-23`): Assistant.known, Barista.known, Bartender.known, Cafe Customer 1.known, Cafe Customer 2.known, Cafe Customer 3.known, Friend.known, Guest.known, James.known, Local.known, Narrator.known, Neighbour.known, Passenger.known, Pharmacist.known, Waiter.known
- `swa_for_eng:pod-0-unrecorded` (15 legs, updated `2026-08-23`): Assistant.known, Barista.known, Bartender.known, Cafe Customer 1.known, Cafe Customer 2.known, Cafe Customer 3.known, Friend.known, Guest.known, James.known, Local.known, Narrator.known, Neighbour.known, Passenger.known, Pharmacist.known, Waiter.known

**swe_for_eng** — 50 site(s) across 3 pod(s)

- `swe_for_eng:pod-0-retired-2026-08-22` (18 legs, updated `2026-08-23`): Assistant.known, Bartender.known, Customer 1.known, Customer 2.known, Customer 3.known, Customer.known, Driver.known, Friend.known, Guest.known, James.known, Local.known, Narrator.known, Neighbour.known, Passenger.known, Pharmacist.known, Tourist.known, Waiter.known, _default.known
- `swe_for_eng:pod-1` (17 legs, updated `2026-08-24`): Assistant.known, Barista.known, Bartender.known, Cafe Customer 1.known, Cafe Customer 2.known, Cafe Customer 3.known, Friend.known, Guest.known, Interlocutor.known, James.known, Local.known, Narrator.known, Neighbour.known, Passenger.known, Pharmacist.known, Staff.known, Waiter.known
- `swe_for_eng:pod-1-retired-2026-08-24` (15 legs, updated `2026-08-24`): Assistant.known, Barista.known, Bartender.known, Cafe Customer 1.known, Cafe Customer 2.known, Cafe Customer 3.known, Friend.known, Guest.known, James.known, Local.known, Narrator.known, Neighbour.known, Passenger.known, Pharmacist.known, Waiter.known

**tha_for_eng** — 34 site(s) across 2 pod(s)

- `tha_for_eng:pod-0` (17 legs, updated `2026-08-23`): Assistant.known, Barista.known, Bartender.known, Bus passenger.known, Cafe customer 1.known, Cafe customer 2.known, Cafe customer 3.known, Evening friend.known, Friend.known, Guest.known, James.known, Local.known, Narrator.known, Neighbour.known, Pharmacist.known, Taxi passenger.known, Waiter.known
- `tha_for_eng:pod-0-unrecorded` (17 legs, updated `2026-08-23`): Assistant.known, Barista.known, Bartender.known, Bus passenger.known, Cafe customer 1.known, Cafe customer 2.known, Cafe customer 3.known, Evening friend.known, Friend.known, Guest.known, James.known, Local.known, Narrator.known, Neighbour.known, Pharmacist.known, Taxi passenger.known, Waiter.known

**tur_for_eng** — 30 site(s) across 2 pod(s)

- `tur_for_eng:pod-0` (15 legs, updated `2026-08-23`): Assistant.known, Barista.known, Bartender.known, Cafe Customer 1.known, Cafe Customer 2.known, Cafe Customer 3.known, Friend.known, Guest.known, James.known, Local.known, Narrator.known, Neighbour.known, Passenger.known, Pharmacist.known, Waiter.known
- `tur_for_eng:pod-0-unrecorded` (15 legs, updated `2026-08-23`): Assistant.known, Barista.known, Bartender.known, Cafe Customer 1.known, Cafe Customer 2.known, Cafe Customer 3.known, Friend.known, Guest.known, James.known, Local.known, Narrator.known, Neighbour.known, Passenger.known, Pharmacist.known, Waiter.known

**ukr_for_eng** — 30 site(s) across 2 pod(s)

- `ukr_for_eng:pod-0` (15 legs, updated `2026-08-23`): Assistant.known, Barista.known, Bartender.known, Cafe Customer 1.known, Cafe Customer 2.known, Cafe Customer 3.known, Friend.known, Guest.known, James.known, Local.known, Narrator.known, Neighbour.known, Passenger.known, Pharmacist.known, Waiter.known
- `ukr_for_eng:pod-0-unrecorded` (15 legs, updated `2026-08-23`): Assistant.known, Barista.known, Bartender.known, Cafe Customer 1.known, Cafe Customer 2.known, Cafe Customer 3.known, Friend.known, Guest.known, James.known, Local.known, Narrator.known, Neighbour.known, Passenger.known, Pharmacist.known, Waiter.known

**zho_for_eng** — 50 site(s) across 3 pod(s)

- `zho_for_eng:pod-0-retired-2026-08-22` (18 legs, updated `2026-08-23`): Assistant.known, Bartender.known, Customer 1.known, Customer 2.known, Customer 3.known, Customer.known, Driver.known, Friend.known, Guest.known, James.known, Local.known, Narrator.known, Neighbour.known, Passenger.known, Pharmacist.known, Tourist.known, Waiter.known, _default.known
- `zho_for_eng:pod-1` (17 legs, updated `2026-08-24`): Assistant.known, Barista.known, Bartender.known, Cafe Customer 1.known, Cafe Customer 2.known, Cafe Customer 3.known, Friend.known, Guest.known, Interlocutor.known, James.known, Local.known, Narrator.known, Neighbour.known, Passenger.known, Pharmacist.known, Staff.known, Waiter.known
- `zho_for_eng:pod-1-retired-2026-08-24` (15 legs, updated `2026-08-24`): Assistant.known, Barista.known, Bartender.known, Cafe Customer 1.known, Cafe Customer 2.known, Cafe Customer 3.known, Friend.known, Guest.known, James.known, Local.known, Narrator.known, Neighbour.known, Passenger.known, Pharmacist.known, Waiter.known

## `human_aran_cym_n` — 82 site(s)

- **no `voices` row at all** — nothing recorded about who this is

### courses.voice_config.podCast — 30 site(s)

- `cym_n_for_eng` / `Assistant` — updated `2026-01-06`
- `cym_n_for_eng` / `Barista` — updated `2026-01-06`
- `cym_n_for_eng` / `Bartender` — updated `2026-01-06`
- `cym_n_for_eng` / `Cafe Customer 1` — updated `2026-01-06`
- `cym_n_for_eng` / `Cafe Customer 2` — updated `2026-01-06`
- `cym_n_for_eng` / `Cafe Customer 3` — updated `2026-01-06`
- `cym_n_for_eng` / `Friend` — updated `2026-01-06`
- `cym_n_for_eng` / `Guest` — updated `2026-01-06`
- `cym_n_for_eng` / `James` — updated `2026-01-06`
- `cym_n_for_eng` / `Local` — updated `2026-01-06`
- `cym_n_for_eng` / `Narrator` — updated `2026-01-06`
- `cym_n_for_eng` / `Neighbour` — updated `2026-01-06`
- `cym_n_for_eng` / `Passenger` — updated `2026-01-06`
- `cym_n_for_eng` / `Pharmacist` — updated `2026-01-06`
- `cym_n_for_eng` / `Waiter` — updated `2026-01-06`
- `cym_n_for_eng` / `__explainer__` — updated `2026-01-06`
- `cym_nnew_for_eng` / `Customer` — updated `2026-01-06`
- `cym_nnew_for_eng` / `Customer 2` — updated `2026-01-06`
- `cym_nnew_for_eng` / `Customer 3` — updated `2026-01-06`
- `cym_nnew_for_eng` / `Driver` — updated `2026-01-06`
- `cym_nnew_for_eng` / `Friend` — updated `2026-01-06`
- `cym_nnew_for_eng` / `Guest` — updated `2026-01-06`
- `cym_nnew_for_eng` / `James` — updated `2026-01-06`
- `cym_nnew_for_eng` / `Local` — updated `2026-01-06`
- `cym_nnew_for_eng` / `Narrator` — updated `2026-01-06`
- `cym_nnew_for_eng` / `Neighbour` — updated `2026-01-06`
- `cym_nnew_for_eng` / `Pharmacist` — updated `2026-01-06`
- `cym_nnew_for_eng` / `Tourist` — updated `2026-01-06`
- `cym_nnew_for_eng` / `Waiter` — updated `2026-01-06`
- `cym_nnew_for_eng` / `__explainer__` — updated `2026-01-06`

### listening_pods.speakers — 52 site(s)

**cym_n_for_eng** — 52 site(s) across 2 pod(s)

- `cym_n_for_eng:pod-0` (26 legs, updated `2026-08-23`): Customer 2.known, Customer 2.target, Customer 3.known, Customer 3.target, Customer.known, Customer.target, Driver.known, Driver.target, Friend.known, Friend.target, Guest.known, Guest.target, James.known, James.target, Local.known, Local.target, Narrator.known, Narrator.target, Neighbour.known, Neighbour.target, Pharmacist.known, Pharmacist.target, Tourist.known, Tourist.target, Waiter.known, Waiter.target
- `cym_n_for_eng:pod-0-gated-2026-08-06` (26 legs, updated `2026-08-23`): Customer 2.known, Customer 2.target, Customer 3.known, Customer 3.target, Customer.known, Customer.target, Driver.known, Driver.target, Friend.known, Friend.target, Guest.known, Guest.target, James.known, James.target, Local.known, Local.target, Narrator.known, Narrator.target, Neighbour.known, Neighbour.target, Pharmacist.known, Pharmacist.target, Tourist.known, Tourist.target, Waiter.known, Waiter.target

## `human_catrinlliar_cym_n` — 58 site(s)

- **no `voices` row at all** — nothing recorded about who this is

### courses.voice_config.podCast — 22 site(s)

- `cym_n_for_eng` / `Anna` — updated `2026-01-06`
- `cym_n_for_eng` / `Bar Customer 1` — updated `2026-01-06`
- `cym_n_for_eng` / `Bar Customer 2` — updated `2026-01-06`
- `cym_n_for_eng` / `Bar Customer 3` — updated `2026-01-06`
- `cym_n_for_eng` / `Cafe Barista` — updated `2026-01-06`
- `cym_n_for_eng` / `Customer` — updated `2026-01-06`
- `cym_n_for_eng` / `Diner 1` — updated `2026-01-06`
- `cym_n_for_eng` / `Diner 2` — updated `2026-01-06`
- `cym_n_for_eng` / `Driver` — updated `2026-01-06`
- `cym_n_for_eng` / `Learner` — updated `2026-01-06`
- `cym_n_for_eng` / `Receptionist` — updated `2026-01-06`
- `cym_n_for_eng` / `Sarah` — updated `2026-01-06`
- `cym_n_for_eng` / `Tourist` — updated `2026-01-06`
- `cym_nnew_for_eng` / `Anna` — updated `2026-01-06`
- `cym_nnew_for_eng` / `Assistant` — updated `2026-01-06`
- `cym_nnew_for_eng` / `Barista` — updated `2026-01-06`
- `cym_nnew_for_eng` / `Bartender` — updated `2026-01-06`
- `cym_nnew_for_eng` / `Customer 1` — updated `2026-01-06`
- `cym_nnew_for_eng` / `Learner` — updated `2026-01-06`
- `cym_nnew_for_eng` / `Passenger` — updated `2026-01-06`
- `cym_nnew_for_eng` / `Receptionist` — updated `2026-01-06`
- `cym_nnew_for_eng` / `Sarah` — updated `2026-01-06`

### listening_pods.speakers — 36 site(s)

**cym_n_for_eng** — 36 site(s) across 2 pod(s)

- `cym_n_for_eng:pod-0` (18 legs, updated `2026-08-23`): Anna.known, Anna.target, Assistant.known, Assistant.target, Barista.known, Barista.target, Bartender.known, Bartender.target, Customer 1.known, Customer 1.target, Learner.known, Learner.target, Passenger.known, Passenger.target, Receptionist.known, Receptionist.target, Sarah.known, Sarah.target
- `cym_n_for_eng:pod-0-gated-2026-08-06` (18 legs, updated `2026-08-23`): Anna.known, Anna.target, Assistant.known, Assistant.target, Barista.known, Barista.target, Bartender.known, Bartender.target, Customer 1.known, Customer 1.target, Learner.known, Learner.target, Passenger.known, Passenger.target, Receptionist.known, Receptionist.target, Sarah.known, Sarah.target

## `human_aran_cym_s` — 56 site(s)

- **no `voices` row at all** — nothing recorded about who this is

### listening_pods.speakers — 56 site(s)

**cym_s_for_eng** — 56 site(s) across 2 pod(s)

- `cym_s_for_eng:pod-0` (30 legs, updated `2026-08-23`): Assistant.known, Assistant.target, Barista.known, Barista.target, Bartender.known, Bartender.target, Cafe Customer 1.known, Cafe Customer 1.target, Cafe Customer 2.known, Cafe Customer 2.target, Cafe Customer 3.known, Cafe Customer 3.target, Friend.known, Friend.target, Guest.known, Guest.target, James.known, James.target, Local.known, Local.target, Narrator.known, Narrator.target, Neighbour.known, Neighbour.target, Passenger.known, Passenger.target, Pharmacist.known, Pharmacist.target, Waiter.known, Waiter.target
- `cym_s_for_eng:pod-0-gated-2026-08-06` (26 legs, updated `2026-08-23`): Customer 2.known, Customer 2.target, Customer 3.known, Customer 3.target, Customer.known, Customer.target, Driver.known, Driver.target, Friend.known, Friend.target, Guest.known, Guest.target, James.known, James.target, Local.known, Local.target, Narrator.known, Narrator.target, Neighbour.known, Neighbour.target, Pharmacist.known, Pharmacist.target, Tourist.known, Tourist.target, Waiter.known, Waiter.target

## `human_catrinlliar_cym_s` — 44 site(s)

- **no `voices` row at all** — nothing recorded about who this is

### listening_pods.speakers — 44 site(s)

**cym_s_for_eng** — 44 site(s) across 2 pod(s)

- `cym_s_for_eng:pod-0` (26 legs, updated `2026-08-23`): Anna.known, Anna.target, Bar Customer 1.known, Bar Customer 1.target, Bar Customer 2.known, Bar Customer 2.target, Bar Customer 3.known, Bar Customer 3.target, Cafe Barista.known, Cafe Barista.target, Customer.known, Customer.target, Diner 1.known, Diner 1.target, Diner 2.known, Diner 2.target, Driver.known, Driver.target, Learner.known, Learner.target, Receptionist.known, Receptionist.target, Sarah.known, Sarah.target, Tourist.known, Tourist.target
- `cym_s_for_eng:pod-0-gated-2026-08-06` (18 legs, updated `2026-08-23`): Anna.known, Anna.target, Assistant.known, Assistant.target, Barista.known, Barista.target, Bartender.known, Bartender.target, Customer 1.known, Customer 1.target, Learner.known, Learner.target, Passenger.known, Passenger.target, Receptionist.known, Receptionist.target, Sarah.known, Sarah.target

## `human_tom_zzz` — 3 site(s)

- **no `voices` row at all** — nothing recorded about who this is

### courses.voice_config.podCast — 3 site(s)

- `zzz_test2_for_eng` / `Customer` — updated `2026-08-22`
- `zzz_test_for_eng` / `Customer` — updated `2026-08-22`
- `zzz_test_for_eng` / `__explainer__` — updated `2026-08-22`

## `human_test_f_zzz` — 2 site(s)

- **no `voices` row at all** — nothing recorded about who this is

### courses.voice_config.podCast — 2 site(s)

- `zzz_test2_for_eng` / `Barista` — updated `2026-08-22`
- `zzz_test_for_eng` / `Barista` — updated `2026-08-22`

## `human_sasha_wanasky_deu_at` — 1 site(s)

- **no `voices` row at all** — nothing recorded about who this is

### courses.voice_config — 1 site(s)

- `deu_at_for_eng` / `target2` — updated `2026-08-04`

## `human_kai_fin` — 1 site(s)

- voices row: type=`human`, consent_status=`not_recorded`, metadata_source=`None`, display_name=`Kai (TEST — Finnish)`, created=`Wed Aug 19`

### courses.voice_config — 1 site(s)

- `fin_for_eng` / `target1` — updated `2026-08-06`

---

Reproduce: `node tools/voice/census-unconsented-cast-voices.cjs` (every call site, capped print) or
`node tools/voice/census-unconsented-cast-summary.cjs` (the summary table) — both read-only, need
`.env.psql`. This report's full non-truncated export: `scripts/full-census-export.cjs` (scratch, not committed).
