import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import type { PoolClient } from "pg";
import { getSessionUser } from "@/lib/auth";
import { db } from "@/lib/db";

type GameAccessRow = {
  uploaderUserId: string;
  communityId: string | null;
};

type IdRow = {
  id: string;
};

function redirectToDashboard(request: Request, tab = "games") {
  return NextResponse.redirect(new URL(`/dashboard?tab=${tab}`, request.url), {
    status: 303,
  });
}

export async function POST(request: Request) {
  const user = await getSessionUser();

  if (!user) {
    return NextResponse.redirect(new URL("/login", request.url), { status: 303 });
  }

  const formData = await request.formData();
  const gameId = String(formData.get("gameId") ?? "").trim();
  const body = String(formData.get("body") ?? "").trim();
  const redirectTab = String(formData.get("redirectTab") ?? "games");

  if (!gameId || !body) {
    return redirectToDashboard(request, redirectTab);
  }

  const client = await db.connect();

  try {
    await client.query("BEGIN");

    const accessResult = await client.query<GameAccessRow>(
      `
        SELECT
          games.uploaded_by_user_id AS "uploaderUserId",
          (
            SELECT community_games.community_id
            FROM community_games
            LEFT JOIN community_memberships
              ON community_memberships.community_id = community_games.community_id
             AND community_memberships.user_id = $2
             AND community_memberships.status = 'active'
            WHERE community_games.game_id = games.id
              AND (
                games.uploaded_by_user_id = $2
                OR community_memberships.user_id IS NOT NULL
              )
            ORDER BY community_games.created_at ASC
            LIMIT 1
          ) AS "communityId"
        FROM games
        WHERE games.id = $1
          AND (
            games.uploaded_by_user_id = $2
            OR EXISTS (
              SELECT 1
              FROM community_games
              INNER JOIN community_memberships
                ON community_memberships.community_id = community_games.community_id
               AND community_memberships.user_id = $2
               AND community_memberships.status = 'active'
              WHERE community_games.game_id = games.id
            )
          )
        LIMIT 1
      `,
      [gameId, user.id],
    );

    const game = accessResult.rows[0];

    if (!game) {
      await client.query("ROLLBACK");
      return redirectToDashboard(request, redirectTab);
    }

    const commentResult = await client.query<IdRow>(
      `
        INSERT INTO game_comments (game_id, community_id, author_user_id, body)
        VALUES ($1, $2, $3, $4)
        RETURNING id
      `,
      [gameId, game.communityId, user.id, body],
    );

    if (game.uploaderUserId !== user.id) {
      await client.query(
        `
          INSERT INTO notifications (
            user_id,
            actor_user_id,
            game_id,
            comment_id,
            event_type,
            title,
            body
          )
          VALUES ($1, $2, $3, $4, 'game_comment', $5, $6)
        `,
        [
          game.uploaderUserId,
          user.id,
          gameId,
          commentResult.rows[0].id,
          `${user.username} commented on your game`,
          body,
        ],
      );
    }

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

async function rollbackQuietly(client: PoolClient) {
  try {
    await client.query("ROLLBACK");
  } catch {
    // Preserve the original error.
  }
}
