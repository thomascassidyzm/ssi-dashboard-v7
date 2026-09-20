-- 20260920_pod_one_text_per_target_language.sql
--
-- Tom's ruling, 2026-09-20 16:34Z, verbatim: "All courses will be exactly the same
-- for the language. Sorry, all pods will be exactly the same for the language. It's
-- completely unacceptable to have lots of different versions of the language."
--
-- And his refinement eight minutes later, which is the MODEL this file implements:
-- "The canonical already is there as a canonical course. It just happens to be
-- expressed in English."
--
-- So: there is ONE canonical 231-sentence story — canonical_pod_scenarios, pod_slug
-- 'pod-1', variant_key NULL, expressed in English — and ONE translation of it per
-- TARGET LANGUAGE. Every course teaching that language serves that one translation.
-- known_text stays per course, because the learner's own language legitimately differs.
--
-- WHY A TRIGGER AND NOT FOUR JS SURFACES. The store was keyed by course_code at every
-- layer (listening_pods.course_code, the serving_pod view, every player and API read
-- path), so nothing PREVENTED the next translation run, regen or hand-edit from forking
-- a language again — which is Tom's actual complaint: not that the texts differ today,
-- but that they have been free to for four weeks. A rule guarded at one door is not
-- guarded (tools/pods/serving-slug.cjs says this at length and job #91/#93 are the
-- history). The one layer every caller shares — Popty tools, the learning app, the
-- booth router, a psql session, a Supabase client — is the database.
--
-- THE LANGUAGE KEY is split_part(course_code,'_for_',1), the same key
-- targetLangFromCourseCode() in services/voice-engine/voice-slots.cjs and
-- poolKeysForCourse() in tools/pod-sync.cjs already use. It carries regional variants
-- as DISTINCT languages on purpose: ara / ara_eg / ara_sy, fra / fra_ca, spa / spa_mx
-- (Mexican Spanish is its own language), por / por_br, deu / deu_at, and cym_n / cym_s,
-- which must never be collapsed.
--
-- OPT-IN, BY POD. listening_pods.canonical_lang_text marks a pod as BOUND to the
-- language canon. Legacy 142-line pod-1 slates are a different, older story and stay
-- unbound and untouched; binding one is refused unless its text already matches the
-- canon line for line, so binding can never silently rewrite a learner's pod.
--
-- PROPAGATION, NOT REFUSAL, for an edit to a bound pod. An artist correcting a French
-- line in the booth is correcting FRENCH, not fra_for_eng, so the edit moves the canon
-- row and every other bound pod of that language inside the same transaction. That is
-- the positive form of the ruling, and it is what keeps the existing booth path
-- (recordist-router PATCH /voice/:voiceId/line/:lineId/text) working unchanged. It sits
-- on Tom's own 2026-09-12 exemption: a booth text correction does not make the slot a
-- new sentence and does not drop learner progress.
--
-- Rollback: database/changes/20260920_pod_one_text_per_target_language.ROLLBACK.sql

