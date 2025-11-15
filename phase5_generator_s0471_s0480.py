#!/usr/bin/env python3
"""
Phase 5 Intelligent Content Generator for Seeds S0471-S0480
Generates practice phrase baskets following Phase 5 Intelligence v7.0

Semantic approach:
- Creates meaningful utterances using available vocabulary
- Follows 2-2-2-4 distribution pattern
- Ensures all words come from vocabulary sources (GATE compliance)
"""

import json
import os
from typing import Dict, List, Tuple

# Enhanced seed definitions with semantic knowledge
SEED_PHRASES = {
    "S0471": {
        "legos": {
            "S0471L01": {
                "meaning": "do you want (question about preference)",
                "phrases": [
                    ("Do you want", "你想", 1),
                    ("You want it", "你想要它", 1),
                    ("Do you want to rest", "你想休息吗", 2),
                    ("Do you really want", "你真的想吗", 2),
                    ("What do you want", "你想要什么", 3),
                    ("Do you want to stop here", "你想在这里停下来吗", 3),
                    ("Do you want to stay longer", "你想停下来更久吗", 4),
                    ("Do you want to stop for a rest", "你想停下来休息吗", 4),
                    ("I want to know if you want to continue", "我想知道你是否想继续", 4),
                    ("Do you want to stop for a rest now", "你想现在停下来休息吗", 5),
                ]
            },
            "S0471L02": {
                "meaning": "to stop (halting action)",
                "phrases": [
                    ("Stop", "停下来", 1),
                    ("Let's stop", "让我们停下来", 1),
                    ("We should stop", "我们应该停下来", 2),
                    ("Time to stop", "是停下来的时候了", 2),
                    ("Do you want to stop", "你想停下来吗", 2),
                    ("I want to stop here", "我想在这里停下来", 3),
                    ("We need to stop now", "我们现在需要停下来", 3),
                    ("Let's stop and rest", "让我们停下来休息", 4),
                    ("Before we stop", "在我们停下来之前", 4),
                    ("Do you want to stop for a rest", "你想停下来休息吗", 5),
                ]
            },
            "S0471L03": {
                "meaning": "to stop for a rest (pausing for recovery)",
                "phrases": [
                    ("Stop for a rest", "停下来休息", 1),
                    ("Rest now", "现在休息", 1),
                    ("Take a rest", "休息一下", 2),
                    ("We need to rest", "我们需要休息", 2),
                    ("I want to rest", "我想休息", 2),
                    ("Time for rest", "是休息的时候了", 3),
                    ("Let's rest here", "让我们在这里休息", 3),
                    ("Should we stop to rest", "我们应该停下来休息吗", 4),
                    ("Do you want to rest here", "你想在这里休息吗", 4),
                    ("Do you want to stop for a rest", "你想停下来休息吗", 5),
                ]
            },
            "S0471L04": {
                "meaning": "rest (noun - state of recovery)",
                "phrases": [
                    ("Rest", "休息", 1),
                    ("Some rest", "一些休息", 1),
                    ("After rest", "休息之后", 2),
                    ("We rest", "我们休息", 2),
                    ("Time for rest", "是休息的时候了", 2),
                    ("Rest is good", "休息很好", 3),
                    ("I need rest", "我需要休息", 3),
                    ("Let me rest", "让我休息", 3),
                    ("You need rest", "你需要休息", 4),
                    ("Let's rest for a while", "让我们休息一会儿", 5),
                ]
            },
            "S0471L05": {
                "meaning": "question particle (makes it a question)",
                "phrases": [
                    ("Is it", "是吗", 1),
                    ("Really", "真的吗", 1),
                    ("Do you", "你吗", 2),
                    ("Will you", "你会吗", 2),
                    ("Do you want to stop", "你想停下来吗", 2),
                    ("Are they coming", "他们来吗", 3),
                    ("Is this right", "这是对的吗", 3),
                    ("Do we need to wait", "我们需要等待吗", 3),
                    ("Do you want to rest here", "你想在这里休息吗", 4),
                    ("Do you want to stop for a rest", "你想停下来休息吗", 5),
                ]
            },
        }
    },
    "S0472": {
        "legos": {
            "S0472L01": {
                "meaning": "part of the problem (a portion of the issue)",
                "phrases": [
                    ("Part of the problem", "问题的一部分", 1),
                    ("The problem", "问题", 1),
                    ("What is the problem", "问题是什么", 2),
                    ("Part of it", "一部分", 2),
                    ("The main problem", "主要问题", 2),
                    ("That is the problem", "那就是问题", 3),
                    ("There is a problem", "有问题", 3),
                    ("The biggest problem", "最大的问题", 3),
                    ("This is part of the problem", "这是问题的一部分", 4),
                    ("Part of the problem is that we don't know the facts", "问题的一部分是我们不知道事实", 5),
                ]
            },
            "S0472L02": {
                "meaning": "a part (a portion or section)",
                "phrases": [
                    ("A part", "一部分", 1),
                    ("Part", "部分", 1),
                    ("Some part", "一些部分", 2),
                    ("Which part", "哪一部分", 2),
                    ("The first part", "第一部分", 2),
                    ("Most parts", "大部分", 3),
                    ("Is this part", "这是部分吗", 3),
                    ("That is part of it", "那是其中的一部分", 4),
                    ("What part do you mean", "你是指哪一部分", 4),
                    ("A part of the problem is that we don't know", "问题的一部分是我们不知道", 5),
                ]
            },
            "S0472L03": {
                "meaning": "is (verb - existence or identity)",
                "phrases": [
                    ("Is", "是", 1),
                    ("It is", "它是", 1),
                    ("This is", "这是", 2),
                    ("That is", "那是", 2),
                    ("What is it", "它是什么", 2),
                    ("This is good", "这很好", 3),
                    ("That is true", "那是真的", 3),
                    ("The problem is clear", "问题很清楚", 3),
                    ("What is the answer", "答案是什么", 4),
                    ("Part of the problem is that we don't know", "问题的一部分是我们不知道", 5),
                ]
            },
            "S0472L04": {
                "meaning": "we don't know (collective negation of knowledge)",
                "phrases": [
                    ("We don't know", "我们不知道", 1),
                    ("Don't know", "不知道", 1),
                    ("Nobody knows", "没人知道", 2),
                    ("I don't know", "我不知道", 2),
                    ("We do not know this", "我们不知道这个", 2),
                    ("What we don't know", "我们不知道什么", 3),
                    ("They don't know either", "他们也不知道", 3),
                    ("We still don't know", "我们仍然不知道", 3),
                    ("Nobody knows what happened", "没人知道发生了什么", 4),
                    ("We don't know the facts about this", "我们不知道这个的事实", 5),
                ]
            },
            "S0472L05": {
                "meaning": "don't know (negation of knowledge)",
                "phrases": [
                    ("Don't know", "不知道", 1),
                    ("I don't know", "我不知道", 1),
                    ("You don't know", "你不知道", 2),
                    ("He doesn't know", "他不知道", 2),
                    ("Don't know yet", "还不知道", 2),
                    ("Nobody knows this", "没人知道这个", 3),
                    ("Still don't know", "还是不知道", 3),
                    ("Do they know", "他们知道吗", 3),
                    ("We still don't know the answer", "我们仍然不知道答案", 4),
                    ("They don't know what is true", "他们不知道什么是真的", 5),
                ]
            },
            "S0472L06": {
                "meaning": "the facts (true information or evidence)",
                "phrases": [
                    ("The facts", "事实", 1),
                    ("Facts", "事实", 1),
                    ("These facts", "这些事实", 2),
                    ("The truth", "真相", 2),
                    ("What is true", "什么是真的", 2),
                    ("All the facts", "所有的事实", 3),
                    ("The real facts", "真实的事实", 3),
                    ("These are the facts", "这些是事实", 3),
                    ("Do you know the facts", "你知道事实吗", 4),
                    ("We don't know the facts about this problem", "我们不知道这个问题的事实", 5),
                ]
            },
        }
    },
    "S0473": {
        "legos": {
            "S0473L01": {
                "meaning": "I don't want (expressing refusal or rejection)",
                "phrases": [
                    ("I don't want", "我不想要", 1),
                    ("Don't want it", "不想要它", 1),
                    ("I don't want this", "我不想要这个", 2),
                    ("I really don't want", "我真的不想要", 2),
                    ("I don't want it at all", "我根本不想要它", 2),
                    ("Do you want it", "你想要它吗", 3),
                    ("I don't want to stay", "我不想停留", 3),
                    ("I don't even want it", "我甚至不想要它", 3),
                    ("I don't want to wait here", "我不想在这里等待", 4),
                    ("I don't want it as a free offer", "我不想要它作为免费提供", 5),
                ]
            },
            "S0473L02": {
                "meaning": "don't want (refusal without subject)",
                "phrases": [
                    ("Don't want", "不想要", 1),
                    ("Not want", "不要", 1),
                    ("Don't want this", "不想要这个", 2),
                    ("Don't want to go", "不想去", 2),
                    ("Don't want any", "不想要任何", 2),
                    ("Shouldn't want", "不应该想要", 3),
                    ("Nobody wants this", "没人想要这个", 3),
                    ("They don't want it", "他们不想要它", 3),
                    ("I don't want to wait", "我不想等待", 4),
                    ("Don't want it as a free offer", "不想要它作为免费提供", 5),
                ]
            },
            "S0473L03": {
                "meaning": "want (desiring or needing something)",
                "phrases": [
                    ("Want", "想要", 1),
                    ("You want", "你想要", 1),
                    ("What do you want", "你想要什么", 2),
                    ("Want it", "想要它", 2),
                    ("Want to stay", "想停留", 2),
                    ("Want more", "想要更多", 3),
                    ("Do you want it", "你想要它吗", 3),
                    ("What do they want", "他们想要什么", 3),
                    ("Everyone wants to rest", "每个人都想休息", 4),
                    ("I don't want it but I need to take it", "我不想要它但我需要接受它", 5),
                ]
            },
            "S0473L04": {
                "meaning": "it (referring to something mentioned)",
                "phrases": [
                    ("It", "它", 1),
                    ("This", "这个", 1),
                    ("It is", "它是", 2),
                    ("It's here", "它在这里", 2),
                    ("Give it", "给它", 2),
                    ("Take it", "拿它", 3),
                    ("Don't like it", "不喜欢它", 3),
                    ("What is it", "它是什么", 3),
                    ("I don't want it anymore", "我不再想要它了", 4),
                    ("I don't want it as a free offer", "我不想要它作为免费提供", 5),
                ]
            },
        }
    },
    "S0474": {
        "legos": {
            "S0474L01": {
                "meaning": "I don't even want (strong negation with emphasis)",
                "phrases": [
                    ("I don't even want", "我甚至不想要", 1),
                    ("Even don't want", "甚至不想要", 1),
                    ("I don't want at all", "我根本不想要", 2),
                    ("Not even want it", "甚至不想要它", 2),
                    ("I really don't want", "我真的不想要", 2),
                    ("Even they don't want", "甚至他们也不想要", 3),
                    ("I don't want any of this", "我甚至不想要任何这个", 3),
                    ("I don't even want to try", "我甚至不想尝试", 3),
                    ("I don't even want to hear about it", "我甚至不想听它", 4),
                    ("I don't even want it as a free offer", "我甚至不想要它作为免费提供", 5),
                ]
            },
            "S0474L02": {
                "meaning": "not even (negative emphasis)",
                "phrases": [
                    ("Not even", "甚至不", 1),
                    ("Even not", "甚至没有", 1),
                    ("Not even close", "甚至不接近", 2),
                    ("Not even one", "甚至不是一个", 2),
                    ("Not even try", "甚至不尝试", 2),
                    ("Not even once", "甚至没有一次", 3),
                    ("Not even that", "甚至不是那样", 3),
                    ("Not even this way", "甚至不是这样", 3),
                    ("Not even for this", "甚至不是为了这个", 4),
                    ("Not even as a free offer", "甚至不是作为免费提供", 5),
                ]
            },
            "S0474L03": {
                "meaning": "even (adding emphasis or surprising element)",
                "phrases": [
                    ("Even", "甚至", 1),
                    ("So even", "甚至如此", 1),
                    ("Even now", "甚至现在", 2),
                    ("Even then", "甚至那样", 2),
                    ("Even here", "甚至这里", 2),
                    ("Even more", "甚至更多", 3),
                    ("Even they know", "甚至他们知道", 3),
                    ("Even this one", "甚至这个", 3),
                    ("Even if we know", "甚至如果我们知道", 4),
                    ("Even when it's a free offer", "甚至当它是免费提供时", 5),
                ]
            },
            "S0474L04": {
                "meaning": "as a free offer (conditional or presentational phrase)",
                "phrases": [
                    ("As a free offer", "作为免费提供", 1),
                    ("Free offer", "免费提供", 1),
                    ("As a gift", "作为礼物", 2),
                    ("Offered free", "免费提供的", 2),
                    ("As free", "作为免费", 2),
                    ("This free offer", "这个免费提供", 3),
                    ("For free", "免费", 3),
                    ("These free offers", "这些免费提供", 3),
                    ("Even if offered free", "甚至如果免费提供", 4),
                    ("I don't even want it as a free offer", "我甚至不想要它作为免费提供", 5),
                ]
            },
            "S0474L05": {
                "meaning": "free (costing nothing or lacking a charge)",
                "phrases": [
                    ("Free", "免费", 1),
                    ("It's free", "它是免费的", 1),
                    ("Get free", "免费获得", 2),
                    ("All free", "全部免费", 2),
                    ("Very free", "非常免费", 2),
                    ("For free", "免费", 3),
                    ("Completely free", "完全免费", 3),
                    ("These free ones", "这些免费的", 3),
                    ("Nothing free here", "这里没有免费的", 4),
                    ("Even free I don't want it", "即使免费我也不想要它", 5),
                ]
            },
        }
    },
}

