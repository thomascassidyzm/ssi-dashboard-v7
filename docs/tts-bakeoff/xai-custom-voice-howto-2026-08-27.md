# Recording a custom voice in the xAI console — one minute, standing up

**First, the thing that changes the job: you already have one.** SSi's live API key lists exactly one custom voice — `gfzdpspr5fdp`, named **Tom001**, created 1 May 2026 — and it is already the English known-side and presentation voice across the estate. If all you need is a voice ID, **that is it, and you do not have to record anything.**

The steps below are for making a *new or better* one.

---

## The steps

1. On your phone or laptop, open **https://console.x.ai/team/default/voice/voice-library** and sign in.
2. Choose to create a custom voice. Do it somewhere silent — xAI's own docs: *"Background noise will be cloned along with the voice."* That is the same wall you hit before, and it has not moved.
3. **Read the passphrase aloud when prompted.** xAI shows you the phrase; their speech-to-text matches it live to confirm you are present and consenting. The phrase shown in their own announcement graphic is **"My voice is my key"** — but read whatever the screen gives you, not this line.
4. **Record about a minute of natural speech.** Their guidance: aim for **90–120 seconds** (under 30 seconds "may lack detail"), maximum 120; read naturally rather than performing a script — *"If it sounds like you're reading a script, the resulting voice will match this behavior"*; speak expressively, because the clone copies your delivery patterns, not just your timbre. Match the content to what you will use it for — for SSi that means talking a learner through something, not reading prose.
5. **Wait — it takes under two minutes.** xAI then compares speaker embeddings from the passphrase clip and the full recording to confirm they are the same person.
6. **Get the ID:** on the new voice's card, tap the **three-dot menu → Copy Voice ID**. It comes back as a short alphanumeric string — yours is `gfzdpspr5fdp`; xAI's docs example is `abc123xy`. **That string is the whole thing I need back from you.** Paste it into the chat.

You can hold up to **30** custom voices, free, and using them costs no more than a built-in voice.

---

## Three honest caveats

**Region.** xAI's docs say, in terms: *"Custom Voices is currently only available in the United States, with the exception of Illinois."* Your Tom001 exists, so it was made when that was not blocking you — but **a new recording from Wales may simply be refused.** I could not test that without recording a voice, so it is unverified. If step 2 refuses you, that is why, and it is not something you did wrong.

**You cannot upload a file in the console.** The console flow is a live recording with a passphrase, by design — xAI: *"You can't clone a voice from a pre-existing recording, and you can't clone someone else's voice."* There **is** an upload route, `POST /v1/custom-voices` with a reference clip up to 120 seconds, but their docs say it is *"gated to teams on an Enterprise plan"* and needs xAI to enable it for us. If a live recording is the blocker rather than the noise, that endpoint is the door to ask about — say the word and I will find out whether our account already has it.

**Before you use any of this for the bake-off, read the terms note.** xAI's Enterprise agreement says a customer will not *"use any Output to train any foundation models, large language models, or other artificial intelligence systems"*. That reads against feeding xAI audio to Cartesia or OpenAI to build a clone there. Detail and both readings are in the companion doc.
