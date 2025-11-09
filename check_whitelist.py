#!/usr/bin/env python3
"""Check what's in the whitelist for S0159 LEGOs"""

import json
import re

def load_registry(registry_path):
    with open(registry_path, 'r', encoding='utf-8') as f:
        return json.load(f)

def load_seeds(seeds_path):
    with open(seeds_path, 'r', encoding='utf-8') as f:
        return json.load(f)

def get_whitelist_for_s0159_first_lego(registry, seeds_data):
    """Build whitelist for first LEGO in S0159"""
    whitelist = set()
    seeds = seeds_data['seeds']

    # Find S0159
    s0159 = None
    for seed in seeds:
        if seed['seed_id'] == 'S0159':
            s0159 = seed
            break

    if not s0159:
        return whitelist

    # Add all words from S0001-S0158
    for lego_id, lego_data in registry['legos'].items():
        match = re.match(r'S(\d+)L(\d+)', lego_id)
        if not match:
            continue
        seed_num = int(match.group(1))
        if seed_num < 159:
            whitelist.update(lego_data['spanish_words'])

    # Add first LEGO's words
    first_lego_id = s0159['legos'][0]['id']
    if first_lego_id in registry['legos']:
        whitelist.update(registry['legos'][first_lego_id]['spanish_words'])

    return whitelist

def main():
    registry_path = "/home/user/ssi-dashboard-v7/phase5_batch1_s0101_s0300/registry/lego_registry_s0001_s0300.json"
    seeds_path = "/home/user/ssi-dashboard-v7/phase5_batch1_s0101_s0300/batch_input/agent_06_seeds.json"

    registry = load_registry(registry_path)
    seeds_data = load_seeds(seeds_path)

    whitelist = get_whitelist_for_s0159_first_lego(registry, seeds_data)

    print(f"Whitelist size: {len(whitelist)}")
    print()

    # Check specific words
    test_words = ['no', 'lo', 'que', 'algo', 'más', 'esperar', 'estar', 'ahí',
                  'seguro', 'era', 'exactamente', 'estaba', 'esperando', 'habría', 'dicho']

    print("Checking specific words:")
    for word in test_words:
        in_list = "✓" if word in whitelist else "✗"
        print(f"  {in_list} {word}")

    # Show sample of whitelist
    print(f"\nFirst 50 words in whitelist:")
    for i, word in enumerate(sorted(whitelist)[:50]):
        print(f"  {word}")

if __name__ == "__main__":
    main()
