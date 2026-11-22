"""C0108 hope -> expect, eng_for_jpn (cs #772 asia shard for parent #758). PLAN ONLY: nothing applied.
Known verb: 起きることを望んでいませんでした ("did not wish to wake") -> 起きるとは思っていませんでした. 〜とは思わなかった is the everyday Japanese for
"didn't expect to…" (the sister course jpn_for_eng's seed 108 uses the same とは思ってなかった; Kenkyusha New Japanese-English, 思う: 〜とは思わなかった
= I never expected…). 予想していませんでした is this course's prompt for "I wasn't expecting it" (S0112L01) and is left to that seed.
The whole-sentence LEGO S0108L02 is re-cut and its eight rows follow. S0108L01 rows say "waking", not "wake", and are untouched.
Tuples are (known, target[, roman]); None = keep live."""
C = 'eng_for_jpn'
PLAN = {
 'SEED': ('夜中に起きるとは思っていませんでした。', "we didn't expect to wake up in the middle of the night"),
 'S0108L02': {'lego': ('夜中に起きるとは思っていませんでした', "we didn't expect to wake up in the middle of the night"), 'components': [{'known': '夜中に', 'target': 'in the middle of the night'}]},
 'S0108L02B01': ('夜中に起きるとは思っていませんでした', "we didn't expect to wake up in the middle of the night"),
 'S0108L02B02': ('私たちは夜中に起きるとは思っていませんでした', "we didn't expect to wake up in the middle of the night"),
 'S0108L02B03': ('夜中に起きるとは思っていませんでしたが、起きてしまいました', "we didn't expect to wake up in the middle of the night but we did"),
 'S0108L02U01': ('夜中に起きるとは思っていなかったことはわかっています', "I know that we didn't expect to wake up in the middle of the night"),
 'S0108L02U02': ('彼女は夜中に起きるとは思っていなかったと私に言いました', "she told me that we didn't expect to wake up in the middle of the night"),
 'S0108L02U03': ('夜中に起きるとは思っていなかったことを覚えています', "I remember that we didn't expect to wake up in the middle of the night"),
 'S0108L02U04': ('夜中に起きるとは思っていなかったと思います', "I think that we didn't expect to wake up in the middle of the night"),
 'S0108L02U05': ('夜中に起きるとは思っていなかったので、とても疲れています', "we didn't expect to wake up in the middle of the night so we're very tired"),
}
