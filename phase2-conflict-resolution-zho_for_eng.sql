-- Phase 2 Conflict Resolution: zho_for_eng
-- Total conflicts: 77
-- Strategy: First Come First Served (FCFS) - first seed keeps original, later seeds upchunk

-- Conflict 1: "with you"
-- S0001 keeps "with you" → "跟你"
UPDATE course_legos SET known_text = 'together with you' WHERE id = 'e1308c5b-cd4a-460e-b3f1-cdd3bb8a2043'; -- S0206 和你

-- Conflict 2: "to speak"
-- S0001, S0003 keep "to speak" → "说"
UPDATE course_legos SET known_text = 'to talk' WHERE id = 'f51c4b7e-2d89-44a9-9054-ed5388c82d20'; -- S0031 说话

-- Conflict 3: "to learn"
-- S0002, S0020, S0079 keep "to learn" → "学"
UPDATE course_legos SET known_text = 'going to learn' WHERE id = '07a3dd0b-8691-4777-96c5-ef11e8dd1919'; -- S0073 要学
UPDATE course_legos SET known_text = 'going to learn' WHERE id = '9e76df00-7fa5-48f9-92ab-77e6f16ee996'; -- S0075 要学
UPDATE course_legos SET known_text = 'to study' WHERE id = '35e2d960-143a-4a5e-9c29-34f3c177fe56'; -- S0109 学习

-- Conflict 4: "often"
-- S0003 keeps "often" → "常"
UPDATE course_legos SET known_text = 'frequently' WHERE id = '60872ca2-3208-49c8-b22b-89ac44feb3a4'; -- S0137 经常

-- Conflict 5: "something"
-- S0004, S0186 keep "something" → "东西"
UPDATE course_legos SET known_text = 'what matter' WHERE id = '76fa1c8e-0fdb-4c4d-a6b0-2805da43a642'; -- S0030 什么事
UPDATE course_legos SET known_text = 'what' WHERE id = '4269d453-57c6-4c52-93c2-726166690d4a'; -- S0032 什么
UPDATE course_legos SET known_text = 'some things' WHERE id = 'd8cd76b8-a442-4851-ad00-31808f927a27'; -- S0227 一些东西
UPDATE course_legos SET known_text = 'some matters' WHERE id = '21661120-43ea-4998-8b9e-43c983062f85'; -- S0235 一些事情

-- Conflict 6: "in chinese"
-- S0004 keeps "in Chinese" → "用中文"
UPDATE course_legos SET known_text = 'Chinese language' WHERE id = '8fe1601c-1999-4649-89a1-1ff9d4c953d1'; -- S0160 中文

-- Conflict 7: "to say"
-- S0004, S0102, S0208 keep "to say" → "说"
UPDATE course_legos SET known_text = 'what was said' WHERE id = 'ca60d20d-9d40-4ae3-9a93-fdaf1037aa6a'; -- S0057 说的

-- Conflict 8: "speak"
-- S0009, S0015, S0022, S0090 keep "speak" → "说"
UPDATE course_legos SET known_text = 'talk' WHERE id = '3c09e037-30a7-493b-bfc2-eb524b99c594'; -- S0011 说话

-- Conflict 9: "a little"
-- S0009, S0054, S0061 keep "a little" → "一点"
UPDATE course_legos SET known_text = 'a bit' WHERE id = 'a4b506ee-f0dd-4fd8-b852-0d54b2908a60'; -- S0039 有点

-- Conflict 10: "can"
-- S0010, S0061, S0062, S0161, S0173, S0232 keep "can" → "能"
UPDATE course_legos SET known_text = 'may' WHERE id = '3139e496-19aa-42ca-aed5-cbd99ae3aee6'; -- S0136 可以

-- Conflict 11: "remember"
-- S0010, S0024, S0056 keep "remember" → "记住"
UPDATE course_legos SET known_text = 'recall' WHERE id = 'aa9074af-1696-42d4-8175-c186dcb3f625'; -- S0232 记得

