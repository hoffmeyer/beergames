import { Hono } from "hono";
import type { Env } from "../env";
import type { LeaderboardRow } from "../../shared/leaderboard";

type TeamStandingRow = {
  number: number;
  name: string;
  color: string;
  wins: number;
  matches_played: number;
};

type MatchPairRow = {
  team_a_number: number;
  team_b_number: number;
  winner_team_number: number | null;
};

/** Order-independent key for a pair of team numbers, since each pair plays exactly one match. */
function pairKey(a: number, b: number): string {
  return a < b ? `${a}-${b}` : `${b}-${a}`;
}

export const leaderboard = new Hono<{ Bindings: Env }>();

leaderboard.get("/", async (c) => {
  const [{ results: standings }, { results: allMatches }] = await Promise.all([
    c.env.DB.prepare(
      `SELECT
         t.number                                                                      AS number,
         t.name                                                                        AS name,
         t.color                                                                       AS color,
         COALESCE(SUM(CASE WHEN m.winner_team_number = t.number THEN 1 ELSE 0 END), 0) AS wins,
         COALESCE(SUM(CASE
           WHEN m.winner_team_number IS NOT NULL
            AND (m.team_a_number = t.number OR m.team_b_number = t.number)
           THEN 1 ELSE 0 END), 0)                                                      AS matches_played
       FROM teams t
       LEFT JOIN matches m ON m.team_a_number = t.number OR m.team_b_number = t.number
       GROUP BY t.number
       ORDER BY wins DESC, t.number ASC`,
    ).all<TeamStandingRow>(),
    c.env.DB.prepare(`SELECT team_a_number, team_b_number, winner_team_number FROM matches`).all<MatchPairRow>(),
  ]);

  const headToHeadWinner = new Map<string, number | null>();
  for (const match of allMatches) {
    headToHeadWinner.set(pairKey(match.team_a_number, match.team_b_number), match.winner_team_number);
  }

  const rows: LeaderboardRow[] = [];
  let index = 0;
  while (index < standings.length) {
    let groupEnd = index + 1;
    while (groupEnd < standings.length && standings[groupEnd].wins === standings[index].wins) {
      groupEnd++;
    }
    const group = standings.slice(index, groupEnd);
    const rank = index + 1;

    if (group.length === 1) {
      rows.push(toRow({ team: group[0], rank, resolvedBy: null, needsTiebreaker: false, tiedWith: [] }));
    } else if (group.length === 2) {
      const [teamX, teamY] = group;
      const winner = headToHeadWinner.get(pairKey(teamX.number, teamY.number)) ?? null;
      const [first, second] = winner === teamY.number ? [teamY, teamX] : [teamX, teamY];

      rows.push(
        toRow({
          team: first,
          rank,
          resolvedBy: winner ? "head_to_head" : null,
          needsTiebreaker: false,
          tiedWith: [second.number],
        }),
      );
      rows.push(
        toRow({
          team: second,
          rank: winner ? rank + 1 : rank,
          resolvedBy: winner ? "head_to_head" : null,
          needsTiebreaker: false,
          tiedWith: [first.number],
        }),
      );
    } else {
      for (const team of group) {
        rows.push(
          toRow({
            team,
            rank,
            resolvedBy: null,
            needsTiebreaker: true,
            tiedWith: group.filter((t) => t.number !== team.number).map((t) => t.number),
          }),
        );
      }
    }

    index = groupEnd;
  }

  return c.json(rows);
});

function toRow(args: {
  team: TeamStandingRow;
  rank: number;
  resolvedBy: LeaderboardRow["resolvedBy"];
  needsTiebreaker: boolean;
  tiedWith: number[];
}): LeaderboardRow {
  const { team, rank, resolvedBy, needsTiebreaker, tiedWith } = args;
  return {
    number: team.number,
    name: team.name,
    color: team.color,
    wins: team.wins,
    matchesPlayed: team.matches_played,
    rank,
    resolvedBy,
    needsTiebreaker,
    tiedWith,
  };
}
