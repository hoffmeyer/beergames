import type { ScheduleTeamRef } from "../../../shared/schedule";

export function teamLabel(team: ScheduleTeamRef): string {
  return team.name ?? `Team ${team.number} — unnamed`;
}
