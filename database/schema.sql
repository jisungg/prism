CREATE EXTENSION IF NOT EXISTS citext;
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email citext NOT NULL UNIQUE,
  username citext NOT NULL UNIQUE,
  password_hash text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash text NOT NULL UNIQUE,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE players (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  display_name text NOT NULL,
  normalized_name citext NOT NULL UNIQUE,
  chesscom_username citext,
  lichess_username citext,
  fide_id text,
  title text,
  federation text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE user_player_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  player_id uuid NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  relationship_type text NOT NULL CHECK (
    relationship_type IN ('self', 'alternate', 'tracked')
  ),
  is_primary boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (NOT is_primary OR relationship_type IN ('self', 'alternate')),
  UNIQUE (user_id, player_id)
);

CREATE TABLE games (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_type text NOT NULL,
  source_game_id text,
  event_name text,
  site text,
  played_at timestamptz,
  result text NOT NULL CHECK (
    result IN ('white_win', 'black_win', 'draw', 'unfinished')
  ),
  termination text,
  time_control text,
  eco_code text,
  opening_name text,
  variation_name text,
  initial_fen text,
  moves_count integer NOT NULL DEFAULT 0 CHECK (moves_count >= 0),
  pgn_text text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE game_participants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id uuid NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  player_id uuid NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  color text NOT NULL CHECK (color IN ('white', 'black')),
  rating integer,
  result text NOT NULL CHECK (result IN ('win', 'loss', 'draw', 'unknown')),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (game_id, color),
  UNIQUE (game_id, player_id)
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

CREATE TABLE user_game_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  game_id uuid NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  relationship_type text NOT NULL CHECK (
    relationship_type IN ('imported', 'saved', 'owned')
  ),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, game_id, relationship_type)
);

CREATE INDEX idx_players_normalized_name ON players(normalized_name);
CREATE INDEX idx_players_chesscom_username ON players(chesscom_username);
CREATE INDEX idx_players_lichess_username ON players(lichess_username);
CREATE INDEX idx_players_fide_id ON players(fide_id);

CREATE INDEX idx_user_player_links_user_id ON user_player_links(user_id);
CREATE INDEX idx_user_player_links_player_id ON user_player_links(player_id);
CREATE INDEX idx_user_player_links_relationship_type ON user_player_links(relationship_type);
CREATE UNIQUE INDEX idx_user_player_links_primary_per_user
  ON user_player_links(user_id)
  WHERE is_primary = true;

CREATE INDEX idx_games_source_type ON games(source_type);
CREATE INDEX idx_games_source_game_id ON games(source_game_id);
CREATE INDEX idx_games_played_at ON games(played_at);
CREATE INDEX idx_games_result ON games(result);
CREATE INDEX idx_games_eco_code ON games(eco_code);

CREATE INDEX idx_game_participants_game_id ON game_participants(game_id);
CREATE INDEX idx_game_participants_player_id ON game_participants(player_id);
CREATE INDEX idx_game_participants_color ON game_participants(color);

CREATE INDEX idx_moves_game_id ON moves(game_id);
CREATE INDEX idx_moves_move_number ON moves(game_id, move_number);
CREATE INDEX idx_moves_color ON moves(game_id, color);

CREATE INDEX idx_user_game_links_user_id ON user_game_links(user_id);
CREATE INDEX idx_user_game_links_game_id ON user_game_links(game_id);
CREATE INDEX idx_user_game_links_relationship_type ON user_game_links(relationship_type);

CREATE INDEX idx_sessions_user_id ON sessions(user_id);
CREATE INDEX idx_sessions_expires_at ON sessions(expires_at);
