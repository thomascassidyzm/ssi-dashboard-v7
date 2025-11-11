#!/usr/bin/env python3
"""
Generate practice phrase baskets for seeds S0111-S0120.
Follows Phase 5 v3 specification with strict GATE compliance.
"""

import json
import pickle
from datetime import datetime, timezone
from typing import Dict, List, Set, Tuple

# Load data
with open('phase5_batch1_s0101_s0300/batch_input/agent_02_seeds.json', 'r') as f:
    seeds_data = json.load(f)

with open('/tmp/registry_data.pkl', 'rb') as f:
    registry = pickle.load(f)


def get_lego_by_id(lego_id: str) -> Dict:
    """Get LEGO data from registry"""
    return registry['legos'].get(lego_id, {})


def build_whitelist_up_to(lego_id: str) -> Dict[str, Dict]:
    """Build whitelist of all LEGOs available up to and including lego_id"""
    # Parse the seed number and LEGO number from lego_id (e.g., "S0111L04")
    seed_num = int(lego_id[1:5])  # S0111 -> 111
    lego_num = int(lego_id[6:])   # L04 -> 4

    available_legos = {}
    spanish_words = set()

    # Include all LEGOs from all previous seeds and current seed up to current LEGO
    for lid, lego_data in registry['legos'].items():
        # Skip non-standard LEGO IDs (like PROV_...)
        if not lid.startswith('S'):
            continue

        try:
            lid_seed = int(lid[1:5])
            lid_lego = int(lid[6:])
        except (ValueError, IndexError):
            # Skip malformed IDs
            continue

        # Include if from earlier seed, or from current seed but earlier/equal LEGO
        if lid_seed < seed_num or (lid_seed == seed_num and lid_lego <= lego_num):
            available_legos[lid] = lego_data
            if 'spanish_words' in lego_data:
                spanish_words.update(lego_data['spanish_words'])

    return {
        'legos': available_legos,
        'spanish_words': spanish_words,
        'count': len(available_legos)
    }


def validate_gate_compliance(spanish_phrase: str, whitelist: Set[str]) -> bool:
    """Check if all Spanish words are in the whitelist (GATE compliance)"""
    # Tokenize the Spanish phrase
    words = spanish_phrase.replace(',', ' ').replace('.', ' ').replace('¿', ' ').replace('?', ' ').split()

    for word in words:
        word = word.strip()
        if word and word not in whitelist:
            return False

    return True


