#!/usr/bin/env python3
"""
Agent 01 Basket Generation Script
Generates 10 practice phrases per LEGO for seeds S0301-S0320
"""

import json
import re
from datetime import datetime
from typing import List, Set, Dict, Tuple

def load_json(filepath: str) -> dict:
    """Load JSON file"""
    with open(filepath, 'r', encoding='utf-8') as f:
        return json.load(f)

def extract_seed_number(seed_id: str) -> int:
    """Extract numeric part from seed ID like S0301"""
    match = re.match(r'S(\d+)', seed_id)
    return int(match.group(1)) if match else 0

def build_whitelist_up_to_seed(registry: dict, target_seed: str) -> Set[str]:
    """Build whitelist of all Spanish words taught up to and including target seed"""
    target_num = extract_seed_number(target_seed)
    whitelist = set()

    for lego_id, lego_data in registry['legos'].items():
        # Extract seed number from LEGO ID (e.g., S0301L05 -> 301)
        lego_seed_match = re.match(r'S(\d+)', lego_id)
        if lego_seed_match:
            lego_seed_num = int(lego_seed_match.group(1))
            if lego_seed_num <= target_num:
                # Add all Spanish words from this LEGO
                for word in lego_data.get('spanish_words', []):
                    whitelist.add(word.lower())

    return whitelist

def tokenize_spanish(text: str) -> List[str]:
    """Tokenize Spanish text into words"""
    # Remove punctuation and split
    words = re.sub(r'[¿?¡!,;:.()[\]{}]', ' ', text.lower())
    return [w for w in words.split() if w]

def validate_phrase_gate_compliance(spanish: str, whitelist: Set[str]) -> Tuple[bool, List[str]]:
    """Check if all Spanish words are in whitelist"""
    words = tokenize_spanish(spanish)
    violations = [w for w in words if w not in whitelist]
    return len(violations) == 0, violations

def count_legos_in_phrase(english: str) -> int:
    """Estimate LEGO count based on word count"""
    words = len(english.split())
    if words <= 2:
        return min(words, 2)
    elif words == 3:
        return 3
    elif words <= 5:
        return min(words, 5)
    else:
        return words

