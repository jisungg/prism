import { createHash, randomBytes, scrypt as scryptCallback, timingSafeEqual } from "crypto";
import { cache } from "react";
import { promisify } from "util";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { PoolClient } from "pg";
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

type PlayerRow = {
  id: string;
};

export type AuthUser = Omit<UserRow, "password_hash">;
export type PlayerIdentity = {
  id: string;
  displayName: string;
  normalizedName: string;
  relationshipType: "self" | "alternate" | "tracked";
  isPrimary: boolean;
};

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

function displayNameForUsername(username: string) {
  return username.trim();
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

export async function getPrimaryPlayerForUser(userId: string): Promise<PlayerIdentity | null> {
  const result = await db.query<PlayerIdentity>(
    `
      SELECT
        players.id,
        players.display_name AS "displayName",
        players.normalized_name::text AS "normalizedName",
        user_player_links.relationship_type AS "relationshipType",
        user_player_links.is_primary AS "isPrimary"
      FROM user_player_links
      INNER JOIN players ON players.id = user_player_links.player_id
      WHERE user_player_links.user_id = $1
        AND user_player_links.is_primary = true
      LIMIT 1
    `,
    [userId],
  );

  return result.rows[0] ?? null;
}

export async function createUser(input: {
  email?: string;
  username: string;
  password: string;
}) {
  const client = await db.connect();

  try {
    await client.query("BEGIN");

    const email = normalizeEmail(input.email ?? provisionalEmailForUsername(input.username));
    const username = normalizeUsername(input.username);
    const displayName = displayNameForUsername(input.username);
    const passwordHash = await hashPassword(input.password);

    const userResult = await client.query<AuthUser>(
      `
        INSERT INTO users (email, username, password_hash)
        VALUES ($1, $2, $3)
        RETURNING id, email::text, username::text
      `,
      [email, username, passwordHash],
    );

    const user = userResult.rows[0];

    const playerResult = await client.query<PlayerRow>(
      `
        INSERT INTO players (display_name, normalized_name)
        VALUES ($1, $2)
        RETURNING id
      `,
      [displayName, username],
    );

    await client.query(
      `
        INSERT INTO user_player_links (user_id, player_id, relationship_type, is_primary)
        VALUES ($1, $2, 'self', true)
      `,
      [user.id, playerResult.rows[0].id],
    );

    await client.query("COMMIT");

    return user;
  } catch (error) {
    await rollbackQuietly(client);
    throw error;
  } finally {
    client.release();
  }
}

async function rollbackQuietly(client: PoolClient) {
  try {
    await client.query("ROLLBACK");
  } catch {
    // Ignore rollback failures and preserve the original error.
  }
}

export async function requireUser() {
  const user = await getSessionUser();

  if (!user) {
    redirect("/login");
  }

  return user;
}

export async function requireCurrentPlayer() {
  const user = await requireUser();
  const player = await getPrimaryPlayerForUser(user.id);

  if (!player) {
    throw new Error(`Primary player missing for user ${user.id}.`);
  }

  return player;
}

export async function redirectIfAuthenticated() {
  const user = await getSessionUser();

  if (user) {
    redirect("/dashboard");
  }
}