-- Conflict 12: "very well"
-- S0013, S0072 keep "very well" → "很好"
UPDATE course_legos SET known_text = 'very well indeed' WHERE id = 'a53fa21e-5eb1-47f3-b0da-f9937881f258'; -- S0133 很好地

-- Conflict 13: "later on"
-- S0016 keeps "later on" → "晚一点"
UPDATE course_legos SET known_text = 'in the future' WHERE id = 'ffc57a95-320f-421b-9544-2ce39f3690c3'; -- S0168 以后

-- Conflict 14: "wants"
-- S0016, S0017 keep "wants" → "想"
UPDATE course_legos SET known_text = 'wants to have' WHERE id = 'a025c867-2ef0-48aa-b9d6-ffbe125e23f0'; -- S0222 想要

-- Conflict 15: "to find out"
-- S0017 keeps "to find out" → "找出"
UPDATE course_legos SET known_text = 'to come to know' WHERE id = 'ba6b2608-2036-4bc9-a446-d727c82f9b65'; -- S0251 知道

-- Conflict 16: "to meet"
-- S0018, S0138 keep "to meet" → "见面"
UPDATE course_legos SET known_text = 'to see' WHERE id = 'c358dce7-fa9d-4a93-9033-397228e94399'; -- S0022 见

-- Conflict 17: "but"
-- S0019, S0041, S0073, S0246 keep "But" → "但"
UPDATE course_legos SET known_text = 'however' WHERE id = 'b479e064-ab54-4c27-8ad0-d54326dd1f1f'; -- S0064 但是
UPDATE course_legos SET known_text = 'however' WHERE id = '12d330b1-cbaf-438c-8bfe-1cfe2b6e8cfe'; -- S0181 但是
UPDATE course_legos SET known_text = 'however' WHERE id = 'a7ee1c82-6681-4ca5-b0e9-fda5e10f4fd9'; -- S0193 但是

-- Conflict 18: "to stop"
-- S0019 keeps "to stop" → "停止"
UPDATE course_legos SET known_text = 'to halt' WHERE id = '5dfd3dc0-6a6e-46cb-9b41-f5a01619fddb'; -- S0067 停

-- Conflict 19: "quickly"
-- S0020 keeps "quickly" → "很快"
UPDATE course_legos SET known_text = 'fast' WHERE id = '7b9ffbbd-3650-4d0a-b39b-0018377d82d0'; -- S0091 快

-- Conflict 20: "her"
-- S0021 keeps "her" → "她的"
UPDATE course_legos SET known_text = 'she' WHERE id = 'da36cb35-8fa2-448d-b32d-4f4bbb216060'; -- S0136 她
UPDATE course_legos SET known_text = 'she' WHERE id = 'ccbaba53-f37f-4231-9c93-1dab278488cf'; -- S0204 她
UPDATE course_legos SET known_text = 'she' WHERE id = '4da38e63-5517-4c46-b323-4d2601b98f02'; -- S0242 她

-- Conflict 21: "learning"
-- S0021 keeps "learning" → "在学"
UPDATE course_legos SET known_text = 'to learn' WHERE id = '9963aca2-cfc5-4701-aece-ad06fae72894'; -- S0033 学
UPDATE course_legos SET known_text = 'to learn' WHERE id = '5df6e9a8-f536-4a20-989a-3852e9a1872c'; -- S0064 学
UPDATE course_legos SET known_text = 'studying' WHERE id = 'd9a49242-366a-419a-ab2e-36f5bfa4989b'; -- S0038 学习

