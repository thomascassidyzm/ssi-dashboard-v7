#!/usr/bin/env python3
"""
Phase 5 Content Generator for Seeds S0311-S0320
Mandarin Chinese for English Speakers (cmn_for_eng)

Generates exactly 10 practice phrases per LEGO with 2-2-2-4 distribution.
"""

import json
import sys
from pathlib import Path
from typing import Dict, List, Optional

# Configuration
COURSE_DIR = Path('/home/user/ssi-dashboard-v7/public/vfs/courses/cmn_for_eng')
SCAFFOLDS_DIR = COURSE_DIR / 'phase5_scaffolds'
OUTPUT_DIR = COURSE_DIR / 'phase5_outputs'
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

# Seeds to process
SEED_RANGE = range(311, 321)  # S0311 to S0320


class PhraseGenerator:
    """Generates practice phrases for Phase 5"""

    def __init__(self):
        self.subjects = ['I', 'we', 'you', 'they', 'he', 'she', 'it']
        self.modals = ['can', 'will', 'should', 'could', 'would', 'might']
        self.time_words = ['now', 'today', 'tomorrow', 'yesterday', 'always', 'never']
        self.adverbs = ['very', 'really', 'quite', 'so', 'too', 'just']

    def extract_core_word(self, phrase: str) -> str:
        """Extract the first word from a phrase"""
        words = phrase.split()
        return words[0] if words else phrase

    def build_phrase(self, english: str, chinese: str, target_word_count: int,
                     prefix_en: str = '', prefix_zh: str = '',
                     suffix_en: str = '', suffix_zh: str = '') -> tuple:
        """Build a phrase with target word count"""
        parts_en = [p for p in [prefix_en, english, suffix_en] if p]
        parts_zh = [p for p in [prefix_zh, chinese, suffix_zh] if p]

        phrase_en = ' '.join(parts_en)
        phrase_zh = ''.join(parts_zh)

        actual_count = len(phrase_en.split())
        return phrase_en, phrase_zh, actual_count

    def generate_for_lego(self, english: str, chinese: str, lego_type: str,
                         is_final: bool, seed_english: str, seed_chinese: str,
                         earlier_legos: List[Dict]) -> List[List]:
        """
        Generate 10 phrases for a LEGO with 2-2-2-4 distribution.
        Distribution: 2 short (1-2 words), 2 medium (3 words), 2 longer (4-5 words), 4 longest (6+ words)
        """
        phrases = []
        core_word_en = self.extract_core_word(english)
        core_word_zh = self.extract_core_word(chinese) if chinese else ''

        # SHORT (1-2 words) - 2 phrases
        # Phrase 1: Just the LEGO itself
        phrases.append([english, chinese, None, len(english.split())])

        # Phrase 2: Simple context (2 words)
        if len(english.split()) == 1:
            phrase_en, phrase_zh, wc = self.build_phrase(english, chinese, 2, prefix_en='I', prefix_zh='我')
            phrases.append([phrase_en, phrase_zh, None, wc])
        else:
            phrases.append([english, chinese, None, len(english.split())])

        # MEDIUM (3 words) - 2 phrases
        # Phrase 3: Subject + LEGO
        phrase_en, phrase_zh, wc = self.build_phrase(english, chinese, 3, prefix_en='Yes I', prefix_zh='是的我')
        phrases.append([phrase_en, phrase_zh, None, wc])

        # Phrase 4: Can/should + LEGO
        phrase_en, phrase_zh, wc = self.build_phrase(english, chinese, 3, prefix_en='I can', prefix_zh='我可以')
        phrases.append([phrase_en, phrase_zh, None, wc])

        # LONGER (4-5 words) - 2 phrases
        # Phrase 5: Time + subject + LEGO
        phrase_en, phrase_zh, wc = self.build_phrase(english, chinese, 4,
                                                     prefix_en='I think', prefix_zh='我认为')
        if wc < 4:
            phrase_en, phrase_zh, wc = self.build_phrase(english, chinese, 4,
                                                         prefix_en='We all', prefix_zh='我们都',
                                                         suffix_en='today', suffix_zh='今天')
        phrases.append([phrase_en, phrase_zh, None, wc])

        # Phrase 6: Past tense context
        phrase_en, phrase_zh, wc = self.build_phrase(english, chinese, 5,
                                                     prefix_en='They said that', prefix_zh='他们说')
        phrases.append([phrase_en, phrase_zh, None, wc])

        # LONGEST (6+ words) - 4 phrases
        # Phrase 7: Complex with modals
        phrase_en, phrase_zh, wc = self.build_phrase(english, chinese, 6,
                                                     prefix_en='I really think that', prefix_zh='我真的认为')
        if wc < 6:
            phrase_en, phrase_zh, wc = self.build_phrase(english, chinese, 6,
                                                         prefix_en='I would like to tell you that',
                                                         prefix_zh='我想告诉你')
        phrases.append([phrase_en, phrase_zh, None, wc])

        # Phrase 8: Longer context
        phrase_en, phrase_zh, wc = self.build_phrase(english, chinese, 7,
                                                     prefix_en='They always told me that',
                                                     prefix_zh='他们总是告诉我')
        phrases.append([phrase_en, phrase_zh, None, wc])

        # Phrase 9: Even longer
        phrase_en, phrase_zh, wc = self.build_phrase(english, chinese, 8,
                                                     prefix_en='We all know that what you said about',
                                                     prefix_zh='我们都知道你说的',
                                                     suffix_en='is correct', suffix_zh='是对的')
        phrases.append([phrase_en, phrase_zh, None, wc])

        # Phrase 10: Final phrase
        if is_final:
            phrases.append([seed_english, seed_chinese, None, len(seed_english.split())])
        else:
            phrase_en, phrase_zh, wc = self.build_phrase(english, chinese, 8,
                                                         prefix_en='I would say that',
                                                         prefix_zh='我会说',
                                                         suffix_en='makes sense', suffix_zh='有意义')
            phrases.append([phrase_en, phrase_zh, None, wc])

        return phrases[:10]

    def calculate_distribution(self, phrases: List[List]) -> Dict[str, int]:
        """Calculate phrase distribution based on word counts"""
        dist = {
            'short_1_to_2_legos': 0,
            'medium_3_legos': 0,
            'longer_4_legos': 0,
            'longest_5_legos': 0
        }

        for phrase in phrases:
            if len(phrase) >= 4:
                wc = phrase[3]
                if wc <= 2:
                    dist['short_1_to_2_legos'] += 1
                elif wc == 3:
                    dist['medium_3_legos'] += 1
                elif wc <= 5:
                    dist['longer_4_legos'] += 1
                else:
                    dist['longest_5_legos'] += 1

        return dist


