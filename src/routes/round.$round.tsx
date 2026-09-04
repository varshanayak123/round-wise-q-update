import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { Home, Timer, ArrowRight, CheckCircle2, XCircle, Trophy, Users } from "lucide-react";
import {
  POINTS_CORRECT,
  POINTS_WRONG,
  QUESTIONS,
  QUESTION_TIME,
  ROUND_TAGLINES,
  ROUND_TITLES,
  type Question,
} from "@/lib/quiz-data";
import {
  finalUnlocked,
  finalists,
  groupsForRound,
  totalScore,
  useQuiz,
  type Group,
} from "@/lib/quiz-store";
import { useLiveRound, useTeamIdentity } from "@/lib/live-round";

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
  const { teamId, choose } = useTeamIdentity(r);

  const top2 = finalists(groups);
  const eligible = groupsForRound(groups, r);
  const questions = QUESTIONS[r] ?? [];
  const locked = r === 3 && !finalUnlocked(groups);
  const myTeam = eligible.find((g) => g.id === teamId) ?? null;

  if (!hydrated) return <div className="px-6 py-20 text-center text-muted-foreground">Loading…</div>;

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-12 sm:px-6">
      <header>
        <span className="font-mono text-xs tracking-[0.3em] text-accent">ROUND {r}</span>
        <h1 className="mt-3 font-display text-3xl font-black sm:text-4xl">{ROUND_TITLES[r]}</h1>
        <p className="mt-2 text-sm text-muted-foreground">{ROUND_TAGLINES[r]}</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Fastest finger first · {QUESTION_TIME}s per question · correct{" "}
          <span className="text-success">+{POINTS_CORRECT}</span> · wrong{" "}
          <span className="text-destructive">{POINTS_WRONG}</span>
        </p>
      </header>

      {groups.length === 0 ? (
        <div className="panel mt-8 p-6">
          <p className="text-sm text-muted-foreground">
            No teams added yet.{" "}
            <Link to="/" className="text-primary underline">
              Set up teams on the home page
            </Link>
            .
          </p>
        </div>
      ) : locked ? (
        <div className="panel mt-8 p-6">
          <h2 className="text-lg font-bold">Round 3 is locked</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Every Bracket A team must finish Round 1 and every Bracket B team must finish Round 2.
            Only the highest scorer from each bracket qualifies for the finale.
          </p>
          <Link to="/" className="btn-ghost mt-5 hover:bg-secondary">
            <Home className="size-4" /> Back to home
          </Link>
        </div>
      ) : !myTeam ? (
        <div className="panel mt-8 p-6">
          <h2 className="text-lg font-bold">Which team is on this device?</h2>
          {r === 3 ? (
            <div className="mt-3 space-y-3">
              <p className="font-mono text-xs tracking-[0.3em] text-accent">FINALISTS</p>
              <div className="grid gap-3 sm:grid-cols-[1fr_auto_1fr] sm:items-center">
                {top2.map((g, i) => (
                  <div key={g.id} className="contents">
                    <div className="rounded-xl border border-primary/40 bg-primary/10 px-4 py-4 text-center">
                      <p className="text-[11px] font-semibold tracking-wider text-muted-foreground">
                        Round {g.qualifiedFromRound ?? (i === 0 ? 1 : 2)} Winner
                      </p>
                      <p className="mt-1 text-base font-bold">{g.name}</p>
                      <p className="mt-1 font-mono text-sm text-primary">
                        Score: {g.scores[g.qualifiedFromRound ?? (i === 0 ? 1 : 2)] ?? 0}
                      </p>
                    </div>
                    {i === 0 && (
                      <span className="text-center font-display text-sm font-black text-muted-foreground">
                        VS
                      </span>
                    )}
                  </div>
                ))}
              </div>
              <p className="text-sm text-muted-foreground">
                Only these 2 teams can play the final round.
              </p>
            </div>
          ) : (
            <p className="mt-2 text-sm text-muted-foreground">
              Every team opens this page on its own device and picks its own name. Only Bracket{" "}
              {r === 1 ? "A" : "B"} teams play this round.
            </p>
          )}
          {eligible.length === 0 && (
            <p className="mt-4 text-sm text-muted-foreground">No teams assigned to this round.</p>
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
        </div>
      ) : (
        <LiveBoard
          key={`${r}-${myTeam.id}`}
          round={r}
          questions={questions}
          teams={eligible}
          myTeam={myTeam}
          onSwitchTeam={() => choose(null)}
        />
      )}
    </div>
  );
}

