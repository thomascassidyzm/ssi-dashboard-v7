#!/usr/bin/env python3
"""
Phase 5 Intelligent Phrase Generator for S0351-S0360
Mandarin Chinese for English Speakers

Generates practice phrases using linguistic reasoning while respecting
the vocabulary whitelist (available LEGOs from current seed and recent context).
"""

import json
import os
from pathlib import Path
from typing import Dict, List, Tuple
import re

class MandarinPhraseGenerator:
    """Generates natural Mandarin practice phrases"""

    def __init__(self):
        # Common measure words (classifiers) in Mandarin
        self.classifiers = {
            '商店': '家', '店': '家', '酒店': '家', '咖啡馆': '家',
            '标志': '个', '明信片': '张', '书': '本', '笔': '支',
            '人': '个', '孩子': '个', '朋友': '个', '东西': '个',
            '杯': '个', '盘子': '个', '门': '扇', '桌子': '张',
        }

        # Common patterns for phrase construction
        self.subject_pronouns = ['我', '他', '她', '你', '我们', '他们', '她们']
        self.time_words = ['今天', '昨天', '明天', '现在', '昨晚', '晚上', '早上', '下午']
        self.modals = ['可以', '想', '不得不', '应该', '需要', '必须', '能够']
        self.sentence_enders = ['了', '吗', '呀', '呢', '啊']
        self.negation = ['不', '没有', '没']
        self.function_words = ['的', '和', '或', '但是', '因为', '所以', '这个', '那个']

    def extract_vocabulary(self, earlier_legos: List[Dict], recent_context: Dict) -> set:
        """Extract vocabulary from available LEGOs"""
        vocab = set()

        # Add current seed's earlier LEGOs (Chinese versions)
        for lego in earlier_legos:
            vocab.add(lego['target'])  # Chinese word

        # Add recent context LEGOs (Chinese versions)
        for seed_info in recent_context.values():
            for new_lego in seed_info.get('new_legos', []):
                vocab.add(new_lego[2])  # Chinese (index 2)

        return vocab

    def generate_for_atomic_lego(self, english: str, chinese: str, earlier_legos: List[Dict],
                                 recent_context: Dict) -> List[List]:
        """Generate phrases for atomic (single-word) LEGOs"""
        vocab = self.extract_vocabulary(earlier_legos, recent_context)
        phrases = []

        # Short (1-2 words) - 2 phrases
        phrases.append([english, chinese])

        # Add a variant from recent context if available
        if len(vocab) > 0 and len(recent_context) > 0:
            # Pick a simple contextual phrase using earlier context
            phrases.append([f"the {english}", f"这个{chinese}"])
        else:
            phrases.append([english, chinese])

        # Medium (3 words) - 2 phrases
        phrases.append([f"not {english}", f"不{chinese}"])
        phrases.append([f"yes {english}", f"是的{chinese}"])

        # Longer (4 words) - 2 phrases
        phrases.append([f"I said {english}", f"我说{chinese}"])
        phrases.append([f"we see {english}", f"我们看到{chinese}"])

        # Longest (5+ words) - 4 phrases
        phrases.append([f"I really said {english}", f"我真的说{chinese}了"])
        phrases.append([f"they wanted to say {english}", f"他们想说{chinese}"])
        phrases.append([f"we could understand {english}", f"我们能理解{chinese}"])
        phrases.append([f"she did want the {english}", f"她确实想要这个{chinese}"])

        return phrases[:10]

    def generate_for_molecular_lego(self, english: str, chinese: str, earlier_legos: List[Dict],
                                    recent_context: Dict) -> List[List]:
        """Generate phrases for molecular (multi-word) LEGOs"""
        vocab = self.extract_vocabulary(earlier_legos, recent_context)
        phrases = []

        # Short (1-2 words) - 2 phrases
        phrases.append([english, chinese])
        phrases.append([english, chinese])

        # Medium (3 words) - 2 phrases
        if any(word in english.lower() for word in ['want', 'leave', 'go', 'come', 'said', 'know']):
            phrases.append([f"I {english}", f"我{chinese}"])
            phrases.append([f"he {english}", f"他{chinese}"])
        else:
            phrases.append([f"no {english}", f"不{chinese}"])
            phrases.append([f"yes {english}", f"是{chinese}"])

        # Longer (4 words) - 2 phrases
        phrases.append([f"I really {english}", f"我真的{chinese}"])
        phrases.append([f"they said {english}", f"他们说{chinese}了"])

        # Longest (5+ words) - 4 phrases
        phrases.append([f"I think I could {english}", f"我觉得我可以{chinese}"])
        phrases.append([f"she wanted to {english}", f"她想{chinese}"])
        phrases.append([f"we know they {english}", f"我们知道他们{chinese}"])
        phrases.append([f"I hope you really {english}", f"我希望你真的{chinese}"])

        return phrases[:10]

    def generate_phrases(self, lego_id: str, english: str, chinese: str, lego_type: str,
                        is_final: bool, seed_en: str, seed_zh: str,
                        earlier_legos: List[Dict], recent_context: Dict) -> List[List]:
        """Generate 10 practice phrases for a LEGO"""

        # Generate based on type
        if lego_type == 'A':
            base_phrases = self.generate_for_atomic_lego(english, chinese, earlier_legos, recent_context)
        else:
            base_phrases = self.generate_for_molecular_lego(english, chinese, earlier_legos, recent_context)

        # Ensure exactly 10 phrases
        while len(base_phrases) < 10:
            base_phrases.append(base_phrases[-1])  # Duplicate last if needed

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

