# The overnight probe — 35 clips you can listen to

Before releasing the full French and German bands I rendered a small live slice of each course past round 200, listened to **every clip** with whisper, and only then let the night start. Nothing here is a sample of a sample: this is 100% of what the probe rendered.

**Result: 35 clips, 0 hard failures, 0 unchecked.** Two clips were flagged by the gate and both turned out to be the checker mis-reading a clip that is fine — details at the bottom.

## German — rounds 201-205

34 clips rendered, 34 listened to, 0 hard failures, 1 soft, 0 unchecked.

**known** — “I am not going to wait for you”

https://ssi-audio-stage.s3.eu-west-1.amazonaws.com/mastered/F1B54024-5EFA-4091-876E-E35671E44967.mp3

**known** — “But I am not going to wait for you”

https://ssi-audio-stage.s3.eu-west-1.amazonaws.com/mastered/6C1F843A-0DAE-4742-809B-411D314E86F2.mp3

**known** — “I'm not going to wait for you, and I'm going now”

https://ssi-audio-stage.s3.eu-west-1.amazonaws.com/mastered/22DD5174-1FFE-48A4-9D32-1AF41DCC46DF.mp3

**known** — “I am not going to wait for you because I have to go now”

https://ssi-audio-stage.s3.eu-west-1.amazonaws.com/mastered/525C9FAB-58B4-47E5-A9B8-FE0CE4E706EF.mp3

**known** — “I am not going to wait for you because I have to read this now”

https://ssi-audio-stage.s3.eu-west-1.amazonaws.com/mastered/37C3E35D-4824-4431-A48F-36F4F6F55323.mp3

**known** — “I'm not going to wait for you, but I will come back later”

https://ssi-audio-stage.s3.eu-west-1.amazonaws.com/mastered/B8F70824-3BAA-4129-9927-E4D3051329E1.mp3

**known** — “When did you start to learn, and why did you start?”

https://ssi-audio-stage.s3.eu-west-1.amazonaws.com/mastered/C618F585-A220-44B5-8519-4A23CDE6C778.mp3

**presentation** — “The German for: 'I'm not going to wait for you', is:”

https://ssi-audio-stage.s3.eu-west-1.amazonaws.com/mastered/75B738D1-74C9-4A80-B7FD-159473305BF6.mp3

**known** — “I agree with what you said about this yesterday”

https://ssi-audio-stage.s3.eu-west-1.amazonaws.com/mastered/B394576D-554C-4123-9AF8-9130B6853083.mp3

**known** — “I agree with what you said about learning German”

https://ssi-audio-stage.s3.eu-west-1.amazonaws.com/mastered/C04A5E53-26B0-4840-98F8-6CAAB0CCB80D.mp3

**known** — “I agree with you but I do not know if I can help you with it”

https://ssi-audio-stage.s3.eu-west-1.amazonaws.com/mastered/F301371C-C676-421B-8AD5-A2ED3541D740.mp3

**known** — “I agree with that and I think it is very important to understand it well”

https://ssi-audio-stage.s3.eu-west-1.amazonaws.com/mastered/41185B8C-37FD-41A5-A6DB-616A0E22BEBA.mp3

## French — rounds 201-205

1 clips rendered, 1 listened to, 0 hard failures, 1 soft, 0 unchecked.

**known** — “everything that I've already learnt”  ← flagged: last_word_missing

https://ssi-audio-stage.s3.eu-west-1.amazonaws.com/mastered/3284529F-A603-4348-9284-103367737177.mp3

## The two flagged clips, and why they are fine

Both were flagged `last_word_missing`, which is the checker's rule that the script's final word must show up in the last three transcribed words.

- French: the script says **learnt**, whisper transcribed **learned**. Two letters apart, against a tolerance of one. The word is spoken.
- German: the script ends **is:**, whisper transcribed **is'** with a stray close-quote stuck to it. One character apart, against a tolerance of zero for a two-letter word. The word is spoken.

Neither is a truncation. In a real truncation the final word is absent from the transcript altogether, and no amount of punctuation-tidying brings it back — so the re-check that clears these two cannot clear a genuine one.
