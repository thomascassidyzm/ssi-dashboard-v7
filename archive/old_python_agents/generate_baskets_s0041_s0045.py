#!/usr/bin/env python3
"""
Generate high-quality basket files for seeds S0041-S0045
Following Phase 5 v3.0 specification with strict GATE compliance
"""

import json
from datetime import datetime
from typing import List, Dict, Set

def load_lego_pairs():
    """Load the lego_pairs.json file"""
    with open('/home/user/ssi-dashboard-v7/public/vfs/courses/spa_for_eng/lego_pairs.json', 'r', encoding='utf-8') as f:
        return json.load(f)

def build_whitelist_through_seed(data: dict, target_seed_id: str) -> Set[str]:
    """
    Build whitelist of all Spanish words taught through target_seed_id
    Returns set of exact Spanish word forms that can be used
    """
    whitelist = set()
    seeds = data['seeds']

    for seed in seeds:
        seed_id = seed['seed_id']

        # Add all LEGOs from this seed
        for lego in seed['legos']:
            target = lego['target']
            # Split multi-word LEGOs into individual words
            words = target.split()
            for word in words:
                whitelist.add(word)

        # Stop after reaching target seed
        if seed_id == target_seed_id:
            break

    return whitelist

def get_seed_data(data: dict, seed_id: str) -> dict:
    """Get data for a specific seed"""
    for seed in data['seeds']:
        if seed['seed_id'] == seed_id:
            return seed
    return None

def count_legos_in_phrase(phrase_spanish: str, whitelist: Set[str]) -> int:
    """
    Count approximate number of LEGOs in a phrase
    This is a simplified count based on word count
    """
    words = phrase_spanish.split()
    return len(words)

# Distribution requirement: 2 short (1-2), 2 quite short (3), 2 longer (4-5), 4 long (6+)
# For S0041 through S0045, we have 118+ LEGOs available

# Load data
data = load_lego_pairs()

# Build whitelists for each seed
whitelist_s0040 = build_whitelist_through_seed(data, 'S0040')
whitelist_s0041 = build_whitelist_through_seed(data, 'S0041')
whitelist_s0042 = build_whitelist_through_seed(data, 'S0042')
whitelist_s0043 = build_whitelist_through_seed(data, 'S0043')
whitelist_s0044 = build_whitelist_through_seed(data, 'S0044')

print(f"Whitelist through S0040: {len(whitelist_s0040)} words")
print(f"Sample words: {sorted(list(whitelist_s0040))[:20]}")
print()

# Get seed data
seed_s0041 = get_seed_data(data, 'S0041')
seed_s0042 = get_seed_data(data, 'S0042')
seed_s0043 = get_seed_data(data, 'S0043')
seed_s0044 = get_seed_data(data, 'S0044')
seed_s0045 = get_seed_data(data, 'S0045')

print("=" * 80)
print("SEED S0041")
print("=" * 80)
print(f"Seed sentence: {seed_s0041['seed_pair'][0]}")
print(f"English: {seed_s0041['seed_pair'][1]}")
print(f"LEGOs: {len(seed_s0041['legos'])}")
for lego in seed_s0041['legos']:
    print(f"  - {lego['id']}: '{lego['target']}' = '{lego['known']}'")
print()

print("=" * 80)
print("SEED S0042")
print("=" * 80)
print(f"Seed sentence: {seed_s0042['seed_pair'][0]}")
print(f"English: {seed_s0042['seed_pair'][1]}")
print(f"LEGOs: {len(seed_s0042['legos'])}")
for lego in seed_s0042['legos']:
    print(f"  - {lego['id']}: '{lego['target']}' = '{lego['known']}'")
print()

print("=" * 80)
print("SEED S0043")
print("=" * 80)
print(f"Seed sentence: {seed_s0043['seed_pair'][0]}")
print(f"English: {seed_s0043['seed_pair'][1]}")
print(f"LEGOs: {len(seed_s0043['legos'])}")
for lego in seed_s0043['legos']:
    print(f"  - {lego['id']}: '{lego['target']}' = '{lego['known']}'")
print()

print("=" * 80)
print("SEED S0044")
print("=" * 80)
print(f"Seed sentence: {seed_s0044['seed_pair'][0]}")
print(f"English: {seed_s0044['seed_pair'][1]}")
print(f"LEGOs: {len(seed_s0044['legos'])}")
for lego in seed_s0044['legos']:
    print(f"  - {lego['id']}: '{lego['target']}' = '{lego['known']}'")
print()

print("=" * 80)
print("SEED S0045")
print("=" * 80)
print(f"Seed sentence: {seed_s0045['seed_pair'][0]}")
print(f"English: {seed_s0045['seed_pair'][1]}")
print(f"LEGOs: {len(seed_s0045['legos'])}")
for lego in seed_s0045['legos']:
    print(f"  - {lego['id']}: '{lego['target']}' = '{lego['known']}'")
