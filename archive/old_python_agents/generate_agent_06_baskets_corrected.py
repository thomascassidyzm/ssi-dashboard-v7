#!/usr/bin/env python3
"""
Generate GATE-COMPLIANT practice phrase baskets for Agent 06 (Seeds S0151-S0160)
This version validates EVERY phrase before including it in the output
"""

import json
import re
from datetime import datetime
from typing import List, Dict, Set, Tuple

class StrictBasketGenerator:
    def __init__(self, registry_path: str, seeds_path: str):
        """Initialize with registry and seeds data"""
        with open(registry_path, 'r', encoding='utf-8') as f:
            self.registry = json.load(f)

        with open(seeds_path, 'r', encoding='utf-8') as f:
            self.seeds_data = json.load(f)

        self.seeds = self.seeds_data['seeds']

        # Build full registry lookup
        self.lego_lookup = self.registry['legos']

    def get_whitelist_for_lego(self, current_seed_id: str, current_lego_id: str, lego_position_in_seed: int) -> Set[str]:
        """Build whitelist of all Spanish words taught up to and INCLUDING current position in seed"""
        whitelist = set()

        # Parse CURRENT seed number (where this LEGO is being used)
        seed_match = re.match(r'S(\d+)', current_seed_id)
        if not seed_match:
            return whitelist

        current_seed_num = int(seed_match.group(1))

        # Add words from ALL LEGOs in earlier seeds
        for lego_id, lego_data in self.lego_lookup.items():
            lego_match = re.match(r'S(\d+)L(\d+)', lego_id)
            if not lego_match:
                continue

            seed_num = int(lego_match.group(1))

            # Include all words from earlier seeds
            if seed_num < current_seed_num:
                whitelist.update(lego_data['spanish_words'])

        # Add words from LEGOs in CURRENT seed up to and including current position
        # We need to look at the seed's LEGO list order, not the LEGO ID
        current_seed_data = None
        for seed in self.seeds:
            if seed['seed_id'] == current_seed_id:
                current_seed_data = seed
                break

        if current_seed_data:
            for idx, lego in enumerate(current_seed_data['legos']):
                if idx <= lego_position_in_seed:
                    # Get this LEGO's words from registry
                    lego_id = lego['id']
                    if lego_id in self.lego_lookup:
                        whitelist.update(self.lego_lookup[lego_id]['spanish_words'])

        return whitelist

    def tokenize_spanish(self, text: str) -> List[str]:
        """Tokenize Spanish text"""
        cleaned = re.sub(r'[¿?¡!.,;:]', '', text)
        return [w.lower() for w in cleaned.strip().split() if w]

    def is_gate_compliant(self, spanish: str, whitelist: Set[str]) -> bool:
        """Check if phrase is GATE compliant"""
        words = self.tokenize_spanish(spanish)
        for word in words:
            if word not in whitelist:
                return False
        return True

    def try_phrase(self, english: str, spanish: str, whitelist: Set[str], pattern=None, count=None) -> Tuple[bool, List]:
        """Try to add a phrase, return (success, phrase_array)"""
        if self.is_gate_compliant(spanish, whitelist):
            return True, [english, spanish, pattern, count]
        return False, None

    def generate_baskets(self) -> Dict:
        """Generate complete baskets output with strict GATE compliance"""
        output = {
            "version": "curated_v6_molecular_lego",
            "agent_id": 6,
            "agent_name": "agent_06",
            "seed_range": "S0151-S0160",
            "course_direction": "Spanish for English speakers",
            "mapping": "KNOWN (English) → TARGET (Spanish)",
            "curation_metadata": {
                "curated_at": datetime.utcnow().isoformat() + "Z",
                "curated_by": "Claude Code - Agent 06 Basket Generator (GATE-Compliant)",
                "specification": "phase_5_conversational_baskets_v3_ACTIVE.md",
                "gate_compliance": "STRICT - Every word validated against whitelist",
                "distribution_per_lego": "2 short (1-2), 2 quite short (3), 2 longer (4-5), 4 long (6+)"
            }
        }

        # Process each seed
        for seed in self.seeds:
            seed_id = seed['seed_id']
            seed_pair = seed['seed_pair']

            print(f"\nGenerating baskets for {seed_id}...")

            output[seed_id] = {
                "seed_pair": seed_pair,
                "cumulative_legos": seed['cumulative_legos']
            }

            # Generate for each LEGO
            for idx, lego in enumerate(seed['legos']):
                lego_id = lego['id']
                lego_target = lego['target']
                lego_known = lego['known']
                lego_type = lego['type']

                # Get whitelist (pass position in seed)
                whitelist = self.get_whitelist_for_lego(seed_id, lego_id, idx)

                print(f"  {lego_id} ({lego_target}): whitelist has {len(whitelist)} words")

                # Generate phrases
                phrases = self.generate_phrases_for_lego(
                    seed_id, lego_id, lego_target, lego_known, whitelist,
                    is_final_lego=(idx == len(seed['legos']) - 1),
                    seed_pair=seed_pair
                )

                if len(phrases) < 10:
                    print(f"    ⚠️  Only generated {len(phrases)} phrases (target: 10)")

                # Calculate distribution
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

                # Add to output
                available_legos = seed['cumulative_legos'] - len(seed['legos']) + idx + 1

                output[seed_id][lego_id] = {
                    "lego": [lego_known, lego_target],
                    "type": lego_type,
                    "available_legos": available_legos,
                    "practice_phrases": phrases,
                    "phrase_distribution": dist,
                    "gate_compliance": "STRICT - All words validated against whitelist"
                }

                print(f"    ✓ {len(phrases)} GATE-compliant phrases generated")

        return output

    def generate_phrases_for_lego(self, seed_id, lego_id, target, known, whitelist, is_final_lego=False, seed_pair=None):
        """Generate phrases for a specific LEGO using only whitelisted words"""
        phrases = []

        # Helper function to try adding a phrase
        def add(english, spanish, pattern=None, est_count=None):
            if est_count is None:
                est_count = len(self.tokenize_spanish(spanish))
            success, phrase = self.try_phrase(english, spanish, whitelist, pattern, est_count)
            if success:
                phrases.append(phrase)
                return True
            return False

        # Generate based on specific LEGO
        if lego_id == "S0151L01":  # estaba esperando (I was hoping)
            add(known, target, None, 2)
            add("I was hoping to speak", "estaba esperando hablar", None, 3)
            add("I was hoping to learn", "estaba esperando aprender", None, 3)
            add("I was hoping to speak Spanish", "estaba esperando hablar español", None, 4)
            add("I was hoping to learn Spanish", "estaba esperando aprender español", None, 4)
            add("I was hoping to speak with you", "estaba esperando hablar contigo", None, 4)
            add("I was hoping to be able to speak Spanish", "estaba esperando poder hablar español", None, 6)
            add("I was hoping to speak Spanish with you", "estaba esperando hablar español contigo", None, 5)
            add("That was what I was hoping", "Eso era lo que estaba esperando", None, 6)
            add("I was hoping to learn how to speak Spanish", "estaba esperando aprender cómo hablar español", None, 6)

        elif lego_id == "S0151L02":  # que pasara (would happen)
            add(known, target, None, 2)
            add("what would happen", "lo que pasara", None, 3)
            add("I was hoping that would happen", "estaba esperando que pasara", None, 3)
            add("That was what would happen", "Eso era lo que pasara", None, 4)
            add("I was hoping something would happen", "estaba esperando que algo pasara", None, 4)
            add("That wasn't what I was hoping would happen", "Eso no era lo que estaba esperando que pasara", None, 8)
            add("I was hoping that would happen tomorrow", "estaba esperando que pasara mañana", None, 4)
            add("That was what I wanted would happen", "Eso era lo que quería que pasara", None, 6)
            add("I was hoping what you wanted would happen", "estaba esperando que pasara lo que querías", None, 6)
            # Full seed sentence (required for final LEGO)
            add(seed_pair['known'], seed_pair['target'], None, 8)

        elif lego_id == "S0152L01":  # lo habría hecho (I would have done it)
            add(known, target, None, 3)
            add("I would have done something", "habría hecho algo", None, 3)
            add("That was what I would have done", "Eso era lo que habría hecho", None, 5)
            add("I would have done it tomorrow", "lo habría hecho mañana", None, 4)
            add("I would have done it with you", "lo habría hecho contigo", None, 4)
            add("I was hoping I would have done it", "estaba esperando que lo habría hecho", None, 6)
            add("That wasn't what I would have done", "Eso no era lo que habría hecho", None, 6)
            add("I would have done what you wanted", "habría hecho lo que querías", None, 5)
            add("I would have done it if I could", "lo habría hecho si pudiera", None, 5)
            add("That was what I was hoping I would have done", "Eso era lo que estaba esperando que habría hecho", None, 9)

        elif lego_id == "S0152L02":  # diferentemente (differently)
            add(known, target, None, 1)
            add("I would have done it differently", "lo habría hecho diferentemente", None, 3)
            add("something different", "algo diferente", None, 2)
            add("I want to do something different", "quiero hacer algo diferente", None, 4)
            add("I was hoping to do something different", "estaba esperando hacer algo diferente", None, 5)
            add("That was what I wanted to do differently", "Eso era lo que quería hacer diferentemente", None, 7)
            add("I would have done something different", "habría hecho algo diferente", None, 4)
            add("I was hoping you would do something different", "estaba esperando que harías algo diferente", None, 6)
            add("I want to try something different", "quiero intentar algo diferente", None, 4)
            add("I would have tried something different", "habría intentado algo diferente", None, 4)

        elif lego_id == "S0152L03":  # hubiera sabido (I had known)
            add(known, target, None, 2)
            add("if I had known", "si hubiera sabido", None, 2)
            add("if I had known that", "si hubiera sabido eso", None, 3)
            add("if I had known what", "si hubiera sabido lo que", None, 4)
            add("I would have done it if I had known", "lo habría hecho si hubiera sabido", None, 5)
            add("if I had known what you wanted", "si hubiera sabido lo que querías", None, 5)
            add("I would have done something different if I had known", "habría hecho algo diferente si hubiera sabido", None, 7)
            add("if I had known what would happen", "si hubiera sabido lo que pasara", None, 6)
            add("I was hoping if I had known", "estaba esperando si hubiera sabido", None, 4)
            # Full seed
            add("I would have done it differently if I had known what you wanted.", "Lo habría hecho diferentemente si hubiera sabido lo que querías.", None, 9)

        elif lego_id == "S0153L01":  # lo habría dicho (I would have said it)
            add(known, target, None, 3)
            add("I wouldn't have said it", "no lo habría dicho", None, 3)
            add("I would have said something", "habría dicho algo", None, 3)
            add("That was what I would have said", "Eso era lo que habría dicho", None, 5)
            add("I would have said it tomorrow", "lo habría dicho mañana", None, 4)
            add("I would have said what you wanted", "habría dicho lo que querías", None, 5)
            add("I was hoping I would have said it", "estaba esperando que lo habría dicho", None, 6)
            add("That wasn't what I would have said", "Eso no era lo que habría dicho", None, 6)
            add("I would have said it if I had known", "lo habría dicho si hubiera sabido", None, 6)
            add("I wouldn't have said what you wanted", "no habría dicho lo que querías", None, 6)

        elif lego_id == "S0153L02":  # exactamente (exactly)
            add(known, target, None, 1)
            add("exactly what", "exactamente lo que", None, 2)
            add("That isn't exactly what", "Eso no es exactamente lo que", None, 4)
            add("exactly what I wanted", "exactamente lo que quería", None, 3)
            add("exactly what I was hoping", "exactamente lo que estaba esperando", None, 4)
            add("That isn't exactly what I wanted", "Eso no es exactamente lo que quería", None, 6)
            add("exactly what I would have said", "exactamente lo que habría dicho", None, 4)
            add("That wasn't exactly what I was hoping", "Eso no era exactamente lo que estaba esperando", None, 7)
            add("I want to know exactly what you want", "quiero saber exactamente lo que quieres", None, 6)
            add("That isn't exactly what would happen", "Eso no es exactamente lo que pasara", None, 6)

        elif lego_id == "S0153L03":  # de la misma manera (in the same way)
            add(known, target, None, 4)
            add("in exactly the same way", "exactamente de la misma manera", None, 4)
            add("I want to do it in the same way", "quiero hacer de la misma manera", None, 6)
            add("I was hoping in the same way", "estaba esperando de la misma manera", None, 5)
            add("I would have done it in the same way", "lo habría hecho de la misma manera", None, 7)
            add("I wouldn't have done it in the same way", "no lo habría hecho de la misma manera", None, 8)
            add("I would have said it in the same way", "lo habría dicho de la misma manera", None, 7)
            add("I wouldn't have said it in the same way", "no lo habría dicho de la misma manera", None, 8)
            add("That isn't exactly the same way", "Eso no es exactamente de la misma manera", None, 7)
            # Full seed
            add("I wouldn't have said it in exactly the same way.", "No lo habría dicho exactamente de la misma manera.", None, 7)

        elif lego_id == "S0154L01":  # dónde (where)
            add(known, target, None, 1)
            add("where you want", "dónde quieres", None, 2)
            add("where you want to go", "dónde quieres ir", None, 3)
            add("I'm not sure where", "no estoy seguro dónde", None, 3)
            add("where you want to speak", "dónde quieres hablar", None, 3)
            add("I'm not sure where you want", "no estoy seguro dónde quieres", None, 4)
            add("I want to know where you want to go", "quiero saber dónde quieres ir", None, 6)
            add("I'm trying to know where", "estoy intentando saber dónde", None, 4)
            add("I was hoping to know where you want", "estaba esperando saber dónde quieres", None, 6)
            add("That isn't where I want to go", "Eso no es dónde quiero ir", None, 6)

        elif lego_id == "S0154L02":  # encontrarte (to meet)
            add(known, target, None, 1)
            add("I want to meet", "quiero encontrarte", None, 2)
            add("where you want to meet", "dónde quieres encontrarte", None, 3)
            add("I want to be able to meet", "quiero poder encontrarte", None, 4)
            add("I was hoping to meet", "estaba esperando encontrarte", None, 3)
            add("I'm not sure where you want to meet", "no estoy seguro dónde quieres encontrarte", None, 6)
            add("I was hoping to be able to meet", "estaba esperando poder encontrarte", None, 5)
            add("I want to meet tomorrow", "quiero encontrarte mañana", None, 3)
            add("where you want to meet tomorrow", "dónde quieres encontrarte mañana", None, 4)
            add("I was hoping to meet with you", "estaba esperando encontrarte contigo", None, 4)

        elif lego_id == "S0154L03":  # el sábado (on Saturday)
            add(known, target, None, 2)
            add("I want to meet on Saturday", "quiero encontrarte el sábado", None, 4)
            add("I want to go on Saturday", "quiero ir el sábado", None, 4)
            add("where you want to go on Saturday", "dónde quieres ir el sábado", None, 5)
            add("where you want to meet on Saturday", "dónde quieres encontrarte el sábado", None, 5)
            add("I was hoping to meet on Saturday", "estaba esperando encontrarte el sábado", None, 5)
            add("I'm not sure where you want to go on Saturday", "no estoy seguro dónde quieres ir el sábado", None, 8)
            add("I want to be able to meet on Saturday", "quiero poder encontrarte el sábado", None, 6)
            add("I was hoping you would want to meet on Saturday", "estaba esperando que quieres encontrarte el sábado", None, 7)
            add("where you want to be on Saturday", "dónde quieres estar el sábado", None, 5)

        elif lego_id == "S0154L04":  # por la noche (at night)
            add(known, target, None, 3)
            add("on Saturday night", "el sábado por la noche", None, 4)
            add("I want to go at night", "quiero ir por la noche", None, 5)
            add("I want to meet at night", "quiero encontrarte por la noche", None, 5)
            add("where you want to go at night", "dónde quieres ir por la noche", None, 6)
            add("I was hoping to meet at night", "estaba esperando encontrarte por la noche", None, 6)
            add("where you want to meet on Saturday night", "dónde quieres encontrarte el sábado por la noche", None, 7)
            add("I want to meet on Saturday night", "quiero encontrarte el sábado por la noche", None, 6)
            add("I was hoping to go on Saturday night", "estaba esperando ir el sábado por la noche", None, 7)
            # Full seed
            add("Where do you want to meet on Saturday night?", "¿Dónde quieres encontrarte el sábado por la noche?", None, 6)

        elif lego_id == "S0155L01":  # esperar (to wait)
            add(known, target, None, 1)
            add("I don't mind waiting", "no me importa esperar", None, 3)
            add("I want to wait", "quiero esperar", None, 2)
            add("I don't mind waiting tomorrow", "no me importa esperar mañana", None, 4)
            add("I'm trying to wait", "estoy intentando esperar", None, 3)
            add("I was hoping to wait", "estaba esperando esperar", None, 3)
            add("I don't mind waiting with you", "no me importa esperar contigo", None, 4)
            add("I want to be able to wait", "quiero poder esperar", None, 4)
            add("I'm not sure if I want to wait", "no estoy seguro si quiero esperar", None, 7)
            add("I was hoping you would want to wait", "estaba esperando que quieres esperar", None, 6)

        elif lego_id == "S0155L02":  # unos minutos (a few minutes)
            add(known, target, None, 2)
            add("I don't mind waiting a few minutes", "no me importa esperar unos minutos", None, 5)
            add("I want to wait a few minutes", "quiero esperar unos minutos", None, 4)
            add("I want to speak for a few minutes", "quiero hablar unos minutos", None, 4)
            add("I was hoping to wait a few minutes", "estaba esperando esperar unos minutos", None, 5)
            add("I don't mind waiting a few minutes tomorrow", "no me importa esperar unos minutos mañana", None, 6)
            add("I want to learn for a few minutes", "quiero aprender unos minutos", None, 4)
            add("I'm trying to wait a few minutes", "estoy intentando esperar unos minutos", None, 5)
            add("I want to be able to wait a few minutes", "quiero poder esperar unos minutos", None, 6)
            add("I don't mind learning for a few minutes", "no me importa aprender unos minutos", None, 5)

        elif lego_id == "S0155L03":  # por la mañana (in the morning)
            add(known, target, None, 3)
            add("tomorrow morning", "mañana por la mañana", None, 3)
            add("I want to meet in the morning", "quiero encontrarte por la mañana", None, 5)
            add("I want to go in the morning", "quiero ir por la mañana", None, 5)
            add("I was hoping to meet in the morning", "estaba esperando encontrarte por la mañana", None, 6)
            add("I don't mind waiting in the morning", "no me importa esperar por la mañana", None, 6)
            add("I want to meet tomorrow morning", "quiero encontrarte mañana por la mañana", None, 5)
            add("I was hoping to wait tomorrow morning", "estaba esperando esperar mañana por la mañana", None, 6)
            add("I don't mind waiting a few minutes in the morning", "no me importa esperar unos minutos por la mañana", None, 7)
            # Full seed
            add("I don't mind waiting for a few minutes tomorrow morning.", "No me importa esperar unos minutos mañana por la mañana.", None, 7)

        elif lego_id == "S0156L01":  # a un restaurante (to a restaurant)
            add(known, target, None, 3)
            add("I want to go to a restaurant", "quiero ir a un restaurante", None, 5)
            add("you want to go to a restaurant", "quieres ir a un restaurante", None, 5)
            add("I want to go to a restaurant tomorrow", "quiero ir a un restaurante mañana", None, 6)
            add("I was hoping to go to a restaurant", "estaba esperando ir a un restaurante", None, 6)
            add("where you want to go to a restaurant", "dónde quieres ir a un restaurante", None, 6)
            add("I want to go to a restaurant at night", "quiero ir a un restaurante por la noche", None, 8)
            add("I want to go to a restaurant on Saturday", "quiero ir a un restaurante el sábado", None, 7)
            add("I don't mind going to a restaurant", "no me importa ir a un restaurante", None, 6)
            # Full seed
            add("Do you want to go to a restaurant tonight?", "¿Quieres ir a un restaurante esta noche?", None, 6)

        elif lego_id == "S0157L01":  # no podré (I won't be able)
            add(known, target, None, 2)
            add("I won't be able to go", "no podré ir", None, 4)
            add("I won't be able to wait", "no podré esperar", None, 4)
            add("I won't be able to meet", "no podré encontrarte", None, 4)
            add("I won't be able to speak", "no podré hablar", None, 4)
            add("I won't be able to go tomorrow", "no podré ir mañana", None, 5)
            add("I won't be able to meet on Saturday", "no podré encontrarte el sábado", None, 6)
            add("I won't be able to go to a restaurant", "no podré ir a un restaurante", None, 7)
            add("I was hoping I won't be able to go", "estaba esperando no podré ir", None, 6)
            add("I won't be able to wait a few minutes", "no podré esperar unos minutos", None, 6)

        elif lego_id == "S0157L02":  # estar (to be)
            add(known, target, None, 1)
            add("I want to be", "quiero estar", None, 2)
            add("I won't be able to be", "no podré estar", None, 4)
            add("I'm trying to be", "estoy intentando estar", None, 3)
            add("I was hoping to be", "estaba esperando estar", None, 3)
            add("I want to be with you", "quiero estar contigo", None, 3)
            add("I won't be able to be tomorrow", "no podré estar mañana", None, 5)
            add("I was hoping to be with you", "estaba esperando estar contigo", None, 4)
            add("I want to be able to be", "quiero poder estar", None, 4)
            add("I won't be able to be on Saturday", "no podré estar el sábado", None, 6)

        elif lego_id == "S0157L03":  # ahí (there)
            add(known, target, None, 1)
            add("to be there", "estar ahí", None, 2)
            add("I want to be there", "quiero estar ahí", None, 3)
            add("I won't be able to be there", "no podré estar ahí", None, 5)
            add("I'm trying to be there", "estoy intentando estar ahí", None, 4)
            add("I was hoping to be there", "estaba esperando estar ahí", None, 4)
            add("I want to be able to be there", "quiero poder estar ahí", None, 6)
            add("I won't be able to be there tomorrow", "no podré estar ahí mañana", None, 6)
            add("I won't be able to be there on Saturday", "no podré estar ahí el sábado", None, 7)
            add("I was hoping you would be there", "estaba esperando que estarás ahí", None, 5)

        elif lego_id == "S0157L04":  # el próximo mes (next month)
            add(known, target, None, 3)
            add("I want to be there next month", "quiero estar ahí el próximo mes", None, 6)
            add("I won't be able next month", "no podré el próximo mes", None, 5)
            add("I won't be able to be there next month", "no podré estar ahí el próximo mes", None, 7)
            add("I was hoping to meet next month", "estaba esperando encontrarte el próximo mes", None, 6)
            add("I want to go to a restaurant next month", "quiero ir a un restaurante el próximo mes", None, 8)
            add("where you want to go next month", "dónde quieres ir el próximo mes", None, 6)
            add("I was hoping to be there next month", "estaba esperando estar ahí el próximo mes", None, 7)
            add("I'm not sure if I'll be there next month", "no estoy seguro si estaré ahí el próximo mes", None, 9)
            # Full seed
            add("I won't be able to be there next month.", "No podré estar ahí el próximo mes.", None, 6)

        elif lego_id == "S0158L01":  # hablemos (let's talk)
            add(known, target, None, 1)
            add("let's talk tomorrow", "hablemos mañana", None, 2)
            add("let's talk about that", "hablemos de eso", None, 3)
            add("let's talk in the morning", "hablemos por la mañana", None, 4)
            add("let's talk about what you want", "hablemos de lo que quieres", None, 5)
            add("let's talk on Saturday", "hablemos el sábado", None, 3)
            add("let's talk at night", "hablemos por la noche", None, 4)
            add("let's talk about where you want to go", "hablemos de dónde quieres ir", None, 6)
            add("let's talk tomorrow morning", "hablemos mañana por la mañana", None, 4)
            add("let's talk about what I was hoping", "hablemos de lo que estaba esperando", None, 6)

        elif lego_id == "S0158L02":  # algo más (something else)
            add(known, target, None, 2)
            add("I want something else", "quiero algo más", None, 3)
            add("let's talk about something else", "hablemos de algo más", None, 4)
            add("I want to learn something else", "quiero aprender algo más", None, 4)
            add("I want to do something else", "quiero hacer algo más", None, 4)
            add("I'm trying to learn something else", "estoy intentando aprender algo más", None, 5)
            add("I was hoping to learn something else", "estaba esperando aprender algo más", None, 5)
            add("I want to try something else", "quiero intentar algo más", None, 4)
            add("I would have done something else", "habría hecho algo más", None, 4)
            # Full seed
            add("Let's talk about something else.", "Hablemos de algo más.", None, 4)

        # For S0159, all LEGOs are references, generate phrases for each
        elif seed_id == "S0159":
            if lego_id == "S0061L02":  # eso (that)
                add(known, target, None, 1)
                add("that was what", "eso era lo que", None, 3)
                add("that isn't what", "eso no es lo que", None, 4)
                add("that was exactly what", "eso era exactamente lo que", None, 4)
                add("that isn't what I want", "eso no es lo que quiero", None, 5)
                add("that was what I wanted", "eso era lo que quería", None, 5)
                add("that isn't what I was hoping", "eso no es lo que estaba esperando", None, 6)
                add("that was what I was hoping would happen", "eso era lo que estaba esperando que pasara", None, 8)
                add("that isn't exactly what I wanted", "eso no es exactamente lo que quería", None, 7)
                add("that was what I would have said", "eso era lo que habría dicho", None, 6)
            elif lego_id == "S0116L02":  # no es (isn't)
                add(known, target, None, 2)
                add("that isn't", "eso no es", None, 2)
                add("that isn't what", "eso no es lo que", None, 3)
                add("isn't what I want", "no es lo que quiero", None, 4)
                add("that isn't what I want", "eso no es lo que quiero", None, 5)
                add("that isn't what I was hoping", "eso no es lo que estaba esperando", None, 6)
                add("that isn't exactly what I wanted", "eso no es exactamente lo que quería", None, 7)
                add("that isn't what I would have said", "eso no es lo que habría dicho", None, 7)
                add("isn't what you wanted", "no es lo que querías", None, 4)
                add("that isn't where I want to go", "eso no es dónde quiero ir", None, 6)
            elif lego_id == "S0104L03":  # lo que (what)
                add(known, target, None, 2)
                add("what I want", "lo que quiero", None, 2)
                add("what you want", "lo que quieres", None, 2)
                add("what I was hoping", "lo que estaba esperando", None, 3)
                add("what I would have done", "lo que habría hecho", None, 3)
                add("exactly what I wanted", "exactamente lo que quería", None, 3)
                add("that isn't what I want", "eso no es lo que quiero", None, 5)
                add("what I would have said", "lo que habría dicho", None, 3)
                add("what I was hoping would happen", "lo que estaba esperando que pasara", None, 5)
                add("that isn't exactly what you wanted", "eso no es exactamente lo que querías", None, 7)
            elif lego_id == "S0002L01":  # estoy intentando (I'm trying)
                add(known, target, None, 2)
                add("I'm trying to learn", "estoy intentando aprender", None, 3)
                add("I'm trying to speak", "estoy intentando hablar", None, 3)
                add("I'm trying to wait", "estoy intentando esperar", None, 3)
                add("I'm trying to learn Spanish", "estoy intentando aprender español", None, 4)
                add("I'm trying to be there", "estoy intentando estar ahí", None, 4)
                add("I'm trying to learn something else", "estoy intentando aprender algo más", None, 5)
                add("I'm not sure what I'm trying to do", "no estoy seguro lo que estoy intentando hacer", None, 8)
                add("I'm trying to be able to speak", "estoy intentando poder hablar", None, 5)
                add("I was hoping I'm trying to learn", "estaba esperando estoy intentando aprender", None, 5)
            elif lego_id == "S0004L01":  # decir (to say)
                add(known, target, None, 1)
                add("I want to say", "quiero decir", None, 2)
                add("I'm trying to say", "estoy intentando decir", None, 3)
                add("what I want to say", "lo que quiero decir", None, 4)
                add("I'm trying to say something", "estoy intentando decir algo", None, 4)
                add("I was hoping to say", "estaba esperando decir", None, 3)
                add("I would have said something", "habría dicho algo", None, 3)
                add("I'm not sure what I want to say", "no estoy seguro lo que quiero decir", None, 7)
                add("I was hoping to say what you wanted", "estaba esperando decir lo que querías", None, 6)
                # Full seed
                add("That isn't what I'm trying to say.", "Eso no es lo que estoy intentando decir.", None, 7)

        elif lego_id == "S0160L01":  # dices (you say)
            add(known, target, None, 1)
            add("what you say", "lo que dices", None, 2)
            add("how you say that", "cómo dices eso", None, 3)
            add("how you say it", "cómo lo dices", None, 3)
            add("I want to know what you say", "quiero saber lo que dices", None, 5)
            add("that isn't what you say", "eso no es lo que dices", None, 5)
            add("I was hoping to know what you say", "estaba esperando saber lo que dices", None, 6)
            add("I'm not sure what you say", "no estoy seguro lo que dices", None, 5)
            add("how you say it in Spanish", "cómo lo dices en español", None, 5)
            add("that isn't exactly what you say", "eso no es exactamente lo que dices", None, 6)

        elif lego_id == "S0160L02":  # esta palabra (this word)
            add(known, target, None, 2)
            add("I want to learn this word", "quiero aprender esta palabra", None, 4)
            add("how you say this word", "cómo dices esta palabra", None, 4)
            add("I'm trying to learn this word", "estoy intentando aprender esta palabra", None, 5)
            add("I want to know this word", "quiero saber esta palabra", None, 4)
            add("how you say this word in Spanish", "cómo dices esta palabra en español", None, 6)
            add("I was hoping to learn this word", "estaba esperando aprender esta palabra", None, 6)
            add("I'm not sure how you say this word", "no estoy seguro cómo dices esta palabra", None, 7)
            add("I want to be able to say this word", "quiero poder decir esta palabra", None, 6)
            # Full seed
            add("How do you say this word in Spanish?", "¿Cómo dices esta palabra en español?", None, 5)

        # Ensure we have at least some phrases
        if len(phrases) == 0:
            print(f"      ⚠️ WARNING: No GATE-compliant phrases found for {lego_id}")
            # Add at minimum the LEGO itself
            add(known, target, None, len(self.tokenize_spanish(target)))

        return phrases

    def save_output(self, output: Dict, output_path: str):
        """Save generated baskets to JSON file"""
        with open(output_path, 'w', encoding='utf-8') as f:
            json.dump(output, f, ensure_ascii=False, indent=2)
        print(f"\n✅ Output saved to: {output_path}")


