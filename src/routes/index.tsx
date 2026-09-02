import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Zap, Users, Timer, Trophy, Plus, X } from "lucide-react";
import {
  useQuiz,
  totalScore,
  roundPlayed,
  groupsForRound,
  bracketForIndex,
  groupNamesForParticipants,
  GROUP_SIZE,
} from "@/lib/quiz-store";
import { POINTS_CORRECT, POINTS_WRONG, QUESTION_TIME, ROUND_TAGLINES } from "@/lib/quiz-data";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Fastest Finger First | Team Quiz Competition" },
      {
        name: "description",
        content:
          "Team quiz competition with three timed rounds: 30 seconds per question, +5 for correct, -3 for wrong. Top 2 groups reach the finale.",
      },
      { property: "og:title", content: "Fastest Finger First | Team Quiz Competition" },
      {
        property: "og:description",
        content:
          "Three timed rounds, live scoring and a top-2 grand finale. Set up your groups and start the quiz.",
      },
    ],
  }),
  component: Home,
});

function Home() {
  const { groups, hydrated, setGroups, resetAll } = useQuiz();
  const [names, setNames] = useState<string[]>(["Group 1", "Group 2", "Group 3", "Group 4"]);
  const [participants, setParticipants] = useState(20);


  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-12 sm:px-6">
      <section className="text-center">
        <span className="inline-flex items-center gap-2 rounded-full border border-border bg-secondary/60 px-4 py-1.5 text-[11px] font-semibold tracking-[0.3em] text-muted-foreground">
          COLLEGE QUIZ CHAMPIONSHIP
        </span>
        <h1 className="mt-6 font-display text-5xl font-black leading-[1.05] sm:text-7xl">
          Fastest <span className="text-gradient">Finger First</span>
        </h1>
        <p className="mx-auto mt-5 max-w-2xl text-base text-muted-foreground sm:text-lg">
          Three timed rounds. {QUESTION_TIME} seconds per question,{" "}
          <span className="text-success">+{POINTS_CORRECT}</span> for a correct answer and{" "}
          <span className="text-destructive">{POINTS_WRONG}</span> for a wrong one.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Link to="/round/$round" params={{ round: "1" }} className="btn-primary hover:btn-primary-hover">
            <Zap className="size-4" /> Start Round 1
          </Link>
          <Link to="/leaderboard" className="btn-ghost hover:bg-secondary">
            <Trophy className="size-4" /> Leaderboard
          </Link>
        </div>
      </section>

      <section className="mt-14 grid gap-4 sm:grid-cols-3">
        {[
          { icon: Timer, title: `${QUESTION_TIME}s per question`, text: "Answer fast — the timer never waits." },
          { icon: Users, title: "Group vs group", text: "Every group plays the same round separately." },
          {
            icon: Trophy,
            title: "Top 2 in the finale",
            text: "Only the two highest scoring groups play Round 3.",
          },
        ].map((f) => (
          <div key={f.title} className="panel p-6">
            <span className="accent-gradient grid size-10 place-items-center rounded-xl">
              <f.icon className="size-5 text-primary-foreground" />
            </span>
            <h3 className="mt-4 text-base font-bold">{f.title}</h3>
            <p className="mt-1 text-sm text-muted-foreground">{f.text}</p>
          </div>
        ))}
      </section>

      <section className="mt-14 grid gap-6 lg:grid-cols-2">
        <div className="panel p-6">
          <h2 className="text-lg font-bold">Groups</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {groups.length > 0
              ? "Groups are locked in. Reset to start a brand new competition."
              : "Add the participating groups, then head to Round 1 from the navbar."}
          </p>

          {hydrated && groups.length === 0 ? (
            <div className="mt-5 space-y-3">
              {names.map((n, i) => (
                <div key={i} className="flex items-center gap-2">
                  <input
                    value={n}
                    onChange={(e) =>
                      setNames(names.map((v, idx) => (idx === i ? e.target.value : v)))
                    }
                    placeholder={`Group ${i + 1}`}
                    className="w-full rounded-xl border border-input bg-secondary/50 px-4 py-2.5 text-sm outline-none focus:border-primary"
                  />
                  {names.length > 2 && (
                    <button
                      onClick={() => setNames(names.filter((_, idx) => idx !== i))}
                      className="rounded-xl border border-border p-2.5 text-muted-foreground hover:text-foreground"
                      aria-label="Remove group"
                    >
                      <X className="size-4" />
                    </button>
                  )}
                </div>
              ))}
              <div className="flex flex-wrap gap-3 pt-2">
                <button
                  onClick={() => setNames([...names, `Group ${names.length + 1}`])}
                  className="btn-ghost hover:bg-secondary"
                >
                  <Plus className="size-4" /> Add group
                </button>
                <button
                  onClick={() =>
                    setGroups(
                      names.map((n, i) => n.trim() || `Group ${i + 1}`),
                    )
                  }
                  className="btn-primary hover:btn-primary-hover"
                >
                  Save groups
                </button>
              </div>
            </div>
          ) : (
            <div className="mt-5 space-y-2">
              {groups.map((g, i) => (
                <div
                  key={g.id}
                  className="flex items-center justify-between rounded-xl border border-border bg-secondary/40 px-4 py-3"
                >
                  <span className="flex items-center gap-3 text-sm font-semibold">
                    <span className="font-mono text-xs text-muted-foreground">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    {g.name}
                  </span>
                  <span className="font-mono text-sm text-primary">{totalScore(g)} pts</span>
                </div>
              ))}
              {groups.length > 0 && (
                <button
                  onClick={resetAll}
                  className="btn-ghost mt-3 hover:bg-secondary"
                >
                  Reset competition
                </button>
              )}
            </div>
          )}
        </div>

        <div className="panel p-6">
          <h2 className="text-lg font-bold">Rounds</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Rounds do not auto-continue. After a round finishes you come back home and open the
            next round from the navbar.
          </p>
          <div className="mt-5 space-y-3">
            {[1, 2, 3].map((r) => {
              const pool = groupsForRound(groups, r);
              const done =
                pool.length > 0 && pool.every((g) => roundPlayed(g, r));
              return (
                <Link
                  key={r}
                  to="/round/$round"
                  params={{ round: String(r) }}
                  className="block rounded-xl border border-border bg-secondary/40 p-4 transition-colors hover:border-primary"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-display text-sm font-bold">Round {r}</span>
                    <span
                      className={`rounded-full px-3 py-1 text-[11px] font-semibold ${
                        done ? "bg-success/15 text-success" : "bg-secondary text-muted-foreground"
                      }`}
                    >
                      {done ? "Completed" : "Pending"}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">{ROUND_TAGLINES[r]}</p>
                </Link>
              );
            })}
          </div>
        </div>
      </section>
    </div>
  );
}
