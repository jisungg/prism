CREATE EXTENSION IF NOT EXISTS citext;
CREATE EXTENSION IF NOT EXISTS pgcrypto;

ALTER TABLE IF EXISTS players
  ADD COLUMN IF NOT EXISTS bio text;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'user_player_links'
      AND column_name = 'relationship_type'
  ) THEN
    UPDATE user_player_links
    SET relationship_type = 'managed'
    WHERE relationship_type = 'tracked';
  END IF;
END $$;

ALTER TABLE IF EXISTS user_player_links
  DROP CONSTRAINT IF EXISTS user_player_links_check;

ALTER TABLE IF EXISTS user_player_links
  DROP CONSTRAINT IF EXISTS user_player_links_relationship_type_check;

ALTER TABLE IF EXISTS user_player_links
  ADD CONSTRAINT user_player_links_relationship_type_check
  CHECK (relationship_type = ANY (ARRAY['self'::text, 'alternate'::text, 'managed'::text]));

ALTER TABLE IF EXISTS user_player_links
  ADD CONSTRAINT user_player_links_check
  CHECK (
    NOT is_primary
    OR (relationship_type = ANY (ARRAY['self'::text, 'alternate'::text, 'managed'::text]))
  );

DROP TABLE IF EXISTS notifications CASCADE;
DROP TABLE IF EXISTS discussion_messages CASCADE;
DROP TABLE IF EXISTS discussion_threads CASCADE;
DROP TABLE IF EXISTS support_answer_votes CASCADE;
DROP TABLE IF EXISTS support_answers CASCADE;
DROP TABLE IF EXISTS game_support_requests CASCADE;
DROP TABLE IF EXISTS review_positions CASCADE;
DROP TABLE IF EXISTS game_reviews CASCADE;
DROP TABLE IF EXISTS game_comments CASCADE;
DROP TABLE IF EXISTS moves CASCADE;
DROP TABLE IF EXISTS community_games CASCADE;
DROP TABLE IF EXISTS game_participants CASCADE;
DROP TABLE IF EXISTS user_game_links CASCADE;
DROP TABLE IF EXISTS games CASCADE;
DROP TABLE IF EXISTS user_follows CASCADE;
DROP TABLE IF EXISTS community_memberships CASCADE;
DROP TABLE IF EXISTS user_profiles CASCADE;
DROP TABLE IF EXISTS communities CASCADE;

