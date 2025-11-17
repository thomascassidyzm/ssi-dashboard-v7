#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const outputPath = '/home/user/ssi-dashboard-v7/public/vfs/courses/cmn_for_eng/phase5_outputs/seed_s0131.json';
const data = JSON.parse(fs.readFileSync(outputPath, 'utf8'));

// Manually refined practice phrases with linguistic intelligence
const refinedLegos = {
  "S0131L01": [
    ["there are", "有", null, 1],
    ["There are", "有", null, 1],
    ["There are many", "有很多", null, 2],
    ["There are things", "有东西", null, 2],
    ["I think there are", "我认为有", null, 3],
    ["That's why there are", "这就是为什么有", null, 3],
    ["I know there are", "我知道有", null, 4],
    ["He said there are", "他说有", null, 4],
    ["My friend knows there are", "我的朋友知道有", null, 5],
    ["I think there are so many", "我认为有这么多", null, 6]
  ],
  "S0131L02": [
    ["too many ideas", "太多想法", null, 1],
    ["so many ideas", "这么多想法", null, 2],
    ["have too many ideas", "有太多想法", null, 2],
    ["I have too many ideas", "我有太多想法", null, 3],
    ["You have too many ideas", "你有太多想法", null, 3],
    ["My friend has too many ideas", "我的朋友有太多想法", null, 4],
    ["I think you have too many ideas", "我认为你有太多想法", null, 4],
    ["He said I have too many ideas", "他说我有太多想法", null, 5],
    ["That's why I have too many ideas", "这就是为什么我有太多想法", null, 6],
    ["I know I have too many ideas", "我知道我有太多想法", null, 7]
  ],
  "S0131L03": [
    ["there are too many ideas", "有太多想法", null, 1],
    ["You see, there are too many ideas", "你看，有太多想法", null, 2],
    ["I think there are too many ideas", "我认为有太多想法", null, 2],
    ["I know that there are too many ideas", "我知道有太多想法", null, 3],
    ["He said there are too many ideas", "他说有太多想法", null, 3],
    ["My friend knows there are too many ideas", "我的朋友知道有太多想法", null, 4],
    ["I believe there are too many ideas", "我相信有太多想法", null, 4],
    ["Don't you think there are too many ideas?", "你不认为有太多想法吗？", null, 5],
    ["I'm certain that there are too many ideas", "我确定有太多想法", null, 6],
    ["Yes, I know there are too many ideas", "是的，我知道有太多想法", null, 7]
  ],
  "S0131L04": [
    ["in my head", "在我的脑海里", null, 1],
    ["things in my head", "脑海里的东西", null, 2],
    ["in my head right now", "现在在我的脑海里", null, 2],
    ["I have in my head", "我的脑海里有", null, 3],
    ["there's in my head", "在我的脑海里有", null, 3],
    ["too many things in my head", "脑海里有太多东西", null, 4],
    ["I think in my head", "我认为在我的脑海里", null, 4],
    ["He told me what's in my head", "他告诉我脑海里的东西", null, 5],
    ["Everything in my head is important", "脑海里的一切都很重要", null, 6],
    ["What's going in my head now?", "现在脑海里在发生什么?", null, 7]
  ],
  "S0131L05": [
    ["going around in my head", "在我的脑海里转", null, 1],
    ["ideas going around in my head", "想法在我的脑海里转", null, 2],
    ["all going around in my head", "都在我的脑海里转", null, 2],
    ["always going around in my head", "总是在我的脑海里转", null, 3],
    ["keeps going around in my head", "一直在我的脑海里转", null, 3],
    ["these ideas going around in my head", "这些想法在我的脑海里转", null, 4],
    ["won't stop going around in my head", "不会停止在我的脑海里转", null, 4],
    ["They keep going around in my head", "他们的想法在我的脑海里转", null, 5],
    ["so many things going around in my head", "这么多东西在我的脑海里转", null, 6],
    ["There are too many ideas going around in my head.", "有太多想法在我的脑海里转。", null, 10]
  ]
};

// Apply refined phrases
Object.entries(refinedLegos).forEach(([legoId, phrases]) => {
  if (data.legos[legoId]) {
    data.legos[legoId].practice_phrases = phrases;
  }
});

fs.writeFileSync(outputPath, JSON.stringify(data, null, 2));
console.log('✓ S0131 refined with natural, linguistically-intelligent phrases');
