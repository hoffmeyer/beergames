CREATE TABLE team_bonus_points (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  team_number   INTEGER NOT NULL REFERENCES teams(number),
  points        INTEGER NOT NULL CHECK (points > 0),
  description   TEXT NOT NULL CHECK (length(trim(description)) > 0),
  created_at    TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  updated_at    TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
