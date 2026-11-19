#!/usr/bin/env python3
"""eng_for_jpn item-10 decision (cs #808·AI). Known side JAPANESE, target ENGLISH. One scan row."""
import json, os
OUT = [{'id': 'S0202L02', 'verdict': 'kai', 'why': (
    'Seed 202 "誰も質問にどう答えるかわかりませんでした。 | nobody was sure how to answer the question". The LEGO\'s English "didn\'t know how to '
    'answer the question" is not in the English seed, and is 10 syllables. The Japanese says "nobody knew" (誰も…わかりませんでした), the English says '
    '"nobody was sure". Recommend the TARGET seed "nobody knew how to answer the question" and a re-cut: "how to answer the question | 質問にどう答えるか" '
    '(7) beside L01 "nobody | 誰も"; the negative わかりませんでした under 誰も has no gap-free English of its own, so the knew/didn\'t-know piece is '
    'Kai\'s to place (a frame LEGO "nobody knew | 誰も…わかりませんでした" would be gapped, L32). Target-side seed change: not drafted until Kai rules.')}]
json.dump({'course': 'eng_for_jpn', 'legos': OUT}, open(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'eng_for_jpn.json'), 'w'), ensure_ascii=False, indent=1)
print(len(OUT), 'decisions')
