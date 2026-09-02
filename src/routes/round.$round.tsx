import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Home, Timer, ArrowRight, CheckCircle2, XCircle, Trophy } from "lucide-react";
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
  const { groups, hydrated, recordScore } = useQuiz();
  const [activeGroup, setActiveGroup] = useState<Group | null>(null);
  const [finished, setFinished] = useState<{ group: Group; score: number } | null>(null);

  const top2 = finalists(groups);
  const eligible = groupsForRound(groups, r);
  const questions = QUESTIONS[r] ?? [];
  const locked = r === 3 && !finalUnlocked(groups);

  useEffect(() => {
    setActiveGroup(null);
    setFinished(null);
  }, [r]);

  if (!hydrated) return <div className="px-6 py-20 text-center text-muted-foreground">Loading…</div>;

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

      {finished ? (
        <RoundResult
          round={r}
          group={finished.group}
          score={finished.score}
          onReplayPick={() => {
            setFinished(null);
            setActiveGroup(null);
          }}
        />
      ) : activeGroup ? (
        <QuizRunner
          key={activeGroup.id}
          group={activeGroup}
          questions={questions}
          onDone={(score) => {
            recordScore(activeGroup.id, r, score);
            setFinished({ group: activeGroup, score });
          }}
        />
      ) : (
        <div className="panel mt-8 p-6">
          {groups.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No groups added yet.{" "}
              <Link to="/" className="text-primary underline">
                Set up groups on the home page
              </Link>
              .
            </p>
          ) : locked ? (
            <div>
              <h2 className="text-lg font-bold">Round 3 is locked</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Every Bracket A group must finish Round 1 and every Bracket B group must finish
                Round 2. Only the highest scorer from each bracket qualifies for the finale.
              </p>
              <Link to="/" className="btn-ghost mt-5 hover:bg-secondary">
                <Home className="size-4" /> Back to home
              </Link>
            </div>
          ) : (
            <div>
              <h2 className="text-lg font-bold">
                {r === 3 ? "Finalists — pick who plays" : "Select the group that is playing"}
              </h2>
              {r === 3 ? (
                <div className="mt-3 space-y-2">
                  <p className="text-sm text-muted-foreground">
                    Qualified groups — the top scorer of Round 1 and of Round 2.
                  </p>
                  {top2.map((g, i) => (
                    <div
                      key={g.id}
                      className="flex items-center justify-between rounded-xl border border-primary/40 bg-primary/10 px-4 py-3 text-sm"
                    >
                      <span className="font-semibold">
                        {g.name}{" "}
                        <span className="text-muted-foreground">
                          · Round {i === 0 ? 1 : 2} winner
                        </span>
                      </span>
                      <span className="font-mono text-primary">
                        {g.scores[i === 0 ? 1 : 2] ?? 0} pts
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="mt-2 text-sm text-muted-foreground">
                  Only Bracket {r === 1 ? "A" : "B"} groups play this round.
                </p>
              )}
              {eligible.length === 0 && (
                <p className="mt-4 text-sm text-muted-foreground">
                  No groups assigned to this round.
                </p>
              )}
              <div className="mt-5 space-y-3">
                {eligible.map((g) => {
                  const played = roundPlayed(g, r);
                  return (
                    <button
                      key={g.id}
                      disabled={played}
                      onClick={() => setActiveGroup(g)}
                      className={`flex w-full items-center justify-between rounded-xl border border-border bg-secondary/40 px-4 py-4 text-left transition-colors ${
                        played ? "opacity-50" : "hover:border-primary"
                      }`}
                    >
                      <span className="text-sm font-semibold">{g.name}</span>
                      <span className="font-mono text-xs text-muted-foreground">
                        {played ? `Done · ${g.scores[r]} pts` : `Total ${totalScore(g)} pts`}
                      </span>
                    </button>
                  );
                })}
              </div>
              {eligible.length > 0 && eligible.every((g) => roundPlayed(g, r)) && (
                <div className="mt-6 rounded-xl border border-primary/40 bg-primary/10 p-4 text-sm">
                  Round {r} is complete for all groups.
                  <div className="mt-3 flex flex-wrap gap-3">
                    <Link to="/" className="btn-primary hover:btn-primary-hover">
                      <Home className="size-4" /> Home page
                    </Link>
                    {r < 3 && (
                      <Link
                        to="/round/$round"
                        params={{ round: String(r + 1) }}
                        className="btn-ghost hover:bg-secondary"
                      >
                        Round {r + 1} <ArrowRight className="size-4" />
                      </Link>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function QuizRunner({
  group,
  questions,
  onDone,
}: {
  group: Group;
  questions: { q: string; options: string[]; answer: number }[];
  onDone: (score: number) => void;
}) {
  const [index, setIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [timeLeft, setTimeLeft] = useState(QUESTION_TIME);

  const question = questions[index]!;

  useEffect(() => {
    setTimeLeft(QUESTION_TIME);
    setPicked(null);
  }, [index]);

  useEffect(() => {
    if (picked !== null) return;
    if (timeLeft <= 0) {
      setPicked(-1);
      return;
    }
    const t = setTimeout(() => setTimeLeft((v) => v - 1), 1000);
    return () => clearTimeout(t);
  }, [timeLeft, picked]);

  const answer = (i: number) => {
    if (picked !== null) return;
    setPicked(i);
    setScore((s) => s + (i === question.answer ? POINTS_CORRECT : POINTS_WRONG));
  };

  const next = () => {
    if (index + 1 >= questions.length) onDone(score);
    else setIndex(index + 1);
  };

  const pct = (timeLeft / QUESTION_TIME) * 100;

  return (
    <div className="panel mt-8 p-6">
      <div className="flex items-center justify-between text-xs font-semibold text-muted-foreground">
        <span>
          {group.name} · Question {index + 1}/{questions.length}
        </span>
        <span className="font-mono text-primary">Score {score}</span>
      </div>

      <div className="mt-4 flex items-center gap-3">
        <Timer className={`size-4 ${timeLeft <= 10 ? "text-destructive" : "text-accent"}`} />
        <div className="h-2 w-full overflow-hidden rounded-full bg-secondary">
          <div
            className={`h-full rounded-full transition-[width] duration-1000 ease-linear ${
              timeLeft <= 10 ? "bg-destructive" : "accent-gradient"
            }`}
            style={{ width: `${pct}%` }}
          />
        </div>
        <span className="w-10 shrink-0 text-right font-mono text-sm">{timeLeft}s</span>
      </div>

      <h2 className="mt-6 text-xl font-bold leading-snug">{question.q}</h2>

      <div className="mt-5 grid gap-3">
        {question.options.map((opt, i) => {
          const isAnswer = i === question.answer;
          const revealed = picked !== null;
          const state = !revealed
            ? "border-border bg-secondary/40 hover:border-primary"
            : isAnswer
              ? "border-success bg-success/15"
              : i === picked
                ? "border-destructive bg-destructive/15"
                : "border-border bg-secondary/20 opacity-60";
          return (
            <button
              key={i}
              onClick={() => answer(i)}
              disabled={revealed}
              className={`flex items-center justify-between rounded-xl border px-4 py-3.5 text-left text-sm font-medium transition-colors ${state}`}
            >
              <span>{opt}</span>
              {revealed && isAnswer && <CheckCircle2 className="size-4 text-success" />}
              {revealed && !isAnswer && i === picked && (
                <XCircle className="size-4 text-destructive" />
              )}
            </button>
          );
        })}
      </div>

      {picked !== null && (
        <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-muted-foreground">
            {picked === -1
              ? "Time up — no points awarded."
              : picked === question.answer
                ? `Correct! +${POINTS_CORRECT} points.`
                : `Wrong. ${POINTS_WRONG} points.`}
          </p>
          <button onClick={next} className="btn-primary hover:btn-primary-hover">
            {index + 1 >= questions.length ? "Finish round" : "Next question"}
            <ArrowRight className="size-4" />
          </button>
        </div>
      )}
    </div>
  );
}

function RoundResult({
  round,
  group,
  score,
  onReplayPick,
}: {
  round: number;
  group: Group;
  score: number;
  onReplayPick: () => void;
}) {
  return (
    <div className="panel mt-8 p-8 text-center">
      <span className="accent-gradient mx-auto grid size-14 place-items-center rounded-2xl">
        <Trophy className="size-7 text-primary-foreground" />
      </span>
      <h2 className="mt-5 font-display text-2xl font-black">Round {round} finished</h2>
      <p className="mt-2 text-sm text-muted-foreground">{group.name} scored</p>
      <p className="mt-2 font-display text-5xl font-black text-gradient">{score}</p>
      <p className="mt-4 text-sm text-muted-foreground">
        The next round does not start automatically. Go back to the home page, then open Round{" "}
        {round < 3 ? round + 1 : 3} from the navbar when you are ready.
      </p>
      <div className="mt-7 flex flex-wrap justify-center gap-3">
        <Link to="/" className="btn-primary hover:btn-primary-hover">
          <Home className="size-4" /> Home page
        </Link>
        <button onClick={onReplayPick} className="btn-ghost hover:bg-secondary">
          Next group
        </button>
        <Link to="/leaderboard" className="btn-ghost hover:bg-secondary">
          <Trophy className="size-4" /> Leaderboard
        </Link>
      </div>
    </div>
  );
}
