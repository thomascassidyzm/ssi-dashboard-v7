#!/usr/bin/env python3
"""
Validate GATE compliance for S0041 basket
"""

import json

def load_lego_pairs():
    with open('/home/user/ssi-dashboard-v7/public/vfs/courses/spa_for_eng/lego_pairs.json', 'r', encoding='utf-8') as f:
        return json.load(f)

def build_whitelist_through_seed(data: dict, target_seed_id: str, include_target: bool = False) -> set:
    """
    Build whitelist of all Spanish words taught through target_seed_id
    If include_target=False, stops BEFORE target seed
    If include_target=True, includes target seed
    """
    whitelist = set()
    seeds = data['seeds']

    for seed in seeds:
        seed_id = seed['seed_id']

        # If we're not including target and we've reached it, stop
        if not include_target and seed_id == target_seed_id:
            break

        # Add all LEGOs from this seed
        for lego in seed['legos']:
            target = lego['target']
            words = target.split()
            for word in words:
                whitelist.add(word)

        # If we're including target and we've processed it, stop
        if include_target and seed_id == target_seed_id:
            break

    return whitelist

# Load data
data = load_lego_pairs()

# Build whitelist through S0040 (everything before S0041)
whitelist_before_s0041 = build_whitelist_through_seed(data, 'S0041', include_target=False)

print("Whitelist before S0041 (118 LEGOs):")
print(f"Total words: {len(whitelist_before_s0041)}")
print(f"Sorted words: {sorted(list(whitelist_before_s0041))}")
print()

# Check specific words
test_words = ['anoche', 'mejor', 'que', 'ayer', 'cansado', 'bien', 'me', 'siento']
print("Checking specific words:")
for word in test_words:
    status = "✓ AVAILABLE" if word in whitelist_before_s0041 else "✗ NOT AVAILABLE"
    print(f"  {word}: {status}")