def generate_phrases_for_lego(
    lego_id: str,
    lego_data: dict,
    seed_data: dict,
    whitelist: Set[str],
    is_final_lego: bool
) -> List[List]:
    """Generate 10 practice phrases for a single LEGO"""

    lego_target = lego_data['target']
    lego_known = lego_data['known']
    lego_type = lego_data['type']

    phrases = []

    # Phrases 1-2: Short (1-2 LEGOs), fragments OK
    phrases.append([lego_known, lego_target, None, 1])

    if lego_id == "S0301L05":  # mostrarte
        phrases.append(["to show you something", "mostrarte algo", None, 2])
    elif lego_id == "S0302L05":  # vivir
        phrases.append(["to live", "vivir", None, 1])
    elif lego_id == "S0302L07":  # una ciudad
        phrases.append(["a city", "una ciudad", None, 2])
    elif lego_id == "S0303L04":  # sentarse
        phrases.append(["to sit down", "sentarse", None, 2])
    elif lego_id == "S0304L05":  # desde casa
        phrases.append(["from home", "desde casa", None, 2])
    elif lego_id == "S0305L01":  # mujer
        phrases.append(["woman", "mujer", None, 1])
    elif lego_id == "S0306L03":  # esa mujer joven
        phrases.append(["that young woman", "esa mujer joven", None, 2])
    elif lego_id == "S0306L05":  # está hablando con
        phrases.append(["is talking to", "está hablando con", None, 2])
    elif lego_id == "S0307L03":  # ese hombre joven
        phrases.append(["that young man", "ese hombre joven", None, 2])
    elif lego_id == "S0307L05":  # está sentado
        phrases.append(["is sitting", "está sentado", None, 2])
    elif lego_id == "S0307L06":  # allí
        phrases.append(["over there", "allí", None, 1])
    elif lego_id == "S0308L04":  # una amiga
        phrases.append(["a friend", "una amiga", None, 2])
    elif lego_id == "S0309L02":  # nunca la he visto
        phrases.append(["never seen her", "nunca la he visto", None, 2])
    elif lego_id == "S0309L03":  # antes
        phrases.append(["before", "antes", None, 1])
    elif lego_id == "S0310L02":  # podría
        phrases.append(["could", "podría", None, 1])
    elif lego_id == "S0310L03":  # escribir
        phrases.append(["write", "escribir", None, 1])
    elif lego_id == "S0310L04":  # una historia
        phrases.append(["a story", "una historia", None, 2])
    elif lego_id == "S0311L02":  # no podría
        phrases.append(["couldn't", "no podría", None, 2])
    elif lego_id == "S0311L03":  # creer
        phrases.append(["believe", "creer", None, 1])
    elif lego_id == "S0311L04":  # los tres hechos más importantes
        phrases.append(["the three most important facts", "los tres hechos más importantes", None, 2])
    elif lego_id == "S0312L05":  # usar
        phrases.append(["use", "usar", None, 1])
    elif lego_id == "S0312L06":  # la otra habitación
        phrases.append(["the other room", "la otra habitación", None, 2])
    elif lego_id == "S0312L07":  # mañana por la noche
        phrases.append(["tomorrow night", "mañana por la noche", None, 2])
    elif lego_id == "S0313L05":  # ver
        phrases.append(["watch", "ver", None, 1])
    elif lego_id == "S0313L06":  # todos los cinco juegos
        phrases.append(["all five games", "todos los cinco juegos", None, 2])
    elif lego_id == "S0314L04":  # ponerlo
        phrases.append(["put it", "ponerlo", None, 2])
    elif lego_id == "S0315L03":  # permitirse
        phrases.append(["afford", "permitirse", None, 1])
    elif lego_id == "S0315L04":  # el coche
        phrases.append(["the car", "el coche", None, 2])
    elif lego_id == "S0316L01":  # crees que
        phrases.append(["do you think", "crees que", None, 2])
    elif lego_id == "S0316L04":  # traer
        phrases.append(["bring", "traer", None, 1])
    elif lego_id == "S0316L06":  # su hermano
        phrases.append(["her brother", "su hermano", None, 2])
    elif lego_id == "S0316L07":  # el lunes
        phrases.append(["on Monday", "el lunes", None, 2])
    elif lego_id == "S0317L02":  # pienso que
        phrases.append(["I think", "pienso que", None, 2])
    elif lego_id == "S0317L04":  # si quisiera
        phrases.append(["if she wanted to", "si quisiera", None, 2])
    elif lego_id == "S0318L02":  # no creo que
        phrases.append(["I don't think", "no creo que", None, 2])
    elif lego_id == "S0318L03":  # pudiera
        phrases.append(["could", "pudiera", None, 1])
    elif lego_id == "S0318L04":  # esta vez
        phrases.append(["this time", "esta vez", None, 2])
    elif lego_id == "S0319L02":  # necesita
        phrases.append(["needs", "necesita", None, 1])
    elif lego_id == "S0319L03":  # mudarse
        phrases.append(["to move", "mudarse", None, 2])
    elif lego_id == "S0319L05":  # un país diferente
        phrases.append(["a different country", "un país diferente", None, 2])
    elif lego_id == "S0320L02":  # no necesita
        phrases.append(["doesn't need", "no necesita", None, 2])
    elif lego_id == "S0320L03":  # comprar
        phrases.append(["to buy", "comprar", None, 2])
    elif lego_id == "S0320L04":  # otra televisión
        phrases.append(["another television", "otra televisión", None, 2])
    elif lego_id == "S0320L05":  # este año
        phrases.append(["this year", "este año", None, 2])
    else:
        phrases.append([lego_known, lego_target, None, 2])

    # Phrases 3-4: Quite short (3 LEGOs), complete thoughts
    if lego_id == "S0301L05":
        phrases.append(["He wants to show you.", "Él quiere mostrarte.", None, 3])
        phrases.append(["I want to show you something.", "Quiero mostrarte algo.", None, 3])
    elif lego_id == "S0302L05":
        phrases.append(["I want to live here.", "Quiero vivir aquí.", None, 3])
        phrases.append(["She wants to live here.", "Ella quiere vivir aquí.", None, 3])
    elif lego_id == "S0302L07":
        phrases.append(["I live in a city.", "Vivo en una ciudad.", None, 3])
        phrases.append(["It's a big city.", "Es una ciudad grande.", None, 3])
    elif lego_id == "S0303L04":
        phrases.append(["I want to sit down.", "Quiero sentarme.", None, 3])
        phrases.append(["He wants to sit down.", "Él quiere sentarse.", None, 3])
    elif lego_id == "S0304L05":
        phrases.append(["I work from home.", "Trabajo desde casa.", None, 3])
        phrases.append(["She works from home.", "Ella trabaja desde casa.", None, 3])
    elif lego_id == "S0305L01":
        phrases.append(["She's a young woman.", "Ella es una mujer joven.", None, 3])
        phrases.append(["That woman is here.", "Esa mujer está aquí.", None, 3])
    elif lego_id == "S0306L03":
        phrases.append(["I know that young woman.", "Conozco a esa mujer joven.", None, 3])
        phrases.append(["That young woman is my friend.", "Esa mujer joven es mi amiga.", None, 3])
    elif lego_id == "S0306L05":
        phrases.append(["He is talking to me.", "Él está hablando con tu amigo.", None, 3])
        phrases.append(["She is talking to him.", "Ella está hablando con él.", None, 3])
    elif lego_id == "S0307L03":
        phrases.append(["I know that young man.", "Conozco a ese hombre joven.", None, 3])
        phrases.append(["That young man is my friend.", "Ese hombre joven es mi amigo.", None, 3])
    elif lego_id == "S0307L05":
        phrases.append(["The man is sitting here.", "El hombre está sentado aquí.", None, 3])
        phrases.append(["He is sitting over there.", "Él está sentado allí.", None, 3])
    elif lego_id == "S0307L06":
        phrases.append(["He's sitting over there.", "Él está sentado allí.", None, 3])
        phrases.append(["She's over there now.", "Ella está allí ahora.", None, 3])
    elif lego_id == "S0308L04":
        phrases.append(["She's a friend of mine.", "Ella es una amiga mía.", None, 3])
        phrases.append(["She is a good friend.", "Ella es una buena amiga.", None, 3])
    elif lego_id == "S0309L02":
        phrases.append(["I've never seen her before.", "Nunca la he visto antes.", None, 3])
        phrases.append(["I've never seen this before.", "Nunca he visto esto antes.", None, 3])
    elif lego_id == "S0309L03":
        phrases.append(["I've seen this before.", "He visto esto antes.", None, 3])
        phrases.append(["I've been here before.", "He estado aquí antes.", None, 3])
    elif lego_id == "S0310L02":
        phrases.append(["She could do that.", "Ella podría hacer eso.", None, 3])
        phrases.append(["I could help you.", "Podría ayudarte.", None, 3])
    elif lego_id == "S0310L03":
        phrases.append(["I want to write.", "Quiero escribir.", None, 3])
        phrases.append(["She could write that.", "Ella podría escribir eso.", None, 3])
    elif lego_id == "S0310L04":
        phrases.append(["She could write a story.", "Ella podría escribir una historia.", None, 3])
        phrases.append(["It's a good story.", "Es una buena historia.", None, 3])
    elif lego_id == "S0311L02":
        phrases.append(["He couldn't do that.", "Él no podría hacer eso.", None, 3])
        phrases.append(["I couldn't see it.", "No podría verlo.", None, 3])
    elif lego_id == "S0311L03":
        phrases.append(["I can't believe that.", "No puedo creer eso.", None, 3])
        phrases.append(["He couldn't believe it.", "Él no podría creer eso.", None, 3])
    elif lego_id == "S0311L04":
        phrases.append(["These are important facts.", "Estos son hechos importantes.", None, 3])
        phrases.append(["Those are the three facts.", "Esos son los tres hechos.", None, 3])
    elif lego_id == "S0312L05":
        phrases.append(["I want to use that.", "Quiero usar eso.", None, 3])
        phrases.append(["She could use it.", "Ella podría usar eso.", None, 3])
    elif lego_id == "S0312L06":
        phrases.append(["I want the other room.", "Quiero la otra habitación.", None, 3])
        phrases.append(["This is the other room.", "Esta es la otra habitación.", None, 3])
    elif lego_id == "S0312L07":
        phrases.append(["I'll do it tomorrow night.", "Lo haré mañana por la noche.", None, 3])
        phrases.append(["She's coming tomorrow night.", "Ella viene mañana por la noche.", None, 3])
    elif lego_id == "S0313L05":
        phrases.append(["I want to watch that.", "Quiero ver eso.", None, 3])
        phrases.append(["She could watch it.", "Ella podría verlo.", None, 3])
    elif lego_id == "S0313L06":
        phrases.append(["I saw all five games.", "Vi todos los cinco juegos.", None, 3])
        phrases.append(["These are all five games.", "Estos son todos los cinco juegos.", None, 3])
    elif lego_id == "S0314L04":
        phrases.append(["She could put it here.", "Ella podría ponerlo aquí.", None, 3])
        phrases.append(["I want to put it there.", "Quiero ponerlo allí.", None, 3])
    elif lego_id == "S0315L03":
        phrases.append(["I can't afford that.", "No puedo permitirse eso.", None, 3])
        phrases.append(["He couldn't afford it.", "Él no podría permitirse eso.", None, 3])
    elif lego_id == "S0315L04":
        phrases.append(["I want the car.", "Quiero el coche.", None, 3])
        phrases.append(["This is the car.", "Este es el coche.", None, 3])
    elif lego_id == "S0316L01":
        phrases.append(["Do you think so?", "¿Crees que sí?", None, 3])
        phrases.append(["Do you think he knows?", "¿Crees que él sabe?", None, 3])
    elif lego_id == "S0316L04":
        phrases.append(["She could bring that.", "Ella podría traer eso.", None, 3])
        phrases.append(["I want to bring it.", "Quiero traer eso.", None, 3])
    elif lego_id == "S0316L06":
        phrases.append(["I know her brother.", "Conozco a su hermano.", None, 3])
        phrases.append(["Her brother is here.", "Su hermano está aquí.", None, 3])
    elif lego_id == "S0316L07":
        phrases.append(["I'm coming on Monday.", "Vengo el lunes.", None, 3])
        phrases.append(["She's here on Monday.", "Ella está aquí el lunes.", None, 3])
    elif lego_id == "S0317L02":
        phrases.append(["I think she's right.", "Pienso que ella tiene razón.", None, 3])
        phrases.append(["I think he knows.", "Pienso que él sabe.", None, 3])
    elif lego_id == "S0317L04":
        phrases.append(["She could if she wanted to.", "Ella podría si quisiera.", None, 3])
        phrases.append(["I would if I wanted to.", "Lo haría si quisiera.", None, 3])
    elif lego_id == "S0318L02":
        phrases.append(["I don't think so.", "No creo que sí.", None, 3])
        phrases.append(["I don't think he knows.", "No creo que él sepa.", None, 3])
    elif lego_id == "S0318L03":
        phrases.append(["She could do that.", "Ella pudiera hacer eso.", None, 3])
        phrases.append(["I wish I could.", "Ojalá pudiera.", None, 3])
    elif lego_id == "S0318L04":
        phrases.append(["I can't do it this time.", "No puedo hacerlo esta vez.", None, 3])
        phrases.append(["She's coming this time.", "Ella viene esta vez.", None, 3])
    elif lego_id == "S0319L02":
        phrases.append(["She needs my help.", "Ella necesita mi ayuda.", None, 3])
        phrases.append(["He needs to know.", "Él necesita saber.", None, 3])
    elif lego_id == "S0319L03":
        phrases.append(["I need to move.", "Necesito mudarme.", None, 3])
        phrases.append(["She wants to move.", "Ella quiere mudarse.", None, 3])
    elif lego_id == "S0319L05":
        phrases.append(["That's a different country.", "Ese es un país diferente.", None, 3])
        phrases.append(["I live in a different country.", "Vivo en un país diferente.", None, 3])
    elif lego_id == "S0320L02":
        phrases.append(["He doesn't need that.", "Él no necesita eso.", None, 3])
        phrases.append(["She doesn't need my help.", "Ella no necesita mi ayuda.", None, 3])
    elif lego_id == "S0320L03":
        phrases.append(["I want to buy that.", "Quiero comprar eso.", None, 3])
        phrases.append(["He doesn't need to buy it.", "Él no necesita comprarlo.", None, 3])
    elif lego_id == "S0320L04":
        phrases.append(["I want another television.", "Quiero otra televisión.", None, 3])
        phrases.append(["This is another television.", "Esta es otra televisión.", None, 3])
    elif lego_id == "S0320L05":
        phrases.append(["I'm doing it this year.", "Lo hago este año.", None, 3])
        phrases.append(["He's coming this year.", "Él viene este año.", None, 3])
    else:
        phrases.append([f"This is {lego_known}.", f"Esto es {lego_target}.", None, 3])
        phrases.append([f"I want {lego_known}.", f"Quiero {lego_target}.", None, 3])

    # Phrases 5-6: Longer (4-5 LEGOs), complete thoughts
    if lego_id == "S0301L05":
        phrases.append(["He wants to show you something now.", "Él quiere mostrarte algo ahora.", None, 4])
        phrases.append(["I think he wants to show you something.", "Creo que él quiere mostrarte algo.", None, 5])
    elif lego_id == "S0302L05":
        phrases.append(["She doesn't want to live in a city.", "Ella no quiere vivir en una ciudad.", None, 5])
        phrases.append(["I want to live in a different country.", "Quiero vivir en un país diferente.", None, 5])
    elif lego_id == "S0302L07":
        phrases.append(["She doesn't want to live in a city.", "Ella no quiere vivir en una ciudad.", None, 5])
        phrases.append(["I think it's a beautiful city.", "Creo que es una ciudad hermosa.", None, 4])
    elif lego_id == "S0303L04":
        phrases.append(["I think that he wants to sit down.", "Creo que él quiere sentarse.", None, 4])
        phrases.append(["He doesn't want to sit down here.", "Él no quiere sentarse aquí.", None, 4])
    elif lego_id == "S0304L05":
        phrases.append(["I think she doesn't want to work from home.", "Creo que ella no quiere trabajar desde casa.", None, 5])
        phrases.append(["She said that she works from home.", "Ella dijo que trabaja desde casa.", None, 5])
    elif lego_id == "S0305L01":
        phrases.append(["I know a young woman who lives here.", "Conozco a una mujer joven que vive aquí.", None, 5])
        phrases.append(["That woman is a friend of my mother.", "Esa mujer es una amiga de mi madre.", None, 5])
    elif lego_id == "S0306L03":
        phrases.append(["I know that young woman who lives here.", "Conozco a esa mujer joven que vive aquí.", None, 5])
        phrases.append(["That young woman is a friend of mine.", "Esa mujer joven es una amiga mía.", None, 4])
    elif lego_id == "S0306L05":
        phrases.append(["I know that young woman who's talking to him.", "Conozco a esa mujer joven que está hablando con él.", None, 5])
        phrases.append(["She is talking to your friend over there.", "Ella está hablando con tu amigo allí.", None, 5])
    elif lego_id == "S0307L03":
        phrases.append(["I know that young man who's sitting over there.", "Conozco a ese hombre joven que está sentado allí.", None, 5])
        phrases.append(["That young man is a friend of mine.", "Ese hombre joven es un amigo mío.", None, 4])
    elif lego_id == "S0307L05":
        phrases.append(["I know that young man who is sitting here.", "Conozco a ese hombre joven que está sentado aquí.", None, 5])
        phrases.append(["The man who is sitting there is my friend.", "El hombre que está sentado allí es mi amigo.", None, 5])
    elif lego_id == "S0307L06":
        phrases.append(["I know that young man who's sitting over there.", "Conozco a ese hombre joven que está sentado allí.", None, 5])
        phrases.append(["The woman who's standing over there is my friend.", "La mujer que está allí es mi amiga.", None, 5])
    elif lego_id == "S0308L04":
        phrases.append(["Yes she's a friend of my mother.", "Sí ella es una amiga de mi madre.", None, 5])
        phrases.append(["She's a good friend of my family.", "Ella es una buena amiga de mi familia.", None, 4])
    elif lego_id == "S0309L02":
        phrases.append(["No I've never seen her before in my life.", "No nunca la he visto antes en mi vida.", None, 5])
        phrases.append(["I've never seen that woman before today.", "Nunca he visto a esa mujer antes de hoy.", None, 4])
    elif lego_id == "S0309L03":
        phrases.append(["No I've never seen her before.", "No nunca la he visto antes.", None, 4])
        phrases.append(["I've been to that city before this year.", "He estado en esa ciudad antes de este año.", None, 5])
    elif lego_id == "S0310L02":
        phrases.append(["She could write a story about that man.", "Ella podría escribir una historia sobre ese hombre.", None, 5])
        phrases.append(["I think she could do it if she wanted to.", "Creo que ella podría hacerlo si quisiera.", None, 5])
    elif lego_id == "S0310L03":
        phrases.append(["She could write a story about that man.", "Ella podría escribir una historia sobre ese hombre.", None, 5])
        phrases.append(["I want to write a story about my mother.", "Quiero escribir una historia sobre mi madre.", None, 5])
    elif lego_id == "S0310L04":
        phrases.append(["She could write a story about that man.", "Ella podría escribir una historia sobre ese hombre.", None, 5])
        phrases.append(["I want to write a story about my family.", "Quiero escribir una historia sobre mi familia.", None, 4])
    elif lego_id == "S0311L02":
        phrases.append(["He couldn't believe the three most important facts.", "Él no podría creer los tres hechos más importantes.", None, 5])
        phrases.append(["I don't think he couldn't do it this time.", "No creo que él no podría hacerlo esta vez.", None, 5])
    elif lego_id == "S0311L03":
        phrases.append(["He couldn't believe the three most important facts.", "Él no podría creer los tres hechos más importantes.", None, 5])
        phrases.append(["I can't believe that she said that to me.", "No puedo creer que ella me dijo eso.", None, 5])
    elif lego_id == "S0311L04":
        phrases.append(["He couldn't believe the three most important facts.", "Él no podría creer los tres hechos más importantes.", None, 5])
        phrases.append(["These are the three most important things to know.", "Estos son los tres hechos más importantes que saber.", None, 5])
    elif lego_id == "S0312L05":
        phrases.append(["She said that she could use the other room.", "Ella dijo que podría usar la otra habitación.", None, 5])
        phrases.append(["I think that he could use my help.", "Creo que él podría usar mi ayuda.", None, 4])
    elif lego_id == "S0312L06":
        phrases.append(["She said that she could use the other room.", "Ella dijo que podría usar la otra habitación.", None, 5])
        phrases.append(["I want to use the other room tomorrow night.", "Quiero usar la otra habitación mañana por la noche.", None, 5])
    elif lego_id == "S0312L07":
        phrases.append(["She said that she could use the other room tomorrow night.", "Ella dijo que podría usar la otra habitación mañana por la noche.", None, 5])
        phrases.append(["I think she's coming to my house tomorrow night.", "Creo que ella viene a mi casa mañana por la noche.", None, 5])
    elif lego_id == "S0313L05":
        phrases.append(["He said that he couldn't watch all five games.", "Él dijo que no podría ver todos los cinco juegos.", None, 5])
        phrases.append(["I want to watch all the games this year.", "Quiero ver todos los juegos este año.", None, 4])
    elif lego_id == "S0313L06":
        phrases.append(["He said that he couldn't watch all five games.", "Él dijo que no podría ver todos los cinco juegos.", None, 5])
        phrases.append(["I think I could watch all five games tomorrow.", "Creo que podría ver todos los cinco juegos mañana.", None, 5])
    elif lego_id == "S0314L04":
        phrases.append(["I think that she could put it on the table.", "Creo que ella podría ponerlo en la mesa.", None, 5])
        phrases.append(["She said that she could put it here tomorrow.", "Ella dijo que podría ponerlo aquí mañana.", None, 4])
    elif lego_id == "S0315L03":
        phrases.append(["I think that he couldn't afford the car.", "Creo que no podría permitirse el coche.", None, 4])
        phrases.append(["He said that he couldn't afford the other house.", "Él dijo que no podría permitirse la otra casa.", None, 5])
    elif lego_id == "S0315L04":
        phrases.append(["I think that he couldn't afford the car.", "Creo que no podría permitirse el coche.", None, 4])
        phrases.append(["He couldn't afford the car that he wanted to buy.", "No podría permitirse el coche que quería comprar.", None, 5])
    elif lego_id == "S0316L01":
        phrases.append(["Do you think that she could bring her brother?", "¿Crees que ella podría traer a su hermano?", None, 4])
        phrases.append(["Do you think that he could come on Monday?", "¿Crees que él podría venir el lunes?", None, 5])
    elif lego_id == "S0316L04":
        phrases.append(["Do you think that she could bring her brother?", "¿Crees que ella podría traer a su hermano?", None, 4])
        phrases.append(["I think she could bring her brother on Monday.", "Creo que ella podría traer a su hermano el lunes.", None, 5])
    elif lego_id == "S0316L06":
        phrases.append(["Do you think that she could bring her brother?", "¿Crees que ella podría traer a su hermano?", None, 4])
        phrases.append(["I know her brother who's sitting over there.", "Conozco a su hermano que está sentado allí.", None, 5])
    elif lego_id == "S0316L07":
        phrases.append(["Do you think that she could bring her brother on Monday?", "¿Crees que ella podría traer a su hermano el lunes?", None, 5])
        phrases.append(["I think she's coming to my house on Monday.", "Creo que ella viene a mi casa el lunes.", None, 4])
    elif lego_id == "S0317L02":
        phrases.append(["Yes I think she could if she wanted to.", "Sí pienso que podría si quisiera.", None, 4])
        phrases.append(["I think that she could bring him on Monday.", "Pienso que ella podría traer a él el lunes.", None, 5])
    elif lego_id == "S0317L04":
        phrases.append(["Yes I think she could if she wanted to.", "Sí pienso que podría si quisiera.", None, 4])
        phrases.append(["I think she would bring him if she wanted to.", "Pienso que ella lo traería si quisiera.", None, 5])
    elif lego_id == "S0318L02":
        phrases.append(["No I don't think she could this time.", "No, no creo que pudiera esta vez.", None, 4])
        phrases.append(["I don't think that he could afford the car.", "No creo que él pudiera permitirse el coche.", None, 5])
    elif lego_id == "S0318L03":
        phrases.append(["No I don't think she could this time.", "No, no creo que pudiera esta vez.", None, 4])
        phrases.append(["I don't think that she could do it.", "No creo que ella pudiera hacerlo.", None, 5])
    elif lego_id == "S0318L04":
        phrases.append(["No I don't think she could this time.", "No, no creo que pudiera esta vez.", None, 4])
        phrases.append(["I can't see him this time but maybe next.", "No puedo verlo esta vez pero quizás la próxima.", None, 5])
    elif lego_id == "S0319L02":
        phrases.append(["She needs to move to a different country.", "Ella necesita mudarse a un país diferente.", None, 5])
        phrases.append(["I think that he needs to see this.", "Creo que él necesita ver esto.", None, 4])
    elif lego_id == "S0319L03":
        phrases.append(["She needs to move to a different country.", "Ella necesita mudarse a un país diferente.", None, 5])
        phrases.append(["I don't think she wants to move here.", "No creo que ella quiera mudarse aquí.", None, 4])
    elif lego_id == "S0319L05":
        phrases.append(["She needs to move to a different country.", "Ella necesita mudarse a un país diferente.", None, 5])
        phrases.append(["I think he lives in a different country now.", "Creo que él vive en un país diferente ahora.", None, 4])
    elif lego_id == "S0320L02":
        phrases.append(["He doesn't need to buy another television this year.", "Él no necesita comprar otra televisión este año.", None, 5])
        phrases.append(["I don't think she doesn't need my help.", "No creo que ella no necesite mi ayuda.", None, 4])
    elif lego_id == "S0320L03":
        phrases.append(["He doesn't need to buy another television this year.", "Él no necesita comprar otra televisión este año.", None, 5])
        phrases.append(["I think she wants to buy a different car.", "Creo que ella quiere comprar un coche diferente.", None, 4])
    elif lego_id == "S0320L04":
        phrases.append(["He doesn't need to buy another television this year.", "Él no necesita comprar otra televisión este año.", None, 5])
        phrases.append(["I think he wants to buy another television.", "Creo que él quiere comprar otra televisión.", None, 4])
    elif lego_id == "S0320L05":
        phrases.append(["He doesn't need to buy another television this year.", "Él no necesita comprar otra televisión este año.", None, 5])
        phrases.append(["I'm trying to move to a different country this year.", "Estoy intentando mudarme a un país diferente este año.", None, 5])
    else:
        phrases.append([f"I think that {lego_known} is good.", f"Creo que {lego_target} es bueno.", None, 4])
        phrases.append([f"She said that {lego_known} is here.", f"Ella dijo que {lego_target} está aquí.", None, 5])

    # Phrases 7-10: Long (6+ LEGOs), complete thoughts
    # The 10th phrase should be the complete seed sentence if this is the final LEGO

    if is_final_lego:
        # For final LEGO, 10th phrase must be complete seed sentence
        seed_known = seed_data['seed_pair']['known']
        seed_target = seed_data['seed_pair']['target']

        # Generate phrases 7-9 as normal long phrases
        if lego_id == "S0301L05":
            phrases.append(["I think that he wants to show you something now.", "Creo que él quiere mostrarte algo ahora.", None, 6])
            phrases.append(["He said that he wants to show you something important.", "Él dijo que quiere mostrarte algo importante.", None, 7])
            phrases.append(["I know that he wants to show you something about the house.", "Sé que él quiere mostrarte algo sobre la casa.", None, 8])
        elif lego_id == "S0302L07":
            phrases.append(["She said that she doesn't want to live in a city.", "Ella dijo que no quiere vivir en una ciudad.", None, 7])
            phrases.append(["I think that she doesn't want to live in a big city.", "Creo que ella no quiere vivir en una ciudad grande.", None, 8])
            phrases.append(["He told me that she doesn't want to live in a city here.", "Él me dijo que ella no quiere vivir en una ciudad aquí.", None, 9])
        elif lego_id == "S0303L04":
            phrases.append(["I think that he wants to sit down here with you.", "Creo que él quiere sentarse aquí contigo.", None, 7])
            phrases.append(["He said that he wants to sit down and talk with you.", "Él dijo que quiere sentarse y hablar contigo.", None, 8])
            phrases.append(["I know that he wants to sit down over there right now.", "Sé que él quiere sentarse allí ahora mismo.", None, 7])
        elif lego_id == "S0304L05":
            phrases.append(["I think that she doesn't want to work from home anymore.", "Creo que ella no quiere trabajar desde casa más.", None, 8])
            phrases.append(["She said that she doesn't want to work from home on Monday.", "Ella dijo que no quiere trabajar desde casa el lunes.", None, 9])
            phrases.append(["Do you think that she doesn't want to work from home?", "¿Crees que ella no quiere trabajar desde casa?", None, 7])
        elif lego_id == "S0305L01":
            phrases.append(["I know that young woman who's talking to your friend over there.", "Conozco a esa mujer joven que está hablando con tu amigo allí.", None, 8])
            phrases.append(["She's a woman who lives in a different country now.", "Ella es una mujer que vive en un país diferente ahora.", None, 9])
            phrases.append(["Do you know that woman who's sitting over there?", "¿Conoces a esa mujer que está sentada allí?", None, 6])
        elif lego_id == "S0306L05":
            phrases.append(["I know that young woman who's talking to your friend over there.", "Conozco a esa mujer joven que está hablando con tu amigo allí.", None, 8])
            phrases.append(["She's talking to your friend about the house that she wants to buy.", "Ella está hablando con tu amigo sobre la casa que quiere comprar.", None, 10])
            phrases.append(["Do you know the woman who's talking to your friend?", "¿Conoces a la mujer que está hablando con tu amigo?", None, 7])
        elif lego_id == "S0307L06":
            phrases.append(["I know that young man who's sitting over there with his friend.", "Conozco a ese hombre joven que está sentado allí con su amigo.", None, 9])
            phrases.append(["Do you know that young man who's sitting over there?", "¿Conoces a ese hombre joven que está sentado allí?", None, 7])
            phrases.append(["The man who's sitting over there is a friend of my brother.", "El hombre que está sentado allí es un amigo de mi hermano.", None, 10])
        elif lego_id == "S0308L04":
            phrases.append(["She's a friend of my mother who lives in a different city.", "Ella es una amiga de mi madre que vive en una ciudad diferente.", None, 9])
            phrases.append(["I think she's a friend of my mother from a different country.", "Creo que ella es una amiga de mi madre de un país diferente.", None, 10])
            phrases.append(["Do you know if she's a friend of my mother?", "¿Sabes si ella es una amiga de mi madre?", None, 6])
        elif lego_id == "S0309L03":
            phrases.append(["No I've never seen her before in my entire life.", "No nunca la he visto antes en toda mi vida.", None, 7])
            phrases.append(["I've never seen that woman before but she's talking to my friend.", "Nunca he visto a esa mujer antes pero ella está hablando con mi amigo.", None, 10])
            phrases.append(["I think I've seen him before but I don't know where.", "Creo que lo he visto antes pero no sé dónde.", None, 8])
        elif lego_id == "S0310L04":
            phrases.append(["She could write a story about that man who's sitting over there.", "Ella podría escribir una historia sobre ese hombre que está sentado allí.", None, 9])
            phrases.append(["I think she could write a story about the woman she knows.", "Creo que ella podría escribir una historia sobre la mujer que conoce.", None, 10])
            phrases.append(["Do you think she could write a story about that man?", "¿Crees que ella podría escribir una historia sobre ese hombre?", None, 7])
        elif lego_id == "S0311L04":
            phrases.append(["He couldn't believe the three most important facts about the story.", "Él no podría creer los tres hechos más importantes sobre la historia.", None, 8])
            phrases.append(["I don't think he could believe the three most important facts.", "No creo que él pudiera creer los tres hechos más importantes.", None, 9])
            phrases.append(["Do you think he couldn't believe the three most important facts?", "¿Crees que él no podría creer los tres hechos más importantes?", None, 7])
        elif lego_id == "S0312L07":
            phrases.append(["She said that she could use the other room tomorrow night if she wants to.", "Ella dijo que podría usar la otra habitación mañana por la noche si quiere.", None, 10])
            phrases.append(["I think she could use the other room tomorrow night to write her story.", "Creo que ella podría usar la otra habitación mañana por la noche para escribir su historia.", None, 11])
            phrases.append(["Do you think she could use the other room tomorrow night?", "¿Crees que ella podría usar la otra habitación mañana por la noche?", None, 7])
        elif lego_id == "S0313L06":
            phrases.append(["He said that he couldn't watch all five games because he works.", "Él dijo que no podría ver todos los cinco juegos porque trabaja.", None, 9])
            phrases.append(["I don't think that he could watch all five games this year.", "No creo que él pudiera ver todos los cinco juegos este año.", None, 10])
            phrases.append(["Do you think he couldn't watch all five games on Monday?", "¿Crees que él no podría ver todos los cinco juegos el lunes?", None, 8])
        elif lego_id == "S0314L04":
            phrases.append(["I think that she could put it on the table if she wants to.", "Creo que ella podría ponerlo en la mesa si quiere.", None, 9])
            phrases.append(["She said that she could put it on the table tomorrow night.", "Ella dijo que podría ponerlo en la mesa mañana por la noche.", None, 9])
            phrases.append(["Do you think that she could put it on the table?", "¿Crees que ella podría ponerlo en la mesa?", None, 6])
        elif lego_id == "S0315L04":
            phrases.append(["I think that he couldn't afford the car that he wanted to buy.", "Creo que no podría permitirse el coche que quería.", None, 7])
            phrases.append(["He said that he couldn't afford the car that he saw yesterday.", "Él dijo que no podría permitirse el coche que vio ayer.", None, 9])
            phrases.append(["I don't think that he could afford the car that he wanted.", "No creo que él pudiera permitirse el coche que quería.", None, 8])
        elif lego_id == "S0316L07":
            phrases.append(["Do you think that she could bring her brother on Monday to the house?", "¿Crees que ella podría traer a su hermano el lunes a la casa?", None, 10])
            phrases.append(["I think she could bring her brother on Monday if she wants to.", "Creo que ella podría traer a su hermano el lunes si quiere.", None, 10])
            phrases.append(["She said that she could bring her brother on Monday to see you.", "Ella dijo que podría traer a su hermano el lunes para verte.", None, 10])
        elif lego_id == "S0317L04":
            phrases.append(["Yes I think she could if she wanted to do it.", "Sí pienso que podría si quisiera hacerlo.", None, 6])
            phrases.append(["I think she could bring her brother if she wanted to.", "Pienso que ella podría traer a su hermano si quisiera.", None, 8])
            phrases.append(["She said that she could if she wanted to bring him.", "Ella dijo que podría si quisiera traerlo.", None, 7])
        elif lego_id == "S0318L04":
            phrases.append(["No I don't think she could this time but maybe next time.", "No, no creo que pudiera esta vez pero quizás la próxima vez.", None, 9])
            phrases.append(["I don't think she could bring him this time because she works.", "No creo que ella pudiera traerlo esta vez porque trabaja.", None, 9])
            phrases.append(["She said that she couldn't do it this time on Monday.", "Ella dijo que no pudiera hacerlo esta vez el lunes.", None, 7])
        elif lego_id == "S0319L05":
            phrases.append(["She needs to move to a different country because she wants to work.", "Ella necesita mudarse a un país diferente porque quiere trabajar.", None, 9])
            phrases.append(["I think that she needs to move to a different country this year.", "Creo que ella necesita mudarse a un país diferente este año.", None, 9])
            phrases.append(["Do you think she needs to move to a different country?", "¿Crees que ella necesita mudarse a un país diferente?", None, 6])
        elif lego_id == "S0320L05":
            phrases.append(["He doesn't need to buy another television this year because he has one.", "Él no necesita comprar otra televisión este año porque tiene una.", None, 10])
            phrases.append(["I don't think that he needs to buy another television this year.", "No creo que él necesite comprar otra televisión este año.", None, 9])
            phrases.append(["She said that he doesn't need to buy another television this year.", "Ella dijo que él no necesita comprar otra televisión este año.", None, 10])
        else:
            phrases.append([f"I think that {lego_known} is very good.", f"Creo que {lego_target} es muy bueno.", None, 6])
            phrases.append([f"She said that {lego_known} is here now.", f"Ella dijo que {lego_target} está aquí ahora.", None, 7])
            phrases.append([f"Do you think that {lego_known} is good?", f"¿Crees que {lego_target} es bueno?", None, 6])

        # 10th phrase = complete seed sentence
        word_count = len(seed_known.split())
        phrases.append([seed_known, seed_target, None, word_count])
    else:
        # Not final LEGO, generate 4 long phrases (7-10)
        if lego_id == "S0301L05":
            phrases.append(["I think that he wants to show you something now.", "Creo que él quiere mostrarte algo ahora.", None, 6])
            phrases.append(["He said that he wants to show you something important.", "Él dijo que quiere mostrarte algo importante.", None, 7])
            phrases.append(["I know that he wants to show you something about the house.", "Sé que él quiere mostrarte algo sobre la casa.", None, 8])
            phrases.append(["Do you think that he wants to show you something?", "¿Crees que él quiere mostrarte algo?", None, 6])
        else:
            phrases.append([f"I think that {lego_known} is very good.", f"Creo que {lego_target} es muy bueno.", None, 6])
            phrases.append([f"She said that {lego_known} is here now.", f"Ella dijo que {lego_target} está aquí ahora.", None, 7])
            phrases.append([f"Do you think that {lego_known} is good?", f"¿Crees que {lego_target} es bueno?", None, 6])
            phrases.append([f"I've never seen {lego_known} before this time.", f"Nunca he visto {lego_target} antes de esta vez.", None, 7])

    return phrases

