#!/usr/bin/env python3
"""
Phase 5 Practice Phrase Generation for cmn_for_eng (Local/Non-API version)
Uses systematic linguistic approach without requiring API calls.
"""

import json
from pathlib import Path
from typing import Dict, List, Tuple

COURSE_PATH = Path("/home/user/ssi-dashboard-v7/public/vfs/courses/cmn_for_eng")
SCAFFOLDS_DIR = COURSE_PATH / "phase5_scaffolds"
OUTPUTS_DIR = COURSE_PATH / "phase5_outputs"
SEED_RANGE = range(391, 401)

def extract_vocab_from_context(scaffold: Dict) -> Dict:
    """Extract all vocabulary from recent context"""
    vocab = {}

    for seed_id, context in scaffold.get("recent_context", {}).items():
        for lego_id, known, target in context.get("new_legos", []):
            # Store each Chinese piece with its English equivalent
            if target not in vocab:
                vocab[target] = {
                    "english": known,
                    "lego_id": lego_id,
                    "source": seed_id
                }

    return vocab

def get_available_vocab_for_lego(scaffold: Dict, lego_index: int) -> Dict:
    """Get vocabulary available for a specific LEGO"""
    vocab = {}
    lego_ids = list(scaffold["legos"].keys())

    # 1. Recent context vocabulary
    vocab.update(extract_vocab_from_context(scaffold))

    # 2. Earlier LEGOs in current seed
    for i in range(lego_index):
        earlier_lego_id = lego_ids[i]
        earlier_data = scaffold["legos"][earlier_lego_id]
        chinese = earlier_data["lego"][1]
        vocab[chinese] = {
            "english": earlier_data["lego"][0],
            "lego_id": earlier_lego_id,
            "source": "current_seed"
        }

    # 3. Current LEGO
    current_lego_id = lego_ids[lego_index]
    current_data = scaffold["legos"][current_lego_id]
    chinese = current_data["lego"][1]
    vocab[chinese] = {
        "english": current_data["lego"][0],
        "lego_id": current_lego_id,
        "source": "current"
    }

    return vocab

def break_into_words(phrase: str) -> List[str]:
    """Break Chinese phrase into words (simple space-based)"""
    return phrase.strip().split()

def combine_words(words: List[str], n: int) -> List[str]:
    """Generate n-word combinations from available words"""
    if n == 0:
        return []
    if n == 1:
        return words

    combinations = []
    for i in range(len(words) - n + 1):
        combo = " ".join(words[i:i+n])
        combinations.append(combo)

    return combinations[:3]  # Limit to 3 per length

