import type { Team } from "../../../shared/team";
import type { ScheduleRound } from "../../../shared/schedule";
import type { LeaderboardRow } from "../../../shared/leaderboard";
import type { TeamBonusPoint } from "../../../shared/team-bonus-point";

export type { Team, ScheduleRound, LeaderboardRow, TeamBonusPoint };

async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(body?.error ?? `Request failed with status ${res.status}`);
  }
  return res.json() as Promise<T>;
}

export function fetchTeams(): Promise<Team[]> {
  return fetch("/api/teams").then((res) => handleResponse<Team[]>(res));
}

export function createTeam(input: { name: string; color: string }): Promise<Team> {
  return fetch("/api/teams", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  }).then((res) => handleResponse<Team>(res));
}

export function updateTeam(
  number: number,
  input: { name?: string; color?: string },
): Promise<Team> {
  return fetch(`/api/teams/${number}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  }).then((res) => handleResponse<Team>(res));
}

export function fetchTeamBonusPoints(teamNumber: number): Promise<TeamBonusPoint[]> {
  return fetch(`/api/teams/${teamNumber}/bonus-points`).then((res) =>
    handleResponse<TeamBonusPoint[]>(res),
  );
}

export function createTeamBonusPoint(
  teamNumber: number,
  input: { points: number; description: string },
): Promise<TeamBonusPoint> {
  return fetch(`/api/teams/${teamNumber}/bonus-points`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  }).then((res) => handleResponse<TeamBonusPoint>(res));
}

export function updateTeamBonusPoint(
  id: number,
  input: { points?: number; description?: string },
): Promise<TeamBonusPoint> {
  return fetch(`/api/bonus-points/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  }).then((res) => handleResponse<TeamBonusPoint>(res));
}

export function deleteTeamBonusPoint(id: number): Promise<TeamBonusPoint> {
  return fetch(`/api/bonus-points/${id}`, { method: "DELETE" }).then((res) =>
    handleResponse<TeamBonusPoint>(res),
  );
}

export function fetchSchedule(): Promise<ScheduleRound[]> {
  return fetch("/api/schedule").then((res) => handleResponse<ScheduleRound[]>(res));
}

export type MatchResult = { id: number; winnerTeamNumber: number | null; recordedAt: string | null };

export function recordMatchResult(matchId: number, winnerTeamNumber: number): Promise<MatchResult> {
  return fetch(`/api/matches/${matchId}/result`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ winner_team_number: winnerTeamNumber }),
  }).then((res) => handleResponse<MatchResult>(res));
}

export function clearMatchResult(matchId: number): Promise<MatchResult> {
  return fetch(`/api/matches/${matchId}/result`, { method: "DELETE" }).then((res) =>
    handleResponse<MatchResult>(res),
  );
}

export function fetchLeaderboard(): Promise<LeaderboardRow[]> {
  return fetch("/api/leaderboard").then((res) => handleResponse<LeaderboardRow[]>(res));
}

export function resetTournament(): Promise<{ ok: true }> {
  return fetch("/api/admin/reset", { method: "POST" }).then((res) =>
    handleResponse<{ ok: true }>(res),
  );
}
