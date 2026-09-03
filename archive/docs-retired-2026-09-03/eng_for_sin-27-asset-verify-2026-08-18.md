# eng_for_sin 27-clip asset verify — 2026-08-18

Read-only. No DB writes, no TTS, no deletions. Make-before-break evidence gathering ahead of relinking 26 replacement presentation clips over 27 corrupt incumbents.

## Gap found before probing started

The incumbent query (27 corrupt lego_ids) returned 27 rows, but the replacement list has only **26** clip ids, covering 26 of those 27 lego_ids. **`S0225L01` has no replacement clip rendered yet** — its corrupt incumbent (`ecf0c601-8bb4-4744-af5b-557a3fc157a7`) is still the only asset for that slot. Confirm with whoever rendered the 2026-08-17 batch before treating this as a 27-for-27 relink.

## Task 1 — fetch + probe (all 53 clips, live learner route)

All 53 requests returned **HTTP 200** with non-zero bytes. Duration column is ffprobe-measured against the live-fetched file; delta = ffprobe_ms − course_audio.duration_ms.

### Replacements (26, rendered 2026-08-17, currently unlinked)

| lego_id | clip id | http | bytes | ffprobe ms | db ms | delta |
|---|---|---|---|---|---|---|
| S0178L01 | 83f8d45c-09a7-4f3b-b1d0-8272caaac230 | 200 | 63648 | 5256 | 5256 | 0 |
| S0178L02 | 67e9ab8d-8420-4689-91d8-467590207180 | 200 | 86112 | 7128 | 7128 | 0 |
| S0180L01 | 424cb5d5-e392-4791-b08a-90bf5c7edeee | 200 | 85248 | 7056 | 7056 | 0 |
| S0181L02 | 9f0c7c60-6f43-4e71-a294-59388b6253b5 | 200 | 65376 | 5400 | 5400 | 0 |
| S0184L02 | 6fbc12e6-87d4-41e0-93f2-a2d92616c0a8 | 200 | 72000 | 5940 | 5940 | 0 |
| S0194L01 | 163d99ba-6e0f-4054-b833-b87fb7292e54 | 200 | 72000 | 5940 | 5940 | 0 |
| S0196L02 | 44724583-c1d7-4112-99f7-2f7a40829e90 | 200 | 61056 | 5040 | 5040 | 0 |
| S0197L02 | a99a2bad-93c0-49fd-9288-ecfa17d4430f | 200 | 65952 | 5436 | 5436 | 0 |
| S0198L01 | b5e8dee9-5f62-4198-8a86-8b82379e8b5a | 200 | 72288 | 5976 | 5976 | 0 |
| S0198L02 | 38c90897-54df-48fc-afd4-93bd30d078fd | 200 | 63648 | 5256 | 5256 | 0 |
| S0201L01 | 1cf4e3c4-58d1-431c-b51d-ce549928e546 | 200 | 86976 | 7200 | 7200 | 0 |
| S0202L01 | c0a252a4-9d70-491b-9e6a-1188de3d1b21 | 200 | 65088 | 5364 | 5364 | 0 |
| S0202L02 | 39b42259-f4e7-4099-80c1-6b4c6a325e1f | 200 | 63648 | 5256 | 5256 | 0 |
| S0203L01 | 2cea71ac-6fda-440d-b8bf-1468eaf6a6b2 | 200 | 60192 | 4968 | 4968 | 0 |
| S0204L01 | a7e2bf94-61d7-4e0a-a896-6390323a6e5c | 200 | 60192 | 4968 | 4968 | 0 |
| S0206L01 | dd5c5936-d81f-40a3-a98a-d1ceaf358c8a | 200 | 79776 | 6588 | 6588 | 0 |
| S0207L01 | 5b97734c-ffe7-4df2-b343-090bb2662cae | 200 | 59328 | 4896 | 4896 | 0 |
| S0210L01 | 9254cadf-baca-4191-805e-abba1b002656 | 200 | 66816 | 5508 | 5508 | 0 |
| S0214L01 | 9b42be65-ab6d-4e07-b96b-7093d2d4a1d6 | 200 | 58464 | 4824 | 4824 | 0 |
| S0214L02 | 9252de60-96f7-44db-8ff5-b832d4ef9b63 | 200 | 74880 | 6192 | 6192 | 0 |
| S0218L01 | 6d213d64-cb86-4ef2-ade0-5e1e720c8391 | 200 | 62784 | 5184 | 5184 | 0 |
| S0230L01 | 295996ef-30aa-418c-985c-f918d5146dc2 | 200 | 66240 | 5472 | 5472 | 0 |
| S0231L01 | 3896c1ba-6c98-4904-a222-1d844c9f53b5 | 200 | 69696 | 5760 | 5760 | 0 |
| S0249L01 | 07ec5f1f-25a4-42dc-b25a-058c7d75e1d6 | 200 | 77184 | 6372 | 6372 | 0 |
| S0260L01 | bbe31976-1bb2-498c-8f69-793a6c8352d1 | 200 | 74592 | 6156 | 6156 | 0 |
| S0261L01 | 7a80db13-b580-4d05-9967-b91e0819375c | 200 | 59904 | 4932 | 4932 | 0 |

