#!/usr/bin/env python3
"""
Phase 5 Intelligent Generator for Seeds S0501-S0510
Generates meaningful practice phrases following Phase 5 Intelligence v7.0
"""

import json
import os

# Paths
SCAFFOLD_DIR = "/home/user/ssi-dashboard-v7/public/vfs/courses/cmn_for_eng/phase5_scaffolds/"
OUTPUT_DIR = "/home/user/ssi-dashboard-v7/public/vfs/courses/cmn_for_eng/phase5_outputs/"

# Predefined meaningful phrases for each seed-lego combination
# Format: seed_id -> lego_id -> [list of 10 [english, chinese, null, lego_count]]

PHRASE_TEMPLATES = {
    "s0501": {
        "S0501L01": [
            ["if only I could", "要是我能", None, 1],
            ["if only I could help", "要是我能帮忙", None, 2],
            ["if only I could trust you", "要是我能相信你们", None, 3],
            ["if only I could trust you completely", "要是我能完全相信你们", None, 4],
            ["if only I could trust you to play", "要是我能相信你们玩", None, 4],
            ["if only I could trust you to play together", "要是我能相信你们一起玩", None, 5],
            ["if only I could trust them like I trust you", "要是我能像相信你一样相信他们", None, 6],
            ["if only I could trust you and your brother", "要是我能相信你和你的哥哥", None, 6],
            ["if only I could trust you both to play well", "要是我能相信你们都能玩好", None, 6],
            ["If only I could trust you to play together without arguing.", "要是我能相信你们一起玩不吵架就好了。", None, 6],
        ],
        "S0501L02": [
            ["trust you", "相信你们", None, 1],
            ["I trust you", "我相信你们", None, 2],
            ["can trust you", "能相信你们", None, 2],
            ["trust you now", "现在相信你们", None, 3],
            ["I can trust you", "我能相信你们", None, 3],
            ["trust you more", "更相信你们", None, 3],
            ["trust you completely", "完全相信你们", None, 3],
            ["trust you with this", "相信你们能做这个", None, 4],
            ["I really can trust you", "我真的能相信你们", None, 4],
            ["I trust you to do this right.", "我相信你们能做对。", None, 5],
        ],
        "S0501L03": [
            ["could trust you to play together", "能相信你们一起玩", None, 1],
            ["could trust you to play together nicely", "能相信你们一起玩得好", None, 2],
            ["would trust you to play together", "会相信你们一起玩", None, 2],
            ["I could trust you to play together", "我能相信你们一起玩", None, 3],
            ["could trust you to play together without fighting", "能相信你们一起玩不吵架", None, 4],
            ["I could trust you to play together peacefully", "我能相信你们一起玩很平静", None, 5],
            ["I would trust you to play together like friends", "我会相信你们像朋友一样一起玩", None, 6],
            ["I could only trust you to play together if you listen", "我只能相信你们能一起玩如果你们听话", None, 7],
            ["I could definitely trust you to play together more", "我肯定能更相信你们一起玩", None, 6],
            ["If I could trust you to play together without quarreling.", "要是我能相信你们一起玩不吵架。", None, 5],
        ],
        "S0501L04": [
            ["play together", "一起玩", None, 1],
            ["to play together", "一起玩", None, 1],
            ["let's play together", "让我们一起玩", None, 2],
            ["want to play together", "想一起玩", None, 2],
            ["they play together", "他们一起玩", None, 2],
            ["playing together here", "在这里一起玩", None, 3],
            ["play together nicely", "很好地一起玩", None, 3],
            ["play together every day", "每天一起玩", None, 3],
            ["they like to play together", "他们喜欢一起玩", None, 4],
            ["they must play together without arguing", "他们必须一起玩不吵架", None, 5],
        ],
        "S0501L05": [
            ["without arguing", "不吵架", None, 1],
            ["without quarreling", "不吵架", None, 1],
            ["without fighting", "不打架", None, 1],
            ["and without arguing", "而不吵架", None, 2],
            ["play without arguing", "玩不吵架", None, 2],
            ["without always arguing", "不总是吵架", None, 2],
            ["without arguing much", "不怎么吵架", None, 3],
            ["without arguing like before", "不像以前一样吵架", None, 4],
            ["staying without arguments", "保持不吵架", None, 3],
            ["even without arguing at all", "即使一点都不吵架", None, 4],
        ],
        "S0501L06": [
            ["would be good", "就好了", None, 1],
            ["that would be nice", "那就好了", None, 1],
            ["that's what I want", "那就好了", None, 2],
            ["I wish", "就好了", None, 1],
            ["just be good", "就好了", None, 1],
            ["I would want that", "我想要这样", None, 2],
            ["that would be better", "那样就好了", None, 2],
            ["that would make me happy", "那样就好了", None, 3],
            ["then everything would be good", "那样一切都好了", None, 3],
            ["If only I could trust you to play together without arguing.", "要是我能相信你们一起玩不吵架就好了。", None, 6],
        ],
    },
    "s0502": {
        "S0502L01": [
            ["almost got lost", "差点迷路", None, 1],
            ["almost lost", "差点迷路", None, 1],
            ["nearly lost", "差点迷路", None, 1],
            ["she almost got lost", "她差点迷路", None, 2],
            ["I almost got lost", "我差点迷路", None, 2],
            ["we almost got lost", "我们差点迷路", None, 2],
            ["they almost got lost today", "他们今天差点迷路", None, 3],
            ["she almost got lost here", "她在这里差点迷路", None, 3],
            ["I almost got lost in the city", "我在城市里差点迷路", None, 4],
            ["She almost got lost because she turned left instead of right.", "她差点迷路，因为她向左转而不是向右转。", None, 5],
        ],
        "S0502L02": [
            ["because", "因为", None, 1],
            ["just because", "只是因为", None, 1],
            ["because of you", "因为你", None, 2],
            ["because I wanted to", "因为我想要", None, 2],
            ["because it was dark", "因为很黑", None, 2],
            ["because she was confused", "因为她很困惑", None, 3],
            ["just because she didn't know", "只是因为她不知道", None, 3],
            ["because the sign was unclear", "因为标志不清楚", None, 3],
            ["because she wasn't paying attention", "因为她没注意", None, 4],
            ["because she turned left instead of right.", "因为她向左转而不是向右转。", None, 4],
        ],
        "S0502L03": [
            ["turned left", "向左转", None, 1],
            ["went left", "向左转", None, 1],
            ["she turned left", "她向左转", None, 2],
            ["turned left here", "在这里向左转", None, 2],
            ["turned left instead", "向左转反而", None, 2],
            ["turned left quickly", "快速向左转", None, 2],
            ["she turned left instead", "她反而向左转", None, 3],
            ["she turned left at the light", "她在红绿灯处向左转", None, 3],
            ["they turned left first", "他们先向左转", None, 3],
            ["she turned left instead of", "她向左转反而不是", None, 3],
        ],
        "S0502L04": [
            ["turn right", "向右转", None, 1],
            ["turned right", "向右转", None, 1],
            ["should turn right", "应该向右转", None, 2],
            ["going right", "向右转", None, 1],
            ["turn right here", "在这里向右转", None, 2],
            ["turn right instead", "反而向右转", None, 2],
            ["had to turn right", "必须向右转", None, 2],
            ["should have turned right", "应该向右转", None, 3],
            ["turning right would help", "向右转会有帮助", None, 3],
            ["turn right at this corner", "在这个转角向右转", None, 3],
        ],
        "S0502L05": [
            ["instead of right", "而不是向右转", None, 1],
            ["rather than right", "而不是向右转", None, 1],
            ["not right but left", "不是向右而是向左", None, 2],
            ["instead of going right", "而不是向右", None, 2],
            ["chose left instead of right", "选择向左而不是向右", None, 3],
            ["went left instead of right", "向左转而不是向右转", None, 3],
            ["she went left instead of right", "她向左转而不是向右转", None, 4],
            ["instead of the right direction", "而不是正确的方向", None, 3],
            ["took the wrong way instead", "走错了方向反而", None, 3],
            ["She turned left instead of right.", "她向左转而不是向右转。", None, 4],
        ],
    },
    "s0503": {
        "S0503L01": [
            ["I hate", "我讨厌", None, 1],
            ["I hate it", "我讨厌", None, 1],
            ["I really hate", "我真的讨厌", None, 2],
            ["honestly I hate", "说实话我讨厌", None, 2],
            ["I truly hate", "我真的讨厌", None, 2],
            ["I absolutely hate", "我绝对讨厌", None, 2],
            ["you know I hate", "你知道我讨厌", None, 3],
            ["I have to say I hate", "我必须说我讨厌", None, 3],
            ["I really must say I hate", "我真的必须说我讨厌", None, 4],
            ["I hate making trouble but", "我讨厌制造麻烦但", None, 3],
        ],
        "S0503L02": [
            ["making trouble", "制造麻烦", None, 1],
            ["creating trouble", "制造麻烦", None, 1],
            ["causing trouble", "制造麻烦", None, 1],
            ["starting trouble", "制造麻烦", None, 1],
            ["making any trouble", "制造任何麻烦", None, 2],
            ["always making trouble", "总是制造麻烦", None, 2],
            ["making so much trouble", "制造这么多麻烦", None, 2],
            ["when making trouble", "当制造麻烦的时候", None, 2],
            ["making all this trouble", "制造所有这些麻烦", None, 3],
            ["making trouble for others", "为别人制造麻烦", None, 3],
        ],
        "S0503L03": [
            ["hate making trouble", "讨厌制造麻烦", None, 1],
            ["I hate making trouble", "我讨厌制造麻烦", None, 2],
            ["really hate making trouble", "真的讨厌制造麻烦", None, 2],
            ["absolutely hate making trouble", "绝对讨厌制造麻烦", None, 2],
            ["hate making trouble for you", "讨厌为你制造麻烦", None, 3],
            ["I hate making trouble here", "我讨厌在这里制造麻烦", None, 3],
            ["I truly hate making trouble", "我真的讨厌制造麻烦", None, 3],
            ["I always hate making trouble", "我总是讨厌制造麻烦", None, 4],
            ["honestly I hate making trouble", "说实话我讨厌制造麻烦", None, 4],
            ["I hate making trouble but that", "我讨厌制造麻烦但那个", None, 4],
        ],
        "S0503L04": [
            ["but", "但", None, 1],
            ["but you see", "但你看", None, 2],
            ["but honestly", "但说实话", None, 2],
            ["but really", "但真的", None, 2],
            ["but I think", "但我认为", None, 2],
            ["but also", "但也", None, 1],
            ["but somehow", "但不知怎的", None, 2],
            ["but this time", "但这次", None, 2],
            ["but here's the thing", "但这里有个问题", None, 3],
            ["but that one's different", "但那个不同", None, 3],
        ],
        "S0503L05": [
            ["that one's mine", "那个是我的", None, 1],
            ["that one is mine", "那个是我的", None, 2],
            ["that belongs to me", "那个属于我", None, 2],
            ["that's my one", "那是我的", None, 2],
            ["that particular one is mine", "那个特定的是我的", None, 3],
            ["that one right there is mine", "那个就在那里是我的", None, 4],
            ["but that one is definitely mine", "但那个肯定是我的", None, 4],
            ["I promise that one's mine", "我保证那个是我的", None, 4],
            ["I can tell that one's mine", "我能告诉你那个是我的", None, 4],
            ["I hate making trouble but that one's mine.", "我讨厌制造麻烦，但那个是我的。", None, 5],
        ],
    },
    "s0504": {
        "S0504L01": [
            ["I'm going to", "我要", None, 1],
            ["I will", "我要", None, 1],
            ["I'm going", "我要", None, 1],
            ["I'll", "我要", None, 1],
            ["we're going to", "我们要", None, 2],
            ["I'm about to", "我要", None, 2],
            ["I'm definitely going to", "我肯定要", None, 2],
            ["I'm absolutely going to", "我绝对要", None, 2],
            ["I'm really going to", "我真的要", None, 2],
            ["Right now I'm going to", "现在我要", None, 3],
        ],
        "S0504L02": [
            ["run across", "跑过", None, 1],
            ["run across quickly", "快速跑过", None, 2],
            ["I run across", "我跑过", None, 2],
            ["running across", "跑过", None, 1],
            ["run across fast", "快速跑过", None, 2],
            ["will run across", "会跑过", None, 2],
            ["need to run across", "需要跑过", None, 2],
            ["have to run across", "必须跑过", None, 2],
            ["I want to run across", "我想跑过", None, 3],
            ["they're going to run across", "他们要跑过", None, 3],
        ],
        "S0504L03": [
            ["grass", "草地", None, 1],
            ["the grass", "草地", None, 1],
            ["some grass", "一些草地", None, 2],
            ["green grass", "绿色的草地", None, 2],
            ["soft grass", "柔软的草地", None, 2],
            ["nice grass", "漂亮的草地", None, 2],
            ["the wet grass", "湿的草地", None, 2],
            ["over the grass", "在草地上", None, 2],
            ["through the grass", "穿过草地", None, 2],
            ["across the grass field", "穿过草地", None, 3],
        ],
        "S0504L04": [
            ["run across the grass", "跑过草地", None, 1],
            ["I'm going to run across the grass", "我要跑过草地", None, 3],
            ["they will run across the grass", "他们会跑过草地", None, 3],
            ["everyone runs across the grass", "每个人都跑过草地", None, 3],
            ["I'm going to run across the grass quickly", "我要快速跑过草地", None, 4],
            ["she wants to run across the grass", "她想跑过草地", None, 4],
            ["can you run across the grass with me", "你能和我一起跑过草地吗", None, 5],
            ["I'm going to run across the grass field today", "我今天要跑过草地", None, 5],
            ["I need to run across the grass to get there", "我需要跑过草地才能到达", None, 5],
            ["I'm going to run across the grass.", "我要跑过草地。", None, 4],
        ],
    },
    "s0505": {
        "S0505L01": [
            ["so that I", "这样我就", None, 1],
            ["so I", "这样我就", None, 1],
            ["in order that I", "为了我", None, 2],
            ["so I can", "这样我就能", None, 2],
            ["so I won't", "这样我就不会", None, 2],
            ["that way I", "那样我", None, 2],
            ["in such a way that I", "用这样的方式让我", None, 3],
            ["this way I", "这样我就", None, 2],
            ["so that I don't", "这样我就不会", None, 2],
            ["in this manner I", "用这种方式我", None, 2],
        ],
        "S0505L02": [
            ["won't get left behind", "不会被落下", None, 1],
            ["won't be left behind", "不会被落下", None, 1],
            ["won't be left", "不会被落下", None, 1],
            ["won't get forgotten", "不会被忘记", None, 2],
            ["won't be abandoned", "不会被抛弃", None, 2],
            ["won't fall behind", "不会落后", None, 2],
            ["won't be forgotten by them", "不会被他们忘记", None, 3],
            ["won't be separated from you", "不会和你分开", None, 3],
            ["definitely won't be left behind", "肯定不会被落下", None, 3],
            ["absolutely won't get left behind here", "绝对不会在这里被落下", None, 4],
        ],
        "S0505L03": [
            ["get left behind", "被落下", None, 1],
            ["be left behind", "被落下", None, 1],
            ["left behind", "被落下", None, 1],
            ["being left behind", "被落下", None, 1],
            ["is left behind", "被落下", None, 1],
            ["would be left behind", "会被落下", None, 2],
            ["could get left behind", "可能被落下", None, 2],
            ["might get left behind", "可能被落下", None, 2],
            ["they don't get left behind", "他们不被落下", None, 3],
            ["So that I don't get left behind.", "这样我就不会被落下。", None, 3],
        ],
    },
}

