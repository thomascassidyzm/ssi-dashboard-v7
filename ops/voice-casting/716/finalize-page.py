#!/usr/bin/env python3
"""cs #716·AI — put the header, count line and honest gaps on page.md (built by build-page.py)."""
import json, re, sys, os
work, chars = sys.argv[1], int(sys.argv[2])
md = open(os.path.join(work, 'page.md')).read()
st = json.load(open(os.path.join(work, 'page-stats.json')))
gone = [u for u in st['unheard'] if u[2].startswith('GONE')]
other = [u for u in st['unheard'] if not u[2].startswith('GONE')]
playable = st['new'] + st['had']
total = playable + len(st['unheard'])

head = f"""# Voice casting, every Popty language: now with every Cartesia voice playable (18 Nov, #716·AI)

**{playable} of {total} native Cartesia voices that #711 could only list by name now play right here. {len(gone)} cannot be heard because Cartesia has withdrawn them (GONE). {len(other)} are unheard for any other reason.** Every sample is **UNHEARD by anyone but you**. Nothing was cast.

How the samples were made: through Voice Lab's own sample route (Kai's key), one clip per voice, all voices in a language on **the same course line**, so you compare like with like. The line is printed at the top of each language. **{st['new']} new samples** were rendered for **{chars:,} Cartesia characters** (Voice Lab ledger, 18 Nov; cap was 40,000), and **{st['had']}** were reused because they already existed. No Azure was spent. Czech, Hungarian, Russian and Indonesian have no course line anywhere, so their voices read one everyday line written for this page (best effort): *Dneska odpoledne půjdu s kamarádem na kávu.* / *Ma délután egy barátommal megyünk kávézni.* / *Сегодня днём я пойду с другом выпить кофе.* / *Sore ini saya mau minum kopi dengan teman.* Languages known only from the known side (Bengali, Tamil, Kannada, Gujarati, Punjabi) use a known-side line from their eng_for_ course; Syrian Arabic uses its pod line.

**GONE voices ({len(gone)})**: Cartesia answers "voice not found", so they cannot be cast. Several are the current draft nominees, so pick someone else there: """ + ', '.join(f'{n} ({c})' for c, n, _ in gone) + """.

Everything below is #711's page (current cast, what each course resolves to, recommended pick per role, Azure confirm rows), unchanged except that each voice now has its player.

"""
md = md.replace('**Nothing was rendered, and no cast was changed.**', '**No cast was changed.** (#711 rendered nothing; #716 added the samples below.)')
md = re.sub(r'\)\*(Cartesia speaks it, but nothing is cast|Cast on Azure|No Cartesia voice: confirm)', r')  \n*\1', md)
gap_new = (f"**Cartesia voices:** {playable} of {total} are playable; {len(gone)} are GONE (listed at the top). "
           + (f"Still unheard for another reason: {', '.join(f'{n} ({c}: {w})' for c, n, w in other)}. " if other else '')
           + "**ElevenLabs:** still not listed, because Popty has no route to list or sample ElevenLabs voices. ")
md = re.sub(r'\*\*661 native Cartesia voices have no free preview\.\*\*.*?\*\*Not done\*\*: say if you want it, or name only the languages you care about\.', gap_new, md, count=1, flags=re.S)
md = re.sub(r'\*\*Most draft-only languages .*?after a paid sample\.\*\*', '', md, count=1, flags=re.S)
md = md.replace('**ElevenLabs alternatives are not listed.**', '')
open(os.path.join(work, 'page-final.md'), 'w').write(head + md)
print(playable, total, len(gone), len(other))