def generate_phrases_for_lego(seed_id: str, lego_data: Dict, all_legos_in_seed: List[Dict],
                               is_final_lego: bool, seed_sentence_target: str,
                               seed_sentence_known: str, whitelist: Dict) -> List[List]:
    """
    Generate 10 practice phrases for a single LEGO.
    Returns list of [known, target, pattern/null, lego_count]
    """

    lego_id = lego_data['id']
    lego_target = lego_data['target']
    lego_known = lego_data['known']
    lego_type = lego_data['type']

    available_spanish = whitelist['spanish_words']
    available_legos = whitelist['legos']

    phrases = []

    # Helper function to create phrases
    def add_phrase(known: str, target: str, pattern=None, lego_count=1):
        # Validate GATE compliance
        if validate_gate_compliance(target, available_spanish):
            phrases.append([known, target, pattern, lego_count])
            return True
        return False

    # SEED-SPECIFIC PHRASE GENERATION

    # S0111: "Cuando aprendemos algo nuevo cambia nuestro cerebro"
    if seed_id == "S0111":
        if lego_id == "S0034L03":  # cuando
            add_phrase("when", "cuando", None, 1)
            add_phrase("when I speak", "cuando hablar", None, 2)
            add_phrase("when I want to speak", "cuando quiero hablar", None, 3)
            add_phrase("when I can learn something", "cuando puedo aprender algo", None, 4)
            add_phrase("when I want to learn something new", "cuando quiero aprender algo nuevo", None, 5)
            add_phrase("when I'm trying to speak with you", "cuando estoy intentando hablar contigo", None, 5)
            add_phrase("when I try to remember what you said", "cuando intentar recordar lo que dijiste", None, 6)
            add_phrase("when I want to be able to speak with you", "cuando quiero poder hablar contigo", None, 6)
            add_phrase("when I'm trying to learn how to speak Spanish", "cuando estoy intentando aprender cómo hablar español", None, 7)
            add_phrase("when I'm not sure if I can remember something", "cuando no estoy seguro si puedo recordar algo", None, 8)

        elif lego_id == "S0111L01":  # aprendemos
            add_phrase("we learn", "aprendemos", None, 1)
            add_phrase("we learn Spanish", "aprendemos español", None, 2)
            add_phrase("when we learn", "cuando aprendemos", None, 2)
            add_phrase("when we learn something", "cuando aprendemos algo", None, 3)
            add_phrase("when we learn something new", "cuando aprendemos algo nuevo", None, 4)
            add_phrase("we learn how to speak", "aprendemos cómo hablar", None, 3)
            add_phrase("we learn something new every day", "aprendemos algo nuevo cada día", None, 5)
            add_phrase("when we learn to speak with you", "cuando aprendemos hablar contigo", None, 4)
            add_phrase("I want to explain what we learn", "quiero explicar lo que aprendemos", None, 4)
            add_phrase("I'm not sure if we learn something new", "no estoy seguro si aprendemos algo nuevo", None, 6)

        elif lego_id == "S0004L02":  # algo
            add_phrase("something", "algo", None, 1)
            add_phrase("something new", "algo nuevo", None, 2)
            add_phrase("I want something", "quiero algo", None, 2)
            add_phrase("I'm learning something", "estoy aprender algo", None, 3)
            add_phrase("I want to learn something new", "quiero aprender algo nuevo", None, 4)
            add_phrase("I'm trying to remember something", "estoy intentando recordar algo", None, 4)
            add_phrase("when I want to learn something", "cuando quiero aprender algo", None, 4)
            add_phrase("I'm not sure if I can remember something", "no estoy seguro si puedo recordar algo", None, 7)
            add_phrase("Can I ask you something before you leave", "puedo preguntarte algo antes de que te vayas", None, 5)
            add_phrase("I want to explain something when you finish", "quiero explicar algo después de que termines", None, 6)

        elif lego_id == "S0111L02":  # nuevo
            add_phrase("new", "nuevo", None, 1)
            add_phrase("something new", "algo nuevo", None, 2)
            add_phrase("when we learn something new", "cuando aprendemos algo nuevo", None, 4)
            add_phrase("I want to learn something new", "quiero aprender algo nuevo", None, 4)
            add_phrase("I want something new", "quiero algo nuevo", None, 3)
            add_phrase("I'm trying to learn something new", "estoy intentando aprender algo nuevo", None, 4)
            add_phrase("we learn something new every day", "aprendemos algo nuevo cada día", None, 5)
            add_phrase("I'm not sure if we learn something new", "no estoy seguro si aprendemos algo nuevo", None, 6)
            add_phrase("when I want to try something new", "cuando quiero intentar algo nuevo", None, 5)
            add_phrase("I want to be able to learn something new", "quiero poder aprender algo nuevo", None, 6)

        elif lego_id == "S0111L03":  # cambia
            add_phrase("it changes", "cambia", None, 1)
            add_phrase("something changes", "algo cambia", None, 2)
            add_phrase("when something changes", "cuando algo cambia", None, 3)
            add_phrase("it changes our brain", "cambia nuestro cerebro", None, 3)
            add_phrase("something new changes our brain", "algo nuevo cambia nuestro cerebro", None, 4)
            add_phrase("when we learn it changes", "cuando aprendemos cambia", None, 3)
            add_phrase("when we learn something it changes", "cuando aprendemos algo cambia", None, 4)
            add_phrase("I'm not sure if it changes", "no estoy seguro si cambia", None, 4)
            add_phrase("I want to learn when something changes", "quiero aprender cuando algo cambia", None, 5)
            add_phrase("when we learn something new it changes our brain", "cuando aprendemos algo nuevo cambia nuestro cerebro", None, 6)

        elif lego_id == "S0111L04":  # nuestro cerebro
            add_phrase("our brain", "nuestro cerebro", None, 1)
            add_phrase("it changes our brain", "cambia nuestro cerebro", None, 2)
            add_phrase("our brain changes", "nuestro cerebro cambia", None, 2)
            add_phrase("something changes our brain", "algo cambia nuestro cerebro", None, 3)
            add_phrase("something new changes our brain", "algo nuevo cambia nuestro cerebro", None, 4)
            add_phrase("when we learn our brain changes", "cuando aprendemos nuestro cerebro cambia", None, 4)
            add_phrase("learning something new changes our brain", "aprender algo nuevo cambia nuestro cerebro", None, 4)
            add_phrase("I'm trying to understand how our brain changes", "estoy intentando comprender cómo nuestro cerebro cambia", None, 6)
            add_phrase("I want to explain how our brain changes", "quiero explicar cómo nuestro cerebro cambia", None, 5)
            add_phrase("When we learn something new it changes our brain", "Cuando aprendemos algo nuevo cambia nuestro cerebro", None, 6)

    # S0112: "Eso fue muy interesante, y no estaba esperándolo"
    elif seed_id == "S0112":
        if lego_id == "S0061L02":  # eso
            add_phrase("that", "eso", None, 1)
            add_phrase("I want that", "quiero eso", None, 2)
            add_phrase("that was good", "eso fue bueno", None, 3)
            add_phrase("I'm trying to remember that", "estoy intentando recordar eso", None, 4)
            add_phrase("I'm not sure about that", "no estoy seguro de eso", None, 4)
            add_phrase("I want to learn that", "quiero aprender eso", None, 3)
            add_phrase("that was very interesting", "eso fue muy interesante", None, 4)
            add_phrase("I want to be able to explain that", "quiero poder explicar eso", None, 6)
            add_phrase("I'm trying to understand that", "estoy intentando comprender eso", None, 4)
            add_phrase("when we learn something new that changes our brain", "cuando aprendemos algo nuevo eso cambia nuestro cerebro", None, 7)

        elif lego_id == "S0112L01":  # fue
            add_phrase("was", "fue", None, 1)
            add_phrase("that was", "eso fue", None, 2)
            add_phrase("that was good", "eso fue bueno", None, 3)
            add_phrase("that was very interesting", "eso fue muy interesante", None, 4)
            add_phrase("I'm not sure if that was good", "no estoy seguro si eso fue bueno", None, 6)
            add_phrase("that was something new", "eso fue algo nuevo", None, 4)
            add_phrase("that was very interesting and new", "eso fue muy interesante y nuevo", None, 6)
            add_phrase("I want to explain what that was", "quiero explicar lo que eso fue", None, 6)
            add_phrase("when I learn that was good", "cuando aprender eso fue bueno", None, 5)
            add_phrase("I'm not sure what that was", "no estoy seguro lo que eso fue", None, 6)

        elif lego_id == "S0112L02":  # muy interesante
            add_phrase("very interesting", "muy interesante", None, 1)
            add_phrase("that was very interesting", "eso fue muy interesante", None, 3)
            add_phrase("something very interesting", "algo muy interesante", None, 2)
            add_phrase("I want to learn something very interesting", "quiero aprender algo muy interesante", None, 5)
            add_phrase("that was very interesting and new", "eso fue muy interesante y nuevo", None, 5)
            add_phrase("I'm trying to remember something very interesting", "estoy intentando recordar algo muy interesante", None, 5)
            add_phrase("when we learn something very interesting", "cuando aprendemos algo muy interesante", None, 5)
            add_phrase("I want to explain something very interesting", "quiero explicar algo muy interesante", None, 4)
            add_phrase("it's very interesting when our brain changes", "es muy interesante cuando nuestro cerebro cambia", None, 6)
            add_phrase("That was very interesting and I wasn't expecting it", "Eso fue muy interesante y no estaba esperándolo", None, 7)

        elif lego_id == "S0015L01":  # y
            add_phrase("and", "y", None, 1)
            add_phrase("you and me", "tú y yo", None, 3)
            add_phrase("that was interesting and new", "eso fue interesante y nuevo", None, 5)
            add_phrase("I want to learn and speak", "quiero aprender y hablar", None, 4)
            add_phrase("I want to speak Spanish and learn", "quiero hablar español y aprender", None, 5)
            add_phrase("that was very interesting and new", "eso fue muy interesante y nuevo", None, 5)
            add_phrase("I'm trying to learn and remember", "estoy intentando aprender y recordar", None, 4)
            add_phrase("when we learn something new and interesting", "cuando aprendemos algo nuevo y interesante", None, 6)
            add_phrase("I want to be able to speak and understand", "quiero poder hablar y comprender", None, 6)
            add_phrase("I'm trying to learn Spanish and speak with you", "estoy intentando aprender español y hablar contigo", None, 7)

        elif lego_id == "S0112L03":  # no estaba esperándolo
            add_phrase("I wasn't expecting it", "no estaba esperándolo", None, 1)
            add_phrase("I wasn't expecting that", "no estaba esperando eso", None, 2)
            add_phrase("I wasn't expecting it today", "no estaba esperándolo hoy", None, 3)
            add_phrase("that was interesting and I wasn't expecting it", "eso fue interesante y no estaba esperándolo", None, 6)
            add_phrase("I wasn't expecting something new", "no estaba esperando algo nuevo", None, 4)
            add_phrase("I wasn't expecting it when you said that", "no estaba esperándolo cuando dijiste eso", None, 6)
            add_phrase("that was very interesting and I wasn't expecting it", "eso fue muy interesante y no estaba esperándolo", None, 7)
            add_phrase("I want to explain that I wasn't expecting it", "quiero explicar que no estaba esperándolo", None, 6)
            add_phrase("I'm not sure why I wasn't expecting it", "no estoy seguro por qué no estaba esperándolo", None, 7)
            add_phrase("That was very interesting, and I wasn't expecting it", "Eso fue muy interesante, y no estaba esperándolo", None, 7)

    # S0113: "¿Por qué no puedo recordar lo que dijiste?"
    elif seed_id == "S0113":
        if lego_id == "S0021L01":  # por qué
            add_phrase("why", "por qué", None, 1)
            add_phrase("why now", "por qué ahora", None, 2)
            add_phrase("I'm not sure why", "no estoy seguro por qué", None, 4)
            add_phrase("why can't I speak", "por qué no puedo hablar", None, 4)
            add_phrase("I want to know why", "quiero saber por qué", None, 4)
            add_phrase("why do I want to learn", "por qué quiero aprender", None, 5)
            add_phrase("why was that very interesting", "por qué fue eso muy interesante", None, 5)
            add_phrase("I'm not sure why I wasn't expecting it", "no estoy seguro por qué no estaba esperándolo", None, 7)
            add_phrase("why can't I remember what you said", "por qué no puedo recordar lo que dijiste", None, 7)
            add_phrase("I want to understand why our brain changes", "quiero comprender por qué nuestro cerebro cambia", None, 6)

        elif lego_id == "S0057L01":  # no puedo
            add_phrase("I can't", "no puedo", None, 1)
            add_phrase("I can't speak", "no puedo hablar", None, 2)
            add_phrase("I can't remember", "no puedo recordar", None, 2)
            add_phrase("I can't speak Spanish", "no puedo hablar español", None, 3)
            add_phrase("why can't I remember", "por qué no puedo recordar", None, 4)
            add_phrase("I can't remember something", "no puedo recordar algo", None, 3)
            add_phrase("I'm not sure why I can't speak", "no estoy seguro por qué no puedo hablar", None, 6)
            add_phrase("I can't remember what you said", "no puedo recordar lo que dijiste", None, 5)
            add_phrase("I can't remember that very well", "no puedo recordar eso muy bien", None, 5)
            add_phrase("I can't speak with you when I'm busy", "no puedo hablar contigo cuando estoy ocupado", None, 7)

        elif lego_id == "S0006L01":  # recordar
            add_phrase("to remember", "recordar", None, 1)
            add_phrase("I can't remember", "no puedo recordar", None, 2)
            add_phrase("I want to remember", "quiero recordar", None, 2)
            add_phrase("I'm trying to remember", "estoy intentando recordar", None, 3)
            add_phrase("I can't remember that", "no puedo recordar eso", None, 3)
            add_phrase("I want to remember something", "quiero recordar algo", None, 3)
            add_phrase("I'm trying to remember what you said", "estoy intentando recordar lo que dijiste", None, 5)
            add_phrase("why can't I remember something", "por qué no puedo recordar algo", None, 5)
            add_phrase("I want to be able to remember", "quiero poder recordar", None, 4)
            add_phrase("I can't remember when that was", "no puedo recordar cuando eso fue", None, 6)

        elif lego_id == "S0078L02":  # lo que dijiste
            add_phrase("what you said", "lo que dijiste", None, 1)
            add_phrase("I remember what you said", "recordar lo que dijiste", None, 3)
            add_phrase("I can't remember what you said", "no puedo recordar lo que dijiste", None, 4)
            add_phrase("I'm trying to remember what you said", "estoy intentando recordar lo que dijiste", None, 5)
            add_phrase("I want to understand what you said", "quiero comprender lo que dijiste", None, 4)
            add_phrase("why can't I remember what you said", "por qué no puedo recordar lo que dijiste", None, 6)
            add_phrase("I'm not sure if I remember what you said", "no estoy seguro si recordar lo que dijiste", None, 7)
            add_phrase("that was very interesting what you said", "eso fue muy interesante lo que dijiste", None, 6)
            add_phrase("I want to explain what you said", "quiero explicar lo que dijiste", None, 4)
            add_phrase("Why can't I remember what you said?", "¿Por qué no puedo recordar lo que dijiste?", None, 6)

    # S0114: "Siento como si estuviera haciendo peor hoy que ayer."
    elif seed_id == "S0114":
        if lego_id == "S0114L01":  # siento como si estuviera
            add_phrase("I feel as if I were", "siento como si estuviera", None, 1)
            add_phrase("I feel as if I were busy", "siento como si estuviera ocupado", None, 3)
            add_phrase("I feel as if I were learning", "siento como si estuviera aprender", None, 3)
            add_phrase("I feel as if I were ready", "siento como si estuviera preparado", None, 3)
            add_phrase("I feel as if I were doing better", "siento como si estuviera haciendo mejor", None, 4)
            add_phrase("I don't feel as if I were ready", "no siento como si estuviera preparado", None, 4)
            add_phrase("I feel as if I were trying to learn", "siento como si estuviera intentar aprender", None, 4)
            add_phrase("I feel as if I were doing worse today", "siento como si estuviera haciendo peor hoy", None, 5)
            add_phrase("I feel as if I were learning something new", "siento como si estuviera aprender algo nuevo", None, 5)
            add_phrase("I feel as if I were speaking Spanish with you", "siento como si estuviera hablar español contigo", None, 5)

        elif lego_id == "S0114L02":  # haciendo
            add_phrase("doing", "haciendo", None, 1)
            add_phrase("I'm doing", "estoy haciendo", None, 2)
            add_phrase("I'm doing better", "estoy haciendo mejor", None, 3)
            add_phrase("I feel as if I were doing better", "siento como si estuviera haciendo mejor", None, 4)
            add_phrase("I'm doing something new", "estoy haciendo algo nuevo", None, 4)
            add_phrase("I'm doing worse today", "estoy haciendo peor hoy", None, 4)
            add_phrase("I feel as if I were doing worse", "siento como si estuviera haciendo peor", None, 4)
            add_phrase("I'm doing better than yesterday", "estoy haciendo mejor que ayer", None, 5)
            add_phrase("I feel as if I were doing better today", "siento como si estuviera haciendo mejor hoy", None, 5)
            add_phrase("I'm not sure what I'm doing", "no estoy seguro lo que estoy haciendo", None, 6)

        elif lego_id == "S0114L03":  # peor
            add_phrase("worse", "peor", None, 1)
            add_phrase("doing worse", "haciendo peor", None, 2)
            add_phrase("I'm doing worse", "estoy haciendo peor", None, 3)
            add_phrase("I'm doing worse today", "estoy haciendo peor hoy", None, 4)
            add_phrase("I feel as if I were doing worse", "siento como si estuviera haciendo peor", None, 4)
            add_phrase("I'm doing worse than yesterday", "estoy haciendo peor que ayer", None, 5)
            add_phrase("I feel as if I were doing worse today", "siento como si estuviera haciendo peor hoy", None, 5)
            add_phrase("I'm not sure if I'm doing worse", "no estoy seguro si estoy haciendo peor", None, 6)
            add_phrase("why am I doing worse today", "por qué estoy haciendo peor hoy", None, 6)
            add_phrase("I don't feel as if I were doing worse", "no siento como si estuviera haciendo peor", None, 6)

        elif lego_id == "S0007L03":  # hoy
            add_phrase("today", "hoy", None, 1)
            add_phrase("I can't today", "no puedo hoy", None, 3)
            add_phrase("I'm doing worse today", "estoy haciendo peor hoy", None, 4)
            add_phrase("I feel better today", "me siento mejor hoy", None, 4)
            add_phrase("I'm trying to learn something today", "estoy intentando aprender algo hoy", None, 5)
            add_phrase("I feel as if I were doing worse today", "siento como si estuviera haciendo peor hoy", None, 5)
            add_phrase("I can't speak with you today", "no puedo hablar contigo hoy", None, 5)
            add_phrase("I'm doing better today than yesterday", "estoy haciendo mejor hoy que ayer", None, 6)
            add_phrase("I wasn't expecting it today", "no estaba esperándolo hoy", None, 4)
            add_phrase("I want to learn something new today", "quiero aprender algo nuevo hoy", None, 6)

        elif lego_id == "S0114L04":  # que ayer
            add_phrase("than yesterday", "que ayer", None, 1)
            add_phrase("better than yesterday", "mejor que ayer", None, 2)
            add_phrase("worse than yesterday", "peor que ayer", None, 2)
            add_phrase("I'm doing better than yesterday", "estoy haciendo mejor que ayer", None, 4)
            add_phrase("I'm doing worse than yesterday", "estoy haciendo peor que ayer", None, 4)
            add_phrase("I feel better today than yesterday", "me siento mejor hoy que ayer", None, 5)
            add_phrase("I'm doing something different than yesterday", "estoy haciendo algo diferente que ayer", None, 5)
            add_phrase("I feel as if I were doing better than yesterday", "siento como si estuviera haciendo mejor que ayer", None, 6)
            add_phrase("I'm speaking better today than yesterday", "estoy hablar mejor hoy que ayer", None, 6)
            add_phrase("I feel as if I'm doing worse today than yesterday", "Siento como si estuviera haciendo peor hoy que ayer", None, 6)

    # S0115: "No siento como si estuviera preparado para tener una conversación."
    elif seed_id == "S0115":
        if lego_id == "S0115L01":  # no siento como si estuviera
            add_phrase("I don't feel as if I were", "no siento como si estuviera", None, 1)
            add_phrase("I don't feel as if I were ready", "no siento como si estuviera preparado", None, 3)
            add_phrase("I don't feel as if I were learning", "no siento como si estuviera aprender", None, 3)
            add_phrase("I don't feel as if I were doing better", "no siento como si estuviera haciendo mejor", None, 4)
            add_phrase("I don't feel as if I were speaking well", "no siento como si estuviera hablar bien", None, 4)
            add_phrase("I don't feel as if I were ready to speak", "no siento como si estuviera preparado hablar", None, 4)
            add_phrase("I don't feel as if I were doing worse today", "no siento como si estuviera haciendo peor hoy", None, 5)
            add_phrase("I don't feel as if I were ready for that", "no siento como si estuviera preparado para eso", None, 5)
            add_phrase("I don't feel as if I were learning something new", "no siento como si estuviera aprender algo nuevo", None, 5)
            add_phrase("I don't feel as if I were ready to have a conversation", "no siento como si estuviera preparado para tener una conversación", None, 6)

        elif lego_id == "S0026L05":  # preparado
            add_phrase("ready", "preparado", None, 1)
            add_phrase("I'm ready", "estoy preparado", None, 2)
            add_phrase("I'm not ready", "no estoy preparado", None, 3)
            add_phrase("I feel as if I were ready", "siento como si estuviera preparado", None, 3)
            add_phrase("I don't feel as if I were ready", "no siento como si estuviera preparado", None, 3)
            add_phrase("I'm ready to learn", "estoy preparado aprender", None, 3)
            add_phrase("I'm not ready to speak", "no estoy preparado hablar", None, 4)
            add_phrase("I don't feel ready to have a conversation", "no siento preparado para tener una conversación", None, 5)
            add_phrase("I feel as if I were ready to learn something new", "siento como si estuviera preparado aprender algo nuevo", None, 6)
            add_phrase("I'm not ready to speak Spanish with you", "no estoy preparado hablar español contigo", None, 6)

        elif lego_id == "S0115L02":  # para tener
            add_phrase("to have", "para tener", None, 1)
            add_phrase("I want to have", "quiero para tener", None, 3)
            add_phrase("I'm ready to have", "estoy preparado para tener", None, 3)
            add_phrase("to have a conversation", "para tener una conversación", None, 3)
            add_phrase("I'm not ready to have a conversation", "no estoy preparado para tener una conversación", None, 5)
            add_phrase("I want to be ready to have a conversation", "quiero estar preparado para tener una conversación", None, 6)
            add_phrase("I don't feel ready to have a conversation", "no siento preparado para tener una conversación", None, 5)
            add_phrase("I'm trying to be ready to have a conversation", "estoy intentando estar preparado para tener una conversación", None, 6)
            add_phrase("I don't feel as if I were ready to have a conversation", "no siento como si estuviera preparado para tener una conversación", None, 6)
            add_phrase("I want to have a conversation with you", "quiero para tener una conversación contigo", None, 5)

        elif lego_id == "S0115L03":  # una conversación
            add_phrase("a conversation", "una conversación", None, 1)
            add_phrase("to have a conversation", "para tener una conversación", None, 2)
            add_phrase("I want a conversation", "quiero una conversación", None, 3)
            add_phrase("I'm ready to have a conversation", "estoy preparado para tener una conversación", None, 4)
            add_phrase("I want to have a conversation", "quiero para tener una conversación", None, 4)
            add_phrase("I'm not ready to have a conversation", "no estoy preparado para tener una conversación", None, 5)
            add_phrase("I don't feel ready to have a conversation", "no siento preparado para tener una conversación", None, 5)
            add_phrase("I want to have a conversation with you", "quiero para tener una conversación contigo", None, 5)
            add_phrase("I'm trying to have a conversation in Spanish", "estoy intentando para tener una conversación en español", None, 6)
            add_phrase("I don't feel as if I'm ready to have a conversation", "No siento como si estuviera preparado para tener una conversación", None, 6)

    # S0116: "Esta no es la mejor opción que podría hacer."
    elif seed_id == "S0116":
        if lego_id == "S0116L01":  # esta
            add_phrase("this", "esta", None, 1)
            add_phrase("this is", "esta es", None, 2)
            add_phrase("this is good", "esta es bueno", None, 3)
            add_phrase("this is something new", "esta es algo nuevo", None, 4)
            add_phrase("I want this", "quiero esta", None, 2)
            add_phrase("I'm trying to learn this", "estoy intentando aprender esta", None, 4)
            add_phrase("this is the best choice", "esta es la mejor opción", None, 5)
            add_phrase("this isn't the best choice", "esta no es la mejor opción", None, 6)
            add_phrase("I'm not sure if this is good", "no estoy seguro si esta es bueno", None, 7)
            add_phrase("this is very interesting and new", "esta es muy interesante y nuevo", None, 6)

        elif lego_id == "S0116L02":  # no es
            add_phrase("isn't", "no es", None, 1)
            add_phrase("this isn't", "esta no es", None, 2)
            add_phrase("that isn't good", "eso no es bueno", None, 4)
            add_phrase("this isn't the best", "esta no es la mejor", None, 5)
            add_phrase("that isn't very interesting", "eso no es muy interesante", None, 5)
            add_phrase("this isn't something new", "esta no es algo nuevo", None, 5)
            add_phrase("this isn't the best choice", "esta no es la mejor opción", None, 6)
            add_phrase("that isn't what I want", "eso no es lo que quiero", None, 6)
            add_phrase("I'm not sure if this isn't good", "no estoy seguro si esta no es bueno", None, 8)
            add_phrase("this isn't ready", "esta no es preparado", None, 3)

        elif lego_id == "S0116L03":  # la mejor opción
            add_phrase("the best choice", "la mejor opción", None, 1)
            add_phrase("this is the best choice", "esta es la mejor opción", None, 4)
            add_phrase("that isn't the best choice", "eso no es la mejor opción", None, 5)
            add_phrase("this isn't the best choice", "esta no es la mejor opción", None, 5)
            add_phrase("I want the best choice", "quiero la mejor opción", None, 4)
            add_phrase("I'm trying to find the best choice", "estoy intentando encontrar la mejor opción", None, 5)
            add_phrase("that was the best choice", "eso fue la mejor opción", None, 5)
            add_phrase("I'm not sure if this is the best choice", "no estoy seguro si esta es la mejor opción", None, 8)
            add_phrase("I want to make the best choice", "quiero hacer la mejor opción", None, 5)
            add_phrase("this isn't the best choice I could make", "esta no es la mejor opción que podría hacer", None, 8)

        elif lego_id == "S0116L04":  # que podría hacer
            add_phrase("I could make", "que podría hacer", None, 1)
            add_phrase("something I could make", "algo que podría hacer", None, 3)
            add_phrase("the choice I could make", "la opción que podría hacer", None, 4)
            add_phrase("the best choice I could make", "la mejor opción que podría hacer", None, 5)
            add_phrase("this is something I could make", "esta es algo que podría hacer", None, 6)
            add_phrase("this isn't the best choice I could make", "esta no es la mejor opción que podría hacer", None, 7)
            add_phrase("I want the best choice I could make", "quiero la mejor opción que podría hacer", None, 6)
            add_phrase("that was the best choice I could make", "eso fue la mejor opción que podría hacer", None, 7)
            add_phrase("I'm trying to make the best choice I could make", "estoy intentando hacer la mejor opción que podría hacer", None, 8)
            add_phrase("This isn't the best choice I could make", "Esta no es la mejor opción que podría hacer", None, 7)

    # S0117: "Definitivamente lo estoy haciendo mejor que la última vez que hablamos."
    elif seed_id == "S0117":
        if lego_id == "S0117L01":  # definitivamente
            add_phrase("definitely", "definitivamente", None, 1)
            add_phrase("definitely better", "definitivamente mejor", None, 2)
            add_phrase("I'm definitely ready", "estoy definitivamente preparado", None, 3)
            add_phrase("I definitely want to learn", "definitivamente quiero aprender", None, 4)
            add_phrase("I'm definitely doing better", "estoy definitivamente haciendo mejor", None, 4)
            add_phrase("that was definitely interesting", "eso fue definitivamente interesante", None, 4)
            add_phrase("I'm definitely doing better today", "estoy definitivamente haciendo mejor hoy", None, 5)
            add_phrase("I definitely feel as if I were ready", "definitivamente siento como si estuviera preparado", None, 5)
            add_phrase("that was definitely the best choice", "eso fue definitivamente la mejor opción", None, 6)
            add_phrase("I definitely want to have a conversation", "definitivamente quiero para tener una conversación", None, 5)

        elif lego_id == "S0117L02":  # lo estoy haciendo
            add_phrase("I'm doing it", "lo estoy haciendo", None, 1)
            add_phrase("I'm doing it better", "lo estoy haciendo mejor", None, 3)
            add_phrase("I'm definitely doing it", "definitivamente lo estoy haciendo", None, 3)
            add_phrase("I'm doing it today", "lo estoy haciendo hoy", None, 3)
            add_phrase("I'm doing it better than yesterday", "lo estoy haciendo mejor que ayer", None, 5)
            add_phrase("I'm definitely doing it better", "definitivamente lo estoy haciendo mejor", None, 4)
            add_phrase("I'm doing it worse than before", "lo estoy haciendo peor que antes", None, 5)
            add_phrase("I feel as if I were doing it better", "siento como si estuviera lo haciendo mejor", None, 6)
            add_phrase("I'm not sure if I'm doing it well", "no estoy seguro si lo estoy haciendo bien", None, 7)
            add_phrase("I'm doing it better than last time", "lo estoy haciendo mejor que la última vez", None, 6)

        elif lego_id == "S0029L02":  # mejor
            add_phrase("better", "mejor", None, 1)
            add_phrase("much better", "mucho mejor", None, 2)
            add_phrase("I'm doing better", "estoy haciendo mejor", None, 3)
            add_phrase("I feel better today", "me siento mejor hoy", None, 4)
            add_phrase("I'm definitely doing better", "estoy definitivamente haciendo mejor", None, 4)
            add_phrase("I'm doing it better than yesterday", "lo estoy haciendo mejor que ayer", None, 5)
            add_phrase("I'm doing better today than yesterday", "estoy haciendo mejor hoy que ayer", None, 6)
            add_phrase("I feel better than I felt yesterday", "me siento mejor que como me sentía ayer", None, 7)
            add_phrase("that was definitely better than before", "eso fue definitivamente mejor que antes", None, 6)
            add_phrase("I'm doing it better than last time", "lo estoy haciendo mejor que la última vez", None, 6)

        elif lego_id == "S0117L03":  # que la última vez
            add_phrase("than last time", "que la última vez", None, 1)
            add_phrase("better than last time", "mejor que la última vez", None, 3)
            add_phrase("I'm doing better than last time", "estoy haciendo mejor que la última vez", None, 5)
            add_phrase("I'm definitely doing better than last time", "estoy definitivamente haciendo mejor que la última vez", None, 6)
            add_phrase("I'm doing it better than last time", "lo estoy haciendo mejor que la última vez", None, 5)
            add_phrase("that was better than last time", "eso fue mejor que la última vez", None, 6)
            add_phrase("I feel better than last time", "me siento mejor que la última vez", None, 5)
            add_phrase("I'm speaking better than last time", "estoy hablar mejor que la última vez", None, 5)
            add_phrase("this is definitely better than last time", "esta es definitivamente mejor que la última vez", None, 7)
            add_phrase("I wasn't expecting it last time", "no estaba esperándolo la última vez", None, 5)

        elif lego_id == "S0117L04":  # que hablamos
            add_phrase("we talked", "que hablamos", None, 1)
            add_phrase("when we talked", "cuando que hablamos", None, 2)
            add_phrase("last time we talked", "la última vez que hablamos", None, 4)
            add_phrase("better than last time we talked", "mejor que la última vez que hablamos", None, 6)
            add_phrase("I remember when we talked", "recordar cuando que hablamos", None, 3)
            add_phrase("I'm doing better than last time we talked", "estoy haciendo mejor que la última vez que hablamos", None, 7)
            add_phrase("that was interesting when we talked", "eso fue interesante cuando que hablamos", None, 5)
            add_phrase("I wasn't expecting it when we talked", "no estaba esperándolo cuando que hablamos", None, 5)
            add_phrase("I was doing worse last time we talked", "estaba haciendo peor la última vez que hablamos", None, 7)
            add_phrase("I'm definitely doing better than last time we talked", "Definitivamente lo estoy haciendo mejor que la última vez que hablamos", None, 8)

    # S0118: "Me siento mejor que como me sentía cuando estábamos en el pub."
    elif seed_id == "S0118":
        if lego_id == "S0041L01":  # me siento
            add_phrase("I feel", "me siento", None, 1)
            add_phrase("I feel better", "me siento mejor", None, 2)
            add_phrase("I feel ready", "me siento preparado", None, 2)
            add_phrase("I feel better today", "me siento mejor hoy", None, 3)
            add_phrase("I don't feel ready", "no me siento preparado", None, 3)
            add_phrase("I feel better than yesterday", "me siento mejor que ayer", None, 4)
            add_phrase("I feel much better now", "me siento mucho mejor ahora", None, 4)
            add_phrase("I feel better than last time", "me siento mejor que la última vez", None, 5)
            add_phrase("I don't feel as if I were ready", "no me siento como si estuviera preparado", None, 5)
            add_phrase("I feel better today than yesterday", "me siento mejor hoy que ayer", None, 6)

        elif lego_id == "S0029L02":  # mejor (revisit)
            add_phrase("better", "mejor", None, 1)
            add_phrase("I feel better", "me siento mejor", None, 2)
            add_phrase("doing better", "haciendo mejor", None, 2)
            add_phrase("I'm doing much better", "estoy haciendo mucho mejor", None, 4)
            add_phrase("I feel better than yesterday", "me siento mejor que ayer", None, 4)
            add_phrase("I'm definitely doing better", "definitivamente estoy haciendo mejor", None, 4)
            add_phrase("I'm doing it better now", "lo estoy haciendo mejor ahora", None, 5)
            add_phrase("I feel better than I felt before", "me siento mejor que como me sentía antes", None, 7)
            add_phrase("I'm doing better than last time we talked", "estoy haciendo mejor que la última vez que hablamos", None, 8)
            add_phrase("that was definitely better", "eso fue definitivamente mejor", None, 4)

        elif lego_id == "S0118L01":  # que como me sentía
            add_phrase("than I felt", "que como me sentía", None, 1)
            add_phrase("better than I felt", "mejor que como me sentía", None, 3)
            add_phrase("I feel better than I felt", "me siento mejor que como me sentía", None, 4)
            add_phrase("much better than I felt", "mucho mejor que como me sentía", None, 4)
            add_phrase("I feel better than I felt yesterday", "me siento mejor que como me sentía ayer", None, 5)
            add_phrase("I'm doing better than I felt before", "estoy haciendo mejor que como me sentía antes", None, 6)
            add_phrase("I definitely feel better than I felt", "definitivamente me siento mejor que como me sentía", None, 5)
            add_phrase("I feel better than I felt last time", "me siento mejor que como me sentía la última vez", None, 7)
            add_phrase("I wasn't expecting to feel better than I felt", "no estaba esperando me siento mejor que como me sentía", None, 8)
            add_phrase("I feel much better than I felt", "me siento mucho mejor que como me sentía", None, 5)

        elif lego_id == "S0034L03":  # cuando (revisit)
            add_phrase("when", "cuando", None, 1)
            add_phrase("when I learn", "cuando aprender", None, 2)
            add_phrase("I feel better when I speak", "me siento mejor cuando hablar", None, 5)
            add_phrase("when we talked", "cuando hablamos", None, 2)
            add_phrase("I remember when we talked", "recordar cuando hablamos", None, 3)
            add_phrase("I felt better when we talked", "me sentía mejor cuando hablamos", None, 5)
            add_phrase("I was doing worse when we talked", "estaba haciendo peor cuando hablamos", None, 5)
            add_phrase("when we were learning something new", "cuando estábamos aprender algo nuevo", None, 5)
            add_phrase("I wasn't expecting it when we talked", "no estaba esperándolo cuando hablamos", None, 5)
            add_phrase("I felt better when we were in the pub", "me sentía mejor cuando estábamos en el pub", None, 7)

        elif lego_id == "S0118L02":  # estábamos
            add_phrase("we were", "estábamos", None, 1)
            add_phrase("when we were", "cuando estábamos", None, 2)
            add_phrase("we were learning", "estábamos aprender", None, 2)
            add_phrase("when we were learning", "cuando estábamos aprender", None, 3)
            add_phrase("we were in the pub", "estábamos en el pub", None, 4)
            add_phrase("when we were in the pub", "cuando estábamos en el pub", None, 5)
            add_phrase("we were talking about something", "estábamos hablar de algo", None, 4)
            add_phrase("I felt better when we were together", "me sentía mejor cuando estábamos juntos", None, 6)
            add_phrase("we were learning something new", "estábamos aprender algo nuevo", None, 4)
            add_phrase("I remember when we were in the pub", "recordar cuando estábamos en el pub", None, 6)

        elif lego_id == "S0118L03":  # en el pub
            add_phrase("in the pub", "en el pub", None, 1)
            add_phrase("we were in the pub", "estábamos en el pub", None, 3)
            add_phrase("when we were in the pub", "cuando estábamos en el pub", None, 4)
            add_phrase("I was ready in the pub", "estaba preparado en el pub", None, 5)
            add_phrase("I felt better in the pub", "me sentía mejor en el pub", None, 5)
            add_phrase("we were talking in the pub", "estábamos hablar en el pub", None, 5)
            add_phrase("I remember when we were in the pub", "recordar cuando estábamos en el pub", None, 6)
            add_phrase("that was interesting when we were in the pub", "eso fue interesante cuando estábamos en el pub", None, 7)
            add_phrase("I feel better than I felt when we were in the pub", "me siento mejor que como me sentía cuando estábamos en el pub", None, 9)
            add_phrase("I feel better than I felt when we were in the pub", "Me siento mejor que como me sentía cuando estábamos en el pub", None, 9)

    # S0119: "¿Puedo preguntarte algo antes de que te vayas?"
    elif seed_id == "S0119":
        if lego_id == "S0010L03":  # puedo
            add_phrase("I can", "puedo", None, 1)
            add_phrase("I can speak", "puedo hablar", None, 2)
            add_phrase("I can learn", "puedo aprender", None, 2)
            add_phrase("I can speak Spanish", "puedo hablar español", None, 3)
            add_phrase("I can remember that", "puedo recordar eso", None, 3)
            add_phrase("I can do better", "puedo hacer mejor", None, 3)
            add_phrase("I can ask you something", "puedo preguntarte algo", None, 3)
            add_phrase("I can speak with you now", "puedo hablar contigo ahora", None, 4)
            add_phrase("I can ask you something before you leave", "puedo preguntarte algo antes de que te vayas", None, 6)
            add_phrase("I feel as if I can learn something new", "siento como si puedo aprender algo nuevo", None, 7)

        elif lego_id == "S0030L02":  # preguntarte
            add_phrase("to ask you", "preguntarte", None, 1)
            add_phrase("I want to ask you", "quiero preguntarte", None, 3)
            add_phrase("I can ask you", "puedo preguntarte", None, 2)
            add_phrase("I want to ask you something", "quiero preguntarte algo", None, 4)
            add_phrase("I can ask you something", "puedo preguntarte algo", None, 3)
            add_phrase("I'm trying to ask you", "estoy intentando preguntarte", None, 3)
            add_phrase("I need to ask you something", "necesito preguntarte algo", None, 4)
            add_phrase("I want to ask you before you leave", "quiero preguntarte antes de que te vayas", None, 6)
            add_phrase("Can I ask you something now", "puedo preguntarte algo ahora", None, 4)
            add_phrase("I can ask you something before you leave", "puedo preguntarte algo antes de que te vayas", None, 6)

        elif lego_id == "S0004L02":  # algo (revisit)
            add_phrase("something", "algo", None, 1)
            add_phrase("I want something", "quiero algo", None, 2)
            add_phrase("something new", "algo nuevo", None, 2)
            add_phrase("to ask you something", "preguntarte algo", None, 2)
            add_phrase("I can ask you something", "puedo preguntarte algo", None, 3)
            add_phrase("I'm learning something", "estoy aprender algo", None, 3)
            add_phrase("I want to learn something new", "quiero aprender algo nuevo", None, 4)
            add_phrase("Can I ask you something before you leave", "puedo preguntarte algo antes de que te vayas", None, 6)
            add_phrase("I'm trying to remember something important", "estoy intentando recordar algo importante", None, 5)
            add_phrase("I feel better when I learn something new", "me siento mejor cuando aprender algo nuevo", None, 7)

        elif lego_id == "S0119L01":  # antes de que te vayas
            add_phrase("before you leave", "antes de que te vayas", None, 1)
            add_phrase("I want to ask before you leave", "quiero preguntar antes de que te vayas", None, 5)
            add_phrase("Can I speak before you leave", "puedo hablar antes de que te vayas", None, 5)
            add_phrase("I want to speak with you before you leave", "quiero hablar contigo antes de que te vayas", None, 6)
            add_phrase("Can I ask you something before you leave", "puedo preguntarte algo antes de que te vayas", None, 5)
            add_phrase("I need to tell you before you leave", "necesito decirte antes de que te vayas", None, 5)
            add_phrase("I want to explain something before you leave", "quiero explicar algo antes de que te vayas", None, 6)
            add_phrase("I'm trying to remember before you leave", "estoy intentando recordar antes de que te vayas", None, 5)
            add_phrase("I feel as if I need to speak before you leave", "siento como si necesito hablar antes de que te vayas", None, 9)
            add_phrase("Can I ask you something before you leave?", "¿Puedo preguntarte algo antes de que te vayas?", None, 5)

    # S0120: "Es interesante que te guste ir en autobús."
    elif seed_id == "S0120":
        if lego_id == "S0058L01":  # es interesante
            add_phrase("it's interesting", "es interesante", None, 1)
            add_phrase("it's very interesting", "es muy interesante", None, 2)
            add_phrase("that's interesting", "eso es interesante", None, 2)
            add_phrase("it's interesting that", "es interesante que", None, 2)
            add_phrase("it's interesting when we learn", "es interesante cuando aprendemos", None, 4)
            add_phrase("it's very interesting that you said that", "es muy interesante que dijiste eso", None, 6)
            add_phrase("it's interesting that we were learning", "es interesante que estábamos aprender", None, 5)
            add_phrase("it's interesting when our brain changes", "es interesante cuando nuestro cerebro cambia", None, 5)
            add_phrase("that was very interesting", "eso fue muy interesante", None, 4)
            add_phrase("it's interesting that you like that", "es interesante que te guste eso", None, 5)

        elif lego_id == "S0120L01":  # que te guste
            add_phrase("that you like", "que te guste", None, 1)
            add_phrase("it's interesting that you like", "es interesante que te guste", None, 3)
            add_phrase("I know that you like", "sé que te guste", None, 3)
            add_phrase("that you like something", "que te guste algo", None, 3)
            add_phrase("it's interesting that you like that", "es interesante que te guste eso", None, 4)
            add_phrase("I'm glad that you like it", "me alegro que te guste", None, 5)
            add_phrase("it's good that you like learning", "es bueno que te guste aprender", None, 5)
            add_phrase("I wasn't expecting that you like it", "no estaba esperando que te guste", None, 5)
            add_phrase("it's interesting that you like to go", "es interesante que te guste ir", None, 5)
            add_phrase("it's very interesting that you like speaking Spanish", "es muy interesante que te guste hablar español", None, 7)

        elif lego_id == "S0093L02":  # ir
            add_phrase("to go", "ir", None, 1)
            add_phrase("I want to go", "quiero ir", None, 3)
            add_phrase("I'm trying to go", "estoy intentando ir", None, 3)
            add_phrase("I can go now", "puedo ir ahora", None, 3)
            add_phrase("you like to go", "te guste ir", None, 3)
            add_phrase("I need to go", "necesito ir", None, 3)
            add_phrase("I'm ready to go with you", "estoy preparado ir contigo", None, 4)
            add_phrase("I want to go to the pub", "quiero ir al pub", None, 5)
            add_phrase("it's interesting that you like to go", "es interesante que te guste ir", None, 5)
            add_phrase("Can I go before you leave", "puedo ir antes de que te vayas", None, 6)

        elif lego_id == "S0120L02":  # en autobús
            add_phrase("by bus", "en autobús", None, 1)
            add_phrase("to go by bus", "ir en autobús", None, 2)
            add_phrase("I want to go by bus", "quiero ir en autobús", None, 4)
            add_phrase("you like to go by bus", "te guste ir en autobús", None, 4)
            add_phrase("I'm going by bus today", "estoy ir en autobús hoy", None, 5)
            add_phrase("it's interesting to go by bus", "es interesante ir en autobús", None, 4)
            add_phrase("I can go by bus with you", "puedo ir en autobús contigo", None, 5)
            add_phrase("it's interesting that you like to go by bus", "es interesante que te guste ir en autobús", None, 6)
            add_phrase("I prefer to go by bus than walking", "prefiero ir en autobús que caminar", None, 7)
            add_phrase("It's interesting that you like to go by bus", "Es interesante que te guste ir en autobús", None, 6)

    return phrases