-- Conflict 22: "more"
-- S0023, S0054 keep "more" → "多"
UPDATE course_legos SET known_text = 'even more' WHERE id = '3355032a-6ae9-4534-9fd8-3b13dba922bb'; -- S0073 更多
UPDATE course_legos SET known_text = 'even more' WHERE id = '644c4b85-e637-472d-a6f9-5e777eedb558'; -- S0075 更多
UPDATE course_legos SET known_text = 'even more' WHERE id = '5c126482-b8a3-48ec-9b66-d57116c2d0d0'; -- S0101 更多
UPDATE course_legos SET known_text = 'even more' WHERE id = 'ea5c752a-78b5-415a-978b-024d738eeb04'; -- S0103 更多
UPDATE course_legos SET known_text = 'even more' WHERE id = 'ee633810-91fd-411b-b75e-e910b4cfd6e6'; -- S0242 更多
UPDATE course_legos SET known_text = 'more so' WHERE id = '85e04a53-dccf-4378-a243-23e5b0e1e746'; -- S0137 更

-- Conflict 23: "go"
-- S0025, S0249 keep "go" → "走"
UPDATE course_legos SET known_text = 'to go to' WHERE id = '5b6cd1f2-3e27-4c91-90dc-0b230172afc8'; -- S0156 去
UPDATE course_legos SET known_text = 'to go to' WHERE id = 'f98ab6c7-e4f9-4877-a31a-c42a13642197'; -- S0177 去

-- Conflict 24: "help"
-- S0025, S0062, S0171, S0203, S0204, S0226, S0229 keep "help" → "帮"
UPDATE course_legos SET known_text = 'help out' WHERE id = '627ee73d-9d14-407d-b8c9-773cea333f09'; -- S0168 帮忙
UPDATE course_legos SET known_text = 'help out' WHERE id = '348fda91-dd79-45f6-af13-cd99f4221e57'; -- S0176 帮忙
UPDATE course_legos SET known_text = 'help out' WHERE id = '2d0674c2-aced-4b45-8df1-2c5f12e34b6d'; -- S0236 帮忙
UPDATE course_legos SET known_text = 'to assist' WHERE id = '7eab268d-30be-4d79-b624-c665bc75cb4f'; -- S0212 帮助
UPDATE course_legos SET known_text = 'to assist' WHERE id = '8c81622a-f7c3-4b07-98fd-8e4281af31e9'; -- S0231 帮助

-- Conflict 25: "better"
-- S0029, S0117, S0118 keep "better" → "更好"
UPDATE course_legos SET known_text = 'good' WHERE id = '7e7df33d-a0e6-4ea0-9d4b-d378eb5e5688'; -- S0042 好

-- Conflict 26: "wanted"
-- S0031, S0204, S0212, S0237, S0238 keep "wanted" → "想"
UPDATE course_legos SET known_text = 'wanted to have' WHERE id = 'b057b883-fab6-4262-af47-dad361d9e94c'; -- S0138 想要

-- Conflict 27: "about"
-- S0038 keeps "about" → "大约"
UPDATE course_legos SET known_text = 'concerning' WHERE id = 'ea59abab-d461-4c9c-849e-96abe033ad38'; -- S0083 关于
UPDATE course_legos SET known_text = 'concerning' WHERE id = '6e5bc6b2-b16d-4aa2-8413-7ac8d88eabe9'; -- S0084 关于

-- Conflict 28: "how"
-- S0040 keeps "how" → "怎样"
UPDATE course_legos SET known_text = 'in what way' WHERE id = 'bcaa2146-5602-49f8-a211-56cdf1c87e1e'; -- S0160 怎么
UPDATE course_legos SET known_text = 'in what way' WHERE id = '25e237ab-7943-4b37-852f-a15b88fd9a1f'; -- S0208 怎么

-- Conflict 29: "feel"
-- S0040, S0122 keep "feel" → "感觉"
UPDATE course_legos SET known_text = 'think that' WHERE id = 'be767342-f3db-485f-948b-55d0536c9327'; -- S0041 觉得
UPDATE course_legos SET known_text = 'think that' WHERE id = 'b965ec25-e0b2-4c4d-ae7b-0a84b4026530'; -- S0042 觉得

-- Conflict 30: "i feel"
-- S0041 keeps "I feel" → "我觉得"
UPDATE course_legos SET known_text = 'I sense' WHERE id = '16d1e4eb-db3a-41db-89a2-692dc6ff1c55'; -- S0118 我感觉

