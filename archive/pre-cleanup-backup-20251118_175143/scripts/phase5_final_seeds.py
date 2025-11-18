#!/usr/bin/env python3
"""
Phase 5 Final Seeds - S0376-S0380
Manual crafting for the final 5 seeds
"""

import json
import sys

SCAFFOLD_DIR = "/home/user/ssi-dashboard-v7/public/vfs/courses/cmn_for_eng/phase5_scaffolds"
OUTPUT_DIR = "/home/user/ssi-dashboard-v7/public/vfs/courses/cmn_for_eng/phase5_outputs"

def load_scaffold(seed_id):
    with open(f"{SCAFFOLD_DIR}/seed_s{seed_id:04d}.json", 'r', encoding='utf-8') as f:
        return json.load(f)

def save_output(seed_id, output):
    with open(f"{OUTPUT_DIR}/seed_s{seed_id:04d}.json", 'w', encoding='utf-8') as f:
        json.dump(output, f, ensure_ascii=False, indent=2)

def calc_dist(phrases):
    return {
        "really_short_1_2": sum(1 for p in phrases if p[3] <= 2),
        "quite_short_3": sum(1 for p in phrases if p[3] == 3),
        "longer_4_5": sum(1 for p in phrases if p[3] in [4, 5]),
        "long_6_plus": sum(1 for p in phrases if p[3] >= 6)
    }

def process_s0376():
    """S0376: I didn't go anywhere last month."""
    scaffold = load_scaffold(376)
    output = scaffold.copy()

    # S0376L01: "last month" / "上个月"
    phrases = [
        ["last month", "上个月", None, 2],
        ["I went last month", "我上个月去了", None, 3],
        ["Last month I saw", "上个月我看到", None, 3],
        ["In last month", "在上个月", None, 3],
        ["What happened last month?", "上个月发生了什么？", None, 3],
        ["I didn't go anywhere last month", "我上个月哪儿也没去", None, 5],
        ["Did you travel last month?", "你上个月旅行了吗？", None, 4],
        ["That was last month", "那是上个月", None, 4],
        ["Last month was difficult", "上个月很困难", None, 3],
        ["I didn't go anywhere last month.", "我上个月哪儿也没去。", None, 6],
    ]
    output['legos']['S0376L01']['practice_phrases'] = phrases
    output['legos']['S0376L01']['phrase_distribution'] = calc_dist(phrases)

    # S0376L02: "didn't go" / "没去"
    phrases = [
        ["didn't go", "没去", None, 2],
        ["I didn't go", "我没去", None, 3],
        ["He didn't go", "他没去", None, 3],
        ["She didn't go there", "她没去那里", None, 3],
        ["I didn't want to go", "我不想去", None, 3],
        ["They didn't go", "他们没去", None, 3],
        ["Did you go or didn't go?", "你去了还是没去？", None, 4],
        ["I said I didn't go", "我说我没去", None, 4],
        ["If I didn't go, who did?", "如果我没去，谁去了？", None, 5],
        ["I didn't go anywhere last month.", "我上个月哪儿也没去。", None, 6],
    ]
    output['legos']['S0376L02']['practice_phrases'] = phrases
    output['legos']['S0376L02']['phrase_distribution'] = calc_dist(phrases)

    # S0376L03: "go anywhere" / "去什么地方/哪儿"
    phrases = [
        ["go anywhere", "去什么地方", None, 2],
        ["I want to go anywhere", "我想去什么地方", None, 4],
        ["Did you go anywhere?", "你去什么地方了吗？", None, 3],
        ["He didn't go anywhere", "他没去什么地方", None, 4],
        ["Can we go anywhere we want?", "我们能去任何我们想去的地方吗？", None, 6],
        ["I never go anywhere without you", "我从不去任何没有你的地方", None, 5],
        ["Where would you like to go?", "你想去哪里？", None, 4],
        ["I'm ready to go anywhere", "我准备好去任何地方了", None, 4],
        ["She likes to go anywhere new", "她喜欢去任何新的地方", None, 5],
        ["I didn't go anywhere last month.", "我上个月哪儿也没去。", None, 6],
    ]
    output['legos']['S0376L03']['practice_phrases'] = phrases
    output['legos']['S0376L03']['phrase_distribution'] = calc_dist(phrases)

    # S0376L04: "anywhere last" / "什么地方/哪儿"
    phrases = [
        ["anywhere last month", "上个月任何地方", None, 4],
        ["I didn't go anywhere", "我没去什么地方", None, 4],
        ["Did you go anywhere?", "你去什么地方了吗？", None, 3],
        ["He went everywhere but I didn't go anywhere", "他到处都去了但我哪儿也没去", None, 6],
        ["I couldn't go anywhere last month", "我上个月哪儿也不能去", None, 4],
        ["Nobody went anywhere", "没人去什么地方", None, 3],
        ["I never wanted to go anywhere", "我从不想去什么地方", None, 4],
        ["I had nowhere to go", "我没有地方去", None, 4],
        ["She suggested we go somewhere but I said nowhere", "她建议我们去某个地方但我说哪儿也不", None, 6],
        ["I didn't go anywhere last month.", "我上个月哪儿也没去。", None, 6],
    ]
    output['legos']['S0376L04']['practice_phrases'] = phrases
    output['legos']['S0376L04']['phrase_distribution'] = calc_dist(phrases)

    # S0376L05: "I didn't go anywhere last month" / "我上个月哪儿也没去" (FINAL)
    phrases = [
        ["I didn't go anywhere", "我哪儿也没去", None, 4],
        ["I didn't go anywhere last month", "我上个月哪儿也没去", None, 5],
        ["No, I didn't go anywhere last month", "不，我上个月哪儿也没去", None, 6],
        ["I'm afraid I didn't go anywhere last month", "恐怕我上个月哪儿也没去", None, 6],
        ["The truth is I didn't go anywhere last month", "事实是我上个月哪儿也没去", None, 6],
        ["I have to admit I didn't go anywhere", "我必须承认我哪儿也没去", None, 5],
        ["I didn't travel anywhere last month at all", "我上个月根本哪儿也没去旅行", None, 6],
        ["To be honest I didn't go anywhere last month", "老实说我上个月哪儿也没去", None, 6],
        ["I regret to say I didn't go anywhere last month", "遗憾地说我上个月哪儿也没去", None, 6],
        ["I didn't go anywhere last month.", "我上个月哪儿也没去。", None, 6],
    ]
    output['legos']['S0376L05']['practice_phrases'] = phrases
    output['legos']['S0376L05']['phrase_distribution'] = calc_dist(phrases)

    output['generation_stage'] = 'PHRASES_GENERATED'
    save_output(376, output)
    print("✓ S0376: Processed")

