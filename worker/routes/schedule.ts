import { Hono } from "hono";
import type { Env } from "../env";
import type { MatchEvent, ScheduleRound, ScheduleTeamRef } from "../../shared/schedule";

type ScheduleRow = {
  round_number: number;
  resting_team_number: number;
  resting_team_name: string | null;
  resting_team_avatar: string | null;
  match_id: number;
  match_order: number;
  event: MatchEvent;
  team_a_number: number;
  team_a_name: string | null;
  team_a_avatar: string | null;
  team_b_number: number;
  team_b_name: string | null;
  team_b_avatar: string | null;
  winner_team_number: number | null;
  recorded_at: string | null;
};

function teamRef(number: number, name: string | null, avatar: string | null): ScheduleTeamRef {
  return { number, name, avatar };
}

export const schedule = new Hono<{ Bindings: Env }>();

schedule.get("/", async (c) => {
  const { results } = await c.env.DB.prepare(
    `SELECT
       r.round_number          AS round_number,
       r.resting_team_number   AS resting_team_number,
       rt.name                 AS resting_team_name,
       rt.avatar               AS resting_team_avatar,
       m.id                    AS match_id,
       m.match_order           AS match_order,
       m.event                 AS event,
       m.team_a_number         AS team_a_number,
       ta.name                 AS team_a_name,
       ta.avatar               AS team_a_avatar,
       m.team_b_number         AS team_b_number,
       tb.name                 AS team_b_name,
       tb.avatar               AS team_b_avatar,
       m.winner_team_number    AS winner_team_number,
       m.recorded_at           AS recorded_at
     FROM rounds r
     JOIN matches m ON m.round_number = r.round_number
     LEFT JOIN teams rt ON rt.number = r.resting_team_number
     LEFT JOIN teams ta ON ta.number = m.team_a_number
     LEFT JOIN teams tb ON tb.number = m.team_b_number
     ORDER BY r.round_number, m.match_order`,
  ).all<ScheduleRow>();

  const rounds = new Map<number, ScheduleRound>();
  for (const row of results) {
    let round = rounds.get(row.round_number);
    if (!round) {
      round = {
        roundNumber: row.round_number,
        restingTeam: teamRef(row.resting_team_number, row.resting_team_name, row.resting_team_avatar),
        matches: [],
      };
      rounds.set(row.round_number, round);
    }
    round.matches.push({
      id: row.match_id,
      event: row.event,
      teamA: teamRef(row.team_a_number, row.team_a_name, row.team_a_avatar),
      teamB: teamRef(row.team_b_number, row.team_b_name, row.team_b_avatar),
      winnerTeamNumber: row.winner_team_number,
      recordedAt: row.recorded_at,
    });
  }

  return c.json([...rounds.values()]);
});
