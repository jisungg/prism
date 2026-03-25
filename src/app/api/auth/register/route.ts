import { NextResponse } from "next/server";
import {
  buildErrorRedirect,
  createSession,
  createUser,
} from "@/lib/auth";

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export async function POST(request: Request) {
  const contentType = request.headers.get("content-type") ?? "";

  if (contentType.includes("application/json")) {
    const body = (await request.json()) as {
      email?: string;
      username?: string;
      password?: string;
    };

    const email = String(body.email ?? "").trim();
    const username = String(body.username ?? "").trim();
    const password = String(body.password ?? "");

    if (!email || !username || !password) {
      return NextResponse.json({ error: "Fill in each field to continue." }, { status: 400 });
    }

    if (!isValidEmail(email)) {
      return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
    }

    if (username.length < 3) {
      return NextResponse.json({ error: "Usernames need at least 3 characters." }, { status: 400 });
    }

    if (password.length < 8) {
      return NextResponse.json({ error: "Passwords need at least 8 characters." }, { status: 400 });
    }

    try {
      const user = await createUser({
        email,
        username,
        password,
      });

      await createSession(user.id);

      return NextResponse.json({ ok: true });
    } catch (error) {
      if (
        typeof error === "object" &&
        error !== null &&
        "code" in error &&
        error.code === "23505"
      ) {
        return NextResponse.json({ error: "That username or email is already taken." }, { status: 400 });
      }

      throw error;
    }
  }

  const formData = await request.formData();
  const email = String(formData.get("email") ?? "").trim();
  const username = String(formData.get("username") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!email || !username || !password) {
    return NextResponse.redirect(
      new URL(buildErrorRedirect("/register", "Fill in all fields."), request.url),
      { status: 303 },
    );
  }

  if (!isValidEmail(email)) {
    return NextResponse.redirect(
      new URL(buildErrorRedirect("/register", "Enter a valid email address."), request.url),
      { status: 303 },
    );
  }

  if (username.length < 3) {
    return NextResponse.redirect(
      new URL(buildErrorRedirect("/register", "Username must be at least 3 characters."), request.url),
      { status: 303 },
    );
  }

  if (password.length < 8) {
    return NextResponse.redirect(
      new URL(buildErrorRedirect("/register", "Password must be at least 8 characters."), request.url),
      { status: 303 },
    );
  }

  try {
    const user = await createUser({
      email,
      username,
      password,
    });

    await createSession(user.id);

    return NextResponse.redirect(new URL("/dashboard", request.url), { status: 303 });
  } catch (error) {
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === "23505"
    ) {
      return NextResponse.redirect(
        new URL(buildErrorRedirect("/register", "That email or username is already in use."), request.url),
        { status: 303 },
      );
    }

    throw error;
  }
}
