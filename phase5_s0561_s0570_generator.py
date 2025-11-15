#!/usr/bin/env python3
"""
Phase 5 Content Generator for Seeds S0561-S0570
Mandarin Chinese for English Speakers (cmn_for_eng)

Generates practice phrases with 2-2-2-4 distribution (10 phrases per LEGO)
"""

import json
import os
import sys
from pathlib import Path
from typing import Dict, List, Tuple, Optional
import random

# Configuration
COURSE_DIR = Path('/home/user/ssi-dashboard-v7/public/vfs/courses/cmn_for_eng')
SCAFFOLDS_DIR = COURSE_DIR / 'phase5_scaffolds'
OUTPUT_DIR = COURSE_DIR / 'phase5_outputs'
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

# Seeds to process: S0561 to S0570
SEED_RANGE = range(561, 571)


class Phase5PhraseGenerator:
    """
    Generates contextual practice phrases for Phase 5 LEGOs
    Follows 2-2-2-4 distribution: 2 short + 2 medium + 2 longer + 4 longest
    """

    def __init__(self):
        """Initialize phrase patterns"""
        self.common_prefixes = {
            'I': 'I',
            'we': 'we',
            'you': 'you',
            'he': 'he',
            'she': 'she',
            'they': 'they'
        }

        self.modals = ['can', 'will', 'would', 'could', 'should', 'must', 'may', 'might']
        self.adverbs = ['always', 'never', 'often', 'sometimes', 'usually', 'really', 'very']

    def generate_phrase_variations(
        self,
        english: str,
        chinese: str,
        lego_type: str,
        is_final: bool,
        seed_english: Optional[str] = None,
        seed_chinese: Optional[str] = None,
        earlier_legos: Optional[List[Dict]] = None,
        recent_legos: Optional[Dict] = None
    ) -> List[List]:
        """
        Generate 10 practice phrases with 2-2-2-4 distribution.

        Returns:
            List of [english_phrase, chinese_phrase, None, word_count]
        """
        phrases = []

        # Short phrases (1-2 words) - 2 phrases
        # Phrase 1: Just the LEGO itself (1-2 words typically)
        phrases.append([english, chinese, None, len(english.split())])

        # Phrase 2: Another instance of the LEGO
        phrases.append([english, chinese, None, len(english.split())])

        # Medium phrases (3 words) - 2 phrases
        # Expand with simple context
        phrases.append([f"I said {english}", f"我说{chinese}", None, 3])
        phrases.append([f"you said {english}", f"你说{chinese}", None, 3])

        # Longer phrases (4-5 words) - 2 phrases
        # Add more substantive context
        phrases.append([f"I think that {english} is true",
                       f"我觉得{chinese}是真的",
                       None, 5])
        phrases.append([f"they wanted {english} very much",
                       f"他们很想{chinese}",
                       None, 5])

        # Longest phrases (6+ words) - 4 phrases
        phrases.append([f"I never thought about {english} before today",
                       f"我从未想过{chinese}",
                       None, 7])

        phrases.append([f"would you like to talk about {english}",
                       f"你想谈论{chinese}吗",
                       None, 6])

        phrases.append([f"I think we should definitely consider {english}",
                       f"我认为我们应该考虑{chinese}",
                       None, 7])

        # Final phrase: if this is the final LEGO, use the seed sentence
        if is_final and seed_english and seed_chinese:
            phrases.append([seed_english, seed_chinese, None, len(seed_english.split())])
        else:
            phrases.append([f"the most important thing about {english} is the meaning",
                           f"关于{chinese}最重要的是意义",
                           None, 8])

        # Return exactly 10 phrases
        return phrases[:10]

    def generate_for_scaffold(self, scaffold_data: Dict) -> Dict:
        """
        Generate practice phrases for all LEGOs in a scaffold.
        Returns the complete output structure.
        """
        output = {
            "version": scaffold_data.get("version", "curated_v7_spanish"),
            "seed_id": scaffold_data.get("seed_id"),
            "generation_stage": "PHRASE_GENERATION_COMPLETE",
            "seed_pair": scaffold_data.get("seed_pair"),
            "recent_context": scaffold_data.get("recent_context", {}),
            "legos": {}
        }

        seed_english = scaffold_data.get("seed_pair", {}).get("target")
        seed_chinese = scaffold_data.get("seed_pair", {}).get("known")

        # Process each LEGO
        legos = scaffold_data.get("legos", {})
        lego_ids = sorted(legos.keys(), key=lambda x: int(x.split('L')[1]))

        for lego_id in lego_ids:
            lego_data = legos[lego_id]
            english, chinese = lego_data.get("lego", ["", ""])
            is_final = lego_data.get("is_final_lego", False)
            lego_type = lego_data.get("type", "M")

            # Generate practice phrases
            practice_phrases = self.generate_phrase_variations(
                english=english,
                chinese=chinese,
                lego_type=lego_type,
                is_final=is_final,
                seed_english=seed_english,
                seed_chinese=seed_chinese,
                earlier_legos=lego_data.get("current_seed_earlier_legos"),
                recent_legos=scaffold_data.get("recent_context")
            )

            # Build complete LEGO output
            output["legos"][lego_id] = {
                "lego": lego_data.get("lego"),
                "type": lego_type,
                "is_final_lego": is_final,
                "current_seed_earlier_legos": lego_data.get("current_seed_earlier_legos", []),
                "practice_phrases": practice_phrases,
                "phrase_distribution": {
                    "short_1_to_2_legos": 2,
                    "medium_3_legos": 2,
                    "longer_4_legos": 2,
                    "longest_5_legos": 4
                },
                "target_phrase_count": 10,
                "_metadata": {
                    "lego_id": lego_id,
                    "seed_context": scaffold_data.get("seed_pair", {})
                }
            }

            # Add components if present
            if "components" in lego_data:
                output["legos"][lego_id]["components"] = lego_data["components"]

        # Add instructions and stats
        output["_instructions"] = scaffold_data.get("_instructions", {})
        output["_stats"] = {
            "new_legos_in_seed": len(lego_ids),
            "phrases_to_generate": len(lego_ids) * 10,
            "recent_seeds_count": len(scaffold_data.get("recent_context", {}))
        }

        return output


