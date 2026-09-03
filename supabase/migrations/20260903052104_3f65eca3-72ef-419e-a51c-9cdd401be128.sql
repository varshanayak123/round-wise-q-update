CREATE TABLE public.teams (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  team_name TEXT NOT NULL,
  group_name TEXT NOT NULL,
  bracket SMALLINT NOT NULL DEFAULT 1,
  position INTEGER NOT NULL DEFAULT 0,
  round_1_score INTEGER,
  round_2_score INTEGER,
  round_3_score INTEGER,
  round_1_correct INTEGER NOT NULL DEFAULT 0,
  round_2_correct INTEGER NOT NULL DEFAULT 0,
  round_3_correct INTEGER NOT NULL DEFAULT 0,
  round_1_time NUMERIC NOT NULL DEFAULT 0,
  round_2_time NUMERIC NOT NULL DEFAULT 0,
  round_3_time NUMERIC NOT NULL DEFAULT 0,
  total_score INTEGER NOT NULL DEFAULT 0,
  current_round SMALLINT NOT NULL DEFAULT 1,
  qualified_for_final BOOLEAN NOT NULL DEFAULT false,
  qualified_from_round SMALLINT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.teams TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.teams TO authenticated;
GRANT ALL ON public.teams TO service_role;

ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view teams" ON public.teams FOR SELECT USING (true);
CREATE POLICY "Anyone can add teams" ON public.teams FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update teams" ON public.teams FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Anyone can delete teams" ON public.teams FOR DELETE USING (true);

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER teams_set_updated_at
BEFORE UPDATE ON public.teams
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE OR REPLACE FUNCTION public.recalculate_qualification()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  w1 UUID;
  w2 UUID;
BEGIN
  IF EXISTS (SELECT 1 FROM public.teams WHERE bracket = 1)
     AND NOT EXISTS (SELECT 1 FROM public.teams WHERE bracket = 1 AND round_1_score IS NULL) THEN
    SELECT id INTO w1 FROM public.teams WHERE bracket = 1
      ORDER BY round_1_score DESC, round_1_correct DESC, round_1_time ASC, created_at ASC LIMIT 1;
  END IF;

  IF EXISTS (SELECT 1 FROM public.teams WHERE bracket = 2)
     AND NOT EXISTS (SELECT 1 FROM public.teams WHERE bracket = 2 AND round_2_score IS NULL) THEN
    SELECT id INTO w2 FROM public.teams WHERE bracket = 2
      ORDER BY round_2_score DESC, round_2_correct DESC, round_2_time ASC, created_at ASC LIMIT 1;
  END IF;

  UPDATE public.teams
     SET qualified_for_final = (id = w1 OR id = w2),
         qualified_from_round = CASE WHEN id = w1 THEN 1 WHEN id = w2 THEN 2 ELSE NULL END
   WHERE qualified_for_final IS DISTINCT FROM (id = w1 OR id = w2)
      OR qualified_from_round IS DISTINCT FROM (CASE WHEN id = w1 THEN 1 WHEN id = w2 THEN 2 ELSE NULL END);
END;
$$;

GRANT EXECUTE ON FUNCTION public.recalculate_qualification() TO anon, authenticated, service_role;

ALTER PUBLICATION supabase_realtime ADD TABLE public.teams;
ALTER TABLE public.teams REPLICA IDENTITY FULL;