-- Conflict 31: "okay"
-- S0041 keeps "okay" → "还好"
UPDATE course_legos SET known_text = 'fine' WHERE id = '048f8f7b-d914-4b79-93c0-b543a55b4cf8'; -- S0141 好

-- Conflict 32: "know"
-- S0045, S0059 keep "know" → "知道"
UPDATE course_legos SET known_text = 'to be acquainted with' WHERE id = '630aedda-18dd-4aaf-ac61-9f06ef213606'; -- S0230 认识
UPDATE course_legos SET known_text = 'to be acquainted with' WHERE id = '5276563b-9e6e-4c90-a870-5476f3f6a584'; -- S0236 认识

-- Conflict 33: "everything"
-- S0045, S0141 keep "everything" → "一切"
UPDATE course_legos SET known_text = 'all things' WHERE id = 'c464487c-5331-4cae-bc6f-21b1ddc1e19c'; -- S0200 所有事情

-- Conflict 34: "i think"
-- S0047 keeps "I think" → "我认为"
UPDATE course_legos SET known_text = 'I feel that' WHERE id = 'af488aaa-013e-4278-adf2-8288cab435cf'; -- S0185 我觉得
UPDATE course_legos SET known_text = 'I feel that' WHERE id = '7cf722aa-2a28-4e4c-848b-c5d6b308054a'; -- S0256 我觉得

-- Conflict 35: "interesting"
-- S0051 keeps "interesting" → "有趣的"
UPDATE course_legos SET known_text = 'meaningful' WHERE id = '36a5da68-198e-41e0-b0c4-5cf22f733aed'; -- S0058 有意思
UPDATE course_legos SET known_text = 'meaningful' WHERE id = 'fab418e5-55c7-4b4b-a06f-572d4ac06136'; -- S0163 有意思
UPDATE course_legos SET known_text = 'meaningful' WHERE id = '2037225f-9786-4d35-b908-b0946386c435'; -- S0163 有意思

-- Conflict 36: "so"
-- S0056, S0149, S0188 keep "so" → "所以"
UPDATE course_legos SET known_text = 'this much' WHERE id = '84fd35d6-3a9c-43e3-a1be-e7ec95d0ff6d'; -- S0139 这么

-- Conflict 37: "when"
-- S0058, S0133, S0134 keep "when" → "当"
UPDATE course_legos SET known_text = 'at the time when' WHERE id = '10936482-0f12-4981-82d1-48e6184df0fd'; -- S0147 当...时候
UPDATE course_legos SET known_text = 'at the time when' WHERE id = '96f93f31-0058-43e2-b54d-91eb991a155f'; -- S0148 当...时候
UPDATE course_legos SET known_text = 'at what time' WHERE id = 'bb8c9ed4-a905-4d71-a397-62d6b7e23017'; -- S0252 什么时候

-- Conflict 38: "understand"
-- S0058 keeps "understand" → "理解"
UPDATE course_legos SET known_text = 'to comprehend' WHERE id = '85120e6e-95c9-4c67-ac81-eec8d74e230f'; -- S0077 明白
UPDATE course_legos SET known_text = 'understand by hearing' WHERE id = 'e0456aa8-a630-4699-b2da-6d32c5cffa14'; -- S0174 听懂

-- Conflict 39: "enough"
-- S0058, S0060 keep "enough" → "足够"
UPDATE course_legos SET known_text = 'sufficient' WHERE id = '31201201-c426-4223-a678-f3c4636dd5d2'; -- S0091 够

-- Conflict 40: "to do"
-- S0059 keeps "to do" → "做的"
UPDATE course_legos SET known_text = 'to make' WHERE id = '3e10c252-4a2e-4265-ba85-af3d7eb6181f'; -- S0169 做
UPDATE course_legos SET known_text = 'to make' WHERE id = 'db44f18a-7f55-40f6-bf7a-5fd101d36bc6'; -- S0175 做
UPDATE course_legos SET known_text = 'to make' WHERE id = '7f19d6ba-4908-408a-a4b0-edbefd16354a'; -- S0207 做