def process_s0377():
    """S0377: Did you go anywhere in the world last year?"""
    scaffold = load_scaffold(377)
    output = scaffold.copy()

    # S0377L01: "last year" / "去年"
    phrases = [
        ["last year", "去年", None, 2],
        ["I went last year", "我去年去了", None, 3],
        ["Did you go last year?", "你去年去了吗？", None, 3],
        ["What did you do last year?", "你去年做了什么？", None, 4],
        ["Last year was interesting", "去年很有趣", None, 3],
        ["Did you travel last year?", "你去年旅行了吗？", None, 3],
        ["I remember last year well", "我记得去年很清楚", None, 4],
        ["This year is better than last year", "今年比去年更好", None, 5],
        ["Where did you go last year?", "你去年去哪里了？", None, 4],
        ["Did you go anywhere in the world last year?", "你去年去世界上什么地方了吗？", None, 7],
    ]
    output['legos']['S0377L01']['practice_phrases'] = phrases
    output['legos']['S0377L01']['phrase_distribution'] = calc_dist(phrases)

    # S0377L02: "in the world" / "世界上"
    phrases = [
        ["in the world", "世界上", None, 3],
        ["all in the world", "世界上所有地方", None, 4],
        ["I've traveled in the world", "我在世界上旅行过", None, 4],
        ["There is no place like this in the world", "世界上没有像这样的地方", None, 6],
        ["She went everywhere in the world", "她去世界上各地", None, 4],
        ["The best place in the world", "世界上最好的地方", None, 4],
        ["Do you want to travel in the world?", "你想在世界上旅行吗？", None, 5],
        ["I want to see all of the world", "我想看世界上的一切", None, 5],
        ["Somewhere in the world", "世界上某个地方", None, 3],
        ["Did you go anywhere in the world last year?", "你去年去世界上什么地方了吗？", None, 7],
    ]
    output['legos']['S0377L02']['practice_phrases'] = phrases
    output['legos']['S0377L02']['phrase_distribution'] = calc_dist(phrases)

    # S0377L03: "go anywhere" / "去什么地方"
    phrases = [
        ["go anywhere", "去什么地方", None, 2],
        ["Did you go anywhere?", "你去什么地方了吗？", None, 3],
        ["I want to go anywhere", "我想去什么地方", None, 4],
        ["Can we go anywhere?", "我们能去什么地方吗？", None, 3],
        ["He didn't go anywhere", "他没去什么地方", None, 3],
        ["Would you like to go anywhere special?", "你想去什么特别的地方吗？", None, 5],
        ["I'll go anywhere with you", "我会和你去任何地方", None, 5],
        ["She never goes anywhere alone", "她从不独自去任何地方", None, 4],
        ["They wanted to go somewhere fun", "他们想去什么有趣的地方", None, 4],
        ["Did you go anywhere in the world last year?", "你去年去世界上什么地方了吗？", None, 7],
    ]
    output['legos']['S0377L03']['practice_phrases'] = phrases
    output['legos']['S0377L03']['phrase_distribution'] = calc_dist(phrases)

    # S0377L04: "in the world last year" / "去年世界上"
    phrases = [
        ["in the world last year", "去年世界上", None, 4],
        ["Did you travel in the world last year?", "你去年在世界上旅行了吗？", None, 6],
        ["I went many places in the world last year", "我去年去了世界上很多地方", None, 6],
        ["The best place I visited in the world last year", "我去年在世界上访问的最好的地方", None, 7],
        ["Were you anywhere in the world last year?", "你去年在世界上任何地方吗？", None, 6],
        ["What was the most interesting in the world you saw last year?", "你去年在世界上看到最有趣的是什么？", None, 8],
        ["I remember everywhere in the world I went last year", "我记得我去年去世界上的每个地方", None, 7],
        ["She asked me where I went in the world last year", "她问我去年我去了世界上哪里", None, 7],
        ["Do you remember anything in the world last year?", "你记得去年世界上发生的事吗？", None, 6],
        ["Did you go anywhere in the world last year?", "你去年去世界上什么地方了吗？", None, 7],
    ]
    output['legos']['S0377L04']['practice_phrases'] = phrases
    output['legos']['S0377L04']['phrase_distribution'] = calc_dist(phrases)

    # S0377L05: "anywhere in the world" / "什么地方"
    phrases = [
        ["anywhere in the world", "什么地方", None, 4],
        ["I want to go anywhere in the world", "我想去任何地方", None, 5],
        ["We can go anywhere in the world", "我们可以去世界上任何地方", None, 6],
        ["Have you been anywhere in the world?", "你去过世界上什么地方吗？", None, 5],
        ["I'll take you anywhere in the world", "我会带你去世界上任何地方", None, 6],
        ["She has traveled everywhere in the world", "她去过世界上的各个地方", None, 5],
        ["Would you like to go anywhere in the world?", "你想去世界上什么地方吗？", None, 6],
        ["We should visit anywhere in the world you want", "我们应该去你想要的世界上任何地方", None, 7],
        ["I'm ready to explore anywhere in the world", "我准备好去世界上任何地方探索", None, 6],
        ["Did you go anywhere in the world last year?", "你去年去世界上什么地方了吗？", None, 7],
    ]
    output['legos']['S0377L05']['practice_phrases'] = phrases
    output['legos']['S0377L05']['phrase_distribution'] = calc_dist(phrases)

    # S0377L06: "Did you go anywhere in the world last year" / "你去年去世界上什么地方了吗" (FINAL)
    phrases = [
        ["Did you go anywhere", "你去什么地方了吗", None, 3],
        ["Did you go anywhere last year?", "你去年去什么地方了吗？", None, 4],
        ["Did you go anywhere in the world?", "你去世界上什么地方了吗？", None, 5],
        ["So did you go anywhere in the world last year?", "那么你去年去世界上什么地方了吗？", None, 7],
        ["Tell me, did you go anywhere in the world last year?", "告诉我，你去年去世界上什么地方了吗？", None, 8],
        ["I'm curious, did you go anywhere in the world last year?", "我很好奇，你去年去世界上什么地方了吗？", None, 8],
        ["I wonder if you went anywhere in the world last year", "我想知道你去年是否去了世界上什么地方", None, 8],
        ["The question is did you go anywhere in the world last year?", "问题是你去年去世界上什么地方了吗？", None, 8],
        ["You never told me if you went anywhere in the world last year", "你从未告诉我你去年是否去了世界上什么地方", None, 9],
        ["Did you go anywhere in the world last year?", "你去年去世界上什么地方了吗？", None, 7],
    ]
    output['legos']['S0377L06']['practice_phrases'] = phrases
    output['legos']['S0377L06']['phrase_distribution'] = calc_dist(phrases)

    output['generation_stage'] = 'PHRASES_GENERATED'
    save_output(377, output)
    print("✓ S0377: Processed")

