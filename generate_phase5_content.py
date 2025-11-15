#!/usr/bin/env python3
"""
Phase 5 Content Generator for Seeds S0511-S0520
Generates practice phrase baskets following Phase 5 Intelligence v7.0
"""

import json
import os
from pathlib import Path
from typing import Dict, List, Tuple, Set

# Paths
SCAFFOLD_DIR = Path("/home/user/ssi-dashboard-v7/public/vfs/courses/cmn_for_eng/phase5_scaffolds")
OUTPUT_DIR = Path("/home/user/ssi-dashboard-v7/public/vfs/courses/cmn_for_eng/phase5_outputs")

def extract_vocabulary_from_context(recent_context: Dict) -> Set[str]:
    """Extract all Spanish vocabulary from recent context (10 previous seeds)"""
    vocab = set()

    for seed_id, seed_data in recent_context.items():
        if isinstance(seed_data, dict) and 'sentence' in seed_data:
            # Get Spanish sentence (second element)
            if isinstance(seed_data['sentence'], list) and len(seed_data['sentence']) > 1:
                spanish_sent = seed_data['sentence'][1]
                words = spanish_sent.split(' | ')
                vocab.update(words)

        if isinstance(seed_data, dict) and 'new_legos' in seed_data:
            for lego in seed_data['new_legos']:
                if len(lego) >= 3:
                    # lego[2] is the Spanish translation
                    spanish_words = lego[2].split()
                    vocab.update(spanish_words)

    return vocab

def extract_vocabulary_from_earlier_legos(earlier_legos: List[Dict]) -> Set[str]:
    """Extract Spanish vocabulary from current seed's earlier LEGOs"""
    vocab = set()
    for lego in earlier_legos:
        if 'target' in lego:
            words = lego['target'].split()
            vocab.update(words)
    return vocab

def get_available_vocabulary(scaffold_data: Dict, lego_id: str) -> Set[str]:
    """Get all available vocabulary for a specific LEGO"""
    vocab = set()

    # 1. Recent context vocabulary
    if 'recent_context' in scaffold_data:
        vocab.update(extract_vocabulary_from_context(scaffold_data['recent_context']))

    # 2. Current seed's earlier LEGOs
    if 'legos' in scaffold_data and lego_id in scaffold_data['legos']:
        lego_data = scaffold_data['legos'][lego_id]
        if 'current_seed_earlier_legos' in lego_data:
            vocab.update(extract_vocabulary_from_earlier_legos(lego_data['current_seed_earlier_legos']))

    # 3. Current LEGO itself
    if 'legos' in scaffold_data and lego_id in scaffold_data['legos']:
        lego_data = scaffold_data['legos'][lego_id]
        if 'lego' in lego_data:
            lego_spanish = lego_data['lego'][1]
            words = lego_spanish.split()
            vocab.update(words)

    return vocab

def validate_spanish_phrase(spanish_phrase: str, available_vocab: Set[str]) -> Tuple[bool, List[str]]:
    """Validate that all words in Spanish phrase are from available vocabulary"""
    words = spanish_phrase.split()
    missing = []
    for word in words:
        if word not in available_vocab:
            missing.append(word)
    return len(missing) == 0, missing

def load_scaffold(seed_id: str) -> Dict:
    """Load scaffold JSON for a seed"""
    scaffold_file = SCAFFOLD_DIR / f"seed_{seed_id}.json"
    with open(scaffold_file, 'r', encoding='utf-8') as f:
        return json.load(f)

def save_output(seed_id: str, output_data: Dict):
    """Save output JSON for a seed"""
    output_file = OUTPUT_DIR / f"seed_{seed_id}.json"
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(output_data, f, ensure_ascii=False, indent=4)

def get_seed_pair(scaffold_data: Dict) -> Dict:
    """Extract the seed pair (known/target)"""
    return scaffold_data.get('seed_pair', {})

def print_lego_info(seed_id: str, lego_id: str, scaffold_data: Dict, available_vocab: Set[str]):
    """Print information about a LEGO for phrase generation"""
    lego_data = scaffold_data['legos'][lego_id]
    lego = lego_data['lego']

    print(f"\n{'='*80}")
    print(f"LEGO: {lego_id} | English: '{lego[0]}' | Chinese: '{lego[1]}'")
    print(f"Type: {lego_data.get('type', 'Unknown')} | Final: {lego_data.get('is_final_lego', False)}")
    print(f"{'='*80}")

    # Print seed context
    seed_pair = scaffold_data.get('seed_pair', {})
    if seed_pair:
        print(f"Seed Context:")
        print(f"  English: {seed_pair.get('known', '')}")
        print(f"  Chinese: {seed_pair.get('target', '')}")

    # Print available vocabulary
    print(f"\nAvailable Vocabulary ({len(available_vocab)} words):")
    sorted_vocab = sorted(list(available_vocab))
    print(f"  {', '.join(sorted_vocab)}")

    # Print earlier LEGOs available
    if lego_data.get('current_seed_earlier_legos'):
        print(f"\nEarlier LEGOs in this seed:")
        for earlier in lego_data['current_seed_earlier_legos']:
            print(f"  {earlier['id']}: {earlier['known']} / {earlier['target']}")

    print(f"\nNeeded: 10 practice phrases (2-2-2-4 distribution)")
    if lego_data.get('is_final_lego'):
        print(f"  SPECIAL: Phrase #10 must be the complete seed sentence!")

def main():
    """Main generator - coordinates the process"""
    seeds = [f"s0{i:03d}" for i in range(511, 521)]

    print("\n" + "="*80)
    print("PHASE 5 CONTENT GENERATOR - Seeds S0511-S0520")
    print("="*80)

    for seed_id in seeds:
        print(f"\n\nLoading scaffold for {seed_id.upper()}...")

        try:
            scaffold_data = load_scaffold(seed_id)
            print(f"Scaffold loaded successfully!")
            print(f"  Seed pair: {scaffold_data['seed_pair']}")

            # List all LEGOs
            legos = scaffold_data.get('legos', {})
            print(f"\n  Total LEGOs to generate: {len(legos)}")

            for lego_id in sorted(legos.keys()):
                available_vocab = get_available_vocabulary(scaffold_data, lego_id)
                print_lego_info(seed_id.upper(), lego_id, scaffold_data, available_vocab)

        except FileNotFoundError:
            print(f"ERROR: Scaffold file not found for {seed_id.upper()}")
        except Exception as e:
            print(f"ERROR processing {seed_id.upper()}: {str(e)}")

if __name__ == "__main__":
    main()
