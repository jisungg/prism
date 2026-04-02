import { db } from "@/lib/db";

type TimestampValue = Date | string;

export type DashboardStats = {
  gameCount: number;
  reviewQueueCount: number;
  readyReviewCount: number;
  openSupportCount: number;
  acceptedAnswerCount: number;
  communityCount: number;
  followerCount: number;
  followingCount: number;
  commentCount: number;
  postAlertCount: number;
};

export type UserProfileSummary = {
  userId: string;
  username: string;
  email: string;
  displayName: string;
  headline: string | null;
  bio: string | null;
  homeCommunityName: string | null;
  followerCount: number;
  followingCount: number;
  communityCount: number;
  postedGameCount: number;
  commentCount: number;
};

export type CommunitySummary = {
  id: string;
  name: string;
  slug: string;
  visibility: "private" | "public";
  role: "owner" | "admin" | "member";
  status: "active" | "invited" | "requested" | "removed";
  memberLimit: number | null;
  memberCount: number;
  sharedGameCount: number;
};

export type RecentUploadSummary = {
  id: string;
  opponentName: string;
  playerColor: "white" | "black";
  playerResult: "win" | "loss" | "draw" | "unfinished";
  openingName: string | null;
  playedAt: TimestampValue | null;
  analysisStatus: "pending" | "running" | "ready" | "failed";
  supportRequestCount: number;
  sharedCommunityCount: number;
  commentCount: number;
};

export type SupportRequestSummary = {
  id: string;
  communityName: string;
  label: string;
  questionText: string;
  supportKind:
    | "why_engine_move"
    | "candidate_move"
    | "plan"
    | "calculation"
    | "opening"
    | "endgame"
    | "other";
  status: "open" | "in_review" | "resolved" | "archived";
  focusPlyNumber: number;
  openingName: string | null;
  opponentName: string;
  bestMoveSan: string | null;
  answerCount: number;
  hasGenerallyAccepted: boolean;
  createdAt: TimestampValue;
};

export type AcceptedAnswerSummary = {
  id: string;
  requestId: string;
  communityName: string;
  label: string;
  focusPlyNumber: number;
  body: string;
  stance: "supports_engine" | "practical_alternative" | "needs_more_analysis";
  proposedMoveSan: string | null;
  engineBestMoveSan: string | null;
  authorUsername: string;
  acceptedAt: TimestampValue | null;
};

export type FollowConnectionSummary = {
  userId: string;
  username: string;
  displayName: string;
  headline: string | null;
  homeCommunityName: string | null;
  postedGameCount: number;
  communityCount: number;
};

export type FollowAlertSummary = {
  communityGameId: string;
  gameId: string;
  postedByUsername: string;
  postedByDisplayName: string;
  communityName: string;
  openingName: string | null;
  opponentName: string;
  note: string | null;
  createdAt: TimestampValue;
  commentCount: number;
};

export type GameCommentSummary = {
  id: string;
  gameId: string;
  authorUsername: string;
  authorDisplayName: string;
  communityName: string | null;
  openingName: string | null;
  body: string;
  createdAt: TimestampValue;
};

export async function getDashboardStats(userId: string, playerId: string): Promise<DashboardStats> {
  const result = await db.query<DashboardStats>(
    `
      SELECT
        (
          SELECT COUNT(*)::integer
          FROM games
          WHERE games.player_id = $1
        ) AS "gameCount",
        (
          SELECT COUNT(*)::integer
          FROM games
          WHERE games.player_id = $1
            AND games.analysis_status IN ('pending', 'running')
        ) AS "reviewQueueCount",
        (
          SELECT COUNT(*)::integer
          FROM games
          WHERE games.player_id = $1
            AND games.analysis_status = 'ready'
        ) AS "readyReviewCount",
        (
          SELECT COUNT(*)::integer
          FROM game_support_requests
          INNER JOIN games ON games.id = game_support_requests.game_id
          WHERE games.player_id = $1
            AND game_support_requests.status IN ('open', 'in_review')
        ) AS "openSupportCount",
        (
          SELECT COUNT(*)::integer
          FROM support_answers
          INNER JOIN game_support_requests
            ON game_support_requests.id = support_answers.request_id
          INNER JOIN games ON games.id = game_support_requests.game_id
          WHERE games.player_id = $1
            AND support_answers.is_generally_accepted = true
        ) AS "acceptedAnswerCount",
        (
          SELECT COUNT(*)::integer
          FROM community_memberships
          WHERE community_memberships.user_id = $2
            AND community_memberships.status = 'active'
        ) AS "communityCount",
        (
          SELECT COUNT(*)::integer
          FROM user_follows
          WHERE user_follows.followed_user_id = $2
        ) AS "followerCount",
        (
          SELECT COUNT(*)::integer
          FROM user_follows
          WHERE user_follows.follower_user_id = $2
        ) AS "followingCount",
        (
          SELECT COUNT(*)::integer
          FROM game_comments
          INNER JOIN games ON games.id = game_comments.game_id
          WHERE games.player_id = $1
        ) AS "commentCount",
        (
          SELECT COUNT(*)::integer
          FROM user_follows
          INNER JOIN community_games
            ON community_games.shared_by_user_id = user_follows.followed_user_id
          WHERE user_follows.follower_user_id = $2
            AND user_follows.notify_on_posts = true
        ) AS "postAlertCount"
    `,
    [playerId, userId],
  );

  return result.rows[0];
}

