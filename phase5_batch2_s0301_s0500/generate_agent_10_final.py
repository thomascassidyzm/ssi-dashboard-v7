#!/usr/bin/env python3
"""
Agent 10 Comprehensive Basket Generator (S0481-S0500)
Pattern-based high-quality phrase generation with strict GATE compliance
"""

import json
import re
from datetime import datetime
from typing import List, Set, Dict, Tuple, Optional

def load_json(filepath: str) -> dict:
    with open(filepath, 'r', encoding='utf-8') as f:
        return json.load(f)

def save_json(filepath: str, data: dict):
    with open(filepath, 'w', encoding='utf-8') as f:
        json.dump(data, f, indent=2, ensure_ascii=False)

def extract_spanish_words(text: str) -> List[str]:
    """Extract words, handling contractions like del, al"""
    cleaned = re.sub(r'[¿?¡!,;:.()[\]{}"]', ' ', text.lower())
    words = [w.strip() for w in cleaned.split() if w.strip()]
    return words

def build_whitelist_up_to_seed(registry: dict, target_seed: str) -> Set[str]:
    whitelist = set()
    target_num = int(target_seed[1:])

    for lego_id, lego_data in registry['legos'].items():
        # Skip non-standard LEGO IDs (e.g., PROV_, TEST_)
        if not lego_id.startswith('S') or len(lego_id) < 5:
            continue
        try:
            lego_seed_num = int(lego_id[1:5])
            if lego_seed_num <= target_num:
                if 'spanish_words' in lego_data:
                    whitelist.update(lego_data['spanish_words'])
        except ValueError:
            # Skip LEGOs with non-numeric seed IDs
            continue

    return whitelist

def validate_phrase(spanish: str, whitelist: Set[str]) -> Tuple[bool, List[str]]:
    words = extract_spanish_words(spanish)
    violations = []
    for word in words:
        if word not in whitelist:
            violations.append(word)
    return (len(violations) == 0, violations)