def main():
    """Main execution"""
    registry_path = "/home/user/ssi-dashboard-v7/phase5_batch1_s0101_s0300/registry/lego_registry_s0001_s0300.json"
    seeds_path = "/home/user/ssi-dashboard-v7/phase5_batch1_s0101_s0300/batch_input/agent_06_seeds.json"
    output_path = "/home/user/ssi-dashboard-v7/phase5_batch1_s0101_s0300/batch_output/agent_06_baskets.json"

    print("=" * 80)
    print("Agent 06 GATE-Compliant Basket Generator")
    print("Seeds: S0151-S0160")
    print("=" * 80)

    generator = StrictBasketGenerator(registry_path, seeds_path)
    baskets = generator.generate_baskets()
    generator.save_output(baskets, output_path)

    # Count totals
    total_seeds = len(generator.seeds)
    total_legos = sum(len(seed['legos']) for seed in generator.seeds)
    total_phrases = sum(
        len(lego_data.get('practice_phrases', []))
        for seed_id, seed_data in baskets.items()
        if seed_id.startswith('S0')
        for lego_id, lego_data in seed_data.items()
        if lego_id.startswith('S0')
    )

    print("\n" + "=" * 80)
    print(f"✅ Agent 06 complete: {total_seeds} seeds, {total_legos} LEGOs, {total_phrases} phrases generated")
    print("=" * 80)


if __name__ == "__main__":
    main()
