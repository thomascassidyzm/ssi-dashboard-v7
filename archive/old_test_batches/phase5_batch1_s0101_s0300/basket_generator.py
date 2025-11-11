#!/usr/bin/env python3
"""
LEGO Basket Generator for Agent 08: S0171-S0180
Follows Phase 5 v3 spec with STRICT GATE compliance
"""

import json
import re
from pathlib import Path
from datetime import datetime
from collections import Counter

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
            continue

    return whitelist

# Get all available LEGOs up to a seed
def get_available_legos(registry, seed_id, current_lego_id=None):
    """Get all LEGOs available up to current_lego_id (or all of seed_id if not specified)"""
    legos = []
    seed_num = int(seed_id[1:5])

    if current_lego_id:
        current_seed_num = int(current_lego_id[1:5])
        current_lego_num = int(current_lego_id[6:8])
    else:
        current_seed_num = seed_num
        current_lego_num = 99

    for lego_id, lego_data in sorted(registry['legos'].items()):
        if not lego_id.startswith('S0'):
            continue
        try:
            lego_seed_num = int(lego_id[1:5])
            lego_num = int(lego_id[6:8])

            if lego_seed_num < current_seed_num:
                legos.append((lego_id, lego_data))
            elif lego_seed_num == current_seed_num and lego_num <= current_lego_num:
                legos.append((lego_id, lego_data))
        except (ValueError, IndexError):
            continue

    return legos

# Validate GATE compliance
def validate_gate_compliance(spanish_phrase, whitelist):
    """Check if all words in Spanish phrase are in whitelist"""
    # Tokenize: split on spaces and remove punctuation for checking
    words = re.findall(r'\b\w+\b', spanish_phrase.lower())

    violations = []
    for word in words:
        if word not in whitelist:
            violations.append(word)

    return len(violations) == 0, violations

# Count LEGOs in a phrase
def count_legos_in_phrase(phrase_spanish):
    """Approximate LEGO count by word count"""
    words = phrase_spanish.split()
    return len(words)

# Validate phrase distribution
def validate_distribution(phrases):
    """Validate 2-2-2-4 distribution"""
    counts = Counter()

    for phrase in phrases:
        spanish = phrase[1]
        lego_count = count_legos_in_phrase(spanish)

        if lego_count <= 2:
            counts['really_short_1_2'] += 1
        elif lego_count == 3:
            counts['quite_short_3'] += 1
        elif lego_count in [4, 5]:
            counts['longer_4_5'] += 1
        else:
            counts['long_6_plus'] += 1

    return {
        'really_short_1_2': counts.get('really_short_1_2', 0),
        'quite_short_3': counts.get('quite_short_3', 0),
        'longer_4_5': counts.get('longer_4_5', 0),
        'long_6_plus': counts.get('long_6_plus', 0)
    }

# Create basket structure for a LEGO
def create_lego_basket(lego_data, available_legos_count, phrases, gate_compliant=True):
    """Create the basket structure for a single LEGO"""
    distribution = validate_distribution(phrases)

    return {
        'lego': [lego_data['known'], lego_data['target']],
        'type': lego_data['type'],
        'available_legos': available_legos_count,
        'practice_phrases': phrases,
        'phrase_distribution': distribution,
        'gate_compliance': 'STRICT - All words from taught LEGOs only' if gate_compliant else 'VIOLATIONS DETECTED'
    }

def main():
    # Paths
    base_dir = Path('/home/user/ssi-dashboard-v7/phase5_batch1_s0101_s0300')
    input_file = base_dir / 'batch_input' / 'agent_08_seeds.json'
    registry_file = base_dir / 'registry' / 'lego_registry_s0001_s0300.json'
    output_file = base_dir / 'batch_output' / 'agent_08_baskets.json'

    # Load data
    agent_data = load_json(input_file)
    registry = load_json(registry_file)

    print(f"Agent 08 Basket Generator")
    print(f"{'='*60}")
    print(f"Seeds: {agent_data['seed_range']}")
    print(f"Total seeds: {agent_data['total_seeds']}")
    print(f"Registry LEGOs: {registry['total_legos']}")
    print(f"{'='*60}\n")

    # This will hold all the basket data
    all_baskets = {}

    # Process each seed
    total_legos = 0
    total_phrases = 0

    for seed_data in agent_data['seeds']:
        seed_id = seed_data['seed_id']
        print(f"\n{'='*60}")
        print(f"SEED {seed_id}: {seed_data['seed_pair']['known']}")
        print(f"{'='*60}")

        # Build whitelist
        whitelist = build_whitelist(registry, seed_id)
        print(f"Whitelist: {len(whitelist)} Spanish words available")

        # Process each LEGO
        for lego_idx, lego in enumerate(seed_data['legos']):
            lego_id = lego['id']
            total_legos += 1

            # Get available LEGOs for this point
            available = get_available_legos(registry, seed_id, lego_id)
            available_count = len(available)

            print(f"\n{lego_id} ({lego['type']}): {lego['target']} = {lego['known']}")
            print(f"  Available LEGOs: {available_count}")
            print(f"  New: {'YES' if lego.get('new') else 'NO'}")

            # Here we would generate phrases
            # For now, just show the structure
            print(f"  TODO: Generate 10 practice phrases")
            print(f"    - 2 short (1-2 LEGOs)")
            print(f"    - 2 quite short (3 LEGOs)")
            print(f"    - 2 longer (4-5 LEGOs)")
            print(f"    - 4 long (6+ LEGOs)")

    print(f"\n{'='*60}")
    print(f"SUMMARY")
    print(f"{'='*60}")
    print(f"Total LEGOs to process: {total_legos}")
    print(f"Total phrases needed: {total_legos * 10}")
    print(f"{'='*60}\n")

if __name__ == '__main__':
    main()