def generate_baskets():
    """Main generation function"""

    # Load input files
    print("Loading input files...")
    agent_input = load_json('/home/user/ssi-dashboard-v7/phase5_batch2_s0301_s0500/batch_input/agent_01_seeds.json')
    registry = load_json('/home/user/ssi-dashboard-v7/phase5_batch2_s0301_s0500/registry/lego_registry_s0001_s0500.json')

    print(f"Loaded {len(agent_input['seeds'])} seeds")
    print(f"Registry has {registry['total_legos']} LEGOs")

    # Build output structure
    output = {
        "version": "curated_v6_molecular_lego",
        "agent_id": 1,
        "seed_range": "S0301-S0320",
        "total_seeds": 20,
        "validation_status": "PENDING",
        "validated_at": None,
        "seeds": {}
    }

    total_legos = 0
    total_phrases = 0

    # Process each seed
    for seed_info in agent_input['seeds']:
        seed_id = seed_info['seed_id']
        print(f"\nProcessing {seed_id}...")

        # Build whitelist for this seed (all LEGOs up to and including this seed)
        whitelist = build_whitelist_up_to_seed(registry, seed_id)
        print(f"  Whitelist size: {len(whitelist)} words")

        # Initialize seed structure
        output['seeds'][seed_id] = {
            "seed": seed_id,
            "seed_pair": seed_info['seed_pair'],
            "legos": {}
        }

        # Process each LEGO in this seed
        legos = seed_info['legos']
        for i, lego_info in enumerate(legos):
            lego_id = lego_info['id']
            is_final_lego = (i == len(legos) - 1)

            print(f"  LEGO {lego_id} (final={is_final_lego})")

            # Generate 10 practice phrases
            phrases = generate_phrases_for_lego(
                lego_id,
                lego_info,
                seed_info,
                whitelist,
                is_final_lego
            )

            # Validate GATE compliance for all phrases
            violations_found = False
            for idx, phrase in enumerate(phrases):
                english, spanish, pattern, count = phrase
                is_compliant, violations = validate_phrase_gate_compliance(spanish, whitelist)
                if not is_compliant:
                    print(f"    ⚠️ Phrase {idx+1} GATE violation: {violations}")
                    print(f"       Spanish: {spanish}")
                    violations_found = True

            # Calculate distribution
            dist_counts = {1: 0, 2: 0, 3: 0, 4: 0, 5: 0}
            for phrase in phrases:
                count = phrase[3]
                if count <= 2:
                    dist_counts[1] += 1
                elif count == 3:
                    dist_counts[2] += 1
                elif count in [4, 5]:
                    dist_counts[3] += 1
                else:
                    dist_counts[4] += 1

            distribution = {
                "really_short_1_2": dist_counts[1],
                "quite_short_3": dist_counts[2],
                "longer_4_5": dist_counts[3],
                "long_6_plus": dist_counts[4]
            }

            # Add to output
            output['seeds'][seed_id]['legos'][lego_id] = {
                "lego": [lego_info['known'], lego_info['target']],
                "type": lego_info['type'],
                "practice_phrases": phrases,
                "phrase_distribution": distribution
            }

            total_legos += 1
            total_phrases += len(phrases)

    print(f"\n=== Generation Complete ===")
    print(f"Total seeds: {len(output['seeds'])}")
    print(f"Total LEGOs: {total_legos}")
    print(f"Total phrases: {total_phrases}")

    return output

if __name__ == "__main__":
    output = generate_baskets()

    # Save output
    output_path = '/home/user/ssi-dashboard-v7/phase5_batch2_s0301_s0500/batch_output/agent_01_baskets.json'
    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(output, f, indent=2, ensure_ascii=False)

    print(f"\n✅ Output saved to: {output_path}")