export async function getUserProfileSummary(userId: string): Promise<UserProfileSummary | null> {
  const result = await db.query<UserProfileSummary>(
    `
      SELECT
        users.id AS "userId",
        users.username::text AS username,
        users.email::text AS email,
        user_profiles.display_name AS "displayName",
        user_profiles.headline,
        user_profiles.bio,
        communities.name AS "homeCommunityName",
        (
          SELECT COUNT(*)::integer
          FROM user_follows
          WHERE user_follows.followed_user_id = users.id
        ) AS "followerCount",
        (
          SELECT COUNT(*)::integer
          FROM user_follows
          WHERE user_follows.follower_user_id = users.id
        ) AS "followingCount",
        (
          SELECT COUNT(*)::integer
          FROM community_memberships
          WHERE community_memberships.user_id = users.id
            AND community_memberships.status = 'active'
        ) AS "communityCount",
        (
          SELECT COUNT(*)::integer
          FROM games
          WHERE games.uploaded_by_user_id = users.id
        ) AS "postedGameCount",
        (
          SELECT COUNT(*)::integer
          FROM game_comments
          WHERE game_comments.author_user_id = users.id
        ) AS "commentCount"
      FROM users
      INNER JOIN user_profiles ON user_profiles.user_id = users.id
      LEFT JOIN communities ON communities.id = user_profiles.home_community_id
      WHERE users.id = $1
      LIMIT 1
    `,
    [userId],
  );

  return result.rows[0] ?? null;
}

export async function listCommunitiesForUser(
  userId: string,
  limit = 6,
): Promise<CommunitySummary[]> {
  const result = await db.query<CommunitySummary>(
    `
      WITH member_counts AS (
        SELECT
          community_id,
          COUNT(*)::integer AS member_count
        FROM community_memberships
        WHERE status = 'active'
        GROUP BY community_id
      ),
      game_counts AS (
        SELECT
          community_id,
          COUNT(*)::integer AS game_count
        FROM community_games
        GROUP BY community_id
      )
      SELECT
        communities.id,
        communities.name,
        communities.slug::text AS slug,
        communities.visibility,
        community_memberships.role,
        community_memberships.status,
        communities.member_limit AS "memberLimit",
        COALESCE(member_counts.member_count, 0) AS "memberCount",
        COALESCE(game_counts.game_count, 0) AS "sharedGameCount"
      FROM community_memberships
      INNER JOIN communities ON communities.id = community_memberships.community_id
      LEFT JOIN member_counts ON member_counts.community_id = communities.id
      LEFT JOIN game_counts ON game_counts.community_id = communities.id
      WHERE community_memberships.user_id = $1
        AND community_memberships.status IN ('active', 'invited', 'requested')
      ORDER BY
        CASE community_memberships.role
          WHEN 'owner' THEN 0
          WHEN 'admin' THEN 1
          ELSE 2
        END,
        communities.created_at ASC
      LIMIT $2
    `,
    [userId, limit],
  );

  return result.rows;
}

export async function listRecentUploadsForPlayer(
  playerId: string,
  limit = 5,
): Promise<RecentUploadSummary[]> {
  const result = await db.query<RecentUploadSummary>(
    `
      WITH request_counts AS (
        SELECT
          game_id,
          COUNT(*)::integer AS request_count
        FROM game_support_requests
        GROUP BY game_id
      ),
      community_counts AS (
        SELECT
          game_id,
          COUNT(*)::integer AS community_count
        FROM community_games
        GROUP BY game_id
      ),
      comment_counts AS (
        SELECT
          game_id,
          COUNT(*)::integer AS comment_count
        FROM game_comments
        GROUP BY game_id
      )
      SELECT
        games.id,
        games.opponent_name AS "opponentName",
        games.player_color AS "playerColor",
        games.player_result AS "playerResult",
        games.opening_name AS "openingName",
        games.played_at AS "playedAt",
        games.analysis_status AS "analysisStatus",
        COALESCE(request_counts.request_count, 0) AS "supportRequestCount",
        COALESCE(community_counts.community_count, 0) AS "sharedCommunityCount",
        COALESCE(comment_counts.comment_count, 0) AS "commentCount"
      FROM games
      LEFT JOIN request_counts ON request_counts.game_id = games.id
      LEFT JOIN community_counts ON community_counts.game_id = games.id
      LEFT JOIN comment_counts ON comment_counts.game_id = games.id
      WHERE games.player_id = $1
      ORDER BY COALESCE(games.played_at, games.created_at) DESC
      LIMIT $2
    `,
    [playerId, limit],
  );

  return result.rows;
}

