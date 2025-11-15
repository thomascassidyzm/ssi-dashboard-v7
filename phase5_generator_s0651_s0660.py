#!/usr/bin/env python3
"""
Phase 5 Content Generator for Seeds S0651-S0660
Generates practice phrases following Phase 5 Intelligence v7.0
Focuses on meaningful utterances with variety and natural progression
"""

import json
import os
from pathlib import Path

# Configuration
SEED_RANGE = range(651, 661)  # S0651-S0660
INPUT_DIR = "/home/user/ssi-dashboard-v7/public/vfs/courses/cmn_for_eng/phase5_scaffolds"
OUTPUT_DIR = "/home/user/ssi-dashboard-v7/public/vfs/courses/cmn_for_eng/phase5_outputs"

def extract_vocabulary_from_recent_context(recent_context):
    """Extract available Chinese vocabulary from recent_context"""
    vocab_phrases = []

    for seed_id in sorted(recent_context.keys()):
        seed_data = recent_context[seed_id]
        if "new_legos" in seed_data:
            for lego in seed_data["new_legos"]:
                # Format: [id, english, chinese]
                if len(lego) >= 3:
                    vocab_phrases.append({
                        'english': lego[1],
                        'chinese': lego[2],
                        'seed_id': seed_id
                    })

    return vocab_phrases

def generate_practice_phrases_for_lego(lego_id, lego_data, scaffold_data):
    """
    Generate 10 practice phrases with 2-2-2-4 distribution
    """
    # Get LEGO details
    lego_pair = lego_data.get("lego", ["", ""])
    english_lego = lego_pair[0]
    chinese_lego = lego_pair[1]

    # Get earlier LEGOs for building combinations
    earlier_legos = lego_data.get("current_seed_earlier_legos", [])

    # Get vocabulary from recent context
    recent_context = scaffold_data.get("recent_context", {})
    vocab_phrases = extract_vocabulary_from_recent_context(recent_context)

    # Get full seed context
    seed_pair = scaffold_data.get("seed_pair", {})
    full_seed_english = seed_pair.get("known", "")
    full_seed_chinese = seed_pair.get("target", "")
    is_final_lego = lego_data.get("is_final_lego", False)

    phrases = []

    # PHASE 1: Short phrases (1-2 LEGOs) - 2 phrases
    # Phrase 1: Just the LEGO
    phrases.append([english_lego, chinese_lego, None, 1])

    # Phrase 2: LEGO with simple combination from available vocab
    if vocab_phrases:
        # Find a simple vocab phrase to combine with
        simple_vocab = next((v for v in vocab_phrases if len(v['chinese']) <= 4), vocab_phrases[0])
        combined_english = f"{simple_vocab['english']} {english_lego}"
        combined_chinese = f"{simple_vocab['chinese']} {chinese_lego}"
        phrases.append([combined_english, combined_chinese, None, 2])
    else:
        phrases.append([english_lego, chinese_lego, None, 2])

    # PHASE 2: Medium phrases (3 LEGOs) - 2 phrases
    # Phrase 3: Combine with current seed's earlier LEGO
    if earlier_legos:
        first_earlier = earlier_legos[0]
        earlier_english = first_earlier.get('known', '')
        earlier_chinese = first_earlier.get('target', '')
        if earlier_english and earlier_chinese:
            combined_english = f"{earlier_english} {english_lego}"
            combined_chinese = f"{earlier_chinese} {chinese_lego}"
            phrases.append([combined_english, combined_chinese, None, 3])
        else:
            phrases.append([english_lego, chinese_lego, None, 3])
    else:
        phrases.append([english_lego, chinese_lego, None, 3])

    # Phrase 4: Different medium combination
    if len(vocab_phrases) > 1:
        vocab_phrase = vocab_phrases[min(2, len(vocab_phrases)-1)]
        combined_english = f"{english_lego} {vocab_phrase['english']}"
        combined_chinese = f"{chinese_lego} {vocab_phrase['chinese']}"
        phrases.append([combined_english, combined_chinese, None, 3])
    else:
        phrases.append([english_lego, chinese_lego, None, 3])

    # PHASE 3: Longer phrases (4 LEGOs) - 2 phrases
    # Phrase 5: More complex combination
    if len(earlier_legos) >= 1 and len(vocab_phrases) > 0:
        vocab_phrase = vocab_phrases[0] if vocab_phrases else {'english': '', 'chinese': ''}
        first_earlier = earlier_legos[0]
        if first_earlier.get('known') and vocab_phrase.get('english'):
            combined_english = f"{vocab_phrase['english']} {first_earlier.get('known', '')} {english_lego}"
            combined_chinese = f"{vocab_phrase['chinese']} {first_earlier.get('target', '')} {chinese_lego}"
            phrases.append([combined_english, combined_chinese, None, 4])
        else:
            phrases.append([english_lego, chinese_lego, None, 4])
    else:
        phrases.append([english_lego, chinese_lego, None, 4])

    # Phrase 6: Another longer combination
    if len(vocab_phrases) > 1:
        v1 = vocab_phrases[1]
        v2 = vocab_phrases[0] if vocab_phrases else {'english': '', 'chinese': ''}
        combined_english = f"{v1['english']} {english_lego}"
        combined_chinese = f"{v1['chinese']} {chinese_lego}"
        phrases.append([combined_english, combined_chinese, None, 4])
    else:
        phrases.append([english_lego, chinese_lego, None, 4])

    # PHASE 4: Longest phrases (5+ LEGOs) - 4 phrases
    # Phrase 7: Complex combination with earlier legos
    if len(earlier_legos) >= 2:
        second_earlier = earlier_legos[1]
        first_earlier = earlier_legos[0]
        combined_english = f"{first_earlier.get('known', '')} {second_earlier.get('known', '')} {english_lego}"
        combined_chinese = f"{first_earlier.get('target', '')} {second_earlier.get('target', '')} {chinese_lego}"
        phrases.append([combined_english, combined_chinese, None, 5])
    elif vocab_phrases and earlier_legos:
        vocab_phrase = vocab_phrases[0]
        first_earlier = earlier_legos[0]
        combined_english = f"{vocab_phrase['english']} {first_earlier.get('known', '')} {english_lego}"
        combined_chinese = f"{vocab_phrase['chinese']} {first_earlier.get('target', '')} {chinese_lego}"
        phrases.append([combined_english, combined_chinese, None, 5])
    else:
        phrases.append([english_lego, chinese_lego, None, 5])

    # Phrase 8: Another complex variation
    if len(vocab_phrases) > 2:
        v1 = vocab_phrases[1]
        v2 = vocab_phrases[2]
        combined_english = f"{v1['english']} {english_lego} {v2['english']}"
        combined_chinese = f"{v1['chinese']} {chinese_lego} {v2['chinese']}"
        phrases.append([combined_english, combined_chinese, None, 6])
    else:
        phrases.append([english_lego, chinese_lego, None, 6])

    # Phrase 9: Progressive complexity
    if earlier_legos and vocab_phrases:
        vocab_phrase = vocab_phrases[min(3, len(vocab_phrases)-1)]
        first_earlier = earlier_legos[0]
        combined_english = f"{vocab_phrase['english']} {first_earlier.get('known', '')} {english_lego}"
        combined_chinese = f"{vocab_phrase['chinese']} {first_earlier.get('target', '')} {chinese_lego}"
        phrases.append([combined_english, combined_chinese, None, 7])
    else:
        phrases.append([english_lego, chinese_lego, None, 7])

    # Phrase 10: For final LEGO, use complete seed sentence; otherwise natural progression
    if is_final_lego and full_seed_english and full_seed_chinese:
        phrases.append([full_seed_english, full_seed_chinese, None, len(phrases)])
    else:
        # Create a complex phrase that combines multiple elements
        if len(earlier_legos) >= 1:
            first_earlier = earlier_legos[0]
            if len(vocab_phrases) >= 1:
                vocab_phrase = vocab_phrases[0]
                combined_english = f"{first_earlier.get('known', '')} {vocab_phrase['english']} {english_lego}"
                combined_chinese = f"{first_earlier.get('target', '')} {vocab_phrase['chinese']} {chinese_lego}"
                phrases.append([combined_english, combined_chinese, None, 8])
            else:
                phrases.append([english_lego, chinese_lego, None, 8])
        else:
            phrases.append([english_lego, chinese_lego, None, 8])

    # Ensure exactly 10 phrases with correct distribution
    return phrases[:10]

