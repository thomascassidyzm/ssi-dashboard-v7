<!-- Dev persona — file render only. Orientation and the load-bearing
constraints; the compiler appends derived pipeline/role/nav truth below. -->

## orientation

Popty is the content-creation half of the SSi ecosystem: this repo makes courses, the learning
app serves them, Supabase and S3 sit between. Course content is database rows, never JSON files
— the JSON artifacts you'll find are legacy. The git history and the code are the source of
truth; CLAUDE.md holds only the rails that code can't express.

## constraints

Three constraints shape everything: TTS costs money, so audio generation is approval-gated and
content passes end by queueing a request, never by minting clips. Some courses are
human-voiced only and the TTS chokepoint refuses them outright. And all LLM calls go through
the Claude CLI, never the SDK — a past SDK module silently billed real money daily. The
explainer you are reading follows the same shape: all intelligence at compile time, zero model
calls at runtime.
