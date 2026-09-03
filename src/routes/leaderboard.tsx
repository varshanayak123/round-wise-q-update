import { createFileRoute, Link } from "@tanstack/react-router";
import { Trophy, Home } from "lucide-react";
import { leaderboard, totalScore, useQuiz } from "@/lib/quiz-store";

export const Route = createFileRoute("/leaderboard")({
  head: () => ({
    meta: [
      { title: "Leaderboard — Fastest Finger First" },
      {
        name: "description",
        content: "Live standings for every group across all three Fastest Finger First rounds.",
      },
      { property: "og:title", content: "Leaderboard — Fastest Finger First" },
      {
        property: "og:description",
        content: "Round-by-round scores and total points for every competing group.",
      },
    ],
  }),
  component: LeaderboardPage,
});

function LeaderboardPage() {
  const { groups } = useQuiz();
  const ranked = leaderboard(groups);

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-12 sm:px-6">
      <h1 className="flex items-center gap-3 font-display text-3xl font-black sm:text-4xl">
        <Trophy className="size-7 text-accent" /> Leaderboard
      </h1>

      {ranked.length === 0 ? (
        <p className="mt-6 text-sm text-muted-foreground">
          No groups yet. Set them up on the{" "}
          <Link to="/" className="text-primary underline">
            home page
          </Link>
          .
        </p>
      ) : (
        <div className="panel mt-8 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-xs tracking-wider text-muted-foreground">
              <tr className="border-b border-border">
                <th className="px-5 py-4">#</th>
                <th className="px-5 py-4">Team</th>
                <th className="px-5 py-4">Group</th>
                <th className="px-5 py-4">R1</th>
                <th className="px-5 py-4">R2</th>
                <th className="px-5 py-4">R3</th>
                <th className="px-5 py-4">Total</th>
              </tr>
            </thead>
            <tbody>
              {ranked.map((g, i) => (
                <tr key={g.id} className="border-b border-border/60 last:border-0">
                  <td className="px-5 py-4 font-mono text-muted-foreground">{i + 1}</td>
                  <td className="px-5 py-4 font-semibold">{g.name}</td>
                  <td className="px-5 py-4 text-muted-foreground">{g.name}</td>
                  {[1, 2, 3].map((r) => (
                    <td key={r} className="px-5 py-4 font-mono text-muted-foreground">
                      {g.scores[r] ?? "—"}
                    </td>
                  ))}
                  <td className="px-5 py-4 font-mono font-bold text-primary">{totalScore(g)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Link to="/" className="btn-ghost mt-8 hover:bg-secondary">
        <Home className="size-4" /> Back to home
      </Link>
    </div>
  );
}
