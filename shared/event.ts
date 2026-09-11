/** Placement rank -> points awarded. Ties share the value for their rank. */
export const POINTS_TABLE: Record<1 | 2 | 3 | 4 | 5, number> = {
  1: 10,
  2: 7,
  3: 5,
  4: 3,
  5: 1,
};

export type EventPlacement = {
  teamNumber: number;
  rank: number;
};

export type Event = {
  id: number;
  name: string;
  createdAt: string;
  updatedAt: string;
  placements: EventPlacement[];
};
