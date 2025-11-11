#!/usr/bin/env python3
"""
Generate baskets for Agent 06: S0151-S0160
Strict GATE compliance with exact Spanish forms only.
"""

import json
import re
from datetime import datetime
from typing import List, Dict, Set, Tuple

# Load input files
with open('/home/user/ssi-dashboard-v7/phase5_batch1_s0101_s0300/batch_input/agent_06_seeds.json', 'r') as f:
    agent_data = json.load(f)

with open('/home/user/ssi-dashboard-v7/phase5_batch1_s0101_s0300/registry/lego_registry_s0001_s0300.json', 'r') as f:
    registry = json.load(f)

def build_whitelist_up_to_lego(lego_id: str) -> Set[str]:
    """Build whitelist of exact Spanish forms up to and including specified LEGO."""
    whitelist = set()

    # Extract seed number and lego number from ID (e.g., "S0151L01" -> seed=151, lego=1)
    match = re.match(r'S(\d+)L(\d+)', lego_id)
    if not match:
        return whitelist

    target_seed = int(match.group(1))
    target_lego = int(match.group(2))

    # Iterate through all LEGOs in registry
    for lid, lego_data in registry['legos'].items():
        lmatch = re.match(r'S(\d+)L(\d+)', lid)
        if not lmatch:
            continue

        seed_num = int(lmatch.group(1))
        lego_num = int(lmatch.group(2))

        # Include if before or equal to target
        if seed_num < target_seed or (seed_num == target_seed and lego_num <= target_lego):
            if 'spanish_words' in lego_data:
                whitelist.update(lego_data['spanish_words'])

    return whitelist

def is_gate_compliant(spanish_text: str, whitelist: Set[str]) -> bool:
    """Check if Spanish text only uses words from whitelist."""
    # Tokenize Spanish text (split on spaces and punctuation)
    words = re.findall(r'\b\w+\b', spanish_text.lower())

    for word in words:
        if word not in whitelist:
            return False

    return True

def count_legos_in_phrase(phrase: str, available_legos: List[str]) -> int:
    """Count approximate number of LEGOs used in phrase."""
    # This is a simple word count heuristic
    words = re.findall(r'\b\w+\b', phrase)
    return len(words)

def generate_baskets():
    """Generate all baskets for Agent 06."""

    output = {
        "version": "curated_v6_molecular_lego",
        "agent_id": 6,
        "seed_range": "S0151-S0160",
        "course_direction": "Spanish for English speakers",
        "mapping": "KNOWN (English) → TARGET (Spanish)",
        "generation_metadata": {
            "generated_at": datetime.now().isoformat() + "Z",
            "generated_by": "Claude Code - Agent 06 Basket Generator",
            "spec_version": "v3.0",
            "gate_compliance": "STRICT - Exact forms only"
        }
    }

    # Process each seed
    for seed_data in agent_data['seeds']:
        seed_id = seed_data['seed_id']
        seed_pair = seed_data['seed_pair']
        legos = seed_data['legos']

        print(f"\n{'='*60}")
        print(f"Processing {seed_id}: {seed_pair['known']}")
        print(f"{'='*60}")

        # Add seed-level info
        output[seed_id] = {
            "seed_pair": seed_pair,
            "cumulative_legos": seed_data['cumulative_legos']
        }

        # Process each LEGO in this seed
        for lego_idx, lego in enumerate(legos):
            lego_id = lego['id']
            lego_target = lego['target']
            lego_known = lego['known']
            lego_type = lego['type']
            is_new = lego.get('new', False)

            print(f"\n  {lego_id}: {lego_known} = {lego_target}")

            # Build whitelist up to this LEGO
            whitelist = build_whitelist_up_to_lego(lego_id)
            print(f"    Whitelist size: {len(whitelist)} words")

            # Generate practice phrases based on seed
            phrases = generate_phrases_for_lego(
                seed_id, lego_id, lego_target, lego_known, lego_type,
                legos, lego_idx, whitelist, seed_pair
            )

            # Add to output
            output[lego_id] = {
                "lego": [lego_known, lego_target],
                "type": lego_type,
                "practice_phrases": phrases,
                "phrase_distribution": calculate_distribution(phrases),
                "gate_compliance": f"STRICT - All words from S0001-{lego_id} only"
            }

            if lego_idx == len(legos) - 1:
                # This is the final LEGO - mark it
                output[lego_id]["full_seed_included"] = "YES - final phrase"

    return output

def calculate_distribution(phrases: List[List]) -> Dict:
    """Calculate phrase distribution by LEGO count."""
    dist = {
        "really_short_1_2": 0,
        "quite_short_3": 0,
        "longer_4_5": 0,
        "long_6_plus": 0
    }

    for phrase in phrases:
        lego_count = phrase[3]
        if lego_count <= 2:
            dist["really_short_1_2"] += 1
        elif lego_count == 3:
            dist["quite_short_3"] += 1
        elif lego_count <= 5:
            dist["longer_4_5"] += 1
        else:
            dist["long_6_plus"] += 1

    return dist

# Placeholder for phrase generation - will implement seed by seed
def generate_phrases_for_lego(seed_id, lego_id, target, known, lego_type,
                              all_legos, lego_idx, whitelist, seed_pair):
    """Generate 10 practice phrases for a LEGO."""
    # This will be customized per seed
    # For now, return empty list as placeholder
    return []

if __name__ == "__main__":
    print("Generating baskets for Agent 06: S0151-S0160")
    print("=" * 60)

    # Test whitelist building
    print("\nTesting whitelist builder...")
    wl = build_whitelist_up_to_lego("S0151L01")
    print(f"Whitelist up to S0151L01: {len(wl)} words")
    print(f"Sample words: {sorted(list(wl))[:20]}")

    print("\n" + "=" * 60)
    print("Ready to generate baskets.")
    print("Each seed will be crafted individually with high quality phrases.")
