# -*- coding: utf-8 -*-
"""Split Senedd bilingual contributions into paired, one-breath lines.

Hierarchy, most-faithful first:
  1. paragraph counts match  -> align paragraph by paragraph
  2. within a paragraph, sentence counts match -> align sentence by sentence
  3. otherwise                -> keep the unit whole (a long-but-correct line
                                 beats a short-but-mispaired one)
No paraphrase, no tidying: splitting is the only operation.
"""
import re, html

ABBR = re.compile(r"(?:\b(?:Mr|Mrs|Ms|Dr|Prof|St|Rev|Hon|e\.e|h\.y|ee|Rhif|No|vs|etc|Ll\.C|A\.S|A\.C)\.)$", re.I)

def paragraphs(raw):
    if not raw: return []
    s = raw.replace('\r', '')
    s = re.sub(r'<br\s*/?>', '</p><p>', s, flags=re.I)
    parts = re.split(r'</p>\s*<p[^>]*>|</p>|<p[^>]*>', s, flags=re.I)
    out = []
    for p in parts:
        t = re.sub(r'<[^>]+>', '', p)
        t = html.unescape(t)
        t = t.replace(' ', ' ')
        t = re.sub(r'\s+', ' ', t).strip()
        if t: out.append(t)
    return out

def sentences(text):
    """Split on sentence-final punctuation followed by whitespace + an opener."""
    out, buf = [], ''
    i, n = 0, len(text)
    while i < n:
        buf += text[i]
        if text[i] in '.!?' or text[i] == '…':
            # look ahead: whitespace then a capital / digit / quote / dash
            j = i + 1
            while j < n and text[j] in '"’”\')]':
                buf += text[j]; j += 1
            if j >= n:
                i = j; break
            if text[j] == ' ':
                k = j + 1
                while k < n and text[k] in '"‘“\'(':
                    k += 1
                if k < n and (text[k].isupper() or text[k].isdigit() or text[k] in '—-'):
                    if not ABBR.search(buf.strip()):
                        out.append(buf.strip()); buf = ''
                        i = j + 1
                        continue
            i = j
            continue
        i += 1
    if buf.strip(): out.append(buf.strip())
    return [s for s in out if s]

def split_pair(welsh_html, english_html):
    """-> (list of (welsh, english), how) where how is 'sentence'|'paragraph'|'whole'."""
    wp, ep = paragraphs(welsh_html), paragraphs(english_html)
    if not wp or not ep:
        return [], 'empty'
    if len(wp) != len(ep):
        w = ' '.join(wp); e = ' '.join(ep)
        ws, es = sentences(w), sentences(e)
        if len(ws) == len(es) and len(ws) > 1:
            return list(zip(ws, es)), 'sentence'
        return [(w, e)], 'whole'
    pairs, how = [], 'paragraph' if len(wp) > 1 else 'whole'
    any_sentence = False
    for w, e in zip(wp, ep):
        ws, es = sentences(w), sentences(e)
        if len(ws) == len(es) and len(ws) > 1:
            pairs.extend(zip(ws, es)); any_sentence = True
        else:
            pairs.append((w, e))
    if any_sentence: how = 'sentence'
    return pairs, how

# ── alignment when the sentence counts diverge ────────────────────────────────
# A translator merges two sentences or splits one; forcing 1:1 across a mismatch
# is what pairs a Welsh line with a neighbour's English. So: a small DP over
# 1:1 / 1:2 / 2:1 groupings only (no crossings, no deletions), scored on the
# length ratio the rest of this contribution actually shows. If the best path is
# not clearly good, we keep the paragraph whole instead of guessing.
import math

def _ratio(ws, es):
    w = sum(len(x) for x in ws) or 1
    e = sum(len(x) for x in es) or 1
    return w / e

def align(ws, es, ratio, penalty=0.6, accept=0.45):
    n, m = len(ws), len(es)
    INF = float('inf')
    D = [[INF] * (m + 1) for _ in range(n + 1)]
    B = [[None] * (m + 1) for _ in range(n + 1)]
    D[0][0] = 0.0
    def cost(wc, ec, extra):
        wc = max(wc, 1); ec = max(ec, 1)
        return abs(math.log(wc / (ec * ratio))) + extra
    for i in range(n + 1):
        for j in range(m + 1):
            if D[i][j] == INF: continue
            for (di, dj) in ((1, 1), (1, 2), (2, 1)):
                if i + di > n or j + dj > m: continue
                wc = sum(len(x) for x in ws[i:i + di])
                ec = sum(len(x) for x in es[j:j + dj])
                c = D[i][j] + cost(wc, ec, 0.0 if (di, dj) == (1, 1) else penalty)
                if c < D[i + di][j + dj]:
                    D[i + di][j + dj] = c
                    B[i + di][j + dj] = (i, j, di, dj)
    if D[n][m] == INF: return None
    path, i, j = [], n, m
    while (i, j) != (0, 0):
        pi, pj, di, dj = B[i][j]
        path.append((' '.join(ws[pi:pi + di]), ' '.join(es[pj:pj + dj])))
        i, j = pi, pj
    path.reverse()
    if D[n][m] / max(len(path), 1) > accept: return None
    return path

def split_pair2(welsh_html, english_html):
    """As split_pair, but aligns a count mismatch instead of giving up on it.
    -> (pairs, how) with how in 'sentence' | 'aligned' | 'whole' | 'empty'."""
    wp, ep = paragraphs(welsh_html), paragraphs(english_html)
    if not wp or not ep: return [], 'empty'
    if len(wp) != len(ep):
        wp, ep = [' '.join(wp)], [' '.join(ep)]
    ratio = _ratio([s for p in wp for s in [p]], [s for p in ep for s in [p]])
    pairs, hows = [], set()
    for w, e in zip(wp, ep):
        ws, es = sentences(w), sentences(e)
        if len(ws) == len(es):
            if len(ws) > 1: hows.add('sentence')
            else: hows.add('whole')
            pairs.extend(zip(ws, es))
            continue
        got = align(ws, es, ratio)
        if got:
            hows.add('aligned'); pairs.extend(got)
        else:
            hows.add('whole'); pairs.append((w, e))
    how = 'aligned' if 'aligned' in hows else ('sentence' if 'sentence' in hows else 'whole')
    return pairs, how
