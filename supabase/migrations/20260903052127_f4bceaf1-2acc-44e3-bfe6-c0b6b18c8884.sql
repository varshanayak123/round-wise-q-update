CREATE OR REPLACE FUNCTION public.recalculate_qualification()
RETURNS void
LANGUAGE plpgsql
SECURITY INVOKER
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