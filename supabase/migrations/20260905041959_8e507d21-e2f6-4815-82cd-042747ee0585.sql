CREATE TABLE public.game_state (
  id text PRIMARY KEY DEFAULT 'main',
  current_round smallint NOT NULL DEFAULT 1,
  current_question integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'idle',
  question_started_at timestamptz,
  question_ends_at timestamptz,
  paused_at timestamptz,
  state_version bigint NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.game_state TO anon, authenticated;
GRANT ALL ON public.game_state TO service_role;
ALTER TABLE public.game_state ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view game state" ON public.game_state FOR SELECT USING (true);
CREATE POLICY "Anyone can insert game state" ON public.game_state FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update game state" ON public.game_state FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Anyone can delete game state" ON public.game_state FOR DELETE USING (true);

CREATE TRIGGER game_state_set_updated_at BEFORE UPDATE ON public.game_state
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

INSERT INTO public.game_state (id) VALUES ('main') ON CONFLICT DO NOTHING;

CREATE TABLE public.question_keys (
  round smallint NOT NULL,
  question_index integer NOT NULL,
  correct_index integer NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (round, question_index)
);

GRANT SELECT ON public.question_keys TO anon, authenticated;
GRANT ALL ON public.question_keys TO service_role;
ALTER TABLE public.question_keys ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view question keys" ON public.question_keys FOR SELECT USING (true);

INSERT INTO public.question_keys (round, question_index, correct_index) VALUES
(1,0,1),(1,1,0),(1,2,2),(1,3,1),(1,4,1),(1,5,1),(1,6,1),(1,7,2),(1,8,2),(1,9,2),(1,10,2),(1,11,1),(1,12,2),(1,13,1),(1,14,1),
(2,0,1),(2,1,2),(2,2,1),(2,3,1),(2,4,0),(2,5,1),(2,6,2),(2,7,1),(2,8,2),(2,9,1),(2,10,2),(2,11,1),(2,12,1),(2,13,2),(2,14,2),
(3,0,2),(3,1,2),(3,2,1),(3,3,1),(3,4,1),(3,5,2),(3,6,2),(3,7,1),(3,8,1),(3,9,2)
ON CONFLICT DO NOTHING;

ALTER PUBLICATION supabase_realtime ADD TABLE public.game_state;

CREATE OR REPLACE FUNCTION public.server_now()
RETURNS timestamptz LANGUAGE sql STABLE SET search_path TO 'public' AS $$ SELECT now() $$;

CREATE OR REPLACE FUNCTION public.admin_start_question(_round smallint, _question_index integer, _seconds integer DEFAULT 30)
RETURNS public.game_state LANGUAGE plpgsql SET search_path TO 'public' AS $$
DECLARE gs public.game_state%ROWTYPE;
BEGIN
  PERFORM public.start_question(_round, _question_index);
  UPDATE public.question_state
     SET status = 'active', completed_at = NULL, winner_team_id = NULL, started_at = now()
   WHERE round = _round AND question_index = _question_index;

  UPDATE public.game_state
     SET current_round = _round,
         current_question = _question_index,
         status = 'active',
         question_started_at = now(),
         question_ends_at = now() + make_interval(secs => GREATEST(_seconds, 1)),
         paused_at = NULL,
         state_version = state_version + 1
   WHERE id = 'main'
  RETURNING * INTO gs;
  RETURN gs;
END; $$;

CREATE OR REPLACE FUNCTION public.admin_pause()
RETURNS public.game_state LANGUAGE plpgsql SET search_path TO 'public' AS $$
DECLARE gs public.game_state%ROWTYPE;
BEGIN
  UPDATE public.game_state
     SET status = 'paused', paused_at = now(), state_version = state_version + 1
   WHERE id = 'main' AND status = 'active'
  RETURNING * INTO gs;
  IF NOT FOUND THEN SELECT * INTO gs FROM public.game_state WHERE id = 'main'; END IF;
  RETURN gs;
END; $$;

CREATE OR REPLACE FUNCTION public.admin_resume()
RETURNS public.game_state LANGUAGE plpgsql SET search_path TO 'public' AS $$
DECLARE gs public.game_state%ROWTYPE;
BEGIN
  UPDATE public.game_state
     SET status = 'active',
         question_ends_at = question_ends_at + (now() - COALESCE(paused_at, now())),
         paused_at = NULL,
         state_version = state_version + 1
   WHERE id = 'main' AND status = 'paused'
  RETURNING * INTO gs;
  IF NOT FOUND THEN SELECT * INTO gs FROM public.game_state WHERE id = 'main'; END IF;
  RETURN gs;
END; $$;

CREATE OR REPLACE FUNCTION public.admin_end_question()
RETURNS public.game_state LANGUAGE plpgsql SET search_path TO 'public' AS $$
DECLARE gs public.game_state%ROWTYPE;
BEGIN
  SELECT * INTO gs FROM public.game_state WHERE id = 'main';
  IF gs.id IS NULL THEN RETURN gs; END IF;
  PERFORM public.complete_question(gs.current_round, gs.current_question);
  UPDATE public.game_state
     SET status = 'ended', paused_at = NULL, question_ends_at = LEAST(question_ends_at, now()),
         state_version = state_version + 1
   WHERE id = 'main'
  RETURNING * INTO gs;
  RETURN gs;
END; $$;

CREATE OR REPLACE FUNCTION public.admin_set_round(_round smallint)
RETURNS public.game_state LANGUAGE plpgsql SET search_path TO 'public' AS $$
DECLARE gs public.game_state%ROWTYPE;
BEGIN
  UPDATE public.game_state
     SET current_round = _round, current_question = 0, status = 'idle',
         question_started_at = NULL, question_ends_at = NULL, paused_at = NULL,
         state_version = state_version + 1
   WHERE id = 'main'
  RETURNING * INTO gs;
  RETURN gs;
END; $$;

CREATE OR REPLACE FUNCTION public.submit_live_answer(_team_id uuid, _selected integer)
RETURNS jsonb LANGUAGE plpgsql SET search_path TO 'public' AS $$
DECLARE
  gs public.game_state%ROWTYPE;
  key integer;
  ord integer;
  correct boolean;
  pts integer;
  answered integer;
  participants integer;
  elapsed numeric;
BEGIN
  SELECT * INTO gs FROM public.game_state WHERE id = 'main';
  IF gs.id IS NULL OR gs.status <> 'active' THEN
    RETURN jsonb_build_object('accepted', false, 'reason', 'not_active');
  END IF;
  IF gs.question_ends_at IS NOT NULL AND now() > gs.question_ends_at THEN
    RETURN jsonb_build_object('accepted', false, 'reason', 'time_up');
  END IF;

  SELECT correct_index INTO key FROM public.question_keys
   WHERE round = gs.current_round AND question_index = gs.current_question;
  IF key IS NULL THEN
    RETURN jsonb_build_object('accepted', false, 'reason', 'no_question');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.question_state
                  WHERE round = gs.current_round AND question_index = gs.current_question
                    AND status = 'active') THEN
    RETURN jsonb_build_object('accepted', false, 'reason', 'completed');
  END IF;

  IF EXISTS (SELECT 1 FROM public.answers
              WHERE round = gs.current_round AND question_index = gs.current_question
                AND team_id = _team_id) THEN
    RETURN jsonb_build_object('accepted', false, 'reason', 'already_answered');
  END IF;

  SELECT COALESCE(MAX(answer_order), 0) + 1 INTO ord FROM public.answers
   WHERE round = gs.current_round AND question_index = gs.current_question;

  correct := (_selected = key);
  pts := CASE WHEN correct THEN 5 ELSE -3 END;
  elapsed := EXTRACT(EPOCH FROM (now() - COALESCE(gs.question_started_at, now())));

  INSERT INTO public.answers (team_id, round, question_index, selected_answer, is_correct, points_awarded, answer_order)
  VALUES (_team_id, gs.current_round, gs.current_question, _selected, correct, pts, ord);

  PERFORM public.refresh_team_round_score(_team_id, gs.current_round);

  UPDATE public.teams
     SET round_1_time = CASE WHEN gs.current_round = 1 THEN round_1_time + elapsed ELSE round_1_time END,
         round_2_time = CASE WHEN gs.current_round = 2 THEN round_2_time + elapsed ELSE round_2_time END,
         round_3_time = CASE WHEN gs.current_round = 3 THEN round_3_time + elapsed ELSE round_3_time END
   WHERE id = _team_id;

  IF correct THEN
    UPDATE public.question_state
       SET status = 'completed', completed_at = now(), winner_team_id = _team_id
     WHERE round = gs.current_round AND question_index = gs.current_question;
    UPDATE public.game_state SET status = 'ended', state_version = state_version + 1 WHERE id = 'main';
  ELSE
    SELECT COUNT(*) INTO answered FROM public.answers
     WHERE round = gs.current_round AND question_index = gs.current_question;
    SELECT COUNT(*) INTO participants FROM public.teams
     WHERE CASE WHEN gs.current_round = 3 THEN qualified_for_final ELSE bracket = gs.current_round END;
    IF participants > 0 AND answered >= participants THEN
      UPDATE public.question_state
         SET status = 'completed', completed_at = now()
       WHERE round = gs.current_round AND question_index = gs.current_question;
      UPDATE public.game_state SET status = 'ended', state_version = state_version + 1 WHERE id = 'main';
    END IF;
  END IF;

  PERFORM public.recalculate_qualification();

  RETURN jsonb_build_object('accepted', true, 'is_correct', correct, 'points', pts,
                            'answer_order', ord, 'correct_index', key);
