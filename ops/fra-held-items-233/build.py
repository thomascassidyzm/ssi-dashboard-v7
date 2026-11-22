#!/usr/bin/env python3
"""cs #233 (Kai's fra_for_eng held items, #424·AI's 21 items re-verified 22 Nov): authored edit ops per family.
usage: python3 -I build.py <course-dump.json> <outdir>
The dump is tools/course-optimization/course-dump-readonly-2026-10-14.cjs run on the NIGHTLY COPY. Every touched row
carries an "expect" on its current text, so drift on live since the copy aborts the batch (Kai's live pre-check rule,
19 Nov). Writes <outdir>/<family>.plan.json = {touched_seeds, ops (text only), need (audio slots), links (clip reuse)}.
Departures from #424's proposals.json, each for a reason recorded at the item:
  - 600 is cut SHORTEST (Kai 17 Nov 13:07Z, after #424 planned): only the known tense changes; no "à quel point" grow.
  - 116's seed tense change is HELD (current French is understood, not wrong — Tom 2026-09-03; a seed gets no R0.3
    latitude); only its make/do and duplicate rows go.
  - ADDCOPY rows are skipped where the seed sentence is ALREADY a phrase under a new LEGO it contains (P26 is met);
    that copy's known side is updated instead (248, 280, 480, 238, 240).
  - 543 B02 ("elle avait encore raison") is deleted, not re-worded: encore splits the LEGO, so it would not contain it.
  - 238 L02B02 ("que tu dises à quelqu'un") is deleted: it no longer contains the re-cut LEGO "que tu me dises".
  - Component rows whose prompt would teach a wrong or clashing pair are deleted with the components re-written.
  - ZUT LEGO deletes (bouger, heureuse) and capitals are HELD (see HELD below)."""
import json, os, sys

dump = json.load(open(sys.argv[1])); OUT = sys.argv[2]
C = dump['course']
P = {p['id']: p for p in dump['phrases']}
L = {l['lego_id']: l for l in dump['legos']}
S = {s['seed_number']: s for s in dump['seeds']}
AUTH = 'cs #233 for Kai (fra_for_eng held items #424·AI, learner-POV gate 17 Nov)'
INTRO = lambda k: f"The French for: '{k}', is: <break time=\"300ms\"/> <break time=\"10ms\"/>"
used = set(P)


def pid(s): return s if ':' in s else f'{C}:{s}'