export async function listSupportRequestsForPlayer(
  playerId: string,
  limit = 5,
): Promise<SupportRequestSummary[]> {
  const result = await db.query<SupportRequestSummary>(
    `
      WITH answer_counts AS (
        SELECT
          request_id,
          COUNT(*)::integer AS answer_count,
          BOOL_OR(is_generally_accepted) AS has_generally_accepted
        FROM support_answers
        GROUP BY request_id
      )
      SELECT
        game_support_requests.id,
        communities.name AS "communityName",
        game_support_requests.label,
        game_support_requests.question_text AS "questionText",
        game_support_requests.support_kind AS "supportKind",
        game_support_requests.status,
        game_support_requests.focus_ply_number AS "focusPlyNumber",
        games.opening_name AS "openingName",
        games.opponent_name AS "opponentName",
        engine_position.best_move_san AS "bestMoveSan",
        COALESCE(answer_counts.answer_count, 0) AS "answerCount",
        COALESCE(answer_counts.has_generally_accepted, false) AS "hasGenerallyAccepted",
        game_support_requests.created_at AS "createdAt"
      FROM game_support_requests
      INNER JOIN games ON games.id = game_support_requests.game_id
      INNER JOIN communities ON communities.id = game_support_requests.community_id
      LEFT JOIN answer_counts ON answer_counts.request_id = game_support_requests.id
      LEFT JOIN LATERAL (
        SELECT review_positions.best_move_san
        FROM game_reviews
        INNER JOIN review_positions ON review_positions.review_id = game_reviews.id
        WHERE game_reviews.game_id = game_support_requests.game_id
          AND review_positions.ply_number = game_support_requests.focus_ply_number
        LIMIT 1
      ) AS engine_position ON true
      WHERE games.player_id = $1
      ORDER BY
        CASE game_support_requests.status
          WHEN 'open' THEN 0
          WHEN 'in_review' THEN 1
          WHEN 'resolved' THEN 2
          ELSE 3
        END,
        game_support_requests.created_at DESC
      LIMIT $2
    `,
    [playerId, limit],
  );

  return result.rows;
}

export async function listAcceptedAnswersForPlayer(
  playerId: string,
  limit = 3,
): Promise<AcceptedAnswerSummary[]> {
  const result = await db.query<AcceptedAnswerSummary>(
    `
      SELECT
        support_answers.id,
        game_support_requests.id AS "requestId",
        communities.name AS "communityName",
        game_support_requests.label,
        game_support_requests.focus_ply_number AS "focusPlyNumber",
        support_answers.body,
        support_answers.stance,
        support_answers.proposed_move_san AS "proposedMoveSan",
        engine_position.best_move_san AS "engineBestMoveSan",
        users.username::text AS "authorUsername",
        support_answers.generally_accepted_at AS "acceptedAt"
      FROM support_answers
      INNER JOIN game_support_requests
        ON game_support_requests.id = support_answers.request_id
      INNER JOIN games ON games.id = game_support_requests.game_id
      INNER JOIN communities ON communities.id = game_support_requests.community_id
      INNER JOIN users ON users.id = support_answers.author_user_id
      LEFT JOIN LATERAL (
        SELECT review_positions.best_move_san
        FROM game_reviews
        INNER JOIN review_positions ON review_positions.review_id = game_reviews.id
        WHERE game_reviews.game_id = game_support_requests.game_id
          AND review_positions.ply_number = game_support_requests.focus_ply_number
        LIMIT 1
      ) AS engine_position ON true
      WHERE games.player_id = $1
        AND support_answers.is_generally_accepted = true
      ORDER BY
        support_answers.generally_accepted_at DESC NULLS LAST,
        support_answers.created_at DESC
      LIMIT $2
    `,
    [playerId, limit],
  );

  return result.rows;
}

