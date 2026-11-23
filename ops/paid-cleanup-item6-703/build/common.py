"""Shared helpers for the item-6 plan builders (cs #703·AI). Reads a dump made by
ops/paid-cleanup-scan-447/dump-course.py (Popty script-view) and the scope file; no DB access."""
import json, os, re, sys
SCR = os.environ.get('ITEM6_DATA') or os.environ['CS_SCRATCH']
def dump(course):
    return json.load(open(f'{SCR}/dump/{course}.json'))
def index(course):
    d = dump(course); idx = {}
    for s in d['seeds']:
        idx[f"SEED{s['n']}"] = ('seed', s, None, None)
        for l in s['legos']:
            idx[l['id']] = ('lego', s, l, None)
            for p in l['phrases']:
                if ':' in p['id']: idx[p['id'].split(':')[-1]] = ('phrase', s, l, p)
    return d, idx
def scope(course):
    return [r for r in json.load(open(f'{SCR}/scope.json')) if r['course'] == course]
def row_text(idx, rid):
    k, s, l, p = idx[rid]; o = p or l or s
    return {'known': o['known'], 'target': o['target'], 'kind': k}
def entry(idx, course, rid, defect, action, new=None, source='', confidence='sure', scope_n=None, note='', checks=''):
    cur = row_text(idx, rid)
    e = {'course': course, 'row': rid, 'kind': cur['kind'], 'scope_n': scope_n,
         'current': {'known': cur['known'], 'target': cur['target']}, 'defect': defect, 'action': action,
         'new': new, 'source': source, 'confidence': confidence, 'note': note, 'checks': checks}
    return e
def op_of(e):
    """plan entry -> checker op (check.cjs) ; drop/keep entries give none"""
    if e['action'] == 'delete': return {'op': 'delete', 'id': e['row']}
    if e['action'] in ('edit',):
        o = {'op': e['kind'], 'id': e['row']}
        if e['new'].get('known') is not None and e['new']['known'] != e['current']['known']: o['known'] = e['new']['known']
        if e['new'].get('target') is not None and e['new']['target'] != e['current']['target']: o['target'] = e['new']['target']
        return o
    if e['action'] == 'insert':
        return {'op': 'insert', 'id': e['row'], 'lego': e['lego'], 'role': e.get('role', 'use'), 'known': e['new']['known'], 'target': e['new']['target']}
    return None
def write(course, entries):
    out = f'{SCR}/plan-{course}.json'
    json.dump(entries, open(out, 'w'), ensure_ascii=False, indent=1)
    ops = [o for o in (op_of(e) for e in entries) if o]
    json.dump([{'course': course, 'ops': ops}], open(f'{SCR}/ops-{course}.json', 'w'), ensure_ascii=False, indent=1)
    print(course, 'entries', len(entries), 'ops', len(ops))
