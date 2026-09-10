CREATE TABLE rounds (
  round_number         INTEGER PRIMARY KEY CHECK (round_number BETWEEN 1 AND 5),
  resting_team_number  INTEGER NOT NULL
);

CREATE TABLE matches (
  id                  INTEGER PRIMARY KEY AUTOINCREMENT,
  round_number        INTEGER NOT NULL REFERENCES rounds(round_number),
  match_order         INTEGER NOT NULL,
  event               TEXT NOT NULL CHECK (event IN ('kubb','flunkyball','tug_of_war')),
  team_a_number       INTEGER NOT NULL,
  team_b_number       INTEGER NOT NULL,
  winner_team_number  INTEGER,
  recorded_at         TEXT
);

INSERT INTO rounds (round_number, resting_team_number) VALUES
  (1,1), (2,2), (3,3), (4,4), (5,5);

INSERT INTO matches (round_number, match_order, event, team_a_number, team_b_number) VALUES
  (1,1,'tug_of_war',2,5), (1,2,'flunkyball',3,4),
  (2,1,'tug_of_war',1,3), (2,2,'kubb',4,5),
  (3,1,'tug_of_war',2,4), (3,2,'flunkyball',1,5),
  (4,1,'kubb',3,5),       (4,2,'flunkyball',1,2),
  (5,1,'kubb',1,4),       (5,2,'kubb',2,3);
