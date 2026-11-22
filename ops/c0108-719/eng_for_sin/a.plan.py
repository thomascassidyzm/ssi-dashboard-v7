"""C0108 hope -> expect, eng_for_sin (cs #772 asia shard for parent #758). PLAN ONLY: nothing applied.
Known verb in the seed: ආශා කළේ නෑ ("didn't desire") -> බලාපොරොත්තු වුණේ නෑ, which is also the word this seed's own LEGO S0108L01 already
carries (බලාපොරොත්තු වෙන්න). Malalasekera English-Sinhala: expect = බලාපොරොත්තු වෙනවා; it covers hope and expect alike, so the LEGO's known
stays and its English becomes "expect" (S0107L01 බලාපොරොත්තු වුණා = hoped is a different form: no prompt clash). Rows keep their Sinhala and
take expect / wake up in English; wake LEGO S0108L02 -> "wake up". The Sinhala of several rows is rough as live (D1 Sinhala is separate work).
Tuples are (known, target[, roman]); None = keep live."""
C = 'eng_for_sin'
PLAN = {
 'SEED': ('රෑ මැද අවදි වෙනවා කියලා බලාපොරොත්තු වුණේ නෑ.', "We didn't expect to wake up in the middle of the night."),
 'S0108L01': {'lego': ('බලාපොරොත්තු වෙන්න', 'expect')},
 'S0108L01B01': ('බලාපොරොත්තු නැත්තේ ඒක', "didn't expect to do it"),
 'S0108L01B02': ('බලාපොරොත්තු වෙනවා ඒක හොඳයි', 'expect it is good'),
 'S0108L01B03': ('බලාපොරොත්තු වෙනවා සිදු කරන්න ඒක', 'expect to do it'),
 'S0108L01U01': ('අපි බලාපොරොත්තු නැත්තේ ඒක සිදු කරන්න', "we didn't expect to do it"),
 'S0108L01U02': ('මම බලාපොරොත්තු වෙනවා ඒක වැඩ කරනවා', 'I expect it will work'),
 'S0108L01U03': ('ඔයා බලාපොරොත්තු වෙනවාද ඒක පහසුද', 'do you expect it will be easy?'),
 'S0108L01U04': ('මම බලාපොරොත්තු වෙනවා බලන්න ඔයාව ඉක්මනට', 'I expect to see you soon'),
 'S0108L01U05': ('මම බලාපොරොත්තු වෙනවා ඉගෙනගන්න බොහෝ', 'I expect to learn a lot'),
 'S0108L01U06': ('ඔයා බලාපොරොත්තු වෙනවාද ඒක වෙනස් කරන්න', 'do you expect to change it?'),
 'S0108L01U07': ('අපි බලාපොරොත්තු නැත්තේ ඒක අමාරු වෙනවා', "we didn't expect it would be difficult"),
 'S0108L01U08': ('මම බලාපොරොත්තු වෙනවා ඒක ක්\u200dරියා කරනවා', 'I expect it is working'),
 'S0108L02': {'lego': ('නැගිටින්න', 'wake up')},
 'S0108L02B01': ('නැගිටින්න ඕනේ උදේට', 'should wake up in the morning'),
 'S0108L02B02': ('නැගිටින්න ඉක්මනට', 'wake up soon'),
 'S0108L02B03': ('නොනැගිටියා', "didn't wake up"),
 'S0108L02U01': ('අපි බලාපොරොත්තු නැත්තේ නැගිටින්න රෑ', "we didn't expect to wake up at night"),
 'S0108L02U02': ('මට ඕනේ නෑ නැගිටින්න ඒ තරම් ඉක්මනට', "I don't want to wake up that quickly"),
 'S0108L02U03': ('ඔයා නැගිටියාද ඊයේ රෑ', 'did you wake up last night?'),
 'S0108L02U04': ('ඔයා නැගිටින්න ඕනේ ඉක්මනට හෙට', 'you should wake up soon tomorrow'),
 'S0108L02U05': ('මම බලාපොරොත්තු නැත්තේ නැගිටින්න ඒ තරම් ඉක්මනට', "I didn't expect to wake up that quickly"),
 'S0108L02U06': ('ඒ අය නැගිටියා ඊයේ රෑ', 'they did wake up last night'),
 'S0108L02U07': ('මම නැගිටියා ඉතා ඉක්මනට', 'I did wake up very quickly'),
 'S0108L02U08': ('ඔයා නැගිටින්න ඕනේ නෑ ඒ තරම් ඉක්මනට', "you shouldn't wake up that quickly"),
 'S0108L03U01': ('අපි බලාපොරොත්තු නැත්තේ නැගිටින්න මැද භාගයේ රෑ', "we didn't expect to wake up in the middle of the night"),
 'S0108L03U04': ('ඔයා නැගිටියාද මැද භාගයේ රෑ?', 'did you wake up in the middle of the night?'),
 'S0108L03U08': ('ඔයා නැගිටින්න ඕනේ නෑ මැද භාගයේ රෑ', "you shouldn't wake up in the middle of the night"),
}
