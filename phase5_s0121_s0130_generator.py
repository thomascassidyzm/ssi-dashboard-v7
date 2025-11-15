#!/usr/bin/env python3
"""
Phase 5 Content Generator for Seeds S0121-S0130
Mandarin Chinese for English Speakers (cmn_for_eng)

Generates practice phrases with contextual variation following the 2-2-2-4 distribution.
"""

import json
import os
from pathlib import Path
from typing import Dict, List, Tuple, Optional
import re

# Configuration
COURSE_DIR = Path('/home/user/ssi-dashboard-v7/public/vfs/courses/cmn_for_eng')
SCAFFOLDS_DIR = COURSE_DIR / 'phase5_scaffolds'
OUTPUT_DIR = COURSE_DIR / 'phase5_outputs'
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

SEEDS_TO_PROCESS = range(121, 131)  # S0121 to S0130


class PhrasePhraseGenerator:
    """Generates contextual practice phrases for LEGOs"""

    def __init__(self):
        """Initialize with common linguistic patterns"""
        self.pronouns = ['I', 'you', 'he', 'she', 'we', 'they']
        self.modals = ['can', 'will', 'should', 'could', 'would', 'might']
        self.adverbs = ['really', 'very', 'quite', 'always', 'never', 'often']
        self.time_words = ['now', 'today', 'tomorrow', 'yesterday', 'lately']
        self.question_words = ['why', 'what', 'when', 'where', 'how']

    def extract_components(self, phrase: str) -> List[str]:
        """Break down a phrase into its words"""
        return phrase.split()

    def word_count(self, phrase: str) -> int:
        """Count words in a phrase"""
        return len(self.extract_components(phrase))

    def generate_short_1_word(self, lego_en: str, lego_zh: str) -> Tuple[str, str]:
        """Generate a 1-word phrase (just the core LEGO)"""
        core_en = self.extract_components(lego_en)[0] if ' ' in lego_en else lego_en
        core_zh = self.extract_components(lego_zh)[0] if ' ' in lego_zh else lego_zh
        return core_en, core_zh

    def generate_short_2_word(self, lego_en: str, lego_zh: str, context: Optional[str] = None) -> Tuple[str, str]:
        """Generate a 2-word phrase"""
        if context == 'question':
            return f"{self.question_words[0]} {lego_en.split()[0]}", f"为什么{lego_zh.split()[0]}"
        elif context == 'affirmative':
            return f"yes {lego_en.split()[0]}", f"是的{lego_zh.split()[0]}"
        else:
            return f"I {lego_en.split()[0]}", f"我{lego_zh.split()[0]}"

    def generate_medium_3_word(self, lego_en: str, lego_zh: str, earlier_legos: List[Dict], context_num: int = 0) -> Tuple[str, str]:
        """Generate a 3-word phrase"""
        first_word_en = self.extract_components(lego_en)[0]
        first_word_zh = self.extract_components(lego_zh)[0]

        if context_num == 0:
            return f"I like {first_word_en}", f"我喜欢{first_word_zh}"
        elif context_num == 1:
            return f"you can {first_word_en}", f"你能{first_word_zh}"
        else:
            return f"they said {first_word_en}", f"他们说{first_word_zh}"

    def generate_longer_4_word(self, lego_en: str, lego_zh: str, earlier_legos: List[Dict], context_num: int = 0) -> Tuple[str, str]:
        """Generate a 4-5 word phrase"""
        if context_num == 0:
            return f"I think that {lego_en}", f"我认为{lego_zh}"
        elif context_num == 1:
            return f"can you tell me {lego_en.split()[0]}", f"你能告诉我{lego_zh.split()[0]}"
        else:
            return f"it seems like they {lego_en.split()[0]}", f"看起来他们{lego_zh.split()[0]}"

    def generate_longest_6_plus(self, lego_en: str, lego_zh: str, seed_en: str, seed_zh: str,
                                earlier_legos: List[Dict], is_final: bool, context_num: int = 0) -> Tuple[str, str]:
        """Generate longest phrases (6+ words)"""
        if is_final and context_num == 3:
            # Use the actual seed sentence
            return seed_en, seed_zh

        if context_num == 0:
            return f"I really think that {lego_en} is important", f"我真的认为{lego_zh}很重要"
        elif context_num == 1:
            return f"They always told me that {lego_en} was good", f"他们总是告诉我{lego_zh}是好的"
        elif context_num == 2:
            return f"We need to understand that {lego_en} matters", f"我们需要理解{lego_zh}很重要"
        else:
            return f"I would like to know if you understand {lego_en}", f"我想知道你是否理解{lego_zh}"

    def generate_for_lego(
        self,
        lego_en: str,
        lego_zh: str,
        earlier_legos: List[Dict],
        is_final: bool,
        seed_en: str,
        seed_zh: str
    ) -> List[List]:
        """
        Generate exactly 10 phrases with 2-2-2-4 distribution.
        """
        phrases = []

        # 2 short (1-2 legos)
        en, zh = self.generate_short_1_word(lego_en, lego_zh)
        phrases.append([en, zh, None, 1])

        en, zh = self.generate_short_2_word(lego_en, lego_zh, 'affirmative')
        phrases.append([en, zh, None, 2])

        # 2 medium (3 legos)
        en, zh = self.generate_medium_3_word(lego_en, lego_zh, earlier_legos, 0)
        phrases.append([en, zh, None, 3])

        en, zh = self.generate_medium_3_word(lego_en, lego_zh, earlier_legos, 1)
        phrases.append([en, zh, None, 3])

        # 2 longer (4-5 legos)
        en, zh = self.generate_longer_4_word(lego_en, lego_zh, earlier_legos, 0)
        phrases.append([en, zh, None, len(en.split())])

        en, zh = self.generate_longer_4_word(lego_en, lego_zh, earlier_legos, 1)
        phrases.append([en, zh, None, len(en.split())])

        # 4 longest (6+ legos)
        for i in range(4):
            en, zh = self.generate_longest_6_plus(lego_en, lego_zh, seed_en, seed_zh, earlier_legos, is_final, i)
            phrases.append([en, zh, None, len(en.split())])

        return phrases[:10]