CREATE TABLE communities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name text NOT NULL,
  slug citext NOT NULL UNIQUE,
  description text,
  visibility text NOT NULL DEFAULT 'private' CHECK (
    visibility IN ('private', 'public')
  ),
  member_limit integer CHECK (member_limit IS NULL OR member_limit > 0),
  requires_approval boolean NOT NULL DEFAULT false,
  allow_member_invites boolean NOT NULL DEFAULT true,
  allow_public_game_sharing boolean NOT NULL DEFAULT false,
  settings_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE user_profiles (
  user_id uuid PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  display_name text NOT NULL,
  headline text,
  bio text,
  home_community_id uuid REFERENCES communities(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE community_memberships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  community_id uuid NOT NULL REFERENCES communities(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('owner', 'admin', 'member')),
  status text NOT NULL CHECK (
    status IN ('active', 'invited', 'requested', 'removed')
  ),
  created_at timestamptz NOT NULL DEFAULT now(),
  joined_at timestamptz,
  UNIQUE (community_id, user_id)
);

CREATE TABLE user_follows (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  follower_user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  followed_user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  notify_on_posts boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (follower_user_id <> followed_user_id),
  UNIQUE (follower_user_id, followed_user_id)
);

CREATE TABLE games (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  uploaded_by_user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  player_id uuid NOT NULL REFERENCES players(id) ON DELETE RESTRICT,
  player_color text NOT NULL CHECK (player_color IN ('white', 'black')),
  opponent_name text NOT NULL DEFAULT 'Anonymous',
  opponent_rating integer CHECK (opponent_rating IS NULL OR opponent_rating > 0),
  player_result text NOT NULL CHECK (
    player_result IN ('win', 'loss', 'draw', 'unfinished')
  ),
  source_type text NOT NULL CHECK (
    source_type IN ('manual', 'pgn_upload', 'chesscom', 'lichess', 'imported')
  ),
  source_game_id text,
  event_name text,
  site text,
  played_at timestamptz,
  termination text,
  time_control text,
  eco_code text,
  opening_name text,
  variation_name text,
  initial_fen text,
  moves_count integer NOT NULL DEFAULT 0 CHECK (moves_count >= 0),
  pgn_text text NOT NULL,
  analysis_status text NOT NULL DEFAULT 'pending' CHECK (
    analysis_status IN ('pending', 'running', 'ready', 'failed')
  ),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE community_games (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  community_id uuid NOT NULL REFERENCES communities(id) ON DELETE CASCADE,
  game_id uuid NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  shared_by_user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  visibility text NOT NULL DEFAULT 'members' CHECK (
    visibility IN ('members', 'public')
  ),
  note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (community_id, game_id)
);

CREATE TABLE game_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id uuid NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  community_id uuid REFERENCES communities(id) ON DELETE CASCADE,
  parent_comment_id uuid REFERENCES game_comments(id) ON DELETE CASCADE,
  author_user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  body text NOT NULL CHECK (char_length(btrim(body)) > 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY (community_id, game_id)
    REFERENCES community_games(community_id, game_id) ON DELETE CASCADE
);

CREATE TABLE moves (
  id bigserial PRIMARY KEY,
  game_id uuid NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  ply_number integer NOT NULL CHECK (ply_number > 0),
  move_number integer NOT NULL CHECK (move_number > 0),
  color text NOT NULL CHECK (color IN ('white', 'black')),
  san text NOT NULL,
  uci text NOT NULL,
  fen_before text NOT NULL,
  fen_after text NOT NULL,
  is_capture boolean NOT NULL DEFAULT false,
  is_check boolean NOT NULL DEFAULT false,
  is_checkmate boolean NOT NULL DEFAULT false,
  is_castle boolean NOT NULL DEFAULT false,
  promotion_piece text CHECK (
    promotion_piece IS NULL OR promotion_piece IN ('q', 'r', 'b', 'n')
  ),
  clock_seconds integer CHECK (clock_seconds IS NULL OR clock_seconds >= 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (game_id, ply_number)
);

CREATE TABLE game_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id uuid NOT NULL REFERENCES games(id) ON DELETE CASCADE UNIQUE,
  requested_by_user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending' CHECK (
    status IN ('pending', 'running', 'ready', 'failed')
  ),
  engine_name text,
  engine_depth integer CHECK (engine_depth IS NULL OR engine_depth > 0),
  summary text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE review_positions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  review_id uuid NOT NULL REFERENCES game_reviews(id) ON DELETE CASCADE,
  ply_number integer NOT NULL CHECK (ply_number > 0),
  move_number integer NOT NULL CHECK (move_number > 0),
  side_to_move text NOT NULL CHECK (side_to_move IN ('white', 'black')),
  fen text NOT NULL,
  played_move_san text,
  best_move_san text,
  best_move_uci text,
  principal_variation text,
  evaluation_before integer,
  evaluation_after integer,
  centipawn_loss integer,
  classification text NOT NULL CHECK (
    classification IN (
      'best',
      'excellent',
      'good',
      'inaccuracy',
      'mistake',
      'blunder',
      'critical'
    )
  ),
  needs_human_explanation boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (review_id, ply_number)
);

CREATE TABLE game_support_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  community_id uuid NOT NULL REFERENCES communities(id) ON DELETE CASCADE,
  game_id uuid NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  review_position_id uuid REFERENCES review_positions(id) ON DELETE SET NULL,
  requested_by_user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  focus_ply_number integer NOT NULL CHECK (focus_ply_number > 0),
  label text NOT NULL,
  support_kind text NOT NULL CHECK (
    support_kind IN (
      'why_engine_move',
      'candidate_move',
      'plan',
      'calculation',
      'opening',
      'endgame',
      'other'
    )
  ),
  question_text text NOT NULL,
  status text NOT NULL DEFAULT 'open' CHECK (
    status IN ('open', 'in_review', 'resolved', 'archived')
  ),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY (community_id, game_id)
    REFERENCES community_games(community_id, game_id) ON DELETE CASCADE,
  FOREIGN KEY (game_id, focus_ply_number)
    REFERENCES moves(game_id, ply_number) ON DELETE CASCADE,
  UNIQUE (community_id, game_id, focus_ply_number, requested_by_user_id)
);

