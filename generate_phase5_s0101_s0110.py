#!/usr/bin/env python3
"""
Phase 5 Content Generator for seeds S0101-S0110
Generates practice phrases for LEGO baskets
"""

import json
import os
from pathlib import Path
from typing import Dict, List, Tuple
import re

class MandarinPhrasesGenerator:
    """Generates contextual Mandarin practice phrases for LEGOs"""

    def __init__(self):
        self.classifiers = {
            '商店': '家', '店': '家', '酒店': '家', '咖啡馆': '家',
            '标志': '个', '明信片': '张', '书': '本', '笔': '支',
            '人': '个', '孩子': '个', '朋友': '个', '东西': '个',
            '杯': '个', '盘子': '个', '门': '扇', '桌子': '张',
        }

    def get_classifier(self, word: str) -> str:
        """Get measure word for a noun"""
        for key, clf in self.classifiers.items():
            if key in word:
                return clf
        return '个'

    def extract_available_vocab(self, earlier_legos: List[Dict], recent_context: Dict) -> set:
        """Extract all available vocabulary from context"""
        vocab = set()

        # Add earlier LEGOs from current seed
        for lego in earlier_legos:
            vocab.add(lego['target'])

        # Add recent context LEGOs (from recent 10 seeds)
        for seed_info in recent_context.values():
            for new_lego in seed_info.get('new_legos', []):
                vocab.add(new_lego[2])  # Chinese word

        return vocab

    def generate_practice_phrases(self, lego_en: str, lego_zh: str, lego_type: str,
                                 is_final: bool, seed_en: str, seed_zh: str,
                                 earlier_legos: List[Dict], recent_context: Dict) -> List[List]:
        """Generate 10 practice phrases with 2-2-2-4 distribution"""

        vocab = self.extract_available_vocab(earlier_legos, recent_context)
        phrases = []

        # Atomic (single word) vs Molecular (multi-word) generation
        if lego_type == 'A':
            phrases = self._generate_atomic_phrases(lego_en, lego_zh, vocab)
        else:
            phrases = self._generate_molecular_phrases(lego_en, lego_zh, vocab)

        # Ensure exactly 10 phrases
        while len(phrases) < 10:
            phrases.append(phrases[-1])

        phrases = phrases[:10]

        # Override last phrase with seed pair if this is final LEGO
        if is_final:
            phrases[-1] = [seed_en, seed_zh]

        # Add word counts
        formatted = []
        for eng, zh in phrases:
            word_count = len(eng.split())
            formatted.append([eng, zh, None, word_count])

        return formatted

    def _generate_atomic_phrases(self, eng: str, zh: str, vocab: set) -> List[List]:
        """Generate phrases for atomic (single-word) LEGOs"""
        phrases = []

        # Distribution: 2-2-2-4
        # Short (1-2 words) - 2 phrases
        phrases.append([eng, zh])
        if '买' in zh or '找' in zh or '看' in zh:
            phrases.append([f"I {eng}", f"我{zh}"])
        elif '商店' in zh or '酒店' in zh:
            clf = self.get_classifier(zh)
            phrases.append([f"a {eng}", f"一{clf}{zh}"])
        elif '朋友' in zh or '人' in zh:
            phrases.append([f"our {eng}", f"我们的{zh}"])
        else:
            phrases.append([f"the {eng}", f"这个{zh}"])

        # Medium (3 words) - 2 phrases
        if '买' in zh:
            phrases.append([f"I want {eng}", f"我想{zh}"])
            phrases.append([f"I can {eng}", f"我可以{zh}"])
        elif '找' in zh:
            phrases.append([f"want to {eng}", f"想{zh}"])
            phrases.append([f"I {eng} it", f"我{zh}它"])
        elif '商店' in zh or '酒店' in zh:
            phrases.append([f"find a {eng}", f"找到一{self.get_classifier(zh)}{zh}"])
            phrases.append([f"near the {eng}", f"在{zh}附近"])
        else:
            phrases.append([f"this {eng}", f"这个{zh}"])
            phrases.append([f"my {eng}", f"我的{zh}"])

        # Longer (4-5 words) - 2 phrases
        if '买' in zh:
            phrases.append([f"I can {eng} this", f"我可以{zh}这个"])
            phrases.append([f"do you like to {eng}", f"你喜欢{zh}吗"])
        elif '找' in zh:
            phrases.append([f"I want to {eng} one", f"我想{zh}一个"])
            phrases.append([f"we tried to {eng}", f"我们试图{zh}"])
        else:
            phrases.append([f"I want to find {eng}", f"我想找到{zh}"])
            phrases.append([f"they saw the {eng}", f"他们看到{zh}"])

        # Longest (6+ words) - 4 phrases
        phrases.append([f"I like this {eng} very much", f"我非常喜欢这个{zh}"])
        phrases.append([f"can I {eng} at this place please", f"我可以在这个地方{zh}吗"])
        phrases.append([f"we all want to {eng} today", f"我们都想今天{zh}"])
        phrases.append([f"they said they could {eng} there", f"他们说他们可以在那里{zh}"])

        return phrases[:10]

    def _generate_molecular_phrases(self, eng: str, zh: str, vocab: set) -> List[List]:
        """Generate phrases for molecular (multi-word) LEGOs"""
        phrases = []

        # Short (1-2 words) - 2 phrases
        phrases.append([eng, zh])
        phrases.append([eng, zh])

        # Medium (3 words) - 2 phrases
        phrases.append([f"I {eng}", f"我{zh}"])
        if '买' in zh or '找' in zh:
            phrases.append([f"you {eng}", f"你{zh}"])
        else:
            phrases.append([f"can {eng}", f"可以{zh}"])

        # Longer (4-5 words) - 2 phrases
        if '可以' in zh or '能够' in zh:
            phrases.append([f"I {eng} this", f"我{zh}这个"])
            phrases.append([f"they {eng} there", f"他们{zh}那里"])
        else:
            phrases.append([f"I really {eng} now", f"我现在确实{zh}"])
            phrases.append([f"they {eng} yesterday", f"他们昨天{zh}"])

        # Longest (6+ words) - 4 phrases
        phrases.append([f"I {eng} every single day", f"我每天都{zh}"])
        phrases.append([f"because they {eng} together", f"因为他们一起{zh}"])
        phrases.append([f"I like to {eng} with friends", f"我喜欢和朋友{zh}"])
        phrases.append([f"they {eng} at the place yesterday", f"他们昨天在那个地方{zh}"])

        return phrases[:10]


