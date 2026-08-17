# ZHO-family presentation-clip verification — full results

**Slice:** `.a74-scratch/slice-zho-family.json` — 363 rows across deu_for_zho, eng_for_zho, fra_for_zho, ita_for_zho, spa_for_zho, zho_for_eng, zho_for_jpn.

**Verdict:** 206 REAL (159 HIGH severity, 47 LOW), 157 false positives (148 FP-PARAPHRASE, 9 FP-EQUIV). Every row was re-verified live against `course_legos`/`course_audio` on 2026-08-15 (via `presentation_audio_id::uuid` link, not `course_audio.lego_id`) — 0 drift from the slice JSON across all 363 rows.

## Headline finding: this is not scattered noise, it is a linkage-corruption pattern concentrated in "Chinese-known" courses

The four courses where **Chinese is the KNOWN language** (deu_for_zho, fra_for_zho, ita_for_zho, spa_for_zho — Chinese speakers learning European languages) have a REAL rate of **72–88%** (deu 90%, fra 77%, ita 79%, spa 88%). By contrast, the three courses where Chinese is the **TARGET** language (eng_for_zho, zho_for_eng, zho_for_jpn — non-Chinese speakers learning Chinese) have a REAL rate of **14–44%**, and most of *those* REAL rows are LOW severity.

In the high-REAL-rate courses, the mismatch is not narrative drift — the clip's quoted headword is very often **another LEGO's content entirely**, unrelated in meaning to both the current known_text and target_text (e.g. deu_for_zho S0101L01: known=语言/"language", target=sprache/"language", but the clip says 发现/"discovery"). I proved this mechanism directly for a subset: **34 of the 363 rows have a clip headword that exactly string-matches another LEGO's known_text elsewhere in the same course** — 12 are an adjacent sibling in the same seed (classic off-by-one/rotation, e.g. zho_for_jpn S0025L01↔S0025L02 have their content exactly swapped, and S0027L01→L02→L03→L04 rotate through each other's headwords), 22 are a LEGO in a completely different seed. The remaining ~170 REAL rows in the high-rate courses show the identical symptom (clip content bearing no relation to the LEGO it is attached to) but the source LEGO could not be pinned down by exact string match — likely because the source's known_text has since been edited, or the source is no longer a live LEGO.

**This means `presentation_audio_id` is pointing at the wrong `course_audio` row for a large fraction of LEGOs in these four courses — not a text-vs-audio drift from a LEGO edit, but a wrong link from the start (or a rotation introduced by some batch operation).** This is worth investigating as a linkage-integrity issue at the course or batch level, not fixing row-by-row as isolated content drift.

## A second, distinct pattern: known_text itself looks stale, not the clip

In eng_for_zho and one zho_for_jpn row, several REAL-HIGH mismatches show the *opposite* shape: the clip's quoted headword actually matches `target_text` correctly, while `known_text` does not. E.g. eng_for_zho S0011L01: known_text=我想 ("I want/think"), target_text="To be able", clip says 能 ("can/to be able") — 能 is the correct Chinese gloss of "to be able", not 我想. Same shape in S0116L03, S0097L01, S0057L01, S0059L02, S0156L01, and zho_for_jpn S0101L02. **For these rows, regenerating the clip to match the current known_text would make things worse** — known_text itself needs auditing against target_text first, independent of the clip.

## Also flagged (not in REAL count, out of detector scope): known_text language anomaly

zho_for_jpn S0052L02 (known_text="last week", should be Japanese) and S0053L01 (known_text="bag") carry untranslated English in a Japanese-known course. Their clips (先週, かばん) are semantically correct in Japanese, so these were scored FP-EQUIV — but the known_text field itself is a distinct DB defect worth a separate look; not counted as a presentation-clip defect since there is no learner-visible clip/text mismatch of meaning.

## Counts by course