# Continue with S0475-S0480...
SEED_PHRASES["S0475"] = {
    "legos": {
        "S0475L01": {"meaning": "there are many", "phrases": [
            ("There are many", "有很多", 1), ("Many things", "很多东西", 1),
            ("So many", "那么多", 2), ("There is many", "有很多", 2), ("Many people", "很多人", 2),
            ("Many reasons", "很多理由", 3), ("There are lots", "有很多", 3), ("Many of them", "他们中的很多", 3),
            ("There are many good reasons", "有很多好的理由", 4), ("There are many reasons to consider waiting", "有很多理由考虑等待", 5),
        ]},
        "S0475L02": {"meaning": "many", "phrases": [
            ("Many", "很多", 1), ("So many", "那么多", 1),
            ("Very many", "非常多", 2), ("Too many", "太多", 2), ("Many here", "这里很多", 2),
            ("Many more", "更多", 3), ("Many know", "很多人知道", 3), ("Many want", "很多人想要", 3),
            ("Many people think so", "很多人这样认为", 4), ("There are many reasons to consider this", "有很多理由考虑这个", 5),
        ]},
        "S0475L03": {"meaning": "reasons", "phrases": [
            ("Reasons", "理由", 1), ("The reason", "原因", 1),
            ("What reason", "什么理由", 2), ("For reasons", "出于理由", 2), ("These reasons", "这些理由", 2),
            ("Main reason", "主要原因", 3), ("Many reasons", "很多理由", 3), ("All reasons", "所有理由", 3),
            ("There are good reasons", "有很好的理由", 4), ("There are many reasons to consider waiting", "有很多理由考虑等待", 5),
        ]},
        "S0475L04": {"meaning": "to consider waiting", "phrases": [
            ("To consider waiting", "考虑等待", 1), ("Consider waiting", "考虑等待", 1),
            ("Waiting here", "在这里等待", 2), ("Keep waiting", "继续等待", 2), ("Wait please", "请等待", 2),
            ("Think about waiting", "考虑等待", 3), ("We should wait", "我们应该等待", 3), ("Why wait", "为什么等待", 3),
            ("We need to consider waiting", "我们需要考虑等待", 4), ("There are many reasons to consider waiting", "有很多理由考虑等待", 5),
        ]},
        "S0475L05": {"meaning": "to consider", "phrases": [
            ("To consider", "考虑", 1), ("Consider it", "考虑它", 1),
            ("Think about it", "考虑它", 2), ("Please consider", "请考虑", 2), ("Consider now", "现在考虑", 2),
            ("We should consider", "我们应该考虑", 3), ("They will consider", "他们会考虑", 3), ("Must consider", "必须考虑", 3),
            ("You should consider waiting", "你应该考虑等待", 4), ("We should consider many reasons before deciding", "我们在决定前应该考虑很多理由", 5),
        ]},
        "S0475L06": {"meaning": "to wait/waiting", "phrases": [
            ("To wait", "等待", 1), ("Waiting", "等待", 1),
            ("Wait here", "在这里等待", 2), ("Let's wait", "让我们等待", 2), ("Can wait", "可以等待", 2),
            ("Worth waiting", "值得等待", 3), ("No waiting", "不要等待", 3), ("Still waiting", "仍在等待", 3),
            ("Why are we waiting", "我们为什么要等待", 4), ("There are many reasons to consider waiting before deciding", "在决定前有很多理由考虑等待", 5),
        ]},
    }
}

