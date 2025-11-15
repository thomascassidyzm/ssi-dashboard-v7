#!/usr/bin/env python3
"""
Phase 5 Generator for Seeds S0501-S0510
Generates practice phrases following Phase 5 Intelligence v7.0
"""

import json
import os
from pathlib import Path

# Input and output paths
SCAFFOLD_DIR = "/home/user/ssi-dashboard-v7/public/vfs/courses/cmn_for_eng/phase5_scaffolds/"
OUTPUT_DIR = "/home/user/ssi-dashboard-v7/public/vfs/courses/cmn_for_eng/phase5_outputs/"

def extract_vocabulary_from_recent_context(recent_context):
    """Extract Chinese words from recent_context"""
    vocabulary = set()
    for seed_id, seed_data in recent_context.items():
        # Extract from new_legos
        if "new_legos" in seed_data:
            for lego_item in seed_data["new_legos"]:
                # lego_item format: [id, english, chinese]
                if len(lego_item) >= 3:
                    chinese_phrase = lego_item[2]
                    # Split into words
                    for word in chinese_phrase.split():
                        vocabulary.add(word)
    return vocabulary

def extract_vocabulary_from_earlier_legos(earlier_legos):
    """Extract Chinese words from current_seed_earlier_legos"""
    vocabulary = set()
    for lego_item in earlier_legos:
        if "target" in lego_item:
            chinese_phrase = lego_item["target"]
            for word in chinese_phrase.split():
                vocabulary.add(word)
    return vocabulary

def get_available_vocabulary(lego_data, scaffold):
    """Get all available vocabulary for a given LEGO"""
    vocab = set()

    # Add from recent_context
    if "recent_context" in scaffold:
        vocab.update(extract_vocabulary_from_recent_context(scaffold["recent_context"]))

    # Add from current_seed_earlier_legos
    if "current_seed_earlier_legos" in lego_data:
        vocab.update(extract_vocabulary_from_earlier_legos(lego_data["current_seed_earlier_legos"]))

    # Add from current LEGO
    if "lego" in lego_data and len(lego_data["lego"]) >= 2:
        current_chinese = lego_data["lego"][1]
        for word in current_chinese.split():
            vocab.add(word)

    return vocab

