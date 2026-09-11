import type { TeamBonusPoint } from "../lib/api";

type BonusPointsListProps = {
  entries: TeamBonusPoint[];
};

export function BonusPointsList({ entries }: BonusPointsListProps) {
  if (entries.length === 0) {
    return <p className="border-t border-gray-100 pt-3 text-sm text-gray-500">No bonus points yet.</p>;
  }

  return (
    <ul className="flex flex-col gap-1 border-t border-gray-100 pt-3">
      {entries.map((entry) => (
        <li key={entry.id} className="text-sm">
          +{entry.points} — {entry.description}
        </li>
      ))}
    </ul>
  );
}