CREATE TABLE support_answers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id uuid NOT NULL REFERENCES game_support_requests(id) ON DELETE CASCADE,
  author_user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  answer_type text NOT NULL CHECK (
    answer_type IN ('explanation', 'line', 'resource', 'counterpoint')
  ),
  stance text NOT NULL CHECK (
    stance IN ('supports_engine', 'practical_alternative', 'needs_more_analysis')
  ),
  body text NOT NULL,
  proposed_move_san text,
  proposed_move_uci text,
  line_pgn text,
  is_poster_selected boolean NOT NULL DEFAULT false,
  poster_selected_at timestamptz,
  is_generally_accepted boolean NOT NULL DEFAULT false,
  generally_accepted_by_user_id uuid REFERENCES users(id) ON DELETE SET NULL,
  generally_accepted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (
    NOT is_poster_selected OR poster_selected_at IS NOT NULL
  ),
  CHECK (
    NOT is_generally_accepted
    OR (
      generally_accepted_at IS NOT NULL
      AND generally_accepted_by_user_id IS NOT NULL
    )
  )
);

CREATE TABLE support_answer_votes (
  answer_id uuid NOT NULL REFERENCES support_answers(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  vote_type text NOT NULL CHECK (vote_type IN ('endorse', 'disagree')),
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (answer_id, user_id)
);

CREATE TABLE notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  actor_user_id uuid REFERENCES users(id) ON DELETE SET NULL,
  community_id uuid REFERENCES communities(id) ON DELETE SET NULL,
  game_id uuid REFERENCES games(id) ON DELETE CASCADE,
  comment_id uuid REFERENCES game_comments(id) ON DELETE CASCADE,
  support_request_id uuid REFERENCES game_support_requests(id) ON DELETE CASCADE,
  support_answer_id uuid REFERENCES support_answers(id) ON DELETE CASCADE,
  event_type text NOT NULL CHECK (
    event_type IN (
      'followed_user_posted_game',
      'game_comment',
      'accepted_answer',
      'community_invite'
    )
  ),
  title text NOT NULL,
  body text,
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE discussion_threads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  community_id uuid REFERENCES communities(id) ON DELETE CASCADE,
  game_id uuid REFERENCES games(id) ON DELETE CASCADE,
  review_position_id uuid REFERENCES review_positions(id) ON DELETE CASCADE,
  support_request_id uuid REFERENCES game_support_requests(id) ON DELETE CASCADE,
  created_by_user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  thread_type text NOT NULL CHECK (
    thread_type IN ('community', 'game', 'position', 'study', 'support_request')
  ),
  title text NOT NULL,
  is_locked boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (
    community_id IS NOT NULL
    OR game_id IS NOT NULL
    OR review_position_id IS NOT NULL
    OR support_request_id IS NOT NULL
  )
);