-- Conflict 41: "different"
-- S0060 keeps "different" → "不同"
UPDATE course_legos SET known_text = 'not the same' WHERE id = 'bf91edc8-6647-43e2-b247-8fb4447265f7'; -- S0186 不一样的

-- Conflict 42: "helping"
-- S0063 keeps "helping" → "帮"
UPDATE course_legos SET known_text = 'helping out' WHERE id = '39b11d78-5cf9-4820-9f13-4f1e83a2565d'; -- S0142 帮忙

-- Conflict 43: "very"
-- S0064, S0076, S0172 keep "very" → "很"
UPDATE course_legos SET known_text = 'extremely' WHERE id = '7c619f10-6862-4cfe-a524-16c3923b272d'; -- S0125 非常

-- Conflict 44: "where"
-- S0070, S0154, S0177 keep "where" → "哪里"
UPDATE course_legos SET known_text = 'place' WHERE id = '534bfca5-2f9f-45d5-ab05-6cf23b150b7a'; -- S0138 地方

-- Conflict 45: "thank you"
-- S0073 keeps "thank you" → "感谢"
UPDATE course_legos SET known_text = 'I thank you' WHERE id = '9e8928ba-02c9-40dc-bc83-71e4d7ed8162'; -- S0074 感谢你

-- Conflict 46: "thank you very much"
-- S0073 keeps "Thank you very much" → "非常感谢"
UPDATE course_legos SET known_text = 'I thank you very much' WHERE id = 'c92faa97-3c2b-4f84-a489-4be9be87e302'; -- S0074 非常感谢你

-- Conflict 47: "happy"
-- S0076 keeps "happy" → "高兴"
UPDATE course_legos SET known_text = 'joyful' WHERE id = '99289c38-6678-44ba-a355-0f2f66b36aa4'; -- S0106 快乐
UPDATE course_legos SET known_text = 'delighted' WHERE id = '75f04402-f7c6-4d27-9a59-5506a2cdfbf1'; -- S0145 开心

-- Conflict 48: "what you said"
-- S0078 keeps "what you said" → "你说了什么"
UPDATE course_legos SET known_text = 'the words you said' WHERE id = 'ae10857c-c47e-4148-b59c-644b2b3ec5e9'; -- S0083 你说的话
UPDATE course_legos SET known_text = 'the words you said' WHERE id = 'f6afe19d-606a-48ac-9404-545de0212a24'; -- S0113 你说的话

-- Conflict 49: "said"
-- S0078 keeps "said" → "说了"
UPDATE course_legos SET known_text = 'spoke' WHERE id = '43f5a4b5-247a-48b5-8c87-3e27b563daee'; -- S0083 说
UPDATE course_legos SET known_text = 'spoke' WHERE id = 'c8916797-b1f1-4d7d-a502-82e51023f97a'; -- S0084 说
UPDATE course_legos SET known_text = 'spoke' WHERE id = 'c1160812-deff-4a6a-92c6-a3da760b49e7'; -- S0235 说
UPDATE course_legos SET known_text = 'spoke' WHERE id = 'b5930bb3-3bda-4d96-a67d-bc19204f85b6'; -- S0236 说

-- Conflict 50: "my friend"
-- S0084 keeps "my friend" → "我的朋友"
UPDATE course_legos SET known_text = 'a friend of mine' WHERE id = '8489db0c-c3e1-4016-86b3-03c82005d407'; -- S0199 我朋友

-- Conflict 51: "in a short time"
-- S0089 keeps "in a short time" → "在很短的时间里"
UPDATE course_legos SET known_text = 'within a short period' WHERE id = 'c0955f17-e1ed-4bf5-938f-6db182f993d3'; -- S0245 在短时间内

-- Conflict 52: "in time"
-- S0091 keeps both instances with same target "及时" (these are duplicates in same seed, not a real conflict)
UPDATE course_legos SET known_text = 'on time' WHERE id = '1ba1b1bb-456e-4d5d-9991-4461a92eed9e'; -- S0200 按时

