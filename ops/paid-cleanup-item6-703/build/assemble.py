"""Assemble per-course plans into ops/paid-cleanup-item6-703/plan.json + plan.md (cs #703·AI)."""
import json, os, sys, collections
sys.path.insert(0, os.path.dirname(__file__)); from common import SCR
OUT = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
COURSES = ['jpn_for_eng', 'kor_for_tam', 'por_for_eng', 'ara_for_eng', 'ara_eg_for_eng', 'kor_for_hin', 'ita_for_eng', 'spa_for_eng', 'fra_for_eng', 'zho_for_jpn', 'deu_for_eng', 'deu_ch_for_eng', 'eng_for_hin']
SPELL_ONLY = {('fra_for_eng', 'S0469L01B02'): 'target', ('fra_for_eng', 'S0555L04B02'): 'target', ('por_for_eng', 'S0434L05B01'): 'target', ('por_for_eng', 'S0453L02B01'): 'target'}
def audio_need(e):
    """which clip slots a change needs new audio for, and chars (known 1 voice, target 2 voices)"""
    if e['action'] != 'edit': return [], 0
    k_ch = e['new']['known'] != e['current']['known']; t_ch = e['new']['target'] != e['current']['target']
    if (e['course'], e['row']) in SPELL_ONLY: t_ch = False
    if e['row'].endswith(tuple(f'C0{i}' for i in range(10))): return [], 0   # component tiles are never spoken
    slots, ch = [], 0
    if k_ch: slots.append('known'); ch += len(e['new']['known'] or '')
    if t_ch: slots += ['target1', 'target2']; ch += 2 * len(e['new']['target'] or '')
    if e['kind'] == 'lego' and k_ch: slots.append('presentation'); ch += len(e['new']['known'] or '') + 30
    return slots, ch
plan = []; summ = collections.OrderedDict()
for c in COURSES:
    E = json.load(open(f'{SCR}/plan-{c}.json'))
    for e in E:
        e['audio_slots'], e['audio_chars_est'] = audio_need(e)
    plan += E
    cnt = collections.Counter(e['action'] for e in E)
    summ[c] = {'entries': len(E), 'scope_rows': sum(1 for e in E if e['scope_n']), 'extra_rows': sum(1 for e in E if not e['scope_n']),
               **dict(cnt), 'chars_est': sum(e['audio_chars_est'] for e in E)}
json.dump({'job': 'cs #703·AI', 'built': os.popen('date -u +%FT%TZ').read().strip(), 'summary': summ, 'entries': plan}, open(f'{OUT}/plan.json', 'w'), ensure_ascii=False, indent=1)
scope_covered = {(e['course'], e['scope_n']) for e in plan if e['scope_n']}
print('scope rows covered:', len(scope_covered))
tot = collections.Counter()
for c, s in summ.items():
    print(c, s); tot.update({k: v for k, v in s.items()})
print('TOTAL', dict(tot))