-- ── 1. ONE TRANSLATION PER LANGUAGE OF THE CANONICAL STORY ──────────────────────
CREATE TABLE IF NOT EXISTS public.canonical_pod_target_text (
  -- The canonical STORY's slug (canonical_pod_scenarios.pod_slug), not a course pod's
  -- slug: 'pod-1' the staged slate and 'pod-1' the live one are the same story and
  -- therefore share one row.
  pod_slug        text    NOT NULL,
  target_lang     text    NOT NULL,
  global_order    integer NOT NULL,
  -- Which canonical English line this is a translation OF, answerable by lookup rather
  -- than by position alone (Tom's refinement, 2026-09-20).
  canonical_id    text    NOT NULL REFERENCES public.canonical_pod_scenarios(id) ON DELETE RESTRICT,
  target_text     text    NOT NULL,
  -- Carried from the adopted course rows. A drafted canon line is still unread text and
  -- must not render; the draft flag travels with the words rather than with the course.
  target_text_draft boolean NOT NULL DEFAULT false,
  -- Provenance only. The course whose copy was adopted as this language's translation.
  -- Never a key, never consulted by any rule.
  adopted_from    text,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (pod_slug, target_lang, global_order),
  UNIQUE (pod_slug, target_lang, canonical_id)
);

COMMENT ON TABLE public.canonical_pod_target_text IS
  'One translation of the canonical pod story per TARGET LANGUAGE (Tom, 2026-09-20: all pods '
  'will be exactly the same for the language). Keyed by split_part(course_code,''_for_'',1), '
  'which carries regional variants as distinct languages. known_text is NOT here: it is '
  'legitimately per course.';

ALTER TABLE public.canonical_pod_target_text ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON public.canonical_pod_target_text TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.canonical_pod_target_text TO service_role;
DROP POLICY IF EXISTS canonical_pod_target_text_read ON public.canonical_pod_target_text;
CREATE POLICY canonical_pod_target_text_read ON public.canonical_pod_target_text FOR SELECT USING (true);

DROP TRIGGER IF EXISTS trg_touch_canonical_pod_target_text ON public.canonical_pod_target_text;
CREATE TRIGGER trg_touch_canonical_pod_target_text
  BEFORE UPDATE ON public.canonical_pod_target_text
  FOR EACH ROW EXECUTE FUNCTION public.touch_canonical_pod_scenarios();

-- ── 2. WHICH PODS ARE BOUND TO IT ───────────────────────────────────────────────
ALTER TABLE public.listening_pods
  ADD COLUMN IF NOT EXISTS canonical_lang_text boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.listening_pods.canonical_lang_text IS
  'This pod''s target text IS its language''s canonical translation (canonical_pod_target_text). '
  'Bound pods of one target language can no longer diverge: an edit to any of them moves the '
  'canon row and all the others in the same transaction. Binding is refused unless the pod '
  'already matches line for line. Tom, 2026-09-20.';

-- ── 3. THE RULE, AT THE LAYER EVERY CALLER SHARES ───────────────────────────────
CREATE OR REPLACE FUNCTION public.pod_sentence_one_text_per_language()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_bound boolean;
  v_lang  text;
  v_canon text;
  v_moved integer;
BEGIN
  SELECT p.canonical_lang_text, split_part(p.course_code, '_for_', 1)
    INTO v_bound, v_lang
    FROM public.listening_pods p
   WHERE p.id = NEW.pod_id;

  IF NOT coalesce(v_bound, false) THEN
    RETURN NEW;                       -- legacy / topic pods are not bound to a canon
  END IF;

  -- Depth > 1 means WE are the propagation, cascading out of this same function.
  -- The outer invocation has already moved the canon; the inner ones just take it.
  IF pg_trigger_depth() > 1 THEN
    RETURN NEW;
  END IF;

  SELECT c.target_text INTO v_canon
    FROM public.canonical_pod_target_text c
   WHERE c.pod_slug = 'pod-1'
     AND c.target_lang = v_lang
     AND c.global_order = NEW.global_order;

  IF v_canon IS NULL THEN
    RAISE EXCEPTION
      'listening_pod_sentences %: pod % is bound to the % pod canon, which has no line at global_order % — add the line to canonical_pod_target_text (and canonical_pod_scenarios) first, or unbind the pod (Tom, 2026-09-20: one pod text per target language)',
      NEW.id, NEW.pod_id, v_lang, NEW.global_order
      USING ERRCODE = 'check_violation';
  END IF;

  IF NEW.target_text IS NOT DISTINCT FROM v_canon THEN
    RETURN NEW;                       -- agrees with the language; nothing to do
  END IF;

  -- The LANGUAGE's words moved. Move them everywhere, in this transaction, so that
  -- no moment exists in which two courses of one language hold different text.
  UPDATE public.canonical_pod_target_text
     SET target_text = NEW.target_text, updated_at = now()
   WHERE pod_slug = 'pod-1' AND target_lang = v_lang AND global_order = NEW.global_order;

  UPDATE public.listening_pod_sentences s
     SET target_text = NEW.target_text
    FROM public.listening_pods p
   WHERE s.pod_id = p.id
     AND p.canonical_lang_text
     AND split_part(p.course_code, '_for_', 1) = v_lang
     AND s.global_order = NEW.global_order
     AND s.id IS DISTINCT FROM NEW.id
     AND s.target_text IS DISTINCT FROM NEW.target_text;
  GET DIAGNOSTICS v_moved = ROW_COUNT;

  RAISE NOTICE 'pod text for % line % moved with this edit: canon + % sibling row(s)', v_lang, NEW.global_order, v_moved;
  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.pod_sentence_one_text_per_language() IS
  'BEFORE INSERT/UPDATE on listening_pod_sentences.target_text: a pod bound to its language canon '
  'cannot hold text that differs from every other bound pod of that language — an edit propagates '
  'to the canon row and to the siblings in the same transaction. Tom, 2026-09-20.';

DROP TRIGGER IF EXISTS listening_pod_sentences_one_text_per_language ON public.listening_pod_sentences;
CREATE TRIGGER listening_pod_sentences_one_text_per_language
  BEFORE INSERT OR UPDATE OF target_text ON public.listening_pod_sentences
  FOR EACH ROW
  EXECUTE FUNCTION public.pod_sentence_one_text_per_language();

-- ── 4. BINDING IS A CLAIM, AND THE CLAIM IS CHECKED ─────────────────────────────
-- Make-before-break in the small: a pod only becomes the language's canon by ALREADY
-- being it. Otherwise binding would be an in-place rewrite of somebody's live pod
-- disguised as a boolean.
CREATE OR REPLACE FUNCTION public.refuse_unmatched_canonical_lang_binding()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_lang text := split_part(NEW.course_code, '_for_', 1);
  v_rows integer;
  v_canon integer;
  v_diff integer;
BEGIN
  IF NOT NEW.canonical_lang_text OR coalesce(OLD.canonical_lang_text, false) THEN
    RETURN NEW;
  END IF;

  SELECT count(*) INTO v_rows FROM public.listening_pod_sentences s WHERE s.pod_id = NEW.id;
  SELECT count(*) INTO v_canon FROM public.canonical_pod_target_text c
    WHERE c.pod_slug = 'pod-1' AND c.target_lang = v_lang;

  IF v_canon = 0 THEN
    RAISE EXCEPTION 'listening_pods %: there is no canonical % pod text to bind to — write canonical_pod_target_text for % first (Tom, 2026-09-20)', NEW.id, v_lang, v_lang
      USING ERRCODE = 'check_violation';
  END IF;
  IF v_rows <> v_canon THEN
    RAISE EXCEPTION 'listening_pods %: cannot bind to the % pod canon — the pod has % line(s) and the canon has % (Tom, 2026-09-20)', NEW.id, v_lang, v_rows, v_canon
      USING ERRCODE = 'check_violation';
  END IF;

  SELECT count(*) INTO v_diff
    FROM public.listening_pod_sentences s
    LEFT JOIN public.canonical_pod_target_text c
      ON c.pod_slug = 'pod-1' AND c.target_lang = v_lang AND c.global_order = s.global_order
   WHERE s.pod_id = NEW.id
     AND s.target_text IS DISTINCT FROM c.target_text;

  IF v_diff > 0 THEN
    RAISE EXCEPTION 'listening_pods %: cannot bind to the % pod canon — % line(s) differ from it; binding never rewrites a pod, so make it match first (Tom, 2026-09-20)', NEW.id, v_lang, v_diff
      USING ERRCODE = 'check_violation';
  END IF;

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.refuse_unmatched_canonical_lang_binding() IS
  'BEFORE UPDATE on listening_pods.canonical_lang_text: binding a pod to its language canon is '
  'refused unless it already matches, line for line. Tom, 2026-09-20.';

DROP TRIGGER IF EXISTS listening_pods_canonical_lang_binding ON public.listening_pods;
CREATE TRIGGER listening_pods_canonical_lang_binding
  BEFORE UPDATE OF canonical_lang_text ON public.listening_pods
  FOR EACH ROW
  EXECUTE FUNCTION public.refuse_unmatched_canonical_lang_binding();

-- ── 5. THE PROOF, AS A VIEW ANYONE CAN READ ─────────────────────────────────────
-- "Exactly one canonical target text per target language, and every course of that
-- language resolving to it." One row per (language, line) that disagrees; empty is the
-- whole point, and a non-empty row names the course that forked.
CREATE OR REPLACE VIEW public.pod_text_divergence AS
SELECT split_part(p.course_code, '_for_', 1) AS target_lang,
       s.global_order,
       count(DISTINCT s.target_text)          AS distinct_texts,
       array_agg(DISTINCT p.course_code ORDER BY p.course_code) AS courses
  FROM public.listening_pods p
  JOIN public.listening_pod_sentences s ON s.pod_id = p.id
 WHERE p.canonical_lang_text
   AND p.course_code NOT LIKE 'zzz%'
 GROUP BY 1, 2
HAVING count(DISTINCT s.target_text) > 1;

COMMENT ON VIEW public.pod_text_divergence IS
  'Bound pods of one target language holding different words for the same canonical line. '
  'Empty by construction since 2026-09-20; a row here means a guard has been removed.';

GRANT SELECT ON public.pod_text_divergence TO anon, authenticated, service_role;