**Verdict — replacements:** all 26 alive (HTTP 200, real byte counts, no zero-byte files) and **exact** duration match against `course_audio.duration_ms` (delta 0ms on every row). No dead or mismatched clips found. `S0225L01` is simply absent from this batch — see gap above.

### Incumbents (27, corrupt, currently linked — fetched read-only, untouched)

| lego_id | clip id | http | bytes | ffprobe ms | db ms | delta |
|---|---|---|---|---|---|---|
| S0178L01 | 28ebea15-d37a-4733-be11-b77c14ea9534 | 200 | 72288 | 5976 | 6000 | -24 |
| S0178L02 | d561af4f-8b70-4799-835a-55faa9f4b59d | 200 | 96192 | 7956 | 7992 | -36 |
| S0180L01 | b525231f-8f6a-4d33-a4a3-dc2244ffb54b | 200 | 86688 | 7164 | 7200 | -36 |
| S0181L02 | f234b6ba-424c-42cf-a86a-3e43eda3c74f | 200 | 83520 | 6912 | 6936 | -24 |
| S0184L02 | 7fa5b6d5-a567-45d4-818e-37a815aa066e | 200 | 86112 | 7128 | 7152 | -24 |
| S0194L01 | 0e6df0a1-95fb-4f9e-b2a6-778151991b0c | 200 | 83520 | 6912 | 6936 | -24 |
| S0196L02 | d2cf2cae-0a42-4afb-bc2a-8280bc805f81 | 200 | 92736 | 7668 | 7704 | -36 |
| S0197L02 | 88b300f0-2326-451a-b068-efd67a28634e | 200 | 79776 | 6588 | 6624 | -36 |
| S0198L01 | df7ce805-a709-4fab-9c25-f7ccdfe27b20 | 200 | 83520 | 6912 | 6936 | -24 |
| S0198L02 | ccc47c10-c4c5-48e6-b936-693aecbd48c4 | 200 | 90432 | 7488 | 7512 | -24 |
| S0201L01 | dd4665d8-1031-4d98-8183-e86bd1b2f9d1 | 200 | 113760 | 9432 | 9456 | -24 |
| S0202L01 | 071c2b03-eb27-471a-9707-f183eb01acb2 | 200 | 76320 | 6300 | 6336 | -36 |
| S0202L02 | 38dadabc-bac2-4ae1-8a30-f686a53f55eb | 200 | 89280 | 7380 | 7416 | -36 |
| S0203L01 | 89c99b9d-e4d7-4620-a2fb-7ec78ebca1a6 | 200 | 80640 | 6660 | 6696 | -36 |
| S0204L01 | 54aaf0bf-ef58-41c6-8b33-d0013f6e402a | 200 | 86688 | 7164 | 7200 | -36 |
| S0206L01 | f9c504e5-1d38-4e20-86ed-53287376d1fa | 200 | 85824 | 7092 | 7128 | -36 |
| S0207L01 | d023e32b-0fbd-41f9-aa72-1b15e0b2f307 | 200 | 88704 | 7344 | 7368 | -24 |
| S0210L01 | a30ed538-67d2-44a1-a633-87c49862df12 | 200 | 84384 | 6984 | 7008 | -24 |
| S0214L01 | 1a2bc70c-0c07-4e61-9537-237d847a6ba7 | 200 | 86976 | 7200 | 7224 | -24 |
| S0214L02 | 95cedc7b-e418-49eb-9ac0-e9b04ba82290 | 200 | 86688 | 7164 | 7200 | -36 |
| S0218L01 | e050350b-82fd-4d99-b87c-775ad515dae8 | 200 | 101376 | 8388 | 8424 | -36 |
| S0225L01 | ecf0c601-8bb4-4744-af5b-557a3fc157a7 | 200 | 89280 | 7380 | 7416 | -36 |
| S0230L01 | 3c7c82ae-e810-44a3-a55e-6b01c03ddf4a | 200 | 80064 | 6624 | 6648 | -24 |
| S0231L01 | 0772915b-19ef-499c-95b3-16a1dc8f6062 | 200 | 79200 | 6552 | 6576 | -24 |
| S0249L01 | ffb07bf9-6935-4c86-a81c-1c2cf23086fa | 200 | 87840 | 7272 | 7296 | -24 |
| S0260L01 | 94f0d69f-aeb2-4fa0-98c0-be575c3bfddf | 200 | 82368 | 6804 | 6840 | -36 |
| S0261L01 | f4b50a96-06de-47f6-b443-9d4553f24882 | 200 | 101664 | 8424 | 8448 | -24 |