-- Conflict 53: "this"
-- S0092, S0149, S0160 keep "this" → "这个"
UPDATE course_legos SET known_text = 'this one' WHERE id = '18cebbd3-a16f-4554-8da5-8325cc140520'; -- S0094 这
UPDATE course_legos SET known_text = 'this one' WHERE id = 'aa49e1fc-e220-46bd-92a6-459ad41e1237'; -- S0101 这
UPDATE course_legos SET known_text = 'this one' WHERE id = '5bf2f35e-9c61-4732-a903-c9f9e94b8235'; -- S0138 这

-- Conflict 54: "no"
-- S0096 keeps "No" → "不"
UPDATE course_legos SET known_text = 'do not have' WHERE id = '3dabc0e7-2c0e-4b83-a373-71cab541abe8'; -- S0183 没有

-- Conflict 55: "yes"
-- S0097, S0172, S0189 keep "Yes" → "是的"
UPDATE course_legos SET known_text = 'I saw' WHERE id = '680d6c0e-e0b8-46f6-90b0-272253cf3377'; -- S0184 看到了

-- Conflict 56: "something else"
-- S0098 keeps "something else" → "别的"
UPDATE course_legos SET known_text = 'other matters' WHERE id = 'dfee860b-aa52-4ac4-9b63-c5061337ea7d'; -- S0158 别的事情
UPDATE course_legos SET known_text = 'other matters' WHERE id = 'be727be1-7af5-449b-98c3-951c65008cc3'; -- S0250 别的事情

-- Conflict 57: "that"
-- S0102, S0135, S0159, S0161, S0172 keep "that" → "那"
UPDATE course_legos SET known_text = 'that one' WHERE id = 'ca4f0c35-a98f-4f66-9787-f8718cbc47a4'; -- S0162 那个
UPDATE course_legos SET known_text = 'that one' WHERE id = '2e75bdc3-261d-42b4-a056-e7799a9f9f32'; -- S0257 那个

-- Conflict 58: "thing"
-- S0104 keeps "thing" → "事情"
UPDATE course_legos SET known_text = 'object' WHERE id = '8c38e63a-22fc-473d-8556-a187ffdf680b'; -- S0243 东西
UPDATE course_legos SET known_text = 'object' WHERE id = '1b3515fc-508d-453d-9ec8-65b13886a62c'; -- S0257 东西

-- Conflict 59: "after"
-- S0110 keeps "after" → "之后"
UPDATE course_legos SET known_text = 'afterwards' WHERE id = '0ba894b8-d965-4fdf-8dd1-b808ff7b632b'; -- S0251 以后

-- Conflict 60: "learn"
-- S0111 keeps "learn" → "学习"
UPDATE course_legos SET known_text = 'to study' WHERE id = '523a9aab-624f-41fb-b9c7-a61ccdda84a8'; -- S0224 学

-- Conflict 61: "something new"
-- S0111 keeps "something new" → "新东西"
UPDATE course_legos SET known_text = 'some new things' WHERE id = '6e747465-77af-45d7-b7e9-3135f2095493'; -- S0227 一些新东西

-- Conflict 62: "unusual"
-- S0121 keeps "unusual" → "不寻常"
UPDATE course_legos SET known_text = 'rare' WHERE id = '363b57d9-ca69-4b51-8f68-00b3d2d124f4'; -- S0166 少见

-- Conflict 63: "idea"
-- S0123, S0259 keep "idea" → "主意"
UPDATE course_legos SET known_text = 'thought' WHERE id = '6322973a-9884-42bd-944b-01f555eabfd9'; -- S0196 想法

-- Conflict 64: "i wanted to see you"
-- S0127 keeps "I wanted to see you" → "我想看你"
UPDATE course_legos SET known_text = 'I wanted to meet you' WHERE id = '47b0850c-e1a0-4cd7-b6e0-2c0896e38a11'; -- S0178 我想见你

