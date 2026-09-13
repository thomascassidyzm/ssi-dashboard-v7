# Retired documentation — historical artifacts, not authorities

Everything under this directory is **a HISTORICAL ARTIFACT**. Each file was true when it was written, none of it has been maintained since, and none of it has any standing. **It MUST NOT be read as fact.** The live code and the live database are the only sources of truth about how this system behaves; a document here describing behaviour is a snapshot of somebody's belief on one day, and where it disagrees with the code, the code is right and the document is noise. Nothing was deleted — git history keeps every version at both its old and new path (`git log --follow`) — so go here for archaeology, for "what did we think in August", for provenance of a decision. Never to answer "how does this work".

Three retirement rounds so far:

- **`docs-retired-2026-08-24/`** — the first sweep, on Tom's ruling of 2026-08-24.
- **`docs-retired-2026-09-03/`** — the second sweep, on Tom's standing ruling of 2026-09-03: *"agents must read live code… docs are out of date the second they are crystallised."* Its own README names the specimen that provoked it: a document asserting a code change and 59 green tests that were never written.
- **`tools-retired-2026-09-13/`** — code, not prose: tools whose only purpose was the retired core-pod numbering, moved here byte-identical on Tom's ruling of 2026-09-13 (*"Pod-0 does not exist anymore … There is only pod-1 now"*). Nothing calls them; nothing here runs.
- **`docs-retired-2026-09-13/`** — the pod-0 retirement, on Tom's ruling of 2026-09-13: *"Pod-0 does not exist anymore. There should be zero references to it in code or docs or briefs. There is only pod-1 now."* Documents and one-off operation records whose only subject was the old `pod-0` name, its migration to `pod-1`, the sacked `pod-0.5` slate, or the retired pod-0…3 numbering, filed under their original paths.