def process_s0378():
    """S0378: No I didn't have enough money for holidays."""
    scaffold = load_scaffold(378)
    output = scaffold.copy()

    # S0378L01: "no" / "不"
    phrases = [
        ["no", "不", None, 1],
        ["No I can't", "不，我不能", None, 2],
        ["The answer is no", "答案是不", None, 3],
        ["I said no", "我说不", None, 2],
        ["No thank you", "不，谢谢", None, 2],
        ["No, I don't have money", "不，我没有钱", None, 4],
        ["No I didn't go", "不，我没去", None, 3],
        ["No way", "绝不", None, 2],
        ["Absolutely no", "绝对不", None, 2],
        ["No I didn't have enough money for holidays.", "不，我没有足够的钱度假。", None, 7],
    ]
    output['legos']['S0378L01']['practice_phrases'] = phrases
    output['legos']['S0378L01']['phrase_distribution'] = calc_dist(phrases)

    # S0378L02: "I don't have" / "我没有"
    phrases = [
        ["I don't have", "我没有", None, 3],
        ["I don't have much", "我没有很多", None, 3],
        ["I don't have time", "我没有时间", None, 3],
        ["I don't have money", "我没有钱", None, 3],
        ["I don't have anywhere to go", "我没有地方去", None, 4],
        ["What don't I have?", "我没有什么？", None, 3],
        ["I don't have what you want", "我没有你想要的", None, 4],
        ["I honestly don't have any", "我诚实地说我没有任何", None, 4],
        ["I'm sorry but I don't have that", "对不起但我没有那个", None, 5],
        ["No I didn't have enough money for holidays.", "不，我没有足够的钱度假。", None, 7],
    ]
    output['legos']['S0378L02']['practice_phrases'] = phrases
    output['legos']['S0378L02']['phrase_distribution'] = calc_dist(phrases)

    # S0378L03: "have enough" / "足够"
    phrases = [
        ["have enough", "足够", None, 2],
        ["I have enough", "我有足够", None, 3],
        ["Do you have enough?", "你有足够吗？", None, 3],
        ["We have enough money", "我们有足够的钱", None, 4],
        ["I need to have enough", "我需要有足够", None, 4],
        ["There is enough", "有足够", None, 2],
        ["Is there enough?", "有足够吗？", None, 2],
        ["I think we have enough", "我认为我们有足够", None, 4],
        ["That's enough", "那是足够", None, 2],
        ["No I didn't have enough money for holidays.", "不，我没有足够的钱度假。", None, 7],
    ]
    output['legos']['S0378L03']['practice_phrases'] = phrases
    output['legos']['S0378L03']['phrase_distribution'] = calc_dist(phrases)

    # S0378L04: "money for" / "钱/钱来"
    phrases = [
        ["money for", "钱", None, 2],
        ["I have money for that", "我有钱来做那个", None, 4],
        ["Do you have money for this?", "你有钱来做这个吗？", None, 4],
        ["I don't have money for anything", "我没有钱来做任何事", None, 4],
        ["She has money for everything", "她有钱来做所有事", None, 4],
        ["We need money for the trip", "我们需要钱来旅行", None, 4],
        ["How much money for that?", "那个多少钱？", None, 3],
        ["I'm looking for money for school", "我在找钱来上学", None, 4],
        ["He saved money for his dream", "他为他的梦想存钱", None, 4],
        ["No I didn't have enough money for holidays.", "不，我没有足够的钱度假。", None, 7],
    ]
    output['legos']['S0378L04']['practice_phrases'] = phrases
    output['legos']['S0378L04']['phrase_distribution'] = calc_dist(phrases)

    # S0378L05: "No I didn't have enough money for holidays" / "不，我没有足够的钱度假" (FINAL)
    phrases = [
        ["No I didn't have", "不，我没有", None, 3],
        ["No, I didn't have enough", "不，我没有足够", None, 4],
        ["No, I didn't have enough money", "不，我没有足够的钱", None, 5],
        ["No I'm afraid I didn't have enough money", "不，恐怕我没有足够的钱", None, 5],
        ["No, I must confess I didn't have enough money", "不，我必须承认我没有足够的钱", None, 6],
        ["No I honestly didn't have enough money for a vacation", "不，诚实地说我没有足够的钱来度假", None, 6],
        ["I have to say no, I didn't have enough money at all", "我必须说不，我根本没有足够的钱", None, 6],
        ["To be frank, no I didn't have enough money for trips", "坦白说，不，我没有足够的钱来旅行", None, 6],
        ["The truth is no, I didn't have enough money or time", "事实是不，我没有足够的钱或时间", None, 6],
        ["No I didn't have enough money for holidays.", "不，我没有足够的钱度假。", None, 7],
    ]
    output['legos']['S0378L05']['practice_phrases'] = phrases
    output['legos']['S0378L05']['phrase_distribution'] = calc_dist(phrases)

    # S0378L06: "enough money for holidays" / "足够的钱度假"
    phrases = [
        ["enough money for holidays", "足够的钱度假", None, 4],
        ["I have enough money for vacation", "我有足够的钱度假", None, 4],
        ["Do you have enough money for your trip?", "你有足够的钱来旅行吗？", None, 5],
        ["We didn't have enough money for the holidays", "我们没有足够的钱来度假", None, 5],
        ["She saved enough money for her holidays", "她为她的假期存了足够的钱", None, 5],
        ["I need enough money for a vacation", "我需要足够的钱来度假", None, 4],
        ["How much is enough money for holidays?", "多少是足够的钱度假？", None, 5],
        ["He wanted enough money for traveling", "他想要足够的钱来旅行", None, 4],
        ["I'm trying to save enough money for my dream vacation", "我在努力存足够的钱来实现我的梦想假期", None, 7],
        ["No I didn't have enough money for holidays.", "不，我没有足够的钱度假。", None, 7],
    ]
    output['legos']['S0378L06']['practice_phrases'] = phrases
    output['legos']['S0378L06']['phrase_distribution'] = calc_dist(phrases)

    output['generation_stage'] = 'PHRASES_GENERATED'
    save_output(378, output)
    print("✓ S0378: Processed")

