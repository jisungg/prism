import Link from "next/link";
import { requireCurrentPlayer, requireUser } from "@/lib/auth";

const TABS = [
  { id: "overview", label: "Overview" },
  { id: "imports", label: "Imports" },
  { id: "reports", label: "Reports" },
  { id: "opponents", label: "Opponents" },
  { id: "account", label: "Account" },
] as const;

type DashboardTab = (typeof TABS)[number]["id"];

function resolveTab(tab?: string): DashboardTab {
  if (TABS.some((item) => item.id === tab)) {
    return tab as DashboardTab;
  }

  return "overview";
}

function TabPanel({
  tab,
  user,
  player,
}: {
  tab: DashboardTab;
  user: Awaited<ReturnType<typeof requireUser>>;
  player: Awaited<ReturnType<typeof requireCurrentPlayer>>;
}) {
  if (tab === "imports") {
    return (
      <section className="flex h-full min-h-0 flex-col gap-10">
        <header className="space-y-2">
          <p className="text-[0.76rem] font-medium tracking-[-0.01em] text-black/42">Imports</p>
          <h1 className="text-[2rem] tracking-[-0.05em] text-[#0f1014]">Bring in games.</h1>
        </header>

        <div className="grid flex-1 min-h-0 gap-12 border-t border-black/10 pt-8 lg:grid-cols-[minmax(0,1.1fr)_minmax(16rem,0.75fr)]">
          <div className="grid content-start gap-5">
            <p className="text-[1rem] font-medium tracking-[-0.03em] text-[#111114]">PGN upload</p>
            <p className="text-[1rem] font-medium tracking-[-0.03em] text-[#111114]">Connected sources</p>
          </div>

          <div className="space-y-3 border-t border-black/10 pt-6 lg:border-l lg:border-t-0 lg:pl-10 lg:pt-0">
            <p className="text-[0.76rem] font-medium tracking-[-0.01em] text-black/42">Recent</p>
            <p className="text-[1rem] tracking-[-0.03em] text-[#111114]">Empty</p>
          </div>
        </div>
      </section>
    );
  }

  if (tab === "reports") {
    return (
      <section className="flex h-full min-h-0 flex-col gap-10">
        <header className="space-y-2">
          <p className="text-[0.76rem] font-medium tracking-[-0.01em] text-black/42">Reports</p>
          <h1 className="text-[2rem] tracking-[-0.05em] text-[#0f1014]">Prep outputs.</h1>
        </header>

        <div className="grid flex-1 min-h-0 gap-0 border-t border-black/10 pt-2">
          <div className="grid gap-3 border-b border-black/8 py-5 sm:grid-cols-[12rem_minmax(0,1fr)]">
            <p className="text-[0.76rem] font-medium tracking-[-0.01em] text-black/42">Opponent briefs</p>
            <p className="text-[1rem] tracking-[-0.03em] text-[#111114]">Briefs</p>
          </div>
          <div className="grid gap-3 py-5 sm:grid-cols-[12rem_minmax(0,1fr)]">
            <p className="text-[0.76rem] font-medium tracking-[-0.01em] text-black/42">Repertoire notes</p>
            <p className="text-[1rem] tracking-[-0.03em] text-[#111114]">Notes</p>
          </div>
        </div>
      </section>
    );
  }

  if (tab === "opponents") {
    return (
      <section className="flex h-full min-h-0 flex-col gap-10">
        <header className="space-y-2">
          <p className="text-[0.76rem] font-medium tracking-[-0.01em] text-black/42">Opponents</p>
          <h1 className="text-[2rem] tracking-[-0.05em] text-[#0f1014]">Track players.</h1>
        </header>

        <div className="grid flex-1 min-h-0 gap-0 border-t border-black/10 pt-2">
          <div className="grid gap-3 border-b border-black/8 py-5 sm:grid-cols-[12rem_minmax(0,1fr)]">
            <p className="text-[0.76rem] font-medium tracking-[-0.01em] text-black/42">Search</p>
            <p className="text-[1rem] tracking-[-0.03em] text-[#111114]">Player lookup</p>
          </div>
          <div className="grid gap-3 py-5 sm:grid-cols-[12rem_minmax(0,1fr)]">
            <p className="text-[0.76rem] font-medium tracking-[-0.01em] text-black/42">Watchlist</p>
            <p className="text-[1rem] tracking-[-0.03em] text-[#111114]">Tracked players</p>
          </div>
        </div>
      </section>
    );
  }

  if (tab === "account") {
    return (
      <section className="flex h-full min-h-0 flex-col gap-10">
        <header className="space-y-2">
          <p className="text-[0.76rem] font-medium tracking-[-0.01em] text-black/42">Account</p>
          <h1 className="text-[2rem] tracking-[-0.05em] text-[#0f1014]">Player identity.</h1>
        </header>

        <div className="grid flex-1 min-h-0 gap-14 border-t border-black/10 pt-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
          <div className="space-y-6">
            <div className="space-y-2">
              <p className="text-[0.76rem] font-medium tracking-[-0.01em] text-black/42">Username</p>
              <p className="text-[1.1rem] tracking-[-0.03em] text-[#111114]">{user.username}</p>
            </div>
            <div className="space-y-2">
              <p className="text-[0.76rem] font-medium tracking-[-0.01em] text-black/42">Player</p>
              <p className="text-[1.1rem] tracking-[-0.03em] text-[#111114]">{player.displayName}</p>
            </div>
            <div className="space-y-2">
              <p className="text-[0.76rem] font-medium tracking-[-0.01em] text-black/42">Profile type</p>
              <p className="text-[1.1rem] capitalize tracking-[-0.03em] text-[#111114]">{player.relationshipType}</p>
            </div>
          </div>

          <div className="space-y-6">
            <div className="space-y-2">
              <p className="text-[0.76rem] font-medium tracking-[-0.01em] text-black/42">Chess.com</p>
              <p className="text-[0.98rem] leading-7 text-[var(--color-muted)]">Not connected</p>
            </div>
            <div className="space-y-2">
              <p className="text-[0.76rem] font-medium tracking-[-0.01em] text-black/42">Lichess</p>
              <p className="text-[0.98rem] leading-7 text-[var(--color-muted)]">Not connected</p>
            </div>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="flex h-full min-h-0 flex-col gap-10">
      <header className="space-y-2">
        <p className="text-[0.76rem] font-medium tracking-[-0.01em] text-black/42">Overview</p>
        <h1 className="text-[2rem] tracking-[-0.05em] text-[#0f1014]">Workspace</h1>
      </header>

      <div className="grid flex-1 min-h-0 gap-12 lg:grid-cols-[minmax(18rem,0.9fr)_minmax(0,1.35fr)]">
          <div className="space-y-8 border-t border-black/10 pt-8">
            <div className="space-y-3">
              <p className="text-[0.76rem] font-medium tracking-[-0.01em] text-black/42">Next</p>
              <p className="text-[1rem] font-medium tracking-[-0.03em] text-[#111114]">Import your games</p>
            </div>

            <div className="space-y-3">
              <p className="text-[0.76rem] font-medium tracking-[-0.01em] text-black/42">Profile</p>
              <p className="text-[1rem] font-medium tracking-[-0.03em] text-[#111114]">{player.displayName}</p>
            </div>
          </div>

        <div className="flex min-h-0 items-start border-t border-black/10 pt-8 lg:justify-end">
          <div className="aspect-square h-full max-h-[100%] w-full max-w-[36rem] border border-black/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.45),rgba(255,255,255,0.08))]">
            <div className="grid h-full grid-cols-8 grid-rows-8">
              {Array.from({ length: 64 }).map((_, index) => {
                const row = Math.floor(index / 8);
                const col = index % 8;
                const isDark = (row + col) % 2 === 1;

                return <div key={index} className={isDark ? "bg-black/[0.045]" : "bg-transparent"} />;
              })}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams?: Promise<{ tab?: string }>;
}) {
  const user = await requireUser();
  const player = await requireCurrentPlayer();
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const activeTab = resolveTab(resolvedSearchParams?.tab);

  return (
    <main className="h-screen overflow-hidden bg-[#f7f7f5] px-8 py-8 text-[var(--color-ink)] lg:px-12 lg:py-10">
      <section className="mx-auto flex h-full max-w-[1180px] flex-col overflow-hidden animate-[rise-in_720ms_cubic-bezier(0.2,0.7,0.2,1)_both]">
        <header className="flex items-start justify-between gap-8 border-b border-black/10 pb-8">
          <div className="space-y-2">
            <p className="text-[0.7rem] font-semibold uppercase tracking-[0.18em] text-[var(--color-muted)]">Prism</p>
            <h1 className="text-[clamp(2.4rem,5vw,4.4rem)] leading-[0.95] tracking-[-0.06em] text-[#0f1014]">
              Chess preparation.
            </h1>
          </div>

          <form action="/api/auth/logout" method="post">
            <button
              className="inline-flex min-h-11 items-center justify-center px-0 text-[1rem] font-semibold tracking-[-0.02em] text-[#111114] transition duration-200 hover:text-black/60"
              type="submit"
            >
              Log out
            </button>
          </form>
        </header>

        <nav className="flex shrink-0 gap-10 overflow-x-auto py-6">
          {TABS.map((tab) => {
            const isActive = tab.id === activeTab;

            return (
              <Link
                key={tab.id}
                href={tab.id === "overview" ? "/dashboard" : `/dashboard?tab=${tab.id}`}
                className={[
                  "shrink-0 px-0 py-2 text-[0.98rem] tracking-[-0.02em] transition duration-200",
                  isActive
                    ? "font-semibold text-[#111114]"
                    : "text-[var(--color-muted)] hover:text-[#111114]",
                ].join(" ")}
              >
                {tab.label}
              </Link>
            );
          })}
        </nav>

        <div className="min-h-0 flex-1 overflow-hidden border-t border-black/10 pt-10">
          <TabPanel tab={activeTab} user={user} player={player} />
        </div>
      </section>
    </main>
  );
}
