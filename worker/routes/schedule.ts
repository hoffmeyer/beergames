import { Hono } from "hono";
import type { Env } from "../env";
import type { MatchEvent, ScheduleRound, ScheduleTeamRef } from "../../shared/schedule";

type ScheduleRow = {
  round_number: number;
  resting_team_number: number;
  resting_team_name: string | null;
  resting_team_color: string | null;
  match_id: number;
  match_order: number;
  event: MatchEvent;
  team_a_number: number;
  team_a_name: string | null;
  team_a_color: string | null;
  team_b_number: number;
  team_b_name: string | null;
  team_b_color: string | null;
  winner_team_number: number | null;
  recorded_at: string | null;
};

function teamRef(number: number, name: string | null, color: string | null): ScheduleTeamRef {
  return { number, name, color };
}

export const schedule = new Hono<{ Bindings: Env }>();

schedule.get("/", async (c) => {
  const { results } = await c.env.DB.prepare(
    `SELECT
       r.round_number          AS round_number,
       r.resting_team_number   AS resting_team_number,
       rt.name                 AS resting_team_name,
       rt.color                AS resting_team_color,
       m.id                    AS match_id,
       m.match_order           AS match_order,
       m.event                 AS event,
       m.team_a_number         AS team_a_number,
       ta.name                 AS team_a_name,
       ta.color                AS team_a_color,
       m.team_b_number         AS team_b_number,
       tb.name                 AS team_b_name,
       tb.color                AS team_b_color,
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
        restingTeam: teamRef(row.resting_team_number, row.resting_team_name, row.resting_team_color),
        matches: [],
      };
      rounds.set(row.round_number, round);
    }
    round.matches.push({
      id: row.match_id,
      event: row.event,
      teamA: teamRef(row.team_a_number, row.team_a_name, row.team_a_color),
      teamB: teamRef(row.team_b_number, row.team_b_name, row.team_b_color),
      winnerTeamNumber: row.winner_team_number,
      recordedAt: row.recorded_at,
    });
  }

  return c.json([...rounds.values()]);
});
