#!/usr/bin/env python3
"""
Submit baskets for seeds S0024 and S0025 to the new endpoint.
"""

import requests
import json
import urllib3

# Suppress SSL warnings since we're using verify=False
urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

# Endpoint URL
URL = "https://mirthlessly-nonanesthetized-marilyn.ngrok-free.dev/upload-basket"

# S0024 baskets
S0024_BASKETS = {
    "S0024L02": {
        "lego_id": "S0024L02",
        "practice_phrases": [
            {"known": "I'm not going to be able to speak.", "target": "我不会说。", "syllable_count": 4, "word_count": 4, "lego_count": 2, "position": 1},
            {"known": "I'm not going to be able to learn.", "target": "我不会学。", "syllable_count": 4, "word_count": 4, "lego_count": 2, "position": 2},
            {"known": "I'm not going to be able to speak Chinese.", "target": "我不会说中文。", "syllable_count": 6, "word_count": 6, "lego_count": 2, "position": 3},
            {"known": "I'm not going to be able to remember.", "target": "我不会记住。", "syllable_count": 5, "word_count": 5, "lego_count": 3, "position": 4},
            {"known": "I'm not going to be able to remember now.", "target": "我现在不会记住。", "syllable_count": 7, "word_count": 7, "lego_count": 3, "position": 5},
            {"known": "I'm not going to be able to speak with you.", "target": "我不会和你说话。", "syllable_count": 7, "word_count": 7, "lego_count": 2, "position": 6},
            {"known": "I'm not going to be able to meet you tomorrow.", "target": "我明天不会见你。", "syllable_count": 7, "word_count": 7, "lego_count": 2, "position": 7},
            {"known": "I'm not going to be able to speak Chinese with you.", "target": "我不会跟你说中文。", "syllable_count": 8, "word_count": 8, "lego_count": 2, "position": 8},
            {"known": "I'm not going to be able to remember the whole sentence.", "target": "我不会记住整句话。", "syllable_count": 8, "word_count": 8, "lego_count": 3, "position": 9},
            {"known": "I'm not going to be able to remember easily.", "target": "我不会轻易记住。", "syllable_count": 7, "word_count": 7, "lego_count": 4, "position": 10}
        ]
    },
    "S0024L03": {
        "lego_id": "S0024L03",
        "practice_phrases": [
            {"known": "I remember easily.", "target": "我轻易记住。", "syllable_count": 5, "word_count": 5, "lego_count": 3, "position": 1},
            {"known": "You learn easily.", "target": "你轻易学。", "syllable_count": 4, "word_count": 4, "lego_count": 1, "position": 2},
            {"known": "I speak Chinese easily.", "target": "我轻易说中文。", "syllable_count": 6, "word_count": 6, "lego_count": 2, "position": 3},
            {"known": "I learn easily now.", "target": "我现在轻易学。", "syllable_count": 6, "word_count": 6, "lego_count": 2, "position": 4},
            {"known": "I don't learn easily.", "target": "我不轻易学。", "syllable_count": 5, "word_count": 5, "lego_count": 2, "position": 5},
            {"known": "You don't remember easily.", "target": "你不轻易记住。", "syllable_count": 6, "word_count": 6, "lego_count": 2, "position": 6},
            {"known": "I don't remember easily.", "target": "我不轻易记住。", "syllable_count": 6, "word_count": 6, "lego_count": 3, "position": 7},
            {"known": "I'm not going to be able to speak Chinese easily.", "target": "我不会轻易说中文。", "syllable_count": 8, "word_count": 8, "lego_count": 3, "position": 8},
            {"known": "You don't want to remember easily.", "target": "你不想轻易记住。", "syllable_count": 7, "word_count": 7, "lego_count": 2, "position": 9},
            {"known": "I'm not going to be able to remember easily.", "target": "我不会轻易记住。", "syllable_count": 7, "word_count": 7, "lego_count": 4, "position": 10}
        ]
    },
    "S0024L04": {
        "lego_id": "S0024L04",
        "practice_phrases": [
            {"known": "I remember", "target": "我记住", "syllable_count": 3, "word_count": 3, "lego_count": 2, "position": 1},
            {"known": "You want remember", "target": "你想记住", "syllable_count": 4, "word_count": 4, "lego_count": 1, "position": 2},
            {"known": "I want remember this", "target": "我想记住这个", "syllable_count": 6, "word_count": 6, "lego_count": 2, "position": 3},
            {"known": "You want remember her name", "target": "你想记住她的名字", "syllable_count": 8, "word_count": 8, "lego_count": 1, "position": 4},
            {"known": "I not going to remember", "target": "我不会记住", "syllable_count": 5, "word_count": 5, "lego_count": 3, "position": 5},
            {"known": "I want remember his name", "target": "我想记住他的名字", "syllable_count": 8, "word_count": 8, "lego_count": 2, "position": 6},
            {"known": "I want learn remember Chinese", "target": "我想学记住中文", "syllable_count": 7, "word_count": 7, "lego_count": 2, "position": 7},
            {"known": "I not going to remember her name easily", "target": "我不会轻易记住她的名字", "syllable_count": 11, "word_count": 11, "lego_count": 4, "position": 8},
            {"known": "I want remember people speak Chinese", "target": "我想记住说中文的人", "syllable_count": 9, "word_count": 9, "lego_count": 2, "position": 9},
            {"known": "You want start remember talking in Chinese soon", "target": "你想很快开始记住用中文说话", "syllable_count": 13, "word_count": 13, "lego_count": 1, "position": 10},
            {"known": "I'm not going to be able to remember easily.", "target": "我不会轻易记住。", "syllable_count": 7, "word_count": 7, "lego_count": 4, "position": 11}
        ]
    }
}