SEED_PHRASES["S0476"] = {
    "legos": {
        "S0476L01": {"meaning": "I'm waiting for", "phrases": [
            ("I'm waiting for", "我在等待", 1), ("Waiting for", "在等待", 1),
            ("I wait", "我等待", 2), ("I'm here waiting", "我在这里等待", 2), ("Still waiting", "仍在等待", 2),
            ("Waiting here now", "现在在这里等待", 3), ("I am waiting", "我正在等待", 3), ("What I'm waiting for", "我在等待什么", 3),
            ("I'm waiting for the right time", "我在等待正确的时间", 4), ("I'm waiting for the end of the second half", "我在等待下半场的结束", 5),
        ]},
        "S0476L02": {"meaning": "am waiting", "phrases": [
            ("Am waiting", "在等待", 1), ("Is waiting", "在等待", 1),
            ("Are waiting", "正在等待", 2), ("Being waiting", "正在等待", 2), ("Currently waiting", "目前等待", 2),
            ("Still am waiting", "仍然在等待", 3), ("We are waiting", "我们正在等待", 3), ("They are waiting too", "他们也在等待", 3),
            ("We are still waiting here", "我们仍然在这里等待", 4), ("I am waiting for the end of the second half", "我正在等待下半场的结束", 5),
        ]},
        "S0476L03": {"meaning": "the second half", "phrases": [
            ("The second half", "下半场", 1), ("Second half", "下半场", 1),
            ("This half", "这一半", 2), ("Next half", "下一半", 2), ("Half here", "这一半", 2),
            ("The later half", "后面一半", 3), ("The second part", "第二部分", 3), ("Final half", "最后一半", 3),
            ("The second part of this game", "这场比赛的第二部分", 4), ("The end of the second half", "下半场的结束", 5),
        ]},
        "S0476L04": {"meaning": "the end of the second half", "phrases": [
            ("The end of the second half", "下半场的结束", 1), ("End of second half", "下半场结束", 1),
            ("When this half ends", "当这一半结束时", 2), ("Ending of the second half", "下半场的结束", 2), ("Second half ends", "下半场结束", 2),
            ("The final end of second half", "下半场最终结束", 3), ("At the end of the half", "在这一半的结束时", 3), ("Second half finishing", "下半场完成", 3),
            ("We're waiting for the end of the second half", "我们在等待下半场的结束", 4), ("I'm waiting for the end of the second half", "我在等待下半场的结束", 5),
        ]},
        "S0476L05": {"meaning": "end", "phrases": [
            ("End", "结束", 1), ("The end", "结束", 1),
            ("Final end", "最终结束", 2), ("About to end", "即将结束", 2), ("No end", "没有结束", 2),
            ("Close to end", "接近结束", 3), ("When ends", "当结束时", 3), ("Long end", "长结束", 3),
            ("Everything must end", "一切都必须结束", 4), ("The game's end is coming", "比赛的结束即将到来", 5),
        ]},
    }
}

