import type { Team } from "../../../shared/team";
import type { ScheduleRound } from "../../../shared/schedule";

export type { Team, ScheduleRound };

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

export function fetchSchedule(): Promise<ScheduleRound[]> {
  return fetch("/api/schedule").then((res) => handleResponse<ScheduleRound[]>(res));
}
