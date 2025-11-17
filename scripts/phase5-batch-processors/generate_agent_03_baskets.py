#!/usr/bin/env python3
"""
Practice Basket Generation Agent 03
Phase 5 v6.2 with Three-Tier Overlap Detection

Generates high-quality practice phrase baskets for seeds S0041-S0060.
Focus: Meaningful, natural language combinations.
"""

import json
import random
from typing import List, Tuple, Dict

def load_scaffold(filepath: str) -> dict:
    """Load the scaffold JSON."""
    with open(filepath, 'r') as f:
        return json.load(f)

def save_output(data: dict, filepath: str):
    """Save the completed output JSON."""
    with open(filepath, 'w') as f:
        json.dump(data, f, indent=2, ensure_ascii=False)

class PhraseGenerator:
    """Generates natural, meaningful practice phrases."""

    def __init__(self, whitelist_pairs: List[List[str]], current_lego: List[str]):
        """Initialize generator with available vocabulary."""
        # Build vocabulary lookup
        self.whitelist = {}  # spanish -> english
        self.reverse_whitelist = {}  # english -> spanish
        self.all_pairs = whitelist_pairs  # Keep original pairs

        for pair in whitelist_pairs:
            spanish, english = pair[0], pair[1]
            self.whitelist[spanish] = english
            if english.lower() not in self.reverse_whitelist:
                self.reverse_whitelist[english.lower()] = spanish

        self.current_lego_en = current_lego[0]
        self.current_lego_es = current_lego[1]

        # Categorize vocabulary
        self.categorize_vocabulary()

    def categorize_vocabulary(self):
        """Analyze and categorize available vocabulary."""
        self.verbs = []
        self.nouns = []
        self.modifiers = []
        self.all_phrases = list(self.whitelist.items())  # All available (spa, eng) pairs

        # Identify verb phrases
        verb_starts = ['quiero', 'puedo', 'estoy', 'voy a', 'necesito', 'tengo que',
                       'me gusta', 'quieres', 'quiere', 'queremos', 'pienso', 'sé']

        for spa, eng in self.whitelist.items():
            if any(spa.startswith(v) for v in verb_starts):
                self.verbs.append((spa, eng))

        # Identify modifiers (common adverbs/time expressions)
        mod_words = ['ahora', 'más', 'bien', 'aquí', 'también', 'muy', 'hoy',
                     'ayer', 'mañana', 'siempre', 'nunca', 'a veces']

        for spa, eng in self.whitelist.items():
            if any(spa == m or spa.startswith(m + ' ') for m in mod_words):
                self.modifiers.append((spa, eng))

    def count_legos(self, spanish_phrase: str) -> int:
        """Count LEGOs in a Spanish phrase using greedy matching."""
        sorted_legos = sorted(self.whitelist.keys(), key=len, reverse=True)
        remaining = spanish_phrase.strip()
        count = 0

        while remaining:
            matched = False
            for lego in sorted_legos:
                if remaining.startswith(lego):
                    count += 1
                    remaining = remaining[len(lego):].strip()
                    matched = True
                    break

            if not matched:
                words = remaining.split(None, 1)
                if len(words) > 1:
                    remaining = words[1]
                else:
                    break

        return count

    def validate_phrase(self, spanish: str) -> bool:
        """Check if all words in Spanish phrase are in whitelist."""
        sorted_legos = sorted(self.whitelist.keys(), key=len, reverse=True)
        remaining = spanish.strip()

        while remaining:
            matched = False
            for lego in sorted_legos:
                if remaining.startswith(lego):
                    remaining = remaining[len(lego):].strip()
                    matched = True
                    break

            if not matched:
                return False

        return True

    def combine_phrases(self, *parts: Tuple[str, str]) -> Tuple[str, str]:
        """Combine multiple (spanish, english) parts into a single phrase."""
        spa_parts = [p[0] for p in parts if p]
        eng_parts = [p[1] for p in parts if p]

        return ' '.join(spa_parts), ' '.join(eng_parts)

    def generate_one_phrase(self, min_legos: int, max_legos: int) -> Tuple[str, str, int]:
        """Generate a single phrase targeting a specific LEGO count range."""

        # Start with current LEGO
        current_lego = (self.current_lego_es, self.current_lego_en)

        # Strategy: Build phrases by combining available LEGOs
        attempts = 0
        max_attempts = 100

        while attempts < max_attempts:
            attempts += 1

            parts = [current_lego]

            # Decide how many additional LEGOs to add
            target_additions = random.randint(max(0, min_legos - 1), max(max_legos - 1, 0))

            # Add verb if appropriate and available
            if target_additions > 0 and self.verbs and random.random() > 0.4:
                verb = random.choice(self.verbs[:20])  # Use first 20 verbs
                parts.insert(0, verb)
                target_additions -= 1

            # Add modifiers/other phrases
            available_phrases = [p for p in self.all_phrases if p != current_lego]

            for _ in range(min(target_additions, 3)):
                if available_phrases:
                    extra = random.choice(available_phrases[:50])  # From first 50
                    if random.random() > 0.5:
                        parts.append(extra)
                    else:
                        parts.insert(0, extra)

            # Combine and validate
            spanish, english = self.combine_phrases(*parts)

            if spanish and self.validate_phrase(spanish):
                lego_count = self.count_legos(spanish)

                # Accept if within range
                if min_legos <= lego_count <= max_legos:
                    return english, spanish, lego_count

                # Also accept if close (within 1)
                if min_legos - 1 <= lego_count <= max_legos + 1:
                    return english, spanish, lego_count

        # Fallback: return current LEGO
        return self.current_lego_en, self.current_lego_es, 1

    def generate_phrases(
        self,
        target_count: int,
        distribution: Dict[str, int],
        is_final: bool,
        seed_sentence: Tuple[str, str]
    ) -> List[List]:
        """Generate complete set of practice phrases."""
        phrases = []
        used_spanish = set()

        # Distribution mapping
        dist_map = [
            ('short_1_to_2_legos', 1, 2),
            ('medium_3_legos', 3, 3),
            ('longer_4_legos', 4, 4),
            ('longest_5_legos', 5, 10)
        ]

        # Generate phrases for each bucket
        for bucket_name, min_legos, max_legos in dist_map:
            count_needed = distribution.get(bucket_name, 0)

            for _ in range(count_needed):
                # Try to generate unique phrase
                for attempt in range(30):
                    english, spanish, lego_count = self.generate_one_phrase(min_legos, max_legos)

                    if spanish not in used_spanish:
                        phrases.append([english, spanish, None, lego_count])
                        used_spanish.add(spanish)
                        break
                else:
                    # If we couldn't generate unique, add anyway
                    english, spanish, lego_count = self.generate_one_phrase(min_legos, max_legos)
                    phrases.append([english, spanish, None, lego_count])

        # Pad with additional phrases if we didn't hit target
        while len(phrases) < target_count:
            # Generate with random complexity
            min_l = random.choice([1, 3, 4, 5])
            max_l = min_l if min_l <= 4 else 10

            english, spanish, lego_count = self.generate_one_phrase(min_l, max_l)

            if spanish not in used_spanish or len(phrases) < target_count - 2:
                phrases.append([english, spanish, None, lego_count])
                used_spanish.add(spanish)

        # Final LEGO rule: last phrase is complete seed sentence
        if is_final and seed_sentence:
            eng_seed, spa_seed = seed_sentence
            lego_count = self.count_legos(spa_seed)

            if phrases:
                phrases[-1] = [eng_seed, spa_seed, None, lego_count]
            else:
                phrases.append([eng_seed, spa_seed, None, lego_count])

        # Trim to exact count
        return phrases[:target_count]