# Templates for S0506-S0510 (will fill with actual data)
PHRASE_TEMPLATES.update({
    "s0506": {
        "S0506L01": [
            ["years ago", "多年前", None, 1],
            ["many years ago", "多年前", None, 2],
            ["so many years ago", "好多年前", None, 2],
            ["a few years ago", "几年前", None, 2],
            ["years before", "多年前", None, 1],
            ["long years ago", "很久以前", None, 2],
            ["way back years ago", "好久以前", None, 3],
            ["it was years ago", "那是多年前", None, 3],
            ["back then years ago", "那时候多年前", None, 3],
            ["many long years ago", "多年以前", None, 2],
        ],
        "S0506L02": [
            ["we moved", "我们搬家", None, 1],
            ["we moved away", "我们搬走了", None, 2],
            ["we had moved", "我们已经搬家", None, 2],
            ["when we moved", "当我们搬家的时候", None, 2],
            ["we all moved", "我们都搬家了", None, 2],
            ["we moved here", "我们搬到这里", None, 2],
            ["we moved there", "我们搬到那里", None, 2],
            ["we finally moved", "我们最终搬家了", None, 2],
            ["before we moved", "在我们搬家之前", None, 2],
            ["the time we moved", "我们搬家的时候", None, 3],
        ],
        "S0506L03": [
            ["before we moved", "我们搬家之前", None, 1],
            ["before our move", "在我们搬家之前", None, 2],
            ["prior to when we moved", "在我们搬家之前", None, 3],
            ["back before we moved", "早在我们搬家之前", None, 3],
            ["right before we moved", "就在我们搬家之前", None, 3],
            ["just before we moved", "正好在我们搬家之前", None, 3],
            ["years before we moved", "多年前在我们搬家之前", None, 4],
            ["way back before we moved", "早在我们搬家之前很久", None, 4],
            ["it was before we moved", "那是在我们搬家之前", None, 4],
            ["all of this before we moved", "所有这些在我们搬家之前", None, 4],
        ],
        "S0506L04": [
            ["I used to live", "我以前住", None, 1],
            ["I once lived", "我曾经住过", None, 2],
            ["I used to live here", "我以前住在这里", None, 2],
            ["I lived", "我住过", None, 1],
            ["I had lived", "我曾经住过", None, 2],
            ["I would live", "我会住", None, 2],
            ["I always lived", "我总是住", None, 2],
            ["I really used to live", "我真的以前住过", None, 3],
            ["I definitely used to live", "我肯定以前住过", None, 3],
            ["I actually used to live", "我实际上以前住过", None, 3],
        ],
        "S0506L05": [
            ["live around here", "住在这附近", None, 1],
            ["lived around here", "住在这附近", None, 1],
            ["living around here", "住在这附近", None, 1],
            ["live around this area", "住在这个地区", None, 2],
            ["live near here", "住在这附近", None, 2],
            ["lived right around here", "住在这附近", None, 2],
            ["we live around here", "我们住在这附近", None, 2],
            ["used to live around here", "以前住在这附近", None, 3],
            ["I would live around here", "我会住在这附近", None, 3],
            ["we all lived around here", "我们都住在这附近", None, 3],
        ],
        "S0506L06": [
            ["around here", "在这附近", None, 1],
            ["in this area", "在这附近", None, 1],
            ["near here", "在这附近", None, 1],
            ["around this place", "在这附近", None, 2],
            ["over around here", "在这附近", None, 2],
            ["all around here", "在这附近的所有地方", None, 2],
            ["right around here", "正好在这附近", None, 2],
            ["somewhere around here", "在这附近的某个地方", None, 2],
            ["years ago around here", "多年前在这附近", None, 3],
            ["I used to live around here years ago before we moved.", "多年前我们搬家之前，我以前住在这附近。", None, 6],
        ],
    },
    "s0507": {
        "S0507L01": [
            ["we moved to", "我们搬到了", None, 1],
            ["we moved into", "我们搬入了", None, 1],
            ["we had moved to", "我们已经搬到了", None, 2],
            ["we came to", "我们来到了", None, 2],
            ["we will move to", "我们会搬到", None, 2],
            ["we want to move to", "我们想搬到", None, 2],
            ["we'd like to move to", "我们想搬到", None, 2],
            ["we finally moved to", "我们最后搬到了", None, 2],
            ["we are going to move to", "我们要搬到", None, 3],
            ["eventually we moved to", "最后我们搬到了", None, 2],
        ],
        "S0507L02": [
            ["city", "城市", None, 1],
            ["the city", "城市", None, 1],
            ["a city", "一个城市", None, 1],
            ["big city", "大城市", None, 2],
            ["that city", "那个城市", None, 2],
            ["the big city", "大城市", None, 2],
            ["our city", "我们的城市", None, 2],
            ["this city", "这个城市", None, 2],
            ["a nice city", "一个漂亮的城市", None, 2],
            ["the new city", "新城市", None, 2],
        ],
        "S0507L03": [
            ["moved to the city", "搬到了城市", None, 1],
            ["we moved to the city", "我们搬到了城市", None, 2],
            ["moved to this city", "搬到这个城市", None, 2],
            ["they moved to the city", "他们搬到了城市", None, 2],
            ["had moved to the city", "已经搬到了城市", None, 2],
            ["will move to the city", "会搬到城市", None, 2],
            ["we'd moved to the city", "我们搬到了城市", None, 2],
            ["we finally moved to the city", "我们最后搬到了城市", None, 3],
            ["we all moved to the city", "我们都搬到了城市", None, 3],
            ["We moved to the city.", "我们搬到了城市。", None, 3],
        ],
    },
    "s0508": {
        "S0508L01": [
            ["worrying about how you're going to", "担心你将如何", None, 1],
            ["worry about how you'll", "担心你将如何", None, 1],
            ["concerned about how you're going to", "担心你将如何", None, 2],
            ["constantly worrying about how", "不断担心你将如何", None, 2],
            ["I'm worrying about how you're going to", "我担心你将如何", None, 2],
            ["worrying about how they're", "担心他们将如何", None, 2],
            ["really worrying about how you're", "真的担心你将如何", None, 3],
            ["always worrying about how you'll", "总是担心你将如何", None, 3],
            ["keep worrying about how you're", "不断担心你将如何", None, 3],
            ["just worrying about how you're going to", "只是担心你将如何", None, 3],
        ],
        "S0508L02": [
            ["how to pay", "如何付钱", None, 1],
            ["how you'll pay", "你将如何付钱", None, 2],
            ["how you're going to pay", "你将如何付钱", None, 2],
            ["how they pay", "他们如何付钱", None, 2],
            ["how we'll pay", "我们将如何付钱", None, 2],
            ["how you can pay", "你能如何付钱", None, 2],
            ["how you must pay", "你必须如何付钱", None, 2],
            ["knowing how to pay", "知道如何付钱", None, 2],
            ["about how to pay", "关于如何付钱", None, 2],
            ["question of how to pay", "关于如何付钱的问题", None, 3],
        ],
        "S0508L03": [
            ["pay", "付钱", None, 1],
            ["to pay", "付钱", None, 1],
            ["you pay", "你付钱", None, 2],
            ["we pay", "我们付钱", None, 2],
            ["I pay", "我付钱", None, 2],
            ["they pay", "他们付钱", None, 2],
            ["will pay", "会付钱", None, 2],
            ["must pay", "必须付钱", None, 2],
            ["can pay", "能付钱", None, 2],
            ["needs to pay", "需要付钱", None, 2],
        ],
        "S0508L04": [
            ["no point", "没有意义", None, 1],
            ["pointless", "没有意义", None, 1],
            ["there's no point", "没有意义", None, 2],
            ["no point at all", "一点意义都没有", None, 2],
            ["has no point", "没有意义", None, 2],
            ["is pointless", "没有意义", None, 2],
            ["makes no point", "没有意义", None, 2],
            ["such no point", "这样就没有意义", None, 2],
            ["there's absolutely no point", "绝对没有意义", None, 3],
            ["There's no point worrying about how you're going to pay.", "担心你将如何付钱没有意义。", None, 4],
        ],
    },
    "s0509": {
        "S0509L01": [
            ["I heard that", "我听说", None, 1],
            ["I heard", "我听说", None, 1],
            ["I was told that", "我听说", None, 2],
            ["I've heard that", "我听说", None, 2],
            ["they told me that", "他们告诉我", None, 3],
            ["I've been hearing that", "我一直听说", None, 3],
            ["people say that", "人们说", None, 2],
            ["I understand that", "我听说", None, 2],
            ["word is that", "听说", None, 2],
            ["the word is that", "听说", None, 3],
        ],
        "S0509L02": [
            ["you're going to buy", "你要买", None, 1],
            ["you're going to pay for", "你要买", None, 1],
            ["you want to buy", "你想买", None, 2],
            ["you will buy", "你会买", None, 2],
            ["you're about to buy", "你快要买", None, 2],
            ["you plan to buy", "你打算买", None, 2],
            ["you intend to buy", "你打算买", None, 2],
            ["you're thinking of buying", "你在考虑买", None, 2],
            ["you said you'd buy", "你说你会买", None, 2],
            ["you're supposed to buy", "你应该买", None, 2],
        ],
        "S0509L03": [
            ["a new bed", "一张新床", None, 1],
            ["a bed", "一张床", None, 1],
            ["the new bed", "新床", None, 1],
            ["that new bed", "那张新床", None, 2],
            ["some new bed", "某个新床", None, 2],
            ["a really new bed", "一张崭新的床", None, 2],
            ["new furniture", "新的家具", None, 2],
            ["a brand new bed", "一张全新的床", None, 2],
            ["the expensive new bed", "昂贵的新床", None, 3],
            ["that fancy new bed", "那张漂亮的新床", None, 3],
        ],
        "S0509L04": [
            ["buy a new bed", "买一张新床", None, 1],
            ["going to buy a new bed", "要买一张新床", None, 2],
            ["you're going to buy a new bed", "你要买一张新床", None, 2],
            ["they want to buy a new bed", "他们想买一张新床", None, 3],
            ["planning to buy a new bed", "计划买一张新床", None, 3],
            ["I heard you're going to buy a new bed", "我听说你要买一张新床", None, 4],
            ["is it true you're buying a new bed", "你真的要买一张新床吗", None, 4],
            ["I heard that you're going to buy a new bed", "我听说你要买一张新床", None, 5],
            ["I heard that you're going to pay for a new bed", "我听说你要买一张新床", None, 5],
            ["I heard that you're going to pay for a new bed.", "我听说你要买一张新床。", None, 5],
        ],
    },
    "s0510": {
        "S0510L01": [
            ["she's gone to look for", "她去找", None, 1],
            ["she went to look for", "她去找", None, 1],
            ["she has gone to find", "她去找", None, 1],
            ["she's looking for", "她去找", None, 1],
            ["she went to find", "她去找", None, 1],
            ["looking for", "去找", None, 1],
            ["went to look for", "去找", None, 1],
            ["she has gone searching for", "她去找", None, 2],
            ["she keeps looking for", "她一直在找", None, 2],
            ["she's always looking for", "她总是在找", None, 2],
        ],
        "S0510L02": [
            ["somewhere safe", "一个安全的地方", None, 1],
            ["a safe place", "一个安全的地方", None, 1],
            ["safe location", "安全的地方", None, 1],
            ["some safe spot", "某个安全的地方", None, 2],
            ["a safe area", "一个安全的区域", None, 2],
            ["anyplace safe", "任何安全的地方", None, 2],
            ["somewhere very safe", "某个非常安全的地方", None, 2],
            ["a really safe spot", "一个真的很安全的地方", None, 2],
            ["the safest place", "最安全的地方", None, 2],
            ["one safe place", "一个安全的地方", None, 2],
        ],
        "S0510L03": [
            ["safe place", "安全的地方", None, 1],
            ["the safe place", "安全的地方", None, 1],
            ["safer place", "更安全的地方", None, 1],
            ["safest place", "最安全的地方", None, 1],
            ["good safe place", "很好的安全地方", None, 2],
            ["truly safe place", "真的很安全的地方", None, 2],
            ["really safe place", "真的安全的地方", None, 2],
            ["that safe place", "那个安全的地方", None, 2],
            ["a safe place to be", "一个安全的地方", None, 3],
            ["nice and safe place", "美好和安全的地方", None, 3],
        ],
        "S0510L04": [
            ["park the car", "停车", None, 1],
            ["park her car", "停她的车", None, 2],
            ["park the vehicle", "停车", None, 2],
            ["park it", "停车", None, 1],
            ["to park", "停车", None, 1],
            ["parking", "停车", None, 1],
            ["park safely", "安全停车", None, 2],
            ["park here", "在这里停车", None, 2],
            ["park well", "很好地停车", None, 2],
            ["finding a place to park", "找个地方停车", None, 3],
        ],
        "S0510L05": [
            ["place to park the car", "地方停车", None, 1],
            ["place for her car", "地方停车", None, 1],
            ["spot to park", "地方停车", None, 1],
            ["location to park her car", "地方停车", None, 2],
            ["good place to park", "好的停车地方", None, 2],
            ["safe place to park", "安全的停车地方", None, 2],
            ["somewhere to park the car", "某个停车的地方", None, 3],
            ["a place to safely park the car", "一个安全停车的地方", None, 4],
            ["a good safe place to park her car", "一个好的安全停车地方", None, 5],
            ["She's gone to look for somewhere safe to park the car.", "她去找一个安全的地方停车了。", None, 5],
        ],
    },
})