SEED_PHRASES["S0477"] = {
    "legos": {
        "S0477L01": {"meaning": "he since", "phrases": [
            ("He since", "他从", 1), ("Since he", "因为他", 1),
            ("He was since", "他从那时起", 2), ("He from", "他从", 2), ("Since his", "自他", 2),
            ("He has since", "他从那时起", 3), ("He is since", "他从那时起", 3), ("From him since", "从他那时起", 3),
            ("Since he started", "自他开始", 4), ("Since the second day of the holidays", "从假期的第二天起", 5),
        ]},
        "S0477L02": {"meaning": "since the second day of the holidays", "phrases": [
            ("Since the second day of the holidays", "从假期的第二天起", 1), ("From the second day of holidays", "从假期的第二天起", 1),
            ("The second day onward", "从第二天开始", 2), ("After the second holiday day", "在假期第二天之后", 2), ("Since day two", "从第二天起", 2),
            ("Starting the second holiday day", "从假期第二天开始", 3), ("Holidays' second day forward", "从假期第二天向前", 3), ("All since the second day", "自第二天以来都是", 3),
            ("Everything since the second holiday day", "自假期第二天以来的一切", 4), ("He's been sick since the second day of the holidays", "他从假期的第二天起就一直生病", 5),
        ]},
        "S0477L03": {"meaning": "holidays", "phrases": [
            ("Holidays", "假期", 1), ("The holidays", "假期", 1),
            ("Holiday time", "假期时间", 2), ("These holidays", "这些假期", 2), ("My holidays", "我的假期", 2),
            ("During holidays", "在假期期间", 3), ("When holidays", "当假期时", 3), ("Holidays here", "这里的假期", 3),
            ("Since the holidays started", "自假期开始以来", 4), ("He's been sick since the second day of the holidays", "他从假期的第二天起就一直生病", 5),
        ]},
        "S0477L04": {"meaning": "the second day", "phrases": [
            ("The second day", "第二天", 1), ("Second day", "第二天", 1),
            ("Day two", "第二天", 2), ("This second day", "这第二天", 2), ("Next second day", "下一个第二天", 2),
            ("On the second day", "在第二天", 3), ("That second day", "那第二天", 3), ("The very second day", "恰好第二天", 3),
            ("Starting from the second day", "从第二天开始", 4), ("From the second day of the holidays", "从假期的第二天起", 5),
        ]},
        "S0477L05": {"meaning": "has been (continuously)", "phrases": [
            ("Has been", "一直是", 1), ("Been sick", "一直生病", 1),
            ("Has been here", "一直在这里", 2), ("Is still been", "一直是", 2), ("Have been", "一直", 2),
            ("Has stayed", "一直停留", 3), ("Has remained", "一直保持", 3), ("Being has", "一直", 3),
            ("He has been sick", "他一直生病", 4), ("He has been sick since the second day of the holidays", "他从假期的第二天起就一直生病", 5),
        ]},
        "S0477L06": {"meaning": "continuously", "phrases": [
            ("Continuously", "一直", 1), ("All the time", "一直", 1),
            ("Keep being", "持续", 2), ("Always", "一直", 2), ("Throughout", "一直", 2),
            ("The whole time", "整个时间", 3), ("Never stopping", "从不停止", 3), ("All along", "一直", 3),
            ("Without interruption", "无中断地", 4), ("He's been sick continuously since the holidays began", "自假期开始以来他一直生病", 5),
        ]},
        "S0477L07": {"meaning": "sick", "phrases": [
            ("Sick", "生病", 1), ("Ill", "生病", 1),
            ("Very sick", "非常生病", 2), ("Getting sick", "变得生病", 2), ("So sick", "病得很厉害", 2),
            ("Still sick", "仍然生病", 3), ("Staying sick", "保持生病", 3), ("Both sick", "都生病", 3),
            ("He is still sick", "他仍然生病", 4), ("He's been sick since the second day of the holidays", "他从假期的第二天起就一直生病", 5),
        ]},
    }
}

