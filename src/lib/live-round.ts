import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type AnswerRow = {
  id: string;
  team_id: string;
  round: number;
  question_index: number;
  selected_answer: number;
  is_correct: boolean;
  points_awarded: number;
  answer_order: number;
  submitted_at: string;
};

export type QuestionStateRow = {
  round: number;
  question_index: number;
  status: string;
  started_at: string;
  completed_at: string | null;
  winner_team_id: string | null;
};

/**
 * Shared, database-backed state for one round of fastest-finger-first play.
 * Supabase is the single source of truth for answer order, locking and scoring.
 */
export function useLiveRound(round: number, questionCount: number) {
  const [answers, setAnswers] = useState<AnswerRow[]>([]);
  const [states, setStates] = useState<QuestionStateRow[]>([]);
  const [ready, setReady] = useState(false);

  const sync = useCallback(async () => {
    const [a, s] = await Promise.all([
      supabase
        .from("answers")
        .select(
          "id, team_id, round, question_index, selected_answer, is_correct, points_awarded, answer_order, submitted_at",
        )
        .eq("round", round)
        .order("answer_order", { ascending: true }),
      supabase
        .from("question_state")
        .select("round, question_index, status, started_at, completed_at, winner_team_id")
        .eq("round", round),
    ]);
    setAnswers((a.data as AnswerRow[] | null) ?? []);
    setStates((s.data as QuestionStateRow[] | null) ?? []);
    setReady(true);
  }, [round]);

  useEffect(() => {
    setReady(false);
    void sync();
    const channel = supabase
      .channel(`live-round-${round}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "answers" }, () => {
        void sync();
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "question_state" }, () => {
        void sync();
      })
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [round, sync]);

  const stateFor = useCallback(
    (index: number) => states.find((s) => s.question_index === index) ?? null,
    [states],
  );

  /** First question that has not been completed yet; equals questionCount when the round is over. */
  const serverIndex = useMemo(() => {
    for (let i = 0; i < questionCount; i++) {
      const s = states.find((x) => x.question_index === i);
      if (!s || s.status !== "completed") return i;
    }
    return questionCount;
  }, [states, questionCount]);

  const answersFor = useCallback(
    (index: number) =>
      answers
        .filter((a) => a.question_index === index)
        .sort((a, b) => a.answer_order - b.answer_order),
    [answers],
  );

  const startQuestion = useCallback(
    async (index: number) => {
      await supabase.rpc("start_question", { _round: round, _question_index: index });
      await sync();
    },
    [round, sync],
  );

  const completeQuestion = useCallback(
    async (index: number) => {
      await supabase.rpc("complete_question", { _round: round, _question_index: index });
      await sync();
    },
    [round, sync],
  );

  const submitAnswer = useCallback(
    async (teamId: string, index: number, selected: number, correctIndex: number) => {
      const { data } = await supabase.rpc("submit_answer", {
        _team_id: teamId,
        _round: round,
        _question_index: index,
        _selected: selected,
        _correct_index: correctIndex,
      });
      await sync();
      return data as { accepted: boolean; reason?: string; is_correct?: boolean; points?: number };
    },
    [round, sync],
  );

  const finalizeRound = useCallback(async () => {
    await supabase.rpc("finalize_round", { _round: round });
  }, [round]);

  return {
    ready,
    answers,
    states,
    stateFor,
    answersFor,
    serverIndex,
    startQuestion,
    completeQuestion,
    submitAnswer,
    finalizeRound,
  };
}

/** Team identity is per device only — all scoring stays in the database. */
export function useTeamIdentity(round: number) {
  const key = `ffa-team-round-${round}`;
  const [teamId, setTeamId] = useState<string | null>(null);

  useEffect(() => {
    setTeamId(typeof window === "undefined" ? null : window.localStorage.getItem(key));
  }, [key]);

  const choose = useCallback(
    (id: string | null) => {
      setTeamId(id);
      if (typeof window === "undefined") return;
      if (id) window.localStorage.setItem(key, id);
      else window.localStorage.removeItem(key);
    },
    [key],
  );

  return { teamId, choose };
}
