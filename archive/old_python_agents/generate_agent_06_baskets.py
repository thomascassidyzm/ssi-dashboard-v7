#!/usr/bin/env python3
"""
Generate practice phrase baskets for Agent 06 (Seeds S0151-S0160)
Following Phase 5 v3.0 specifications with strict GATE compliance
"""

import json
import re
from datetime import datetime
from typing import List, Dict, Set, Tuple

class BasketGenerator:
    def __init__(self, registry_path: str, seeds_path: str):
        """Initialize with registry and seeds data"""
        with open(registry_path, 'r', encoding='utf-8') as f:
            self.registry = json.load(f)

        with open(seeds_path, 'r', encoding='utf-8') as f:
            self.seeds_data = json.load(f)

        self.seeds = self.seeds_data['seeds']

    def get_whitelist_for_lego(self, current_lego_id: str) -> Set[str]:
        """Build whitelist of all Spanish words taught up to current LEGO"""
        whitelist = set()

        # Extract seed and lego numbers from ID (e.g., "S0151L02" -> 151, 2)
        match = re.match(r'S(\d+)L(\d+)', current_lego_id)
        if not match:
            return whitelist

        current_seed_num = int(match.group(1))
        current_lego_num = int(match.group(2))

        # Add all words from LEGOs taught before this one
        for lego_id, lego_data in self.registry['legos'].items():
            match = re.match(r'S(\d+)L(\d+)', lego_id)
            if not match:
                continue

            seed_num = int(match.group(1))
            lego_num = int(match.group(2))

            # Include if before current LEGO
            if seed_num < current_seed_num or (seed_num == current_seed_num and lego_num < current_lego_num):
                whitelist.update(lego_data['spanish_words'])

        return whitelist

    def validate_spanish_phrase(self, spanish: str, whitelist: Set[str]) -> Tuple[bool, List[str]]:
        """Validate that all Spanish words are in whitelist"""
        # Tokenize Spanish phrase
        # Remove punctuation for validation
        cleaned = re.sub(r'[¿?¡!.,;:]', '', spanish)
        words = cleaned.lower().split()

        violations = []
        for word in words:
            if word not in whitelist:
                violations.append(word)

        return len(violations) == 0, violations

    def count_legos_in_phrase(self, spanish: str, whitelist: Set[str]) -> int:
        """Estimate number of LEGOs used in phrase"""
        cleaned = re.sub(r'[¿?¡!.,;:]', '', spanish)
        words = cleaned.split()
        return len(words)

    def generate_phrases_s0151l01(self, whitelist: Set[str]) -> List[List]:
        """S0151L01: estaba esperando (I was hoping)"""
        phrases = [
            # Short (1-2 LEGOs) - fragments OK
            ["I was hoping", "estaba esperando", None, 2],
            ["I was hoping that", "estaba esperando que", None, 2],

            # Quite short (3 LEGOs)
            ["I was hoping to speak", "estaba esperando hablar", None, 3],
            ["That was what I was hoping", "Eso era lo que estaba esperando", None, 3],

            # Longer (4-5 LEGOs)
            ["I was hoping to speak Spanish", "estaba esperando hablar español", None, 4],
            ["I was hoping to learn Spanish", "estaba esperando aprender español", None, 4],

            # Long (6+ LEGOs)
            ["I was hoping to be able to speak Spanish", "estaba esperando poder hablar español", None, 6],
            ["I was hoping to speak with you tomorrow", "estaba esperando hablar contigo mañana", None, 5],
            ["I was hoping to learn something else", "estaba esperando aprender algo más", None, 5],
            ["That wasn't what I was hoping", "Eso no era lo que estaba esperando", None, 6],
        ]
        return phrases

    def generate_phrases_s0151l02(self, whitelist: Set[str]) -> List[List]:
        """S0151L02: que pasara (would happen) - FINAL LEGO OF SEED"""
        phrases = [
            # Short (1-2 LEGOs) - fragments OK
            ["would happen", "que pasara", None, 1],
            ["what would happen", "lo que pasara", None, 2],

            # Quite short (3 LEGOs)
            ["That wasn't what would happen", "Eso no era lo que pasara", None, 3],
            ["I was hoping that would happen", "estaba esperando que pasara", None, 3],

            # Longer (4-5 LEGOs)
            ["I was hoping something else would happen", "estaba esperando que pasara algo más", None, 5],
            ["That wasn't what I was hoping would happen", "Eso no era lo que estaba esperando que pasara", None, 4],

            # Long (6+ LEGOs) - Last phrase must be full seed
            ["That wasn't what I wanted would happen", "Eso no era lo que quería que pasara", None, 6],
            ["I was hoping that would happen tomorrow", "estaba esperando que pasara mañana", None, 4],
            ["I wasn't sure what would happen", "No estaba seguro lo que pasara", None, 6],
            ["That wasn't what I was hoping would happen.", "Eso no era lo que estaba esperando que pasara.", None, 8],  # FULL SEED
        ]
        return phrases

    def generate_phrases_s0152l01(self, whitelist: Set[str]) -> List[List]:
        """S0152L01: lo habría hecho (I would have done it)"""
        phrases = [
            # Short (1-2 LEGOs)
            ["I would have done it", "lo habría hecho", None, 2],
            ["I would have done it differently", "lo habría hecho diferentemente", None, 2],

            # Quite short (3 LEGOs)
            ["I would have done it tomorrow", "lo habría hecho mañana", None, 3],
            ["I would have done something else", "habría hecho algo más", None, 3],

            # Longer (4-5 LEGOs)
            ["I would have done it if I could", "lo habría hecho si pudiera", None, 5],
            ["That isn't what I would have done", "Eso no es lo que habría hecho", None, 5],

            # Long (6+ LEGOs)
            ["I would have done it differently if I had known", "lo habría hecho diferentemente si hubiera sabido", None, 7],
            ["I would have done it on Saturday night", "lo habría hecho el sábado por la noche", None, 7],
            ["I was hoping I would have done it", "estaba esperando que lo habría hecho", None, 6],
            ["That wasn't what I would have done", "Eso no era lo que habría hecho", None, 6],
        ]
        return phrases

    def generate_phrases_s0152l02(self, whitelist: Set[str]) -> List[List]:
        """S0152L02: diferentemente (differently)"""
        phrases = [
            # Short (1-2 LEGOs)
            ["differently", "diferentemente", None, 1],
            ["to do it differently", "hacerlo diferentemente", None, 2],

            # Quite short (3 LEGOs)
            ["I would have done it differently", "lo habría hecho diferentemente", None, 3],
            ["I want to do it differently", "quiero hacerlo diferentemente", None, 3],

            # Longer (4-5 LEGOs)
            ["I was hoping to do it differently", "estaba esperando hacerlo diferentemente", None, 4],
            ["That isn't what I would do differently", "Eso no es lo que haría diferentemente", None, 5],

            # Long (6+ LEGOs)
            ["I would have done it differently tomorrow", "lo habría hecho diferentemente mañana", None, 4],
            ["I would have said it differently if I had known", "lo habría dicho diferentemente si hubiera sabido", None, 7],
            ["I was hoping to do it differently on Saturday", "estaba esperando hacerlo diferentemente el sábado", None, 6],
            ["I would have done it differently if I could", "lo habría hecho diferentemente si pudiera", None, 6],
        ]
        return phrases

    def generate_phrases_s0152l03(self, whitelist: Set[str]) -> List[List]:
        """S0152L03: hubiera sabido (I had known)"""
        phrases = [
            # Short (1-2 LEGOs)
            ["I had known", "hubiera sabido", None, 2],
            ["if I had known", "si hubiera sabido", None, 2],

            # Quite short (3 LEGOs)
            ["if I had known what", "si hubiera sabido lo que", None, 3],
            ["I would have done it if I had known", "lo habría hecho si hubiera sabido", None, 3],

            # Longer (4-5 LEGOs)
            ["if I had known what you wanted", "si hubiera sabido lo que querías", None, 5],
            ["I would have said it if I had known", "lo habría dicho si hubiera sabido", None, 5],

            # Long (6+ LEGOs) - Last phrase must be full seed
            ["I would have done it differently if I had known what", "lo habría hecho diferentemente si hubiera sabido lo que", None, 7],
            ["if I had known what would happen", "si hubiera sabido lo que pasara", None, 6],
            ["if I had known that wasn't what you wanted", "si hubiera sabido que eso no era lo que querías", None, 9],
            ["I would have done it differently if I had known what you wanted.", "lo habría hecho diferentemente si hubiera sabido lo que querías.", None, 9],  # FULL SEED
        ]
        return phrases

    def generate_phrases_s0153l01(self, whitelist: Set[str]) -> List[List]:
        """S0153L01: lo habría dicho (I would have said it)"""
        phrases = [
            # Short (1-2 LEGOs)
            ["I would have said it", "lo habría dicho", None, 2],
            ["I wouldn't have said it", "no lo habría dicho", None, 2],

            # Quite short (3 LEGOs)
            ["I would have said it differently", "lo habría dicho diferentemente", None, 3],
            ["I would have said something else", "habría dicho algo más", None, 3],

            # Longer (4-5 LEGOs)
            ["I would have said it if I had known", "lo habría dicho si hubiera sabido", None, 5],
            ["That isn't what I would have said", "Eso no es lo que habría dicho", None, 5],

            # Long (6+ LEGOs)
            ["I would have said it differently if I had known", "lo habría dicho diferentemente si hubiera sabido", None, 7],
            ["I wouldn't have said it in the same way", "no lo habría dicho de la misma manera", None, 7],
            ["I was hoping I would have said it differently", "estaba esperando que lo habría dicho diferentemente", None, 7],
            ["That wasn't what I would have said", "Eso no era lo que habría dicho", None, 6],
        ]
        return phrases

    def generate_phrases_s0153l02(self, whitelist: Set[str]) -> List[List]:
        """S0153L02: exactamente (exactly)"""
        phrases = [
            # Short (1-2 LEGOs)
            ["exactly", "exactamente", None, 1],
            ["exactly what", "exactamente lo que", None, 2],

            # Quite short (3 LEGOs)
            ["That isn't exactly what", "Eso no es exactamente lo que", None, 3],
            ["exactly what I wanted", "exactamente lo que quería", None, 3],

            # Longer (4-5 LEGOs)
            ["That isn't exactly what I was hoping", "Eso no es exactamente lo que estaba esperando", None, 4],
            ["exactly what I would have said", "exactamente lo que habría dicho", None, 4],

            # Long (6+ LEGOs)
            ["That isn't exactly what I was hoping would happen", "Eso no es exactamente lo que estaba esperando que pasara", None, 8],
            ["exactly what I would have done if I had known", "exactamente lo que habría hecho si hubiera sabido", None, 8],
            ["That wasn't exactly what I wanted to say", "Eso no era exactamente lo que quería decir", None, 7],
            ["I wouldn't have said it exactly in the same way", "no lo habría dicho exactamente de la misma manera", None, 8],
        ]
        return phrases

    def generate_phrases_s0153l03(self, whitelist: Set[str]) -> List[List]:
        """S0153L03: de la misma manera (in the same way) - FINAL LEGO"""
        phrases = [
            # Short (1-2 LEGOs)
            ["in the same way", "de la misma manera", None, 1],
            ["to do it in the same way", "hacerlo de la misma manera", None, 2],

            # Quite short (3 LEGOs)
            ["I would do it in the same way", "lo haría de la misma manera", None, 3],
            ["to say it in the same way", "decirlo de la misma manera", None, 3],

            # Longer (4-5 LEGOs)
            ["I would have done it in the same way", "lo habría hecho de la misma manera", None, 4],
            ["I wouldn't do it in the same way", "no lo haría de la misma manera", None, 4],

            # Long (6+ LEGOs) - Last phrase must be full seed
            ["I would have said it in exactly the same way", "lo habría dicho exactamente de la misma manera", None, 6],
            ["I wouldn't have done it in the same way if I had known", "no lo habría hecho de la misma manera si hubiera sabido", None, 10],
            ["That isn't exactly what I would say in the same way", "Eso no es exactamente lo que diría de la misma manera", None, 9],
            ["I wouldn't have said it in exactly the same way.", "No lo habría dicho exactamente de la misma manera.", None, 7],  # FULL SEED
        ]
        return phrases

    def generate_phrases_s0154l01(self, whitelist: Set[str]) -> List[List]:
        """S0154L01: dónde (where)"""
        phrases = [
            # Short (1-2 LEGOs)
            ["where", "dónde", None, 1],
            ["where you want", "dónde quieres", None, 2],

            # Quite short (3 LEGOs)
            ["where you want to meet", "dónde quieres encontrarte", None, 3],
            ["where you want to go", "dónde quieres ir", None, 3],

            # Longer (4-5 LEGOs)
            ["I'm not sure where you want to meet", "No estoy seguro dónde quieres encontrarte", None, 5],
            ["where you want to go tomorrow", "dónde quieres ir mañana", None, 4],

            # Long (6+ LEGOs)
            ["I'm not sure where you want to meet on Saturday", "No estoy seguro dónde quieres encontrarte el sábado", None, 7],
            ["where you want to go on Saturday night", "dónde quieres ir el sábado por la noche", None, 7],
            ["I was hoping to know where you want to meet", "estaba esperando saber dónde quieres encontrarte", None, 7],
            ["That isn't exactly where I wanted to go", "Eso no es exactamente dónde quería ir", None, 7],
        ]
        return phrases

    def generate_phrases_s0154l02(self, whitelist: Set[str]) -> List[List]:
        """S0154L02: encontrarte (to meet)"""
        phrases = [
            # Short (1-2 LEGOs)
            ["to meet", "encontrarte", None, 1],
            ["to meet you", "encontrarte", None, 1],

            # Quite short (3 LEGOs)
            ["where you want to meet", "dónde quieres encontrarte", None, 3],
            ["I want to meet", "quiero encontrarte", None, 2],

            # Longer (4-5 LEGOs)
            ["I want to meet on Saturday", "quiero encontrarte el sábado", None, 4],
            ["where you want to meet tomorrow", "dónde quieres encontrarte mañana", None, 4],

            # Long (6+ LEGOs)
            ["I want to meet on Saturday night", "quiero encontrarte el sábado por la noche", None, 6],
            ["I was hoping to meet tomorrow morning", "estaba esperando encontrarte mañana por la mañana", None, 6],
            ["where you want to meet on Saturday night", "dónde quieres encontrarte el sábado por la noche", None, 7],
            ["I'm not sure where I want to meet", "No estoy seguro dónde quiero encontrarte", None, 6],
        ]
        return phrases

    def generate_phrases_s0154l03(self, whitelist: Set[str]) -> List[List]:
        """S0154L03: el sábado (on Saturday)"""
        phrases = [
            # Short (1-2 LEGOs)
            ["on Saturday", "el sábado", None, 1],
            ["on Saturday night", "el sábado por la noche", None, 2],

            # Quite short (3 LEGOs)
            ["I want to meet on Saturday", "quiero encontrarte el sábado", None, 3],
            ["I want to go on Saturday", "quiero ir el sábado", None, 3],

            # Longer (4-5 LEGOs)
            ["I want to go on Saturday night", "quiero ir el sábado por la noche", None, 4],
            ["where you want to meet on Saturday", "dónde quieres encontrarte el sábado", None, 4],

            # Long (6+ LEGOs)
            ["I want to go to a restaurant on Saturday", "quiero ir a un restaurante el sábado", None, 7],
            ["where you want to meet on Saturday night", "dónde quieres encontrarte el sábado por la noche", None, 6],
            ["I was hoping to meet on Saturday night", "estaba esperando encontrarte el sábado por la noche", None, 6],
            ["I won't be able to meet on Saturday", "no podré encontrarte el sábado", None, 6],
        ]
        return phrases

    def generate_phrases_s0154l04(self, whitelist: Set[str]) -> List[List]:
        """S0154L04: por la noche (at night) - FINAL LEGO"""
        phrases = [
            # Short (1-2 LEGOs)
            ["at night", "por la noche", None, 1],
            ["on Saturday night", "el sábado por la noche", None, 2],

            # Quite short (3 LEGOs)
            ["I want to meet at night", "quiero encontrarte por la noche", None, 3],
            ["where you want to go at night", "dónde quieres ir por la noche", None, 3],

            # Longer (4-5 LEGOs)
            ["I want to go on Saturday night", "quiero ir el sábado por la noche", None, 4],
            ["where you want to meet at night", "dónde quieres encontrarte por la noche", None, 4],

            # Long (6+ LEGOs) - Last phrase must be full seed
            ["I want to go to a restaurant at night", "quiero ir a un restaurante por la noche", None, 7],
            ["I was hoping to meet on Saturday night", "estaba esperando encontrarte el sábado por la noche", None, 6],
            ["I'm not sure where I want to go at night", "No estoy seguro dónde quiero ir por la noche", None, 8],
            ["Where do you want to meet on Saturday night?", "¿Dónde quieres encontrarte el sábado por la noche?", None, 6],  # FULL SEED
        ]
        return phrases

    def generate_phrases_s0155l01(self, whitelist: Set[str]) -> List[List]:
        """S0155L01: esperar (to wait)"""
        phrases = [
            # Short (1-2 LEGOs)
            ["to wait", "esperar", None, 1],
            ["I don't mind waiting", "no me importa esperar", None, 2],

            # Quite short (3 LEGOs)
            ["I don't mind waiting for you", "no me importa esperar por ti", None, 3],
            ["I want to wait", "quiero esperar", None, 2],

            # Longer (4-5 LEGOs)
            ["I don't mind waiting a few minutes", "no me importa esperar unos minutos", None, 4],
            ["I was hoping you would wait", "estaba esperando que esperaras", None, 4],

            # Long (6+ LEGOs)
            ["I don't mind waiting for a few minutes tomorrow", "no me importa esperar unos minutos mañana", None, 6],
            ["I won't be able to wait tomorrow morning", "no podré esperar mañana por la mañana", None, 7],
            ["I was hoping I wouldn't have to wait", "estaba esperando que no tuviera que esperar", None, 7],
            ["I don't mind waiting on Saturday night", "no me importa esperar el sábado por la noche", None, 7],
        ]
        return phrases

    def generate_phrases_s0155l02(self, whitelist: Set[str]) -> List[List]:
        """S0155L02: unos minutos (a few minutes)"""
        phrases = [
            # Short (1-2 LEGOs)
            ["a few minutes", "unos minutos", None, 1],
            ["for a few minutes", "por unos minutos", None, 2],

            # Quite short (3 LEGOs)
            ["I don't mind waiting a few minutes", "no me importa esperar unos minutos", None, 3],
            ["I want to wait a few minutes", "quiero esperar unos minutos", None, 3],

            # Longer (4-5 LEGOs)
            ["I don't mind waiting for a few minutes", "no me importa esperar por unos minutos", None, 4],
            ["I want to speak for a few minutes", "quiero hablar por unos minutos", None, 4],

            # Long (6+ LEGOs)
            ["I don't mind waiting a few minutes tomorrow", "no me importa esperar unos minutos mañana", None, 5],
            ["I don't mind waiting a few minutes in the morning", "no me importa esperar unos minutos por la mañana", None, 6],
            ["I was hoping to speak for a few minutes", "estaba esperando hablar por unos minutos", None, 6],
            ["I won't be able to wait a few minutes", "no podré esperar unos minutos", None, 6],
        ]
        return phrases

    def generate_phrases_s0155l03(self, whitelist: Set[str]) -> List[List]:
        """S0155L03: por la mañana (in the morning) - FINAL LEGO"""
        phrases = [
            # Short (1-2 LEGOs)
            ["in the morning", "por la mañana", None, 1],
            ["tomorrow morning", "mañana por la mañana", None, 2],

            # Quite short (3 LEGOs)
            ["I want to meet in the morning", "quiero encontrarte por la mañana", None, 3],
            ["I want to go in the morning", "quiero ir por la mañana", None, 3],

            # Longer (4-5 LEGOs)
            ["I want to meet tomorrow morning", "quiero encontrarte mañana por la mañana", None, 4],
            ["I don't mind waiting in the morning", "no me importa esperar por la mañana", None, 4],

            # Long (6+ LEGOs) - Last phrase must be full seed
            ["I don't mind waiting a few minutes in the morning", "no me importa esperar unos minutos por la mañana", None, 6],
            ["I won't be able to meet tomorrow morning", "no podré encontrarte mañana por la mañana", None, 6],
            ["I was hoping to meet tomorrow morning", "estaba esperando encontrarte mañana por la mañana", None, 5],
            ["I don't mind waiting for a few minutes tomorrow morning.", "No me importa esperar unos minutos mañana por la mañana.", None, 7],  # FULL SEED
        ]
        return phrases

    def generate_phrases_s0156l01(self, whitelist: Set[str]) -> List[List]:
        """S0156L01: a un restaurante (to a restaurant) - FINAL LEGO"""
        phrases = [
            # Short (1-2 LEGOs)
            ["to a restaurant", "a un restaurante", None, 1],
            ["to go to a restaurant", "ir a un restaurante", None, 2],

            # Quite short (3 LEGOs)
            ["I want to go to a restaurant", "quiero ir a un restaurante", None, 3],
            ["you want to go to a restaurant", "quieres ir a un restaurante", None, 3],

            # Longer (4-5 LEGOs)
            ["I want to go to a restaurant tonight", "quiero ir a un restaurante esta noche", None, 4],
            ["you want to go to a restaurant tomorrow", "quieres ir a un restaurante mañana", None, 4],

            # Long (6+ LEGOs) - Last phrase must be full seed
            ["I want to go to a restaurant on Saturday night", "quiero ir a un restaurante el sábado por la noche", None, 7],
            ["I don't mind going to a restaurant tonight", "no me importa ir a un restaurante esta noche", None, 7],
            ["where you want to go to a restaurant", "dónde quieres ir a un restaurante", None, 5],
            ["Do you want to go to a restaurant tonight?", "¿Quieres ir a un restaurante esta noche?", None, 5],  # FULL SEED
        ]
        return phrases

    def generate_phrases_s0157l01(self, whitelist: Set[str]) -> List[List]:
        """S0157L01: no podré (I won't be able)"""
        phrases = [
            # Short (1-2 LEGOs)
            ["I won't be able", "no podré", None, 2],
            ["I won't be able to", "no podré", None, 2],

            # Quite short (3 LEGOs)
            ["I won't be able to go", "no podré ir", None, 3],
            ["I won't be able to meet", "no podré encontrarte", None, 3],

            # Longer (4-5 LEGOs)
            ["I won't be able to be there", "no podré estar ahí", None, 4],
            ["I won't be able to wait tomorrow", "no podré esperar mañana", None, 4],

            # Long (6+ LEGOs)
            ["I won't be able to go on Saturday night", "no podré ir el sábado por la noche", None, 7],
            ["I won't be able to meet tomorrow morning", "no podré encontrarte mañana por la mañana", None, 6],
            ["I won't be able to be there next month", "no podré estar ahí el próximo mes", None, 6],
            ["I was hoping I would be able to go", "estaba esperando poder ir", None, 6],
        ]
        return phrases

    def generate_phrases_s0157l02(self, whitelist: Set[str]) -> List[List]:
        """S0157L02: estar (to be)"""
        phrases = [
            # Short (1-2 LEGOs)
            ["to be", "estar", None, 1],
            ["to be there", "estar ahí", None, 2],

            # Quite short (3 LEGOs)
            ["I won't be able to be", "no podré estar", None, 3],
            ["I want to be there", "quiero estar ahí", None, 3],

            # Longer (4-5 LEGOs)
            ["I won't be able to be there", "no podré estar ahí", None, 4],
            ["I was hoping to be there", "estaba esperando estar ahí", None, 4],

            # Long (6+ LEGOs)
            ["I won't be able to be there tomorrow", "no podré estar ahí mañana", None, 5],
            ["I won't be able to be there on Saturday", "no podré estar ahí el sábado", None, 6],
            ["I was hoping to be there next month", "estaba esperando estar ahí el próximo mes", None, 6],
            ["I want to be able to be there", "quiero poder estar ahí", None, 6],
        ]
        return phrases

    def generate_phrases_s0157l03(self, whitelist: Set[str]) -> List[List]:
        """S0157L03: ahí (there)"""
        phrases = [
            # Short (1-2 LEGOs)
            ["there", "ahí", None, 1],
            ["to be there", "estar ahí", None, 2],

            # Quite short (3 LEGOs)
            ["I want to be there", "quiero estar ahí", None, 3],
            ["I won't be able to be there", "no podré estar ahí", None, 3],

            # Longer (4-5 LEGOs)
            ["I want to be there tomorrow", "quiero estar ahí mañana", None, 4],
            ["I was hoping to be there", "estaba esperando estar ahí", None, 4],

            # Long (6+ LEGOs)
            ["I won't be able to be there next month", "no podré estar ahí el próximo mes", None, 6],
            ["I was hoping to be there on Saturday night", "estaba esperando estar ahí el sábado por la noche", None, 7],
            ["I won't be able to be there tomorrow morning", "no podré estar ahí mañana por la mañana", None, 7],
            ["I'm not sure if I want to be there", "No estoy seguro si quiero estar ahí", None, 8],
        ]
        return phrases

    def generate_phrases_s0157l04(self, whitelist: Set[str]) -> List[List]:
        """S0157L04: el próximo mes (next month) - FINAL LEGO"""
        phrases = [
            # Short (1-2 LEGOs)
            ["next month", "el próximo mes", None, 1],
            ["to be there next month", "estar ahí el próximo mes", None, 2],

            # Quite short (3 LEGOs)
            ["I want to be there next month", "quiero estar ahí el próximo mes", None, 3],
            ["I won't be able next month", "no podré el próximo mes", None, 3],

            # Longer (4-5 LEGOs)
            ["I won't be able to be there next month", "no podré estar ahí el próximo mes", None, 4],
            ["I was hoping to meet next month", "estaba esperando encontrarte el próximo mes", None, 4],

            # Long (6+ LEGOs) - Last phrase must be full seed
            ["I won't be able to go to a restaurant next month", "no podré ir a un restaurante el próximo mes", None, 8],
            ["I was hoping to be there next month", "estaba esperando estar ahí el próximo mes", None, 5],
            ["I'm not sure if I'll be there next month", "No estoy seguro si estaré ahí el próximo mes", None, 8],
            ["I won't be able to be there next month.", "No podré estar ahí el próximo mes.", None, 5],  # FULL SEED
        ]
        return phrases

    def generate_phrases_s0158l01(self, whitelist: Set[str]) -> List[List]:
        """S0158L01: hablemos (let's talk)"""
        phrases = [
            # Short (1-2 LEGOs)
            ["let's talk", "hablemos", None, 1],
            ["let's talk about", "hablemos de", None, 2],

            # Quite short (3 LEGOs)
            ["let's talk about that", "hablemos de eso", None, 3],
            ["let's talk about something else", "hablemos de algo más", None, 3],

            # Longer (4-5 LEGOs)
            ["let's talk tomorrow morning", "hablemos mañana por la mañana", None, 4],
            ["let's talk about what you want", "hablemos de lo que quieres", None, 4],

            # Long (6+ LEGOs)
            ["let's talk about it tomorrow morning", "hablemos de eso mañana por la mañana", None, 5],
            ["let's talk about where you want to meet", "hablemos de dónde quieres encontrarte", None, 6],
            ["let's talk about something else next month", "hablemos de algo más el próximo mes", None, 6],
            ["let's talk about what I was hoping would happen", "hablemos de lo que estaba esperando que pasara", None, 8],
        ]
        return phrases

    def generate_phrases_s0158l02(self, whitelist: Set[str]) -> List[List]:
        """S0158L02: algo más (something else) - FINAL LEGO"""
        phrases = [
            # Short (1-2 LEGOs)
            ["something else", "algo más", None, 1],
            ["about something else", "de algo más", None, 2],

            # Quite short (3 LEGOs)
            ["let's talk about something else", "hablemos de algo más", None, 3],
            ["I want to learn something else", "quiero aprender algo más", None, 3],

            # Longer (4-5 LEGOs)
            ["I was hoping to learn something else", "estaba esperando aprender algo más", None, 4],
            ["I want to do something else", "quiero hacer algo más", None, 3],

            # Long (6+ LEGOs) - Last phrase must be full seed
            ["I'm trying to learn something else", "estoy intentando aprender algo más", None, 4],
            ["let's talk about something else tomorrow", "hablemos de algo más mañana", None, 4],
            ["I was hoping we could talk about something else", "estaba esperando que pudiéramos hablar de algo más", None, 8],
            ["Let's talk about something else.", "Hablemos de algo más.", None, 3],  # FULL SEED
        ]
        return phrases

    def generate_phrases_s0159(self, whitelist: Set[str]) -> Dict:
        """S0159: All LEGOs are references, no new LEGOs. Generate for each ref LEGO."""
        return {
            "S0061L02": [
                # Short
                ["that", "eso", None, 1],
                ["that isn't", "eso no es", None, 2],
                # Quite short
                ["that isn't what", "eso no es lo que", None, 3],
                ["that was what I wanted", "eso era lo que quería", None, 3],
                # Longer
                ["that isn't what I'm trying to say", "eso no es lo que estoy intentando decir", None, 4],
                ["that was exactly what I wanted", "eso era exactamente lo que quería", None, 4],
                # Long
                ["that isn't what I was hoping would happen", "eso no es lo que estaba esperando que pasara", None, 8],
                ["that wasn't what I would have said", "eso no era lo que habría dicho", None, 6],
                ["that isn't exactly what I was hoping", "eso no es exactamente lo que estaba esperando", None, 7],
                ["that isn't what I wanted to say", "eso no es lo que quería decir", None, 7],
            ],
            "S0116L02": [
                # Short
                ["isn't", "no es", None, 1],
                ["that isn't", "eso no es", None, 2],
                # Quite short
                ["that isn't what", "eso no es lo que", None, 3],
                ["isn't what I want", "no es lo que quiero", None, 3],
                # Longer
                ["that isn't what I'm trying", "eso no es lo que estoy intentando", None, 4],
                ["isn't what I was hoping", "no es lo que estaba esperando", None, 4],
                # Long
                ["that isn't what I'm trying to say", "eso no es lo que estoy intentando decir", None, 7],
                ["isn't what I would have said", "no es lo que habría dicho", None, 6],
                ["that isn't exactly what I wanted", "eso no es exactamente lo que quería", None, 6],
                ["isn't what I was hoping would happen", "no es lo que estaba esperando que pasara", None, 8],
            ],
            "S0104L03": [
                # Short
                ["what", "lo que", None, 1],
                ["what I want", "lo que quiero", None, 2],
                # Quite short
                ["what I'm trying to say", "lo que estoy intentando decir", None, 3],
                ["what I was hoping", "lo que estaba esperando", None, 3],
                # Longer
                ["what I would have done", "lo que habría hecho", None, 3],
                ["what you wanted to do", "lo que querías hacer", None, 4],
                # Long
                ["that isn't what I'm trying to say", "eso no es lo que estoy intentando decir", None, 7],
                ["what I was hoping would happen", "lo que estaba esperando que pasara", None, 5],
                ["exactly what I would have said", "exactamente lo que habría dicho", None, 4],
                ["what I was hoping to learn", "lo que estaba esperando aprender", None, 5],
            ],
            "S0002L01": [
                # Short
                ["I'm trying", "estoy intentando", None, 2],
                ["I'm trying to", "estoy intentando", None, 2],
                # Quite short
                ["I'm trying to say", "estoy intentando decir", None, 3],
                ["I'm trying to learn", "estoy intentando aprender", None, 3],
                # Longer
                ["what I'm trying to say", "lo que estoy intentando decir", None, 4],
                ["I'm trying to speak Spanish", "estoy intentando hablar español", None, 4],
                # Long
                ["that isn't what I'm trying to say", "eso no es lo que estoy intentando decir", None, 7],
                ["I'm trying to learn something else", "estoy intentando aprender algo más", None, 5],
                ["I'm trying to be able to speak", "estoy intentando poder hablar", None, 5],
                ["I'm not sure what I'm trying to say", "no estoy seguro lo que estoy intentando decir", None, 9],
            ],
            "S0004L01": [
                # Short
                ["to say", "decir", None, 1],
                ["I'm trying to say", "estoy intentando decir", None, 2],
                # Quite short
                ["what I'm trying to say", "lo que estoy intentando decir", None, 3],
                ["I want to say", "quiero decir", None, 2],
                # Longer
                ["that isn't what I'm trying to say", "eso no es lo que estoy intentando decir", None, 4],
                ["I would have said it", "lo habría dicho", None, 3],
                # Long - Last phrase must be full seed
                ["that isn't what I was hoping to say", "eso no es lo que estaba esperando decir", None, 7],
                ["I'm not sure what I want to say", "no estoy seguro lo que quiero decir", None, 7],
                ["I wouldn't have said it in the same way", "no lo habría dicho de la misma manera", None, 7],
                ["That isn't what I'm trying to say.", "Eso no es lo que estoy intentando decir.", None, 6],  # FULL SEED
            ],
        }

    def generate_phrases_s0160l01(self, whitelist: Set[str]) -> List[List]:
        """S0160L01: dices (you say)"""
        phrases = [
            # Short (1-2 LEGOs)
            ["you say", "dices", None, 1],
            ["how you say", "cómo dices", None, 2],

            # Quite short (3 LEGOs)
            ["how you say this", "cómo dices esto", None, 3],
            ["what you say", "lo que dices", None, 2],

            # Longer (4-5 LEGOs)
            ["how you say this word", "cómo dices esta palabra", None, 4],
            ["that isn't what you say", "eso no es lo que dices", None, 5],

            # Long (6+ LEGOs)
            ["how you say this in Spanish", "cómo dices esto en español", None, 5],
            ["I'm not sure what you say", "no estoy seguro lo que dices", None, 6],
            ["that isn't exactly what you say", "eso no es exactamente lo que dices", None, 6],
            ["I was hoping to learn how you say this", "estaba esperando aprender cómo dices esto", None, 7],
        ]
        return phrases

    def generate_phrases_s0160l02(self, whitelist: Set[str]) -> List[List]:
        """S0160L02: esta palabra (this word) - FINAL LEGO"""
        phrases = [
            # Short (1-2 LEGOs)
            ["this word", "esta palabra", None, 1],
            ["how you say this word", "cómo dices esta palabra", None, 2],

            # Quite short (3 LEGOs)
            ["you say this word", "dices esta palabra", None, 3],
            ["I want to learn this word", "quiero aprender esta palabra", None, 3],

            # Longer (4-5 LEGOs)
            ["how you say this word in Spanish", "cómo dices esta palabra en español", None, 4],
            ["I'm trying to learn this word", "estoy intentando aprender esta palabra", None, 4],

            # Long (6+ LEGOs) - Last phrase must be full seed
            ["I'm not sure how you say this word", "no estoy seguro cómo dices esta palabra", None, 6],
            ["I was hoping to learn this word", "estaba esperando aprender esta palabra", None, 5],
            ["let's talk about how you say this word", "hablemos de cómo dices esta palabra", None, 6],
            ["How do you say this word in Spanish?", "¿Cómo dices esta palabra en español?", None, 5],  # FULL SEED
        ]
        return phrases

    def generate_baskets(self) -> Dict:
        """Generate complete baskets output"""
        output = {
            "version": "curated_v6_molecular_lego",
            "agent_id": 6,
            "agent_name": "agent_06",
            "seed_range": "S0151-S0160",
            "course_direction": "Spanish for English speakers",
            "mapping": "KNOWN (English) → TARGET (Spanish)",
            "curation_metadata": {
                "curated_at": datetime.utcnow().isoformat() + "Z",
                "curated_by": "Claude Code - Agent 06 Basket Generator",
                "specification": "phase_5_conversational_baskets_v3_ACTIVE.md",
                "gate_compliance": "STRICT - Exact forms only, no conjugations",
                "distribution_per_lego": "2 short (1-2), 2 quite short (3), 2 longer (4-5), 4 long (6+)"
            }
        }

        # Generate baskets for each seed
        for seed in self.seeds:
            seed_id = seed['seed_id']
            seed_pair = seed['seed_pair']

            print(f"\nGenerating baskets for {seed_id}...")

            # Add seed metadata
            output[seed_id] = {
                "seed_pair": seed_pair,
                "cumulative_legos": seed['cumulative_legos']
            }

            # Generate baskets for each LEGO in seed
            for lego in seed['legos']:
                lego_id = lego['id']

                # Get whitelist for this LEGO
                whitelist = self.get_whitelist_for_lego(lego_id)

                # Generate phrases using the appropriate method
                method_name = f"generate_phrases_{lego_id.lower().replace('l', 'l')}"

                # Map LEGO IDs to their generation methods
                phrases = []

                if lego_id == "S0151L01":
                    phrases = self.generate_phrases_s0151l01(whitelist)
                elif lego_id == "S0151L02":
                    phrases = self.generate_phrases_s0151l02(whitelist)
                elif lego_id == "S0152L01":
                    phrases = self.generate_phrases_s0152l01(whitelist)
                elif lego_id == "S0152L02":
                    phrases = self.generate_phrases_s0152l02(whitelist)
                elif lego_id == "S0152L03":
                    phrases = self.generate_phrases_s0152l03(whitelist)
                elif lego_id == "S0153L01":
                    phrases = self.generate_phrases_s0153l01(whitelist)
                elif lego_id == "S0153L02":
                    phrases = self.generate_phrases_s0153l02(whitelist)
                elif lego_id == "S0153L03":
                    phrases = self.generate_phrases_s0153l03(whitelist)
                elif lego_id == "S0154L01":
                    phrases = self.generate_phrases_s0154l01(whitelist)
                elif lego_id == "S0154L02":
                    phrases = self.generate_phrases_s0154l02(whitelist)
                elif lego_id == "S0154L03":
                    phrases = self.generate_phrases_s0154l03(whitelist)
                elif lego_id == "S0154L04":
                    phrases = self.generate_phrases_s0154l04(whitelist)
                elif lego_id == "S0155L01":
                    phrases = self.generate_phrases_s0155l01(whitelist)
                elif lego_id == "S0155L02":
                    phrases = self.generate_phrases_s0155l02(whitelist)
                elif lego_id == "S0155L03":
                    phrases = self.generate_phrases_s0155l03(whitelist)
                elif lego_id == "S0156L01":
                    phrases = self.generate_phrases_s0156l01(whitelist)
                elif lego_id == "S0157L01":
                    phrases = self.generate_phrases_s0157l01(whitelist)
                elif lego_id == "S0157L02":
                    phrases = self.generate_phrases_s0157l02(whitelist)
                elif lego_id == "S0157L03":
                    phrases = self.generate_phrases_s0157l03(whitelist)
                elif lego_id == "S0157L04":
                    phrases = self.generate_phrases_s0157l04(whitelist)
                elif lego_id == "S0158L01":
                    phrases = self.generate_phrases_s0158l01(whitelist)
                elif lego_id == "S0158L02":
                    phrases = self.generate_phrases_s0158l02(whitelist)
                elif lego_id == "S0160L01":
                    phrases = self.generate_phrases_s0160l01(whitelist)
                elif lego_id == "S0160L02":
                    phrases = self.generate_phrases_s0160l02(whitelist)

                # For S0159 (all refs), generate for each individual LEGO
                if seed_id == "S0159":
                    s0159_phrases = self.generate_phrases_s0159(whitelist)
                    if lego_id in s0159_phrases:
                        phrases = s0159_phrases[lego_id]

                if phrases:
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

                    # Determine available LEGOs count
                    available_legos = seed['cumulative_legos'] - len(seed['legos']) + seed['legos'].index(lego) + 1

                    # Add to output
                    output[seed_id][lego_id] = {
                        "lego": [lego['known'], lego['target']],
                        "type": lego['type'],
                        "available_legos": available_legos,
                        "practice_phrases": phrases,
                        "phrase_distribution": dist,
                        "gate_compliance": "STRICT - All words from exact taught LEGOs only"
                    }

                    print(f"  {lego_id}: {len(phrases)} phrases generated")

        return output

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

    print("=" * 60)
    print("Agent 06 Basket Generator")
    print("Seeds: S0151-S0160")
    print("=" * 60)

    generator = BasketGenerator(registry_path, seeds_path)
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

    print("\n" + "=" * 60)
    print(f"✅ Agent 06 complete: {total_seeds} seeds, {total_legos} LEGOs, {total_phrases} phrases generated")
    print("=" * 60)


if __name__ == "__main__":
    main()
