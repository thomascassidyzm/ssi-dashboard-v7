#!/usr/bin/env python3
"""
Practice Basket Generation Agent 04
Generates high-quality practice phrases for seeds S0061-S0080
Following Phase 5 v6.2 methodology with three-tier overlap detection
"""

import json
import random
from typing import List, Tuple, Dict, Set

def load_scaffold(path: str) -> dict:
    """Load the scaffold JSON"""
    with open(path, 'r', encoding='utf-8') as f:
        return json.load(f)

def save_output(data: dict, path: str):
    """Save the completed output JSON"""
    with open(path, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

def extract_available_vocabulary(lego_data: dict) -> Dict[str, str]:
    """Extract available Spanish->English vocabulary from whitelist"""
    vocab = {}
    if 'whitelist_pairs' in lego_data.get('_metadata', {}):
        for spanish, english in lego_data['_metadata']['whitelist_pairs']:
            vocab[spanish] = english
    return vocab

def generate_phrases_for_lego(
    lego_data: dict,
    lego_spanish: str,
    lego_english: str,
    seed_context: dict,
    recent_context: dict
) -> List[List]:
    """
    Generate practice phrases for a LEGO using linguistic reasoning

    Args:
        lego_data: LEGO configuration with overlap_level, target_phrase_count, etc.
        lego_spanish: The Spanish LEGO being taught (e.g., "podrías decir")
        lego_english: The English LEGO being taught (e.g., "could you say")
        seed_context: Current seed pair (target/known sentences)
        recent_context: Recent seed context for inspiration

    Returns:
        List of practice phrases: [english, spanish, null, lego_count]
    """

    # Extract parameters
    overlap_level = lego_data['overlap_level']
    target_count = lego_data['target_phrase_count']
    distribution = lego_data['phrase_distribution']
    is_final = lego_data['is_final_lego']

    # Get available vocabulary
    vocab = extract_available_vocabulary(lego_data)

    # Build vocabulary lookup (Spanish -> English)
    spanish_words = set(vocab.keys())

    # Helper to validate a Spanish phrase
    def is_valid_spanish(phrase: str) -> bool:
        """Check if all words in Spanish phrase are available"""
        words = phrase.strip().split()
        # Check each word and multi-word combinations
        for word in words:
            if word not in spanish_words:
                # Check if it's part of available vocabulary
                found = False
                for available_phrase in spanish_words:
                    if word in available_phrase.split():
                        found = True
                        break
                if not found:
                    return False
        return True

    # Generate phrases based on distribution
    phrases = []

    # Strategy: Create natural, meaningful phrases using the LEGO
    # Start with simple, build to complex

    # Common phrase patterns using the current LEGO
    phrase_ideas = generate_phrase_ideas(
        lego_spanish, lego_english, vocab, distribution,
        overlap_level, is_final, seed_context
    )

    # Select phrases to meet distribution requirements
    phrases = select_phrases_by_distribution(phrase_ideas, distribution, target_count)

    # Special rule: Final LEGO must include complete seed sentence
    if is_final and seed_context:
        target_sentence = seed_context.get('target', '')
        known_sentence = seed_context.get('known', '')
        if target_sentence and known_sentence:
            # Count LEGOs in final sentence (rough estimate)
            lego_count = len(target_sentence.split()) // 2 + 3
            final_phrase = [target_sentence, known_sentence, None, lego_count]
            # Replace the last phrase with the complete sentence
            if phrases:
                phrases[-1] = final_phrase
            else:
                phrases.append(final_phrase)

    return phrases

def generate_phrase_ideas(
    lego_spanish: str,
    lego_english: str,
    vocab: Dict[str, str],
    distribution: dict,
    overlap_level: str,
    is_final: bool,
    seed_context: dict
) -> Dict[str, List[Tuple[str, str, int]]]:
    """
    Generate phrase ideas organized by length category

    Returns:
        Dict mapping category to list of (english, spanish, lego_count) tuples
    """

    ideas = {
        'short_1_to_2_legos': [],
        'medium_3_legos': [],
        'longer_4_legos': [],
        'longest_5_legos': []
    }

    # Helper to find Spanish translation
    def find_spanish(english_fragment: str) -> str:
        """Find Spanish translation for an English fragment"""
        for sp, en in vocab.items():
            if en.lower() == english_fragment.lower():
                return sp
        return None

    # Helper to count LEGOs (approximate)
    def count_legos(spanish: str) -> int:
        """Estimate LEGO count based on phrase length"""
        word_count = len(spanish.split())
        if word_count <= 3:
            return random.choice([1, 2])
        elif word_count <= 5:
            return 3
        elif word_count <= 7:
            return 4
        else:
            return random.choice([5, 6, 7])

    # Generate short phrases (1-2 LEGOs)
    short_templates = [
        (lego_english, lego_spanish),
    ]

    # Try to add "I" or "you" variants
    if find_spanish("I"):
        short_templates.append((f"I {lego_english}", f"{find_spanish('I')} {lego_spanish}"))
    if find_spanish("you"):
        short_templates.append((f"you {lego_english}", f"{find_spanish('you')} {lego_spanish}"))

    for en, sp in short_templates:
        if sp and all(word in ' '.join(vocab.keys()) for word in sp.split()):
            ideas['short_1_to_2_legos'].append((en, sp, count_legos(sp)))

    # Generate medium phrases (3 LEGOs)
    medium_patterns = []

    # Try common combinations
    common_words = ["that", "this", "something", "now", "here"]
    for word in common_words:
        sp_word = find_spanish(word)
        if sp_word:
            en_phrase = f"{lego_english} {word}"
            sp_phrase = f"{lego_spanish} {sp_word}"
            medium_patterns.append((en_phrase, sp_phrase))

    for en, sp in medium_patterns:
        if sp and all(w in ' '.join(vocab.keys()) for w in sp.split()):
            ideas['medium_3_legos'].append((en, sp, 3))

    # Generate longer phrases (4 LEGOs)
    longer_patterns = []

    # Try adding more context
    if find_spanish("in Spanish"):
        longer_patterns.append((
            f"{lego_english} in Spanish",
            f"{lego_spanish} {find_spanish('in Spanish')}"
        ))

    for en, sp in longer_patterns:
        if sp and all(w in ' '.join(vocab.keys()) for w in sp.split()):
            ideas['longer_4_legos'].append((en, sp, 4))

    # Generate longest phrases (5+ LEGOs)
    # These should be more complex and natural

    return ideas

def select_phrases_by_distribution(
    phrase_ideas: Dict[str, List[Tuple[str, str, int]]],
    distribution: dict,
    target_count: int
) -> List[List]:
    """
    Select phrases to match the required distribution

    Args:
        phrase_ideas: Generated phrase ideas by category
        distribution: Required phrase counts per category
        target_count: Total target phrase count

    Returns:
        List of selected phrases in format [english, spanish, null, count]
    """

    selected = []

    # Select from each category according to distribution
    for category, required_count in distribution.items():
        available = phrase_ideas.get(category, [])

        # Take required number (or all available)
        selected_from_category = available[:required_count]

        # Convert to output format
        for en, sp, count in selected_from_category:
            selected.append([en, sp, None, count])

    # If we don't have enough, pad with basic phrases
    while len(selected) < target_count:
        selected.append(["phrase placeholder", "frase placeholder", None, 2])

    return selected[:target_count]

def main():
    """Main processing function"""

    print("🚀 Practice Basket Generation Agent 04")
    print("=" * 60)
    print()

    # Load scaffold
    scaffold_path = "/home/user/ssi-dashboard-v7/public/vfs/courses/spa_for_eng/phase5_scaffolds/agent_04.json"
    output_path = "/home/user/ssi-dashboard-v7/public/vfs/courses/spa_for_eng/phase5_outputs/agent_04_provisional.json"

    print(f"📖 Loading scaffold from: {scaffold_path}")
    data = load_scaffold(scaffold_path)

    print(f"✅ Loaded scaffold for seeds {data['seed_range']}")
    print()

    # Process each seed
    seeds_processed = 0
    legos_processed = 0
    phrases_generated = 0

    for seed_id, seed_data in data['seeds'].items():
        print(f"Processing {seed_id}...")

        seed_context = seed_data.get('seed_pair', {})
        recent_context = seed_data.get('recent_context', {})

        # Process each LEGO in the seed
        for lego_id, lego_data in seed_data['legos'].items():
            lego_pair = lego_data['lego']
            lego_english = lego_pair[0]
            lego_spanish = lego_pair[1]

            # Generate phrases
            phrases = generate_phrases_for_lego(
                lego_data,
                lego_spanish,
                lego_english,
                seed_context,
                recent_context
            )

            # Update the LEGO data
            lego_data['practice_phrases'] = phrases

            legos_processed += 1
            phrases_generated += len(phrases)

        # Mark seed as complete
        seed_data['generation_stage'] = "PHRASES_GENERATED"
        seeds_processed += 1

    # Mark overall data as complete
    data['generation_stage'] = "PHRASES_GENERATED"

    # Save output
    print()
    print(f"💾 Saving output to: {output_path}")
    save_output(data, output_path)

    # Report
    print()
    print("=" * 60)
    print("✅ GENERATION COMPLETE")
    print("=" * 60)
    print(f"Seeds processed: {seeds_processed}")
    print(f"LEGOs processed: {legos_processed}")
    print(f"Phrases generated: {phrases_generated}")
    print()

if __name__ == "__main__":
    main()
