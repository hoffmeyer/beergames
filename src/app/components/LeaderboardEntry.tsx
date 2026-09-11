import { useState } from "react";
import { BonusPointsList } from "./BonusPointsList";
import { EventPointsList } from "./EventPointsList";
import { TeamAvatar } from "./TeamAvatar";
import { useTeamBonusPoints } from "../lib/useTeamBonusPoints";
import { useTeamEvents } from "../lib/useTeamEvents";
import type { LeaderboardRow } from "../lib/api";

type LeaderboardEntryProps = {
  row: LeaderboardRow;
  note: string | null;
};

function ChevronIcon({ expanded }: { expanded: boolean }) {
  return (
    <svg
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      className={`h-5 w-5 transition-transform ${expanded ? "rotate-180" : ""}`}
    >
      <path d="M5 7.5l5 5 5-5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function LeaderboardEntry({ row, note }: LeaderboardEntryProps) {
  const [expanded, setExpanded] = useState(false);
  const { bonusPoints, isLoading: bonusPointsLoading } = useTeamBonusPoints(row.number, {
    enabled: expanded,
  });
  const { teamEvents, isLoading: teamEventsLoading } = useTeamEvents(row.number, { enabled: expanded });

  return (
    <li className="flex flex-col gap-1 rounded-lg border border-gray-200 p-3">
      <div className="flex items-center gap-3">
        <span className="w-6 text-right font-semibold text-gray-500">{row.rank}</span>
        <TeamAvatar avatar={row.avatar} size="sm" />
        <span className="min-w-0 flex-1 truncate font-medium">{row.name}</span>
        <span className="shrink-0 text-sm text-gray-600">
          {row.eventPoints} event pt{row.eventPoints === 1 ? "" : "s"} · {row.bonusPoints} bonus pt
          {row.bonusPoints === 1 ? "" : "s"}
        </span>
        <button
          type="button"
          aria-label={expanded ? "Hide details" : "Show details"}
          className="flex min-h-11 min-w-11 shrink-0 items-center justify-center text-gray-600"
          onClick={() => setExpanded((value) => !value)}
        >
          <ChevronIcon expanded={expanded} />
        </button>
      </div>
      {note && <p className="text-xs font-medium text-amber-600">{note}</p>}
      {expanded &&
        (bonusPointsLoading || teamEventsLoading ? (
          <p className="border-t border-gray-100 pt-3 text-sm text-gray-500">Loading…</p>
        ) : (
          <>
            <BonusPointsList entries={bonusPoints} />
            <EventPointsList entries={teamEvents} />
          </>
        ))}
    </li>
  );
}
