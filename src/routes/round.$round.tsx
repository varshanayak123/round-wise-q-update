import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useMemo } from "react";
import {
  Home,
  Timer,
  CheckCircle2,
  XCircle,
  Trophy,
  WifiOff,
  Pause,
  Loader2,
} from "lucide-react";
import {
  POINTS_CORRECT,
  POINTS_WRONG,
  QUESTIONS,
  QUESTION_TIME,
  ROUND_TAGLINES,
  ROUND_TITLES,
} from "@/lib/quiz-data";
import {
  finalUnlocked,
  finalists,
  groupsForRound,
  roundPlayed,
  totalScore,
  useQuiz,
  type Group,
} from "@/lib/quiz-store";
import {
  submitAnswer,
  useGameState,
  useQuestionAnswers,
  useRemainingSeconds,
  useTeamIdentity,
  usePresence,
} from "@/lib/live-store";

export const Route = createFileRoute("/round/$round")({
  params: {
    parse: ({ round }) => {
      const n = Number(round);
      if (![1, 2, 3].includes(n)) throw notFound();
      return { round: String(n) };
    },
    stringify: ({ round }) => ({ round: String(round) }),
  },
  head: ({ params }) => {
    const r = Number(params.round);
    const title = `${ROUND_TITLES[r] ?? "Round"} — Fastest Finger First`;
    return {
      meta: [
        { title },
        { name: "description", content: ROUND_TAGLINES[r] ?? "Timed quiz round." },
        { property: "og:title", content: title },
        { property: "og:description", content: ROUND_TAGLINES[r] ?? "Timed quiz round." },
      ],
    };
  },
  component: RoundPage,
});