class Fam:
    def __init__(self, name):
        self.name, self.ops, self.need, self.links, self.seeds, self.held = name, [], [], [], set(), []

    def seed(self, n, **st):
        s = S[n]; self.seeds.add(n)
        self.ops.append({'op': 'seed.update', 'seed_number': n, 'expect': {'known_text': s['known_text'], 'target_text': s['target_text']}, 'set': st})
        self._need('seed', n, s, st)

    def lego(self, lid, **st):
        l = L[lid]; self.seeds.add(l['seed_number'])
        self.ops.append({'op': 'lego.update', 'lego_id': lid, 'expect': {'known_text': l['known_text'], 'target_text': l['target_text']}, 'set': st})
        self._need('lego', lid, l, st)
        if 'known_text' in st and st['known_text'] != l['known_text']:
            self.need.append({'kind': 'lego', 'id': lid, 'slot': 'presentation', 'text': INTRO(st['known_text'])})

    def ph(self, sfx, **st):
        p = P[pid(sfx)]; self.seeds.add(p['seed_number'])
        self.ops.append({'op': 'phrase.update', 'phrase_id': p['id'], 'expect': {'known_text': p['known_text'], 'target_text': p['target_text']}, 'set': st})
        self._need('phrase', p['id'], p, st)

    def dele(self, sfx):
        p = P[pid(sfx)]; self.seeds.add(p['seed_number'])
        self.ops.append({'op': 'phrase.delete', 'phrase_id': p['id'], 'expect': {'known_text': p['known_text'], 'target_text': p['target_text']}})

    def ins(self, lid, kind, known, target, role='use', pos=None):
        l = L[lid]; n, i = l['seed_number'], l['lego_index']; self.seeds.add(n)
        for k in range(1, 100):
            nid = f'{C}:{lid}{kind}{k:02d}'
            if nid not in used: used.add(nid); break
        if pos is None:  # the tail; an explicit pos must be a slot freed by a delete EARLIER in this batch
            pos = max([p['position'] or 0 for p in dump['phrases'] if p['seed_number'] == n and p['lego_index'] == i] + [0])
            pos = max(pos, getattr(self, '_pos', {}).get(lid, 0)) + 1
            self.__dict__.setdefault('_pos', {})[lid] = pos
        self.ops.append({'op': 'phrase.insert', 'row': {'id': nid, 'course_code': C, 'seed_number': n, 'lego_index': i, 'position': pos,
                         'known_text': known, 'target_text': target, 'phrase_role': role, 'status': 'draft', 'introduce': True,
                         'metadata': {'format': 'build_use', 'authored': AUTH}, 'connected_lego_ids': [], 'word_count': len(target), 'lego_count': 1}})
        for slot, text in (('known', known), ('target1', target), ('target2', target)):
            self.need.append({'kind': 'phrase', 'id': nid, 'slot': slot, 'text': text})

    def link(self, kind, key, slots, frm):
        """reuse the clips another row ALREADY holds (frm = row dict from the dump); replaces any need for those slots"""
        for slot in slots:
            col = {'known': 'known_audio_id', 'target1': 'target1_audio_id', 'target2': 'target2_audio_id', 'presentation': 'presentation_audio_id'}[slot]
            self.need = [x for x in self.need if not (x['id'] == key and x['slot'] == slot)]
            self.links.append({'kind': kind, 'id': key, 'slot': slot, 'audio_id': frm[col], 'from': 'reuse'})

    def _need(self, kind, key, row, st):
        if 'known_text' in st and st['known_text'] != row['known_text']:
            self.need.append({'kind': kind, 'id': key, 'slot': 'known', 'text': st['known_text']})
        if 'target_text' in st and st['target_text'] != row['target_text']:
            for slot in ('target1', 'target2'):
                self.need.append({'kind': kind, 'id': key, 'slot': slot, 'text': st['target_text']})

    def hold(self, what, why): self.held.append({'what': what, 'why': why})


F = {}
# ---------------------------------------------------------------- 1. two-sentence (P20: a USE phrase is ONE sentence; P26 copy = seed)
f = F['two-sentence'] = Fam('two-sentence')
f.seed(141, known_text='no problem, everything is okay', target_text='pas de problème, tout va bien')
f.ph('S0141L03U09', known_text='no problem, everything is okay', target_text='pas de problème, tout va bien')
f.need = []  # same spoken words: every slot keeps (is re-linked to) its own clip
f.link('seed', 141, ['known', 'target1', 'target2'], S[141]); f.link('phrase', pid('S0141L03U09'), ['known', 'target1', 'target2'], P[pid('S0141L03U09')])
for x in f.links: x['allow_text_mismatch'] = True  # the clip says these words; only "." became "," (canon A7)
f.hold('S0082 (statement + "Why not?")', 'listed P26 no-home: a question cannot be joined by a comma; no write')

# ---------------------------------------------------------------- 2. register (the seed copy says vous like the seed)
f = F['register'] = Fam('register')
# #424 proposed copying the seed's vous form; the validator answers that "pouvez" is untaught at 174 (vocab violation),
# so the copy cannot sit here. U04 asks the SEED's English for a different French (ZUT clash with the seed): it goes.
f.dele('S0174L01U04')
f.hold('S0174 seed copy (P26)', 'listed P26 no-home: the seed\'s "pouvez-vous" is not taught at or before 174, so its own sentence cannot be a phrase here')

# ---------------------------------------------------------------- 3. 167 thin basket
f = F['167-thin'] = Fam('167-thin')
f.dele('S0167L01B04'); f.dele('S0167L01B02')
f.ins('S0167L01', 'B', 'what do you need to do tomorrow afternoon with me?', "qu'est-ce que vous devez faire demain après-midi avec moi?", 'build', pos=6)
f.ins('S0167L01', 'B', 'so what do you need to do tomorrow afternoon?', "alors, qu'est-ce que vous devez faire demain après-midi?", 'build', pos=4)
f.ins('S0167L01', 'B', 'what do you need to do tomorrow afternoon here?', "qu'est-ce que vous devez faire demain après-midi ici?", 'build')