# S0025 baskets
S0025_BASKETS = {
    "S0025L03": {
        "lego_id": "S0025L03",
        "practice_phrases": [
            {"known": "I help you.", "target": "我帮你。", "syllable_count": 3, "word_count": 3, "lego_count": 4, "position": 1},
            {"known": "You help me.", "target": "你帮我。", "syllable_count": 3, "word_count": 3, "lego_count": 4, "position": 2},
            {"known": "I want to help.", "target": "我想帮。", "syllable_count": 3, "word_count": 3, "lego_count": 3, "position": 3},
            {"known": "You help me now.", "target": "你现在帮我。", "syllable_count": 5, "word_count": 5, "lego_count": 4, "position": 4},
            {"known": "I want to help you.", "target": "我想帮你。", "syllable_count": 4, "word_count": 4, "lego_count": 4, "position": 5},
            {"known": "I don't want to help.", "target": "我不想帮。", "syllable_count": 4, "word_count": 4, "lego_count": 3, "position": 6},
            {"known": "I'm going to help you tomorrow.", "target": "我明天会帮你。", "syllable_count": 6, "word_count": 6, "lego_count": 5, "position": 7},
            {"known": "You are going to help me speak Chinese.", "target": "你会帮我说中文。", "syllable_count": 7, "word_count": 7, "lego_count": 5, "position": 8},
            {"known": "I want you to help me learn Chinese.", "target": "我想让你帮我学中文。", "syllable_count": 9, "word_count": 9, "lego_count": 4, "position": 9},
            {"known": "I'm going to help you learn.", "target": "我会帮你学。", "syllable_count": 5, "word_count": 5, "lego_count": 5, "position": 10}
        ]
    },
    "S0025L04": {
        "lego_id": "S0025L04",
        "practice_phrases": [
            {"known": "Help me.", "target": "帮我。", "syllable_count": 2, "word_count": 2, "lego_count": 3, "position": 1},
            {"known": "With me.", "target": "和我。", "syllable_count": 2, "word_count": 2, "lego_count": 2, "position": 2},
            {"known": "You help me.", "target": "你帮我。", "syllable_count": 3, "word_count": 3, "lego_count": 4, "position": 3},
            {"known": "Speak with me.", "target": "和我说话。", "syllable_count": 4, "word_count": 4, "lego_count": 2, "position": 4},
            {"known": "You want to help me.", "target": "你想帮我。", "syllable_count": 4, "word_count": 4, "lego_count": 4, "position": 5},
            {"known": "You help me now.", "target": "你现在帮我。", "syllable_count": 5, "word_count": 5, "lego_count": 4, "position": 6},
            {"known": "You are going to help me tomorrow.", "target": "你明天会帮我。", "syllable_count": 6, "word_count": 6, "lego_count": 5, "position": 7},
            {"known": "You want to speak Chinese with me.", "target": "你想跟我说中文。", "syllable_count": 7, "word_count": 7, "lego_count": 3, "position": 8},
            {"known": "I want you to help me learn.", "target": "我想让你帮我学。", "syllable_count": 7, "word_count": 7, "lego_count": 4, "position": 9},
            {"known": "I want you to speak with me.", "target": "我想让你和我说话。", "syllable_count": 8, "word_count": 8, "lego_count": 3, "position": 10}
        ]
    },
    "S0025L06": {
        "lego_id": "S0025L06",
        "practice_phrases": [
            {"known": "I have to speak.", "target": "我要说。", "syllable_count": 3, "word_count": 3, "lego_count": 3, "position": 1},
            {"known": "You have to learn.", "target": "你要学。", "syllable_count": 3, "word_count": 3, "lego_count": 2, "position": 2},
            {"known": "I have to speak Chinese.", "target": "我要说中文。", "syllable_count": 5, "word_count": 5, "lego_count": 3, "position": 3},
            {"known": "You have to help me.", "target": "你要帮我。", "syllable_count": 4, "word_count": 4, "lego_count": 5, "position": 4},
            {"known": "You have to help me now.", "target": "你现在要帮我。", "syllable_count": 6, "word_count": 6, "lego_count": 5, "position": 5},
            {"known": "I have to speak with you.", "target": "我要和你说话。", "syllable_count": 6, "word_count": 6, "lego_count": 4, "position": 6},
            {"known": "I have to remember the whole sentence.", "target": "我要记住整句话。", "syllable_count": 7, "word_count": 7, "lego_count": 3, "position": 7},
            {"known": "You have to help me learn Chinese.", "target": "你要帮我学中文。", "syllable_count": 7, "word_count": 7, "lego_count": 5, "position": 8},
            {"known": "I have to speak Chinese with you tomorrow.", "target": "我明天要跟你说中文。", "syllable_count": 9, "word_count": 9, "lego_count": 4, "position": 9},
            {"known": "You have to help me speak Chinese.", "target": "你要帮我说中文。", "syllable_count": 7, "word_count": 7, "lego_count": 5, "position": 10}
        ]
    },
    "S0025L07": {
        "lego_id": "S0025L07",
        "practice_phrases": [
            {"known": "I go.", "target": "我走。", "syllable_count": 2, "word_count": 2, "lego_count": 3, "position": 1},
            {"known": "You go.", "target": "你走。", "syllable_count": 2, "word_count": 2, "lego_count": 2, "position": 2},
            {"known": "I have to go.", "target": "我要走。", "syllable_count": 3, "word_count": 3, "lego_count": 4, "position": 3},
            {"known": "You want to go.", "target": "你想走。", "syllable_count": 3, "word_count": 3, "lego_count": 2, "position": 4},
            {"known": "I have to go now.", "target": "我现在要走。", "syllable_count": 5, "word_count": 5, "lego_count": 4, "position": 5},
            {"known": "You want to go tomorrow.", "target": "你明天想走。", "syllable_count": 5, "word_count": 5, "lego_count": 2, "position": 6},
            {"known": "I don't want to go.", "target": "我不想走。", "syllable_count": 4, "word_count": 4, "lego_count": 3, "position": 7},
            {"known": "I'm going to go soon.", "target": "我很快会走。", "syllable_count": 5, "word_count": 5, "lego_count": 4, "position": 8},
            {"known": "I'm not going to be able to go tomorrow.", "target": "我明天不会走。", "syllable_count": 6, "word_count": 6, "lego_count": 4, "position": 9},
            {"known": "I want you to go tomorrow.", "target": "我想让你明天走。", "syllable_count": 7, "word_count": 7, "lego_count": 4, "position": 10}
        ]
    },
    "S0025L08": {
        "lego_id": "S0025L08",
        "practice_phrases": [
            {"known": "Before now.", "target": "现在之前。", "syllable_count": 4, "word_count": 4, "lego_count": 1, "position": 1},
            {"known": "Before tomorrow.", "target": "明天之前。", "syllable_count": 4, "word_count": 4, "lego_count": 1, "position": 2},
            {"known": "Before I go.", "target": "我走之前。", "syllable_count": 4, "word_count": 4, "lego_count": 4, "position": 3},
            {"known": "Before you help me.", "target": "你帮我之前。", "syllable_count": 5, "word_count": 5, "lego_count": 5, "position": 4},
            {"known": "I want to speak before you go.", "target": "我想在你走之前说话。", "syllable_count": 9, "word_count": 9, "lego_count": 5, "position": 5},
            {"known": "You have to learn before tomorrow.", "target": "你要在明天之前学。", "syllable_count": 8, "word_count": 8, "lego_count": 3, "position": 6},
            {"known": "I have to help you before you go.", "target": "我要在你走之前帮你。", "syllable_count": 9, "word_count": 9, "lego_count": 7, "position": 7},
            {"known": "You want me to speak Chinese before tomorrow.", "target": "你想让我在明天之前说中文。", "syllable_count": 12, "word_count": 12, "lego_count": 4, "position": 8},
            {"known": "I want to speak with you before you go.", "target": "我想在你走之前和你说话。", "syllable_count": 11, "word_count": 11, "lego_count": 5, "position": 9},
            {"known": "You have to help me before I go.", "target": "你要在我走之前帮我。", "syllable_count": 9, "word_count": 9, "lego_count": 7, "position": 10}
        ]
    },
    "S0025L09": {
        "lego_id": "S0025L09",
        "practice_phrases": [
            {"known": "Are you going to help me?", "target": "你会帮我吗？", "syllable_count": 5, "word_count": 5, "lego_count": 6, "position": 1},
            {"known": "Now, are you going to help me?", "target": "现在，你会帮我吗？", "syllable_count": 7, "word_count": 7, "lego_count": 6, "position": 2},
            {"known": "Tomorrow, are you going to help me?", "target": "明天，你会帮我吗？", "syllable_count": 7, "word_count": 7, "lego_count": 6, "position": 3},
            {"known": "Are you going to help me? I want to speak.", "target": "你会帮我吗？我想说话。", "syllable_count": 9, "word_count": 9, "lego_count": 6, "position": 4},
            {"known": "Are you going to help me? I want to learn Chinese.", "target": "你会帮我吗？我想学中文。", "syllable_count": 10, "word_count": 10, "lego_count": 6, "position": 5},
            {"known": "Before tomorrow, are you going to help me?", "target": "明天之前，你会帮我吗？", "syllable_count": 9, "word_count": 9, "lego_count": 7, "position": 6},
            {"known": "Before I go, are you going to help me?", "target": "我走之前，你会帮我吗？", "syllable_count": 9, "word_count": 9, "lego_count": 8, "position": 7},
            {"known": "Are you going to help me? I have to remember.", "target": "你会帮我吗？我要记住。", "syllable_count": 9, "word_count": 9, "lego_count": 7, "position": 8},
            {"known": "Are you going to help me? I want to learn.", "target": "你会帮我吗？我想学。", "syllable_count": 8, "word_count": 8, "lego_count": 6, "position": 9},
            {"known": "Before I have to go, are you going to help me?", "target": "在我要走之前，你会帮我吗？", "syllable_count": 11, "word_count": 11, "lego_count": 10, "position": 10}
        ]
    },
    "S0025L10": {
        "lego_id": "S0025L10",
        "practice_phrases": [
            {"known": "Before I have to go.", "target": "在我要走之前。", "syllable_count": 6, "word_count": 6, "lego_count": 6, "position": 1},
            {"known": "Before I have to go, you help me.", "target": "在我要走之前，你帮我。", "syllable_count": 9, "word_count": 9, "lego_count": 8, "position": 2},
            {"known": "Before I have to go, I want to speak.", "target": "在我要走之前，我想说话。", "syllable_count": 10, "word_count": 10, "lego_count": 6, "position": 3},
            {"known": "I have to learn before I have to go.", "target": "在我要走之前，我要学。", "syllable_count": 9, "word_count": 9, "lego_count": 6, "position": 4},
            {"known": "Before I have to go, you help me speak.", "target": "在我要走之前，你帮我说话。", "syllable_count": 11, "word_count": 11, "lego_count": 8, "position": 5},
            {"known": "I want to speak Chinese before I have to go.", "target": "在我要走之前，我想说中文。", "syllable_count": 11, "word_count": 11, "lego_count": 6, "position": 6},
            {"known": "You are going to help me speak Chinese before I have to go.", "target": "在我要走之前，你会帮我说中文。", "syllable_count": 13, "word_count": 13, "lego_count": 9, "position": 7},
            {"known": "I want you to help me learn before I have to go.", "target": "在我要走之前，我想让你帮我学。", "syllable_count": 13, "word_count": 13, "lego_count": 8, "position": 8},
            {"known": "You have to help me before I have to go.", "target": "在我要走之前，你要帮我。", "syllable_count": 10, "word_count": 10, "lego_count": 8, "position": 9},
            {"known": "Are you going to help me before I have to go?", "target": "在我要走之前，你会帮我吗？", "syllable_count": 11, "word_count": 11, "lego_count": 10, "position": 10}
        ]
    }
}

