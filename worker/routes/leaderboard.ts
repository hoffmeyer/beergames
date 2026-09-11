import { Hono } from "hono";
import type { Env } from "../env";
import type { LeaderboardRow } from "../../shared/leaderboard";

type TeamStandingRow = {
  number: number;
  name: string;
  avatar: string;
  event_points: number;
  bonus_points: number;
};

export const leaderboard = new Hono<{ Bindings: Env }>();

leaderboard.get("/", async (c) => {
  const { results: standings } = await c.env.DB.prepare(
    `SELECT
       t.number AS number,
       t.name   AS name,
       t.avatar AS avatar,
       (SELECT COALESCE(SUM(CASE ep.rank
              WHEN 1 THEN 10
              WHEN 2 THEN 7
              WHEN 3 THEN 5
              WHEN 4 THEN 3
              WHEN 5 THEN 1
            END), 0)
        FROM event_placements ep
        WHERE ep.team_number = t.number)                AS event_points,
       (SELECT COALESCE(SUM(b.points), 0)
        FROM team_bonus_points b
        WHERE b.team_number = t.number)                 AS bonus_points
     FROM teams t
     ORDER BY event_points DESC, bonus_points DESC, t.number ASC`,
  ).all<TeamStandingRow>();

  const rows: LeaderboardRow[] = [];
  let index = 0;
  while (index < standings.length) {
    let groupEnd = index + 1;
    while (
      groupEnd < standings.length &&
      standings[groupEnd].event_points === standings[index].event_points &&
      standings[groupEnd].bonus_points === standings[index].bonus_points
    ) {
      groupEnd++;
    }
    const group = standings.slice(index, groupEnd);
    const rank = index + 1;
    const tied = group.length > 1;

    for (const team of group) {
      rows.push({
        number: team.number,
        name: team.name,
        avatar: team.avatar,
        eventPoints: team.event_points,
        bonusPoints: team.bonus_points,
        rank,
        needsTiebreaker: tied,
        tiedWith: tied ? group.filter((t) => t.number !== team.number).map((t) => t.number) : [],
      });
    }

    index = groupEnd;
  }

  return c.json(rows);
});