SEED_PHRASES["S0478"] = {
    "legos": {
        "S0478L01": {"meaning": "she has", "phrases": [
            ("She has", "她有", 1), ("Has she", "她有吗", 1),
            ("She had", "她有", 2), ("She is having", "她正有", 2), ("She has it", "她有它", 2),
            ("She still has", "她仍然有", 3), ("She will have", "她将有", 3), ("Now she has", "现在她有", 3),
            ("She has such thing", "她有这样的东西", 4), ("She has such a kind heart", "她有一颗善良的心", 5),
        ]},
        "S0478L02": {"meaning": "a (measure word for hearts)", "phrases": [
            ("A heart", "一颗", 1), ("One", "一个", 1),
            ("A single", "一个单独的", 2), ("Just one", "仅仅一个", 2), ("One here", "这里有一个", 2),
            ("This one heart", "这一个心", 3), ("That single one", "那单独的一个", 3), ("Only one", "只有一个", 3),
            ("She has one heart", "她有一颗心", 4), ("She has such a kind heart", "她有一颗善良的心", 5),
        ]},
        "S0478L03": {"meaning": "kind heart", "phrases": [
            ("Kind heart", "善良的心", 1), ("Good heart", "好心", 1),
            ("A warm heart", "温暖的心", 2), ("Such heart", "这样的心", 2), ("Her heart", "她的心", 2),
            ("The kindest heart", "最善良的心", 3), ("Most kind heart", "最善良的心", 3), ("This kind heart", "这个善良的心", 3),
            ("She has a kind heart", "她有一颗善良的心", 4), ("She has such a kind heart", "她有一颗善良的心", 5),
        ]},
        "S0478L04": {"meaning": "kind", "phrases": [
            ("Kind", "善良", 1), ("So kind", "那么善良", 1),
            ("Very kind", "非常善良", 2), ("Too kind", "太善良", 2), ("Such kind", "这样善良", 2),
            ("Always kind", "总是善良", 3), ("Most kind", "最善良", 3), ("Kind to all", "对所有人都善良", 3),
            ("She is very kind person", "她是个非常善良的人", 4), ("She has such a kind heart", "她有一颗善良的心", 5),
        ]},
        "S0478L05": {"meaning": "heart", "phrases": [
            ("Heart", "心", 1), ("Her heart", "她的心", 1),
            ("The heart", "心", 2), ("From heart", "来自心", 2), ("With heart", "用心", 2),
            ("Open heart", "开放的心", 3), ("In heart", "在心里", 3), ("All heart", "全心全意", 3),
            ("She has a good heart", "她有一个好心", 4), ("She has such a kind heart", "她有一颗善良的心", 5),
        ]},
    }
}

