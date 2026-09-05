import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type Group = {
  id: string;
  name: string;
  /** 1 = plays Round 1 only, 2 = plays Round 2 only. */
  bracket: 1 | 2;
  scores: Record<number, number>;
  qualified: boolean;
  qualifiedFromRound: 1 | 2 | null;
};

export const GROUP_SIZE = 5;

/** Split groups in half: first half plays Round 1, second half plays Round 2. */
export function bracketForIndex(index: number, total: number): 1 | 2 {
  return index < Math.ceil(total / 2) ? 1 : 2;
}

export function groupNames(count: number) {
  const n = Math.max(2, Math.floor(count) || 0);
  return Array.from({ length: n }, (_, i) => `Group ${i + 1}`);
}

export function groupNamesForParticipants(count: number, size = GROUP_SIZE) {
  const per = Math.max(1, Math.floor(size) || 1);
  return groupNames(Math.ceil(Math.max(0, count) / per));
}

type TeamRow = {
  id: string;
  team_name: string;
  group_name: string;
  bracket: number;
  position: number;
  round_1_score: number | null;
  round_2_score: number | null;
  round_3_score: number | null;
  qualified_for_final: boolean;
  qualified_from_round: number | null;
};

function toGroup(row: TeamRow): Group {
  const scores: Record<number, number> = {};
  if (row.round_1_score !== null) scores[1] = row.round_1_score;
  if (row.round_2_score !== null) scores[2] = row.round_2_score;
  if (row.round_3_score !== null) scores[3] = row.round_3_score;
  return {
    id: row.id,
    name: row.team_name,
    bracket: row.bracket === 2 ? 2 : 1,
    scores,
    qualified: row.qualified_for_final,
    qualifiedFromRound:
      row.qualified_from_round === 1 ? 1 : row.qualified_from_round === 2 ? 2 : null,
  };
}

async function fetchGroups(): Promise<Group[]> {
  const { data, error } = await supabase
    .from("teams")
    .select(
      "id, team_name, group_name, bracket, position, round_1_score, round_2_score, round_3_score, qualified_for_final, qualified_from_round",
    )
    .order("position", { ascending: true })
    .order("created_at", { ascending: true });
  if (error || !data) return [];
  return (data as TeamRow[]).map(toGroup);
}

/** Shared, database-backed competition state. Supabase is the single source of truth. */
export function useQuiz() {
  const [groups, setState] = useState<Group[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    let alive = true;
    const sync = async () => {
      const rows = await fetchGroups();
      if (!alive) return;
      setState(rows);
      setHydrated(true);
    };
    void sync();

    const channel = supabase
      .channel("teams-live")
      .on("postgres_changes", { event: "*", schema: "public", table: "teams" }, () => {
        void sync();
      })
      .subscribe();

    return () => {
      alive = false;
      void supabase.removeChannel(channel);
    };
  }, []);

  const setGroups = useCallback(async (names: string[]) => {
    await supabase.from("teams").delete().gte("position", 0);
    const rows = names.map((name, i) => ({
      team_name: name,
      group_name: name,
      bracket: bracketForIndex(i, names.length),
      position: i,
      current_round: bracketForIndex(i, names.length),
    }));
    await supabase.from("teams").insert(rows);
    setState(await fetchGroups());
  }, []);

  const recordScore = useCallback(
    async (groupId: string, round: number, score: number, correct = 0, timeSpent = 0) => {
      const { data } = await supabase
        .from("teams")
        .select("round_1_score, round_2_score, round_3_score")
        .eq("id", groupId)
        .maybeSingle();

      const existing = {
        1: data?.round_1_score ?? null,
        2: data?.round_2_score ?? null,
        3: data?.round_3_score ?? null,
      } as Record<number, number | null>;
      existing[round] = score;
      const total = [1, 2, 3].reduce((a, r) => a + (existing[r] ?? 0), 0);

      const patch: Record<string, number> = {
        total_score: total,
        current_round: round,
      };
      patch[`round_${round}_score`] = score;
      patch[`round_${round}_correct`] = correct;
      patch[`round_${round}_time`] = timeSpent;

      await supabase
        .from("teams")
        .update(patch as never)
        .eq("id", groupId);


      await supabase.rpc("recalculate_qualification");
      setState(await fetchGroups());
    },
    [],
  );

  const resetAll = useCallback(async () => {
    await supabase.from("teams").delete().gte("position", 0);
    setState([]);
  }, []);

  return { groups, hydrated, setGroups, recordScore, resetAll };
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

/** Groups belonging to a bracket (1 plays Round 1, 2 plays Round 2). */
export function bracketGroups(groups: Group[], bracket: 1 | 2) {
  return groups.filter((g) => g.bracket === bracket);
}

/** Top 2 qualifiers of a bracket, as decided and stored in the shared database. */
export function bracketWinners(groups: Group[], bracket: 1 | 2) {
  const round = bracket;
  return groups
    .filter((g) => g.qualified && g.qualifiedFromRound === bracket)
    .sort((a, b) => (b.scores[round] ?? 0) - (a.scores[round] ?? 0));
}

export function bracketWinner(groups: Group[], bracket: 1 | 2) {
  return bracketWinners(groups, bracket)[0] ?? null;
}

/** The four Round 3 qualifiers: top 2 from Round 1 and top 2 from Round 2. */
export function finalists(groups: Group[]) {
  return [...bracketWinners(groups, 1), ...bracketWinners(groups, 2)];
}

/** Groups allowed to play a given round. */
export function groupsForRound(groups: Group[], round: number) {
  if (round === 1) return bracketGroups(groups, 1);
  if (round === 2) return bracketGroups(groups, 2);
  return finalists(groups);
}

/** Round 3 unlocks once both brackets have finished their own round. */
export function finalUnlocked(groups: Group[]) {
  return finalists(groups).length >= 2;
}

export function leaderboard(groups: Group[]) {
  return [...groups].sort((a, b) => totalScore(b) - totalScore(a));
}