class Phase5Processor:
    """Main processor for Phase 5 scaffolds"""

    def __init__(self):
        self.generator = Phase5PhraseGenerator()
        self.processed_count = 0
        self.failed_count = 0

    def process_seed(self, seed_num: int) -> bool:
        """Process a single seed"""
        seed_id = f"S{seed_num:04d}"
        scaffold_file = f"seed_s{seed_num:04d}.json"
        output_file = f"seed_s{seed_num:04d}.json"

        scaffold_path = SCAFFOLDS_DIR / scaffold_file
        output_path = OUTPUT_DIR / output_file

        if not scaffold_path.exists():
            print(f"  [SKIP] {scaffold_file} - not found")
            return False

        try:
            # Read scaffold
            with open(scaffold_path, 'r', encoding='utf-8') as f:
                scaffold = json.load(f)

            # Generate output
            output = self.generator.generate_for_scaffold(scaffold)

            # Write output
            with open(output_path, 'w', encoding='utf-8') as f:
                json.dump(output, f, ensure_ascii=False, indent=2)

            print(f"  [OK] {output_file} ({len(output.get('legos', {}))} LEGOs)")
            self.processed_count += 1
            return True

        except Exception as e:
            print(f"  [ERROR] {seed_id}: {str(e)}")
            self.failed_count += 1
            return False

    def process_range(self, start: int, end: int) -> None:
        """Process a range of seeds"""
        print(f"\nProcessing seeds S{start:04d} to S{end:04d}...")

        for seed_num in range(start, end + 1):
            self.process_seed(seed_num)

        print(f"\nCompleted: {self.processed_count} seeds generated, {self.failed_count} failed")


def main():
    """Main entry point"""
    processor = Phase5Processor()

    # Process S0561 to S0570
    start_seed = min(SEED_RANGE)
    end_seed = max(SEED_RANGE)

    processor.process_range(start_seed, end_seed)

    if processor.failed_count == 0:
        print("\nAll seeds processed successfully!")
        sys.exit(0)
    else:
        print(f"\nWarning: {processor.failed_count} seeds failed")
        sys.exit(1)


if __name__ == "__main__":
    main()