def process_s0379():
    """S0379: Yes I was lucky enough to travel to Africa."""
    scaffold = load_scaffold(379)
    output = scaffold.copy()

    # S0379L01: "yes" / "是的"
    phrases = [
        ["yes", "是的", None, 1],
        ["Yes I was", "是的，我是", None, 2],
        ["Yes, I can", "是的，我能", None, 2],
        ["I said yes", "我说是的", None, 2],
        ["Yes, that's true", "是的，这是真的", None, 3],
        ["Yes I was lucky", "是的，我很幸运", None, 3],
        ["Yes I want to", "是的，我想", None, 3],
        ["Yes the answer is yes", "是的，答案是是的", None, 4],
        ["Yes I was lucky enough to travel", "是的，我很幸运能旅行", None, 5],
        ["Yes I was lucky enough to travel to Africa.", "是的，我很幸运能去非洲旅行。", None, 7],
    ]
    output['legos']['S0379L01']['practice_phrases'] = phrases
    output['legos']['S0379L01']['phrase_distribution'] = calc_dist(phrases)

    # S0379L02: "I was lucky" / "我很幸运"
    phrases = [
        ["I was lucky", "我很幸运", None, 3],
        ["I'm lucky", "我很幸运", None, 2],
        ["He was lucky", "他很幸运", None, 3],
        ["She was lucky", "她很幸运", None, 3],
        ["You were lucky", "你很幸运", None, 3],
        ["I think I was lucky", "我认为我很幸运", None, 4],
        ["I'm so lucky", "我那么幸运", None, 3],
        ["I was lucky to meet you", "我很幸运能认识你", None, 5],
        ["Weren't we lucky?", "我们不是很幸运吗？", None, 3],
        ["Yes I was lucky enough to travel to Africa.", "是的，我很幸运能去非洲旅行。", None, 7],
    ]
    output['legos']['S0379L02']['practice_phrases'] = phrases
    output['legos']['S0379L02']['phrase_distribution'] = calc_dist(phrases)

    # S0379L03: "lucky enough to" / "足够幸运来"
    phrases = [
        ["lucky enough to", "足够幸运来", None, 3],
        ["I'm lucky enough to see", "我足够幸运能看到", None, 4],
        ["Were you lucky enough to go?", "你足够幸运来去吗？", None, 4],
        ["I was lucky enough to meet her", "我足够幸运来认识她", None, 5],
        ["He was lucky enough to find it", "他足够幸运来找到它", None, 5],
        ["She felt lucky enough to have this chance", "她觉得足够幸运来有这个机会", None, 6],
        ["I'm very lucky enough to be here", "我很足够幸运来在这里", None, 5],
        ["We're lucky enough to travel", "我们足够幸运来旅行", None, 4],
        ["They were lucky enough to experience this", "他们足够幸运来经历这个", None, 5],
        ["Yes I was lucky enough to travel to Africa.", "是的，我很幸运能去非洲旅行。", None, 7],
    ]
    output['legos']['S0379L03']['practice_phrases'] = phrases
    output['legos']['S0379L03']['phrase_distribution'] = calc_dist(phrases)

    # S0379L04: "travel to" / "去...旅行/旅行到"
    phrases = [
        ["travel to", "去...旅行", None, 2],
        ["I want to travel to", "我想去...旅行", None, 4],
        ["Can we travel to that place?", "我们能去那个地方旅行吗？", None, 5],
        ["We traveled to many countries", "我们去很多国家旅行了", None, 4],
        ["She dreams of traveling to everywhere", "她梦想去各处旅行", None, 4],
        ["He hasn't traveled to Africa", "他还没有去非洲旅行", None, 4],
        ["I will travel to see you", "我将去见你旅行", None, 4],
        ["Did you ever travel to Europe?", "你曾经去欧洲旅行过吗？", None, 4],
        ["I love to travel to new places", "我喜欢去新地方旅行", None, 4],
        ["Yes I was lucky enough to travel to Africa.", "是的，我很幸运能去非洲旅行。", None, 7],
    ]
    output['legos']['S0379L04']['practice_phrases'] = phrases
    output['legos']['S0379L04']['phrase_distribution'] = calc_dist(phrases)

    # S0379L05: "to travel to Africa" / "去非洲旅行"
    phrases = [
        ["travel to Africa", "去非洲旅行", None, 3],
        ["I want to travel to Africa", "我想去非洲旅行", None, 4],
        ["I dreamed of traveling to Africa", "我梦想去非洲旅行", None, 4],
        ["Would you like to travel to Africa?", "你想去非洲旅行吗？", None, 4],
        ["She went to travel to Africa", "她去非洲旅行了", None, 4],
        ["He has never traveled to Africa", "他从未去非洲旅行过", None, 4],
        ["I was happy to travel to Africa", "我很高兴去非洲旅行", None, 4],
        ["Traveling to Africa was amazing", "去非洲旅行很惊人", None, 4],
        ["I encourage you to travel to Africa", "我鼓励你去非洲旅行", None, 4],
        ["Yes I was lucky enough to travel to Africa.", "是的，我很幸运能去非洲旅行。", None, 7],
    ]
    output['legos']['S0379L05']['practice_phrases'] = phrases
    output['legos']['S0379L05']['phrase_distribution'] = calc_dist(phrases)

    # S0379L06: "lucky enough to travel" / "足够幸运来去旅行"
    phrases = [
        ["lucky enough to travel", "足够幸运来旅行", None, 4],
        ["I was lucky enough to travel", "我足够幸运来旅行", None, 4],
        ["We were lucky enough to travel together", "我们足够幸运来一起旅行", None, 5],
        ["She felt lucky enough to travel abroad", "她觉得足够幸运来去国外旅行", None, 5],
        ["They are lucky enough to travel every year", "他们足够幸运来每年旅行", None, 5],
        ["He was lucky enough to travel first class", "他足够幸运来坐头等舱旅行", None, 5],
        ["I'm always lucky enough to travel somewhere", "我总是足够幸运来去某个地方旅行", None, 5],
        ["You should feel lucky enough to travel at all", "你应该觉得足够幸运来旅行", None, 6],
        ["We considered ourselves lucky enough to travel during that time", "我们认为自己足够幸运来在那时旅行", None, 7],
        ["Yes I was lucky enough to travel to Africa.", "是的，我很幸运能去非洲旅行。", None, 7],
    ]
    output['legos']['S0379L06']['practice_phrases'] = phrases
    output['legos']['S0379L06']['phrase_distribution'] = calc_dist(phrases)

    # S0379L07: "I was lucky enough to travel to Africa" / "我很幸运能去非洲旅行" (maybe FINAL if marked)
    phrases = [
        ["lucky enough to travel to Africa", "足够幸运来去非洲旅行", None, 5],
        ["I was lucky enough to travel to Africa", "我足够幸运来去非洲旅行", None, 5],
        ["I'm fortunate I was lucky enough to travel to Africa", "我很幸运我足够幸运来去非洲旅行", None, 6],
        ["Yes I was lucky and able to travel to Africa", "是的，我很幸运和能去非洲旅行", None, 6],
        ["I must say I was lucky enough to travel to Africa", "我必须说我足够幸运来去非洲旅行", None, 6],
        ["To my surprise I was lucky enough to travel to Africa", "令我惊讶的是我足够幸运来去非洲旅行", None, 6],
        ["It was a dream but I was lucky enough to travel to Africa", "这是一个梦想但我足够幸运来去非洲旅行", None, 7],
        ["Everyone said I was lucky enough to travel to Africa", "大家说我足够幸运来去非洲旅行", None, 6],
        ["Truthfully I was indeed lucky enough to travel to Africa", "坦白说我确实足够幸运来去非洲旅行", None, 6],
        ["Yes I was lucky enough to travel to Africa.", "是的，我很幸运能去非洲旅行。", None, 7],
    ]
    output['legos']['S0379L07']['practice_phrases'] = phrases
    output['legos']['S0379L07']['phrase_distribution'] = calc_dist(phrases)

    # S0379L08: "Yes I was lucky enough to travel to Africa" / "是的，我很幸运能去非洲旅行" (FINAL)
    phrases = [
        ["Yes I was lucky", "是的，我很幸运", None, 3],
        ["Yes I was lucky enough", "是的，我足够幸运", None, 4],
        ["Yes I was lucky enough to travel", "是的，我足够幸运来旅行", None, 5],
        ["Yes I was lucky enough to travel to Africa", "是的，我足够幸运来去非洲旅行", None, 6],
        ["Yes I absolutely was lucky enough to travel to Africa", "是的，我绝对足够幸运来去非洲旅行", None, 6],
        ["Yes truly I was lucky enough to travel to Africa", "是的，真的我足够幸运来去非洲旅行", None, 6],
        ["I can honestly say yes I was lucky enough to travel to Africa", "我能诚实地说是的我足够幸运来去非洲旅行", None, 8],
        ["The answer is yes, I was lucky enough to travel to Africa", "答案是是的，我足够幸运来去非洲旅行", None, 8],
        ["I must tell you yes I was very lucky enough to travel to Africa", "我必须告诉你是的我非常足够幸运来去非洲旅行", None, 8],
        ["Yes I was lucky enough to travel to Africa.", "是的，我很幸运能去非洲旅行。", None, 7],
    ]
    output['legos']['S0379L08']['practice_phrases'] = phrases
    output['legos']['S0379L08']['phrase_distribution'] = calc_dist(phrases)

    output['generation_stage'] = 'PHRASES_GENERATED'
    save_output(379, output)
    print("✓ S0379: Processed")

