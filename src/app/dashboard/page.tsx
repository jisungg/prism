import { requireUser } from "@/lib/auth";

export default async function DashboardPage() {
  const user = await requireUser();

  return (
    <main className="relative min-h-screen overflow-hidden px-6 py-8 text-[var(--color-ink)] sm:px-8">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_10%_10%,rgba(255,255,255,0.95),transparent_22rem),radial-gradient(circle_at_90%_0%,rgba(0,113,227,0.08),transparent_18rem)]" />
      <div className="pointer-events-none absolute right-[-10rem] top-[-8rem] h-[26rem] w-[26rem] rounded-full bg-[radial-gradient(circle_at_35%_35%,rgba(114,160,255,0.95),rgba(104,94,255,0.45)_48%,rgba(255,255,255,0)_72%)] opacity-80" />
      <div className="pointer-events-none absolute bottom-[-10rem] left-[-8rem] h-[24rem] w-[24rem] rounded-full bg-[radial-gradient(circle_at_35%_35%,rgba(255,188,137,0.88),rgba(255,117,117,0.3)_52%,rgba(255,255,255,0)_74%)] opacity-70" />

      <section className="relative mx-auto flex min-h-screen w-full max-w-7xl animate-[rise-in_720ms_cubic-bezier(0.2,0.7,0.2,1)_both] flex-col">
        <div className="flex items-start justify-between gap-6 py-4">
          <div className="space-y-4">
            <p className="text-[0.7rem] font-semibold uppercase tracking-[0.18em] text-[var(--color-muted)]">Prism</p>
            <div className="space-y-4">
              <h1 className="max-w-[12ch] text-4xl font-semibold tracking-[-0.085em] text-[#111114] sm:text-7xl">
                Welcome, {user.username}
              </h1>
              <p className="max-w-2xl text-[1rem] leading-8 text-[var(--color-muted)]">
                Your preparation workspace is live. Start organizing opponent research, opening ideas, and the reports you want before the next round.
              </p>
            </div>
          </div>

          <form action="/api/auth/logout" method="post">
            <button
              className="inline-flex min-h-12 items-center rounded-full border border-[var(--color-line)] bg-white/55 px-5 text-[0.74rem] font-semibold uppercase tracking-[0.14em] text-[var(--color-muted)] transition hover:-translate-y-px hover:bg-white/80 hover:text-[var(--color-ink)]"
              type="submit"
            >
              Logout
            </button>
          </form>
        </div>

        <div className="grid flex-1 gap-16 py-16 lg:grid-cols-[minmax(0,1.35fr)_minmax(18rem,0.85fr)]">
          <div className="space-y-16">
            <section className="space-y-5">
              <p className="text-[0.7rem] font-semibold uppercase tracking-[0.18em] text-[var(--color-muted)]">Overview</p>
              <p className="max-w-[15ch] text-3xl font-semibold tracking-[-0.075em] text-[#111114] sm:text-5xl">
                Build a better read on each opponent.
              </p>
              <p className="max-w-2xl text-[1rem] leading-8 text-[var(--color-muted)]">
                This workspace is meant for collecting games, spotting tendencies, and turning that information into practical opening prep and matchup plans.
              </p>
            </section>

            <section className="grid gap-10 border-t border-[var(--color-line)] pt-10 md:grid-cols-3">
              <article className="space-y-3">
                <p className="text-[0.7rem] font-semibold uppercase tracking-[0.18em] text-[var(--color-muted)]">Account</p>
                <p className="text-2xl font-semibold tracking-[-0.05em] text-[#111114]">{user.username}</p>
                <p className="text-[0.98rem] leading-7 text-[var(--color-muted)]">{user.email}</p>
              </article>

              <article className="space-y-3">
                <p className="text-[0.7rem] font-semibold uppercase tracking-[0.18em] text-[var(--color-muted)]">Status</p>
                <p className="text-2xl font-semibold tracking-[-0.05em] text-[#111114]">Authenticated</p>
                <p className="text-[0.98rem] leading-7 text-[var(--color-muted)]">Session-backed access is working across the protected route.</p>
              </article>

              <article className="space-y-3">
                <p className="text-[0.7rem] font-semibold uppercase tracking-[0.18em] text-[var(--color-muted)]">Next</p>
                <p className="text-2xl font-semibold tracking-[-0.05em] text-[#111114]">Build imports</p>
                <p className="text-[0.98rem] leading-7 text-[var(--color-muted)]">PGN ingestion unlocks player histories, opening frequencies, and prep reports from real games.</p>
              </article>
            </section>
          </div>

          <aside className="self-start space-y-8 border-t border-[var(--color-line)] pt-10 lg:border-l lg:border-t-0 lg:pl-10 lg:pt-0">
            <div className="space-y-4">
              <p className="text-[0.7rem] font-semibold uppercase tracking-[0.18em] text-[var(--color-muted)]">Readiness</p>
              <h2 className="text-3xl font-semibold tracking-[-0.07em] text-[#111114]">Foundation in place.</h2>
              <p className="text-[1rem] leading-8 text-[var(--color-muted)]">
                Authentication and routing are ready. The next layer is the actual product work: imports, profiles, opening summaries, and opponent scouting.
              </p>
            </div>

            <div className="space-y-3">
              <p className="text-[0.7rem] font-semibold uppercase tracking-[0.18em] text-[var(--color-muted)]">Suggested Modules</p>
              <p className="text-[0.98rem] leading-7 text-[var(--color-muted)]">
                Imports, player cards, repertoire views, and matchup reports.
              </p>
            </div>
          </aside>
        </div>
      </section>
    </main>
  );
}