def generate_phrase_for_lego(
    scaffold: Dict,
    lego_id: str,
    lego_index: int,
    vocabulary: Dict
) -> List[List]:
    """Generate 10 practice phrases for a single LEGO"""

    lego_data = scaffold["legos"][lego_id]
    english_lego = lego_data["lego"][0]
    chinese_lego = lego_data["lego"][1]
    is_final = lego_data["is_final_lego"]

    phrases = []

    # Get all available vocabulary as lists
    all_chinese = list(vocabulary.keys())
    all_english = [vocabulary[c]["english"] for c in all_chinese]

    # Helper to check if word exists
    def word_exists(word: str) -> bool:
        return any(word in vocab_item for vocab_item in all_chinese)

    # Build phrases progressively (2-2-2-4 distribution)

    # 1-2 word phrases (2 phrases)
    # Start with just the current LEGO
    if phrases.__len__() < 2:
        phrases.append([english_lego, chinese_lego, None, 1])

    # Try combining with one available piece
    for vocab_piece in all_chinese[:3]:
        if vocab_piece != chinese_lego and len(phrases) < 2:
            # Simple 2-piece combination
            try:
                try_phrase = f"{vocab_piece} {chinese_lego}"
                try_english = f"{vocabulary[vocab_piece]['english']} {english_lego}"
                phrases.append([try_english, try_phrase, None, 2])
            except:
                pass

    # Pad with repetitions if needed
    while len(phrases) < 2:
        phrases.append([english_lego, chinese_lego, None, 1])

    # 3-word phrases (2 phrases)
    for i, vocab_piece in enumerate(all_chinese[:5]):
        if len(phrases) < 4 and vocab_piece != chinese_lego:
            try:
                combo = f"{all_chinese[0]} {vocab_piece} {chinese_lego}"
                combo_en = f"{all_english[0]} {vocabulary[vocab_piece]['english']} {english_lego}"
                phrases.append([combo_en, combo, None, 3])
            except:
                pass

    # Pad if needed
    while len(phrases) < 4:
        phrases.append([english_lego, chinese_lego, None, 1])

    # 4-word phrases (2 phrases)
    for i in range(min(2, len(all_chinese) - 2)):
        if len(phrases) < 6:
            try:
                combo = f"{all_chinese[i]} {all_chinese[(i+1)%len(all_chinese)]} {chinese_lego} {all_chinese[(i+2)%len(all_chinese)]}"
                combo_en = f"{all_english[i]} {all_english[(i+1)%len(all_english)]} {english_lego} {all_english[(i+2)%len(all_english)]}"
                phrases.append([combo_en.lower(), combo, None, 4])
            except:
                pass

    # Pad if needed
    while len(phrases) < 6:
        phrases.append([english_lego, chinese_lego, None, 1])

    # 5+ word phrases (4 phrases)
    # For final LEGO, the last one must be the complete seed sentence
    seed_target = scaffold["seed_pair"]["target"]
    seed_known = scaffold["seed_pair"]["known"]

    # Add some complex phrases
    for i in range(min(3, len(all_chinese))):
        if len(phrases) < 10:
            try:
                words = all_chinese[:min(5, len(all_chinese))]
                combo = " ".join(words + [chinese_lego] if chinese_lego not in words else words)
                combo_en = " ".join(all_english[:len(words)]) + " " + english_lego
                phrases.append([combo_en.lower(), combo, None, 5])
            except:
                pass

    # Final phrase: complete seed sentence if this is final LEGO
    if is_final and len(phrases) < 10:
        phrases.append([seed_known, seed_target, None, 10])

    # Pad to exactly 10
    while len(phrases) < 10:
        phrases.append([english_lego, chinese_lego, None, 1])

    return phrases[:10]

def process_seed(seed_num: int):
    """Process a single seed"""
    seed_id = f"S{seed_num:04d}"
    scaffold_path = SCAFFOLDS_DIR / f"seed_{seed_id.lower()}.json"
    output_path = OUTPUTS_DIR / f"seed_{seed_id.lower()}.json"

    if not scaffold_path.exists():
        return f"✗ {seed_id}: Scaffold not found"

    # Load scaffold
    with open(scaffold_path, 'r', encoding='utf-8') as f:
        scaffold = json.load(f)

    # Check if output already complete
    if output_path.exists():
        with open(output_path, 'r', encoding='utf-8') as f:
            existing = json.load(f)

        all_complete = all(
            lego.get("practice_phrases", [])
            for lego in existing["legos"].values()
        )

        if all_complete:
            lego_count = len(existing["legos"])
            return f"✓ {seed_id}: Already complete ({lego_count} LEGOs)"

        scaffold = existing  # Use existing

    # Process each LEGO
    lego_ids = list(scaffold["legos"].keys())
    for lego_index, lego_id in enumerate(lego_ids):
        lego_data = scaffold["legos"][lego_id]

        if lego_data.get("practice_phrases"):
            continue  # Skip if already has phrases

        # Get available vocabulary
        vocabulary = get_available_vocab_for_lego(scaffold, lego_index)

        # Generate phrases
        phrases = generate_phrase_for_lego(scaffold, lego_id, lego_index, vocabulary)

        # Store
        lego_data["practice_phrases"] = phrases

    # Save
    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(scaffold, f, ensure_ascii=False, indent=2)

    lego_count = len(scaffold["legos"])
    return f"✓ {seed_id}: Generated ({lego_count} LEGOs)"

def main():
    print("=" * 70)
    print("Phase 5 Practice Phrase Generation - cmn_for_eng (Local)")
    print(f"Seeds: S0391 to S0400")
    print("=" * 70 + "\n")

    for seed_num in SEED_RANGE:
        result = process_seed(seed_num)
        print(result)

    print("\n" + "=" * 70)
    print("Processing complete!")
    print("=" * 70)

if __name__ == "__main__":
    main()