END; $$;

CREATE OR REPLACE FUNCTION public.recalculate_qualification()
RETURNS void LANGUAGE plpgsql SET search_path TO 'public' AS $$
DECLARE
  w1 UUID[];
  w2 UUID[];
BEGIN
  IF EXISTS (SELECT 1 FROM public.teams WHERE bracket = 1)
     AND NOT EXISTS (SELECT 1 FROM public.teams WHERE bracket = 1 AND round_1_score IS NULL) THEN
    SELECT array_agg(id) INTO w1 FROM (
      SELECT id FROM public.teams WHERE bracket = 1
       ORDER BY round_1_score DESC, round_1_correct DESC, round_1_time ASC, created_at ASC LIMIT 2
    ) t;
  END IF;

  IF EXISTS (SELECT 1 FROM public.teams WHERE bracket = 2)
     AND NOT EXISTS (SELECT 1 FROM public.teams WHERE bracket = 2 AND round_2_score IS NULL) THEN
    SELECT array_agg(id) INTO w2 FROM (
      SELECT id FROM public.teams WHERE bracket = 2
       ORDER BY round_2_score DESC, round_2_correct DESC, round_2_time ASC, created_at ASC LIMIT 2
    ) t;
  END IF;

  UPDATE public.teams
     SET qualified_for_final = (id = ANY(COALESCE(w1, '{}'::uuid[])) OR id = ANY(COALESCE(w2, '{}'::uuid[]))),
         qualified_from_round = CASE
           WHEN id = ANY(COALESCE(w1, '{}'::uuid[])) THEN 1
           WHEN id = ANY(COALESCE(w2, '{}'::uuid[])) THEN 2
           ELSE NULL END
   WHERE qualified_for_final IS DISTINCT FROM (id = ANY(COALESCE(w1, '{}'::uuid[])) OR id = ANY(COALESCE(w2, '{}'::uuid[])))
      OR qualified_from_round IS DISTINCT FROM (CASE
           WHEN id = ANY(COALESCE(w1, '{}'::uuid[])) THEN 1
           WHEN id = ANY(COALESCE(w2, '{}'::uuid[])) THEN 2
           ELSE NULL END);
END; $$;