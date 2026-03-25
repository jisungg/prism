export default function DashboardLoading() {
  return (
    <main className="relative min-h-screen overflow-hidden px-6 py-8 text-[var(--color-ink)] sm:px-8">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_10%_10%,rgba(255,255,255,0.95),transparent_22rem),radial-gradient(circle_at_90%_0%,rgba(0,113,227,0.08),transparent_18rem)]" />
      <section className="relative mx-auto flex min-h-screen w-full max-w-7xl flex-col animate-[rise-in_300ms_ease-out_both]">
        <div className="flex items-start justify-between gap-6 py-4">
          <div className="space-y-4">
            <div className="h-3 w-16 rounded-full bg-black/8" />
            <div className="space-y-4">
              <div className="h-14 w-[22rem] max-w-full rounded-[1rem] bg-black/8 sm:h-20 sm:w-[34rem]" />
              <div className="h-5 w-[28rem] max-w-full rounded-full bg-black/6" />
            </div>
          </div>

          <div className="h-12 w-24 rounded-full bg-black/6" />
        </div>

        <div className="grid flex-1 gap-16 py-16 lg:grid-cols-[minmax(0,1.35fr)_minmax(18rem,0.85fr)]">
          <div className="space-y-16">
            <section className="space-y-5">
              <div className="h-3 w-20 rounded-full bg-black/8" />
              <div className="h-12 w-[24rem] max-w-full rounded-[1rem] bg-black/8 sm:h-16" />
              <div className="h-5 w-[34rem] max-w-full rounded-full bg-black/6" />
            </section>

            <section className="grid gap-10 border-t border-[var(--color-line)] pt-10 md:grid-cols-3">
              <div className="space-y-3">
                <div className="h-3 w-18 rounded-full bg-black/8" />
                <div className="h-8 w-32 rounded-full bg-black/8" />
                <div className="h-4 w-40 rounded-full bg-black/6" />
              </div>

              <div className="space-y-3">
                <div className="h-3 w-16 rounded-full bg-black/8" />
                <div className="h-8 w-36 rounded-full bg-black/8" />
                <div className="h-4 w-48 rounded-full bg-black/6" />
              </div>

              <div className="space-y-3">
                <div className="h-3 w-12 rounded-full bg-black/8" />
                <div className="h-8 w-36 rounded-full bg-black/8" />
                <div className="h-4 w-52 rounded-full bg-black/6" />
              </div>
            </section>
          </div>

          <aside className="self-start space-y-8 border-t border-[var(--color-line)] pt-10 lg:border-l lg:border-t-0 lg:pl-10 lg:pt-0">
            <div className="space-y-4">
              <div className="h-3 w-20 rounded-full bg-black/8" />
              <div className="h-10 w-56 rounded-[1rem] bg-black/8" />
              <div className="h-5 w-64 rounded-full bg-black/6" />
            </div>
          </aside>
        </div>
      </section>
    </main>
  );
}
