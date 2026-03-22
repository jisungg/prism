import { requireUser } from "@/lib/auth";

export default async function DashboardPage() {
  const user = await requireUser();

  return (
    <main className="relative min-h-screen overflow-hidden bg-[var(--color-surface)] px-6 py-12 text-[var(--color-ink)]">
      <div className="pointer-events-none absolute inset-0 opacity-100">
        <div className="prism-wash absolute inset-0" />
        <div className="prism-caustic absolute inset-0" />
        <div className="prism-beam absolute left-[-8%] top-[20%] h-[28rem] w-[42rem]" />
        <div className="prism-spectrum absolute left-[26%] top-[28%] h-[20rem] w-[44rem]" />
        <div className="prism-spectrum prism-spectrum-late absolute right-[-8%] bottom-[8%] h-[18rem] w-[34rem]" />
        <div className="prism-shard absolute left-[42%] top-[22%] h-40 w-28" />
      </div>

      <section className="relative mx-auto flex min-h-[calc(100vh-6rem)] w-full max-w-6xl flex-col gap-20 px-2 py-10 animate-auth-in">
        <div className="flex items-start justify-between gap-6">
          <div className="space-y-5">
            <p className="text-[0.68rem] uppercase tracking-[0.42em] text-[var(--color-muted)]">
              Prism
            </p>
            <div className="space-y-4">
              <h1 className="text-5xl font-semibold tracking-[-0.07em]">
                Welcome, {user.username}
              </h1>
              <p className="max-w-2xl text-sm leading-7 text-[var(--color-muted)]">
                The auth layer is active. This is now the protected surface where
                imports, profiles, reports, and prep workflows can attach next.
              </p>
            </div>
          </div>

          <form action="/api/auth/logout" method="post">
            <button className="rounded-full bg-white/60 px-5 py-3 text-[0.72rem] uppercase tracking-[0.24em] text-[var(--color-muted)] shadow-[0_18px_34px_-28px_rgba(23,22,20,0.45)] transition hover:-translate-y-px hover:bg-white/80 hover:text-[var(--color-ink)]" type="submit">
              Logout
            </button>
          </form>
        </div>

        <div className="thin-rule" />

        <div className="dashboard-cluster flex flex-col gap-12 md:flex-row md:items-start md:justify-between">
          <article className="dashboard-card max-w-sm">
            <p className="dashboard-label">Account</p>
            <p className="dashboard-value">{user.username}</p>
            <p className="dashboard-copy">{user.email}</p>
          </article>

          <article className="dashboard-card max-w-sm pt-2 md:pt-0">
            <p className="dashboard-label">Status</p>
            <p className="dashboard-value">Authenticated</p>
            <p className="dashboard-copy">Session-backed access is working.</p>
          </article>

          <article className="dashboard-card max-w-sm pt-2 md:pt-0">
            <p className="dashboard-label">Next</p>
            <p className="dashboard-value">Build imports</p>
            <p className="dashboard-copy">
              PGN ingestion can now be added behind a protected route.
            </p>
          </article>
        </div>
      </section>
    </main>
  );
}