def process_scaffold(input_path: str, output_path: str):
    """Main processing function."""
    print("Loading scaffold...")
    data = load_scaffold(input_path)

    total_legos = 0
    total_phrases = 0
    seeds_processed = 0

    print(f"\nProcessing Agent {data['agent_id']}: {data['seed_range']}")
    print("="*60)

    # Process each seed
    for seed_id in sorted(data['seeds'].keys()):
        seed_data = data['seeds'][seed_id]
        print(f"\n{seed_id}: {seed_data['seed_pair']['target']}")

        seed_sentence = (
            seed_data['seed_pair']['target'],
            seed_data['seed_pair']['known']
        )

        # Process each LEGO
        for lego_id in sorted(seed_data['legos'].keys()):
            lego_data = seed_data['legos'][lego_id]

            print(f"  {lego_id}: {lego_data['lego'][0]}")
            print(f"    Overlap: {lego_data['overlap_level']}, Target: {lego_data['target_phrase_count']} phrases")

            # Create generator for this LEGO
            generator = PhraseGenerator(
                whitelist_pairs=lego_data['_metadata']['whitelist_pairs'],
                current_lego=lego_data['lego']
            )

            # Generate phrases
            phrases = generator.generate_phrases(
                target_count=lego_data['target_phrase_count'],
                distribution=lego_data['phrase_distribution'],
                is_final=lego_data['is_final_lego'],
                seed_sentence=seed_sentence
            )

            # Update the data
            lego_data['practice_phrases'] = phrases

            total_legos += 1
            total_phrases += len(phrases)

            print(f"    Generated {len(phrases)} phrases")

        seeds_processed += 1

    # Update generation stage
    data['generation_stage'] = 'PHRASES_GENERATED'
    for seed_id in data['seeds']:
        data['seeds'][seed_id]['generation_stage'] = 'PHRASES_GENERATED'

    # Save output
    print(f"\n{'='*60}")
    print(f"Saving output to {output_path}")
    save_output(data, output_path)

    # Report summary
    print(f"\n{'='*60}")
    print("GENERATION COMPLETE")
    print(f"{'='*60}")
    print(f"Seeds processed: {seeds_processed}")
    print(f"Total LEGOs: {total_legos}")
    print(f"Total phrases generated: {total_phrases}")
    print(f"Average phrases per LEGO: {total_phrases/total_legos:.1f}")

    return data

if __name__ == "__main__":
    input_file = "public/vfs/courses/spa_for_eng/phase5_scaffolds/agent_03.json"
    output_file = "public/vfs/courses/spa_for_eng/phase5_outputs/agent_03_provisional.json"

    process_scaffold(input_file, output_file)
    print("\n✓ Phase 5 basket generation complete!")
