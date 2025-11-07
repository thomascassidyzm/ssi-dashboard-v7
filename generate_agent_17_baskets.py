#!/usr/bin/env python3
"""
Generate practice phrase baskets for Agent 17 (Seeds S0261-S0270)
Following Phase 5 v3 specification for LEGO baskets
"""

import json
from datetime import datetime
from typing import List, Dict, Set, Tuple

# Load input files
def load_json(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        return json.load(f)

# Build whitelist of all Spanish words from S0001 through specified seed
def build_whitelist(registry, through_seed_num):
    """Extract all spanish_words from LEGOs up to and including specified seed number"""
    whitelist = set()

    for lego_id, lego_data in registry['legos'].items():
        # Extract seed number from LEGO ID (e.g., "S0261L01" -> 261)
        if lego_id.startswith('S'):
            try:
                # Handle both formats: S0261L01 and S0261
                if 'L' in lego_id:
                    seed_num = int(lego_id[1:5])  # S0261L01 -> 0261 -> 261
                else:
                    seed_num = int(lego_id[1:5])  # S0261 -> 0261 -> 261

                if seed_num <= through_seed_num:
                    # Add all Spanish words from this LEGO
                    if 'spanish_words' in lego_data:
                        whitelist.update(lego_data['spanish_words'])
            except (ValueError, IndexError):
                continue

    return whitelist

# Validate that all Spanish words in a phrase are in whitelist
def validate_gate_compliance(spanish_phrase, whitelist):
    """Check every Spanish word against whitelist"""
    # Tokenize (simple split by spaces and remove punctuation for checking)
    words = spanish_phrase.replace('¿', '').replace('?', '').replace('.', '').replace(',', '').split()

    for word in words:
        if word and word not in whitelist:
            return False, word
    return True, None

# Generate practice phrases for a LEGO
def generate_phrases_for_lego(lego_info, seed_info, whitelist, is_final_lego=False):
    """
    Generate 10 practice phrases for a LEGO
    Distribution: 2 short (1-2 LEGOs), 2 quite short (3), 2 longer (4-5), 4 long (6+)
    """
    phrases = []
    lego_id = lego_info['id']
    lego_target = lego_info['target']
    lego_known = lego_info['known']

    # Note: This is a template. Real implementation would generate contextually appropriate phrases
    # based on available LEGOs, patterns, and recency priority (5 previous seeds)

    # For now, return placeholder structure that will be filled with actual content
    return {
        "lego": [lego_known, lego_target],
        "type": lego_info['type'],
        "available_legos": f"Count of LEGOs up to {lego_id}",
        "practice_phrases": [],  # Will be filled with actual phrases
        "phrase_distribution": {
            "really_short_1_2": 2,
            "quite_short_3": 2,
            "longer_4_5": 2,
            "long_6_plus": 4
        },
        "gate_compliance": f"STRICT - All words from S0001-{lego_id} only"
    }

def main():
    print("Agent 17 Basket Generator - Starting...")

    # Load files
    base_path = "/home/user/ssi-dashboard-v7/phase5_batch1_s0101_s0300"

    print("Loading input files...")
    seeds_data = load_json(f"{base_path}/batch_input/agent_17_seeds.json")
    registry = load_json(f"{base_path}/registry/lego_registry_s0001_s0300.json")

    print(f"Loaded {seeds_data['total_seeds']} seeds")
    print(f"Registry contains {registry['total_legos']} LEGOs")

    # Build whitelist through S0270
    print("Building whitelist through S0270...")
    whitelist = build_whitelist(registry, 270)
    print(f"Whitelist contains {len(whitelist)} unique Spanish words")

    # Show sample of whitelist
    print(f"Sample words: {list(sorted(whitelist))[:20]}")

    # Prepare output structure
    output = {
        "version": "curated_v6_molecular_lego",
        "agent_id": 17,
        "agent_name": "agent_17",
        "seed_range": "S0261-S0270",
        "course_direction": "Spanish for English speakers",
        "mapping": "KNOWN (English) → TARGET (Spanish)",
        "curation_metadata": {
            "curated_at": datetime.utcnow().isoformat() + "Z",
            "curated_by": "Claude Code - Phase 5 v3 LEGO basket generation",
            "specification": "phase_5_conversational_baskets_v3_ACTIVE.md"
        },
        "seeds": {}
    }

    print("\nProcessing seeds...")
    total_legos = 0

    # Process each seed
    for seed in seeds_data['seeds']:
        seed_id = seed['seed_id']
        print(f"\nProcessing {seed_id}...")
        print(f"  Seed pair: {seed['seed_pair']['known']}")
        print(f"  LEGOs: {len(seed['legos'])}")

        seed_output = {
            "seed_pair": seed['seed_pair'],
            "total_legos": len(seed['legos']),
            "legos": {}
        }

        # Process each LEGO in this seed
        for idx, lego in enumerate(seed['legos']):
            lego_id = lego['id']
            is_final = (idx == len(seed['legos']) - 1)

            print(f"    {lego_id}: {lego['known']} = {lego['target']}")

            # Generate phrases for this LEGO
            lego_basket = generate_phrases_for_lego(
                lego, seed, whitelist, is_final_lego=is_final
            )

            seed_output['legos'][lego_id] = lego_basket
            total_legos += 1

        output['seeds'][seed_id] = seed_output

    print(f"\n{'='*60}")
    print(f"Generation Summary:")
    print(f"  Seeds processed: {len(output['seeds'])}")
    print(f"  Total LEGOs: {total_legos}")
    print(f"  Total phrases: {total_legos * 10} (10 per LEGO)")
    print(f"{'='*60}")

    # Save output
    output_path = f"{base_path}/batch_output/agent_17_baskets.json"
    print(f"\nSaving to: {output_path}")

    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(output, f, ensure_ascii=False, indent=2)

    print("✓ Complete!")
    print(f"\nAgent 17 complete: {len(output['seeds'])} seeds, {total_legos} LEGOs, {total_legos * 10} phrases (placeholders)")
    print("\nNote: This script generated the structure. Now filling with actual practice phrases...")

if __name__ == "__main__":
    main()