**Note on incumbents:** all 27 show a small, consistent −24 to −36ms delta (ffprobe reads slightly shorter than the stored `duration_ms`). That's a uniform ~1-frame MP3 encoder/measurement rounding pattern across the whole group, not corruption — every incumbent is otherwise alive and fetchable. Their `text` is the known-corrupt gibberish filler; that's a content defect, not an asset-liveness one, and out of scope for this probe (I did not listen to/transcribe incumbents — see Task 2 below for why).

## Task 2 — ASR availability

**ASR is available on this machine (watson-1)**: `whisper-cli` (whisper.cpp) is installed at `~/.local/bin/whisper-cli` (a concurrency-capped wrapper over `~/.local/bin/whisper-cli.real`), with `ggml-small.bin`, `ggml-medium.bin`, and `ggml-tiny.bin` models present, and the repo's `services/audio-veracity.cjs` exposes a read-only `decodeAudio(path, iso1)` export built exactly for this — an unprimed whisper round-trip with no text fed in. `sin` → ISO-639-1 `si` is a mapped language in that module.

**But it does not produce usable evidence for Sinhala.** I ran it against two of the 26 replacement clips (`S0178L01`, `S0206L01`):

- **`ggml-small.bin`** (the model `decodeAudio` uses by default): returned an **empty transcription** (0 segments) on `S0178L01` after whisper's own confidence-driven fallback loop maxed out (5 temperature retries, `fallbacks: 5 p / 0 h`). The clip is not silent — `ffmpeg volumedetect` measured mean −18dB / max −2dB, real speech-level signal.
- **`ggml-medium.bin`**: produced *some* text on both clips, but flagged `4 h` (hallucination fallbacks) each time, and the text does not match the expected Sinhala (e.g. `S0206L01` expected `ඉංග්‍රීසිෙන්. 'අවස්ථාව'. 'මට ඉංග්‍රීසි ඉගෙනගන්න අවස්ථාව අවශ්‍යයි' ඉතින්. :` — whisper returned garbled, unrelated Sinhala-script noise spanning a mis-timestamped 30-second window on a 6.6s clip).

This matches a gap the module's own doctrine already documents: `CER_UNVALIDATED_LANGUAGES` (the set given a slacker, effectively-disabled threshold) lists `zh, yue, ja, th, lo, my, km` — languages whose whisper support is known-weak. **Sinhala isn't even on that list**, meaning the code would silently apply the *fitted* (German/English-calibrated) 0.3 CER threshold to Sinhala content if this pipeline were run through the veracity gate today, on a model that (per this test) can't reliably transcribe Sinhala TTS output at all.

Given that, I did **not** run ASR content-verification across the full 26 — a batch of decodes this unreliable would manufacture false confidence rather than real evidence, and each clip costs ~40–90s on this shared box even bypassing the semaphore. **This is a genuine evidence gap**: nothing in this probe confirms *what the 26 replacement clips actually say* beyond their filenames/duration. Liveness and duration are proven; content is not.

## Task 3 — word_boundaries on the 26 replacements

**Confirmed: `word_boundaries` is NULL on all 26 replacement rows** (query returned `has_wb: false` for every one). Per prior findings, `word_boundaries` is the TTS provider's own record of what it spoke — its absence here removes that corroborating evidence too. Combined with the ASR gap above, there is currently **no machine-checkable evidence of clip *content*** for any of the 26 replacements — only that they are alive, correctly sized, and were rendered 2026-08-17.

## Overall verdict

| | Alive (HTTP 200, non-zero bytes) | Duration-consistent | Content verified |
|---|---|---|---|
| 26 replacements | ✅ all 26 | ✅ all 26, delta = 0ms | ❌ not verifiable — no `word_boundaries`, ASR unreliable for `si` |
| 27 incumbents | ✅ all 27 | ✅ all 27 (uniform −24/−36ms, non-corrupt pattern) | (known corrupt by text; not re-checked here) |

**Make-before-break gate:** liveness + duration checks pass cleanly for all 26 replacements — nothing here blocks proceeding on those grounds. But relinking on *content* trust alone, with no ASR corroboration and no `word_boundaries`, is a real gap — worth a human spot-listen to a sample before the swap, not a rubber stamp. Also: **`S0225L01` has no replacement in this batch** — don't relink 27 slots, only the 26 that actually have a rendered replacement.