function RoundPage() {
  const { round } = Route.useParams();
  const r = Number(round);
  const { groups, hydrated } = useQuiz();
  const { state, connected, offsetMs, hydrated: stateReady } = useGameState();
  const { teamId, choose } = useTeamIdentity();

  const eligible = groupsForRound(groups, r);
  const locked = r === 3 && !finalUnlocked(groups);
  const team = eligible.find((g) => g.id === teamId) ?? null;
  usePresence(team?.id, team?.name);

  const liveHere = state?.current_round === r;
  const answers = useQuestionAnswers(
    liveHere ? r : undefined,
    liveHere ? state?.current_question : undefined,
  );
  const myAnswer = answers.find((a) => a.team_id === team?.id) ?? null;
  const secondsLeft = useRemainingSeconds(liveHere ? state : null, offsetMs);

  const questions = QUESTIONS[r] ?? [];
  const question = liveHere ? questions[state?.current_question ?? 0] : undefined;

  const finished = liveHere && (state?.status === "ended" || (state?.status === "active" && secondsLeft <= 0));
  const revealed = Boolean(myAnswer) || finished;

  const roundOver = eligible.length > 0 && eligible.every((g) => roundPlayed(g, r));

  if (!hydrated || !stateReady)
    return <div className="px-6 py-20 text-center text-muted-foreground">Loading…</div>;

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-12 sm:px-6">
      <header>
        <span className="font-mono text-xs tracking-[0.3em] text-accent">ROUND {r}</span>
        <h1 className="mt-3 font-display text-3xl font-black sm:text-4xl">{ROUND_TITLES[r]}</h1>
        <p className="mt-2 text-sm text-muted-foreground">{ROUND_TAGLINES[r]}</p>
        <p className="mt-1 text-sm text-muted-foreground">
          {QUESTION_TIME}s per question · correct{" "}
          <span className="text-success">+{POINTS_CORRECT}</span> · wrong{" "}
          <span className="text-destructive">{POINTS_WRONG}</span>
        </p>
      </header>

      {!connected && (
        <div className="mt-6 flex items-center gap-3 rounded-xl border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm">
          <WifiOff className="size-4 text-destructive" />
          Connection lost. Reconnecting…
        </div>
      )}

      {groups.length === 0 ? (
        <div className="panel mt-8 p-6">
          <p className="text-sm text-muted-foreground">
            No groups added yet.{" "}
            <Link to="/" className="text-primary underline">
              Set up groups on the home page
            </Link>
            .
          </p>
        </div>
      ) : locked ? (
        <div className="panel mt-8 p-6">
          <h2 className="text-lg font-bold">Round 3 is locked</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Every Bracket A group must finish Round 1 and every Bracket B group must finish Round 2.
            Top 2 teams from Round 1 and Top 2 teams from Round 2 advance to the Final Round.
          </p>
          <Link to="/" className="btn-ghost mt-5 hover:bg-secondary">
            <Home className="size-4" /> Back to home
          </Link>
        </div>
      ) : (
        <>
          {r === 3 && <FinalistsPanel finalists={finalists(groups)} />}

          {!team ? (
            <div className="panel mt-8 p-6">
              <h2 className="text-lg font-bold">
                {r === 3 ? "Finalists — pick your team" : "Select the group you are playing for"}
              </h2>
              <p className="mt-2 text-sm text-muted-foreground">
                {r === 3
                  ? "Only the qualified teams can play the Final Round."
                  : `Only Bracket ${r === 1 ? "A" : "B"} groups play this round.`}
              </p>
              {eligible.length === 0 && (
                <p className="mt-4 text-sm text-muted-foreground">
                  No groups assigned to this round.
                </p>
              )}
              <div className="mt-5 space-y-3">
                {eligible.map((g) => (
                  <button
                    key={g.id}
                    onClick={() => choose(g.id)}
                    className="flex w-full items-center justify-between rounded-xl border border-border bg-secondary/40 px-4 py-4 text-left transition-colors hover:border-primary"
                  >
                    <span className="text-sm font-semibold">{g.name}</span>
                    <span className="font-mono text-xs text-muted-foreground">
                      Total {totalScore(g)} pts
                    </span>
                  </button>
                ))}
              </div>
              {eligible.length > 0 && teamId && !team && (
                <p className="mt-4 text-sm text-muted-foreground">
                  Your saved team does not play this round.
                </p>
              )}
            </div>
          ) : (
            <div className="panel mt-8 p-6">
              <div className="flex items-center justify-between text-xs font-semibold text-muted-foreground">
                <span>
                  {team.name}
                  {liveHere && question ? ` · Question ${(state?.current_question ?? 0) + 1}/${questions.length}` : ""}
                </span>
                <span className="font-mono text-primary">Total {totalScore(team)} pts</span>
              </div>

              {!liveHere || !question || state?.status === "idle" ? (
                <div className="mt-8 text-center">
                  <Loader2 className="mx-auto size-6 animate-spin text-muted-foreground" />
                  <p className="mt-4 text-sm text-muted-foreground">
                    Waiting for the host to start a question in Round {r}…
                  </p>
                </div>
              ) : (
                <>
                  <div className="mt-4 flex items-center gap-3">
                    {state?.status === "paused" ? (
                      <Pause className="size-4 text-accent" />
                    ) : (
                      <Timer
                        className={`size-4 ${secondsLeft <= 10 ? "text-destructive" : "text-accent"}`}
                      />
                    )}
                    <div className="h-2 w-full overflow-hidden rounded-full bg-secondary">
                      <div
                        className={`h-full rounded-full transition-[width] duration-300 ease-linear ${
                          secondsLeft <= 10 ? "bg-destructive" : "accent-gradient"
                        }`}
                        style={{ width: `${(secondsLeft / QUESTION_TIME) * 100}%` }}
                      />
                    </div>
                    <span className="w-10 shrink-0 text-right font-mono text-sm">
                      {secondsLeft}s
                    </span>
                  </div>

                  <h2 className="mt-6 text-xl font-bold leading-snug">{question.q}</h2>

                  <div className="mt-5 grid gap-3">
                    {question.options.map((opt, i) => {
                      const isAnswer = revealed && i === question.answer;
                      const state_ = !revealed
                        ? "border-border bg-secondary/40 hover:border-primary"
                        : isAnswer
                          ? "border-success bg-success/15"
                          : i === myAnswer?.selected_answer
                            ? "border-destructive bg-destructive/15"
                            : "border-border bg-secondary/20 opacity-60";
                      return (
                        <button
                          key={i}
                          onClick={() => void submitAnswer(team.id, i)}
                          disabled={Boolean(myAnswer) || finished || state?.status !== "active"}
                          className={`flex items-center justify-between rounded-xl border px-4 py-3.5 text-left text-sm font-medium transition-colors ${state_}`}
                        >
                          <span>{opt}</span>
                          {revealed && isAnswer && <CheckCircle2 className="size-4 text-success" />}
                          {revealed && !isAnswer && i === myAnswer?.selected_answer && (
                            <XCircle className="size-4 text-destructive" />
                          )}
                        </button>
                      );
                    })}
                  </div>

                  <div className="mt-6 text-sm text-muted-foreground">
                    {myAnswer ? (
                      <span
                        className={myAnswer.is_correct ? "text-success" : "text-destructive"}
                      >
                        ✓ Answer Submitted ·{" "}
                        {myAnswer.is_correct
                          ? `Correct! +${POINTS_CORRECT}`
                          : `Wrong! ${POINTS_WRONG}`}
                      </span>
                    ) : state?.status === "paused" ? (
                      "Paused by the host."
                    ) : finished ? (
                      "Question ended. Waiting for next question…"
                    ) : (
                      "Fastest correct answer wins the points."
                    )}
                  </div>
                </>
              )}

              <button
                onClick={() => choose(null)}
                className="btn-ghost mt-6 hover:bg-secondary"
              >
                Change team
              </button>
            </div>
          )}

          {r === 3 && eligible.length >= 2 && eligible.every((g) => roundPlayed(g, 3)) && (
            <FinalWinner finalists={eligible} />
          )}
          {roundOver && (
            <div className="mt-6 rounded-xl border border-primary/40 bg-primary/10 p-4 text-sm">
              Round {r} is complete for all groups.
              <div className="mt-3 flex flex-wrap gap-3">
                <Link to="/" className="btn-primary hover:btn-primary-hover">
                  <Home className="size-4" /> Home page
                </Link>
                <Link to="/leaderboard" className="btn-ghost hover:bg-secondary">
                  <Trophy className="size-4" /> Leaderboard
                </Link>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function FinalistsPanel({ finalists: pool }: { finalists: Group[] }) {
  if (pool.length === 0) return null;
  return (
    <div className="panel mt-8 p-6">
      <p className="font-mono text-xs tracking-[0.3em] text-accent">FINALISTS</p>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        {pool.map((g) => (
          <div
            key={g.id}
            className="rounded-xl border border-primary/40 bg-primary/10 px-4 py-4 text-center"
          >
            <p className="text-[11px] font-semibold tracking-wider text-muted-foreground">
              Round {g.qualifiedFromRound ?? 1} Qualifier
            </p>
            <p className="mt-1 text-base font-bold">{g.name}</p>
            <p className="mt-1 font-mono text-sm text-primary">
              Score: {g.scores[g.qualifiedFromRound ?? 1] ?? 0}
            </p>
          </div>
        ))}
      </div>
      <p className="mt-3 text-sm text-muted-foreground">
        {pool.length} teams qualified for the final round — Top 2 from Round 1 and Top 2 from Round
        2. Other groups cannot start Round 3.
      </p>
    </div>
  );
}

function FinalWinner({ finalists: pool }: { finalists: Group[] }) {
  const sorted = useMemo(
    () => [...pool].sort((a, b) => (b.scores[3] ?? 0) - (a.scores[3] ?? 0)),
    [pool],
  );
  const winner = sorted[0]!;
  const runnerUp = sorted[1];
  return (
    <div className="mt-6 rounded-xl border border-primary/40 bg-primary/10 p-6 text-center">
      <span className="accent-gradient mx-auto grid size-12 place-items-center rounded-2xl">
        <Trophy className="size-6 text-primary-foreground" />
      </span>
      <h3 className="mt-4 font-display text-2xl font-black">WINNER</h3>
      <p className="mt-2 text-lg font-bold">{winner.name}</p>
      <p className="font-mono text-sm text-primary">Final round score: {winner.scores[3] ?? 0}</p>
      {runnerUp && (
        <p className="mt-4 text-sm text-muted-foreground">
          Runner-up: <span className="font-semibold text-foreground">{runnerUp.name}</span> ·{" "}
          {runnerUp.scores[3] ?? 0} pts
        </p>
      )}
      <div className="mt-6 flex flex-wrap justify-center gap-3">
        <Link to="/" className="btn-primary hover:btn-primary-hover">
          <Home className="size-4" /> Back to Home
        </Link>
        <Link to="/leaderboard" className="btn-ghost hover:bg-secondary">
          <Trophy className="size-4" /> View Leaderboard
        </Link>
      </div>
    </div>
  );
}
