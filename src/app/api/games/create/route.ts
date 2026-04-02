import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import type { PoolClient } from "pg";
import { getPrimaryPlayerForUser, getSessionUser } from "@/lib/auth";
import { db } from "@/lib/db";

type CommunityRow = {
  communityId: string;
};

type GameRow = {
  id: string;
};

function redirectToDashboard(request: Request, tab = "games") {
  return NextResponse.redirect(new URL(`/dashboard?tab=${tab}`, request.url), {
    status: 303,
  });
}

function parsePlayedAt(value: string) {
  if (!value) {
    return null;
  }

  const date = new Date(`${value}T12:00:00.000Z`);
  return Number.isNaN(date.getTime()) ? null : date;
}

export async function POST(request: Request) {
  const user = await getSessionUser();

  if (!user) {
    return NextResponse.redirect(new URL("/login", request.url), { status: 303 });
  }

  const player = await getPrimaryPlayerForUser(user.id);

  if (!player) {
    return redirectToDashboard(request, "profile");
  }

  const formData = await request.formData();
  const opponentName = String(formData.get("opponentName") ?? "").trim() || "Anonymous";
  const openingName = String(formData.get("openingName") ?? "").trim() || null;
  const note = String(formData.get("note") ?? "").trim() || null;
  const pgnText = String(formData.get("pgnText") ?? "").trim() || "*";
  const playedAt = parsePlayedAt(String(formData.get("playedAt") ?? "").trim());
  const redirectTab = String(formData.get("redirectTab") ?? "games");
  const requestedCommunityId = String(formData.get("communityId") ?? "").trim();

  const playerColor = String(formData.get("playerColor") ?? "").trim();
  const playerResult = String(formData.get("playerResult") ?? "").trim();

  if (!["white", "black"].includes(playerColor)) {
    return redirectToDashboard(request, redirectTab);
  }

  if (!["win", "loss", "draw", "unfinished"].includes(playerResult)) {
    return redirectToDashboard(request, redirectTab);
  }

  const client = await db.connect();

  try {
    await client.query("BEGIN");

    const communityId =
      (await resolveCommunityId(client, user.id, requestedCommunityId)) ??
      (await resolveCommunityId(client, user.id, null));

    const gameResult = await client.query<GameRow>(
      `
        INSERT INTO games (
          uploaded_by_user_id,
          player_id,
          player_color,
          opponent_name,
          player_result,
          source_type,
          opening_name,
          played_at,
          pgn_text,
          analysis_status
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'pending')
        RETURNING id
      `,
      [
        user.id,
        player.id,
        playerColor,
        opponentName,
        playerResult,
        pgnText === "*" ? "manual" : "pgn_upload",
        openingName,
        playedAt,
        pgnText,
      ],
    );

    const gameId = gameResult.rows[0].id;

    if (communityId) {
      await client.query(
        `
          INSERT INTO community_games (community_id, game_id, shared_by_user_id, visibility, note)
          VALUES ($1, $2, $3, 'members', $4)
        `,
        [communityId, gameId, user.id, note],
      );

      await client.query(
        `
          INSERT INTO notifications (
            user_id,
            actor_user_id,
            community_id,
            game_id,
            event_type,
            title,
            body
          )
          SELECT
            user_follows.follower_user_id,
            $1,
            $2,
            $3,
            'followed_user_posted_game',
            $4,
            $5
          FROM user_follows
          WHERE user_follows.followed_user_id = $1
            AND user_follows.notify_on_posts = true
        `,
        [
          user.id,
          communityId,
          gameId,
          `${user.username} posted a new game`,
          note ?? `${openingName || "New game"} against ${opponentName}.`,
        ],
      );
    }

    await client.query(
      `
        INSERT INTO game_reviews (game_id, requested_by_user_id, status, summary)
        VALUES ($1, $2, 'pending', $3)
      `,
      [gameId, user.id, "Engine review queued for community discussion."],
    );

    await client.query("COMMIT");
  } catch (error) {
    await rollbackQuietly(client);
    throw error;
  } finally {
    client.release();
  }

  revalidatePath("/dashboard");
  return redirectToDashboard(request, redirectTab);
}

async function resolveCommunityId(
  client: PoolClient,
  userId: string,
  requestedCommunityId: string | null,
) {
  if (requestedCommunityId) {
    const directResult = await client.query<CommunityRow>(
      `
        SELECT community_memberships.community_id AS "communityId"
        FROM community_memberships
        WHERE community_memberships.user_id = $1
          AND community_memberships.community_id = $2
          AND community_memberships.status = 'active'
        LIMIT 1
      `,
      [userId, requestedCommunityId],
    );

    return directResult.rows[0]?.communityId ?? null;
  }

  const fallbackResult = await client.query<CommunityRow>(
    `
      SELECT community_id AS "communityId"
      FROM (
        SELECT user_profiles.home_community_id AS community_id, 0 AS sort_order
        FROM user_profiles
        INNER JOIN community_memberships
          ON community_memberships.community_id = user_profiles.home_community_id
         AND community_memberships.user_id = user_profiles.user_id
         AND community_memberships.status = 'active'
        WHERE user_profiles.user_id = $1

        UNION ALL

        SELECT community_memberships.community_id, 1 AS sort_order
        FROM community_memberships
        WHERE community_memberships.user_id = $1
          AND community_memberships.status = 'active'
      ) AS ranked_communities
      WHERE community_id IS NOT NULL
      ORDER BY sort_order ASC
      LIMIT 1
    `,
    [userId],
  );

  return fallbackResult.rows[0]?.communityId ?? null;
}

async function rollbackQuietly(client: PoolClient) {
  try {
    await client.query("ROLLBACK");
  } catch {
    // Preserve the original error.
  }
}