| Course | REAL-HIGH | REAL-LOW | FP-PARAPHRASE | FP-EQUIV | Total |
|---|---|---|---|---|---|
| deu_for_zho | 13 | 6 | 2 | 0 | 21 |
| eng_for_zho | 7 | 7 | 37 | 0 | 51 |
| fra_for_zho | 30 | 3 | 10 | 0 | 43 |
| ita_for_zho | 37 | 8 | 12 | 0 | 57 |
| spa_for_zho | 38 | 4 | 6 | 0 | 48 |
| zho_for_eng | 1 | 5 | 31 | 0 | 37 |
| zho_for_jpn | 33 | 14 | 50 | 9 | 106 |
| **TOTAL** | **159** | **47** | **148** | **9** | **363** |

## REAL rows — full table (206 rows)

Sorted by course, then severity (HIGH first). "Text now" = course_legos.known_text (what the learner reads). "Clip says" = the quoted headword the presentation audio actually speaks.

### deu_for_zho (19 REAL)

| lego_id | target_text | text now (known_text) | clip says | severity |
|---|---|---|---|---|
| S0095L02 | fahren | 坐 | 开 | HIGH |
| S0101L01 | sprache | 语言 | 发现 | HIGH |
| S0122L02 | leichter | 更容易 | 经过 | HIGH |
| S0127L01 | grund | 原因 | 见你 | HIGH |
| S0128L02 | gekannt | 认识过 | 你像 | HIGH |
| S0139L01 | früh | 早 | 对不起 | HIGH |
| S0139L02 | es tut mir leid | 对不起 | 必须要 | HIGH |
| S0145L01 | mehr | 不再 | 你不是 | HIGH |
| S0166L01 | name | 名字 | 少见的 | HIGH |
| S0187L01 | zufrieden | 满意 | 目前 | HIGH |
| S0202L03 | niemand wusste | 没有人知道 | 确信 | HIGH |
| S0209L01 | verbringen | 花时间 | 开会 | HIGH |
| S0209L02 | treffen | 开会 | 群组 | HIGH |
| S0053L01 | stecken | 放 | 塞 | LOW |
| S0056L01 | ein paar | 几件事 | 几个 | LOW |
| S0102L01 | so | 那样 | 像 | LOW |
| S0115L01 | gespräch | 聊天 | 对话 | LOW |
| S0212L01 | um Hilfe bitten | 请人帮忙 | 帮助 | LOW |
| S0213L01 | erreichen | 达到 | 做到 | LOW |

### eng_for_zho (14 REAL)

| lego_id | target_text | text now (known_text) | clip says | severity |
|---|---|---|---|---|
| S0011L01 | To be able | 我想 | 能 | HIGH |
| S0057L01 | Can't remember | 说 | 记不住 | HIGH |
| S0059L02 | Next week | 做 | 下个星期 | HIGH |
| S0097L01 | Yes | 好 | 是的 | HIGH |
| S0116L03 | Make | 能 | 做出 | HIGH |
| S0156L01 | Restaurant | 去 | 餐厅 | HIGH |
| S0218L01 | How much | 多少 | 没做什么 | HIGH |
| S0106L01 | Just | 就是 | 只 | LOW |
| S0106L02 | We just need to work hard | 我们只需要努力 | 不需要感到开心，只需要努力 | LOW |
| S0166L02 | Unusual | 不寻常 | 特别 | LOW |
| S0182L02 | Anywhere | 任何地方 | 在哪里 | LOW |
| S0233L01 | Sister | 姐妹 | 姐姐 | LOW |
| S0234L02 | Brother | 兄弟 | 哥哥 | LOW |
| S0300L01 | To seem | 看起来 | 显得 | LOW |

### fra_for_zho (33 REAL)

