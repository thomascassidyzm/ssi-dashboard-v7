# Senedd S4C bullying session — can we get clean Welsh floor audio?

Narrow fact-finding only. Four questions, answered by actually probing the stream, not by reading documentation about how Senedd broadcasts "normally" work.

**The session**: Culture, Communications, Welsh Language, Sport, and International Relations Committee (Sixth Senedd), **11 January 2024, 09:30**, agenda item "8. Allegations concerning bullying at S4C: evidence session with S4C." Witnesses Rhodri Williams and Chris Jones, chaired by Delyth Jewell, Alun Davies among members present. Identified with high confidence from `record.senedd.wales/Committee/13847`, which was fetched and read directly — it names all the people and events in the brief (Capital Law report, board discussion, etc.) and its internal date matches (`MeetingDate: 2024-01-11T09:30:02` in the transcript XML). No ambiguity here; the date did not need guessing.

---

## VERDICT ON Q1, up front: no separate floor-language channel exists. Not "mixed" — there is only ONE audio track in the container at all, and it is labelled English.

I did not read a help page and infer this. I found the actual meeting's actual player, pulled the actual HLS master manifest served for this specific video, and read what it declares:

```
http://nafw.cdn.vustreams.com/j/fb8a96ee-edb3-4af5-a20f-81e4c15e57d7/interpretation/interpretation.isml/interpretation.m3u8?t=2024-01-11T09:30:00
```

```
#EXT-X-MEDIA:TYPE=AUDIO,GROUP-ID="audio-aacl-96",LANGUAGE="en",NAME="English",DEFAULT=YES,AUTOSELECT=YES,CHANNELS="2"
```

That is the **entire** AUDIO section of the manifest — one group, one language tag (`en`), marked as the only, default, auto-selected track. `ffprobe` against the manifest confirms the same thing at the codec level: every audio stream it enumerates is `codec_name=aac`, `TAG:language=en`. There is no second AUDIO group, no alternate rendition, no `cy` tag anywhere in the manifest.

I also tried to force a Welsh-only variant by guessing the CDN's own naming convention (the stream folder is literally named `interpretation`, which was itself a strong clue): I requested `floor`, `welsh`, `cy`, `english`, `en`, `original`, `source`, `main`, `video` in place of `interpretation` in the same path — every one of those 404s; only `interpretation` resolves. The player page's own "Cymraeg / English" toggle (`data-language-code="cy"/"en"`, `class="language-selector"`) is the **website chrome language**, not an audio-track selector — it changes which language the surrounding webpage is in, not which language plays. That toggle is exactly the kind of thing that could be mistaken for a floor-language switch from documentation alone, and it isn't one.

So: Watson's "Senedd broadcasts carry the floor language and the English interpretation as separate audio channels" is **wrong for this stream** — not unverified, actually contradicted by the manifest. Watson's "Senedd.tv normally has a language selector on the player" is **true but irrelevant** — the selector that exists switches the page, not the audio. This matches, and now technically explains, what Aran heard by ear: one track, English interpretation over the Welsh, nothing to switch to.

