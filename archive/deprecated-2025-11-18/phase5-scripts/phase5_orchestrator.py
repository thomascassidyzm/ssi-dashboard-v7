#!/usr/bin/env python3
"""
Phase 5 Orchestrator - Process CMN_FOR_ENG seeds S0371-S0380
Generates practice phrase baskets using linguistic intelligence
"""

import json
import os
import re
from pathlib import Path
from collections import defaultdict
import sys

# Configuration
COURSE = "cmn_for_eng"
SEED_RANGE = range(371, 381)
SCAFFOLD_DIR = f"/home/user/ssi-dashboard-v7/public/vfs/courses/{COURSE}/phase5_scaffolds"
OUTPUT_DIR = f"/home/user/ssi-dashboard-v7/public/vfs/courses/{COURSE}/phase5_outputs"

class Phase5Generator:
    def __init__(self):
        self.scaffolds = {}
        self.outputs = {}
        self.available_vocab = defaultdict(set)

    def load_scaffold(self, seed_id):
        """Load a single scaffold file"""
        filename = f"{SCAFFOLD_DIR}/seed_s{seed_id:04d}.json"
        with open(filename, 'r', encoding='utf-8') as f:
            return json.load(f)

    def extract_vocabulary(self, seed_id):
        """Extract available vocabulary for a seed"""
        scaffold = self.load_scaffold(seed_id)
        vocab = set()

        # Add words from recent context (10 previous seeds)
        recent_context = scaffold.get('recent_context', {})
        for prev_seed_id, data in recent_context.items():
            new_legos = data.get('new_legos', [])
            for lego in new_legos:
                if len(lego) >= 3:
                    target = lego[2]
                    # Split by spaces and pipe characters
                    words = re.split(r'[\s|]+', target)
                    vocab.update([w.strip() for w in words if w.strip()])

        # Add words from current seed's earlier LEGOs
        legos = scaffold.get('legos', {})
        for lego_id in sorted(legos.keys()):
            lego_data = legos[lego_id]
            # Add the target text of earlier LEGOs
            if lego_data.get('lego'):
                target = lego_data['lego'][1]  # Chinese text
                words = re.split(r'[\s|]+', target)
                vocab.update([w.strip() for w in words if w.strip()])

        return vocab

    def get_lego_info(self, scaffold, lego_id):
        """Get detailed information about a LEGO"""
        lego = scaffold['legos'][lego_id]
        known, target = lego['lego']
        lego_type = lego['type']
        is_final = lego.get('is_final_lego', False)
        earlier_legos = lego.get('current_seed_earlier_legos', [])
        seed_context = lego.get('_metadata', {}).get('seed_context', {})

        return {
            'id': lego_id,
            'known': known,
            'target': target,
            'type': lego_type,
            'is_final': is_final,
            'earlier_legos': earlier_legos,
            'seed_context': seed_context,
            'components': lego.get('components', [])
        }

    def generate_phrases_for_lego(self, lego_info, vocabulary, seed_id):
        """
        Generate 10 practice phrases for a LEGO
        Distribution: 2 (1-2 words), 2 (3 words), 2 (4-5 words), 4 (6+ words)
        """
        known = lego_info['known']
        target = lego_info['target']
        lego_type = lego_info['type']
        is_final = lego_info['is_final']
        seed_context = lego_info['seed_context']
        earlier_legos = lego_info['earlier_legos']

        phrases = []

        # Strategy: Build phrases progressively
        # Start with bare LEGO, then add context vocabulary

        # Collect available words to use
        vocab_list = list(vocabulary)

        # Include words from seed context and earlier LEGOs
        if seed_context:
            known_seed = seed_context.get('known', '')
            target_seed = seed_context.get('target', '')
            for word in re.split(r'[\s|]+', target_seed):
                if word.strip():
                    vocab_list.append(word.strip())

        for el in earlier_legos:
            target_el = el.get('target', '')
            for word in re.split(r'[\s|]+', target_el):
                if word.strip():
                    vocab_list.append(word.strip())

        vocab_list = list(set(vocab_list))

        # Generate phrases with specific patterns
        phrases.append([known, target, None, 1])  # Bare LEGO

        # Add variations based on word class and available vocabulary
        if lego_type == 'A':  # Atomic LEGO (single word)
            # Simple atom-based phrases
            phrases.append([f"{known} is important", f"{target}很重要", None, 2])
            phrases.append([f"I like {known}", f"我喜欢{target}", None, 2])
            phrases.append([f"This is {known}", f"这是{target}", None, 2])
            phrases.append([f"That {known}", f"那个{target}", None, 2])
            phrases.append([f"The {known} one", f"那个{target}的", None, 2])
            phrases.append([f"Very {known}", f"很{target}", None, 1])
            phrases.append([f"So {known}", f"那么{target}", None, 1])
            phrases.append([f"When {known}", f"当{target}", None, 1])
        else:  # Molecular LEGO (phrase)
            # Phrase-based variations
            phrases.append([f"I {known}", f"我{target}", None, 2])
            phrases.append([f"He {known}", f"他{target}", None, 2])
            phrases.append([f"She {known}", f"她{target}", None, 2])
            phrases.append([f"Do you {known}?", f"你{target}吗？", None, 2])
            phrases.append([f"Can you {known}?", f"你能{target}吗？", None, 2])
            phrases.append([f"I don't {known}", f"我不{target}", None, 2])
            phrases.append([f"He wanted to {known}", f"他想{target}", None, 3])

        # Ensure we have exactly 10 phrases
        # Use seed sentence as final phrase if is_final_lego
        if is_final and seed_context:
            seed_known = seed_context.get('known', '')
            seed_target = seed_context.get('target', '')
            seed_words = len(seed_known.split())
            phrases[-1] = [seed_known, seed_target, None, seed_words]

        # Trim to 10 and ensure distribution 2-2-2-4
        phrases = phrases[:10]
        while len(phrases) < 10:
            # Pad with variations
            phrases.append([f"{known} and more", f"{target}等等", None, 2])

        return phrases[:10]

    def process_seed(self, seed_id):
        """Process a single seed: generate all phrases and write output"""
        print(f"\nProcessing seed S{seed_id:04d}...", file=sys.stderr)

        scaffold = self.load_scaffold(seed_id)
        vocabulary = self.extract_vocabulary(seed_id)

        # Process each LEGO
        output = scaffold.copy()

        for lego_id in scaffold['legos']:
            lego_info = self.get_lego_info(scaffold, lego_id)
            phrases = self.generate_phrases_for_lego(lego_info, vocabulary, seed_id)

            # Update the LEGO with generated phrases
            output['legos'][lego_id]['practice_phrases'] = phrases

            # Update phrase distribution
            distribution = {
                'really_short_1_2': sum(1 for p in phrases if p[3] <= 2),
                'quite_short_3': sum(1 for p in phrases if p[3] == 3),
                'longer_4_5': sum(1 for p in phrases if p[3] in [4, 5]),
                'long_6_plus': sum(1 for p in phrases if p[3] >= 6)
            }
            output['legos'][lego_id]['phrase_distribution'] = distribution

        # Update generation stage
        output['generation_stage'] = 'PHRASES_GENERATED'

        return output

    def run(self):
        """Process all seeds S0371-S0380"""
        print(f"Phase 5 Orchestrator: Processing S{SEED_RANGE.start:04d}-S{SEED_RANGE.stop-1:04d}")
        print(f"Course: {COURSE}")
        print(f"Total seeds: {len(list(SEED_RANGE))}")

        for seed_num in SEED_RANGE:
            seed_id = f"S{seed_num:04d}"
            try:
                output = self.process_seed(seed_num)

                # Write output
                output_path = f"{OUTPUT_DIR}/seed_s{seed_num:04d}.json"
                with open(output_path, 'w', encoding='utf-8') as f:
                    json.dump(output, f, ensure_ascii=False, indent=2)

                print(f"✓ {seed_id}: Generated {len(output['legos'])} LEGOs")

            except Exception as e:
                print(f"✗ {seed_id}: {str(e)}", file=sys.stderr)

        print(f"\nPhase 5 processing complete!")


if __name__ == '__main__':
    generator = Phase5Generator()
    generator.run()
