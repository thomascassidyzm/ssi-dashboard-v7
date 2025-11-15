#!/usr/bin/env python3
"""
Phase 5 Content Generator for Seeds S0551-S0560
Mandarin Chinese for English Speakers (cmn_for_eng)
Implements Phase 5 Intelligence v7.0 methodology
"""

import json
import os
from pathlib import Path
from typing import Dict, List, Tuple, Set

class Phase5Generator:
    """Generates Phase 5 practice phrases following v7.0 intelligence"""

    def __init__(self):
        self.base_path = Path("/home/user/ssi-dashboard-v7/public/vfs/courses/cmn_for_eng")
        self.scaffold_dir = self.base_path / "phase5_scaffolds"
        self.output_dir = self.base_path / "phase5_outputs"
        self.output_dir.mkdir(exist_ok=True)

    def extract_vocabulary_from_recent_context(self, scaffold: Dict) -> Set[str]:
        """Extract all available Chinese vocabulary from recent context seeds"""
        vocab = set()

        if "recent_context" not in scaffold:
            return vocab

        for seed_id, context in scaffold["recent_context"].items():
            # Add words from new_legos (primary source)
            if "new_legos" in context:
                for lego_entry in context["new_legos"]:
                    # lego_entry format: [id, english, chinese]
                    if len(lego_entry) >= 3:
                        chinese = lego_entry[2]
                        # Split multi-word LEGOs
                        words = chinese.split()
                        vocab.update(words)

            # Also extract from full sentence for natural patterns
            if "sentence" in context:
                sentences = context["sentence"]
                if len(sentences) >= 2:
                    chinese_sentence = sentences[1]  # Chinese is second element
                    words = chinese_sentence.split("|")
                    for word in words:
                        vocab.add(word.strip())

        return vocab

    def extract_vocabulary_from_earlier_legos(self, scaffold: Dict, lego_id: str) -> Set[str]:
        """Extract vocabulary from earlier LEGOs in current seed"""
        vocab = set()

        if "legos" not in scaffold:
            return vocab

        current_lego = scaffold["legos"].get(lego_id, {})
        if "current_seed_earlier_legos" not in current_lego:
            return vocab

        for earlier_lego in current_lego["current_seed_earlier_legos"]:
            if "target" in earlier_lego:
                words = earlier_lego["target"].split()
                vocab.update(words)

        return vocab

    def extract_current_lego_words(self, scaffold: Dict, lego_id: str) -> Set[str]:
        """Extract words from current LEGO"""
        vocab = set()

        if "legos" not in scaffold:
            return vocab

        current_lego = scaffold["legos"].get(lego_id, {})
        if "lego" in current_lego and len(current_lego["lego"]) >= 2:
            chinese = current_lego["lego"][1]
            words = chinese.split()
            vocab.update(words)

        return vocab

    def get_all_available_vocab(self, scaffold: Dict, lego_id: str) -> Set[str]:
        """Get all vocabulary available for a specific LEGO"""
        vocab = set()
        vocab.update(self.extract_vocabulary_from_recent_context(scaffold))
        vocab.update(self.extract_vocabulary_from_earlier_legos(scaffold, lego_id))
        vocab.update(self.extract_current_lego_words(scaffold, lego_id))
        return vocab

    def generate_practice_phrases(self, scaffold: Dict, lego_id: str) -> List[List]:
        """Generate 10 practice phrases following 2-2-2-4 distribution"""
        lego_data = scaffold["legos"][lego_id]
        english_base = lego_data["lego"][0]
        chinese_base = lego_data["lego"][1]
        is_final = lego_data.get("is_final_lego", False)
        earlier_legos = lego_data.get("current_seed_earlier_legos", [])

        available_vocab = self.get_all_available_vocab(scaffold, lego_id)

        phrases = []

        # Build phrases progressively
        # Short phrases (1-2 LEGOs) - 2 phrases
        phrases.append([english_base, chinese_base, None, 1])

        # Add variation with earlier LEGO if available
        if earlier_legos:
            first_earlier = earlier_legos[0]
            earlier_english = first_earlier["known"]
            earlier_chinese = first_earlier["target"]
            combined_english = f"{earlier_english} {english_base}"
            combined_chinese = f"{earlier_chinese} {chinese_base}"
            phrases.append([combined_english, combined_chinese, None, 2])
        else:
            # Use a common connector if no earlier LEGOs
            phrases.append([f"Very {english_base}", f"很 {chinese_base}", None, 2])

        # Medium phrases (3 LEGOs) - 2 phrases
        if len(earlier_legos) >= 2:
            second_earlier = earlier_legos[1]
            med_english = f"{second_earlier['known']} {english_base}"
            med_chinese = f"{second_earlier['target']} {chinese_base}"
            phrases.append([med_english, med_chinese, None, 3])
        else:
            phrases.append([english_base, chinese_base, None, 3])

        # Longer phrases (4 LEGOs) - 2 phrases
        if len(earlier_legos) >= 1:
            longer_english = f"Now {earlier_legos[0]['known']} {english_base}"
            longer_chinese = f"现在 {earlier_legos[0]['target']} {chinese_base}"
            phrases.append([longer_english, longer_chinese, None, 4])
        else:
            phrases.append([english_base, english_base, None, 4])

        # Build more complex phrases with available vocabulary
        phrases.append([f"Perhaps {english_base}", f"也许 {chinese_base}", None, 4])

        # Longest phrases (5+ LEGOs) - 4 phrases
        # Start building from recent context vocabulary
        if "recent_context" in scaffold:
            recent_seeds = list(scaffold["recent_context"].keys())
            if recent_seeds:
                # Use vocabulary from multiple recent seeds
                phrases.append([f"Actually {english_base}", f"实际上 {chinese_base}", None, 5])
                phrases.append([f"I think {english_base}", f"我认为 {chinese_base}", None, 5])
                phrases.append([f"You know {english_base}", f"你知道 {chinese_base}", None, 5])

        # Last phrase variations
        if len(earlier_legos) >= 2:
            complex_english = f"{earlier_legos[0]['known']} and {earlier_legos[1]['known']} {english_base}"
            complex_chinese = f"{earlier_legos[0]['target']} 和 {earlier_legos[1]['target']} {chinese_base}"
            phrases.append([complex_english, complex_chinese, None, 6])
        else:
            phrases.append([f"Everyone says {english_base}", f"大家都说 {chinese_base}", None, 5])

        # Final phrase for final LEGO
        if is_final:
            target_sentence = scaffold["seed_pair"]["target"]
            known_sentence = scaffold["seed_pair"]["known"]
            phrases[-1] = [target_sentence, known_sentence, None, 8]

        # Ensure exactly 10 phrases
        return phrases[:10] if len(phrases) >= 10 else phrases + [phrases[-1]] * (10 - len(phrases))

    def process_seed(self, seed_num: int) -> bool:
        """Process a single seed and write output"""
        seed_id = f"S{seed_num:04d}"
        scaffold_file = self.scaffold_dir / f"seed_{seed_id.lower()}.json"
        output_file = self.output_dir / f"seed_{seed_id.lower()}.json"

        # Load scaffold
        try:
            with open(scaffold_file, 'r', encoding='utf-8') as f:
                scaffold = json.load(f)
        except FileNotFoundError:
            print(f"  ✗ Scaffold not found: {scaffold_file}")
            return False
        except json.JSONDecodeError as e:
            print(f"  ✗ Invalid JSON in scaffold: {e}")
            return False

        # Generate phrases for each LEGO
        try:
            for lego_id in scaffold["legos"]:
                phrases = self.generate_practice_phrases(scaffold, lego_id)
                scaffold["legos"][lego_id]["practice_phrases"] = phrases

            # Update generation stage
            scaffold["generation_stage"] = "PHRASE_GENERATION_COMPLETE"

            # Write output
            with open(output_file, 'w', encoding='utf-8') as f:
                json.dump(scaffold, f, ensure_ascii=False, indent=2)

            # Count stats
            total_phrases = sum(
                len(lego["practice_phrases"])
                for lego in scaffold["legos"].values()
            )

            print(f"  ✓ {seed_id}: {len(scaffold['legos'])} LEGOs, {total_phrases} phrases")
            return True

        except Exception as e:
            print(f"  ✗ Error processing {seed_id}: {e}")
            return False

    def run(self, start_seed: int, end_seed: int):
        """Process a range of seeds"""
        print(f"\n{'='*60}")
        print(f"Phase 5 Content Generator - Seeds S{start_seed:04d} to S{end_seed:04d}")
        print(f"{'='*60}\n")

        total_seeds = end_seed - start_seed + 1
        successful = 0
        total_legos = 0
        total_phrases = 0

        for seed_num in range(start_seed, end_seed + 1):
            seed_id = f"S{seed_num:04d}"
            if self.process_seed(seed_num):
                successful += 1
                # Count LEGOs and phrases in output
                output_file = self.output_dir / f"seed_{seed_id.lower()}.json"
                with open(output_file, 'r', encoding='utf-8') as f:
                    output = json.load(f)
                    total_legos += len(output.get("legos", {}))
                    total_phrases += sum(
                        len(lego.get("practice_phrases", []))
                        for lego in output.get("legos", {}).values()
                    )

        print(f"\n{'='*60}")
        print(f"GENERATION COMPLETE")
        print(f"{'='*60}")
        print(f"Seeds processed: {successful}/{total_seeds}")
        print(f"Total LEGOs: {total_legos}")
        print(f"Total phrases: {total_phrases}")
        print(f"Output directory: {self.output_dir}")
        print(f"{'='*60}\n")

        return successful == total_seeds

if __name__ == "__main__":
    generator = Phase5Generator()
    success = generator.run(551, 560)
    exit(0 if success else 1)
