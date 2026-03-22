"use client";

import { startTransition, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

type Stage =
  | "username"
  | "loginPassword"
  | "registerIntro"
  | "registerPassword"
  | "promotion"
  | "success";
type Mode = "login" | "register" | null;

type SubmitStatus = {
  ok?: boolean;
  exists?: boolean;
  error?: string;
};

const TRANSITION_MS = 680;
const EXIT_DELAY_MS = 1450;

export function AuthFlow() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [stage, setStage] = useState<Stage>("username");
  const [mode, setMode] = useState<Mode>(null);
  const [username, setUsername] = useState("");
  const [inputValue, setInputValue] = useState("");
  const [error, setError] = useState("");
  const [isBusy, setIsBusy] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [successCopy, setSuccessCopy] = useState("");
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    if (stage === "username" || stage === "loginPassword" || stage === "registerPassword") {
      inputRef.current?.focus();
    }
  }, [stage, isTransitioning]);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Enter") {
        if (stage === "username" || stage === "loginPassword" || stage === "registerPassword") {
          event.preventDefault();
          void handleForward();
          return;
        }
      }

      if (event.key === "Escape") {
        event.preventDefault();
        void handleBack();
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [stage, isBusy, isTransitioning, username]);

  function resetError() {
    if (error) {
      setError("");
    }
  }

  function currentFieldValue() {
    return inputRef.current?.value ?? inputValue;
  }

  function transitionTo(nextStage: Stage, nextValue = "") {
    setIsTransitioning(true);
    window.setTimeout(() => {
      setStage(nextStage);
      setInputValue(nextValue);
      setIsTransitioning(false);
    }, TRANSITION_MS);
  }

  function finishAuth(message: string) {
    setSuccessCopy(message);
    transitionTo("success");

    window.setTimeout(() => {
      setIsExiting(true);
    }, EXIT_DELAY_MS);

    window.setTimeout(() => {
      startTransition(() => {
        router.push("/dashboard");
        router.refresh();
      });
    }, EXIT_DELAY_MS + 700);
  }

  async function submitUsername() {
    const trimmed = currentFieldValue().trim();

    if (!trimmed) {
      setError("Enter a username to continue.");
      return;
    }

    if (trimmed.length < 3) {
      setError("Usernames need at least 3 characters.");
      return;
    }

    setIsBusy(true);
    resetError();

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          step: "identify",
          username: trimmed,
        }),
      });

      const result = (await response.json()) as SubmitStatus;

      if (!response.ok || typeof result.exists !== "boolean") {
        setError(result.error ?? "Something went wrong. Try again.");
        return;
      }

      setUsername(trimmed);
      if (result.exists) {
        setMode("login");
        transitionTo("loginPassword");
        return;
      }

      setMode("register");
      transitionTo("registerIntro");
    } catch {
      setError("Something went wrong. Try again.");
    } finally {
      setIsBusy(false);
    }
  }

  async function submitPassword() {
    const trimmed = currentFieldValue();

    if (!trimmed) {
      setError("Enter your password to continue.");
      return;
    }

    setIsBusy(true);
    resetError();

    try {
      if (mode === "login") {
        const response = await fetch("/api/auth/login", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            step: "password",
            username,
            password: trimmed,
          }),
        });

        const result = (await response.json()) as SubmitStatus;

        if (!response.ok) {
          setError(result.error ?? "Invalid username or password.");
          return;
        }

        finishAuth(`Welcome back to Prism, ${username}.`);
        return;
      } else {
        const response = await fetch("/api/auth/register", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            username,
            password: trimmed,
          }),
        });

        const result = (await response.json()) as SubmitStatus;

        if (!response.ok) {
          setError(result.error ?? "Something went wrong. Try again.");
          return;
        }

        transitionTo("promotion");
        return;
      }
    } catch {
      setError("Something went wrong. Try again.");
    } finally {
      setIsBusy(false);
    }
  }

  async function handleForward() {
    if (isBusy || isTransitioning) {
      return;
    }

    resetError();

    if (stage === "registerIntro") {
      transitionTo("registerPassword");
      return;
    }

    if (stage === "username") {
      await submitUsername();
      return;
    }

    if (stage === "loginPassword" || stage === "registerPassword") {
      await submitPassword();
      return;
    }

    if (stage === "promotion") {
      finishAuth(`Welcome to Prism, ${username}.`);
    }
  }

  async function handleBack() {
    if (isBusy || isTransitioning) {
      return;
    }

    resetError();

    if (stage === "loginPassword") {
      setMode(null);
      transitionTo("username", username);
      return;
    }

    if (stage === "registerIntro") {
      setMode(null);
      transitionTo("username", username);
      return;
    }

    if (stage === "registerPassword") {
      transitionTo("registerIntro");
      return;
    }

    if (stage === "promotion") {
      transitionTo("registerPassword");
    }
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (isBusy || isTransitioning) {
      return;
    }

    if (stage === "username") {
      await submitUsername();
      return;
    }

    if (stage === "loginPassword" || stage === "registerPassword") {
      await submitPassword();
    }
  }

  function inlineWidth(placeholder: string) {
    const width = Math.max(inputValue.length, placeholder.length, 8) + 1;
    return `min(52vw, ${width}ch)`;
  }

  function renderPrimaryLine() {
    if (stage === "success") {
      return <h1 className="auth-stage-title">{successCopy}</h1>;
    }

    if (stage === "promotion") {
      return (
        <pre className="auth-stage-ascii" aria-label="Pawn promoting to king">
{`   _           +
  (_)         /_\\
   |    ->    \\ /
  /_\\         /_\\
             /___\\`}
        </pre>
      );
    }

    if (stage === "registerIntro") {
      return (
        <h1 className="auth-stage-title auth-stage-title-copy">
          Welcome {username}, before we continue, we&apos;ll need to know more about you and your chess.
        </h1>
      );
    }

    if (stage === "loginPassword") {
      return (
        <h1 className="auth-stage-title auth-stage-title-compact">
          <span className={`auth-inline-slot ${error ? "auth-inline-slot-error" : ""}`}>
            <input
              ref={inputRef}
              className="auth-inline-input"
              type="password"
              style={{ width: inlineWidth("Password") }}
              value={inputValue}
              onChange={(event) => {
                setInputValue(event.target.value);
                resetError();
              }}
              placeholder="Password"
              autoCapitalize="none"
              autoCorrect="off"
              autoComplete="new-password"
              data-form-type="other"
              name="auth-login-password"
              spellCheck={false}
              aria-label="Password"
            />
          </span>
        </h1>
      );
    }

    if (stage === "registerPassword") {
      return (
        <h1 className="auth-stage-title auth-stage-title-copy">
          Enter a password:{" "}
          <span className={`auth-inline-slot ${error ? "auth-inline-slot-error" : ""}`}>
            <input
              ref={inputRef}
              className="auth-inline-input"
              type="password"
              style={{ width: inlineWidth("Password") }}
              value={inputValue}
              onChange={(event) => {
                setInputValue(event.target.value);
                resetError();
              }}
              placeholder="Password"
              autoCapitalize="none"
              autoCorrect="off"
              autoComplete="new-password"
              data-form-type="other"
              name="auth-register-password"
              spellCheck={false}
              aria-label="Password"
            />
          </span>
        </h1>
      );
    }

    return (
      <h1 className="auth-stage-title auth-stage-title-inline">
        Welcome
        <span className={`auth-inline-slot ${error ? "auth-inline-slot-error" : ""}`}>
          <input
            ref={inputRef}
            className="auth-inline-input"
            type="text"
            style={{ width: inlineWidth("username") }}
            value={inputValue}
            onChange={(event) => {
              setInputValue(event.target.value);
              resetError();
            }}
            placeholder="username"
            autoCapitalize="none"
            autoCorrect="off"
            autoComplete="off"
            data-form-type="other"
            name="auth-username"
            spellCheck={false}
            aria-label="Username"
          />
        </span>
      </h1>
    );
  }

  return (
    <main className={`auth-stage ${isExiting ? "auth-stage-exit" : ""}`}>
      <section className="auth-stage-inner">
        <p className="auth-stage-mark">Prism</p>

        <div className={`auth-copy-wrap ${isTransitioning ? "auth-copy-hidden" : ""}`}>
          {renderPrimaryLine()}
        </div>

        <form onSubmit={handleSubmit} className="auth-stage-form">
          {error ? <p className="auth-stage-error">{error}</p> : <div className="auth-stage-error-spacer" />}
        </form>

        {stage !== "success" ? (
          <div className="auth-stage-hint" aria-hidden="true">
            <p className="auth-stage-hint-line">
              <span className="auth-stage-key">Enter</span>
              <span>to go forward</span>
            </p>
            {stage !== "username" ? (
              <p className="auth-stage-hint-line">
                <span className="auth-stage-key">Esc</span>
                <span>to go back</span>
              </p>
            ) : null}
          </div>
        ) : null}
      </section>
    </main>
  );
}
