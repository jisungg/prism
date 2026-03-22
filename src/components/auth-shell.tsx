import type { ReactNode } from "react";

type AuthShellProps = {
  title: string;
  error?: string;
  footer: ReactNode;
  children: ReactNode;
};

export function AuthShell({ title, error, footer, children }: AuthShellProps) {
  return (
    <main className="relative min-h-screen overflow-hidden bg-[var(--color-surface)] px-6 py-10 text-[var(--color-ink)]">
      <div className="pointer-events-none absolute inset-0 opacity-100">
        <div className="prism-wash absolute inset-0" />
        <div className="prism-caustic absolute inset-0" />
        <div className="prism-beam absolute left-[-8%] top-[20%] h-[28rem] w-[42rem]" />
        <div className="prism-spectrum absolute left-[26%] top-[28%] h-[20rem] w-[44rem]" />
        <div className="prism-spectrum prism-spectrum-late absolute right-[-8%] bottom-[8%] h-[18rem] w-[34rem]" />
        <div className="prism-shard absolute left-[42%] top-[22%] h-40 w-28" />
      </div>

      <div className="relative mx-auto flex min-h-[calc(100vh-5rem)] w-full max-w-6xl flex-col justify-between">
        <div className="animate-auth-in">
          <p className="auth-mark">Prism</p>
        </div>

        <section className="auth-layout animate-auth-in">
          <div className="auth-heading">
            <p className="auth-eyebrow">Access</p>
            <h1 className="auth-title">{title}</h1>
            {error ? <p className="max-w-md text-sm leading-6 text-[var(--color-muted)]">{error}</p> : null}
          </div>

          <div className="auth-form-rail">
            {children}
            <div className="auth-footer">{footer}</div>
          </div>
        </section>
      </div>
    </main>
  );
}
