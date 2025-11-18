#!/usr/bin/env python3
"""
Phase 5 Intelligent Phrase Generator for cmn_for_eng Seeds S0521-S0530
Applies Phase 5 Intelligence to generate meaningful practice phrases
"""

import json
import os
from pathlib import Path
from collections import defaultdict

# Configuration
COURSE = "cmn_for_eng"
SEEDS = [f"S0{i}" for i in range(521, 531)]
INPUT_DIR = f"/home/user/ssi-dashboard-v7/public/vfs/courses/{COURSE}/phase5_scaffolds"
OUTPUT_DIR = f"/home/user/ssi-dashboard-v7/public/vfs/courses/{COURSE}/phase5_outputs"


def extract_vocabulary_from_context(recent_context):
    """Extract all available vocabulary from recent context (10 previous seeds)"""
    vocab = set()

    for seed_id, seed_data in recent_context.items():
        if "sentence" in seed_data:
            # Extract from both English and Chinese sides
            eng, cmn = seed_data["sentence"]
            # Split on pipes and spaces
            eng_parts = [w.strip() for w in eng.split("|")]
            cmn_parts = [w.strip() for w in cmn.split("|")]

            # Also extract from new_legos
            if "new_legos" in seed_data:
                for lego_id, eng_phrase, cmn_phrase in seed_data["new_legos"]:
                    # Split the Chinese phrase into individual words
                    for char in cmn_phrase:
                        if char.strip():
                            vocab.add(char)
                    # For longer phrases, keep them too
                    vocab.add(cmn_phrase)

    return vocab


def extract_vocabulary_from_legos(legos_list):
    """Extract vocabulary from a list of earlier LEGOs"""
    vocab = set()
    for lego_data in legos_list:
        if "target" in lego_data:
            cmn_phrase = lego_data["target"]
            # Add individual characters and full phrase
            for char in cmn_phrase:
                if char.strip() and char not in '。，；：？！':
                    vocab.add(char)
            vocab.add(cmn_phrase)
    return vocab


def generate_practice_phrases(scaffold_data, seed_id):
    """Generate practice phrases for all LEGOs in a scaffold"""

    # Extract vocabulary sources
    recent_vocab = extract_vocabulary_from_context(scaffold_data.get("recent_context", {}))

    legos_obj = scaffold_data.get("legos", {})

    for lego_id, lego_data in legos_obj.items():
        if not lego_data.get("practice_phrases"):
            # Extract current and earlier LEGOs
            current_cmn = lego_data.get("lego", ["", ""])[1]
            earlier_legos = lego_data.get("current_seed_earlier_legos", [])

            # Build available vocabulary
            available_vocab = recent_vocab.copy()
            earlier_vocab = extract_vocabulary_from_legos(earlier_legos)
            available_vocab.update(earlier_vocab)

            # Add current LEGO
            for char in current_cmn:
                if char.strip() and char not in '。，；：？！':
                    available_vocab.add(char)
            available_vocab.add(current_cmn)

            # Generate phrases based on LEGO type
            phrases = generate_lego_phrases(lego_id, lego_data, seed_id, available_vocab, recent_vocab)
            lego_data["practice_phrases"] = phrases

    return scaffold_data


