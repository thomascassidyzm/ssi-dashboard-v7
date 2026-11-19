"""Shared helper for the item-11 shard-A decisions files (cs #805). Hand-authored decisions call D(); write() dumps
<course>.json for tools/plan.py and prints (a) rows whose target uses a word no LEGO has taught by that seed (P1) and
(b) nothing else. No network, no database: reads only the QA-copy snapshot in $CS_SCRATCH/snap."""
import json, os, re, sys, unicodedata
HERE = os.path.dirname(os.path.abspath(__file__))
S = os.environ.get('CS_SCRATCH', '/tmp')


class Course:
    def __init__(self, course):
        self.course, self.out = course, []
        self.snap = json.load(open(f'{S}/snap/{course}.json'))
        self.legos = sorted(self.snap['legos'], key=lambda l: (l['seed_number'], l['lego_index']))

    def toks(self, t):
        return re.findall(r"[^\W\d_]+(?:['’][^\W\d_]+)*", unicodedata.normalize('NFC', t or '').lower().replace('’', "'"))

    def vocab(self, seed, extra=()):
        v = set()
        for l in self.legos:
            if l['seed_number'] > seed:
                break
            for t in [l['target_text']] + [(c.get('target') if isinstance(c, dict) else c[1]) for c in (l.get('components') or [])]:
                v.update(self.toks(t))
        for e in extra:
            v.update(self.toks(e))
        return v

    def next_idx(self, seed):
        self._nx = getattr(self, '_nx', {})
        self._nx[seed] = self._nx.get(seed, max([l['lego_index'] for l in self.legos if l['seed_number'] == seed] + [0])) + 1
        return self._nx[seed]

    def notnew(self, seed, known, target, typ='A'):
        """raw edit-batch op: append a NOT-NEW LEGO (exact pair of an earlier NEW LEGO) at the end of its seed. Structural."""
        return {'op': 'lego.insert', 'row': {'seed_number': seed, 'lego_index': self.next_idx(seed), 'known_text': known,
                                             'target_text': target, 'type': typ, 'is_new': False}}

    def D(self, id, verdict, **kw):
        kw['id'], kw['verdict'] = id, verdict
        b = kw.pop('b', None)
        if b:
            kw['basket'] = {k: ('keep' if v == 'k' else 'del' if v == 'd' else list(v)) for k, v in b.items()}
        if 'comps' in kw:
            kw['components'] = kw.pop('comps')
        self.out.append(kw)

    def write(self):
        bad = 0
        for d in self.out:
            seed = int(d['id'][1:5])
            v = self.vocab(seed, [d.get('target', '')])
            rows = [(k, x) for k, x in (d.get('basket') or {}).items() if isinstance(x, list)] + [('add', x[1:]) for x in d.get('add', [])]
            for k, x in rows:
                miss = [w for w in self.toks(x[1]) if w not in v]
                if miss:
                    bad += 1
                    print(f'  P1? {d["id"]} {k}: {miss}  in  {x[1]}')
        json.dump({'course': self.course, 'legos': self.out}, open(os.path.join(HERE, f'{self.course}.json'), 'w'), ensure_ascii=False, indent=1)
        print(self.course, 'decisions', len(self.out), 'rows with a word not yet taught:', bad)
