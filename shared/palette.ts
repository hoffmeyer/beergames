export const TEAM_COLOR_PALETTE = [
  "#ef4444",
  "#3b82f6",
  "#22c55e",
  "#eab308",
  "#a855f7",
] as const;

export type TeamColor = (typeof TEAM_COLOR_PALETTE)[number];

export function isValidTeamColor(color: string): color is TeamColor {
  return (TEAM_COLOR_PALETTE as readonly string[]).includes(color);
}
