import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export const QUIZ_SESSION_ID = "main";
export const QUIZ_CHANNEL = `quiz:${QUIZ_SESSION_ID}`;

export type GameStatus = "idle" | "active" | "paused" | "ended";

export type GameState = {
  current_round: number;
  current_question: number;
  status: GameStatus;
  question_started_at: string | null;
  question_ends_at: string | null;
  paused_at: string | null;
  state_version: number;
};

const COLUMNS =
  "current_round, current_question, status, question_started_at, question_ends_at, paused_at, state_version";

async function fetchState(): Promise<GameState | null> {
  const { data } = await supabase
    .from("game_state")
    .select(COLUMNS)
    .eq("id", QUIZ_SESSION_ID)
    .maybeSingle();
  return (data as GameState | null) ?? null;
}

/**
 * Authoritative, database-backed live quiz state.
 * Participants only read it — every change comes from the admin through the database.
 */
export function useGameState() {
  const [state, setState] = useState<GameState | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [connected, setConnected] = useState(false);
  const [offsetMs, setOffsetMs] = useState(0);
  const version = useRef(0);

  const apply = useCallback((next: GameState | null) => {
    if (!next) return;
    // State version protection: never apply an older snapshot.
    if (next.state_version < version.current) return;
    version.current = next.state_version;
    setState(next);
  }, []);

  const refresh = useCallback(async () => {
    const next = await fetchState();
    if (next) {
      version.current = Math.max(version.current, next.state_version);
      setState(next);
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    let alive = true;

    const syncClock = async () => {
      const started = Date.now();
      const { data } = await supabase.rpc("server_now");
      if (!alive || !data) return;
      const rtt = (Date.now() - started) / 2;
      setOffsetMs(new Date(data as string).getTime() + rtt - Date.now());
    };

    void syncClock();
    void refresh();

    const channel = supabase
      .channel(QUIZ_CHANNEL)
      .on("broadcast", { event: "state" }, ({ payload }) => {
        apply(payload as GameState);
      })
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "game_state" },
        (payload) => apply(payload.new as GameState),
      )
      .subscribe((status) => {
        if (!alive) return;
        const online = status === "SUBSCRIBED";
        setConnected(online);
        if (online) void refresh();
      });

    const onOnline = () => void refresh();
    window.addEventListener("online", onOnline);
    window.addEventListener("focus", onOnline);

    return () => {
      alive = false;
      window.removeEventListener("online", onOnline);
      window.removeEventListener("focus", onOnline);
      void supabase.removeChannel(channel);
    };
  }, [apply, refresh]);

  return { state, hydrated, connected, offsetMs, refresh };
}

/** Seconds left, derived from the server-side end time (display only). */
export function useRemainingSeconds(state: GameState | null, offsetMs: number) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(t);
  }, []);

  if (!state?.question_ends_at) return 0;
  const reference =
    state.status === "paused" && state.paused_at
      ? new Date(state.paused_at).getTime()
      : now + offsetMs;
  const ms = new Date(state.question_ends_at).getTime() - reference;
  return Math.max(0, Math.ceil(ms / 1000));
}

/** Broadcast the new state to every connected device immediately. */
async function broadcast(next: unknown) {
  const channel = supabase.channel(QUIZ_CHANNEL);
  await channel.subscribe();
  await channel.send({ type: "broadcast", event: "state", payload: next });
  await supabase.removeChannel(channel);
}

async function runAdmin(fn: string, args: Record<string, unknown> = {}) {
  const { data } = await supabase.rpc(fn as never, args as never);
  const next = Array.isArray(data) ? data[0] : data;
  if (next) await broadcast(next);
  return next as GameState | null;
}

export const admin = {
  startQuestion: (round: number, questionIndex: number, seconds: number) =>
    runAdmin("admin_start_question", {
      _round: round,
      _question_index: questionIndex,
      _seconds: seconds,
    }),
  pause: () => runAdmin("admin_pause"),
  resume: () => runAdmin("admin_resume"),
  endQuestion: () => runAdmin("admin_end_question"),
  setRound: (round: number) => runAdmin("admin_set_round", { _round: round }),
};

export type SubmitResult = {
  accepted: boolean;
  reason?: string;
  is_correct?: boolean;
  points?: number;
  answer_order?: number;
  correct_index?: number;
};

/** The browser never decides the score — the database validates and scores the answer. */
export async function submitAnswer(teamId: string, selected: number): Promise<SubmitResult> {
  const { data, error } = await supabase.rpc("submit_live_answer", {
    _team_id: teamId,
    _selected: selected,
  });
  if (error) return { accepted: false, reason: "error" };
  return data as unknown as SubmitResult;
}

export type AnswerRow = {
  team_id: string;
  round: number;
  question_index: number;
  selected_answer: number;
  is_correct: boolean;
  points_awarded: number;
  answer_order: number;
};

/** Answers for the current question, live for every device. */
export function useQuestionAnswers(round: number | undefined, questionIndex: number | undefined) {
  const [answers, setAnswers] = useState<AnswerRow[]>([]);

  useEffect(() => {
    if (round === undefined || questionIndex === undefined) return;
    let alive = true;

    const sync = async () => {
      const { data } = await supabase
        .from("answers")
        .select(
          "team_id, round, question_index, selected_answer, is_correct, points_awarded, answer_order",
        )
        .eq("round", round)
        .eq("question_index", questionIndex)
        .order("answer_order", { ascending: true });
      if (alive) setAnswers((data as AnswerRow[]) ?? []);
    };

    void sync();
    const channel = supabase
      .channel(`answers-${round}-${questionIndex}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "answers" }, () => {
        void sync();
      })
      .subscribe();

    return () => {
      alive = false;
      void supabase.removeChannel(channel);
    };
  }, [round, questionIndex]);

  return answers;
}

const TEAM_KEY = "fff-team-id";

/** Only the team's own identity is kept locally — never any score or game state. */
export function useTeamIdentity() {
  const [teamId, setTeamId] = useState<string | null>(null);

  useEffect(() => {
    setTeamId(localStorage.getItem(TEAM_KEY));
  }, []);

  const choose = useCallback((id: string | null) => {
    if (id) localStorage.setItem(TEAM_KEY, id);
    else localStorage.removeItem(TEAM_KEY);
    setTeamId(id);
  }, []);

  return { teamId, choose };
}

/** Live online teams, using Supabase Presence on the quiz channel. */
export function usePresence(teamId?: string | null, teamName?: string) {
  const [online, setOnline] = useState<string[]>([]);

  useEffect(() => {
    const channel = supabase.channel(`${QUIZ_CHANNEL}:presence`, {
      config: { presence: { key: teamId ?? `viewer-${Math.random().toString(36).slice(2)}` } },
    });

    channel
      .on("presence", { event: "sync" }, () => {
        const ids = Object.keys(channel.presenceState());
        setOnline(ids);
      })
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          void channel.track({ team_id: teamId ?? null, name: teamName ?? "Viewer" });
        }
      });

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [teamId, teamName]);

  return online;
}