| lego_id | target_text | text now (known_text) | clip says | severity |
|---|---|---|---|---|
| S0049L02 | tu vois ce que je veux dire | 你知道我的意思 | 明白 | HIGH |
| S0050L01 | je n'essaie pas de | 我不是想 | 完成了 | HIGH |
| S0052L02 | écrire une lettre | 写信 | 一 | HIGH |
| S0053L01 | elle voulait | 她过去想 | 塞 | HIGH |
| S0077L02 | voir | 看 | 我开始 | HIGH |
| S0078L03 | je ne comprends pas | 不懂 | 说过 | HIGH |
| S0082L02 | je vais | 要去 | 会 | HIGH |
| S0086L02 | possible | 可能 | 了 | HIGH |
| S0087L01 | sont | 他们是 | 那些 | HIGH |
| S0088L01 | pas encore | 还没 | 跟人 | HIGH |
| S0090L04 | plus lentement | 慢一点 | 就好了 | HIGH |
| S0094L01 | seule | 唯一 | 起作用 | HIGH |
| S0094L04 | va marcher | 会成功 | 将要 | HIGH |
| S0095L02 | prochain | 下一 | 开 | HIGH |
| S0095L04 | rentrer | 回家 | 下一个 | HIGH |
| S0101L02 | cette | 这个 | 找到 | HIGH |
| S0108L01 | milieu | 中间 | 定冠词 | HIGH |
| S0114L01 | moins | 得不如 | 更少 | HIGH |
| S0122L02 | passe | 发生 | 经过 | HIGH |
| S0139L02 | devoir | 不得不 | 必须要 | HIGH |
| S0147L02 | gentille | 好 | 看到 | HIGH |
| S0155L01 | minutes | 分钟 | 出去 | HIGH |
| S0156L02 | restaurant | 饭店 | 进 | HIGH |
| S0162L01 | penses | 你觉得 | 什么 | HIGH |
| S0183L02 | vues | 没有看到它们 | 看见了 | HIGH |
| S0211L01 | ont | 他们 | 已经做了 | HIGH |
| S0213L01 | savons | 知道 | 做到 | HIGH |
| S0262L01 | à qui tu parlais | 在跟…说话 | 哪个 | HIGH |
| S0292L01 | fête | 聚会 | 到 | HIGH |
| S0299L02 | moitié | 一半 | 付款 | HIGH |
| S0106L01 | heureux | 很开心 | 快乐 | LOW |
| S0158L01 | parlons | 我们说 | 让我们 | LOW |
| S0281L04 | commences | 开始 | 再开始 | LOW |

### ita_for_zho (45 REAL)

| lego_id | target_text | text now (known_text) | clip says | severity |
|---|---|---|---|---|
| S0025L01 | andare | 去 | 走 | HIGH |
| S0052L02 | voleva | 他过去想 | 一 | HIGH |
| S0053L01 | la sua | 她的 | 塞 | HIGH |
| S0065L03 | per mettersi alla prova | 测试自己 | 拿 | HIGH |
| S0074L02 | avermi aiutato a capire | 帮我理解 | 你帮 | HIGH |
| S0088L01 | parlare con persone che | 跟...人说话 | 跟人 | HIGH |
| S0094L01 | solo | 唯一 | 起作用 | HIGH |
| S0095L02 | col prossimo autobus | 坐下一班车 | 开 | HIGH |
| S0101L01 | su | 关于 | 发现 | HIGH |
| S0101L02 | questa lingua | 这门语言 | 找到 | HIGH |
| S0102L01 | stiamo | 我们正在 | 像 | HIGH |
| S0114L01 | stessi | 好像 | 更少 | HIGH |
| S0122L02 | sta andando | 正在进展 | 经过 | HIGH |
| S0128L01 | qualcuno | 某人 | 以前认识 | HIGH |
| S0129L01 | felice | 高兴 | 那么 | HIGH |
| S0135L02 | buono | 好 | 问她 | HIGH |
| S0143L02 | cui | 的方式 | 其中 | HIGH |
| S0144L02 | volessi | 比我想 | 醒来了 | HIGH |
| S0146L01 | sembra | 好像 | 试过了 | HIGH |
| S0149L03 | finisca | 我希望你 | 你完成 | HIGH |
| S0153L02 | detto | 说了。 | 一样的 | HIGH |
| S0155L01 | aspettare | 等待。 | 出去 | HIGH |
| S0160L01 | cinese | 汉语。 | 单词 | HIGH |
| S0161L02 | libro | 书 | 给 | HIGH |
| S0162L01 | ne | 它 | 什么 | HIGH |
| S0166L01 | nome | 名字 | 少见的 | HIGH |
| S0173L01 | ce la faccio | 我自己能行 | 独自 | HIGH |
| S0182L02 | chiavi | 钥匙 | 在某处 | HIGH |
| S0209L01 | gruppo | 团体 | 开会 | HIGH |
| S0209L02 | incontrandosi | 互相见面 | 群组 | HIGH |
| S0260L01 | minima | 一点 | 最小的 | HIGH |
| S0262L01 | chi | 谁 | 哪个 | HIGH |
| S0273L01 | lavoro | 工作 | 遗憾地 | HIGH |
| S0277L02 | all'inizio | 在开始时 | 重要的 | HIGH |
| S0289L02 | sarà | 将是 | 会不会 | HIGH |
| S0295L02 | volevo | 我想要 | 一天完成 | HIGH |
| S0299L01 | vuole | 他想要 | 付 | HIGH |
| S0070L03 | si trovava | 它在哪里 | 它在那里 | LOW |
| S0145L01 | non sei più | 你不再 | 你不是 | LOW |
| S0147L03 | ero | 我以前是 | 我是 | LOW |
| S0158L01 | parliamo | 我们说 | 让我们 | LOW |
| S0180L01 | vorrei | 我想 | 我想要 | LOW |
| S0232L02 | ricorda | 记住 | 她记得 | LOW |
| S0248L01 | schifezza | 是垃圾。 | 很差 | LOW |
| S0300L02 | scortese | 不友好 | 不礼貌 | LOW |

