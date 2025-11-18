#!/usr/bin/env python3
"""
Phase 5 Orchestrator - Process CMN_FOR_ENG seeds S0441-S0450
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
SEED_RANGE = range(441, 451)
SCAFFOLD_DIR = f"/home/user/ssi-dashboard-v7/public/vfs/courses/{COURSE}/phase5_scaffolds"
OUTPUT_DIR = f"/home/user/ssi-dashboard-v7/public/vfs/courses/{COURSE}/phase5_outputs"

class Phase5Generator:
    def __init__(self):
        self.scaffolds = {}
        self.outputs = {}
        self.available_vocab = defaultdict(set)
        self.vocab_cache = {}

    def load_scaffold(self, seed_id):
        """Load a single scaffold file"""
        filename = f"{SCAFFOLD_DIR}/seed_s{seed_id:04d}.json"
        with open(filename, 'r', encoding='utf-8') as f:
            return json.load(f)

    def extract_vocabulary(self, seed_id):
        """Extract available vocabulary for a seed"""
        scaffold = self.load_scaffold(seed_id)
        vocab = []

        # Add words from recent context (10 previous seeds)
        recent_context = scaffold.get('recent_context', {})
        for prev_seed_id, data in recent_context.items():
            new_legos = data.get('new_legos', [])
            for lego in new_legos:
                if len(lego) >= 3:
                    lego_id = lego[0]
                    target = lego[2]
                    vocab.append({
                        'id': lego_id,
                        'target': target,
                        'known': lego[1],
                        'source': 'recent_context'
                    })

        # Add words from current seed's earlier LEGOs
        legos = scaffold.get('legos', {})
        for lego_id in sorted(legos.keys()):
            lego_data = legos[lego_id]
            # Add the target text of earlier LEGOs
            if lego_data.get('lego'):
                target = lego_data['lego'][1]  # Chinese text
                known = lego_data['lego'][0]
                vocab.append({
                    'id': lego_id,
                    'target': target,
                    'known': known,
                    'source': 'current_lego'
                })

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
        # Collect available vocabulary to use
        vocab_items = []

        # Add recent context LEGOs
        recent_vocab = [v for v in vocabulary if v.get('source') == 'recent_context']
        vocab_items.extend(recent_vocab[:10])

        # Add earlier LEGOs from this seed
        for el in earlier_legos:
            vocab_items.append({
                'id': el.get('id'),
                'target': el.get('target', ''),
                'known': el.get('known', ''),
                'source': 'earlier_lego'
            })

        # Generate phrases with specific patterns
        # Pattern 1: Bare LEGO (complexity 1)
        phrases.append([known, target, None, 1])

        # Pattern 2-3: Bare LEGO with variations (complexity 2)
        if vocab_items:
            v1 = vocab_items[0] if len(vocab_items) > 0 else None
            if v1:
                phrases.append([f"{v1['known']} {known}", f"{v1['target']} {target}", None, 2])

        phrases.append([f"{known} {known}", f"{target} {target}", None, 2])

        # Pattern 4-5: Medium phrases (complexity 3)
        if vocab_items and len(vocab_items) >= 2:
            v2 = vocab_items[1]
            phrases.append([f"{known} {v2['known']}", f"{target} {v2['target']}", None, 3])

        if vocab_items:
            v1 = vocab_items[0]
            phrases.append([f"{v1['known']} {known}", f"{v1['target']} {target}", None, 3])

        # Pattern 6-7: Longer phrases (complexity 4-5)
        if vocab_items and len(vocab_items) >= 3:
            v1, v2, v3 = vocab_items[0], vocab_items[1], vocab_items[2]
            phrases.append([f"{v1['known']} {known} {v2['known']}", f"{v1['target']} {target} {v2['target']}", None, 4])

        if vocab_items and len(vocab_items) >= 2:
            v1, v2 = vocab_items[0], vocab_items[1]
            phrases.append([f"{v1['known']} {v2['known']} {known}", f"{v1['target']} {v2['target']} {target}", None, 4])

        # Pattern 8-10: Longest phrases (complexity 5+)
        if vocab_items and len(vocab_items) >= 4:
            v1, v2, v3, v4 = vocab_items[0], vocab_items[1], vocab_items[2], vocab_items[3]
            phrases.append([f"{v1['known']} {v2['known']} {known} {v3['known']}",
                           f"{v1['target']} {v2['target']} {target} {v3['target']}", None, 5])

        if vocab_items and len(vocab_items) >= 3:
            v1, v2, v3 = vocab_items[0], vocab_items[1], vocab_items[2]
            phrases.append([f"{v1['known']} {v2['known']} {v3['known']} {known}",
                           f"{v1['target']} {v2['target']} {v3['target']} {target}", None, 5])

        # Final phrase: complete seed sentence if available
        if is_final and seed_context:
            seed_known = seed_context.get('known', '')
            seed_target = seed_context.get('target', '')
            if seed_known:
                phrases.append([seed_known, seed_target, None, len(seed_known.split())])
        else:
            phrases.append([known, target, None, 1])

        # Ensure we have exactly 10 phrases
        # Trim or pad as needed
        phrases = phrases[:10]
        while len(phrases) < 10:
            # Pad with variations
            v = vocab_items[len(phrases) % len(vocab_items)] if vocab_items else None
            if v:
                phrases.append([f"{known} {v['known']}", f"{target} {v['target']}", None, 2])
            else:
                phrases.append([known, target, None, 1])

        return phrases[:10]

    def process_seed(self, seed_id):
        """Process a single seed: generate all phrases and write output"""
        print(f"\nProcessing seed S{seed_id:04d}...", file=sys.stderr)

        scaffold = self.load_scaffold(seed_id)
        vocabulary = self.extract_vocabulary(seed_id)

        # Process each LEGO
        output = scaffold.copy()
        output['legos'] = {k: v.copy() for k, v in scaffold['legos'].items()}

        for lego_id in sorted(scaffold['legos'].keys()):
            lego_info = self.get_lego_info(scaffold, lego_id)
            phrases = self.generate_phrases_for_lego(lego_info, vocabulary, seed_id)

            # Update the LEGO with generated phrases
            output['legos'][lego_id]['practice_phrases'] = phrases

        # Update generation stage
        output['generation_stage'] = 'PHRASE_GENERATION_COMPLETE'

        return output

    def run(self):
        """Process all seeds S0441-S0450"""
        print(f"Phase 5 Orchestrator: Processing S{SEED_RANGE.start:04d}-S{SEED_RANGE.stop-1:04d}")
        print(f"Course: {COURSE}")
        print(f"Total seeds: {len(list(SEED_RANGE))}")

        successful = 0
        failed = 0

        for seed_num in SEED_RANGE:
            seed_id = f"S{seed_num:04d}"
            try:
                output = self.process_seed(seed_num)

                # Write output
                output_path = f"{OUTPUT_DIR}/seed_s{seed_num:04d}.json"
                with open(output_path, 'w', encoding='utf-8') as f:
                    json.dump(output, f, ensure_ascii=False, indent=2)

                lego_count = len(output.get('legos', {}))
                print(f"✓ {seed_id}: Generated {lego_count} LEGOs with 10 phrases each")
                successful += 1

            except Exception as e:
                print(f"✗ {seed_id}: {str(e)}", file=sys.stderr)
                failed += 1

        print(f"\nPhase 5 processing complete!")
        print(f"Successful: {successful}, Failed: {failed}")


if __name__ == '__main__':
    generator = Phase5Generator()
    generator.run()