function LiveBoard({
  round,
  questions,
  teams,
  myTeam,
  onSwitchTeam,
}: {
  round: number;
  questions: Question[];
  teams: Group[];
  myTeam: Group;
  onSwitchTeam: () => void;
}) {
  const live = useLiveRound(round, questions.length);
  const [advancedTo, setAdvancedTo] = useState(0);
  const [now, setNow] = useState(() => Date.now());
  const startedRef = useRef<number | null>(null);
  const timedOutRef = useRef<number | null>(null);

  const index = Math.min(advancedTo, live.serverIndex);
  const roundOver = live.serverIndex >= questions.length && advancedTo >= questions.length;
  const question = questions[index];
  const state = live.stateFor(index);
  const given = live.answersFor(index);
  const mine = given.find((a) => a.team_id === myTeam.id) ?? null;
  const completed = state?.status === "completed";

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(t);
  }, []);

  // Make sure the shared clock for the current question exists.
  useEffect(() => {
    if (roundOver || !live.ready || state) return;
    if (startedRef.current === index) return;
    startedRef.current = index;
    void live.startQuestion(index);
  }, [index, state, live, roundOver]);

  const timeLeft = useMemo(() => {
    if (!state) return QUESTION_TIME;
    if (state.status === "completed") return 0;
    const elapsed = (now - new Date(state.started_at).getTime()) / 1000;
    return Math.max(0, Math.ceil(QUESTION_TIME - elapsed));
  }, [state, now]);

  // Timer expiry closes the question for everyone.
  useEffect(() => {
    if (!state || completed || timeLeft > 0) return;
    if (timedOutRef.current === index) return;
    timedOutRef.current = index;
    void live.completeQuestion(index);
  }, [timeLeft, state, completed, index, live]);

  const [flash, setFlash] = useState<string | null>(null);

  const teamName = (id: string) => teams.find((t) => t.id === id)?.name ?? "Team";

  const answer = async (option: number) => {
    if (!question || mine || completed) return;
    const res = await live.submitAnswer(myTeam.id, index, option, question.answer);
    if (!res?.accepted) {
      setFlash(res?.reason === "completed" ? "Too late — the question is already closed." : null);
      return;
    }
    setFlash(null);
  };

  if (roundOver) {
    return (
      <RoundOver round={round} teams={teams} onFinalize={live.finalizeRound} />
    );
  }

  if (!question) return null;

  const pct = (timeLeft / QUESTION_TIME) * 100;
  const revealAnswer = completed;

  return (
    <div className="panel mt-8 p-6">
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-semibold text-muted-foreground">
        <span>
          {myTeam.name} · Question {index + 1}/{questions.length}
        </span>
        <span className="flex items-center gap-3">
          <span className="font-mono text-primary">Score {totalScore(myTeam)}</span>
          <button onClick={onSwitchTeam} className="underline hover:text-foreground">
            Change team
          </button>
        </span>
      </div>

      <div className="mt-4 flex items-center gap-3">
        <Timer className={`size-4 ${timeLeft <= 10 ? "text-destructive" : "text-accent"}`} />
        <div className="h-2 w-full overflow-hidden rounded-full bg-secondary">
          <div
            className={`h-full rounded-full transition-[width] duration-300 ease-linear ${
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
          const myPick = mine?.selected_answer === i;
          const state2 = revealAnswer
            ? isAnswer
              ? "border-success bg-success/15"
              : myPick
                ? "border-destructive bg-destructive/15"
                : "border-border bg-secondary/20 opacity-60"
            : myPick
              ? mine?.is_correct
                ? "border-success bg-success/15"
                : "border-destructive bg-destructive/15"
              : mine
                ? "border-border bg-secondary/20 opacity-60"
                : "border-border bg-secondary/40 hover:border-primary";
          return (
            <button
              key={i}
              onClick={() => void answer(i)}
              disabled={!!mine || completed}
              className={`flex items-center justify-between rounded-xl border px-4 py-3.5 text-left text-sm font-medium transition-colors ${state2}`}
            >
              <span>{opt}</span>
              {(revealAnswer && isAnswer) || (myPick && mine?.is_correct) ? (
                <CheckCircle2 className="size-4 text-success" />
              ) : myPick && !mine?.is_correct ? (
                <XCircle className="size-4 text-destructive" />
              ) : null}
            </button>
          );
        })}
      </div>

      {mine && (
        <p
          className={`mt-5 text-sm font-semibold ${mine.is_correct ? "text-success" : "text-destructive"}`}
        >
          {mine.is_correct
            ? `Correct! +${POINTS_CORRECT} Points`
            : `Wrong! ${POINTS_WRONG} Points — other teams can still answer.`}
        </p>
      )}
      {flash && <p className="mt-3 text-sm text-muted-foreground">{flash}</p>}
      {!mine && completed && (
        <p className="mt-5 text-sm text-muted-foreground">
          {state?.winner_team_id
            ? `${teamName(state.winner_team_id)} answered first and correctly. No points for your team.`
            : "No correct answer in time — nobody scores this question."}
        </p>
      )}

      <div className="mt-6 rounded-xl border border-border bg-secondary/20 p-4">
        <p className="flex items-center gap-2 font-mono text-[11px] tracking-[0.2em] text-muted-foreground">
          <Users className="size-3.5" /> ANSWER ORDER ({given.length}/{teams.length})
        </p>
        {given.length === 0 ? (
          <p className="mt-2 text-sm text-muted-foreground">No team has answered yet.</p>
        ) : (
          <ol className="mt-3 space-y-2">
            {given.map((a) => (
              <li key={a.id} className="flex items-center justify-between text-sm">
                <span>
                  <span className="font-mono text-xs text-muted-foreground">#{a.answer_order}</span>{" "}
                  <span className="font-semibold">{teamName(a.team_id)}</span>
                </span>
                <span
                  className={`font-mono text-xs ${a.is_correct ? "text-success" : "text-destructive"}`}
                >
                  {a.is_correct ? `+${POINTS_CORRECT}` : POINTS_WRONG}
                </span>
              </li>
            ))}
          </ol>
        )}
      </div>

      {completed && (
        <div className="mt-6 flex justify-end">
          <button
            onClick={() => setAdvancedTo(index + 1)}
            className="btn-primary hover:btn-primary-hover"
          >
            {index + 1 >= questions.length ? "Finish round" : "Next question"}
            <ArrowRight className="size-4" />
          </button>
        </div>
      )}
    </div>
  );
}

function RoundOver({
  round,
  teams,
  onFinalize,
}: {
  round: number;
  teams: Group[];
  onFinalize: () => Promise<void>;
}) {
  useEffect(() => {
    void onFinalize();
  }, [onFinalize]);

  const ranked = [...teams].sort((a, b) => (b.scores[round] ?? 0) - (a.scores[round] ?? 0));

  return (
    <div className="panel mt-8 p-8 text-center">
      <span className="accent-gradient mx-auto grid size-14 place-items-center rounded-2xl">
        <Trophy className="size-7 text-primary-foreground" />
      </span>
      <h2 className="mt-5 font-display text-2xl font-black">Round {round} finished</h2>
      <ul className="mx-auto mt-6 max-w-sm space-y-2 text-left">
        {ranked.map((g, i) => (
          <li
            key={g.id}
            className="flex items-center justify-between rounded-xl border border-border bg-secondary/30 px-4 py-3 text-sm"
          >
            <span className="font-semibold">
              {i + 1}. {g.name}
            </span>
            <span className="font-mono text-primary">{g.scores[round] ?? 0} pts</span>
          </li>
        ))}
      </ul>
      {round === 3 && ranked.length === 2 && (
        <div className="mt-6 rounded-xl border border-primary/40 bg-primary/10 p-5">
          <h3 className="font-display text-2xl font-black">WINNER</h3>
          <p className="mt-2 text-lg font-bold">{ranked[0]!.name}</p>
          <p className="font-mono text-sm text-primary">
            Final round score: {ranked[0]!.scores[3] ?? 0}
          </p>
          <p className="mt-3 text-sm text-muted-foreground">
            Runner-up: <span className="font-semibold text-foreground">{ranked[1]!.name}</span> ·{" "}
            {ranked[1]!.scores[3] ?? 0} pts
          </p>
        </div>
      )}
      <div className="mt-7 flex flex-wrap justify-center gap-3">
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