export async function listFollowingForUser(
  userId: string,
  limit = 5,
): Promise<FollowConnectionSummary[]> {
  const result = await db.query<FollowConnectionSummary>(
    `
      SELECT
        users.id AS "userId",
        users.username::text AS username,
        user_profiles.display_name AS "displayName",
        user_profiles.headline,
        communities.name AS "homeCommunityName",
        (
          SELECT COUNT(*)::integer
          FROM games
          WHERE games.uploaded_by_user_id = users.id
        ) AS "postedGameCount",
        (
          SELECT COUNT(*)::integer
          FROM community_memberships
          WHERE community_memberships.user_id = users.id
            AND community_memberships.status = 'active'
        ) AS "communityCount"
      FROM user_follows
      INNER JOIN users ON users.id = user_follows.followed_user_id
      INNER JOIN user_profiles ON user_profiles.user_id = users.id
      LEFT JOIN communities ON communities.id = user_profiles.home_community_id
      WHERE user_follows.follower_user_id = $1
      ORDER BY user_follows.created_at DESC
      LIMIT $2
    `,
    [userId, limit],
  );

  return result.rows;
}

export async function listFollowersForUser(
  userId: string,
  limit = 5,
): Promise<FollowConnectionSummary[]> {
  const result = await db.query<FollowConnectionSummary>(
    `
      SELECT
        users.id AS "userId",
        users.username::text AS username,
        user_profiles.display_name AS "displayName",
        user_profiles.headline,
        communities.name AS "homeCommunityName",
        (
          SELECT COUNT(*)::integer
          FROM games
          WHERE games.uploaded_by_user_id = users.id
        ) AS "postedGameCount",
        (
          SELECT COUNT(*)::integer
          FROM community_memberships
          WHERE community_memberships.user_id = users.id
            AND community_memberships.status = 'active'
        ) AS "communityCount"
      FROM user_follows
      INNER JOIN users ON users.id = user_follows.follower_user_id
      INNER JOIN user_profiles ON user_profiles.user_id = users.id
      LEFT JOIN communities ON communities.id = user_profiles.home_community_id
      WHERE user_follows.followed_user_id = $1
      ORDER BY user_follows.created_at DESC
      LIMIT $2
    `,
    [userId, limit],
  );

  return result.rows;
}

export async function listFollowAlertsForUser(
  userId: string,
  limit = 5,
): Promise<FollowAlertSummary[]> {
  const result = await db.query<FollowAlertSummary>(
    `
      WITH comment_counts AS (
        SELECT
          game_id,
          COUNT(*)::integer AS comment_count
        FROM game_comments
        GROUP BY game_id
      )
      SELECT
        community_games.id AS "communityGameId",
        games.id AS "gameId",
        users.username::text AS "postedByUsername",
        user_profiles.display_name AS "postedByDisplayName",
        communities.name AS "communityName",
        games.opening_name AS "openingName",
        games.opponent_name AS "opponentName",
        community_games.note,
        community_games.created_at AS "createdAt",
        COALESCE(comment_counts.comment_count, 0) AS "commentCount"
      FROM user_follows
      INNER JOIN community_games
        ON community_games.shared_by_user_id = user_follows.followed_user_id
      INNER JOIN games ON games.id = community_games.game_id
      INNER JOIN communities ON communities.id = community_games.community_id
      INNER JOIN users ON users.id = user_follows.followed_user_id
      INNER JOIN user_profiles ON user_profiles.user_id = users.id
      LEFT JOIN comment_counts ON comment_counts.game_id = games.id
      WHERE user_follows.follower_user_id = $1
        AND user_follows.notify_on_posts = true
      ORDER BY community_games.created_at DESC
      LIMIT $2
    `,
    [userId, limit],
  );

  return result.rows;
}

export async function listRecentGameCommentsForPlayer(
  playerId: string,
  limit = 5,
): Promise<GameCommentSummary[]> {
  const result = await db.query<GameCommentSummary>(
    `
      SELECT
        game_comments.id,
        games.id AS "gameId",
        users.username::text AS "authorUsername",
        user_profiles.display_name AS "authorDisplayName",
        communities.name AS "communityName",
        games.opening_name AS "openingName",
        game_comments.body,
        game_comments.created_at AS "createdAt"
      FROM game_comments
      INNER JOIN games ON games.id = game_comments.game_id
      INNER JOIN users ON users.id = game_comments.author_user_id
      INNER JOIN user_profiles ON user_profiles.user_id = users.id
      LEFT JOIN communities ON communities.id = game_comments.community_id
      WHERE games.player_id = $1
      ORDER BY game_comments.created_at DESC
      LIMIT $2
    `,
    [playerId, limit],
  );

  return result.rows;
}
