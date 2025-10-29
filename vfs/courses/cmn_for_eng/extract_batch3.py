#!/usr/bin/env python3
"""Extract and insert LEGOs for batch 3 (S0141-S0210)"""

import json

# Read seed_pairs.json
with open('seed_pairs.json', 'r', encoding='utf-8') as f:
    seed_data = json.load(f)

# Read existing lego_pairs.tmp.json
with open('lego_pairs.tmp.json', 'r', encoding='utf-8') as f:
    lego_data = json.load(f)

# Extract LEGOs for S0141-S0210
def extract_lego(seed_id, target, known):
    """Extract LEGOs from a seed following Phase 3 intelligence"""
    legos = []
    lego_num = 1

    # Mapping of seed IDs to LEGO structure
    seed_num = int(seed_id[1:])

    # S0141-S0210 LEGOs (conditional sentences, connectors, comparisons, etc.)
    if seed_num == 141:  # 如果我知道我会告诉你 -> If I knew I would tell you.
        legos = [
            [f"{seed_id}L01", "B", "如果", "if"],
            [f"{seed_id}L02", "B", "我", "I"],
            [f"{seed_id}L03", "B", "知道", "knew"],
            [f"{seed_id}L04", "B", "我", "I"],
            [f"{seed_id}L05", "B", "会", "would"],
            [f"{seed_id}L06", "C", "告诉你", "tell you", [["告诉", "tell"], ["你", "you"]]]
        ]
    elif seed_num == 142:  # 如果你帮我我会很高兴
        legos = [
            [f"{seed_id}L01", "B", "如果", "if"],
            [f"{seed_id}L02", "B", "你", "you"],
            [f"{seed_id}L03", "C", "帮我", "help me", [["帮", "help"], ["我", "me"]]],
            [f"{seed_id}L04", "B", "我", "I"],
            [f"{seed_id}L05", "B", "会", "will"],
            [f"{seed_id}L06", "C", "很高兴", "be happy", [["很", "very"], ["高兴", "happy"]]]
        ]
    elif seed_num == 143:  # 如果我有时间我会做
        legos = [
            [f"{seed_id}L01", "B", "如果", "if"],
            [f"{seed_id}L02", "B", "我", "I"],
            [f"{seed_id}L03", "C", "有时间", "have time", [["有", "have"], ["时间", "time"]]],
            [f"{seed_id}L04", "B", "我", "I"],
            [f"{seed_id}L05", "B", "会", "will"],
            [f"{seed_id}L06", "B", "做", "do it"]
        ]
    elif seed_num == 144:  # 如果她来她会理解
        legos = [
            [f"{seed_id}L01", "B", "如果", "if"],
            [f"{seed_id}L02", "B", "她", "she"],
            [f"{seed_id}L03", "B", "来", "comes"],
            [f"{seed_id}L04", "B", "她", "she"],
            [f"{seed_id}L05", "B", "会", "will"],
            [f"{seed_id}L06", "B", "理解", "understand"]
        ]
    elif seed_num == 145:  # 如果我们练习我们会提高
        legos = [
            [f"{seed_id}L01", "B", "如果", "if"],
            [f"{seed_id}L02", "B", "我们", "we"],
            [f"{seed_id}L03", "B", "练习", "practise"],
            [f"{seed_id}L04", "B", "我们", "we"],
            [f"{seed_id}L05", "B", "会", "will"],
            [f"{seed_id}L06", "B", "提高", "improve"]
        ]
    elif seed_num == 146:  # 如果他们想他们可以学
        legos = [
            [f"{seed_id}L01", "B", "如果", "if"],
            [f"{seed_id}L02", "B", "他们", "they"],
            [f"{seed_id}L03", "B", "想", "want"],
            [f"{seed_id}L04", "B", "他们", "they"],
            [f"{seed_id}L05", "B", "可以", "can"],
            [f"{seed_id}L06", "B", "学", "learn"]
        ]
    elif seed_num == 147:  # 如果我能我会帮你
        legos = [
            [f"{seed_id}L01", "B", "如果", "if"],
            [f"{seed_id}L02", "B", "我", "I"],
            [f"{seed_id}L03", "B", "能", "can"],
            [f"{seed_id}L04", "B", "我", "I"],
            [f"{seed_id}L05", "B", "会", "will"],
            [f"{seed_id}L06", "C", "帮你", "help you", [["帮", "help"], ["你", "you"]]]
        ]
    elif seed_num == 148:  # 如果你试你会成功
        legos = [
            [f"{seed_id}L01", "B", "如果", "if"],
            [f"{seed_id}L02", "B", "你", "you"],
            [f"{seed_id}L03", "B", "试", "try"],
            [f"{seed_id}L04", "B", "你", "you"],
            [f"{seed_id}L05", "B", "会", "will"],
            [f"{seed_id}L06", "B", "成功", "succeed"]
        ]
    elif seed_num == 149:  # 如果我知道我早就说了
        legos = [
            [f"{seed_id}L01", "B", "如果", "if"],
            [f"{seed_id}L02", "B", "我", "I"],
            [f"{seed_id}L03", "B", "知道", "had known"],
            [f"{seed_id}L04", "B", "我", "I"],
            [f"{seed_id}L05", "C", "早就说了", "would have said", [["早就", "would have"], ["说了", "said"]]]
        ]
    elif seed_num == 150:  # 如果你问我早就告诉你了
        legos = [
            [f"{seed_id}L01", "B", "如果", "if"],
            [f"{seed_id}L02", "B", "你", "you"],
            [f"{seed_id}L03", "B", "问", "had asked"],
            [f"{seed_id}L04", "B", "我", "I"],
            [f"{seed_id}L05", "C", "早就告诉你了", "would have told you", [["早就", "would have"], ["告诉你", "told you"], ["了", "marker"]]]
        ]
    elif seed_num == 151:  # 除非我练习否则我不会提高
        legos = [
            [f"{seed_id}L01", "B", "除非", "unless"],
            [f"{seed_id}L02", "B", "我", "I"],
            [f"{seed_id}L03", "B", "练习", "practise"],
            [f"{seed_id}L04", "B", "否则", "or else"],
            [f"{seed_id}L05", "B", "我", "I"],
            [f"{seed_id}L06", "C", "不会提高", "won't improve", [["不会", "won't"], ["提高", "improve"]]]
        ]
    elif seed_num == 152:  # 除非你帮我否则我做不到
        legos = [
            [f"{seed_id}L01", "B", "除非", "unless"],
            [f"{seed_id}L02", "B", "你", "you"],
            [f"{seed_id}L03", "C", "帮我", "help me", [["帮", "help"], ["我", "me"]]],
            [f"{seed_id}L04", "B", "否则", "or else"],
            [f"{seed_id}L05", "B", "我", "I"],
            [f"{seed_id}L06", "C", "做不到", "can't do it", [["做", "do"], ["不到", "can't"]]]
        ]
    elif seed_num == 153:  # 除非他们来否则我们不能开始
        legos = [
            [f"{seed_id}L01", "B", "除非", "unless"],
            [f"{seed_id}L02", "B", "他们", "they"],
            [f"{seed_id}L03", "B", "来", "come"],
            [f"{seed_id}L04", "B", "否则", "or else"],
            [f"{seed_id}L05", "B", "我们", "we"],
            [f"{seed_id}L06", "C", "不能开始", "can't start", [["不能", "can't"], ["开始", "start"]]]
        ]
    elif seed_num == 154:  # 虽然很难但很有趣
        legos = [
            [f"{seed_id}L01", "B", "虽然", "although"],
            [f"{seed_id}L02", "B", "很难", "it's difficult"],
            [f"{seed_id}L03", "B", "但", "but"],
            [f"{seed_id}L04", "C", "很有趣", "it's interesting", [["很", "very"], ["有趣", "interesting"]]]
        ]
    elif seed_num == 155:  # 虽然我累了但我想继续
        legos = [
            [f"{seed_id}L01", "B", "虽然", "although"],
            [f"{seed_id}L02", "B", "我", "I"],
            [f"{seed_id}L03", "B", "累了", "am tired"],
            [f"{seed_id}L04", "B", "但", "but"],
            [f"{seed_id}L05", "B", "我", "I"],
            [f"{seed_id}L06", "B", "想", "want to"],
            [f"{seed_id}L07", "B", "继续", "continue"]
        ]
    elif seed_num == 156:  # 虽然她很忙但她会帮忙
        legos = [
            [f"{seed_id}L01", "B", "虽然", "although"],
            [f"{seed_id}L02", "B", "她", "she"],
            [f"{seed_id}L03", "C", "很忙", "is busy", [["很", "very"], ["忙", "busy"]]],
            [f"{seed_id}L04", "B", "但", "but"],
            [f"{seed_id}L05", "B", "她", "she"],
            [f"{seed_id}L06", "B", "会", "will"],
            [f"{seed_id}L07", "B", "帮忙", "help"]
        ]
    elif seed_num == 157:  # 因为我在学习所以我在提高
        legos = [
            [f"{seed_id}L01", "B", "因为", "because"],
            [f"{seed_id}L02", "B", "我", "I"],
            [f"{seed_id}L03", "C", "在学习", "am learning", [["在", "am"], ["学习", "learning"]]],
            [f"{seed_id}L04", "B", "所以", "so"],
            [f"{seed_id}L05", "B", "我", "I"],
            [f"{seed_id}L06", "C", "在提高", "am improving", [["在", "am"], ["提高", "improving"]]]
        ]
    elif seed_num == 158:  # 因为你在帮我所以我能做
        legos = [
            [f"{seed_id}L01", "B", "因为", "because"],
            [f"{seed_id}L02", "B", "你", "you"],
            [f"{seed_id}L03", "C", "在帮我", "are helping me", [["在", "are"], ["帮我", "helping me"]]],
            [f"{seed_id}L04", "B", "所以", "so"],
            [f"{seed_id}L05", "B", "我", "I"],
            [f"{seed_id}L06", "C", "能做", "can do it", [["能", "can"], ["做", "do it"]]]
        ]
    elif seed_num == 159:  # 因为他们在练习所以他们在进步
        legos = [
            [f"{seed_id}L01", "B", "因为", "because"],
            [f"{seed_id}L02", "B", "他们", "they"],
            [f"{seed_id}L03", "C", "在练习", "are practising", [["在", "are"], ["练习", "practising"]]],
            [f"{seed_id}L04", "B", "所以", "so"],
            [f"{seed_id}L05", "B", "他们", "they"],
            [f"{seed_id}L06", "C", "在进步", "are making progress", [["在", "are"], ["进步", "making progress"]]]
        ]
    elif seed_num == 160:  # 当我学习的时候我喜欢听音乐
        legos = [
            [f"{seed_id}L01", "C", "当我学习的时候", "when I study", [["当", "when"], ["我", "I"], ["学习", "study"], ["的时候", "marker"]]],
            [f"{seed_id}L02", "B", "我", "I"],
            [f"{seed_id}L03", "C", "喜欢听音乐", "like to listen to music", [["喜欢", "like to"], ["听", "listen to"], ["音乐", "music"]]]
        ]
    elif seed_num == 161:  # 当你说的时候我在听
        legos = [
            [f"{seed_id}L01", "C", "当你说的时候", "when you speak", [["当", "when"], ["你", "you"], ["说", "speak"], ["的时候", "marker"]]],
            [f"{seed_id}L02", "B", "我", "I"],
            [f"{seed_id}L03", "C", "在听", "am listening", [["在", "am"], ["听", "listening"]]]
        ]
    elif seed_num == 162:  # 当她来的时候我们会开始
        legos = [
            [f"{seed_id}L01", "C", "当她来的时候", "when she comes", [["当", "when"], ["她", "she"], ["来", "comes"], ["的时候", "marker"]]],
            [f"{seed_id}L02", "B", "我们", "we"],
            [f"{seed_id}L03", "B", "会", "will"],
            [f"{seed_id}L04", "B", "开始", "start"]
        ]
    elif seed_num == 163:  # 在我学习之前我喝咖啡
        legos = [
            [f"{seed_id}L01", "C", "在我学习之前", "before I study", [["在", "before"], ["我", "I"], ["学习", "study"], ["之前", "marker"]]],
            [f"{seed_id}L02", "B", "我", "I"],
            [f"{seed_id}L03", "C", "喝咖啡", "drink coffee", [["喝", "drink"], ["咖啡", "coffee"]]]
        ]
    elif seed_num == 164:  # 在你走之前你应该说再见
        legos = [
            [f"{seed_id}L01", "C", "在你走之前", "before you go", [["在", "before"], ["你", "you"], ["走", "go"], ["之前", "marker"]]],
            [f"{seed_id}L02", "B", "你", "you"],
            [f"{seed_id}L03", "B", "应该", "should"],
            [f"{seed_id}L04", "C", "说再见", "say goodbye", [["说", "say"], ["再见", "goodbye"]]]
        ]
    elif seed_num == 165:  # 在他们开始之前他们需要准备
        legos = [
            [f"{seed_id}L01", "C", "在他们开始之前", "before they start", [["在", "before"], ["他们", "they"], ["开始", "start"], ["之前", "marker"]]],
            [f"{seed_id}L02", "B", "他们", "they"],
            [f"{seed_id}L03", "C", "需要准备", "need to prepare", [["需要", "need to"], ["准备", "prepare"]]]
        ]
    elif seed_num == 166:  # 在我说之后你可以说
        legos = [
            [f"{seed_id}L01", "C", "在我说之后", "after I speak", [["在", "after"], ["我", "I"], ["说", "speak"], ["之后", "marker"]]],
            [f"{seed_id}L02", "B", "你", "you"],
            [f"{seed_id}L03", "C", "可以说", "can speak", [["可以", "can"], ["说", "speak"]]]
        ]
    elif seed_num == 167:  # 在你听之后你会理解
        legos = [
            [f"{seed_id}L01", "C", "在你听之后", "after you listen", [["在", "after"], ["你", "you"], ["听", "listen"], ["之后", "marker"]]],
            [f"{seed_id}L02", "B", "你", "you"],
            [f"{seed_id}L03", "B", "会", "will"],
            [f"{seed_id}L04", "B", "理解", "understand"]
        ]
    elif seed_num == 168:  # 在我们练习之后我们会更好
        legos = [
            [f"{seed_id}L01", "C", "在我们练习之后", "after we practise", [["在", "after"], ["我们", "we"], ["练习", "practise"], ["之后", "marker"]]],
            [f"{seed_id}L02", "B", "我们", "we"],
            [f"{seed_id}L03", "B", "会", "will"],
            [f"{seed_id}L04", "C", "更好", "be better", [["更", "more"], ["好", "better"]]]
        ]
    elif seed_num == 169:  # 自从我开始以来我学了很多
        legos = [
            [f"{seed_id}L01", "C", "自从我开始以来", "since I started", [["自从", "since"], ["我", "I"], ["开始", "started"], ["以来", "marker"]]],
            [f"{seed_id}L02", "B", "我", "I"],
            [f"{seed_id}L03", "C", "学了很多", "have learned a lot", [["学了", "have learned"], ["很多", "a lot"]]]
        ]
    elif seed_num == 170:  # 自从你来了以来进步很大
        legos = [
            [f"{seed_id}L01", "C", "自从你来了以来", "since you came", [["自从", "since"], ["你", "you"], ["来了", "came"], ["以来", "marker"]]],
            [f"{seed_id}L02", "C", "进步很大", "there's been a lot of progress", [["进步", "progress"], ["很大", "a lot"]]]
        ]
    elif seed_num == 171:  # 直到我准备好我不会说
        legos = [
            [f"{seed_id}L01", "B", "直到", "until"],
            [f"{seed_id}L02", "B", "我", "I"],
            [f"{seed_id}L03", "B", "准备好", "am ready"],
            [f"{seed_id}L04", "B", "我", "I"],
            [f"{seed_id}L05", "C", "不会说", "won't speak", [["不会", "won't"], ["说", "speak"]]]
        ]
    elif seed_num == 172:  # 直到你完成你不能走
        legos = [
            [f"{seed_id}L01", "B", "直到", "until"],
            [f"{seed_id}L02", "B", "你", "you"],
            [f"{seed_id}L03", "B", "完成", "finish"],
            [f"{seed_id}L04", "B", "你", "you"],
            [f"{seed_id}L05", "C", "不能走", "can't go", [["不能", "can't"], ["走", "go"]]]
        ]
    elif seed_num == 173:  # 直到他们来我们会等
        legos = [
            [f"{seed_id}L01", "B", "直到", "until"],
            [f"{seed_id}L02", "B", "他们", "they"],
            [f"{seed_id}L03", "B", "来", "come"],
            [f"{seed_id}L04", "B", "我们", "we"],
            [f"{seed_id}L05", "B", "会", "will"],
            [f"{seed_id}L06", "B", "等", "wait"]
        ]
    elif seed_num == 174:  # 只要你在练习你就会提高
        legos = [
            [f"{seed_id}L01", "C", "只要你在练习", "as long as you're practising", [["只要", "as long as"], ["你", "you"], ["在", "are"], ["练习", "practising"]]],
            [f"{seed_id}L02", "B", "你", "you"],
            [f"{seed_id}L03", "B", "就", "then"],
            [f"{seed_id}L04", "B", "会", "will"],
            [f"{seed_id}L05", "B", "提高", "improve"]
        ]
    elif seed_num == 175:  # 只要我在试我就会学
        legos = [
            [f"{seed_id}L01", "C", "只要我在试", "as long as I'm trying", [["只要", "as long as"], ["我", "I"], ["在", "am"], ["试", "trying"]]],
            [f"{seed_id}L02", "B", "我", "I"],
            [f"{seed_id}L03", "B", "就", "then"],
            [f"{seed_id}L04", "B", "会", "will"],
            [f"{seed_id}L05", "B", "学", "learn"]
        ]
    elif seed_num == 176:  # 只要她在听她就会理解
        legos = [
            [f"{seed_id}L01", "C", "只要她在听", "as long as she's listening", [["只要", "as long as"], ["她", "she"], ["在", "is"], ["听", "listening"]]],
            [f"{seed_id}L02", "B", "她", "she"],
            [f"{seed_id}L03", "B", "就", "then"],
            [f"{seed_id}L04", "B", "会", "will"],
            [f"{seed_id}L05", "B", "理解", "understand"]
        ]
    elif seed_num == 177:  # 一旦我学会我就会告诉你
        legos = [
            [f"{seed_id}L01", "C", "一旦我学会", "once I learn", [["一旦", "once"], ["我", "I"], ["学会", "learn"]]],
            [f"{seed_id}L02", "B", "我", "I"],
            [f"{seed_id}L03", "B", "就", "then"],
            [f"{seed_id}L04", "B", "会", "will"],
            [f"{seed_id}L05", "C", "告诉你", "tell you", [["告诉", "tell"], ["你", "you"]]]
        ]
    elif seed_num == 178:  # 一旦你理解你就会知道
        legos = [
            [f"{seed_id}L01", "C", "一旦你理解", "once you understand", [["一旦", "once"], ["你", "you"], ["理解", "understand"]]],
            [f"{seed_id}L02", "B", "你", "you"],
            [f"{seed_id}L03", "B", "就", "then"],
            [f"{seed_id}L04", "B", "会", "will"],
            [f"{seed_id}L05", "B", "知道", "know"]
        ]
    elif seed_num == 179:  # 一旦他们开始他们会继续
        legos = [
            [f"{seed_id}L01", "C", "一旦他们开始", "once they start", [["一旦", "once"], ["他们", "they"], ["开始", "start"]]],
            [f"{seed_id}L02", "B", "他们", "they"],
            [f"{seed_id}L03", "B", "会", "will"],
            [f"{seed_id}L04", "B", "继续", "continue"]
        ]
    elif seed_num == 180:  # 每当我有时间我就练习
        legos = [
            [f"{seed_id}L01", "C", "每当我有时间", "whenever I have time", [["每当", "whenever"], ["我", "I"], ["有时间", "have time"]]],
            [f"{seed_id}L02", "B", "我", "I"],
            [f"{seed_id}L03", "B", "就", "then"],
            [f"{seed_id}L04", "B", "练习", "practise"]
        ]
    elif seed_num == 181:  # 每当你需要你可以问
        legos = [
            [f"{seed_id}L01", "C", "每当你需要", "whenever you need", [["每当", "whenever"], ["你", "you"], ["需要", "need"]]],
            [f"{seed_id}L02", "B", "你", "you"],
            [f"{seed_id}L03", "C", "可以问", "can ask", [["可以", "can"], ["问", "ask"]]]
        ]
    elif seed_num == 182:  # 每当她想她可以来
        legos = [
            [f"{seed_id}L01", "C", "每当她想", "whenever she wants", [["每当", "whenever"], ["她", "she"], ["想", "wants"]]],
            [f"{seed_id}L02", "B", "她", "she"],
            [f"{seed_id}L03", "C", "可以来", "can come", [["可以", "can"], ["来", "come"]]]
        ]
    elif seed_num == 183:  # 无论什么时候你准备好就告诉我
        legos = [
            [f"{seed_id}L01", "C", "无论什么时候你准备好", "whenever you're ready", [["无论什么时候", "whenever"], ["你", "you"], ["准备好", "are ready"]]],
            [f"{seed_id}L02", "B", "就", "then"],
            [f"{seed_id}L03", "C", "告诉我", "tell me", [["告诉", "tell"], ["我", "me"]]]
        ]
    elif seed_num == 184:  # 无论你在哪儿你都能学
        legos = [
            [f"{seed_id}L01", "C", "无论你在哪儿", "wherever you are", [["无论", "wherever"], ["你", "you"], ["在哪儿", "are"]]],
            [f"{seed_id}L02", "B", "你", "you"],
            [f"{seed_id}L03", "B", "都", "still"],
            [f"{seed_id}L04", "C", "能学", "can learn", [["能", "can"], ["学", "learn"]]]
        ]
    elif seed_num == 185:  # 无论我去哪儿我都练习
        legos = [
            [f"{seed_id}L01", "C", "无论我去哪儿", "wherever I go", [["无论", "wherever"], ["我", "I"], ["去哪儿", "go"]]],
            [f"{seed_id}L02", "B", "我", "I"],
            [f"{seed_id}L03", "B", "都", "still"],
            [f"{seed_id}L04", "B", "练习", "practise"]
        ]
    elif seed_num == 186:  # 无论他们住在哪儿他们都能说
        legos = [
            [f"{seed_id}L01", "C", "无论他们住在哪儿", "wherever they live", [["无论", "wherever"], ["他们", "they"], ["住在哪儿", "live"]]],
            [f"{seed_id}L02", "B", "他们", "they"],
            [f"{seed_id}L03", "B", "都", "still"],
            [f"{seed_id}L04", "C", "能说", "can speak", [["能", "can"], ["说", "speak"]]]
        ]
    elif seed_num == 187:  # 无论谁来都会喜欢
        legos = [
            [f"{seed_id}L01", "C", "无论谁来", "whoever comes", [["无论谁", "whoever"], ["来", "comes"]]],
            [f"{seed_id}L02", "B", "都", "still"],
            [f"{seed_id}L03", "B", "会", "will"],
            [f"{seed_id}L04", "B", "喜欢", "like it"]
        ]
    elif seed_num == 188:  # 无论谁学都会提高
        legos = [
            [f"{seed_id}L01", "C", "无论谁学", "whoever learns", [["无论谁", "whoever"], ["学", "learns"]]],
            [f"{seed_id}L02", "B", "都", "still"],
            [f"{seed_id}L03", "B", "会", "will"],
            [f"{seed_id}L04", "B", "提高", "improve"]
        ]
    elif seed_num == 189:  # 无论谁试都会成功
        legos = [
            [f"{seed_id}L01", "C", "无论谁试", "whoever tries", [["无论谁", "whoever"], ["试", "tries"]]],
            [f"{seed_id}L02", "B", "都", "still"],
            [f"{seed_id}L03", "B", "会", "will"],
            [f"{seed_id}L04", "B", "成功", "succeed"]
        ]
    elif seed_num == 190:  # 无论什么发生我都会继续
        legos = [
            [f"{seed_id}L01", "C", "无论什么发生", "whatever happens", [["无论什么", "whatever"], ["发生", "happens"]]],
            [f"{seed_id}L02", "B", "我", "I"],
            [f"{seed_id}L03", "B", "都", "still"],
            [f"{seed_id}L04", "B", "会", "will"],
            [f"{seed_id}L05", "B", "继续", "continue"]
        ]
    elif seed_num == 191:  # 无论你说什么我都会听
        legos = [
            [f"{seed_id}L01", "C", "无论你说什么", "whatever you say", [["无论", "whatever"], ["你", "you"], ["说什么", "say"]]],
            [f"{seed_id}L02", "B", "我", "I"],
            [f"{seed_id}L03", "B", "都", "still"],
            [f"{seed_id}L04", "B", "会", "will"],
            [f"{seed_id}L05", "B", "听", "listen"]
        ]
    elif seed_num == 192:  # 无论他们做什么我都会支持
        legos = [
            [f"{seed_id}L01", "C", "无论他们做什么", "whatever they do", [["无论", "whatever"], ["他们", "they"], ["做什么", "do"]]],
            [f"{seed_id}L02", "B", "我", "I"],
            [f"{seed_id}L03", "B", "都", "still"],
            [f"{seed_id}L04", "B", "会", "will"],
            [f"{seed_id}L05", "B", "支持", "support"]
        ]
    elif seed_num == 193:  # 然而我做它我都会学
        legos = [
            [f"{seed_id}L01", "C", "然而我做它", "however I do it", [["然而", "however"], ["我", "I"], ["做它", "do it"]]],
            [f"{seed_id}L02", "B", "我", "I"],
            [f"{seed_id}L03", "B", "都", "still"],
            [f"{seed_id}L04", "B", "会", "will"],
            [f"{seed_id}L05", "B", "学", "learn"]
        ]
    elif seed_num == 194:  # 然而你说它都有用
        legos = [
            [f"{seed_id}L01", "C", "然而你说它", "however you say it", [["然而", "however"], ["你", "you"], ["说它", "say it"]]],
            [f"{seed_id}L02", "B", "都", "still"],
            [f"{seed_id}L03", "C", "有用", "is useful", [["有用", "useful"]]]
        ]
    elif seed_num == 195:  # 然而他们学它他们都会提高
        legos = [
            [f"{seed_id}L01", "C", "然而他们学它", "however they learn it", [["然而", "however"], ["他们", "they"], ["学它", "learn it"]]],
            [f"{seed_id}L02", "B", "他们", "they"],
            [f"{seed_id}L03", "B", "都", "still"],
            [f"{seed_id}L04", "B", "会", "will"],
            [f"{seed_id}L05", "B", "提高", "improve"]
        ]
    elif seed_num == 196:  # 我练习得越多我就越好
        legos = [
            [f"{seed_id}L01", "C", "我练习得越多", "the more I practise", [["我", "I"], ["练习得", "practise"], ["越多", "the more"]]],
            [f"{seed_id}L02", "C", "我就越好", "the better I get", [["我", "I"], ["就", "then"], ["越好", "the better"]]]
        ]
    elif seed_num == 197:  # 你学得越多你就越理解
        legos = [
            [f"{seed_id}L01", "C", "你学得越多", "the more you learn", [["你", "you"], ["学得", "learn"], ["越多", "the more"]]],
            [f"{seed_id}L02", "C", "你就越理解", "the more you understand", [["你", "you"], ["就", "then"], ["越", "the more"], ["理解", "understand"]]]
        ]
    elif seed_num == 198:  # 他们说得越多他们就越自信
        legos = [
            [f"{seed_id}L01", "C", "他们说得越多", "the more they speak", [["他们", "they"], ["说得", "speak"], ["越多", "the more"]]],
            [f"{seed_id}L02", "C", "他们就越自信", "the more confident they become", [["他们", "they"], ["就", "then"], ["越", "the more"], ["自信", "confident"]]]
        ]
    elif seed_num == 199:  # 它越容易我就越快
        legos = [
            [f"{seed_id}L01", "C", "它越容易", "the easier it is", [["它", "it"], ["越", "the more"], ["容易", "easy"]]],
            [f"{seed_id}L02", "C", "我就越快", "the faster I am", [["我", "I"], ["就", "then"], ["越", "the more"], ["快", "fast"]]]
        ]
    elif seed_num == 200:  # 我越累我就越慢
        legos = [
            [f"{seed_id}L01", "C", "我越累", "the more tired I am", [["我", "I"], ["越", "the more"], ["累", "tired"]]],
            [f"{seed_id}L02", "C", "我就越慢", "the slower I am", [["我", "I"], ["就", "then"], ["越", "the more"], ["慢", "slow"]]]
        ]
    elif seed_num == 201:  # 我想知道你在想什么
        legos = [
            [f"{seed_id}L01", "B", "我", "I"],
            [f"{seed_id}L02", "C", "想知道", "wonder", [["想", "want to"], ["知道", "know"]]],
            [f"{seed_id}L03", "C", "你在想什么", "what you're thinking", [["你", "you"], ["在想", "are thinking"], ["什么", "what"]]]
        ]
    elif seed_num == 202:  # 我不知道该说什么
        legos = [
            [f"{seed_id}L01", "B", "我", "I"],
            [f"{seed_id}L02", "C", "不知道", "don't know", [["不", "don't"], ["知道", "know"]]],
            [f"{seed_id}L03", "C", "该说什么", "what to say", [["该", "should"], ["说", "say"], ["什么", "what"]]]
        ]
    elif seed_num == 203:  # 你知道怎么做吗？
        legos = [
            [f"{seed_id}L01", "B", "你", "you"],
            [f"{seed_id}L02", "B", "知道", "know"],
            [f"{seed_id}L03", "C", "怎么做", "how to do it", [["怎么", "how to"], ["做", "do"]]],
            [f"{seed_id}L04", "B", "吗", "question"]
        ]
    elif seed_num == 204:  # 我明白你的意思
        legos = [
            [f"{seed_id}L01", "B", "我", "I"],
            [f"{seed_id}L02", "B", "明白", "understand"],
            [f"{seed_id}L03", "C", "你的意思", "what you mean", [["你的", "you"], ["意思", "mean"]]]
        ]
    elif seed_num == 205:  # 你懂我说的吗？
        legos = [
            [f"{seed_id}L01", "B", "你", "you"],
            [f"{seed_id}L02", "B", "懂", "understand"],
            [f"{seed_id}L03", "C", "我说的", "what I'm saying", [["我", "I"], ["说的", "am saying"]]],
            [f"{seed_id}L04", "B", "吗", "question"]
        ]
    elif seed_num == 206:  # 我希望你能帮我
        legos = [
            [f"{seed_id}L01", "B", "我", "I"],
            [f"{seed_id}L02", "B", "希望", "hope"],
            [f"{seed_id}L03", "B", "你", "you"],
            [f"{seed_id}L04", "B", "能", "can"],
            [f"{seed_id}L05", "C", "帮我", "help me", [["帮", "help"], ["我", "me"]]]
        ]
    elif seed_num == 207:  # 我希望学得快一点
        legos = [
            [f"{seed_id}L01", "B", "我", "I"],
            [f"{seed_id}L02", "C", "希望学得快一点", "hope to learn more quickly", [["希望", "hope to"], ["学得", "learn"], ["快一点", "more quickly"]]]
        ]
    elif seed_num == 208:  # 我期待见到你
        legos = [
            [f"{seed_id}L01", "B", "我", "I"],
            [f"{seed_id}L02", "C", "期待见到你", "am looking forward to seeing you", [["期待", "am looking forward to"], ["见到", "seeing"], ["你", "you"]]]
        ]
    elif seed_num == 209:  # 我期待更多地学习
        legos = [
            [f"{seed_id}L01", "B", "我", "I"],
            [f"{seed_id}L02", "C", "期待更多地学习", "am looking forward to learning more", [["期待", "am looking forward to"], ["更多地", "more"], ["学习", "learning"]]]
        ]
    elif seed_num == 210:  # 我需要更多地练习
        legos = [
            [f"{seed_id}L01", "B", "我", "I"],
            [f"{seed_id}L02", "C", "需要更多地练习", "need to practise more", [["需要", "need to"], ["更多地", "more"], ["练习", "practise"]]]
        ]
    else:
        raise ValueError(f"No LEGO extraction logic for seed {seed_id}")

    return [seed_id, [target, known], legos]

# Extract LEGOs for S0141-S0210
new_legos = []
for seed_id, translations in seed_data["translations"].items():
    seed_num = int(seed_id[1:])
    if 141 <= seed_num <= 210:
        target, known = translations
        lego_entry = extract_lego(seed_id, target, known)
        new_legos.append(lego_entry)

# Find the insertion point (after S0140, before S0211)
insertion_index = None
for i, seed in enumerate(lego_data["seeds"]):
    if seed[0] == "S0140":
        insertion_index = i + 1
        break

if insertion_index is None:
    print("ERROR: Could not find S0140 in existing file!")
    exit(1)

# Insert the new LEGOs
lego_data["seeds"] = lego_data["seeds"][:insertion_index] + new_legos + lego_data["seeds"][insertion_index:]

# Write back to file
with open('lego_pairs.tmp.json', 'w', encoding='utf-8') as f:
    json.dump(lego_data, f, ensure_ascii=False, indent=2)

print(f"✅ Successfully inserted {len(new_legos)} LEGOs (S0141-S0210) into lego_pairs.tmp.json")
print(f"   Total seeds in file: {len(lego_data['seeds'])}")
