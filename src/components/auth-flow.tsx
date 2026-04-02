"use client";

import { startTransition, useEffect, useEffectEvent, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

const USER_MOVES = ["e2→e4", "d2→d4", "c2→c4", "f2→f3", "g2→g3"];
const PASS_MOVES = ["Ng1→f3", "Bc1→e3", "Qd1→h5", "Rd1→d4", "Ke1→g1"];
const SUCCESS_OVERLAY_DELAY_MS = 900;
const DASHBOARD_REDIRECT_MS = 2400;

export function AuthFlow() {
  const router = useRouter();
  const timeoutIdsRef = useRef<number[]>([]);
  const [hasMounted, setHasMounted] = useState(false);
  const [isBusy, setIsBusy] = useState(false);
  const [isSuccessVisible, setIsSuccessVisible] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [hasAuthError, setHasAuthError] = useState(false);
  const [ghostUserMove, setGhostUserMove] = useState("");
  const [ghostPassMove, setGhostPassMove] = useState("");
  const [userMoveIndex, setUserMoveIndex] = useState(0);
  const [passMoveIndex, setPassMoveIndex] = useState(0);

  useEffect(() => {
    setHasMounted(true);
    setIsSuccessVisible(false);

    return () => {
      for (const timeoutId of timeoutIdsRef.current) {
        window.clearTimeout(timeoutId);
      }
    };
  }, []);

  function rememberTimeout(callback: () => void, delay: number) {
    const timeoutId = window.setTimeout(() => {
      callback();
      timeoutIdsRef.current = timeoutIdsRef.current.filter(
        (id) => id !== timeoutId,
      );
    }, delay);

    timeoutIdsRef.current.push(timeoutId);
  }

  function triggerSuccess() {
    rememberTimeout(() => {
      setIsSuccessVisible(true);
    }, SUCCESS_OVERLAY_DELAY_MS);

    rememberTimeout(() => {
      setIsSuccessVisible(false);
      startTransition(() => {
        router.push("/dashboard");
        router.refresh();
      });
    }, DASHBOARD_REDIRECT_MS);
  }

  async function submit(endpoint: "/api/auth/login" | "/api/auth/register") {
    const trimmedUsername = username.trim();
    setHasAuthError(false);

    if (!trimmedUsername || !password) {
      setHasAuthError(true);
      return;
    }

    setIsBusy(true);

    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          username: trimmedUsername,
          password,
        }),
      });

      if (!response.ok) {
        setHasAuthError(true);
        return;
      }

      triggerSuccess();
    } catch {
      setHasAuthError(true);
    } finally {
      setIsBusy(false);
    }
  }

  async function handleLogin() {
    if (isBusy || isSuccessVisible) {
      return;
    }

    await submit("/api/auth/login");
  }

  const onEnterKey = useEffectEvent(() => {
    void handleLogin();
  });

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Enter") {
        event.preventDefault();
        onEnterKey();
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  function onUsernameChange(value: string) {
    setUsername(value);
    setHasAuthError(false);

    if (!value) {
      setGhostUserMove("");
      return;
    }

    setGhostUserMove(USER_MOVES[userMoveIndex % USER_MOVES.length]);
    setUserMoveIndex((current) => current + 1);
  }

  function onPasswordChange(value: string) {
    setPassword(value);
    setHasAuthError(false);

    if (!value) {
      setGhostPassMove("");
      return;
    }

    setGhostPassMove(PASS_MOVES[passMoveIndex % PASS_MOVES.length]);
    setPassMoveIndex((current) => current + 1);
  }

  return (
    <main className="min-h-screen bg-[#f7f7f5] text-[var(--color-ink)]">
      <div className="mx-auto grid min-h-screen max-w-[1180px] items-center gap-24 px-8 py-16 lg:grid-cols-[minmax(0,1fr)_minmax(0,24rem)] lg:px-12 lg:py-20">
        <section className="animate-[rise-in_720ms_cubic-bezier(0.2,0.7,0.2,1)_both] self-center">
          <div className="max-w-[33rem]">
            <h1 className="max-w-[12ch] text-[clamp(3rem,7vw,5.25rem)] leading-[0.94] tracking-[-0.045em] text-[#0f1014] text-balance">
              A chess community for review and explanation.
            </h1>
            <p className="mt-6 max-w-[30rem] text-[1.05rem] leading-[1.7] text-[var(--color-muted)]">
              Welcome back. Log in to continue your games, reviews, and community discussions.
            </p>
          </div>
        </section>

        <section className="w-full max-w-[24rem] self-center justify-self-center">
          <div>
            <div className="space-y-8">
              <div className="relative">
                <label
                  className="block text-[0.76rem] font-medium tracking-[-0.01em] text-black/42"
                  htmlFor="inp-user"
                >
                  Username
                </label>
                <input
                  id="inp-user"
                  className={[
                    "mt-3 block w-full border-0 border-b bg-transparent px-0 pb-3 text-[1.15rem] tracking-[-0.03em] text-[var(--color-ink)] outline-none transition duration-200 placeholder:text-black/25",
                    hasAuthError
                      ? "border-[#d11a2a] focus:border-[#d11a2a]"
                      : "border-black/10 focus:border-black/35",
                  ].join(" ")}
                  type="text"
                  placeholder="your handle"
                  autoComplete="username"
                  value={username}
                  onChange={(event) => onUsernameChange(event.target.value)}
                />
                <span
                  className={[
                    "pointer-events-none absolute bottom-3 right-0 font-mono text-[0.64rem] tracking-[0.05em] text-[rgba(0,113,227,0.72)] transition-opacity duration-200",
                    ghostUserMove ? "opacity-100" : "opacity-0",
                  ].join(" ")}
                >
                  {ghostUserMove}
                </span>
              </div>

              <div className="relative">
                <label
                  className="block text-[0.76rem] font-medium tracking-[-0.01em] text-black/42"
                  htmlFor="inp-pass"
                >
                  Password
                </label>
                <input
                  id="inp-pass"
                  className={[
                    "mt-3 block w-full border-0 border-b bg-transparent px-0 pb-3 text-[1.15rem] tracking-[-0.03em] text-[var(--color-ink)] outline-none transition duration-200 placeholder:text-black/25",
                    hasAuthError
                      ? "border-[#d11a2a] focus:border-[#d11a2a]"
                      : "border-black/10 focus:border-black/35",
                  ].join(" ")}
                  type="password"
                  placeholder="••••••••"
                  autoComplete="current-password"
                  value={password}
                  onChange={(event) => onPasswordChange(event.target.value)}
                />
                <span
                  className={[
                    "pointer-events-none absolute bottom-3 right-0 font-mono text-[0.64rem] tracking-[0.05em] text-[rgba(0,113,227,0.72)] transition-opacity duration-200",
                    ghostPassMove ? "opacity-100" : "opacity-0",
                  ].join(" ")}
                >
                  {ghostPassMove}
                </span>
              </div>
            </div>

            <div className="mt-5 min-h-[1.5rem]">
              <p
                className={[
                  "text-[0.9rem] tracking-[-0.01em] text-[#d11a2a] transition-opacity duration-150",
                  hasAuthError ? "opacity-100" : "opacity-0",
                ].join(" ")}
              >
                Failed to verify you.
              </p>
            </div>

            <div className="flex flex-col items-center lg:items-start">
              <button
                className="inline-flex min-h-11 items-center justify-center px-0 text-[1rem] font-semibold tracking-[-0.02em] text-[#111114] transition duration-200 hover:text-black/60 disabled:cursor-default disabled:opacity-60"
                type="button"
                onClick={() => void handleLogin()}
                disabled={isBusy}
              >
                {isBusy ? "Working" : "Continue"}
              </button>
              <p className="text-center text-[0.7rem] lg:text-left">
                Don&apos;t have an account?{" "}
                <Link
                  href="/register"
                  className="text-blue-500 underline decoration-[#0066cc] underline-offset-[0.18em]"
                >
                  Join Prism
                </Link>
                .
              </p>
            </div>
          </div>
        </section>
      </div>

      <div
        className={[
          "fixed inset-0 z-100 flex flex-col items-center justify-center bg-[rgba(245,245,247,0.82)] backdrop-blur-[20px] transition-opacity duration-4000",
          hasMounted && isSuccessVisible
            ? "pointer-events-auto opacity-100"
            : "pointer-events-none opacity-0",
        ].join(" ")}
      >
        <p className="text-[clamp(2.6rem,6vw,4.5rem)] font-semibold tracking-[-0.06em] text-[#111114]">
          Welcome back
        </p>
        <p className="mt-3 text-[0.76rem] font-semibold uppercase tracking-[0.14em] text-[var(--color-muted)]">
          Opening your community space
        </p>
      </div>
    </main>
  );
}