def process_s0380():
    """S0380: I asked what she wanted to include."""
    scaffold = load_scaffold(380)
    output = scaffold.copy()

    # S0380L01: "I asked" / "我问"
    phrases = [
        ["I asked", "我问", None, 2],
        ["I asked you", "我问你", None, 2],
        ["I asked her", "我问她", None, 2],
        ["When did I ask?", "我什么时候问的?", None, 3],
        ["I asked him a question", "我问他一个问题", None, 4],
        ["What did I ask you?", "我问了你什么?", None, 4],
        ["I asked if you knew", "我问你是否知道", None, 4],
        ["I asked her about it", "我问她关于它", None, 4],
        ["I asked what she wanted", "我问她想什么", None, 4],
        ["I asked what she wanted to include.", "我问她想包括什么。", None, 6],
    ]
    output['legos']['S0380L01']['practice_phrases'] = phrases
    output['legos']['S0380L01']['phrase_distribution'] = calc_dist(phrases)

    # S0380L02: "ask" / "问"
    phrases = [
        ["ask", "问", None, 1],
        ["I ask", "我问", None, 2],
        ["Can I ask?", "我能问吗?", None, 2],
        ["Ask her", "问她", None, 2],
        ["What do you ask?", "你问什么?", None, 3],
        ["I want to ask", "我想问", None, 3],
        ["May I ask?", "我能问吗?", None, 2],
        ["I have to ask", "我必须问", None, 3],
        ["I need to ask you something", "我需要问你一件事", None, 4],
        ["I asked what she wanted to include.", "我问她想包括什么。", None, 6],
    ]
    output['legos']['S0380L02']['practice_phrases'] = phrases
    output['legos']['S0380L02']['phrase_distribution'] = calc_dist(phrases)

    # S0380L03: "wanted to" / "想"
    phrases = [
        ["wanted to", "想", None, 2],
        ["I wanted to", "我想", None, 2],
        ["She wanted to", "她想", None, 2],
        ["What did he want to do?", "他想做什么?", None, 4],
        ["I wanted to see", "我想看", None, 3],
        ["He always wanted to", "他总是想", None, 3],
        ["Did you want to?", "你想吗?", None, 2],
        ["I really wanted to go", "我真的想去", None, 4],
        ["She wanted to include everything", "她想包括一切", None, 4],
        ["I asked what she wanted to include.", "我问她想包括什么。", None, 6],
    ]
    output['legos']['S0380L03']['practice_phrases'] = phrases
    output['legos']['S0380L03']['phrase_distribution'] = calc_dist(phrases)

    # S0380L04: "to include" / "包括"
    phrases = [
        ["to include", "包括", None, 2],
        ["I want to include", "我想包括", None, 3],
        ["What to include?", "包括什么?", None, 2],
        ["I need to include this", "我需要包括这个", None, 4],
        ["Should we include?", "我们应该包括吗?", None, 3],
        ["Don't forget to include", "不要忘记包括", None, 3],
        ["Please include me", "请包括我", None, 2],
        ["I wanted to include you", "我想包括你", None, 4],
        ["She wanted to include her friend", "她想包括她的朋友", None, 4],
        ["I asked what she wanted to include.", "我问她想包括什么。", None, 6],
    ]
    output['legos']['S0380L04']['practice_phrases'] = phrases
    output['legos']['S0380L04']['phrase_distribution'] = calc_dist(phrases)

    # S0380L05: "what she wanted" / "她想什么"
    phrases = [
        ["what she wanted", "她想什么", None, 3],
        ["I know what she wanted", "我知道她想什么", None, 4],
        ["What did she want?", "她想什么?", None, 3],
        ["Tell me what she wanted", "告诉我她想什么", None, 4],
        ["I asked what she wanted", "我问她想什么", None, 4],
        ["She got what she wanted", "她得到了她想要的", None, 4],
        ["Do you understand what she wanted?", "你理解她想什么吗?", None, 5],
        ["Nobody knew what she wanted", "没人知道她想什么", None, 4],
        ["It turned out what she wanted was simple", "结果她想要的很简单", None, 5],
        ["I asked what she wanted to include.", "我问她想包括什么。", None, 6],
    ]
    output['legos']['S0380L05']['practice_phrases'] = phrases
    output['legos']['S0380L05']['phrase_distribution'] = calc_dist(phrases)

    # S0380L06: "wanted to include" / "想包括"
    phrases = [
        ["wanted to include", "想包括", None, 3],
        ["I wanted to include", "我想包括", None, 3],
        ["She wanted to include", "她想包括", None, 3],
        ["What she wanted to include", "她想包括什么", None, 4],
        ["I asked what she wanted", "我问她想包括什么", None, 4],
        ["Did you want to include me?", "你想包括我吗?", None, 4],
        ["They wanted to include everyone", "他们想包括所有人", None, 4],
        ["I wondered what she wanted to include", "我想知道她想包括什么", None, 5],
        ["Can you tell me what she wanted to include?", "你能告诉我她想包括什么吗?", None, 6],
        ["I asked what she wanted to include.", "我问她想包括什么。", None, 6],
    ]
    output['legos']['S0380L06']['practice_phrases'] = phrases
    output['legos']['S0380L06']['phrase_distribution'] = calc_dist(phrases)

    # S0380L07: "what she wanted to include" / "她想包括什么" (FINAL)
    phrases = [
        ["what she wanted to include", "她想包括什么", None, 4],
        ["I asked what she wanted", "我问她想包括什么", None, 4],
        ["Do you know what she wanted to include?", "你知道她想包括什么吗?", None, 6],
        ["Tell me what she wanted to include", "告诉我她想包括什么", None, 5],
        ["I'm curious about what she wanted to include", "我很好奇她想包括什么", None, 5],
        ["I found out what she wanted to include", "我发现了她想包括什么", None, 5],
        ["She finally revealed what she wanted to include", "她最后透露了她想包括什么", None, 5],
        ["I never understood what she wanted to include", "我从未理解她想包括什么", None, 5],
        ["I had to keep asking what she wanted to include", "我必须不断询问她想包括什么", None, 6],
        ["I asked what she wanted to include.", "我问她想包括什么。", None, 6],
    ]
    output['legos']['S0380L07']['practice_phrases'] = phrases
    output['legos']['S0380L07']['phrase_distribution'] = calc_dist(phrases)

    output['generation_stage'] = 'PHRASES_GENERATED'
    save_output(380, output)
    print("✓ S0380: Processed")

def main():
    """Process final 5 seeds"""
    print("Phase 5 Final Seeds (S0376-S0380)")
    try:
        process_s0376()
        process_s0377()
        process_s0378()
        process_s0379()
        process_s0380()
        print("\n✓ All seeds processed successfully!")
    except Exception as e:
        print(f"Error: {e}", file=sys.stderr)
        sys.exit(1)

if __name__ == '__main__':
    main()
