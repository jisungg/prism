import { NextResponse } from "next/server";
import {
  buildErrorRedirect,
  createSession,
  getUserByEmail,
  getUserByUsername,
  verifyPassword,
} from "@/lib/auth";

export async function POST(request: Request) {
  const contentType = request.headers.get("content-type") ?? "";

  if (contentType.includes("application/json")) {
    const body = (await request.json()) as {
      step?: string;
      username?: string;
      password?: string;
    };

    if (body.step === "identify") {
      const username = String(body.username ?? "").trim();

      if (!username) {
        return NextResponse.json({ error: "Enter a username to continue." }, { status: 400 });
      }

      const user = await getUserByUsername(username);
      return NextResponse.json({ exists: Boolean(user) });
    }

    const username = String(body.username ?? "").trim();
    const password = String(body.password ?? "");

    if (!username || !password) {
      return NextResponse.json({ error: "Enter your username and password." }, { status: 400 });
    }

    const user = await getUserByUsername(username);

    if (!user || !(await verifyPassword(password, user.password_hash))) {
      return NextResponse.json({ error: "That password doesn't match this username." }, { status: 400 });
    }

    await createSession(user.id);

    return NextResponse.json({ ok: true });
  }

  const formData = await request.formData();
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");

  if (!email || !password) {
    return NextResponse.redirect(
      new URL(buildErrorRedirect("/login", "Enter your email and password."), request.url),
      { status: 303 },
    );
  }

  const user = await getUserByEmail(email);

  if (!user || !(await verifyPassword(password, user.password_hash))) {
    return NextResponse.redirect(
      new URL(buildErrorRedirect("/login", "Invalid credentials."), request.url),
      { status: 303 },
    );
  }

  await createSession(user.id);

  return NextResponse.redirect(new URL("/dashboard", request.url), { status: 303 });
}