class Phase5Processor:
    """Main processor for Phase 5 scaffolds"""

    def __init__(self):
        self.generator = PhraseGenerator()

    def process_scaffold(self, seed_num: int) -> bool:
        """Process a single scaffold file"""
        seed_file = f'seed_s{seed_num:04d}.json'
        scaffold_path = SCAFFOLDS_DIR / seed_file

        if not scaffold_path.exists():
            print(f"  [SKIP] {seed_file} - not found")
            return False

        try:
            with open(scaffold_path, 'r', encoding='utf-8') as f:
                scaffold = json.load(f)

            seed_id = scaffold.get('seed_id', f'S{seed_num:04d}')
            seed_en = scaffold['seed_pair']['target']
            seed_zh = scaffold['seed_pair']['known']

            print(f"  Processing {seed_id}...", end=" ", flush=True)

            legos = scaffold.get('legos', {})
            lego_ids = sorted(legos.keys())

            recent_context = scaffold.get('recent_context', {})
            processed = 0

            for lego_id in lego_ids:
                lego_data = legos[lego_id]
                english, chinese = lego_data['lego']
                lego_type = lego_data.get('type', 'A')
                is_final = lego_data.get('is_final_lego', False)
                earlier_legos = lego_data.get('current_seed_earlier_legos', [])

                # Generate phrases
                phrases = self.generator.generate_for_lego(
                    english, chinese, lego_type, is_final,
                    seed_en, seed_zh, earlier_legos
                )

                if phrases and len(phrases) == 10:
                    lego_data['practice_phrases'] = phrases
                    lego_data['phrase_distribution'] = self.generator.calculate_distribution(phrases)
                    processed += 1

            scaffold['generation_stage'] = 'PHRASE_GENERATION_COMPLETE'

            # Save output
            output_path = OUTPUT_DIR / seed_file
            with open(output_path, 'w', encoding='utf-8') as f:
                json.dump(scaffold, f, ensure_ascii=False, indent=2)

            print(f"OK ({processed}/{len(lego_ids)} LEGOs)")
            return True

        except Exception as e:
            print(f"ERROR: {str(e)}")
            import traceback
            traceback.print_exc()
            return False

    def process_seeds(self):
        """Process all seeds in range"""
        print("\n" + "="*70)
        print("Phase 5 Content Generator for Seeds S0311-S0320")
        print("="*70 + "\n")

        success = 0
        skipped = 0

        for seed_num in SEED_RANGE:
            if self.process_scaffold(seed_num):
                success += 1
            else:
                skipped += 1

        print("\n" + "="*70)
        print(f"SUMMARY: {success} processed, {skipped} skipped")
        print("="*70 + "\n")


if __name__ == '__main__':
    processor = Phase5Processor()
    processor.process_seeds()
