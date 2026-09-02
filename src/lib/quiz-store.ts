import { useCallback, useEffect, useState } from "react";

export type Group = {
  id: string;
  name: string;
  /** 1 = plays Round 1 only, 2 = plays Round 2 only. */
  bracket: 1 | 2;
  scores: Record<number, number>;
};

export const GROUP_SIZE = 5;

/** Split groups in half: first half plays Round 1, second half plays Round 2. */
export function bracketForIndex(index: number, total: number): 1 | 2 {
  return index < Math.ceil(total / 2) ? 1 : 2;
}

export function groupNamesForParticipants(count: number, size = GROUP_SIZE) {
  const n = Math.max(2, Math.ceil(count / size));
  return Array.from({ length: n }, (_, i) => `Group ${i + 1}`);
}

const KEY = "fff-quiz-state-v1";

export type QuizState = { groups: Group[] };

const empty: QuizState = { groups: [] };

function read(): QuizState {
  if (typeof window === "undefined") return empty;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return empty;
    const parsed = JSON.parse(raw) as QuizState;
    if (!parsed || !Array.isArray(parsed.groups)) return empty;
    // Backfill brackets for state saved before bracket support.
    return {
      groups: parsed.groups.map((g, i) => ({
        ...g,
        bracket: g.bracket === 1 || g.bracket === 2 ? g.bracket : bracketForIndex(i, parsed.groups.length),
      })),
    };
  } catch {
    return empty;
  }
}

const listeners = new Set<() => void>();

function write(state: QuizState) {
  window.localStorage.setItem(KEY, JSON.stringify(state));
  listeners.forEach((l) => l());
}

export function useQuiz() {
  const [state, setState] = useState<QuizState>(empty);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const sync = () => setState(read());
    sync();
    setHydrated(true);
    listeners.add(sync);
    window.addEventListener("storage", sync);
    return () => {
      listeners.delete(sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  const setGroups = useCallback((names: string[]) => {
    write({
      groups: names.map((name, i) => ({
        id: `g${i + 1}-${Date.now()}`,
        name,
        bracket: bracketForIndex(i, names.length),
        scores: {},
      })),
    });
  }, []);

  const recordScore = useCallback((groupId: string, round: number, score: number) => {
    const current = read();
    write({
      groups: current.groups.map((g) =>
        g.id === groupId ? { ...g, scores: { ...g.scores, [round]: score } } : g,
      ),
    });
  }, []);

  const resetAll = useCallback(() => write(empty), []);

  return { groups: state.groups, hydrated, setGroups, recordScore, resetAll };
}

export function totalScore(g: Group) {
  return Object.values(g.scores).reduce((a, b) => a + b, 0);
}

export function roundPlayed(g: Group, round: number) {
  return g.scores[round] !== undefined;
}

export function roundComplete(groups: Group[], round: number, eligible?: Group[]) {
  const pool = eligible ?? groups;
  return pool.length > 0 && pool.every((g) => roundPlayed(g, round));
}

/** Top 2 groups by combined score of rounds 1 & 2. */
export function finalists(groups: Group[]) {
  return [...groups]
    .sort(
      (a, b) =>
        (b.scores[1] ?? 0) + (b.scores[2] ?? 0) - ((a.scores[1] ?? 0) + (a.scores[2] ?? 0)),
    )
    .slice(0, 2);
}

export function leaderboard(groups: Group[]) {
  return [...groups].sort((a, b) => totalScore(b) - totalScore(a));
}