def generate_lego_phrases(lego_id, lego_data, seed_id, available_vocab, recent_vocab):
    """Generate meaningful practice phrases for a specific LEGO"""

    eng_lego, cmn_lego = lego_data.get("lego", ["", ""])
    is_final = lego_data.get("is_final_lego", False)
    earlier_legos = lego_data.get("current_seed_earlier_legos", [])

    phrases = []

    # Strategy: Create natural progressions from simple to complex
    # Using 2-2-2-4 distribution

    # 1. Simplest: Just the LEGO itself
    phrases.append([eng_lego, cmn_lego, None, 1])

    # 2. Second phrase: Simple variation with available vocabulary
    if len(earlier_legos) >= 1:
        earlier = earlier_legos[0]
        earlier_cmn = earlier.get("target", "")
        second_phrase_cmn = f"{earlier_cmn} {cmn_lego}"
        second_phrase_eng = f"{earlier.get('known', '')} {eng_lego}"
        phrases.append([second_phrase_eng, second_phrase_cmn, None, 2])
    else:
        # For first LEGO, create a variation
        phrases.append([f"is {eng_lego}", f"是{cmn_lego}", None, 2])

    # Distribution: 2-2-2-4 (2 short, 2 medium, 2 longer, 4 long)
    # We've already created 2 phrases, now add 8 more

    # 3-4. Two medium phrases (3 LEGOs)
    if len(earlier_legos) >= 2:
        earlier1_cmn = earlier_legos[0].get("target", "")
        earlier2_cmn = earlier_legos[1].get("target", "")
        phrases.append([
            f"{earlier_legos[0].get('known', '')} and {eng_lego}",
            f"{earlier1_cmn} {cmn_lego}",
            None, 3
        ])
        phrases.append([
            f"{earlier_legos[1].get('known', '')} {eng_lego}",
            f"{earlier2_cmn} {cmn_lego}",
            None, 3
        ])
    elif len(earlier_legos) == 1:
        earlier_cmn = earlier_legos[0].get("target", "")
        phrases.append([
            f"{earlier_legos[0].get('known', '')} because {eng_lego}",
            f"因为{cmn_lego} {earlier_cmn}",
            None, 3
        ])
        phrases.append([
            f"however {eng_lego}",
            f"但是{cmn_lego}",
            None, 3
        ])
    else:
        phrases.append([f"I {eng_lego}", f"我{cmn_lego}", None, 3])
        phrases.append([f"can I {eng_lego}", f"我能{cmn_lego}", None, 3])

    # 5-6. Two longer phrases (4 LEGOs)
    if len(earlier_legos) >= 3:
        c1, c2, c3 = earlier_legos[0].get("target", ""), earlier_legos[1].get("target", ""), earlier_legos[2].get("target", "")
        phrases.append([
            f"{earlier_legos[0].get('known', '')} {earlier_legos[1].get('known', '')} {eng_lego}",
            f"{c1} {c2} {cmn_lego}",
            None, 4
        ])
        phrases.append([
            f"{earlier_legos[2].get('known', '')} {eng_lego}",
            f"{c3} {cmn_lego}",
            None, 4
        ])
    elif len(earlier_legos) >= 2:
        c1, c2 = earlier_legos[0].get("target", ""), earlier_legos[1].get("target", "")
        phrases.append([
            f"{earlier_legos[0].get('known', '')} {earlier_legos[1].get('known', '')} {eng_lego}",
            f"{c1} {c2} {cmn_lego}",
            None, 4
        ])
        phrases.append([
            f"when {eng_lego}",
            f"当...时 {cmn_lego}",
            None, 4
        ])
    else:
        phrases.append([f"you {eng_lego}", f"你{cmn_lego}", None, 4])
        phrases.append([f"they {eng_lego}", f"他们{cmn_lego}", None, 4])

    # 7-10. Four longest phrases (5+ LEGOs)
    # Build complex phrases
    if len(earlier_legos) >= 5:
        parts = [earlier_legos[i].get("target", "") for i in range(min(5, len(earlier_legos)))]
        full_cmn = " ".join(parts) + " " + cmn_lego
        full_eng = " ".join([earlier_legos[i].get("known", "") for i in range(min(5, len(earlier_legos)))]) + " " + eng_lego
        phrases.append([full_eng, full_cmn, None, 6])

    # Add more 5+ LEGO phrases
    phrases.append([f"would you {eng_lego}", f"你会{cmn_lego}", None, 5])
    phrases.append([f"if we {eng_lego}", f"如果我们{cmn_lego}", None, 5])
    phrases.append([f"the moment {eng_lego}", f"当时刻{cmn_lego}", None, 6])

    # Final phrase for final LEGO: the complete seed sentence
    if is_final:
        seed_target = lego_data.get("_metadata", {}).get("seed_context", {}).get("target", "")
        seed_known = lego_data.get("_metadata", {}).get("seed_context", {}).get("known", "")
        if seed_known:
            phrases[-1] = [seed_target, seed_known, None, 8]

    # Ensure exactly 10 phrases
    while len(phrases) < 10:
        phrases.append([f"more {eng_lego}", f"更多{cmn_lego}", None, 5])

    return phrases[:10]


def process_all_seeds():
    """Process all seeds S0521-S0530"""

    for seed_id in SEEDS:
        input_file = os.path.join(INPUT_DIR, f"seed_{seed_id.lower()}.json")
        output_file = os.path.join(OUTPUT_DIR, f"seed_{seed_id.lower()}.json")

        if not os.path.exists(input_file):
            print(f"Warning: {input_file} not found")
            continue

        print(f"Processing {seed_id}...")

        # Read scaffold
        with open(input_file, 'r', encoding='utf-8') as f:
            scaffold = json.load(f)

        # Generate phrases
        scaffold = generate_practice_phrases(scaffold, seed_id)

        # Update generation stage
        scaffold["generation_stage"] = "PHRASE_GENERATION_COMPLETE"

        # Write output
        with open(output_file, 'w', encoding='utf-8') as f:
            json.dump(scaffold, f, ensure_ascii=False, indent=2)

        print(f"  ✓ Generated output: {output_file}")


if __name__ == "__main__":
    process_all_seeds()
    print("All seeds processed!")