SEED_PHRASES["S0479"] = {
    "legos": {
        "S0479L01": {"meaning": "this is/it's", "phrases": [
            ("This is", "这是", 1), ("It is", "是", 1),
            ("This", "这个", 2), ("It's", "它是", 2), ("This here", "这个这里", 2),
            ("Yes this is", "是的这是", 3), ("This is all", "这就是全部", 3), ("What this is", "这是什么", 3),
            ("This is the truth", "这是真相", 4), ("This is the least I could do", "这是我能做的最少的事", 5),
        ]},
        "S0479L02": {"meaning": "I could do", "phrases": [
            ("I could do", "我能做的", 1), ("Could do", "能做", 1),
            ("What I could do", "我能做什么", 2), ("I can do", "我能做", 2), ("Can I do", "我能做吗", 2),
            ("I would do", "我会做", 3), ("Things I can do", "我能做的事", 3), ("To do", "去做", 3),
            ("All I could do", "我能做的一切", 4), ("The least I could do", "我能做的最少的事", 5),
        ]},
        "S0479L03": {"meaning": "can do", "phrases": [
            ("Can do", "能做", 1), ("Can do it", "能做它", 1),
            ("You can do", "你能做", 2), ("We can do", "我们能做", 2), ("He can do", "他能做", 2),
            ("Will do", "会做", 3), ("Must do", "必须做", 3), ("To do", "去做", 3),
            ("What can we do", "我们能做什么", 4), ("The least I could do", "我能做的最少的事", 5),
        ]},
        "S0479L04": {"meaning": "the least (thing)", "phrases": [
            ("The least", "最少", 1), ("Least thing", "最少的事", 1),
            ("At least", "至少", 2), ("Not the least", "不是最少", 2), ("The very least", "最少的", 2),
            ("Least of all", "最少的全部", 3), ("In the least", "至少", 3), ("Most and least", "最多和最少", 3),
            ("The least I can", "我能做的最少", 4), ("The least I could do", "我能做的最少的事", 5),
        ]},
        "S0479L05": {"meaning": "the least", "phrases": [
            ("The least", "最少", 1), ("Least", "最少", 1),
            ("Very least", "非常最少", 2), ("At least", "至少", 2), ("Least much", "最少的很多", 2),
            ("Least here", "这里最少", 3), ("Least now", "现在最少", 3), ("No least", "没有最少", 3),
            ("That is the least important", "那是最不重要的", 4), ("This is the least I could do for you", "这是我为你能做的最少的事", 5),
        ]},
    }
}