-- Conflict 65: "that's"
-- S0132 keeps "That's" → "那"
UPDATE course_legos SET known_text = 'That is' WHERE id = 'd0ea09b2-cce2-4add-bb6d-ab7a434000f4'; -- S0189 那是

-- Conflict 66: "someone"
-- S0133 keeps "someone" → "某个人"
UPDATE course_legos SET known_text = 'a person' WHERE id = '76c4ad44-098a-46fa-beda-60635b41ae08'; -- S0234 一个人
UPDATE course_legos SET known_text = 'a person' WHERE id = '154d5327-f310-4593-a87a-cb3aea6e0345'; -- S0235 一个人
UPDATE course_legos SET known_text = 'a person' WHERE id = 'f6c3e759-7dcb-4e7d-8627-54174bd42215'; -- S0236 一个人

-- Conflict 67: "my"
-- S0136, S0138 keep "my" → "我的"
UPDATE course_legos SET known_text = 'I' WHERE id = 'f3848af8-1b55-4655-bc22-0135257a2308'; -- S0239 我
UPDATE course_legos SET known_text = 'I' WHERE id = 'af080bff-2701-47aa-8201-917edf3159cb'; -- S0240 我

-- Conflict 68: "talk"
-- S0137 keeps "talk" → "说话"
UPDATE course_legos SET known_text = 'to chat' WHERE id = 'abfe7d86-7d58-4e30-a391-47e6057e8a25'; -- S0158 聊聊

-- Conflict 69: "sorry"
-- S0139 keeps "sorry" → "遗憾"
UPDATE course_legos SET known_text = 'to apologize' WHERE id = 'c11a1bc4-c26c-4282-82f2-f1cc75dea37f'; -- S0140 抱歉

-- Conflict 70: "the same"
-- S0143 keeps "the same" → "一样"
UPDATE course_legos SET known_text = 'the same thing' WHERE id = 'df26ea42-5246-4db2-86cc-b7bcc3788523'; -- S0243 同样的

-- Conflict 71: "earlier"
-- S0143 keeps "earlier" → "之前"
UPDATE course_legos SET known_text = 'early' WHERE id = '95d7d469-d116-46df-b7f0-530a2a619c38'; -- S0144 早

-- Conflict 72: "trying to"
-- S0159 keeps "trying to" → "想"
UPDATE course_legos SET known_text = 'attempting to' WHERE id = 'c669c23c-bce5-453b-8b2a-a97ce47da0d9'; -- S0213 试图

-- Conflict 73: "see"
-- S0178 keeps "see" → "见"
UPDATE course_legos SET known_text = 'to catch sight of' WHERE id = '5afe4805-f175-422e-84b3-b79718373d27'; -- S0182 看到
UPDATE course_legos SET known_text = 'to catch sight of' WHERE id = '111449ce-3ded-4aa6-affd-48db6ca104a2'; -- S0183 看到

-- Conflict 74: "read"
-- S0180 keeps "read" → "看"
UPDATE course_legos SET known_text = 'to read books' WHERE id = '0456de32-ef52-4c61-9967-44bfa49ac78f'; -- S0239 读书

-- Conflict 75: "i saw"
-- S0184 keeps "I saw" → "我看到了"
UPDATE course_legos SET known_text = 'I caught sight of' WHERE id = '340774fb-bdae-4ffc-a69e-b68f85cc7826'; -- S0216 我看见了

-- Conflict 76: "i'm happy"
-- S0187 keeps "I'm happy" → "我很开心"
UPDATE course_legos SET known_text = 'I am glad' WHERE id = 'fb9432ff-c150-4666-b0fd-386b4491acc9'; -- S0245 我很高兴

-- Conflict 77: "is trying to"
-- S0222 keeps "is trying to" → "试着"
UPDATE course_legos SET known_text = 'is attempting to' WHERE id = '292cda8e-3405-48f9-b806-0d6e53ca9be7'; -- S0226 在试图

-- End of Phase 2 Conflict Resolution
-- Total UPDATE statements: 132 (some conflicts had multiple later occurrences)