CREATE TABLE discussion_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id uuid NOT NULL REFERENCES discussion_threads(id) ON DELETE CASCADE,
  author_user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  body text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO communities (
  owner_user_id,
  name,
  slug,
  description,
  visibility
)
SELECT
  users.id,
  players.display_name || '''s community',
  regexp_replace(users.username::text, '[^a-z0-9]+', '-', 'g') || '-community-' || left(users.id::text, 8),
  'A private home base for reviews, discussion, and shared study.',
  'private'
FROM users
JOIN user_player_links
  ON user_player_links.user_id = users.id
 AND user_player_links.is_primary = true
JOIN players ON players.id = user_player_links.player_id;

INSERT INTO community_memberships (
  community_id,
  user_id,
  role,
  status,
  joined_at
)
SELECT
  communities.id,
  communities.owner_user_id,
  'owner',
  'active',
  now()
FROM communities;

INSERT INTO user_profiles (
  user_id,
  display_name,
  headline,
  bio,
  home_community_id
)
SELECT
  users.id,
  players.display_name,
  'Studying with @' || users.username::text || '.',
  'Learning through shared analysis and community review.',
  communities.id
FROM users
JOIN user_player_links
  ON user_player_links.user_id = users.id
 AND user_player_links.is_primary = true
JOIN players ON players.id = user_player_links.player_id
JOIN communities ON communities.owner_user_id = users.id;

CREATE INDEX IF NOT EXISTS idx_players_normalized_name ON players(normalized_name);
CREATE INDEX IF NOT EXISTS idx_players_chesscom_username ON players(chesscom_username);
CREATE INDEX IF NOT EXISTS idx_players_lichess_username ON players(lichess_username);
CREATE INDEX IF NOT EXISTS idx_players_fide_id ON players(fide_id);

CREATE INDEX IF NOT EXISTS idx_user_player_links_user_id ON user_player_links(user_id);
CREATE INDEX IF NOT EXISTS idx_user_player_links_player_id ON user_player_links(player_id);
CREATE INDEX IF NOT EXISTS idx_user_player_links_relationship_type ON user_player_links(relationship_type);
CREATE UNIQUE INDEX IF NOT EXISTS idx_user_player_links_primary_per_user
  ON user_player_links(user_id)
  WHERE is_primary = true;

CREATE INDEX IF NOT EXISTS idx_communities_owner_user_id ON communities(owner_user_id);
CREATE INDEX IF NOT EXISTS idx_communities_visibility ON communities(visibility);
CREATE INDEX IF NOT EXISTS idx_user_profiles_home_community_id ON user_profiles(home_community_id);
CREATE INDEX IF NOT EXISTS idx_community_memberships_community_id ON community_memberships(community_id);
CREATE INDEX IF NOT EXISTS idx_community_memberships_user_id ON community_memberships(user_id);
CREATE INDEX IF NOT EXISTS idx_community_memberships_role ON community_memberships(role);
CREATE INDEX IF NOT EXISTS idx_community_memberships_status ON community_memberships(status);
CREATE INDEX IF NOT EXISTS idx_user_follows_follower_user_id ON user_follows(follower_user_id);
CREATE INDEX IF NOT EXISTS idx_user_follows_followed_user_id ON user_follows(followed_user_id);
CREATE INDEX IF NOT EXISTS idx_user_follows_notify_on_posts ON user_follows(notify_on_posts);
CREATE INDEX IF NOT EXISTS idx_games_uploaded_by_user_id ON games(uploaded_by_user_id);
CREATE INDEX IF NOT EXISTS idx_games_player_id ON games(player_id);
CREATE INDEX IF NOT EXISTS idx_games_source_type ON games(source_type);
CREATE INDEX IF NOT EXISTS idx_games_source_game_id ON games(source_game_id);
CREATE INDEX IF NOT EXISTS idx_games_played_at ON games(played_at);
CREATE INDEX IF NOT EXISTS idx_games_player_result ON games(player_result);
CREATE INDEX IF NOT EXISTS idx_games_eco_code ON games(eco_code);
CREATE INDEX IF NOT EXISTS idx_games_analysis_status ON games(analysis_status);
CREATE INDEX IF NOT EXISTS idx_community_games_community_id ON community_games(community_id);
CREATE INDEX IF NOT EXISTS idx_community_games_game_id ON community_games(game_id);
CREATE INDEX IF NOT EXISTS idx_community_games_shared_by_user_id ON community_games(shared_by_user_id);
CREATE INDEX IF NOT EXISTS idx_game_comments_game_id ON game_comments(game_id);
CREATE INDEX IF NOT EXISTS idx_game_comments_community_id ON game_comments(community_id);
CREATE INDEX IF NOT EXISTS idx_game_comments_parent_comment_id ON game_comments(parent_comment_id);
CREATE INDEX IF NOT EXISTS idx_game_comments_author_user_id ON game_comments(author_user_id);
CREATE INDEX IF NOT EXISTS idx_moves_game_id ON moves(game_id);
CREATE INDEX IF NOT EXISTS idx_moves_move_number ON moves(game_id, move_number);
CREATE INDEX IF NOT EXISTS idx_moves_color ON moves(game_id, color);
CREATE INDEX IF NOT EXISTS idx_game_reviews_requested_by_user_id ON game_reviews(requested_by_user_id);
CREATE INDEX IF NOT EXISTS idx_game_reviews_status ON game_reviews(status);
CREATE INDEX IF NOT EXISTS idx_review_positions_review_id ON review_positions(review_id);
CREATE INDEX IF NOT EXISTS idx_review_positions_classification ON review_positions(classification);
CREATE INDEX IF NOT EXISTS idx_review_positions_needs_human_explanation
  ON review_positions(needs_human_explanation);
CREATE INDEX IF NOT EXISTS idx_game_support_requests_community_id ON game_support_requests(community_id);
CREATE INDEX IF NOT EXISTS idx_game_support_requests_game_id ON game_support_requests(game_id);
CREATE INDEX IF NOT EXISTS idx_game_support_requests_requested_by_user_id
  ON game_support_requests(requested_by_user_id);
CREATE INDEX IF NOT EXISTS idx_game_support_requests_status ON game_support_requests(status);
CREATE INDEX IF NOT EXISTS idx_game_support_requests_support_kind ON game_support_requests(support_kind);
CREATE INDEX IF NOT EXISTS idx_support_answers_request_id ON support_answers(request_id);
CREATE INDEX IF NOT EXISTS idx_support_answers_author_user_id ON support_answers(author_user_id);
CREATE INDEX IF NOT EXISTS idx_support_answers_generally_accepted ON support_answers(is_generally_accepted);
CREATE UNIQUE INDEX IF NOT EXISTS idx_support_answers_one_poster_selected_per_request
  ON support_answers(request_id)
  WHERE is_poster_selected = true;
CREATE UNIQUE INDEX IF NOT EXISTS idx_support_answers_one_generally_accepted_per_request
  ON support_answers(request_id)
  WHERE is_generally_accepted = true;
CREATE INDEX IF NOT EXISTS idx_support_answer_votes_user_id ON support_answer_votes(user_id);
CREATE INDEX IF NOT EXISTS idx_support_answer_votes_vote_type ON support_answer_votes(vote_type);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_actor_user_id ON notifications(actor_user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_event_type ON notifications(event_type);
CREATE INDEX IF NOT EXISTS idx_notifications_read_at ON notifications(read_at);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at);
CREATE INDEX IF NOT EXISTS idx_discussion_threads_community_id ON discussion_threads(community_id);
CREATE INDEX IF NOT EXISTS idx_discussion_threads_game_id ON discussion_threads(game_id);
CREATE INDEX IF NOT EXISTS idx_discussion_threads_review_position_id ON discussion_threads(review_position_id);
CREATE INDEX IF NOT EXISTS idx_discussion_threads_support_request_id ON discussion_threads(support_request_id);
CREATE INDEX IF NOT EXISTS idx_discussion_threads_created_by_user_id ON discussion_threads(created_by_user_id);
CREATE INDEX IF NOT EXISTS idx_discussion_messages_thread_id ON discussion_messages(thread_id);
CREATE INDEX IF NOT EXISTS idx_discussion_messages_author_user_id ON discussion_messages(author_user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON sessions(expires_at);
