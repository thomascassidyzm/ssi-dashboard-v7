"""C0108 hope -> expect, eng_for_kan (cs #772 asia shard for parent #758). PLAN ONLY: nothing applied.
Known verb: ಆಶಿಸಿರಲಿಲ್ಲ -> ನಿರೀಕ್ಷಿಸಿರಲಿಲ್ಲ, the course's own prompt for "wasn't expecting" (S0112L02); ಆಶಿಸು stays for hope (S0107L03, S0149L02).
Alar / Kittel: ನಿರೀಕ್ಷಿಸು = to expect. It takes both a clause (… ಅಂತ ನಿರೀಕ್ಷಿಸಿರಲಿಲ್ಲ) and a plain object (ಸಹಾಯ ನಿರೀಕ್ಷಿಸಿರಲಿಲ್ಲ), which the
colloquial ಅಂದುಕೊಂಡಿರಲಿಲ್ಲ does not, so the basket's object rows stay natural. NOTE for parent: S0108L03 ನಿರೀಕ್ಷಿಸಿರಲಿಲ್ಲ = "didn't expect" now
shares its known with S0112L02 = "wasn't expecting" (Kannada has one form for both). Wake LEGO S0108L02 -> "to wake up".
Tuples are (known, target[, roman]); None = keep live."""
C = 'eng_for_kan'
PLAN = {
 'SEED': ('ನಾವು ಮಧ್ಯರಾತ್ರಿಯಲ್ಲಿ ಎಚ್ಚರ ಆಗ್ತೀವಿ ಅಂತ ನಿರೀಕ್ಷಿಸಿರಲಿಲ್ಲ.', "We didn't expect to wake up in the middle of the night."),
 'S0108L01U03': ('ನನಗೆ ಮಧ್ಯರಾತ್ರಿಯಲ್ಲಿ ಎಚ್ಚರ ಆಗೋದು ಬೇಡ', "I don't want to wake up in the middle of the night"),
 'S0108L02': {'lego': ('ಎಚ್ಚರ ಆಗ್ತೀವಿ', 'to wake up'), 'components': [{'known': 'ಎಚ್ಚರ', 'target': 'awake'}, {'known': 'ಆಗ್ತೀವಿ', 'target': 'to become'}]},
 'S0108L02B01': ('ಎಚ್ಚರ ಆಗ್ತೀವಿ', 'to wake up'),
 'S0108L02B02': ('ಈಗ ಎಚ್ಚರ ಆಗ್ತೀವಿ', 'to wake up now'),
 'S0108L02B03': ('ಇಂಗ್ಲಿಷ್\u200cನಲ್ಲಿ ಎಚ್ಚರ ಆಗ್ತೀವಿ', 'to wake up in English'),
 'S0108L02B04': ('ಆದರೆ ಎಚ್ಚರ ಆಗ್ತೀವಿ', 'but to wake up'),
 'S0108L02U01': ('ನನಗೆ ಎಚ್ಚರ ಆಗೋದು ಬೇಡ', "I don't want to wake up"),
 'S0108L02U02': ('ನನಗೆ ಮಧ್ಯರಾತ್ರಿಯಲ್ಲಿ ಎಚ್ಚರ ಆಗೋದು ಬೇಡ', "I don't want to wake up in the middle of the night"),
 'S0108L02U03': ('ನನಗೆ ಈಗ ಎಚ್ಚರ ಆಗೋದು ಬೇಡ', "I don't want to wake up now"),
 'S0108L02U04': ('ಎಚ್ಚರ ಆಗೋದು ಕಷ್ಟ', "it's difficult to wake up"),
 'S0108L02U05': ('ನಾನು ಎಚ್ಚರ ಆಗಬೇಕು', 'I need to wake up'),
 'S0108L03': {'lego': ('ನಿರೀಕ್ಷಿಸಿರಲಿಲ್ಲ', "didn't expect")},
 'S0108L03B01': ('ಎಚ್ಚರ ಆಗ್ತೀವಿ ಅಂತ ನಿರೀಕ್ಷಿಸಿರಲಿಲ್ಲ', "didn't expect to wake up"),
 'S0108L03B02': ('ಇಂಗ್ಲಿಷ್\u200cನಲ್ಲಿ ನಿರೀಕ್ಷಿಸಿರಲಿಲ್ಲ', "didn't expect in English"),
 'S0108L03B03': ('ಕಳೆದ ವಾರ ನಿರೀಕ್ಷಿಸಿರಲಿಲ್ಲ', "didn't expect last week"),
 'S0108L03U01': ('ನಾನು ಅದನ್ನ ನಿರೀಕ್ಷಿಸಿರಲಿಲ್ಲ', "I didn't expect that"),
 'S0108L03U02': ('ನಾವು ಇನ್ನೂ ಹೆಚ್ಚು ನಿರೀಕ್ಷಿಸಿರಲಿಲ್ಲ', "we didn't expect more"),
 'S0108L03U03': ('ನಾನು ನಿಮ್ಮನ್ನ ನೋಡೋದನ್ನ ನಿರೀಕ್ಷಿಸಿರಲಿಲ್ಲ', "I didn't expect to see you"),
 'S0108L03U04': ('ಅವಳು ಸಹಾಯ ನಿರೀಕ್ಷಿಸಿರಲಿಲ್ಲ', "she didn't expect help"),
 'S0108L03U05': ('ನಾವು ಏನೂ ನಿರೀಕ್ಷಿಸಿರಲಿಲ್ಲ', "we didn't expect anything"),
}