def generate_all_baskets():
    """Generate baskets for all seeds S0111-S0120"""

    output = {
        "version": "curated_v6_molecular_lego",
        "course_direction": "Spanish for English speakers",
        "mapping": "KNOWN (English) → TARGET (Spanish)",
        "agent_id": 2,
        "agent_name": "agent_02",
        "seed_range": "S0111-S0120",
        "generation_metadata": {
            "curated_at": datetime.now(timezone.utc).isoformat(),
            "curated_by": "Claude Code - Agent 02 basket generation",
            "specification": "phase_5_conversational_baskets_v3_ACTIVE.md",
            "total_seeds": 10,
            "total_legos": 0,
            "total_phrases": 0
        }
    }

    total_legos = 0
    total_phrases = 0

    for seed_info in seeds_data['seeds']:
        seed_id = seed_info['seed_id']
        seed_pair = seed_info['seed_pair']
        legos = seed_info['legos']
        cumulative_legos = seed_info['cumulative_legos']

        print(f"\nGenerating baskets for {seed_id}...")

        # Add seed-level information
        output[seed_id] = {
            "seed_pair": seed_pair,
            "cumulative_legos": cumulative_legos,
            "legos": {}
        }

        for i, lego_data in enumerate(legos):
            lego_id = lego_data['id']
            is_final_lego = (i == len(legos) - 1)

            # Build whitelist up to this LEGO
            whitelist = build_whitelist_up_to(lego_id)

            print(f"  Generating for {lego_id} ({whitelist['count']} LEGOs available)...")

            # Generate phrases
            phrases = generate_phrases_for_lego(
                seed_id=seed_id,
                lego_data=lego_data,
                all_legos_in_seed=legos,
                is_final_lego=is_final_lego,
                seed_sentence_target=seed_pair['target'],
                seed_sentence_known=seed_pair['known'],
                whitelist=whitelist
            )

            # Count distribution
            dist = {"really_short_1_2": 0, "quite_short_3": 0, "longer_4_5": 0, "long_6_plus": 0}
            for p in phrases:
                count = p[3]
                if count <= 2:
                    dist["really_short_1_2"] += 1
                elif count == 3:
                    dist["quite_short_3"] += 1
                elif count <= 5:
                    dist["longer_4_5"] += 1
                else:
                    dist["long_6_plus"] += 1

            # Get LEGO registry info
            reg_lego = get_lego_by_id(lego_id)

            # Add to output
            output[seed_id]["legos"][lego_id] = {
                "lego": [lego_data['known'], lego_data['target']],
                "type": lego_data['type'],
                "available_legos": whitelist['count'],
                "practice_phrases": phrases,
                "phrase_distribution": dist,
                "gate_compliance": f"STRICT - All words from S0001-{seed_id} LEGOs only"
            }

            total_legos += 1
            total_phrases += len(phrases)

            print(f"    Generated {len(phrases)} phrases - Distribution: {dist}")

    output["generation_metadata"]["total_legos"] = total_legos
    output["generation_metadata"]["total_phrases"] = total_phrases

    return output


if __name__ == "__main__":
    print("Starting basket generation for S0111-S0120...")
    print("="*70)

    baskets = generate_all_baskets()

    # Save output
    output_path = "phase5_batch1_s0101_s0300/batch_output/agent_02_baskets.json"
    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(baskets, f, ensure_ascii=False, indent=2)

    print("\n" + "="*70)
    print(f"✓ Agent 02 complete: {baskets['generation_metadata']['total_seeds']} seeds, "
          f"{baskets['generation_metadata']['total_legos']} LEGOs, "
          f"{baskets['generation_metadata']['total_phrases']} phrases generated")
    print(f"✓ Output saved to: {output_path}")