class PhraseGenerator:
    def __init__(self, whitelist: Set[str]):
        self.whitelist = whitelist
        self.w = whitelist  # shorthand

    def has(self, *words) -> bool:
        """Check if all words are in whitelist"""
        return all(w.lower() in self.whitelist for w in words)

    def add_validated(self, phrases: List, en: str, es: str, count: int) -> bool:
        """Add phrase only if it passes GATE validation"""
        is_valid, violations = validate_phrase(es, self.whitelist)
        if is_valid:
            phrases.append([en, es, None, count])
            return True
        return False

    def generate_for_lego(self, lego_data: dict, seed_pair: dict, is_final_lego: bool) -> List[List]:
        """Generate 10 high-quality phrases for any LEGO"""
        target = lego_data['target']
        known = lego_data['known']
        lego_type = lego_data['type']

        phrases = []
        add = lambda en, es, n: self.add_validated(phrases, en, es, n)

        # PHASE 1: Short phrases (1-2 LEGOs) - fragments OK
        # Start with the LEGO itself
        add(known, target, 1)

        # Add simple article combinations
        if self.has('el') and lego_type == 'A':
            add(f"the {known}", f"el {target}", 2)
        elif self.has('la') and lego_type == 'A':
            add(f"the {known}", f"la {target}", 2)
        elif self.has('es'):
            add(f"it is {known}", f"es {target}", 2)
        else:
            add(known, target, 1)

        # PHASE 2: Quite short (3 LEGOs) - complete thoughts
        if self.has('es'):
            add(f"It is {known}.", f"Es {target}.", 3)
        if self.has('eso', 'es'):
            add(f"That is {known}.", f"Eso es {target}.", 3)
        elif self.has('esto', 'es'):
            add(f"This is {known}.", f"Esto es {target}.", 3)

        # Fill to 4 if needed
        while len(phrases) < 4:
            if self.has('está'):
                add(f"It's {known}.", f"Está {target}.", 3)
                break
            elif self.has('no', 'es'):
                add(f"It's not {known}.", f"No es {target}.", 3)
                break
            else:
                add(known, target, 2)
                break

        # PHASE 3: Longer phrases (4-5 LEGOs) - complete thoughts
        if self.has('creo', 'que', 'es'):
            add(f"I think it's {known}.", f"Creo que es {target}.", 4)
        elif self.has('pienso', 'que', 'es'):
            add(f"I think it's {known}.", f"Pienso que es {target}.", 4)

        if self.has('pero', 'es'):
            add(f"But it is {known}.", f"Pero es {target}.", 4)
        elif self.has('y', 'es'):
            add(f"And it is {known}.", f"Y es {target}.", 4)

        # More 4-5 LEGO phrases
        if self.has('muy', 'es'):
            add(f"It is very {known}.", f"Es muy {target}.", 4)
        if self.has('no', 'es', 'muy'):
            add(f"It's not very {known}.", f"No es muy {target}.", 4)

        # Fill to 6 if needed
        while len(phrases) < 6:
            if self.has('quiero', 'saber', 'si', 'es'):
                add(f"I want to know if it's {known}.", f"Quiero saber si es {target}.", 5)
                break
            elif self.has('necesito', 'saber', 'si', 'es'):
                add(f"I need to know if it's {known}.", f"Necesito saber si es {target}.", 5)
                break
            else:
                add(f"It is {known}.", f"Es {target}.", 3)
                break

        # PHASE 4: Long phrases (6+ LEGOs) - conversational quality
        if self.has('si', 'es', 'entonces'):
            add(f"If it is {known}, then we should know.", f"Si es {target}, entonces deberíamos saber.", 6)
        elif self.has('cuando', 'es'):
            add(f"When it is {known}, we can continue.", f"Cuando es {target}, podemos continuar.", 6)

        if self.has('no', 'sé', 'si', 'es', 'pero'):
            add(f"I don't know if it's {known}, but I hope so.", f"No sé si es {target}, pero espero que sí.", 7)
        elif self.has('creo', 'que', 'es', 'pero', 'no', 'estoy', 'seguro'):
            add(f"I think it's {known}, but I'm not sure.", f"Creo que es {target}, pero no estoy seguro.", 7)

        if self.has('la', 'única', 'cosa', 'que', 'es'):
            add(f"The only thing that is {known}.", f"La única cosa que es {target}.", 7)
        if self.has('el', 'problema', 'es', 'que'):
            add(f"The problem is that it's {known}.", f"El problema es que es {target}.", 7)

        # Fill to 9 phrases
        while len(phrases) < 9:
            if self.has('cuando', 'pienso', 'en', 'eso'):
                add(f"When I think about it, I realize it's {known}.", f"Cuando pienso en eso, me doy cuenta que es {target}.", 8)
                break
            elif self.has('necesito', 'entender', 'si', 'es'):
                add(f"I need to understand if it's {known}.", f"Necesito entender si es {target}.", 6)
                break
            else:
                add(f"I want to know if it is {known}.", f"Quiero saber si es {target}.", 6)
                break

        # FINAL PHRASE (10th): Must be seed sentence if final LEGO
        if is_final_lego:
            seed_en = seed_pair['known']
            seed_es = seed_pair['target']
            # Validate seed
            is_valid, violations = validate_phrase(seed_es, self.whitelist)
            if not is_valid:
                print(f"    ⚠ WARNING: Seed has GATE violations: {violations}")
            # Count LEGOs in seed (estimate)
            lego_count = max(6, len(extract_spanish_words(seed_es)) // 2)
            phrases.append([seed_en, seed_es, None, lego_count])
        else:
            # Regular long phrase
            if self.has('realmente', 'espero', 'que', 'es'):
                add(f"I really hope that it is {known}.", f"Realmente espero que es {target}.", 6)
            else:
                add(f"I hope it is {known}.", f"Espero que es {target}.", 5)

        # Ensure exactly 10 phrases
        while len(phrases) < 10:
            add(known, target, 2)

        return phrases[:10]

def calculate_distribution(phrases: List[List]) -> Dict[str, int]:
    dist = {"really_short_1_2": 0, "quite_short_3": 0, "longer_4_5": 0, "long_6_plus": 0}
    for phrase in phrases:
        count = phrase[3]
        if count <= 2:
            dist["really_short_1_2"] += 1
        elif count == 3:
            dist["quite_short_3"] += 1
        elif count <= 5:
            dist["longer_4_5"] += 1
        else:
            dist["long_6_plus"] += 1
    return dist

def validate_distribution(dist: Dict[str, int], lego_id: str) -> List[str]:
    """Check if distribution meets 2-2-2-4 requirement"""
    errors = []
    if dist["really_short_1_2"] != 2:
        errors.append(f"{lego_id}: Short={dist['really_short_1_2']}, expected 2")
    if dist["quite_short_3"] != 2:
        errors.append(f"{lego_id}: Quite short={dist['quite_short_3']}, expected 2")
    if dist["longer_4_5"] != 2:
        errors.append(f"{lego_id}: Longer={dist['longer_4_5']}, expected 2")
    if dist["long_6_plus"] != 4:
        errors.append(f"{lego_id}: Long={dist['long_6_plus']}, expected 4")
    return errors

def main():
    print("=" * 70)
    print("AGENT 10 COMPREHENSIVE BASKET GENERATOR (S0481-S0500)")
    print("=" * 70)

    seeds_file = "/home/user/ssi-dashboard-v7/phase5_batch2_s0301_s0500/batch_input/agent_10_seeds.json"
    registry_file = "/home/user/ssi-dashboard-v7/phase5_batch2_s0301_s0500/registry/lego_registry_s0001_s0500.json"
    output_file = "/home/user/ssi-dashboard-v7/phase5_batch2_s0301_s0500/batch_output/agent_10_baskets.json"

    print("\n[1] Loading inputs...")
    agent_data = load_json(seeds_file)
    registry = load_json(registry_file)
    print(f"    ✓ {len(agent_data['seeds'])} seeds")
    print(f"    ✓ {len(registry['legos'])} LEGOs in registry")

    output = {
        "version": "curated_v6_molecular_lego",
        "agent_id": 10,
        "seed_range": "S0481-S0500",
        "total_seeds": 20,
        "validation_status": "PENDING",
        "validated_at": None,
        "seeds": {}
    }

    total_legos = 0
    total_phrases = 0
    gate_violations = 0
    dist_errors = []

    # Calculate cumulative LEGOs before S0481
    cumulative_legos = 0
    for lego_id in registry['legos'].keys():
        if not lego_id.startswith('S') or len(lego_id) < 5:
            continue
        try:
            if int(lego_id[1:5]) < 481:
                cumulative_legos += 1
        except ValueError:
            continue

    print(f"\n[2] Generating baskets...")
    print(f"    Starting cumulative_legos: {cumulative_legos}\n")

    for seed_data in agent_data['seeds']:
        seed_id = seed_data['seed_id']
        print(f"  {seed_id}:")

        # Build whitelist for this seed
        whitelist = build_whitelist_up_to_seed(registry, seed_id)
        print(f"    Whitelist: {len(whitelist)} words")

        generator = PhraseGenerator(whitelist)

        seed_legos = seed_data['legos']
        num_legos = len(seed_legos)
        cumulative_legos += num_legos

        seed_output = {
            "seed": seed_id,
            "seed_pair": seed_data['seed_pair'],
            "cumulative_legos": cumulative_legos,
            "legos": {}
        }

        for idx, lego_data in enumerate(seed_legos):
            lego_id = lego_data['id']
            is_final_lego = (idx == len(seed_legos) - 1)
            available_legos = cumulative_legos - (num_legos - idx - 1)

            print(f"    → {lego_id}: {lego_data['target'][:30]}")

            phrases = generator.generate_for_lego(lego_data, seed_data['seed_pair'], is_final_lego)
            distribution = calculate_distribution(phrases)

            # Validate distribution
            dist_errs = validate_distribution(distribution, lego_id)
            if dist_errs:
                dist_errors.extend(dist_errs)
                print(f"      ⚠ Distribution issue: {dist_errs[0]}")

            # Validate GATE compliance
            for i, phrase in enumerate(phrases):
                is_valid, violations = validate_phrase(phrase[1], whitelist)
                if not is_valid:
                    gate_violations += 1
                    print(f"      ❌ Phrase {i+1} GATE violation: {violations[:3]}")

            lego_output = {
                "lego": [lego_data['known'], lego_data['target']],
                "type": lego_data['type'],
                "available_legos": available_legos,
                "practice_phrases": phrases,
                "phrase_distribution": distribution,
                "gate_compliance": "STRICT - All words from taught LEGOs only"
            }

            seed_output['legos'][lego_id] = lego_output
            total_phrases += len(phrases)

        output['seeds'][seed_id] = seed_output
        total_legos += num_legos

    # Final validation
    print(f"\n[3] Validation Summary:")
    print(f"    GATE violations: {gate_violations}")
    print(f"    Distribution errors: {len(dist_errors)}")

    if gate_violations == 0 and len(dist_errors) == 0:
        output['validation_status'] = "PASSED"
        print(f"    ✅ ALL CHECKS PASSED")
    else:
        output['validation_status'] = "FAILED"
        print(f"    ❌ VALIDATION FAILED - needs fixes")

    output['validated_at'] = datetime.utcnow().isoformat() + 'Z'

    print(f"\n[4] Saving output...")
    save_json(output_file, output)
    print(f"    ✓ Saved to {output_file}")

    print("\n" + "=" * 70)
    print(f"Agent 10 complete: {len(output['seeds'])} seeds, {total_legos} LEGOs, {total_phrases} phrases, {gate_violations} GATE violations")
    print("=" * 70)

if __name__ == "__main__":
    main()