# ---------------------------------------------------------------- 4. meaning (seed English = its LEGOs; 319 French = its LEGOs)
f = F['meaning'] = Fam('meaning')
k248 = 'I thought the film was really rubbish and I want to get my money back'
f.seed(248, known_text=k248); f.ph('S0248L02U09', known_text=k248)
k280 = 'no I only needed to do the most important job'
f.seed(280, known_text=k280); f.ph('S0280L01U10', known_text=k280)
f.dele('S0280L02U07'); f.dele('S0280L02U08')
k480 = "whatever he says it's no longer very far now"
f.seed(480, known_text=k480); f.ph('S0480L02U15', known_text=k480)
f.dele('S0480L03U02')
f.ph('S0480L03U03', known_text='no longer very far now')
f.ph('S0480L03U04', target_text="ce n'est plus un problème")
f.ph('S0480L03U05', known_text="it's no longer very far", target_text="ce n'est plus très loin")
f.seed(319, target_text='elle doit déménager dans un pays différent')
f.link('seed', 319, ['target1', 'target2'], P[pid('S0319L03U01')])

# ---------------------------------------------------------------- 5. tense
f = F['tense'] = Fam('tense')
for s in ('S0116L02B02', 'S0116L02B04', 'S0116L02U07', 'S0116L02U08', 'S0116L02U09', 'S0117L01U06'):
    f.dele(s)
f.hold('S0116 seed -> past ("that wasn\'t the best choice I could make | ce n\'était pas ...") + U10/U03 + new row',
       'the present-tense seed is understood French (Tom 2026-09-03: unnatural is not a defect) and a seed gets no R0.3 latitude; a seed rewrite is Kai\'s call')
f.ins('S0116L02', 'B', 'the best choice I could make', 'le meilleur choix que je pouvais faire', 'build', pos=4)
f.ins('S0116L02', 'B', 'the choice I could make', 'le choix que je pouvais faire', 'build', pos=6)
f.lego('S0600L05', known_text="if you'd told me", components=[{'known': 'if', 'target': 'si'}, {'known': "you'd told me", 'target': "tu m'avais dit"}])
f.ph('S0600L05C02', known_text="you'd told me")
f.ph('S0600L05B01', known_text="if you'd told me")
f.ph('S0600L05B02', known_text="if you'd told me that", target_text="si tu m'avais dit ça")
f.ph('S0600L05B03', known_text="I'd have driven if you'd told me that", target_text="j'aurais conduit si tu m'avais dit ça")
f.ph('S0600L05U01', known_text=S[600]['known_text']); f.link('phrase', pid('S0600L05U01'), ['known'], S[600])
for s in ('S0600L05U02', 'S0600L05U03', 'S0600L05U04', 'S0600L05U05'):
    f.dele(s)

# ---------------------------------------------------------------- 6. wrong-word LEGO gloss (7 items)
f = F['wrong-word'] = Fam('wrong-word')
# 238 (K40: the subjunctive carries its trigger)
f.lego('S0238L01', components=[{'known': 'wanted', 'target': 'voulait'}, {'known': 'you to', 'target': 'que tu'}])
f.ph('S0238L01B02', known_text='he wanted you to'); f.ph('S0238L01B03', known_text='she wanted you to')
f.lego('S0238L02', known_text='you to tell me', target_text='que tu me dises', type='M',
       components=[{'known': 'you to', 'target': 'que tu'}, {'known': 'tell me', 'target': 'me dises'}])
