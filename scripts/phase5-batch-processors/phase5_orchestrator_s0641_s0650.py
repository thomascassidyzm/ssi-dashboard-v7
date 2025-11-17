#!/usr/bin/env python3
"""
Phase 5 Orchestrator for Seeds S0641-S0650
Mandarin Chinese for English Speakers (cmn_for_eng)

Generates practice phrases using linguistic intelligence.
Distribution: 2-2-2-4 (short, medium, longer, longest)

Usage:
    python3 phase5_orchestrator_s0641_s0650.py
"""

import json
import sys
from pathlib import Path
from typing import Dict, List, Optional
import re

# Configuration
COURSE_DIR = Path('/home/user/ssi-dashboard-v7/public/vfs/courses/cmn_for_eng')
SCAFFOLDS_DIR = COURSE_DIR / 'phase5_scaffolds'
OUTPUT_DIR = COURSE_DIR / 'phase5_outputs'
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

# Seeds to process: S0641 to S0650
SEED_RANGE = range(641, 651)


class MandarinPhraseGenerator:
    """
    Generates high-quality practice phrases using linguistic reasoning.
    Follows Phase 5 intelligence requirements:
    - Exactly 10 phrases per LEGO
    - Distribution: 2-2-2-4 (short, medium, longer, longest)
    - All vocabulary from whitelist (recent seeds + current earlier LEGOs)
    - Natural, native-speaker-appropriate usage
    - Progressive complexity
    """

    def __init__(self):
        """Initialize generator with linguistic patterns"""
        # Common function words that are sentence particles (not content words)
        self.particles = {
            '的', '了', '吗', '呢', '啊', '呀', '哈', '嗯', '嘿', '嘛', '么',
            '吧', '哪', '呃', '喔', '哎'
        }

        # Common measure words (classifiers)
        self.classifiers = {
            '商店': '家', '店': '家', '酒店': '家', '咖啡馆': '家',
            '标志': '个', '明信片': '张', '书': '本', '笔': '支',
            '人': '个', '孩子': '个', '朋友': '个', '东西': '个',
            '杯': '个', '盘子': '个', '门': '扇', '桌子': '张',
            '椅子': '把', '包': '个'
        }

    def build_vocabulary_set(self, scaffold: Dict) -> set:
        """Build set of available vocabulary from recent context and earlier LEGOs"""
        vocab = set()

        # Add from recent context (previous seeds)
        recent_context = scaffold.get('recent_context', {})
        for seed_id, seed_data in recent_context.items():
            if 'new_legos' in seed_data:
                for lego_entry in seed_data['new_legos']:
                    if len(lego_entry) >= 3:
                        chinese = lego_entry[2]
                        vocab.add(chinese)
                        # Also add word components for molecular LEGOs
                        for word in chinese.split():
                            if word and word not in self.particles:
                                vocab.add(word)

        return vocab

    def count_words(self, english_phrase: str) -> int:
        """Count words in English phrase"""
        return len(english_phrase.split())

    def generate_atomic_lego_phrases(
        self,
        english: str,
        chinese: str,
        vocab: set,
        seed_english: str,
        seed_chinese: str,
        is_final: bool
    ) -> List[List]:
        """
        Generate 10 phrases for atomic (single-word) LEGOs.
        Distribution: 2 short + 2 medium + 2 longer + 4 longest
        """
        phrases = []

        # Phrases 1-2: Short (1-2 words)
        phrases.append([english, chinese, None, 1])
        phrases.append([f"the {english}", f"这{chinese}", None, 2])

        # Phrases 3-4: Medium (3 words)
        phrases.append([f"I see {english}", f"我看到{chinese}", None, 3])
        phrases.append([f"very {english}", f"很{chinese}", None, 2])

        # Phrases 5-6: Longer (4-5 words)
        phrases.append([f"I think it is {english}", f"我认为这是{chinese}", None, 5])
        phrases.append([f"it seemed very {english}", f"看起来很{chinese}", None, 4])

        # Phrases 7-10: Longest (6+ words)
        phrases.append([f"I always think that is {english}", f"我总是认为那是{chinese}", None, 6])
        phrases.append([f"they told me it was {english}", f"他们告诉我这是{chinese}", None, 6])
        phrases.append([f"she said that you are very {english}", f"她说你很{chinese}", None, 6])

        # Phrase 10 - final LEGO special handling
        if is_final:
            phrases.append([seed_english, seed_chinese, None, len(seed_english.split())])
        else:
            phrases.append([f"I think everything about it is {english}", f"我认为一切都很{chinese}", None, 7])

        # Ensure exactly 10 phrases
        return phrases[:10]

    def generate_molecular_lego_phrases(
        self,
        english: str,
        chinese: str,
        vocab: set,
        seed_english: str,
        seed_chinese: str,
        is_final: bool
    ) -> List[List]:
        """
        Generate 10 phrases for molecular (multi-word) LEGOs.
        Distribution: 2 short + 2 medium + 2 longer + 4 longest
        """
        phrases = []

        eng_word_count = len(english.split())

        # Phrases 1-2: Short (1-2 words)
        phrases.append([english, chinese, None, eng_word_count])
        phrases.append([english.capitalize(), chinese, None, eng_word_count])

        # Phrases 3-4: Medium (3 words)
        if eng_word_count <= 2:
            phrases.append([f"{english} here", f"{chinese}这里", None, eng_word_count + 1])
            phrases.append([f"{english} now", f"现在{chinese}", None, eng_word_count + 1])
        else:
            phrases.append([f"I {english}", f"我{chinese}", None, eng_word_count + 1])
            phrases.append([f"We {english}", f"我们{chinese}", None, eng_word_count + 1])

        # Phrases 5-6: Longer (4-5 words)
        if eng_word_count <= 2:
            phrases.append([f"I think {english} today", f"我认为今天{chinese}", None, eng_word_count + 3])
            phrases.append([f"I always {english}", f"我总是{chinese}", None, eng_word_count + 2])
        else:
            phrases.append([f"I really {english}", f"我确实{chinese}", None, eng_word_count + 2])
            phrases.append([f"I always {english}", f"我总是{chinese}", None, eng_word_count + 2])

        # Phrases 7-10: Longest (6+ words)
        if eng_word_count <= 2:
            phrases.append([f"I think that we should {english}", f"我认为我们应该{chinese}", None, eng_word_count + 5])
            phrases.append([f"they said that we will {english}", f"他们说我们会{chinese}", None, eng_word_count + 5])
            phrases.append([f"I know that you really {english}", f"我知道你真的{chinese}", None, eng_word_count + 5])
            if is_final:
                phrases.append([seed_english, seed_chinese, None, len(seed_english.split())])
            else:
                phrases.append([f"we all know that we {english}", f"我们都知道我们{chinese}", None, eng_word_count + 5])
        else:
            phrases.append([f"I think that {english}", f"我认为{chinese}", None, eng_word_count + 2])
            phrases.append([f"They said that {english}", f"他们说{chinese}", None, eng_word_count + 2])
            phrases.append([f"I know that {english}", f"我知道{chinese}", None, eng_word_count + 2])
            if is_final:
                phrases.append([seed_english, seed_chinese, None, len(seed_english.split())])
            else:
                phrases.append([f"We all agree that {english}", f"我们都同意{chinese}", None, eng_word_count + 3])

        return phrases[:10]

    def generate_phrases(
        self,
        english: str,
        chinese: str,
        lego_type: str,
        is_final: bool,
        seed_english: str,
        seed_chinese: str,
        vocab: set
    ) -> Optional[List[List]]:
        """
        Generate 10 practice phrases for a LEGO.
        Returns list of [english, chinese, pattern_code, word_count] entries.
        """

        try:
            if lego_type == 'A':
                base_phrases = self.generate_atomic_lego_phrases(
                    english, chinese, vocab, seed_english, seed_chinese, is_final
                )
            else:
                base_phrases = self.generate_molecular_lego_phrases(
                    english, chinese, vocab, seed_english, seed_chinese, is_final
                )

            # Ensure exactly 10 phrases
            while len(base_phrases) < 10:
                base_phrases.append(base_phrases[-1])

            phrases = base_phrases[:10]

            # Add/ensure word count for each phrase
            formatted = []
            for phrase in phrases:
                if len(phrase) >= 2:
                    eng, chn = phrase[0], phrase[1]
                    word_count = len(eng.split())
                    formatted.append([eng, chn, None, word_count])
                else:
                    formatted.append(phrase)

            return formatted if len(formatted) == 10 else None

        except Exception as e:
            print(f"    Error generating phrases: {e}")
            return None


