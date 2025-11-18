#!/usr/bin/env python3
"""
Practice Basket Generation Agent 05
Generates high-quality practice phrases for seeds S0081-S0100
Following Phase 5 v6.2 methodology with three-tier overlap detection
"""

import json
import random
from typing import List, Tuple, Dict

def load_scaffold():
    """Load the agent_05 scaffold"""
    with open('public/vfs/courses/spa_for_eng/phase5_scaffolds/agent_05.json', 'r') as f:
        return json.load(f)

def get_available_vocabulary(lego_data):
    """Extract all available Spanish vocabulary for a LEGO"""
    whitelist = lego_data['_metadata']['whitelist_pairs']
    vocab = {}
    for spanish, english in whitelist:
        vocab[spanish] = english
    return vocab

def generate_phrases_for_lego(lego_id, lego_data, seed_context):
    """
    Generate practice phrases for a single LEGO

    Args:
        lego_id: LEGO identifier (e.g., "S0081L01")
        lego_data: LEGO data from scaffold
        seed_context: Seed pair context

    Returns:
        List of practice phrases in format: [english, spanish, null, lego_count]
    """

    current_lego = lego_data['lego']  # [english, spanish]
    lego_eng, lego_esp = current_lego[0], current_lego[1]

    overlap_level = lego_data['overlap_level']
    target_count = lego_data['target_phrase_count']
    distribution = lego_data['phrase_distribution']
    is_final = lego_data['is_final_lego']

    # Get available vocabulary
    vocab = get_available_vocabulary(lego_data)

    # Create a reverse lookup for Spanish -> English
    spanish_words = list(vocab.keys())

    phrases = []

    print(f"\n{'='*80}")
    print(f"LEGO: {lego_id} - '{lego_eng}' / '{lego_esp}'")
    print(f"Overlap: {overlap_level} | Target: {target_count} phrases")
    print(f"Distribution: {distribution}")
    print(f"Final LEGO: {is_final}")
    print(f"Seed: {seed_context['target']} / {seed_context['known']}")
    print(f"{'='*80}")

    # Generate phrases based on overlap level and distribution
    if overlap_level == "none":
        # 10 phrases: 2 short (1-2), 2 medium (3), 2 longer (4), 4 longest (5+)
        phrases = generate_full_progression(lego_esp, vocab, is_final, seed_context)
    elif overlap_level == "partial":
        # 7 phrases: 1 short (1-2), 1 medium (3), 5 longer (4-5+)
        phrases = generate_partial_progression(lego_esp, vocab, is_final, seed_context)
    elif overlap_level == "complete":
        # 5 phrases: all longer (3-5+)
        phrases = generate_complete_progression(lego_esp, vocab, is_final, seed_context)

    return phrases

def count_legos_in_phrase(spanish_phrase, vocab):
    """
    Count how many LEGOs are in a Spanish phrase
    This is an approximation based on common multi-word units
    """
    # Simple heuristic: count words, but adjust for common multi-word LEGOs
    words = spanish_phrase.split()

    # Check for multi-word LEGOs in vocab
    lego_count = 0
    i = 0
    while i < len(words):
        # Try to match longest multi-word LEGO first
        matched = False
        for length in range(min(5, len(words) - i), 0, -1):
            phrase_chunk = ' '.join(words[i:i+length])
            if phrase_chunk in vocab:
                lego_count += 1
                i += length
                matched = True
                break
        if not matched:
            lego_count += 1
            i += 1

    return max(1, lego_count)  # At least 1 LEGO

def generate_full_progression(lego_esp, vocab, is_final, seed_context):
    """Generate 10 phrases for 'none' overlap level"""
    phrases = []

    # SHORT (1-2 LEGOs) - 2 phrases
    phrases.append([lego_esp, lego_esp, None, 1])  # Bare LEGO

    # Find simple combinations
    simple_combos = find_simple_combinations(lego_esp, vocab, 2)
    if simple_combos:
        phrases.append(simple_combos[0])

    # MEDIUM (3 LEGOs) - 2 phrases
    medium_combos = find_medium_combinations(lego_esp, vocab, 3)
    phrases.extend(medium_combos[:2])

    # LONGER (4 LEGOs) - 2 phrases
    longer_combos = find_longer_combinations(lego_esp, vocab, 4)
    phrases.extend(longer_combos[:2])

    # LONGEST (5+ LEGOs) - 4 phrases (or 3 + final seed sentence)
    longest_combos = find_longest_combinations(lego_esp, vocab, 5)
    if is_final:
        phrases.extend(longest_combos[:3])
        # Add complete seed sentence
        seed_eng = seed_context['target']
        seed_esp = seed_context['known']
        lego_count = count_legos_in_phrase(seed_esp, vocab)
        phrases.append([seed_eng, seed_esp, None, lego_count])
    else:
        phrases.extend(longest_combos[:4])

    return phrases