### spa_for_zho (42 REAL)

| lego_id | target_text | text now (known_text) | clip says | severity |
|---|---|---|---|---|
| S0011L03 | después de que | 你说完之后我 | 以后 | HIGH |
| S0028L01 | es | 很有用 | 是 | HIGH |
| S0049L02 | sabes | 你知道 | 明白 | HIGH |
| S0053L01 | poner | 把信放在这里 | 塞 | HIGH |
| S0077L02 | dijiste | 你说 | 我开始 | HIGH |
| S0088L01 | mucho | 很多 | 跟人 | HIGH |
| S0102L01 | escuchar | 听一听 | 像 | HIGH |
| S0104L01 | por eso | 因为这个 | 必须 | HIGH |
| S0110L01 | aprendemos | 我们学 | 完成 | HIGH |
| S0114L01 | tener | 进行 | 更少 | HIGH |
| S0118L01 | vayas | 去 | 我们在 | HIGH |
| S0119L01 | guste | 你喜欢 | 你走 | HIGH |
| S0122L02 | buena | 主意 | 经过 | HIGH |
| S0128L01 | tan | 这么 | 以前认识 | HIGH |
| S0128L02 | feliz | 开心 | 你像 | HIGH |
| S0129L01 | sorpresa | 惊喜 | 那么 | HIGH |
| S0133L01 | problema | 问题 | 人们 | HIGH |
| S0145L01 | parece | 看起来 | 你不是 | HIGH |
| S0146L01 | vio | 她看到了 | 试过了 | HIGH |
| S0147L02 | pude | 我不能够 | 看到 | HIGH |
| S0155L01 | restaurante | 饭店 | 出去 | HIGH |
| S0156L01 | el próximo mes | 下个月 | 去 | HIGH |
| S0158L01 | intento | 我想要说的 | 让我们 | HIGH |
| S0164L01 | seguro | 有把握 | 有意思的 | HIGH |
| S0166L01 | necesitas | 需要 | 少见的 | HIGH |
| S0173L01 | diciendo | 我在说的 | 独自 | HIGH |
| S0175L01 | año | 明年 | 星期天早上 | HIGH |
| S0182L02 | las | 她们 | 在某处 | HIGH |
| S0202L03 | ayudaras | 请你帮我 | 确信 | HIGH |
| S0212L01 | sabemos | 我们知道 | 帮助 | HIGH |
| S0213L01 | pasaste | 过得开心 | 做到 | HIGH |
| S0224L01 | daría | 会给你 | 刚 | HIGH |
| S0227L01 | empezar a practicar | 开始练习 | 东西 | HIGH |
| S0242L01 | comer | 吃 | 给她 | HIGH |
| S0262L01 | estabas hablando | 昨天在说话 | 哪个 | HIGH |
| S0289L02 | allí | 在那里 | 会不会 | HIGH |
| S0292L01 | fiesta | 聚会 | 到 | HIGH |
| S0299L02 | mitad | 一半 | 付款 | HIGH |
| S0040L02 | en este momento | 现在 | 此时 | LOW |
| S0115L02 | podría | 可以 | 可能 | LOW |
| S0152L01 | exactamente | 正是 | 精确地 | LOW |
| S0273L01 | desafortunadamente | 很遗憾工作太多 | 遗憾地 | LOW |

