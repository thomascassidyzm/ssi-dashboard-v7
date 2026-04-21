-- Localize course display names: show in the learner's known language
-- e.g. a Spanish speaker sees "Inglés para hispanohablantes", not "English for Spanish Speakers"

UPDATE courses SET display_name = CASE course_code

  -- Fix broken name
  WHEN 'ron_for_eng' THEN 'Romanian for English Speakers'

  -- Spanish speakers (known: spa)
  WHEN 'eng_for_spa' THEN 'Inglés para hispanohablantes'
  WHEN 'cat_for_spa' THEN 'Catalán para hispanohablantes'
  WHEN 'eus_for_spa' THEN 'Euskera para hispanohablantes'

  -- French speakers (known: fra)
  WHEN 'eng_for_fra' THEN 'Anglais pour francophones'
  WHEN 'bre_for_fra' THEN 'Breton pour francophones'

  -- German speakers (known: deu)
  WHEN 'eng_for_deu' THEN 'Englisch für Deutschsprachige'

  -- Italian speakers (known: ita)
  WHEN 'eng_for_ita' THEN 'Inglese per italofoni'

  -- Portuguese speakers (known: por)
  WHEN 'eng_for_por' THEN 'Inglês para lusófonos'

  -- Arabic speakers (known: ara)
  WHEN 'eng_for_ara' THEN 'الإنجليزية للناطقين بالعربية'

  -- Korean speakers (known: kor)
  WHEN 'eng_for_kor' THEN '한국어 사용자를 위한 영어'

  -- Lithuanian speakers (known: lit)
  WHEN 'por_for_lit' THEN 'Portugalų kalba lietuviams'

  -- Japanese speakers (known: jpn)
  WHEN 'eng_for_jpn'        THEN '英語 — 日本語話者向け'
  WHEN 'ara_for_jpn'        THEN 'アラビア語 — 日本語話者向け'
  WHEN 'ara_eg_for_jpn'     THEN 'アラビア語（エジプト） — 日本語話者向け'
  WHEN 'ara_sy_for_jpn'     THEN 'アラビア語（シリア） — 日本語話者向け'
  WHEN 'cym_anthem_for_jpn' THEN 'ウェールズ国歌 — 日本語話者向け'
  WHEN 'deu_for_jpn'        THEN 'ドイツ語 — 日本語話者向け'
  WHEN 'deu_at_for_jpn'     THEN 'ドイツ語（オーストリア） — 日本語話者向け'
  WHEN 'fra_for_jpn'        THEN 'フランス語 — 日本語話者向け'
  WHEN 'ita_for_jpn'        THEN 'イタリア語 — 日本語話者向け'
  WHEN 'kor_for_jpn'        THEN '韓国語 — 日本語話者向け'
  WHEN 'por_br_for_jpn'     THEN 'ポルトガル語（ブラジル） — 日本語話者向け'
  WHEN 'por_for_jpn'        THEN 'ポルトガル語（ポルトガル） — 日本語話者向け'
  WHEN 'spa_for_jpn'        THEN 'スペイン語（スペイン） — 日本語話者向け'
  WHEN 'spa_mx_for_jpn'     THEN 'スペイン語（メキシコ） — 日本語話者向け'
  WHEN 'zho_for_jpn'        THEN '中国語 — 日本語話者向け'

  -- Chinese speakers (known: zho)
  WHEN 'eng_for_zho'        THEN '英语 — 面向中文使用者'
  WHEN 'ara_for_zho'        THEN '阿拉伯语 — 面向中文使用者'
  WHEN 'ara_eg_for_zho'     THEN '阿拉伯语（埃及） — 面向中文使用者'
  WHEN 'ara_sy_for_zho'     THEN '阿拉伯语（叙利亚） — 面向中文使用者'
  WHEN 'deu_for_zho'        THEN '德语 — 面向中文使用者'
  WHEN 'deu_at_for_zho'     THEN '德语（奥地利） — 面向中文使用者'
  WHEN 'fra_for_zho'        THEN '法语 — 面向中文使用者'
  WHEN 'ita_for_zho'        THEN '意大利语 — 面向中文使用者'
  WHEN 'jpn_for_zho'        THEN '日语 — 面向中文使用者'
  WHEN 'kor_for_zho'        THEN '韩语 — 面向中文使用者'
  WHEN 'por_br_for_zho'     THEN '葡萄牙语（巴西） — 面向中文使用者'
  WHEN 'por_for_zho'        THEN '葡萄牙语（葡萄牙） — 面向中文使用者'
  WHEN 'spa_for_zho'        THEN '西班牙语（西班牙） — 面向中文使用者'
  WHEN 'spa_mx_for_zho'     THEN '西班牙语（墨西哥） — 面向中文使用者'

  ELSE display_name
END
WHERE known_lang != 'eng'
   OR course_code = 'ron_for_eng';