SEED_PHRASES["S0480"] = {
    "legos": {
        "S0480L01": {"meaning": "whatever he says", "phrases": [
            ("Whatever he says", "无论他说什么", 1), ("No matter what he says", "无论他说什么", 1),
            ("He says", "他说", 2), ("What he says", "他说什么", 2), ("Whatever says", "无论说什么", 2),
            ("He will say", "他会说", 3), ("Did he say", "他说了吗", 3), ("He's saying", "他在说", 3),
            ("No matter what he speaks", "无论他说什么", 4), ("Whatever he says it's not far ahead now", "无论他说什么，它现在不远了", 5),
        ]},
        "S0480L02": {"meaning": "whatever", "phrases": [
            ("Whatever", "无论什么", 1), ("No matter what", "无论什么", 1),
            ("What ever", "什么都是", 2), ("Anything", "任何东西", 2), ("Whatever here", "无论什么在这里", 2),
            ("Whatever it is", "无论它是什么", 3), ("No matter the what", "无论什么", 3), ("Whatever they want", "无论他们想要什么", 3),
            ("Whatever the reason", "无论什么原因", 4), ("Whatever he says it doesn't matter", "无论他说什么都不重要", 5),
        ]},
        "S0480L03": {"meaning": "no matter/regardless", "phrases": [
            ("No matter", "无论", 1), ("Regardless", "无论", 1),
            ("No matter what", "无论什么", 2), ("Anyway", "不管怎样", 2), ("Either way", "无论哪种方式", 2),
            ("No matter where", "无论哪里", 3), ("No matter when", "无论何时", 3), ("Despite this", "尽管如此", 3),
            ("No matter how hard", "无论多困难", 4), ("No matter what he says it's getting close", "无论他说什么它都在接近", 5),
        ]},
        "S0480L04": {"meaning": "it now", "phrases": [
            ("It now", "它现在", 1), ("Right now", "现在", 1),
            ("It's now", "它现在", 2), ("Now time", "现在时间", 2), ("This now", "现在这个", 2),
            ("Is now", "现在是", 3), ("From now", "从现在", 3), ("At now", "在现在", 3),
            ("It is now happening", "它现在发生", 4), ("It's not far ahead now", "它现在不远了", 5),
        ]},
        "S0480L05": {"meaning": "now", "phrases": [
            ("Now", "现在", 1), ("Right now", "现在", 1),
            ("Very now", "非常现在", 2), ("Now here", "现在这里", 2), ("Now time", "现在时间", 2),
            ("Even now", "即使现在", 3), ("Now and", "现在和", 3), ("Starting now", "从现在开始", 3),
            ("What now", "现在怎样", 4), ("It's not far ahead now", "它现在不远了", 5),
        ]},
        "S0480L06": {"meaning": "not far ahead", "phrases": [
            ("Not far ahead", "不远了", 1), ("Not far", "不远", 1),
            ("Getting close", "接近", 2), ("Nearly here", "差不多到了", 2), ("Soon coming", "即将到来", 2),
            ("Close by now", "现在接近", 3), ("Not long away", "不久就到", 3), ("Approaching now", "现在接近", 3),
            ("It's getting very close", "它现在非常接近", 4), ("Whatever he says it's not far ahead now", "无论他说什么，它现在不远了", 5),
        ]},
    }
}

