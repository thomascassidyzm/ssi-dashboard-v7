#!/usr/bin/env python3
"""
Validate all generated baskets for S0041-S0045
Check GATE compliance and distribution requirements
"""

import json
from typing import Dict, Set

def load_lego_pairs():
    with open('/home/user/ssi-dashboard-v7/public/vfs/courses/spa_for_eng/lego_pairs.json', 'r', encoding='utf-8') as f:
        return json.load(f)

def build_whitelist_through_lego(data: dict, target_seed: str, target_lego_num: int) -> Set[str]:
    """
    Build whitelist up to and including a specific LEGO within a seed
    target_lego_num: 1-indexed (1 = first LEGO, 2 = second LEGO, etc.)
    """
    whitelist = set()
    seeds = data['seeds']

    for seed in seeds:
        seed_id = seed['seed_id']

        # Add LEGOs from this seed
        for i, lego in enumerate(seed['legos'], 1):
            # If we've reached the target seed
            if seed_id == target_seed:
                # Only add LEGOs up to target_lego_num
                if i < target_lego_num:
                    target = lego['target']
                    words = target.split()
                    for word in words:
                        whitelist.add(word)
                else:
                    # We've reached the target LEGO, stop
                    return whitelist
            else:
                # Not at target seed yet, add all LEGOs
                target = lego['target']
                words = target.split()
                for word in words:
                    whitelist.add(word)

        # If we just finished the target seed but target_lego_num was beyond the seed
        if seed_id == target_seed:
            return whitelist

    return whitelist

def validate_basket(basket_path: str, data: dict):
    """Validate a single basket file"""
    with open(basket_path, 'r', encoding='utf-8') as f:
        basket = json.load(f)

    seed_id = basket['seed']
    print(f"\n{'='*80}")
    print(f"VALIDATING: {seed_id}")
    print(f"{'='*80}")

    # Get seed data
    seed_data = None
    for seed in data['seeds']:
        if seed['seed_id'] == seed_id:
            seed_data = seed
            break

    if not seed_data:
        print(f"ERROR: Could not find seed {seed_id} in lego_pairs.json")
        return False

    all_valid = True

    # Validate each LEGO basket
    lego_num = 1
    for lego_data in seed_data['legos']:
        lego_id = lego_data['id']
        basket_key = lego_id.replace('L0', 'L').replace('S', 'S')  # Normalize key

        # Find the basket key (could be S0041L01, S0041L02, etc.)
        lego_basket = None
        for key in basket.keys():
            if key.startswith(seed_id) and key[len(seed_id):].startswith('L'):
                try:
                    key_lego_num = int(key.replace(seed_id + 'L', '').replace(seed_id + 'L0', ''))
                    if key_lego_num == lego_num:
                        lego_basket = basket[key]
                        basket_key = key
                        break
                except:
                    pass

        if not lego_basket:
            print(f"  ✗ {lego_id}: Basket not found")
            all_valid = False
            lego_num += 1
            continue

        # Build whitelist for this LEGO (everything before this LEGO)
        whitelist = build_whitelist_through_lego(data, seed_id, lego_num)

        # Add the current LEGO being taught
        current_lego_words = lego_data['target'].split()
        whitelist.update(current_lego_words)

        print(f"\n  {basket_key}: '{lego_data['target']}' = '{lego_data['known']}'")
        print(f"  Available words: {len(whitelist)}")

        # Check each practice phrase
        phrases = lego_basket['practice_phrases']
        violations = []

        for i, phrase in enumerate(phrases, 1):
            english, spanish, pattern, count = phrase
            words = spanish.replace('.', '').replace(',', '').replace('¿', '').replace('?', '').split()

            for word in words:
                if word not in whitelist:
                    violations.append(f"    Phrase {i}: '{word}' not in whitelist - Spanish: '{spanish}'")

        if violations:
            print(f"  ✗ GATE VIOLATIONS:")
            for v in violations:
                print(v)
            all_valid = False
        else:
            print(f"  ✓ GATE compliance: PASSED")

        # Check distribution
        dist = lego_basket['phrase_distribution']
        short = dist['really_short_1_2']
        quite_short = dist['quite_short_3']
        longer = dist['longer_4_5']
        long = dist['long_6_plus']

        total = short + quite_short + longer + long

        print(f"  Distribution: {short} short, {quite_short} quite short, {longer} longer, {long} long (total: {total})")

        if long < 4:
            print(f"  ✗ DISTRIBUTION ERROR: Only {long} long phrases, need 4+")
            all_valid = False
        else:
            print(f"  ✓ Distribution: PASSED (4+ long phrases)")

        lego_num += 1

    return all_valid

# Load data
data = load_lego_pairs()

# Validate each basket
baskets = [
    '/home/user/ssi-dashboard-v7/agent_generated_baskets_s0006_s0030/lego_baskets_s0041.json',
    '/home/user/ssi-dashboard-v7/agent_generated_baskets_s0006_s0030/lego_baskets_s0042.json',
    '/home/user/ssi-dashboard-v7/agent_generated_baskets_s0006_s0030/lego_baskets_s0043.json',
    '/home/user/ssi-dashboard-v7/agent_generated_baskets_s0006_s0030/lego_baskets_s0044.json',
    '/home/user/ssi-dashboard-v7/agent_generated_baskets_s0006_s0030/lego_baskets_s0045.json',
]

all_passed = True
for basket_path in baskets:
    if not validate_basket(basket_path, data):
        all_passed = False

print(f"\n{'='*80}")
if all_passed:
    print("✓ ALL BASKETS PASSED VALIDATION")
else:
    print("✗ SOME BASKETS FAILED VALIDATION")
print(f"{'='*80}\n")