### zho_for_eng (6 REAL)

| lego_id | target_text | text now (known_text) | clip says | severity |
|---|---|---|---|---|
| S0130L01 | 意外 | surprising | outside | HIGH |
| S0069L03 | 只 | one | measure word | LOW |
| S0198L01 | 市政府 | the council | city | LOW |
| S0204L01 | 安排 | arrangements | deal | LOW |
| S0204L02 | 这些 | these | arrangements | LOW |
| S0229L02 | 如果能的话 | if she could | if (conditional marker) | LOW |

### zho_for_jpn (47 REAL)

| lego_id | target_text | text now (known_text) | clip says | severity |
|---|---|---|---|---|
| S0017L04 | 是什么 | 何なのか | 〜です | HIGH |
| S0024L01 | 容易 | 簡単 | 〜ないでしょう | HIGH |
| S0025L01 | 走 | 行く | 〜の前に | HIGH |
| S0025L02 | 之前 | 〜の前に | 行く | HIGH |
| S0027L01 | 时间 | 時間 | 〜すぎる | HIGH |
| S0027L03 | 太多 | 〜すぎる | 答える | HIGH |
| S0027L04 | 回答 | 答える | かける | HIGH |
| S0028L02 | 有用的 | 役に立つ | の | HIGH |
| S0029L01 | 期待 | 楽しみにしている | 良い | HIGH |
| S0029L02 | 更好 | もっと上手に | 楽しみにしている | HIGH |
| S0036L01 | 打断 | 中断する | 話/物語 | HIGH |
| S0036L02 | 故事 | 話 | 中断する | HIGH |
| S0055L02 | 醒来 | 起きる・目が覚める | よく眠れない | HIGH |
| S0062L01 | 同时 | 同時に | 手伝う | HIGH |
| S0069L01 | 照顾 | 世話をする | 全部の/丸ごと | HIGH |
| S0071L01 | 任何人 | 誰でも・誰にも | 〜させる | HIGH |
| S0071L02 | 听到 | 聴く・聞こえる | 誰にも | HIGH |
| S0071L03 | 真相 | 本当のこと・真相 | 聞こえる | HIGH |
| S0073L02 | 非常感谢 | ありがとう | ある/持っている | HIGH |
| S0089L03 | 内 | 短 | 以内 | HIGH |
| S0101L02 | 门 | この | 〜の（言語の量詞） | HIGH |
| S0131L01 | 子 | 頭の中に | 〜子 | HIGH |
| S0133L01 | 地 | よく知る | 〜に（副詞化） | HIGH |
| S0185L01 | 它们 | それら | 置いておく／残す | HIGH |
| S0195L02 | 钱 | お金 | 〜の上 | HIGH |
| S0196L01 | 最新 | 最新の | 〜したことがある（経験の助詞） | HIGH |
| S0197L02 | 儿子 | 息子 | 〜として働く／〜になる | HIGH |
| S0214L02 | 周末 | 週末 | 〜のように（結果補語マーカー） | HIGH |
| S0217L01 | 两 | 二つ | 飲む | HIGH |
| S0217L02 | 水 | 水 | 二つ・二 | HIGH |
| S0268L01 | 发 | 送る | 前の週・この前の週 | HIGH |
| S0268L02 | 封 | 通（量詞） | 送る・発送する | HIGH |
| S0268L03 | 上周 | この前の週 | 〜通（量詞・手紙） | HIGH |
| S0018L02 | 晚上 | 今晩 | 夜 | LOW |
| S0023L03 | 了 | 〜になった（変化） | 了 | LOW |
| S0027L02 | 花 | 費やす | 時間 | LOW |
| S0073L01 | 非常 | とても | どうもありがとう | LOW |
| S0073L03 | 还有很多要学 | まだ学ぶことがたくさんある | より多く | LOW |
| S0089L01 | 在 | います | 〜で／〜に | LOW |
| S0090L01 | 就 | もう | じゃあ／すぐ | LOW |
| S0140L02 | 给 | 見せ | あげる | LOW |
| S0200L01 | 按时 | 時間通りに | 確実にする | LOW |
| S0200L02 | 确保 | 確保する | 時間通りに | LOW |
| S0204L01 | 安排 | 手配／準備 | 対処する・処理する | LOW |
| S0204L02 | 处理 | 処理する／対応する | 手配・段取り | LOW |
| S0217L03 | 喝 | 飲む | コップ・杯 | LOW |
| S0224L01 | 刚 | たったいま | 〜したばかり・ちょうど | LOW |