f.ph('S0238L02B01', known_text='you to tell me', target_text='que tu me dises')
f.dele('S0238L02B02')
f.ph('S0238L02B03', known_text='he wanted you to tell me', target_text='il voulait que tu me dises')
f.ins('S0238L02', 'B', 'she wanted you to tell me', 'elle voulait que tu me dises', 'build', pos=2)
f.ins('S0238L02', 'B', 'I want you to tell me', 'je veux que tu me dises', 'build')
# 240 (K41/K54: infinitive "to stop"; L02's components were another seed's -> A-type, component rows go)
f.lego('S0240L02', type='A', components=None)
f.dele('S0240L02C01'); f.dele('S0240L02C02')
f.lego('S0240L03', known_text='to stop')
f.ph('S0240L03B01', known_text='likes to stop'); f.ph('S0240L03B02', known_text='to stop before')
f.ph('S0240L03B03', known_text='to stop talking'); f.ph('S0240L03B04', known_text="doesn't like to stop")
f.ph('S0240L03U01', known_text="he doesn't like to stop talking")
# 278 (the LEGO says the seed's words)
f.lego('S0278L01', known_text='did you have to', target_text='est-ce que tu as dû',
       components=[{'known': 'did you', 'target': 'est-ce que tu as'}, {'known': 'have to', 'target': 'dû'}])
f.dele('S0278L01C01')
f.ph('S0278L01B01', known_text='did you have to', target_text='est-ce que tu as dû')
f.dele('S0278L01B02')
for sfx, k, t in (('B03', 'did you have to finish?', 'est-ce que tu as dû finir ?'), ('B04', 'did you have to leave?', 'est-ce que tu as dû partir ?'),
                  ('U01', 'did you have to stay here for the meeting?', 'est-ce que tu as dû rester ici pour la réunion ?'),
                  ('U03', 'did you have to finish everything before the meeting?', 'est-ce que tu as dû tout finir avant la réunion ?'),
                  ('U04', 'did you have to wait much longer?', 'est-ce que tu as dû attendre beaucoup plus longtemps ?'),
                  ('U05', 'did you have to do this very important thing?', 'est-ce que tu as dû faire cette chose très importante ?'),
                  ('U09', 'did you have to work here much longer than you wanted?', 'est-ce que tu as dû travailler ici beaucoup plus longtemps que tu voulais ?')):
    f.ph('S0278L01' + sfx, known_text=k, target_text=t)
for s in ('U06', 'U07', 'U08'):
    f.dele('S0278L01' + s)
f.ins('S0278L01', 'B', 'did you have to wait?', 'est-ce que tu as dû attendre ?', 'build', pos=3)
f.ins('S0278L01', 'U', S[278]['known_text'], S[278]['target_text'])  # P26 copy, seed clips
nid = f.ops[-1]['row']['id']; f.link('phrase', nid, ['known', 'target1', 'target2'], S[278])
# 170
f.lego('S0170L02', known_text='what you need', target_text='ce dont vous avez besoin',
       components=[{'known': 'what', 'target': 'ce dont'}, {'known': 'you need', 'target': 'vous avez besoin'}])
f.dele('S0170L02C01'); f.dele('S0170L02C02')
f.ph('S0170L02B01', known_text='what you need', target_text='ce dont vous avez besoin')
f.dele('S0170L02B02')
f.ph('S0170L02B03', known_text='I know what you need', target_text='je sais ce dont vous avez besoin')
for s in ('B04', 'U01', 'U03', 'U04', 'U05'):
    f.dele('S0170L02' + s)
f.ins('S0170L02', 'B', "that's what you need", "c'est ce dont vous avez besoin", 'build', pos=4)
f.ins('S0170L02', 'B', 'everything you need', 'tout ce dont vous avez besoin', 'build', pos=6)
f.ph('S0170L02U06', known_text="I'd like to know what you need", target_text="j'aimerais savoir ce dont vous avez besoin")
f.ph('S0170L02U07', known_text="I don't know what you need", target_text='je ne sais pas ce dont vous avez besoin')
f.ph('S0170L02U08', known_text=S[170]['known_text']); f.link('phrase', pid('S0170L02U08'), ['known'], S[170])
# 326 (K40: "je ne pense pas" is the trigger, so the LEGO carries it — the long cut is K40's, not a choice)
f.lego('S0326L03', known_text="I don't think she needs to", target_text="je ne pense pas qu'elle ait besoin de",
       components=[{'known': "I don't think", 'target': 'je ne pense pas'}, {'known': 'she needs to', 'target': "qu'elle ait besoin de"}])
