import type { TeamEventEntry } from "../lib/api";

type EventPointsListProps = {
  entries: TeamEventEntry[];
};

export function EventPointsList({ entries }: EventPointsListProps) {
  if (entries.length === 0) {
    return <p className="border-t border-gray-100 pt-3 text-sm text-gray-500">No events scored yet.</p>;
  }

  return (
    <ul className="flex flex-col gap-1 border-t border-gray-100 pt-3">
      {entries.map((entry) => (
        <li key={entry.eventId} className="text-sm">
          {entry.eventName}: {entry.points} pts (rank {entry.rank})
        </li>
      ))}
    </ul>
  );
}
