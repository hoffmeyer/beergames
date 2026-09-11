export type LeaderboardRow = {
  number: number;
  name: string;
  avatar: string;
  eventPoints: number;
  bonusPoints: number;
  /** Competition ranking (1, 2, 2, 4, ...) — ties share a rank until resolved. */
  rank: number;
  /** True when this team is tied with another on both event and bonus points. */
  needsTiebreaker: boolean;
  /** Other team numbers sharing this rank, empty when not tied. */
  tiedWith: number[];
};
