CREATE TABLE teams (
  number     INTEGER PRIMARY KEY CHECK (number BETWEEN 1 AND 5),
  name       TEXT NOT NULL,
  color      TEXT NOT NULL UNIQUE,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