def submit_basket(course, seed, lego_id, basket_data):
    """Submit a single LEGO basket to the endpoint."""
    payload = {
        "course": course,
        "seed": seed,
        "baskets": {
            lego_id: basket_data
        }
    }

    headers = {
        "Content-Type": "application/json",
        "ngrok-skip-browser-warning": "true",
        "User-Agent": "SSi-Dashboard/1.0"
    }

    try:
        response = requests.post(URL, json=payload, headers=headers, verify=False, timeout=30)
        return {
            "lego_id": lego_id,
            "status_code": response.status_code,
            "success": response.status_code == 200,
            "response": response.text[:200]  # First 200 chars
        }
    except Exception as e:
        return {
            "lego_id": lego_id,
            "success": False,
            "error": str(e)
        }

def main():
    """Main execution function."""
    results = []

    print("=" * 80)
    print("SUBMITTING BASKETS FOR S0024 AND S0025")
    print("=" * 80)
    print()

    # Submit S0024 baskets
    print("Processing S0024...")
    for lego_id, basket_data in S0024_BASKETS.items():
        print(f"  Submitting {lego_id}...", end=" ")
        result = submit_basket("zho_for_eng", "S0024", lego_id, basket_data)
        results.append(result)
        if result["success"]:
            print("✓ SUCCESS")
        else:
            print(f"✗ FAILED - {result.get('error', result.get('status_code'))}")

    print()

    # Submit S0025 baskets
    print("Processing S0025...")
    for lego_id, basket_data in S0025_BASKETS.items():
        print(f"  Submitting {lego_id}...", end=" ")
        result = submit_basket("zho_for_eng", "S0025", lego_id, basket_data)
        results.append(result)
        if result["success"]:
            print("✓ SUCCESS")
        else:
            print(f"✗ FAILED - {result.get('error', result.get('status_code'))}")

    print()
    print("=" * 80)
    print("SUMMARY")
    print("=" * 80)

    successful = [r for r in results if r["success"]]
    failed = [r for r in results if not r["success"]]

    print(f"Total baskets: {len(results)}")
    print(f"Successful: {len(successful)}")
    print(f"Failed: {len(failed)}")

    if failed:
        print()
        print("Failed uploads:")
        for f in failed:
            print(f"  - {f['lego_id']}: {f.get('error', f.get('status_code'))}")

    print()
    print("=" * 80)

if __name__ == "__main__":
    main()
