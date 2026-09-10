export type LeaderboardRow = {
  number: number;
  name: string;
  color: string;
  wins: number;
  matchesPlayed: number;
  /** Competition ranking (1, 2, 2, 4, ...) — ties share a rank until resolved. */
  rank: number;
  resolvedBy: "head_to_head" | null;
  /** True for an unresolved 3+-team tie cycle; settled manually outside the app. */
  needsTiebreaker: boolean;
  /** Other team numbers sharing this rank's win count, empty when not tied. */
  tiedWith: number[];
};
