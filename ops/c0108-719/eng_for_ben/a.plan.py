"""C0108 hope -> expect, eng_for_ben (cs #772 asia shard for parent #758). PLAN ONLY: nothing applied.
Known verb: আশা করা -> প্রত্যাশা করা. This course already prompts "wasn't expecting" with প্রত্যাশা করিনি (LEGO S0112L01) and keeps আশা for
hope (S0107L02 hoped to, S0149L01 I hope); Samsad Bengali-English: প্রত্যাশা = expectation. Using প্রত্যাশা keeps one prompt -> one English verb.
The hope LEGO S0108L01 is re-cut to expect = প্রত্যাশা করা and all its rows follow; the wake LEGO S0108L02 becomes "to wake up"
(component জেগে = wake up). "waking" rows are left as they are.
Tuples are (known, target[, roman]); None = keep live."""
C = 'eng_for_ben'
PLAN = {
 'SEED': ('আমরা রাতের মাঝখানে জেগে উঠতে প্রত্যাশা করিনি।', "We didn't expect to wake up in the middle of the night."),
 'S0108L01': {'lego': ('প্রত্যাশা করা', 'expect')},
 'S0108L01B01': ('আমি প্রত্যাশা করি কথা বলতে', 'I expect to speak'),
 'S0108L01B02': ('কথা বলতে প্রত্যাশা করি', 'expect to speak'),
 'S0108L01B03': ('আমি প্রত্যাশা করিনি', "I didn't expect"),
 'S0108L01U01': ('আমি প্রত্যাশা করি শীঘ্রই ইংরেজি কথা বলতে পারব।', 'I expect to speak English soon'),
 'S0108L01U02': ('আমি প্রত্যাশা করি আপনার সাথে অনুশীলন করতে।', 'I expect to practise with you'),
 'S0108L01U03': ('আমি প্রত্যাশা করি আরও শব্দ মনে রাখতে।', 'I expect to remember more words'),
 'S0108L01U04': ('আমরা প্রত্যাশা করি তোমার সাথে দেখা করতে।', 'we expect to meet with you'),
 'S0108L01U05': ('আমি প্রত্যাশা করি অনেক কিছু শিখতে।', 'I expect to learn a lot'),
 'S0108L01U06': ('তুমি কি প্রত্যাশা করো যত তাড়াতাড়ি সম্ভব কথা বলতে?', 'do you expect to speak as soon as you can?'),
 'S0108L02': {'lego': (None, 'to wake up'), 'components': [{'known': 'উঠতে', 'target': 'to', 'introduce': False}, {'known': 'জেগে', 'target': 'wake up'}]},
 'S0108L02B01': ('জেগে উঠতে', 'to wake up'),
 'S0108L02B02': ('জেগে উঠতে প্রত্যাশা করা', 'expect to wake up'),
 'S0108L02B03': ('আমি জেগে উঠতে চাই', 'I want to wake up'),
 'S0108L02B04': ('আমি জেগে উঠতে চাই না', "I don't want to wake up"),
 'S0108L02C02': ('জেগে', 'wake up'),
 'S0108L02U01': ('আমি আগামীকাল ছয়টায় জেগে উঠতে চাই।', "I want to wake up at six o'clock tomorrow"),
 'S0108L02U02': ('আমি শীঘ্রই জেগে উঠতে প্রত্যাশা করি।', 'I expect to wake up soon'),
 'S0108L02U03': ('অন্য লোক আসার সময় আমি জেগে উঠতে চাই না।', "I don't want to wake up when other people are here"),
 'S0108L02U04': ('যাওয়ার আগে জেগে উঠতে চেষ্টা করছি।', "I'm trying to wake up before I have to go"),
 'S0108L02U05': ('আমরা জেগে উঠতে প্রত্যাশা করিনি।', "we didn't expect to wake up"),
 'S0108L03B02': ('রাতের মাঝখানে জেগে উঠতে', 'to wake up in the middle of the night'),
 'S0108L03B03': ('প্রত্যাশা করা জেগে উঠতে রাতের মাঝখানে', 'expect to wake up in the middle of the night'),
 'S0108L03U02': ('আমি রাতের মাঝখানে জেগে উঠতে চাই না।', "I don't want to wake up in the middle of the night"),
 'S0108L03U03': ('আমরা রাতের মাঝখানে জেগে উঠতে প্রত্যাশা করিনি।', "we didn't expect to wake up in the middle of the night"),
 'S0108L03U06': ('তুমি কি রাতের মাঝখানে জেগে উঠেছিলে?', 'did you wake up in the middle of the night?'),
}
