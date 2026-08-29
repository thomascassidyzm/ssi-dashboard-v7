/**
 * Which structural split(s) a given seed's phrase basket must cross, with a
 * target-side matcher per outcome. Keyed "course:seed".
 * Splits themselves are defined in docs/frame-layer/spanish-structural-splits.json;
 * this file is the machine-checkable target-side test for the ones wired so far.
 */
module.exports = {
  'spa_for_eng:600': [{
    id: 'S7', name: "the double-'d — 'd = would vs 'd = had",
    outcomes: [
      { form: "habría + participle ('d = would)", target_re: '\\bhabr[íi]a\\b' },
      { form: "hubiera(s) + participle ('d = had)",  target_re: '\\bhubiera' },
    ],
  }],
  'spa_for_eng:599': [{
    id: 'S7', name: "the double-'d — 'd = would vs 'd = had",
    outcomes: [
      { form: "habría + participle", target_re: '\\bhabr[íi]a\\b' },
      { form: "hubiera(s) + participle", target_re: '\\bhubiera' },
    ],
  }],
};
