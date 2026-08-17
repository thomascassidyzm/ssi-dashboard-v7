-- A-108 register detector: V-forms appearing in PEER scenes (1,4,5,6,22)
-- Peer scenes require T (tu) under Tom's ruling; V there is a candidate defect.
WITH v AS (
  SELECT split_part(pod_id,':',1) AS course, scene_number, speaker, target_text, known_text,
    CASE
      WHEN split_part(pod_id,':',1) ~ '^(spa|cat)' AND target_text ~* '\musted(es)?\M|\mvost[èe]s?\M' THEN 1
      WHEN split_part(pod_id,':',1) ~ '^fra' AND target_text ~ '\mvous\M|\mvotre\M|\mvos\M' THEN 1
      WHEN split_part(pod_id,':',1) ~ '^(deu|nld)' AND (target_text ~ '\mSie\M|\mIhnen\M|\mIhre[nmrs]?\M' OR target_text ~ '\mu\M|\muw\M') THEN 1
      WHEN split_part(pod_id,':',1) ~ '^ita' AND target_text ~ '\mLei\M|\mLe\M|\mLa\M' THEN 1
      WHEN split_part(pod_id,':',1) ~ '^por' AND target_text ~* '\mvoc[êe]\M|\msenhora?\M' THEN 1
      WHEN split_part(pod_id,':',1) ~ '^pol' AND target_text ~ '\mPan\M|\mPani\M|\mPana\M|\mPanu\M|\mPaństw' THEN 1
      WHEN split_part(pod_id,':',1) ~ '^ukr' AND target_text ~ '\mви\M|\mвас\M|\mвам\M|\mваш' THEN 1
      WHEN split_part(pod_id,':',1) ~ '^bul' AND target_text ~ '\mВие\M|\mВи\M|\mВас\M' THEN 1
      WHEN split_part(pod_id,':',1) ~ '^hrv' AND target_text ~ '\mVi\M|\mVas\M|\mVam\M|\mVaš' THEN 1
      WHEN split_part(pod_id,':',1) ~ '^ron' AND target_text ~* '\mdumneavoastr[ăa]\M|\mdumneata\M' THEN 1
      WHEN split_part(pod_id,':',1) ~ '^ell' AND target_text ~ '\mεσείς\M|\mσας\M|\mΕσείς\M' THEN 1
      WHEN split_part(pod_id,':',1) ~ '^tur' AND target_text ~* '\msiz\M|\msiniz\M|\msınız\M' THEN 1
      WHEN split_part(pod_id,':',1) ~ '^(est)' AND target_text ~* '\mteie\M|\mteid\M|\mte\M' THEN 1
      WHEN split_part(pod_id,':',1) ~ '^(lav|lit)' AND target_text ~* '\mj[ūu]s\M|\mjums\M|\mj[ūu]su\M' THEN 1
      WHEN split_part(pod_id,':',1) ~ '^fin' AND target_text ~* '\mte\M|\mteid[äa]n\M|\mteille\M' THEN 1
      WHEN split_part(pod_id,':',1) ~ '^hye' AND target_text ~ 'Դուք|Ձեզ|Ձեր' THEN 1
      WHEN split_part(pod_id,':',1) ~ '^cym' AND target_text ~ '\mchi\M|\mchwi\M' THEN 1
      WHEN split_part(pod_id,':',1) ~ '^gle' AND target_text ~* '\msibh\M|\mbhur\M' THEN 1
      WHEN split_part(pod_id,':',1) ~ '^(hin|nep)' AND target_text ~ 'आप' THEN 1
      WHEN split_part(pod_id,':',1) ~ '^fas' AND target_text ~ 'شما' THEN 1
      WHEN split_part(pod_id,':',1) ~ '^zho' AND target_text ~ '您' THEN 1
      WHEN split_part(pod_id,':',1) ~ '^eus' AND target_text ~* '\mzu\M|\mzuek\M' THEN 1
      ELSE 0 END AS is_v
  FROM listening_pod_sentences WHERE target_text_draft)
SELECT course,
  count(*) FILTER (WHERE is_v=1 AND scene_number IN (1,4,5,6,22)) AS v_in_peer_scene,
  count(*) FILTER (WHERE is_v=1 AND scene_number IN (2,3,7,8,9,10,11,12,13,14)) AS v_in_service_ok,
  count(*) FILTER (WHERE is_v=1 AND scene_number BETWEEN 15 AND 21) AS v_in_practice,
  count(*) AS drafts
FROM v GROUP BY 1 HAVING count(*) FILTER (WHERE is_v=1) > 0 ORDER BY 2 DESC, 1;