## New false-positive classes the detector should cut

1. **FP-PARAPHRASE, narrative-expansion form**: known_text is a short fragment (a word or clause) and the clip legitimately quotes a *fuller illustrative sentence* built around that fragment, with the same core word/meaning present (e.g. eng_for_zho S0227L01: known="东西"/"something", clip="那个男人打算告诉我一些新的东西" — full example sentence containing 东西). This was the majority FP class in eng_for_zho, zho_for_eng, zho_for_jpn (148 of 157 total FPs). Detector heuristic: if the clip's quoted slot *contains* known_text as a substring, or shares ≥1 full content word with it and the extra material only adds grammatical scaffolding (pronoun, aspect marker, modal), auto-suppress.
2. **FP-EQUIV, inflection/register variant**: same lemma, different form (e.g. zho_for_jpn 驚いている/驚く "surprised"/"be surprised", 感謝しています/感謝する). 9 confirmed. Detector heuristic: normalize verb/adjective stems before diffing for Japanese-known courses.
3. **Known_text-language anomaly** (see above) is NOT a paraphrase false positive — it's a different defect class entirely (wrong-language known_text) that happens to score as "clip matches" in a naive check. Worth a dedicated detector, not a suppression rule.

## Methodology

Extraction: per-course clip templates differ (「」 quotes for X_for_zho and zho_for_jpn's first pattern, 'single quotes' for zho_for_eng, a bare-headword-before-を中国語で言うと form for zho_for_jpn's second pattern) — built and validated a regex per template, 0 failed extractions across all 363 rows.

Triage: computed known_text-vs-clip-headword string overlap (exact / contains / partial-char / disjoint) as a first pass, then read every one of the 363 rows by hand (known_text, target_text, clip headword together) to assign REAL/FP and severity — this was NOT a sample, all 363 were read. The overlap bucket correlated strongly with the final call (disjoint ≈ real, contains/partial ≈ paraphrase) but was overridden by hand wherever the semantics disagreed with the string heuristic (e.g. 那样/像 "so"/"like" are near-synonyms despite zero character overlap → REAL-LOW not HIGH; 我们/我们有 differ by one character embedding pattern but are clean paraphrases).

Additionally ran a second DB pass cross-checking every clip headword against every OTHER LEGO's known_text in the same course, to find exact matches proving cross-lego link corruption (34 found, described above).

## Gaps — could not check

- Did not listen to any audio; all "clip says" values come from `course_audio.text`, not a manual transcription check against `word_boundaries`. For the ~170 REAL rows without a provable source-LEGO match, I could not confirm whether the clip text is TTS-script drift (script edited, audio never regenerated) versus a genuine cross-course/cross-table linkage corruption — both would produce this symptom identically from the DB fields available.
- Did not trace *why* the 34 proven cross-lego links happened (no batch/migration log was in scope) — flagging the mechanism, not the root-cause commit.
- Severity (HIGH/LOW) calls on near-synonym Chinese/Japanese pairs (e.g. 那样/像, 达到/做到) are my own native-level-adjacent linguistic judgment, not a second reviewer's; a native speaker sanity pass on the ~47 LOW rows would firm these up.
