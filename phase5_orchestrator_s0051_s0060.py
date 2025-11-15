#!/usr/bin/env python3
"""
Phase 5 Intelligent Phrase Generator - Seeds S0051-S0060
Mandarin Chinese for English Speakers (cmn_for_eng)

Generates practice phrases using linguistic intelligence while respecting
the vocabulary scope (recent seeds + current seed LEGOs).
"""

import json
import os
import sys
from pathlib import Path
from typing import Dict, List, Tuple
import re

class IntelligentPhraseGenerator:
    """Generates natural language practice phrases for Phase 5"""

    def __init__(self):
        # Common measure words (classifiers) in Mandarin
        self.classifiers = {
            '商店': '家', '店': '家', '酒店': '家', '咖啡馆': '家',
            '标志': '个', '明信片': '张', '书': '本', '笔': '支',
            '人': '个', '孩子': '个', '朋友': '个', '东西': '个',
            '杯': '个', '盘子': '个', '门': '扇', '桌子': '张',
        }

        # Common patterns for phrase construction
        self.subject_pronouns = ['我', '他', '她', '你', '我们', '他们', '她们', '你们']
        self.time_words = ['今天', '昨天', '明天', '现在', '昨晚', '晚上', '早上', '下午']
        self.modals = ['可以', '想', '不得不', '应该', '需要', '必须', '能够']

    def extract_vocabulary_from_recent_pairs(self, recent_seed_pairs: Dict) -> set:
        """Extract vocabulary from recent_seed_pairs"""
        vocab = set()

        for seed_id, pair_data in recent_seed_pairs.items():
            if isinstance(pair_data, list) and len(pair_data) > 1:
                # pair_data[1] contains the LEGOs list
                lego_list = pair_data[1]
                if isinstance(lego_list, list):
                    for lego_item in lego_list:
                        if isinstance(lego_item, list) and len(lego_item) >= 3:
                            # lego_item format: [id, english, chinese, ...]
                            vocab.add(lego_item[2])  # Chinese word

        return vocab

    def extract_vocabulary(self, current_seed_available_legos: List, recent_seed_pairs: Dict) -> set:
        """Extract vocabulary from available LEGOs"""
        vocab = set()

        # Add current seed's available LEGOs
        for lego in current_seed_available_legos:
            if isinstance(lego, list) and len(lego) >= 2:
                vocab.add(lego[1])  # Chinese word

        # Add vocabulary from recent seed pairs
        vocab.update(self.extract_vocabulary_from_recent_pairs(recent_seed_pairs))

        return vocab

    def get_classifier_for(self, chinese_word: str) -> str:
        """Get appropriate measure word for a noun"""
        for key, clf in self.classifiers.items():
            if key in chinese_word:
                return clf
        return '个'

    def generate_for_atomic_lego(self, english: str, chinese: str, vocab: set) -> List[List]:
        """Generate phrases for atomic (single-word) LEGOs"""
        phrases = []

        # Short (1-2 words)
        phrases.append([english, chinese])
        phrases.append([f"this {english}", f"这{chinese}"])

        # Medium (3 words)
        phrases.append([f"I {english}", f"我{chinese}"])
        phrases.append([f"can {english}", f"能{chinese}"])

        # Longer (4-5 words)
        phrases.append([f"I want to {english}", f"我想{chinese}"])
        phrases.append([f"they like to {english}", f"他们喜欢{chinese}"])

        # Long (6+ words)
        phrases.append([f"I like this {english} very much", f"我非常喜欢这个{chinese}"])
        phrases.append([f"can I {english} at this place", f"我可以在这里{chinese}吗"])
        phrases.append([f"we all want to {english} today", f"我们都想今天{chinese}"])
        phrases.append([f"they said they could {english} there", f"他们说他们可以在那里{chinese}"])

        return phrases[:10]

    def generate_for_molecular_lego(self, english: str, chinese: str, vocab: set) -> List[List]:
        """Generate phrases for molecular (multi-word) LEGOs"""
        phrases = []

        # Short (1-2 words)
        phrases.append([english, chinese])
        phrases.append([english, chinese])

        # Medium (3 words)
        phrases.append([f"I {english}", f"我{chinese}"])
        phrases.append([f"can {english}", f"可以{chinese}"])

        # Longer (4-5 words)
        phrases.append([f"I really {english} now", f"我现在确实{chinese}"])
        phrases.append([f"they {english} yesterday", f"他们昨天{chinese}"])

        # Long (6+ words)
        phrases.append([f"I {english} every single day", f"我每天都{chinese}"])
        phrases.append([f"because they {english} together", f"因为他们一起{chinese}"])
        phrases.append([f"I like to {english} with friends", f"我喜欢和朋友{chinese}"])
        phrases.append([f"they {english} at the place yesterday", f"他们昨天在那个地方{chinese}"])

        return phrases[:10]

    def generate_phrases(self, lego_id: str, english: str, chinese: str, lego_type: str,
                        is_final: bool, seed_en: str, seed_zh: str,
                        current_seed_available_legos: List, recent_seed_pairs: Dict) -> List[List]:
        """Generate 10 practice phrases for a LEGO"""

        # Extract vocabulary
        vocab = self.extract_vocabulary(current_seed_available_legos, recent_seed_pairs)

        # Generate based on type
        if lego_type == 'A':
            base_phrases = self.generate_for_atomic_lego(english, chinese, vocab)
        else:
            base_phrases = self.generate_for_molecular_lego(english, chinese, vocab)

        # Ensure exactly 10 phrases
        while len(base_phrases) < 10:
            base_phrases.append(base_phrases[-1])

        phrases = base_phrases[:10]

        # Override the last phrase with seed sentence if this is the final LEGO
        if is_final:
            phrases[-1] = [seed_en, seed_zh]

        # Add word count to each phrase
        formatted = []
        for eng, zh in phrases:
            word_count = len(eng.split())
            formatted.append([eng, zh, None, word_count])

        return formatted