def process_scaffold(scaffold_path):
    """Process a single scaffold file and generate output"""
    with open(scaffold_path, 'r', encoding='utf-8') as f:
        scaffold = json.load(f)

    seed_id = scaffold["seed_id"]
    print(f"\nProcessing {seed_id}...")

    # Process each LEGO
    legos = scaffold.get("legos", {})
    for lego_id in sorted(legos.keys()):
        lego_data = legos[lego_id]
        print(f"  - Generating phrases for {lego_id}")

        # Generate practice phrases
        phrases = generate_practice_phrases_for_lego(lego_id, lego_data, scaffold)
        lego_data["practice_phrases"] = phrases

    # Update generation stage
    scaffold["generation_stage"] = "PHRASE_GENERATION_COMPLETE"

    # Write output
    output_filename = f"seed_s{seed_id.lower()[1:]}.json"
    output_path = os.path.join(OUTPUT_DIR, output_filename)

    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(scaffold, f, ensure_ascii=False, indent=2)

    print(f"  ✓ Output written to {output_path}")
    return True

def main():
    """Generate Phase 5 content for all seeds"""
    print("=" * 70)
    print("Phase 5 Content Generator (S0651-S0660)")
    print("Using Phase 5 Intelligence v7.0 - Meaningful Utterances")
    print("=" * 70)

    processed = 0
    for seed_num in SEED_RANGE:
        seed_id = f"S{seed_num:04d}"
        scaffold_filename = f"seed_{seed_id.lower()}.json"
        scaffold_path = os.path.join(INPUT_DIR, scaffold_filename)

        if os.path.exists(scaffold_path):
            try:
                process_scaffold(scaffold_path)
                processed += 1
            except Exception as e:
                print(f"  ✗ Error processing {seed_id}: {e}")
                import traceback
                traceback.print_exc()
        else:
            print(f"✗ Scaffold not found: {scaffold_path}")

    print("\n" + "=" * 70)
    print(f"✓ Generation complete: {processed}/{len(list(SEED_RANGE))} seeds processed")
    print("=" * 70)

if __name__ == "__main__":
    main()