f.dele('S0326L03C01'); f.dele('S0326L03C02')
f.ph('S0326L03B01', known_text="I don't think she needs to", target_text="je ne pense pas qu'elle ait besoin de")
f.dele('S0326L03B02')
f.ins('S0326L03', 'B', "I don't think she needs to speak", "je ne pense pas qu'elle ait besoin de parler", 'build', pos=4)
f.ph('S0326L03U01', known_text=S[326]['known_text']); f.link('phrase', pid('S0326L03U01'), ['known'], S[326])
for sfx, tail in (('U02', 'come'), ('U03', 'move'), ('U04', 'read'), ('U05', 'sell'), ('U06', 'read the same book')):
    f.ph('S0326L03' + sfx, known_text=f"I don't think she needs to {tail}")
# 543 / 387
f.lego('S0387L01', known_text='that she was right')
f.dele('S0387L01B03')
f.lego('S0543L01', known_text='she was right')
f.ph('S0543L01B01', known_text='she was right'); f.link('phrase', pid('S0543L01B01'), ['known'], S[543])
f.dele('S0543L01B02'); f.dele('S0543L01B03')
f.ins('S0543L01', 'B', 'yes she was right', 'oui elle avait raison', 'build', pos=4)
f.ins('S0543L01', 'B', 'she was right too', 'elle avait raison aussi', 'build', pos=5)
for sfx in ('U01', 'U02', 'U03'):
    p = P[pid('S0543L01' + sfx)]
    f.ph('S0543L01' + sfx, known_text=p['known_text'].replace('and she was right', 'she was right', 1))
f.dele('S0543L01U04'); f.dele('S0543L01U05')
# 275
f.lego('S0275L01', target_text='plus longtemps', components=[{'known': 'longer', 'target': 'plus longtemps'}])
f.link('lego', 'S0275L01', ['presentation'], L['S0275L01'])  # a target edit empties the intro slot; the intro ('longer') still says the LEGO
f.ph('S0275L01B01', target_text='plus longtemps'); f.link('phrase', pid('S0275L01B01'), ['target1', 'target2'], S[275])
f.ph('S0275L01U04', known_text="I think it's going to take longer", target_text='je pense que ça va prendre plus longtemps')

# ---------------------------------------------------------------- 7. ZUT
f = F['zut'] = Fam('zut')
f.need.append({'kind': 'lego', 'id': 'S0600L03', 'slot': 'presentation',
               'text': "The French for: 'how much', when you mean to what extent, is: <break time=\"300ms\"/> <break time=\"10ms\"/>"})
f.seeds.add(600)
f.hold('S0513L01 to move | bouger (LEGO delete + 8 phrases)', 'lego.delete on a released course needs kai_go/tom_go in the request (TOM_GO_REQUIRED); structural, moves learner rounds — needs Kai\'s word for this delete')
f.hold('S0408L04 happy | heureuse (LEGO delete, U04/U05 to L05, 6 phrases)', 'same: structural delete on a released course needs Kai\'s word')

# ---------------------------------------------------------------- 8. capitals
f = F['capitals'] = Fam('capitals')
f.hold('352 phrases + 191 seeds capitalised', 'policy call, not a canon fix: no canon entry or ruling settles fra capitalisation; Italian\'s lowercase pass (#883·I) was Kai\'s per-occasion approval (R0.10), and these rows are otherwise correct live content (R0.18)')

os.makedirs(OUT, exist_ok=True)
for name, f in F.items():
    json.dump({'family': name, 'touched_seeds': sorted(f.seeds), 'ops': f.ops, 'need': f.need, 'links': f.links, 'held': f.held},
              open(os.path.join(OUT, f'{name}.plan.json'), 'w'), ensure_ascii=False, indent=1)
    print(f'{name}: {len(f.ops)} ops, {len(f.need)} audio slots to resolve, {len(f.links)} reuse links, {len(f.held)} held')
