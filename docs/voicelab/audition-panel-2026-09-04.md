# The Audition panel — try it

**Staging, tap this on your phone (tailnet):**
https://watson-1.tail4968cb.ts.net:8444/admin/labs/voice → press **Audition**

It is the same Popty you know, running my branch, on its own port. Log in as normal. Nothing on it touches production content; it shares the production database, so anything you *deliberately* cast on the Languages tab there is real — the Audition tab itself writes nothing anywhere.

---

## What it does

Pick a voice. Pick a language. Press **Hear it**. That is the whole thing.

- **One fixed paragraph per language.** Two voices are always compared on the same words, so nobody wins by getting the easy sentence. 23 paragraphs written, conversational, nothing brand-specific.
- **Dialects are their own entries with their own text** — Austrian German, Swiss German, Canadian French, Mexican Spanish, Brazilian Portuguese, Egyptian Arabic. Mexican Spanish says *ahorita*, *platicando*, *¿te late?*; it is not Madrid Spanish with a label on it.
- **Every audition is kept.** The second person to ask the same question pays nothing, and the panel says "already rendered" *before* you press.
- **Both dropdowns are searchable.** Type "female welsh cartesia" and it narrows.
- **The voice list is not filtered by language** — that is deliberate, and it is the whole feature. Everywhere else in the lab shows the voices *for* a language, because casting needs that. This is the question you ask before casting, so your English clone is offered in Italian.

## Two auditions I actually rendered, on your own clone (tom_001)

**Italian** — 17.5 seconds

https://watson-1.tail4968cb.ts.net/evidence/voicelab-audition-2026-09-04/01-toms-clone-italian.mp3

> È incredibile come se ne vada in fretta una mattinata. Volevo sedermi con un caffè e leggere per una mezz'ora, e invece eccomi qui, dopo tre telefonate, ancora con la camicia di ieri. Pazienza. Tanto il giardino va sistemato lo stesso, e sembra che il tempo regga fino a pomeriggio.

**Mexican Spanish** — 15.8 seconds

https://watson-1.tail4968cb.ts.net/evidence/voicelab-audition-2026-09-04/02-toms-clone-mexican-spanish.mp3

> Ahorita salgo, nada más termino de lavar los trastes. Ayer nos quedamos platicando hasta bien tarde y hoy amanecí con flojera, la verdad. ¿Te late si nos vemos en la esquina como a las seis y de ahí nos vamos caminando? Yo llevo algo para picar, tú nomás llega.

Both transcribe back whole — first word to last, nothing truncated. **I cannot judge how they sound and have not tried.** That is yours.

## What it looks like

![The panel](/evidence/voicelab-audition-2026-09-04/02-panel-italian.png)

The language filter, with dialects in their own group:

![Language filter](/evidence/voicelab-audition-2026-09-04/03-language-filter.png)

A language nobody has written a paragraph for yet reads as a gap, not a broken button:

![Not yet available](/evidence/voicelab-audition-2026-09-04/05-not-yet-available.png)

On a phone:

![Phone](/evidence/voicelab-audition-2026-09-04/06-phone.png)

## What it will never do

No `course_audio`, no manifest, no presentation row, no casting. And it opens no consent door of its own: the render goes through the same `tts-service.generate()` as everything else, so an unconsented clone is refused here exactly as it is everywhere, with the gate's own words.

## What it cost

**543 characters.** Two renders, nothing else. No matrix pre-rendered; it renders on demand and caches. The lab's daily ceiling is 60,000 characters and it refuses rather than quietly spending.

## Two things for you

1. **Lebanese and Syrian Arabic have no paragraph.** I can write one Levantine text, not two honestly different ones, and one text wearing two labels would make the audition lie about which dialect you are hearing. It wants a paragraph from someone who speaks it. Same offer stands for any language you want added.
2. **An open question I did not open.** The Italian probe last night flagged that the estate sends Cartesia its language steer in a field called `locale` while Cartesia's documented field is `language`. Cartesia returns 200 either way, so the code cannot tell which it obeys. The audition goes down the estate's own path, unchanged, so it is exactly as steered as every other render here — but if the steer is not landing, it is not landing for anything, and that is worth settling separately.