**How I did the probe** (so it's reproducible): opened `https://record.senedd.wales/Committee/13847` → found its `senedd.tv/en/13847?startPos=…` links → that page embeds `https://player.senedd.tv/Player/Index/{guid}` → that inner player page contains the literal JS `src: "http://nafw.cdn.vustreams.com/.../interpretation.m3u8"` → fetched that manifest with `curl`, read it, and confirmed with `ffprobe` against the same URL. All read-only, all under a few hundred KB total.

---

## Q2 — any other route to clean Welsh audio for this session?

Checked and empty, each on its own merits:

- **S4C Clic**: S4C's own news coverage exists (this made national news — Rhodri Williams and Chris Jones were interviewed by ITV Wales and covered by Nation.Cymru) but that is S4C's own edited news reporting *about* the hearing, not the Senedd's raw floor feed of the hearing itself. Not checked further — it's a different object (produced news package, not source proceedings) and out of scope for "the Senedd's own archive," which is what was asked.
- **BBC Cymru / BBC Sounds**: not searched in detail — no indication in any result that BBC carries full committee sessions as opposed to news clips; would be the same category problem as S4C Clic (edited news, not source feed).
- **A Senedd YouTube channel carrying committee sessions**: searched directly. The only Senedd-family YouTube channel that turned up is `@seneddieuenctidcymru` (the Welsh Youth Parliament) — not this committee. Senedd's own site repeatedly names Senedd.tv, not YouTube, as "the online broadcast channel for the Welsh Parliament" holding archived committee coverage. No committee-session YouTube archive exists that I could find.
- **A podcast or audio-only feed of proceedings**: searched directly — nothing surfaced beyond Senedd.tv itself.
- **Alternate player endpoint / language query param**: tried `?lang=cy` on the player URL directly — still 302s to the same single-track stream, no different manifest.
- **The "Request clip download" feature on the Senedd.tv player itself**: this is a real route, but it draws from the exact same `interpretation.m3u8` source already probed above, so a requested clip would carry the same single English-labelled track — it's a delivery mechanism (email a download link, rate-limited to 10 requests/24h), not a different audio source. It requires submitting an email address and waiting up to an hour for a link, so per the brief's standing instruction I did not submit one; it wouldn't have changed the technical answer anyway, since the source is already inspected directly at the manifest level.

**Bottom line for Q2: no route to a clean, Welsh-only recording of this specific session exists via the Senedd's own archive or any adjacent public archive I could find.**

---

## Q3 — what does the Senedd actually say about reuse? (verbatim, from `https://senedd.wales/commission/access-to-information/copyright/`, the page the site's own "Terms and Conditions" link actually resolves to)

This page covers **both** the written material and Senedd.tv video/audio in one set of terms — it does not split them:

> "Commission copyright protected material may be reproduced free of charge in any format or medium without requiring specific permission. This is subject to the Terms of Use set out below. Where any of the Commission copyright items on these sites are being republished or copied to others, the source of the material must be identified and the copyright status acknowledged."

> "Use of video and audio clips from Senedd.tv is subject to Commission copyright and the Terms of Use set out above."

> "You are encouraged to use and re-use the material that is available to download and share on Senedd.tv, with only a few conditions."

> "Clips of Commission copyright protected material taken for Senedd.tv may be downloaded and stored on your equipment free of charge without requiring specific permission but always subject to and in accordance with these Terms. Any such downloaded clips remain subject to Commission copyright and you are granted a non-exclusive, non-transferable, non-assignable, terminable royalty free licence to download and store such clips on your equipment. We may terminate this licence at any time by notice to you... If we terminate this licence, you must cease using and irretrievably delete any downloaded clips."

> "You may edit the content of downloaded clips into different formats to enable viewing, and you may take steps to improve the accessibility of the material, including adding captions and/or subtitles, subject to and in accordance with these Terms. Material must not be adapted, altered or manipulated in any other way."

The only reuse restrictions stated anywhere on the page:

> "You may not use the material for satirical purposes; or advertising, promotion, commercial sponsorship, or any other form of publicity for commercial purposes or financial gain."

> "You may not use the material on any website, social media or any other platform that promotes, encourages, or facilitates illegal activity; encourages hatred on grounds of [protected characteristics]... or promotes, encourages, or facilitates anti-social behaviour."

Also relevant, on third-party material specifically (evidence-session witnesses are exactly this category):

> "Some of the material featured on these sites reproduces material submitted to the Senedd by third parties for the purposes of Senedd Business and is subject to the copyright of those third parties. The permission to reproduce Commission copyright material does not extend to third party copyright material. Before reproducing the third party copyright material you must satisfy yourself that you have a right to do so without infringing copyright."

**Reading this against the specific use in mind** (excerpting audio into private learning material for one named learner): nothing here forbids it — it isn't satirical, commercial-promotional, or hate-related, and clips can be downloaded and even re-edited (captions/format changes are explicitly allowed; other "adaptation" is not). The one live ambiguity is the "third party copyright" sentence: Rhodri Williams and Chris Jones's spoken evidence is their own contribution to Senedd business, not a submitted third-party document, so my reading is that this sentence is aimed at things like written submissions and doesn't touch spoken evidence — but that reading is mine, not the page's explicit wording, and this is a policy/taste call, not a technical one. **Flagging for Tom rather than resolving it**, per the brief's own instruction on ambiguity.

The separate "Re-using Public Sector Information" page (`senedd.wales/commission/access-to-information/re-using-public-sector-information/`) covers a different thing — bulk/dataset reuse under the Open Government Licence — and isn't the operative page for Senedd.tv clips; the copyright page above is.

---

## Q4 — machine-readable transcript: yes, a real one exists, and I downloaded and verified it

`business.senedd.wales`'s own "About the Record of Proceedings" page states outright: *"If you are a developer looking to use the XML version of the Record of Proceedings please see our guide to using Senedd information."* Followed that to a live tool at `record.senedd.wales/XMLExport`, searched it by committee/date to find this exact meeting (`meetingID=13847`), and downloaded:

```
https://record.senedd.wales/XMLExport/Download?meetingID=13847&xmlDownloadType=BilingualTranscript
```

This is a real 833KB, well-formed XML file, one `<XML_...Bilingual>` element per spoken contribution (347 contributions), each carrying: the Welsh text, the English text, the speaker's name and job title, the exact agenda-item tag, and — genuinely useful for this project — **a direct timestamped Senedd.tv deep link for both the original-language and interpreted playback of that exact contribution** (`contribution_spoken_seneddTv` / `contribution_translated_seneddTv`, e.g. `senedd.tv/cy/13847?startPos=-34188&l=cy`). I confirmed Rhodri Williams (59 contributions) and Chris Jones (20 contributions) are both present in the file, tagged under agenda item `240111-4` (the XML's own sequential item numbering for that day, which is 5 items long — it doesn't match the printed agenda's "item 8" numbering, but the content and witnesses are unambiguously the S4C evidence session).