class Phase5Generator:
    """Main generator for Phase 5 content"""

    def __init__(self):
        self.base_path = Path("/home/user/ssi-dashboard-v7/public/vfs/courses/cmn_for_eng")
        self.scaffolds_dir = self.base_path / "phase5_scaffolds"
        self.output_dir = self.base_path / "phase5_outputs"
        self.output_dir.mkdir(parents=True, exist_ok=True)
        self.generator = MandarinPhrasesGenerator()

    def process_seed(self, seed_num: int) -> bool:
        """Process a single seed and generate phrases"""
        seed_file = f"seed_s{seed_num:04d}.json"
        scaffold_path = self.scaffolds_dir / seed_file

        if not scaffold_path.exists():
            print(f"[SKIP] {seed_file} - not found")
            return False

        try:
            with open(scaffold_path, 'r', encoding='utf-8') as f:
                scaffold = json.load(f)

            seed_id = scaffold['seed_id']
            seed_en = scaffold['seed_pair']['target']
            seed_zh = scaffold['seed_pair']['known']

            print(f"  Processing {seed_id}...", end=" ", flush=True)

            legos = scaffold.get('legos', {})
            recent_context = scaffold.get('recent_context', {})
            lego_ids = sorted(legos.keys())

            processed = 0
            for lego_id in lego_ids:
                lego_data = legos[lego_id]
                lego_en, lego_zh = lego_data['lego']
                lego_type = lego_data.get('type', 'M')
                is_final = lego_data.get('is_final_lego', False)
                earlier_legos = lego_data.get('current_seed_earlier_legos', [])

                # Generate phrases
                phrases = self.generator.generate_practice_phrases(
                    lego_en, lego_zh, lego_type, is_final,
                    seed_en, seed_zh, earlier_legos, recent_context
                )

                if phrases and len(phrases) == 10:
                    lego_data['practice_phrases'] = phrases

                    # Calculate distribution
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

            # Update generation stage
            scaffold['generation_stage'] = 'PHRASE_GENERATION_COMPLETE'

            # Save output
            output_path = self.output_dir / seed_file
            with open(output_path, 'w', encoding='utf-8') as f:
                json.dump(scaffold, f, ensure_ascii=False, indent=2)

            print(f"✅ ({processed}/{len(lego_ids)} LEGOs)")
            return True

        except Exception as e:
            print(f"❌ Error: {str(e)}")
            import traceback
            traceback.print_exc()
            return False

    def generate_all(self, start: int, end: int):
        """Generate for all seeds in range"""
        print("\n" + "="*70)
        print("Phase 5 Content Generator")
        print("Course: cmn_for_eng (Mandarin Chinese for English Speakers)")
        print(f"Seeds: S{start:04d} - S{end:04d}")
        print("="*70 + "\n")

        success_count = 0
        failed_seeds = []

        for seed_num in range(start, end + 1):
            if self.process_seed(seed_num):
                success_count += 1
            else:
                failed_seeds.append(f"S{seed_num:04d}")

        print("\n" + "="*70)
        print("✅ Generation Complete")
        print(f"  Seeds processed: {success_count}/{end-start+1}")
        if failed_seeds:
            print(f"  Failed: {', '.join(failed_seeds)}")
        print(f"  Output directory: {self.output_dir}")
        print("="*70 + "\n")

        return success_count == (end - start + 1)


def main():
    generator = Phase5Generator()
    generator.generate_all(101, 110)


if __name__ == '__main__':
    main()
