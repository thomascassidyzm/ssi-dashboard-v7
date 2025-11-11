#!/usr/bin/env python3
"""
Validate GATE compliance for S0042 basket
"""

import json

def load_lego_pairs():
    with open('/home/user/ssi-dashboard-v7/public/vfs/courses/spa_for_eng/lego_pairs.json', 'r', encoding='utf-8') as f:
        return json.load(f)

def build_whitelist_through_seed(data: dict, target_seed_id: str, include_target: bool = False) -> set:
    whitelist = set()
    seeds = data['seeds']

    for seed in seeds:
        seed_id = seed['seed_id']

        if not include_target and seed_id == target_seed_id:
            break

        for lego in seed['legos']:
            target = lego['target']
            words = target.split()
            for word in words:
                whitelist.add(word)

        if include_target and seed_id == target_seed_id:
            break

    return whitelist

# Load data
data = load_lego_pairs()

# Build whitelist through S0041 (everything before S0042)
whitelist_before_s0042 = build_whitelist_through_seed(data, 'S0042', include_target=False)

print("Whitelist before S0042 (122 LEGOs):")
print(f"Total words: {len(whitelist_before_s0042)}")
print()

# Show new words from S0041
whitelist_before_s0041 = build_whitelist_through_seed(data, 'S0041', include_target=False)
new_words_s0041 = whitelist_before_s0042 - whitelist_before_s0041
print(f"New words from S0041: {sorted(list(new_words_s0041))}")
print()

# Show what S0042 will introduce
seed_s0042 = None
for seed in data['seeds']:
    if seed['seed_id'] == 'S0042':
        seed_s0042 = seed
        break

print("S0042 introduces:")
for lego in seed_s0042['legos']:
    print(f"  - {lego['id']}: '{lego['target']}' = '{lego['known']}'")