English-only and Welsh-only XML exports of the same meeting also exist at the same URL pattern with `xmlDownloadType=EnglishTranscript` / `WelshTranscript`. There is also a plain HTML rendering of the same transcript, paragraph-by-paragraph with per-contribution share-anchors, at `https://record.senedd.wales/Committee/13847` — that page is scrapeable but the XML export is the actual structured/machine-readable answer to this question.

One caveat: the general committee/date search UI on the `XMLExport` page (`SelectedCommitteeID` dropdown) only lists the *current* Seventh Senedd committee names, so if you use the UI you won't find this Sixth Senedd committee by name — you have to search "All committees" by date range instead (`Committee=0`, exact-day range fails silently at the AJAX layer; a 3-day window found it). Once you have the meetingID, the `Download` URL works directly regardless.

---

## What failed, plainly

- `business.senedd.wales/ieIssueDetails.aspx` (the page that would list every meeting under the "Allegations concerning bullying at S4C" agenda item, i.e. the natural index page for this whole story) is blocked by an Azure Web Application Firewall challenge (`title>Azure WAF</title`) to both plain `curl` and the WebFetch tool — never got past it, worked around it by going straight to the record/player/XML layer instead, which is the layer that actually mattered for these four questions.
- The `XMLExport` UI's exact-single-day search silently returns 0/0 results (confirmed it isn't a real "no meetings that day" answer by widening the range and finding the meeting 1 day either side); worth knowing if anyone else uses that tool by hand.
- I did not attempt to actually *listen* to the audio (no whisper/speech tooling installed on this box, and installing one was explicitly out of scope for this job) — the "one track, English-labelled, DEFAULT=YES" manifest finding plus Aran's own ear-report together are treated here as sufficient corroboration that this track is the English-over-Welsh mix, not literal Welsh-only audio mislabelled. That is an inference from two independent signals, not a first-hand listen — flagging it as exactly that.

## Needing Tom

1. Whether the "third-party copyright" ambiguity in Q3 (spoken evidence vs. submitted documents) needs a definitive answer before Aran uses any clip, or whether "spoken evidence is Commission copyright, use it" is close enough to proceed on.
2. Given Q1's answer, this is a "human reads the transcript aloud" job, not a "recast the real voices" job — Aran's "next week" framing was premised on real-voice audio existing; it doesn't. That changes the shape of the work but is Aran/Tom's call, not mine to resolve here.
