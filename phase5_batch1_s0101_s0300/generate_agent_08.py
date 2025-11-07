#!/usr/bin/env python3
"""
Generate baskets for Agent 08: S0171-S0180
Following Phase 5 v3 spec with STRICT GATE compliance
"""

import json
import re
from pathlib import Path
from datetime import datetime

# Load files
def load_json(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        return json.load(f)

# Build whitelist from registry up to a given seed
def build_whitelist(registry, seed_id):
    """Extract all Spanish words from LEGOs up to and including seed_id"""
    whitelist = set()
    seed_num = int(seed_id[1:5])  # S0171 -> 171

    for lego_id, lego_data in registry['legos'].items():
        # Skip non-standard LEGO IDs
        if not lego_id.startswith('S0'):
            continue
        try:
            lego_seed_num = int(lego_id[1:5])  # S0171L01 -> 171
            if lego_seed_num <= seed_num:
                if 'spanish_words' in lego_data:
                    whitelist.update(lego_data['spanish_words'])
        except (ValueError, IndexError):
            # Skip malformed LEGO IDs
            continue

    return whitelist

# Validate GATE compliance
def is_gate_compliant(spanish_phrase, whitelist):
    """Check if all words in Spanish phrase are in whitelist"""
    # Tokenize: split on spaces and remove punctuation for checking
    words = re.findall(r'\b\w+\b', spanish_phrase.lower())

    for word in words:
        if word not in whitelist:
            return False, word
    return True, None

# Generate practice phrases for a LEGO
def generate_phrases(seed_data, lego_index, whitelist, previous_seeds):
    """Generate 10 practice phrases for a given LEGO"""
    seed_id = seed_data['seed_id']
    lego = seed_data['legos'][lego_index]
    lego_id = lego['id']
    lego_target = lego['target']
    lego_known = lego['known']
    is_final_lego = (lego_index == len(seed_data['legos']) - 1)

    phrases = []

    # Determine available LEGOs and patterns
    # This is context-dependent and will be manually curated

    # For now, return placeholder structure
    # We'll manually create the phrases following the spec

    return phrases

def main():
    # Paths
    base_dir = Path('/home/user/ssi-dashboard-v7/phase5_batch1_s0101_s0300')
    input_file = base_dir / 'batch_input' / 'agent_08_seeds.json'
    registry_file = base_dir / 'registry' / 'lego_registry_s0001_s0300.json'
    output_file = base_dir / 'batch_output' / 'agent_08_baskets.json'

    # Load data
    agent_data = load_json(input_file)
    registry = load_json(registry_file)

    print(f"Loaded {len(agent_data['seeds'])} seeds")
    print(f"Registry contains {registry['total_legos']} LEGOs")

    # Generate baskets for each seed
    all_baskets = {}

    for seed_data in agent_data['seeds']:
        seed_id = seed_data['seed_id']
        print(f"\nProcessing {seed_id}...")

        # Build whitelist up to this seed
        whitelist = build_whitelist(registry, seed_id)
        print(f"  Whitelist: {len(whitelist)} words")

        # Get 5 previous seeds for recency priority
        seed_num = int(seed_id[1:5])
        previous_seeds = [f"S{i:04d}" for i in range(max(1, seed_num-5), seed_num)]

        # Process each LEGO in this seed
        for lego_idx, lego in enumerate(seed_data['legos']):
            lego_id = lego['id']
            print(f"  {lego_id}: {lego['target']} = {lego['known']}")

    print(f"\n{'='*60}")
    print("Whitelist built. Now manually generating phrases...")
    print(f"{'='*60}\n")

if __name__ == '__main__':
    main()