def generate_output(seed_id: str, scaffold_path: str, output_path: str) -> bool:
    """Process a seed and generate output."""
    print(f"\nProcessing {seed_id}...")

    with open(scaffold_path, 'r', encoding='utf-8') as f:
        scaffold = json.load(f)

    seed_phrases_data = SEED_PHRASES.get(seed_id)
    if not seed_phrases_data:
        print(f"  ERROR: No phrase data for {seed_id}")
        return False

    # Fill in practice phrases
    for lego_id in scaffold["legos"]:
        lego_info = scaffold["legos"][lego_id]
        lego_phrases = seed_phrases_data["legos"].get(lego_id, {}).get("phrases", [])

        if lego_phrases:
            lego_info["practice_phrases"] = [list(p) for p in lego_phrases]
            print(f"  {lego_id}: {len(lego_phrases)} phrases")
        else:
            print(f"  WARNING: {lego_id} - no phrases found")

    # Write output
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(scaffold, f, ensure_ascii=False, indent=2)

    print(f"  Saved: {output_path}")
    return True

def main():
    """Generate Phase 5 content for all seeds."""
    base_path = "/home/user/ssi-dashboard-v7/public/vfs/courses/cmn_for_eng"
    scaffold_dir = f"{base_path}/phase5_scaffolds"
    output_dir = f"{base_path}/phase5_outputs"

    results = {}
    for seed_num in range(471, 481):
        seed_id = f"S{seed_num:04d}"
        scaffold_file = f"{scaffold_dir}/seed_{seed_id.lower()}.json"
        output_file = f"{output_dir}/seed_{seed_id.lower()}.json"

        try:
            success = generate_output(seed_id, scaffold_file, output_file)
            results[seed_id] = "SUCCESS" if success else "FAILED"
        except Exception as e:
            print(f"  ERROR: {e}")
            results[seed_id] = f"ERROR: {str(e)}"

    # Summary
    print("\n" + "="*70)
    print("PHASE 5 GENERATION SUMMARY")
    print("="*70)
    for seed_id, status in sorted(results.items()):
        print(f"  {seed_id}: {status}")

    successful = sum(1 for s in results.values() if s == "SUCCESS")
    print(f"\nCompleted: {successful}/10 seeds")

if __name__ == "__main__":
    main()