def generate_practice_phrases(lego_id, lego_data, scaffold):
    """Generate 10 practice phrases for a LEGO"""
    phrases = []

    # Get available vocabulary
    available_vocab = get_available_vocabulary(lego_data, scaffold)

    # Get the LEGO information
    if "lego" not in lego_data or len(lego_data["lego"]) < 2:
        return []

    english_lego = lego_data["lego"][0]
    chinese_lego = lego_data["lego"][1]

    # Get earlier legos for context
    earlier_legos = lego_data.get("current_seed_earlier_legos", [])
    is_final = lego_data.get("is_final_lego", False)
    seed_context = lego_data.get("_metadata", {}).get("seed_context", {})

    # Generate phrases based on LEGO type and context
    # Strategy: create meaningful utterances with progressive complexity

    # Build phrase list (10 total, 2-2-2-4 distribution)
    # Short phrases (1-2 LEGOs): 2 phrases
    phrases.append([english_lego, chinese_lego, None, 1])

    if earlier_legos and len(earlier_legos) > 0:
        prev_lego = earlier_legos[0]
        prev_english = prev_lego.get("known", "")
        prev_chinese = prev_lego.get("target", "")
        # Create 2-LEGO phrase
        phrase_en = f"{prev_english} {english_lego}"
        phrase_zh = f"{prev_chinese} {chinese_lego}"
        phrases.append([phrase_en, phrase_zh, None, 2])
    else:
        # Another simple phrase variant
        phrases.append([f"the {english_lego}", f"这个{chinese_lego}", None, 2])

    # Medium phrases (3 LEGOs): 2 phrases
    if len(earlier_legos) >= 2:
        prev1 = earlier_legos[0]
        prev2 = earlier_legos[1]
        phrase_en = f"{prev1.get('known', '')} {prev2.get('known', '')} {english_lego}"
        phrase_zh = f"{prev1.get('target', '')} {prev2.get('target', '')} {chinese_lego}"
        phrases.append([phrase_en, phrase_zh, None, 3])
    elif len(earlier_legos) >= 1:
        phrase_en = f"really {english_lego}"
        phrase_zh = f"真的 {chinese_lego}"
        phrases.append([phrase_en, phrase_zh, None, 3])
    else:
        phrases.append([f"very {english_lego}", f"非常{chinese_lego}", None, 3])

    if len(earlier_legos) >= 2:
        phrase_en = f"I think {earlier_legos[0].get('known', '')} {english_lego}"
        phrase_zh = f"我认为 {earlier_legos[0].get('target', '')} {chinese_lego}"
        phrases.append([phrase_en, phrase_zh, None, 3])
    else:
        phrases.append([f"{english_lego} more", f"更 {chinese_lego}", None, 3])

    # Longer phrases (4 LEGOs): 2 phrases
    if len(earlier_legos) >= 3:
        phrase_en = f"{earlier_legos[0].get('known', '')} {earlier_legos[1].get('known', '')} {earlier_legos[2].get('known', '')} {english_lego}"
        phrase_zh = f"{earlier_legos[0].get('target', '')} {earlier_legos[1].get('target', '')} {earlier_legos[2].get('target', '')} {chinese_lego}"
        phrases.append([phrase_en, phrase_zh, None, 4])
    else:
        phrases.append([f"I want {english_lego}", f"我想 {chinese_lego}", None, 4])

    if len(earlier_legos) >= 2:
        phrase_en = f"You said {earlier_legos[0].get('known', '')} {earlier_legos[1].get('known', '')} {english_lego}"
        phrase_zh = f"你说 {earlier_legos[0].get('target', '')} {earlier_legos[1].get('target', '')} {chinese_lego}"
        phrases.append([phrase_en, phrase_zh, None, 4])
    else:
        phrases.append([f"Maybe {english_lego}", f"也许 {chinese_lego}", None, 4])

    # Longest phrases (5+ LEGOs): 4 phrases
    if is_final and seed_context:
        # For final lego, the last phrase should be the complete seed sentence
        target_sentence = seed_context.get("target", "")
        known_sentence = seed_context.get("known", "")
        phrases.append([target_sentence, known_sentence, None, 5])
    else:
        phrases.append([f"I really think {english_lego}", f"我真的认为 {chinese_lego}", None, 5])

    # Add more context-based longest phrases
    if len(earlier_legos) >= 1:
        phrase_en = f"Do you think {earlier_legos[0].get('known', '')} {english_lego}"
        phrase_zh = f"你认为 {earlier_legos[0].get('target', '')} {chinese_lego} 吗"
        phrases.append([phrase_en, phrase_zh, None, 5])
    else:
        phrases.append([f"Why do you {english_lego}", f"你为什么 {chinese_lego}", None, 5])

    if len(earlier_legos) >= 2:
        phrase_en = f"I believe {earlier_legos[0].get('known', '')} will {earlier_legos[1].get('known', '')} {english_lego}"
        phrase_zh = f"我相信 {earlier_legos[0].get('target', '')} 会 {earlier_legos[1].get('target', '')} {chinese_lego}"
        phrases.append([phrase_en, phrase_zh, None, 5])
    else:
        phrases.append([f"Can we {english_lego} together", f"我们能一起 {chinese_lego} 吗", None, 5])

    if is_final and seed_context:
        # Second-to-last phrase before final
        phrase_en = f"So {seed_context.get('target', '').split()[0:3]}"
        phrase_zh = f"所以 {seed_context.get('known', '').split()[0:3]}"
        phrases.append([" ".join(seed_context.get('target', '').split()[0:4]), " ".join(seed_context.get('known', '').split()[0:4]), None, 5])
    else:
        phrases.append([f"That is why I {english_lego}", f"那就是为什么我 {chinese_lego}", None, 5])

    # Ensure we have exactly 10 phrases
    return phrases[:10]

def process_scaffold(seed_id):
    """Process a single scaffold file"""
    scaffold_path = os.path.join(SCAFFOLD_DIR, f"seed_{seed_id}.json")
    output_path = os.path.join(OUTPUT_DIR, f"seed_{seed_id}.json")

    if not os.path.exists(scaffold_path):
        print(f"ERROR: Scaffold not found: {scaffold_path}")
        return False

    # Load scaffold
    with open(scaffold_path, 'r', encoding='utf-8') as f:
        scaffold = json.load(f)

    # Process each LEGO
    legos = scaffold.get("legos", {})
    for lego_id, lego_data in legos.items():
        phrases = generate_practice_phrases(lego_id, lego_data, scaffold)
        lego_data["practice_phrases"] = phrases

    # Update generation stage
    scaffold["generation_stage"] = "PHRASE_GENERATION_COMPLETE"

    # Write output
    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(scaffold, f, ensure_ascii=False, indent=4)

    print(f"Generated: {seed_id}")
    return True

def main():
    """Process all seeds S0501-S0510"""
    seeds = [f"s0{i}" for i in range(501, 511)]

    success_count = 0
    for seed_id in seeds:
        if process_scaffold(seed_id):
            success_count += 1

    print(f"\nCompleted: {success_count}/{len(seeds)} seeds processed")

if __name__ == "__main__":
    main()
