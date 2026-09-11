export type ScheduleStandingRow = {
  number: number;
  name: string;
  avatar: string;
  wins: number;
  matchesPlayed: number;
  bonusPoints: number;
  /** Competition ranking (1, 2, 2, 4, ...) — ties share a rank. */
  rank: number;
  /** Reference-only points preview: POINTS_TABLE value for this standing's rank. */
  previewPoints: number;
  /** Other team numbers sharing this rank, empty when not tied. */
  tiedWith: number[];
};
