#!/usr/bin/env python3
"""Shard runner for tools/plan.py (cs #741·AI). plan.py is run UNCHANGED; this only loosens its row-containment test in
the two places where it disagrees with the canon, so the plan's "problems" list carries real problems only:
  K54 — a verb LEGO's English is "to [verb]" and "the LEGO's phrases need not" say the "to": the word "to" in a LEGO's
        gloss is not demanded of its rows (plan.py's own seed check already skips it);
  K6  — get/getting, put/putting: a doubled final consonant before -ing/-ed is the same word.
usage (from this directory): python3 -I plan_k54.py zho_for_eng <dump.json> [--no-fetch]"""
import os, sys
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, 'tools'))
import plan

_stem, _words_in = plan.stem, plan.words_in


def stem(w):
    s = _stem(w)
    if len(s) > 3 and s[-1] == s[-2] and s[-1] not in 'aeiouls':
        s = s[:-1]
    return s


def words_in(phrase, lego):
    return _words_in(phrase, ' '.join(w for w in plan.norm(lego).split() if w != 'to') or lego)


plan.stem, plan.words_in = stem, words_in
plan.HERE = os.path.join(HERE, 'tools')
plan.ROOT = HERE
plan.main()
