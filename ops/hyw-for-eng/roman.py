#!/usr/bin/env python3
# Western Armenian romanisation BY RULE, generated from the final text (cs #405·AI). Western sound values:
# բ գ դ ձ ջ = p k t ts ch, պ կ տ ծ ճ = b g d dz j; ը and the unwritten helping vowel = ə; յ- = h-; -այ = -a.
# A reading aid, not a transliteration standard; stress and loan-words are not modelled.
import re, sys
C = {'բ':'p','գ':'k','դ':'t','զ':'z','թ':'t','ժ':'zh','լ':'l','խ':'kh','ծ':'dz','կ':'g','հ':'h','ձ':'ts','ղ':'gh','ճ':'j','մ':'m',
     'ն':'n','շ':'sh','չ':'ch','պ':'b','ջ':'ch','ռ':'r','ս':'s','վ':'v','տ':'d','ր':'r','ց':'ts','փ':'p','ք':'k','ֆ':'f','յ':'y','ւ':'v'}
V = {'ա':'a','ե':'e','է':'e','ը':'ə','ի':'i','ո':'o','օ':'o'}
STOPS = 'պբփտդթկգք'
WHOLE = {'եւ':'yev','եմ':'em','ես':'es','ենք':'enk','են':'en','ով':'ov','ու':'u','հայ':'hay','ի':'i'}
def word(w):
    if w in WHOLE: return WHOLE[w]
    w = w.replace('՚', '')
    out = []; i = 0; n = len(w)
    isv = lambda ch: ch in V
    # helping vowel at the start of the word
    cons = lambda ch: ch in C and ch != 'ւ'
    pre = ''
    if n >= 2 and cons(w[0]) and cons(w[1]) and not (w[0] == 'յ'):
        if w[0] in 'սզշ' and w[1] in STOPS: pre = 'ə'
        else: pre = None  # insert after first consonant
    while i < n:
        ch = w[i]; nx = w[i+1] if i + 1 < n else ''; nx2 = w[i+2] if i + 2 < n else ''
        if ch == 'ո' and nx == 'ւ':
            out.append('v' if (nx2 and isv(nx2)) and i > 0 else 'u'); i += 2; continue
        if ch == 'ի' and nx == 'ւ':
            out.append('iv' if i + 2 == n or isv(nx2) else 'yu'); i += 2; continue
        if ch == 'ե' and nx == 'ա': out.append('ya'); i += 2; continue
        if ch == 'ե' and nx == 'օ': out.append('yo'); i += 2; continue
        if ch == 'ո' and nx == 'յ':
            out.append('o' if i + 2 == n else 'uy'); i += 2; continue
        if ch == 'ա' and nx == 'յ' and i + 2 == n and sum(1 for c in w if c in V) > 1 or (ch == 'ա' and nx == 'յ' and i + 2 == n and w in ('չկայ', 'կայ')):
            out.append('a'); i += 2; continue
        if ch == 'ե' and i == 0: out.append('ye'); i += 1; continue
        if ch == 'ո' and i == 0 and nx != 'ւ': out.append('vo'); i += 1; continue
        if ch == 'յ' and i == 0: out.append('h'); i += 1; continue
        if ch in V: out.append(V[ch]); i += 1; continue
        if ch in C:
            out.append(C[ch])
            if i == 0 and pre is None: out.append('ə')
            i += 1; continue
        out.append(ch); i += 1
    return (pre or '') + ''.join(out)
def roman(text):
    q = '՞' in text
    t = text.replace('՞', '').replace('՛', '').replace('՜', '')
    parts = re.split(r'([^Ա-և՚]+)', t)
    res = ''.join(word(p.lower()) if re.match(r'^[Ա-և՚]+$', p) else p for p in parts)
    res = res.replace('։', '?' if q else '.').replace('՝', ',')
    if q and '?' not in res: res += '?'
    res = re.sub(r'\bes indzi\b', 'yes indzi', res)
    return res
if __name__ == '__main__':
    for a in sys.argv[1:]: print(a, '->', roman(a))