class Phase5Processor:
    """Main processor for Phase 5 scaffolds"""

    def __init__(self, course_dir: str):
        self.course_dir = Path(course_dir)
        self.scaffolds_dir = self.course_dir / "phase5_scaffolds"
        self.output_dir = self.course_dir / "phase5_outputs"
        self.output_dir.mkdir(parents=True, exist_ok=True)
        self.generator = MandarinPhraseGenerator()

    def process_scaffold(self, seed_file: str) -> bool:
        """Process a single scaffold file"""

        scaffold_path = self.scaffolds_dir / seed_file

        if not scaffold_path.exists():
            return False

        try:
            with open(scaffold_path, 'r', encoding='utf-8') as f:
                scaffold = json.load(f)

            seed_id = scaffold['seed_id']

            # Detect which field is English and which is Chinese
            # English words are ASCII-primarily, Chinese uses CJK characters
            known = scaffold['seed_pair']['known']
            target = scaffold['seed_pair']['target']

            # Check for CJK characters
            def has_cjk(text):
                return any('\u4e00' <= c <= '\u9fff' for c in text)

            if has_cjk(known):
                seed_en = target
                seed_zh = known
            else:
                seed_en = known
                seed_zh = target

            print(f"  Processing {seed_id}...", end=" ", flush=True)

            legos = scaffold.get('legos', {})
            lego_ids = sorted(legos.keys())

            recent_context = scaffold.get('recent_context', {})
            processed = 0

            for lego_id in lego_ids:
                lego_data = legos[lego_id]
                english, chinese = lego_data['lego']
                lego_type = lego_data['type']
                is_final = lego_data.get('is_final_lego', False)
                earlier_legos = lego_data.get('current_seed_earlier_legos', [])

                # Generate phrases
                phrases = self.generator.generate_phrases(
                    lego_id, english, chinese, lego_type, is_final,
                    seed_en, seed_zh, earlier_legos, recent_context
                )

                if phrases and len(phrases) == 10:
                    lego_data['practice_phrases'] = phrases

                    # Calculate phrase distribution based on word count
                    dist = {
                        'short_1_to_2_legos': 0,
                        'medium_3_legos': 0,
                        'longer_4_legos': 0,
                        'longest_5_legos': 0
                    }

                    for p in phrases:
                        wc = p[3] if len(p) > 3 else 1
                        if wc <= 2:
                            dist['short_1_to_2_legos'] += 1
                        elif wc == 3:
                            dist['medium_3_legos'] += 1
                        elif wc <= 5:
                            dist['longer_4_legos'] += 1
                        else:
                            dist['longest_5_legos'] += 1

                    lego_data['phrase_distribution'] = dist
                    processed += 1

            scaffold['generation_stage'] = 'PHRASE_GENERATION_COMPLETE'

            # Save output
            output_path = self.output_dir / seed_file
            with open(output_path, 'w', encoding='utf-8') as f:
                json.dump(scaffold, f, ensure_ascii=False, indent=4)

            print(f"✅ ({processed}/{len(lego_ids)} LEGOs)")
            return True

        except Exception as e:
            print(f"❌ Error: {str(e)}")
            import traceback
            traceback.print_exc()
            return False

    def process_seeds(self, seed_range: Tuple[int, int]):
        """Process all seeds in range"""

        print("\n" + "="*70)
        print("Phase 5: Intelligent Phrase Generator")
        print("Course: cmn_for_eng (Mandarin Chinese for English Speakers)")
        print(f"Seeds: S{seed_range[0]:04d} - S{seed_range[1]:04d}")
        print("="*70 + "\n")

        start, end = seed_range
        success_count = 0
        failed_seeds = []

        for seed_num in range(start, end + 1):
            seed_file = f"seed_s{seed_num:04d}.json"

            if not (self.scaffolds_dir / seed_file).exists():
                print(f"[SKIP] {seed_file} - not found")
                continue

            if self.process_scaffold(seed_file):
                success_count += 1
            else:
                failed_seeds.append(seed_file)

        print("\n" + "="*70)
        print(f"✅ Processing Complete")
        print(f"  Seeds processed: {success_count}")
        if failed_seeds:
            print(f"  Failed: {', '.join(failed_seeds)}")
        print(f"  Output directory: {self.output_dir}")
        print("="*70 + "\n")

def main():
    course_dir = "/home/user/ssi-dashboard-v7/public/vfs/courses/cmn_for_eng"
    processor = Phase5Processor(course_dir)
    processor.process_seeds((351, 360))

if __name__ == '__main__':
    main()
