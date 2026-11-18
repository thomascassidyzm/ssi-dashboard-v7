#!/usr/bin/env python3
"""cs #131·AI step 3 — per-course counts from classify-131.py's TSVs, and the fix list.
A wrong clip is 'held' when it is also served by a target2 slot, or by a target1 slot that is not itself on the list
(a re-record would change words in that slot too). A wrong slot whose English says "we" is listed apart (#126 kept the
Italian "we" lines masculine). Characters = sum of the female reading's length over DISTINCT clips (as #130 costed).
  python3 summary-131.py <tsv> ...   → prints the table; writes <tsv dir>/clips-131-<course>.tsv (one line per clip)"""
import sys, collections, os
for path in sys.argv[1:]:
    rows = [l.rstrip('\n').split('\t') for l in open(path)][1:]
    H = 'course slot kind seed clip verdict why rendered_at render_route job shared_t2 also_t1 plural_we match text female known'.split()
    rows = [dict(zip(H, r)) for r in rows]
    course = rows[0]['course']
    listed = {r['slot'] for r in rows if r['verdict'] == 'wrong'}
    by = collections.defaultdict(list)
    for r in rows:
        if r['verdict'] == 'wrong': by[r['clip']].append(r)
    out = ['clip\tbucket\tfemale_text\tstored_text\tchars\tslots\tseeds\trendered_at\tjob\tnote']
    tally = collections.Counter(); chars = collections.Counter(); slots = collections.Counter()
    for clip, rs in by.items():
        r0 = rs[0]
        extra_t1 = {u for r in rs for u in r['also_t1'].split(',') if u} - listed
        note = []
        if r0['shared_t2']: note.append('ALSO-TARGET2:' + r0['shared_t2'])
        if extra_t1: note.append('also-target1-unlisted:' + ','.join(sorted(extra_t1)))
        if len({r['female'] for r in rs}) > 1: note.append('readings-differ')
        bucket = 'held' if note else ('we' if any(r['plural_we'] for r in rs) else 'fix')
        tally[bucket] += 1; chars[bucket] += len(r0['female']); slots[bucket] += len(rs)
        out.append('\t'.join([clip, bucket, r0['female'], r0['text'], str(len(r0['female'])), ','.join(r['slot'] for r in rs),
            ','.join(sorted({r['seed'] for r in rs}, key=int)), r0['rendered_at'], r0['job'], ';'.join(note)]))
    open(os.path.join(os.path.dirname(path), f'clips-131-{course}.tsv'), 'w').write('\n'.join(out) + '\n')
    v = collections.Counter(r['verdict'] for r in rows)
    unk = collections.Counter(r['why'] for r in rows if r['verdict'] == 'unknown')
    seeds_w = sorted(int(r['seed']) for r in rows if r['verdict'] == 'wrong'); seeds_u = sorted(int(r['seed']) for r in rows if r['verdict'] == 'unknown')
    print(f"{course}: {len(rows)} female slots with a differing reading; wrong {v['wrong']} slots / {len(by)} clips; right {v['right']}; unknown {v['unknown']}")
    for b in ('fix', 'we', 'held'): print(f"   {b}: {slots[b]} slots, {tally[b]} clips, {chars[b]:,} chars")
    for k, n in unk.items(): print(f"   unknown: {n} — {k}")
    print(f"   wrong seeds {seeds_w[:1]}-{seeds_w[-1:]}, unknown seeds {seeds_u[:1]}-{seeds_u[-1:]}")