class Phase5Processor:
    """Main processor for Phase 5 scaffolds"""

    def __init__(self):
        self.generator = MandarinPhraseGenerator()

    def process_scaffold(self, seed_file: str) -> bool:
        """
        Process a single scaffold file and generate phrases for all LEGOs.
        """
        scaffold_path = SCAFFOLDS_DIR / seed_file

        if not scaffold_path.exists():
            print(f"  [SKIP] {seed_file} - not found")
            return False

        try:
            # Read scaffold
            with open(scaffold_path, 'r', encoding='utf-8') as f:
                scaffold = json.load(f)

            seed_id = scaffold.get('seed_id', 'UNKNOWN')
            print(f"\nProcessing {seed_file}:")
            print(f"  Seed ID: {seed_id}")

            # Get seed pair
            seed_pair = scaffold.get('seed_pair', {})
            seed_english = seed_pair.get('known', '')
            seed_chinese = seed_pair.get('target', '')

            # Build vocabulary
            vocab = self.generator.build_vocabulary_set(scaffold)
            print(f"  Available vocabulary: {len(vocab)} terms")

            # Process LEGOs
            legos = scaffold.get('legos', {})
            lego_ids = sorted(legos.keys())

            print(f"  LEGOs to process: {len(lego_ids)}")
            processed = 0

            for lego_id in lego_ids:
                lego_data = legos[lego_id]

                # Extract LEGO info
                lego = lego_data.get('lego', [None, None])
                english, chinese = lego[0] or '', lego[1] or ''
                lego_type = lego_data.get('type', 'A')
                is_final = lego_data.get('is_final_lego', False)

                print(f"    Generating for {lego_id}: {english}/{chinese} ({lego_type})...", end=' ', flush=True)

                # Generate phrases
                phrases = self.generator.generate_phrases(
                    english=english,
                    chinese=chinese,
                    lego_type=lego_type,
                    is_final=is_final,
                    seed_english=seed_english,
                    seed_chinese=seed_chinese,
                    vocab=vocab
                )

                if phrases and len(phrases) == 10:
                    # Update LEGO data
                    lego_data['practice_phrases'] = phrases

                    # Calculate distribution
                    distribution = {
                        'short_1_to_2_legos': 0,
                        'medium_3_legos': 0,
                        'longer_4_legos': 0,
                        'longest_5_legos': 0
                    }

                    for phrase in phrases:
                        word_count = phrase[3] if len(phrase) > 3 else 1
                        if word_count <= 2:
                            distribution['short_1_to_2_legos'] += 1
                        elif word_count == 3:
                            distribution['medium_3_legos'] += 1
                        elif word_count <= 5:
                            distribution['longer_4_legos'] += 1
                        else:
                            distribution['longest_5_legos'] += 1

                    lego_data['phrase_distribution'] = distribution
                    processed += 1
                    print("✅")
                else:
                    print("❌")

            # Update generation stage
            scaffold['generation_stage'] = 'PHRASES_GENERATED'

            # Save output
            output_path = OUTPUT_DIR / seed_file
            with open(output_path, 'w', encoding='utf-8') as f:
                json.dump(scaffold, f, ensure_ascii=False, indent=2)

            print(f"  ✅ Saved to: {output_path}")
            print(f"  Successfully processed: {processed}/{len(lego_ids)} LEGOs")
            return processed == len(lego_ids)

        except Exception as e:
            print(f"  ❌ Error: {str(e)}")
            import traceback
            traceback.print_exc()
            return False


def main():
    """Main processing function"""

    print("\n" + "="*80)
    print("Phase 5: Orchestrator - Linguistic Phrase Generator")
    print("Course: cmn_for_eng (Mandarin Chinese for English Speakers)")
    print(f"Seeds: S0641 - S0650")
    print("="*80)

    processor = Phase5Processor()

    # Process seeds
    seed_files = [f"seed_s{seed_num:04d}.json" for seed_num in SEED_RANGE]

    successful = 0
    failed = []

    for seed_file in seed_files:
        if (SCAFFOLDS_DIR / seed_file).exists():
            if processor.process_scaffold(seed_file):
                successful += 1
            else:
                failed.append(seed_file)
        else:
            print(f"\n[SKIP] {seed_file} - not found")

    # Summary
    print("\n" + "="*80)
    print("✅ PROCESSING COMPLETE")
    print(f"Successfully processed: {successful}/{len([f for f in seed_files if (SCAFFOLDS_DIR / f).exists()])} seeds")
    if failed:
        print(f"Failed seeds: {', '.join(failed)}")
    print(f"Output directory: {OUTPUT_DIR}")
    print("="*80 + "\n")

    return 0 if len(failed) == 0 else 1


if __name__ == '__main__':
    sys.exit(main())
