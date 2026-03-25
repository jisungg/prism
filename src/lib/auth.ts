import { createHash, randomBytes, scrypt as scryptCallback, timingSafeEqual } from "crypto";
import { cache } from "react";
import { promisify } from "util";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";

const scrypt = promisify(scryptCallback);
const SESSION_COOKIE = "prism_session";
const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 30;

type UserRow = {
  id: string;
  email: string;
  username: string;
  password_hash: string;
};

export type AuthUser = Omit<UserRow, "password_hash">;

function hashSessionToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

function sessionExpiryDate() {
  return new Date(Date.now() + SESSION_TTL_MS);
}

export async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const derived = (await scrypt(password, salt, 64)) as Buffer;

  return `scrypt:${salt}:${derived.toString("hex")}`;
}

export async function verifyPassword(password: string, passwordHash: string) {
  const [algorithm, salt, expectedHash] = passwordHash.split(":");

  if (algorithm !== "scrypt" || !salt || !expectedHash) {
    return false;
  }

  const derived = (await scrypt(password, salt, 64)) as Buffer;
  const expected = Buffer.from(expectedHash, "hex");

  if (derived.length !== expected.length) {
    return false;
  }

  return timingSafeEqual(derived, expected);
}

export function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

export function normalizeUsername(username: string) {
  return username.trim().toLowerCase();
}

export function provisionalEmailForUsername(username: string) {
  return `${normalizeUsername(username)}@users.prism.local`;
}

export function buildErrorRedirect(pathname: string, message: string) {
  return `${pathname}?error=${encodeURIComponent(message)}`;
}

export async function createSession(userId: string) {
  const token = randomBytes(32).toString("hex");
  const tokenHash = hashSessionToken(token);
  const expiresAt = sessionExpiryDate();

  await db.query(
    `
      INSERT INTO sessions (user_id, token_hash, expires_at)
      VALUES ($1, $2, $3)
    `,
    [userId, tokenHash, expiresAt],
  );

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: expiresAt,
  });
}

export async function destroySession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;

  if (token) {
    await db.query("DELETE FROM sessions WHERE token_hash = $1", [hashSessionToken(token)]);
  }

  cookieStore.delete(SESSION_COOKIE);
}

const getSessionUserByTokenHash = cache(async (tokenHash: string): Promise<AuthUser | null> => {
  const result = await db.query<AuthUser>(
    `
      SELECT users.id, users.email::text, users.username::text
      FROM sessions
      INNER JOIN users ON users.id = sessions.user_id
      WHERE sessions.token_hash = $1
        AND sessions.expires_at > now()
      LIMIT 1
    `,
    [tokenHash],
  );

  return result.rows[0] ?? null;
});

export async function getSessionUser(): Promise<AuthUser | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;

  if (!token) {
    return null;
  }

  return getSessionUserByTokenHash(hashSessionToken(token));
}

export async function getUserByEmail(email: string) {
  const result = await db.query<UserRow>(
    `
      SELECT id, email::text, username::text, password_hash
      FROM users
      WHERE email = $1
      LIMIT 1
    `,
    [normalizeEmail(email)],
  );

  return result.rows[0] ?? null;
}

export async function getUserByUsername(username: string) {
  const result = await db.query<UserRow>(
    `
      SELECT id, email::text, username::text, password_hash
      FROM users
      WHERE username = $1
      LIMIT 1
    `,
    [normalizeUsername(username)],
  );

  return result.rows[0] ?? null;
}

export async function createUser(input: {
  email?: string;
  username: string;
  password: string;
}) {
  const result = await db.query<AuthUser>(
    `
      INSERT INTO users (email, username, password_hash)
      VALUES ($1, $2, $3)
      RETURNING id, email::text, username::text
    `,
    [
      normalizeEmail(input.email ?? provisionalEmailForUsername(input.username)),
      normalizeUsername(input.username),
      await hashPassword(input.password),
    ],
  );

  return result.rows[0];
}

export async function requireUser() {
  const user = await getSessionUser();

  if (!user) {
    redirect("/login");
  }

  return user;
}

export async function redirectIfAuthenticated() {
  const user = await getSessionUser();

  if (user) {
    redirect("/dashboard");
  }
}
