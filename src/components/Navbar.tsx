import { Link } from "@tanstack/react-router";
import { Zap } from "lucide-react";

const rounds = [1, 2, 3];

export function Navbar() {
  return (
    <header className="sticky top-0 z-50 border-b border-border/70 bg-background/80 backdrop-blur-xl">
      <nav className="mx-auto flex min-h-[70px] w-full max-w-6xl flex-wrap items-center justify-between gap-4 px-4 py-3 sm:px-6">
        <Link to="/" className="group flex items-center gap-3">
          <span className="accent-gradient grid size-10 shrink-0 place-items-center rounded-xl transition-transform duration-300 group-hover:scale-105">
            <Zap className="size-5 text-primary-foreground" />
          </span>
          <span className="flex flex-col leading-none">
            <span className="font-display text-sm font-extrabold tracking-tight sm:text-base">
              Fastest Finger First
            </span>
            <span className="mt-1 text-[10px] font-semibold tracking-[0.3em] text-muted-foreground">
              FFF QUIZ
            </span>
          </span>
        </Link>

        <ul className="flex flex-wrap items-center justify-end gap-1">
          <li>
            <Link
              to="/"
              activeOptions={{ exact: true }}
              activeProps={{ className: "bg-secondary text-foreground" }}
              className="rounded-full px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              Home
            </Link>
          </li>
          {rounds.map((r) => (
            <li key={r}>
              <Link
                to="/round/$round"
                params={{ round: String(r) }}
                activeProps={{ className: "bg-secondary text-foreground" }}
                className="rounded-full px-3 py-2 text-sm font-medium whitespace-nowrap text-muted-foreground transition-colors hover:text-foreground"
              >
                Round {r}
              </Link>
            </li>
          ))}
          <li>
            <Link
              to="/leaderboard"
              activeProps={{ className: "bg-secondary text-foreground" }}
              className="rounded-full px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              Leaderboard
            </Link>
          </li>
        </ul>
      </nav>
    </header>
  );
}