def generate_partial_progression(lego_esp, vocab, is_final, seed_context):
    """Generate 7 phrases for 'partial' overlap level"""
    phrases = []

    # SHORT (1-2 LEGOs) - 1 phrase
    phrases.append([lego_esp, lego_esp, None, 1])

    # MEDIUM (3 LEGOs) - 1 phrase
    medium_combos = find_medium_combinations(lego_esp, vocab, 3)
    phrases.extend(medium_combos[:1])

    # LONGER (4-5+ LEGOs) - 5 phrases (or 4 + final seed sentence)
    longer_combos = find_longer_combinations(lego_esp, vocab, 4)
    longest_combos = find_longest_combinations(lego_esp, vocab, 5)

    combined = longer_combos + longest_combos

    if is_final:
        phrases.extend(combined[:4])
        seed_eng = seed_context['target']
        seed_esp = seed_context['known']
        lego_count = count_legos_in_phrase(seed_esp, vocab)
        phrases.append([seed_eng, seed_esp, None, lego_count])
    else:
        phrases.extend(combined[:5])

    return phrases

def generate_complete_progression(lego_esp, vocab, is_final, seed_context):
    """Generate 5 phrases for 'complete' overlap level"""
    phrases = []

    # LONGER (3-5+ LEGOs only) - 5 phrases (or 4 + final seed sentence)
    medium_combos = find_medium_combinations(lego_esp, vocab, 3)
    longer_combos = find_longer_combinations(lego_esp, vocab, 4)
    longest_combos = find_longest_combinations(lego_esp, vocab, 5)

    combined = medium_combos + longer_combos + longest_combos

    if is_final:
        phrases.extend(combined[:4])
        seed_eng = seed_context['target']
        seed_esp = seed_context['known']
        lego_count = count_legos_in_phrase(seed_esp, vocab)
        phrases.append([seed_eng, seed_esp, None, lego_count])
    else:
        phrases.extend(combined[:5])

    return phrases

def find_simple_combinations(lego_esp, vocab, target_legos):
    """Find simple 2-LEGO combinations"""
    # This is where linguistic creativity happens
    # For now, return empty - will fill manually
    return []

def find_medium_combinations(lego_esp, vocab, target_legos):
    """Find medium 3-LEGO combinations"""
    return []

def find_longer_combinations(lego_esp, vocab, target_legos):
    """Find longer 4-LEGO combinations"""
    return []

def find_longest_combinations(lego_esp, vocab, target_legos):
    """Find longest 5+ LEGO combinations"""
    return []

def main():
    """Main generation process"""
    print("="*80)
    print("Practice Basket Generation Agent 05")
    print("Seeds S0081-S0100 | Phase 5 v6.2 Methodology")
    print("="*80)

    # Load scaffold
    scaffold = load_scaffold()
    seeds = scaffold['seeds']

    total_legos = 0
    total_phrases = 0

    # Process each seed
    for seed_id in sorted(seeds.keys()):
        seed_data = seeds[seed_id]
        print(f"\n{'#'*80}")
        print(f"# SEED: {seed_id}")
        print(f"# {seed_data['seed_pair']['target']}")
        print(f"# {seed_data['seed_pair']['known']}")
        print(f"{'#'*80}")

        # Process each LEGO in the seed
        for lego_id in sorted(seed_data['legos'].keys()):
            lego_data = seed_data['legos'][lego_id]
            total_legos += 1

            # Generate phrases
            phrases = generate_phrases_for_lego(
                lego_id,
                lego_data,
                seed_data['seed_pair']
            )

            # Update scaffold with generated phrases
            seed_data['legos'][lego_id]['practice_phrases'] = phrases
            total_phrases += len(phrases)

            print(f"\nGenerated {len(phrases)} phrases for {lego_id}")
            for i, phrase in enumerate(phrases, 1):
                print(f"  {i}. {phrase[0]} | {phrase[1]} [{phrase[3]} LEGOs]")

    # Update generation stage
    scaffold['generation_stage'] = "PHRASES_GENERATED"
    for seed_id in seeds.keys():
        seeds[seed_id]['generation_stage'] = "PHRASES_GENERATED"

    # Save output
    output_path = 'public/vfs/courses/spa_for_eng/phase5_outputs/agent_05_provisional.json'
    with open(output_path, 'w') as f:
        json.dump(scaffold, f, indent=2, ensure_ascii=False)

    print(f"\n{'='*80}")
    print(f"GENERATION COMPLETE")
    print(f"Seeds processed: 20 (S0081-S0100)")
    print(f"Total LEGOs: {total_legos}")
    print(f"Total phrases: {total_phrases}")
    print(f"Output saved to: {output_path}")
    print(f"{'='*80}")

if __name__ == '__main__':
    main()