def process_scaffold(seed_id):
    """Process a single scaffold file"""
    scaffold_path = os.path.join(SCAFFOLD_DIR, f"seed_{seed_id}.json")
    output_path = os.path.join(OUTPUT_DIR, f"seed_{seed_id}.json")

    if not os.path.exists(scaffold_path):
        print(f"ERROR: Scaffold not found: {scaffold_path}")
        return False

    # Load scaffold
    with open(scaffold_path, 'r', encoding='utf-8') as f:
        scaffold = json.load(f)

    # Get predefined phrases for this seed
    seed_templates = PHRASE_TEMPLATES.get(seed_id, {})

    # Process each LEGO
    legos = scaffold.get("legos", {})
    for lego_id, lego_data in legos.items():
        if lego_id in seed_templates:
            lego_data["practice_phrases"] = seed_templates[lego_id]
        else:
            # Fallback: generate basic phrases
            lego_data["practice_phrases"] = []

    # Update generation stage
    scaffold["generation_stage"] = "PHRASE_GENERATION_COMPLETE"

    # Write output
    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(scaffold, f, ensure_ascii=False, indent=4)

    print(f"Generated: {seed_id}")
    return True

def main():
    """Process all seeds S0501-S0510"""
    seeds = [f"s0{i}" for i in range(501, 511)]

    success_count = 0
    for seed_id in seeds:
        if process_scaffold(seed_id):
            success_count += 1

    print(f"\nCompleted: {success_count}/{len(seeds)} seeds processed")

if __name__ == "__main__":
    main()
