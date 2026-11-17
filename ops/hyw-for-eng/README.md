# ops/hyw-for-eng — authoring files for the Western Armenian course `hyw_for_eng` (cs #405·AI)

Work product shared by the applier and its phrase-shard workers. Nothing here regenerates from the database:
these files are the source the course is written from (through Popty's edit-batch door, never SQL).

- `english-1-300.tsv` — the English skeleton: seeds 1-300 of `hye_for_eng`, unchanged.
- `seeds/*.txt` — each seed's Western Armenian sentence and its LEGOs in teaching order (`+` new, `=` already taught).
- `gloss.tsv` — literal word glosses, used as the components of multi-word LEGOs.
- `phrases/*.txt` — practice phrases per new LEGO: `@S0001L02` then `B | English | Armenian` (build) / `U | … | …` (use).
- `hywlib.py`, `validate.py` — the checks: `python3 ops/hyw-for-eng/validate.py [--seeds-only] [--range A-B]`.

## Course-wide forms (decided once; every phrase follows them)

Western Armenian, classical spelling (է, օ, եւ, -ութիւն, յ-, ւ). Sources: UD_Western_Armenian-ArmTDP corpus
(attestation counts), Wiktionary Western conjugation tables, hyw.wikipedia.

- **No subject pronoun for I / you / we** (the verb ending says it): *I want* = կ՚ուզեմ. **He / she** = ան and **they** = անոնք are kept: *he wants* = ան կ՚ուզէ.
- **Present**: կը + verb (կ՚ before a vowel): կը խօսիմ, կ՚ուզեմ. No կը on կրնամ, գիտեմ, ունիմ, եմ.
- **Negative present**: չեմ / չես / չի (չ՚ before a vowel) / չենք / չեն + the -ր form: չեմ ուզեր, չեմ խօսիր, չեմ կրնար, ան չ՚ուզեր, չի սիրեր.
- **Past (was …ing, used to, wanted)**: կը + -էի: կ՚ուզէի, կը խօսէինք; negative չէի ուզեր.
- **Future / going to / will**: պիտի + subjunctive: պիտի փորձեմ; negative պիտի չ-: պիտի չսպասեմ. **պիտի never means "must".**
- **Would / would like**: պիտի + past subjunctive: պիտի ուզէի, պիտի ըլլար.
- **Have to / need to / must / should**: պէտք է + subjunctive: պէտք է երթամ. *Shouldn't*: պէտք չէ + subjunctive. *Had to*: պէտք էր + past subjunctive.
- **Need (a thing) / don't need to**: պէտք ունիմ (+ dative), պէտք չունիմ + -ելու.
- **Can**: կրնամ, կրնաս, կրնայ; negative չեմ կրնար; past կրնայի, չէի կրնար; *to be able* կարենալ; future պիտի կարենամ, պիտի չկարենամ.
- **Want someone to**: կ՚ուզեմ որ + subjunctive (կ՚ուզեմ որ խօսիս).
- **That** (I think that, I hope that) = որ. **If** (condition) = եթէ. **If / whether** only inside taught chunks (վստահ չեմ թէ, կամ թէ, ես ինծի կը հարցնեմ թէ).
- **What**: question ինչ; "the thing that" ինչ որ (ինչ որ ըսիր).
- **Know**: a fact = գիտեմ / չեմ գիտեր; a person = ճանչնալ, always taught with its person inside the LEGO.
- **My / your** = the ending -ս / -դ (անունս, ընկերդ); **his / her** = անոր … -ը, own = իր.
- **With** = dative + հետ (ինծի հետ, քեզի հետ, մեզի հետ, անոնց հետ). **To me / you / him, her / us** = ինծի / քեզի / իրեն / մեզի. **Me / you / it / them** as object = զիս / քեզ / զայն / զանոնք.
- **Nobody / nothing** take an affirmative verb: ոչ ոք վստահ էր, ոչինչ կ՚աշխատի.
- **A / an** = մը after the noun (բառ մը); մըն before է / էր.
- say ըսել · do ընել · be ըլլալ · speak խօսիլ · learn սորվիլ · try փորձել · go երթալ · friend ընկեր · here հոս · there հոն · bad գէշ · easy դիւրին · slowly կամաց · again նորէն · yet տակաւին · morning առտու · evening իրիկուն · minute վայրկեան · bus հանրակառք · car ինքնաշարժ · television հեռատեսիլ.