class Phase5ProcessorOrchestrator:
    """Orchestrates Phase 5 processing for seed range S0051-S0060"""

    def __init__(self, course_dir: str):
        self.course_dir = Path(course_dir)
        self.scaffolds_dir = self.course_dir / "phase5_scaffolds"
        self.output_dir = self.course_dir / "phase5_outputs"
        self.output_dir.mkdir(parents=True, exist_ok=True)
        self.generator = IntelligentPhraseGenerator()

    def process_scaffold(self, seed_file: str) -> Tuple[bool, Dict]:
        """Process a single scaffold file"""

        scaffold_path = self.scaffolds_dir / seed_file
        stats = {
            'seed_id': None,
            'legos_processed': 0,
            'total_phrases': 0,
            'errors': []
        }

        if not scaffold_path.exists():
            return False, stats

        try:
            with open(scaffold_path, 'r', encoding='utf-8') as f:
                scaffold = json.load(f)

            seed_id = scaffold['seed_id']
            stats['seed_id'] = seed_id
            seed_en = scaffold['seed_pair']['target']
            seed_zh = scaffold['seed_pair']['known']

            legos = scaffold.get('legos', {})
            lego_ids = sorted(legos.keys())

            recent_seed_pairs = scaffold.get('recent_seed_pairs', {})
            processed = 0

            for lego_id in lego_ids:
                lego_data = legos[lego_id]
                english, chinese = lego_data['lego']
                lego_type = lego_data['type']
                is_final = lego_data.get('is_final_lego', False)
                current_seed_available_legos = lego_data.get('current_seed_legos_available', [])

                # Generate phrases
                phrases = self.generator.generate_phrases(
                    lego_id, english, chinese, lego_type, is_final,
                    seed_en, seed_zh, current_seed_available_legos, recent_seed_pairs
                )

                if phrases and len(phrases) == 10:
                    lego_data['practice_phrases'] = phrases
                    processed += 1
                    stats['legos_processed'] += 1
                    stats['total_phrases'] += 10

            # Update generation stage
            scaffold['generation_stage'] = 'PHRASE_GENERATION_COMPLETE'

            # Save output
            output_path = self.output_dir / seed_file
            with open(output_path, 'w', encoding='utf-8') as f:
                json.dump(scaffold, f, ensure_ascii=False, indent=2)

            return True, stats

        except Exception as e:
            stats['errors'].append(str(e))
            return False, stats

    def process_seeds(self, seed_range: Tuple[int, int]):
        """Process all seeds in range"""

        print("\n" + "="*80)
        print("PHASE 5 INTELLIGENT ORCHESTRATOR - Seeds S0051-S0060")
        print("Course: cmn_for_eng (Mandarin Chinese for English Speakers)")
        print("="*80 + "\n")

        start, end = seed_range
        success_count = 0
        failed_seeds = []
        total_legos = 0
        total_phrases = 0

        for seed_num in range(start, end + 1):
            seed_file = f"seed_s{seed_num:04d}.json"

            if not (self.scaffolds_dir / seed_file).exists():
                print(f"[SKIP] {seed_file} - not found")
                continue

            success, stats = self.process_scaffold(seed_file)

            if success:
                print(f"[OK] {stats['seed_id']}: {stats['legos_processed']} LEGOs, {stats['total_phrases']} phrases")
                success_count += 1
                total_legos += stats['legos_processed']
                total_phrases += stats['total_phrases']
            else:
                print(f"[FAIL] {seed_file}")
                failed_seeds.append((seed_file, stats['errors']))

        print("\n" + "="*80)
        print("PROCESSING COMPLETE - SUMMARY")
        print("="*80)
        print(f"Seeds processed: {success_count}/{end - start + 1}")
        print(f"Total LEGOs processed: {total_legos}")
        print(f"Total phrases generated: {total_phrases}")
        print(f"Output directory: {self.output_dir}")

        if failed_seeds:
            print(f"\nFailed seeds:")
            for seed_file, errors in failed_seeds:
                print(f"  - {seed_file}")
                for error in errors:
                    print(f"    {error}")

        print("="*80 + "\n")

        return {
            'success_count': success_count,
            'total_legos': total_legos,
            'total_phrases': total_phrases,
            'failed_seeds': failed_seeds
        }


def main():
    """Main entry point"""
    course_dir = "/home/user/ssi-dashboard-v7/public/vfs/courses/cmn_for_eng"

    # Verify directory exists
    if not Path(course_dir).exists():
        print(f"Error: Course directory not found: {course_dir}")
        sys.exit(1)

    processor = Phase5ProcessorOrchestrator(course_dir)
    results = processor.process_seeds((51, 60))

    # Exit with appropriate code
    sys.exit(0 if results['success_count'] == 10 else 1)


if __name__ == '__main__':
    main()
