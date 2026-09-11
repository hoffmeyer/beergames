import { TeamAvatar } from "./TeamAvatar";
import type { ScheduleStandingRow } from "../lib/api";

type ScheduleStandingsPreviewProps = {
  rows: ScheduleStandingRow[];
};

export function ScheduleStandingsPreview({ rows }: ScheduleStandingsPreviewProps) {
  if (rows.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-gray-200 p-4">
      <div>
        <h2 className="font-semibold">Standings preview</h2>
        <p className="text-xs text-gray-500">
          Reference only — doesn't affect real scoring. Use it to fill in the "Tournament" event once
          play wraps up.
        </p>
      </div>
      <ul className="flex flex-col gap-2">
        {rows.map((row) => (
          <li key={row.number} className="flex items-center gap-3">
            <span className="w-6 text-right font-semibold text-gray-500">{row.rank}</span>
            <TeamAvatar avatar={row.avatar} size="sm" />
            <span className="min-w-0 flex-1 truncate font-medium">{row.name}</span>
            <span className="shrink-0 text-sm text-gray-600">
              {row.wins} win{row.wins === 1 ? "" : "s"} · {row.matchesPlayed} played
              {row.bonusPoints > 0 && ` · ${row.bonusPoints} bonus`} · {row.previewPoints} pts
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
