CREATE TABLE public.question_state (
  round smallint NOT NULL,
  question_index integer NOT NULL,
  status text NOT NULL DEFAULT 'active',
  started_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  winner_team_id uuid REFERENCES public.teams(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (round, question_index)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.question_state TO anon, authenticated;
GRANT ALL ON public.question_state TO service_role;
ALTER TABLE public.question_state ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view question state" ON public.question_state FOR SELECT USING (true);
CREATE POLICY "Anyone can insert question state" ON public.question_state FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update question state" ON public.question_state FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Anyone can delete question state" ON public.question_state FOR DELETE USING (true);

CREATE TRIGGER question_state_set_updated_at BEFORE UPDATE ON public.question_state
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.answers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id uuid NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  round smallint NOT NULL,
  question_index integer NOT NULL,
  selected_answer integer NOT NULL,
  is_correct boolean NOT NULL,
  points_awarded integer NOT NULL,
  answer_order integer NOT NULL,
  submitted_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (round, question_index, team_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.answers TO anon, authenticated;
GRANT ALL ON public.answers TO service_role;
ALTER TABLE public.answers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view answers" ON public.answers FOR SELECT USING (true);
CREATE POLICY "Anyone can insert answers" ON public.answers FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update answers" ON public.answers FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Anyone can delete answers" ON public.answers FOR DELETE USING (true);

CREATE TRIGGER answers_set_updated_at BEFORE UPDATE ON public.answers
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX answers_round_question_idx ON public.answers (round, question_index, answer_order);

-- Recompute a team's round score/correct/time from the shared answers table
CREATE OR REPLACE FUNCTION public.refresh_team_round_score(_team_id uuid, _round smallint)
RETURNS void
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  pts integer;
  cor integer;
BEGIN
  SELECT COALESCE(SUM(points_awarded), 0), COALESCE(SUM(CASE WHEN is_correct THEN 1 ELSE 0 END), 0)
    INTO pts, cor
    FROM public.answers WHERE team_id = _team_id AND round = _round;

  IF _round = 1 THEN
    UPDATE public.teams SET round_1_score = pts, round_1_correct = cor WHERE id = _team_id;
  ELSIF _round = 2 THEN
    UPDATE public.teams SET round_2_score = pts, round_2_correct = cor WHERE id = _team_id;
  ELSE
    UPDATE public.teams SET round_3_score = pts, round_3_correct = cor WHERE id = _team_id;
  END IF;

  UPDATE public.teams
     SET total_score = COALESCE(round_1_score, 0) + COALESCE(round_2_score, 0) + COALESCE(round_3_score, 0),
         current_round = _round
   WHERE id = _team_id;
END;
$$;

-- Authoritative fastest-finger-first submission
CREATE OR REPLACE FUNCTION public.submit_answer(
  _team_id uuid,
  _round smallint,
  _question_index integer,
  _selected integer,
  _correct_index integer
)
RETURNS jsonb
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  st public.question_state%ROWTYPE;
  ord integer;
  correct boolean;
  pts integer;
  answered integer;
  participants integer;
BEGIN
  INSERT INTO public.question_state (round, question_index)
  VALUES (_round, _question_index)
  ON CONFLICT (round, question_index) DO NOTHING;

  SELECT * INTO st FROM public.question_state
   WHERE round = _round AND question_index = _question_index FOR UPDATE;

  IF st.status <> 'active' THEN
    RETURN jsonb_build_object('accepted', false, 'reason', 'completed');
  END IF;

  IF EXISTS (SELECT 1 FROM public.answers
              WHERE round = _round AND question_index = _question_index AND team_id = _team_id) THEN
    RETURN jsonb_build_object('accepted', false, 'reason', 'already_answered');
  END IF;

  SELECT COALESCE(MAX(answer_order), 0) + 1 INTO ord FROM public.answers
   WHERE round = _round AND question_index = _question_index;

  correct := (_selected = _correct_index);
  pts := CASE WHEN correct THEN 5 ELSE -3 END;

  INSERT INTO public.answers (team_id, round, question_index, selected_answer, is_correct, points_awarded, answer_order)
  VALUES (_team_id, _round, _question_index, _selected, correct, pts, ord);

  PERFORM public.refresh_team_round_score(_team_id, _round);

  IF correct THEN
    UPDATE public.question_state
       SET status = 'completed', completed_at = now(), winner_team_id = _team_id
     WHERE round = _round AND question_index = _question_index;
  ELSE
    SELECT COUNT(*) INTO answered FROM public.answers
     WHERE round = _round AND question_index = _question_index;
    SELECT COUNT(*) INTO participants FROM public.teams
     WHERE CASE WHEN _round = 3 THEN qualified_for_final ELSE bracket = _round END;
    IF participants > 0 AND answered >= participants THEN
      UPDATE public.question_state
         SET status = 'completed', completed_at = now()
       WHERE round = _round AND question_index = _question_index;
    END IF;
  END IF;

  RETURN jsonb_build_object('accepted', true, 'is_correct', correct, 'points', pts, 'answer_order', ord);
END;
$$;

-- Close a question (timeout / host advance)
CREATE OR REPLACE FUNCTION public.complete_question(_round smallint, _question_index integer)
RETURNS void
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.question_state (round, question_index, status, completed_at)
  VALUES (_round, _question_index, 'completed', now())
  ON CONFLICT (round, question_index)
  DO UPDATE SET status = 'completed', completed_at = COALESCE(public.question_state.completed_at, now());
END;
$$;

-- Start (or restart the clock on) a question
CREATE OR REPLACE FUNCTION public.start_question(_round smallint, _question_index integer)
RETURNS void
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.question_state (round, question_index, status, started_at)
  VALUES (_round, _question_index, 'active', now())
  ON CONFLICT (round, question_index) DO NOTHING;
END;
$$;

-- Finalise a round: zero-fill teams that never scored, then recompute finalists
CREATE OR REPLACE FUNCTION public.finalize_round(_round smallint)
RETURNS void
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF _round = 1 THEN
    UPDATE public.teams SET round_1_score = COALESCE(round_1_score, 0) WHERE bracket = 1;
  ELSIF _round = 2 THEN
    UPDATE public.teams SET round_2_score = COALESCE(round_2_score, 0) WHERE bracket = 2;
  ELSE
    UPDATE public.teams SET round_3_score = COALESCE(round_3_score, 0) WHERE qualified_for_final;
  END IF;

  UPDATE public.teams
     SET total_score = COALESCE(round_1_score, 0) + COALESCE(round_2_score, 0) + COALESCE(round_3_score, 0);

  PERFORM public.recalculate_qualification();
END;
$$;

ALTER PUBLICATION supabase_realtime ADD TABLE public.answers;
ALTER PUBLICATION supabase_realtime ADD TABLE public.question_state;
ALTER TABLE public.answers REPLICA IDENTITY FULL;
ALTER TABLE public.question_state REPLICA IDENTITY FULL;