class Phase5S0121S0130Generator:
    """Main generator for Phase 5 S0121-S0130"""

    def __init__(self):
        self.generator = PhrasePhraseGenerator()
        self.processed_count = 0
        self.error_count = 0

    def process_seed(self, seed_num: int) -> bool:
        """Process a single seed"""
        seed_id_lower = f"seed_s{seed_num:04d}"
        seed_id = f"S{seed_num:04d}"

        scaffold_path = SCAFFOLDS_DIR / f"{seed_id_lower}.json"

        if not scaffold_path.exists():
            print(f"  [SKIP] {seed_id_lower}.json - not found")
            return False

        try:
            # Read scaffold
            with open(scaffold_path, 'r', encoding='utf-8') as f:
                scaffold = json.load(f)

            print(f"\n[{self.processed_count + 1}/10] Processing {seed_id}:")

            # Get seed pair
            seed_pair = scaffold.get('seed_pair', {})
            seed_en = seed_pair.get('known', '')
            seed_zh = seed_pair.get('target', '')

            print(f"    Seed: {seed_en[:50]}...")

            # Process LEGOs
            legos = scaffold.get('legos', {})
            lego_ids = sorted(legos.keys())

            print(f"    LEGOs: {len(lego_ids)} to process")
            lego_phrase_count = 0

            for lego_id in lego_ids:
                lego_data = legos[lego_id]

                # Extract LEGO info
                lego = lego_data.get('lego', [None, None])
                lego_en, lego_zh = lego[0] or '', lego[1] or ''
                is_final = lego_data.get('is_final_lego', False)

                # Get earlier LEGOs in this seed
                earlier_lego_ids = lego_data.get('current_seed_earlier_legos', [])

                # Generate phrases
                phrases = self.generator.generate_for_lego(
                    lego_en=lego_en,
                    lego_zh=lego_zh,
                    earlier_legos=earlier_lego_ids,
                    is_final=is_final,
                    seed_en=seed_en,
                    seed_zh=seed_zh
                )

                if phrases and len(phrases) == 10:
                    # Update LEGO data
                    lego_data['practice_phrases'] = phrases

                    # Update distribution
                    distribution = {
                        'short_1_to_2_legos': 0,
                        'medium_3_legos': 0,
                        'longer_4_legos': 0,
                        'longest_5_legos': 0
                    }

                    for phrase in phrases:
                        word_count = phrase[3] if len(phrase) > 3 else len(phrase[0].split())
                        if word_count <= 2:
                            distribution['short_1_to_2_legos'] += 1
                        elif word_count == 3:
                            distribution['medium_3_legos'] += 1
                        elif word_count <= 5:
                            distribution['longer_4_legos'] += 1
                        else:
                            distribution['longest_5_legos'] += 1

                    lego_data['phrase_distribution'] = distribution
                    lego_phrase_count += 1

            # Write output
            output_path = OUTPUT_DIR / f"{seed_id_lower}.json"
            with open(output_path, 'w', encoding='utf-8') as f:
                json.dump(scaffold, f, ensure_ascii=False, indent=2)

            print(f"    Phrases generated: {lego_phrase_count}/{len(lego_ids)}")
            print(f"    Output: {output_path.name}")

            self.processed_count += 1
            return True

        except Exception as e:
            print(f"  [ERROR] {seed_id_lower}: {str(e)}")
            self.error_count += 1
            return False

    def process_all(self):
        """Process all seeds in range"""
        print("=" * 70)
        print("Phase 5 Content Generator - Seeds S0121-S0130")
        print("=" * 70)

        for seed_num in SEEDS_TO_PROCESS:
            self.process_seed(seed_num)

        print("\n" + "=" * 70)
        print(f"SUMMARY: {self.processed_count} seeds processed, {self.error_count} errors")
        print("=" * 70)


if __name__ == "__main__":
    gen = Phase5S0121S0130Generator()
    gen.process_all()
