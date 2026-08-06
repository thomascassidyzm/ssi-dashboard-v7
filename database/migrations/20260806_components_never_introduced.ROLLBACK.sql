-- Rollback for 20260806_components_never_introduced.sql
-- Removes the refusal trigger. No data is touched by either direction.
DROP TRIGGER IF EXISTS components_never_introduced ON course_practice_phrases;
DROP FUNCTION IF EXISTS refuse_component_introduction();
