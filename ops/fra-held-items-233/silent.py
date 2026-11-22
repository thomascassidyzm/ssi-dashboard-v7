#!/usr/bin/env python3
"""cs #233: from an edit-batch answer, the rows the batch leaves with an EMPTY audio slot (the failure Kai most wants to avoid).
usage: python3 -I silent.py <answer.json>"""
import json, sys
a = json.load(open(sys.argv[1])); last = {}
for r in a.get('results', []):
    if r.get('op') in ('seed.update', 'lego.update', 'phrase.update', 'phrase.insert', 'audio.link') and r.get('after'):
        kk = r.get('key') or {}; k = str(kk.get('id') or kk.get('lego_id') or kk.get('seed_number')); last[k] = {**r['after'], '_lego': r['op'] == 'lego.update' or last.get(k, {}).get('_lego', False)}
n = 0
for k, row in last.items():
    for col in ('known_audio_id', 'target1_audio_id', 'target2_audio_id'):
        if col in row and row[col] is None:
            n += 1; print('EMPTY', col, k)
    if row.get('_lego') and row.get('presentation_audio_id') is None:
        n += 1; print('EMPTY presentation', k)
print(sys.argv[1], 'rows', len(last), 'empty slots', n)
