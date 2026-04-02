"use client";

import { startTransition, useEffect, useEffectEvent, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

type SubmitStatus = {
  ok?: boolean;
  error?: string;
};

const SUCCESS_OVERLAY_DELAY_MS = 900;
const DASHBOARD_REDIRECT_MS = 2400;

export function RegisterFlow() {
  const router = useRouter();
  const timeoutIdsRef = useRef<number[]>([]);
  const [isBusy, setIsBusy] = useState(false);
  const [isSuccessVisible, setIsSuccessVisible] = useState(false);
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
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
      startTransition(() => {
        router.push("/dashboard");
        router.refresh();
      });
    }, DASHBOARD_REDIRECT_MS);
  }

  async function handleRegister() {
    if (isBusy || isSuccessVisible) {
      return;
    }

    setErrorMessage("");
    setIsBusy(true);

    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: email.trim(),
          username: username.trim(),
          password,
        }),
      });

      const result = (await response.json()) as SubmitStatus;

      if (!response.ok) {
        setErrorMessage(result.error ?? "Could not create your account.");
        return;
      }

      triggerSuccess();
    } catch {
      setErrorMessage("Could not create your account.");
    } finally {
      setIsBusy(false);
    }
  }

  const onEnterKey = useEffectEvent(() => {
    void handleRegister();
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

  const hasError = Boolean(errorMessage);

  return (
    <main className="min-h-screen bg-[#f7f7f5] text-[var(--color-ink)]">
      <div className="mx-auto grid min-h-screen max-w-[1180px] items-center gap-24 px-8 py-16 lg:grid-cols-[minmax(0,1fr)_minmax(0,24rem)] lg:px-12 lg:py-20">
        <section className="animate-[rise-in_720ms_cubic-bezier(0.2,0.7,0.2,1)_both] self-center">
          <div className="max-w-[33rem]">
            <h1 className="max-w-[11ch] text-[clamp(3rem,7vw,5.25rem)] leading-[0.94] tracking-[-0.045em] text-[#0f1014] text-balance">
              Create your first chess community.
            </h1>
            <p className="mt-6 max-w-[30rem] text-[1.05rem] leading-[1.7] text-[var(--color-muted)]">
              Welcome to Prism. Upload games from your side, request engine
              reviews, and build a space where stronger players can explain the
              ideas behind difficult moves.
            </p>
          </div>
        </section>

        <section className="w-full max-w-[24rem] self-center justify-self-center">
          <div>
            <div className="space-y-8">
              <div className="relative">
                <label
                  className="block text-[0.76rem] font-medium tracking-[-0.01em] text-black/42"
                  htmlFor="register-email"
                >
                  Email
                </label>
                <input
                  id="register-email"
                  className={[
                    "mt-3 block w-full border-0 border-b bg-transparent px-0 pb-3 text-[1.15rem] tracking-[-0.03em] text-[var(--color-ink)] outline-none transition duration-200 placeholder:text-black/25",
                    hasError
                      ? "border-[#d11a2a] focus:border-[#d11a2a]"
                      : "border-black/10 focus:border-black/35",
                  ].join(" ")}
                  type="email"
                  placeholder="you@example.com"
                  autoComplete="email"
                  value={email}
                  onChange={(event) => {
                    setEmail(event.target.value);
                    setErrorMessage("");
                  }}
                />
              </div>

              <div className="relative">
                <label
                  className="block text-[0.76rem] font-medium tracking-[-0.01em] text-black/42"
                  htmlFor="register-username"
                >
                  Username
                </label>
                <input
                  id="register-username"
                  className={[
                    "mt-3 block w-full border-0 border-b bg-transparent px-0 pb-3 text-[1.15rem] tracking-[-0.03em] text-[var(--color-ink)] outline-none transition duration-200 placeholder:text-black/25",
                    hasError
                      ? "border-[#d11a2a] focus:border-[#d11a2a]"
                      : "border-black/10 focus:border-black/35",
                  ].join(" ")}
                  type="text"
                  placeholder="pick a handle"
                  autoComplete="username"
                  value={username}
                  onChange={(event) => {
                    setUsername(event.target.value);
                    setErrorMessage("");
                  }}
                />
              </div>

              <div className="relative">
                <label
                  className="block text-[0.76rem] font-medium tracking-[-0.01em] text-black/42"
                  htmlFor="register-password"
                >
                  Secure password
                </label>
                <input
                  id="register-password"
                  className={[
                    "mt-3 block w-full border-0 border-b bg-transparent px-0 pb-3 text-[1.15rem] tracking-[-0.03em] text-[var(--color-ink)] outline-none transition duration-200 placeholder:text-black/25",
                    hasError
                      ? "border-[#d11a2a] focus:border-[#d11a2a]"
                      : "border-black/10 focus:border-black/35",
                  ].join(" ")}
                  type="password"
                  placeholder="at least 8 characters"
                  autoComplete="new-password"
                  value={password}
                  onChange={(event) => {
                    setPassword(event.target.value);
                    setErrorMessage("");
                  }}
                />
              </div>
            </div>

            <div className="mt-5 min-h-[1.5rem]">
              <p
                className={[
                  "text-[0.9rem] tracking-[-0.01em] text-[#d11a2a] transition-opacity duration-150",
                  hasError ? "opacity-100" : "opacity-0",
                ].join(" ")}
              >
                {errorMessage || "Could not create your account."}
              </p>
            </div>

            <div className="flex flex-col items-center lg:items-start">
              <button
                className="inline-flex min-h-11 items-center justify-center px-0 text-[1rem] font-semibold tracking-[-0.02em] text-[#111114] transition duration-200 hover:text-black/60 disabled:cursor-default disabled:opacity-60"
                type="button"
                onClick={() => void handleRegister()}
                disabled={isBusy}
              >
                {isBusy ? "Working" : "Create account"}
              </button>
              <p className="text-center text-[0.7rem] lg:text-left">
                Already have an account?{" "}
                <Link
                  href="/login"
                  className="text-[#0066cc] underline decoration-[#0066cc] underline-offset-[0.18em]"
                >
                  Sign in
                </Link>
                .
              </p>
            </div>
          </div>
        </section>
      </div>

      <div
        className={[
          "fixed inset-0 z-100 flex flex-col items-center justify-center bg-[rgba(245,245,247,0.82)] backdrop-blur-[20px] transition-opacity duration-500",
          isSuccessVisible
            ? "pointer-events-auto opacity-100"
            : "pointer-events-none opacity-0",
        ].join(" ")}
      >
        <p className="text-[clamp(2.6rem,6vw,4.5rem)] font-semibold tracking-[-0.06em] text-[#111114]">
          Account created
        </p>
        <p className="mt-3 text-[0.76rem] font-semibold uppercase tracking-[0.14em] text-[var(--color-muted)]">
          Opening your starter community
        </p>
      </div>
    </main>
  );
}
