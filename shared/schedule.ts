export type MatchEvent = "kubb" | "flunkyball" | "tug_of_war";

/** A team reference within the schedule; `name`/`avatar` are null until that slot's team is created. */
export type ScheduleTeamRef = {
  number: number;
  name: string | null;
  avatar: string | null;
};

export type ScheduleMatch = {
  id: number;
  event: MatchEvent;
  teamA: ScheduleTeamRef;
  teamB: ScheduleTeamRef;
  winnerTeamNumber: number | null;
  recordedAt: string | null;
};

export type ScheduleRound = {
  roundNumber: number;
  restingTeam: ScheduleTeamRef;
  matches: ScheduleMatch[];
};
