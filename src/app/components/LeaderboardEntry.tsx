import { useState } from "react";
import { BonusPointsList } from "./BonusPointsList";
import { TeamAvatar } from "./TeamAvatar";
import { useTeamBonusPoints } from "../lib/useTeamBonusPoints";
import type { LeaderboardRow } from "../lib/api";

type TieNote = { tone: "amber" | "gray"; text: string };

type LeaderboardEntryProps = {
  row: LeaderboardRow;
  note: TieNote | null;
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
  const { bonusPoints, isLoading } = useTeamBonusPoints(row.number, { enabled: expanded });

  return (
    <li className="flex flex-col gap-1 rounded-lg border border-gray-200 p-3">
      <div className="flex items-center gap-3">
        <span className="w-6 text-right font-semibold text-gray-500">{row.rank}</span>
        <TeamAvatar avatar={row.avatar} size="sm" />
        <span className="min-w-0 flex-1 truncate font-medium">{row.name}</span>
        <span className="shrink-0 text-sm text-gray-600">
          {row.wins} win{row.wins === 1 ? "" : "s"}
          {row.bonusPoints > 0 && ` · ${row.bonusPoints} bonus`} · {row.matchesPlayed} played
        </span>
        <button
          type="button"
          aria-label={expanded ? "Hide bonus points" : "Show bonus points"}
          className="flex min-h-11 min-w-11 shrink-0 items-center justify-center text-gray-600"
          onClick={() => setExpanded((value) => !value)}
        >
          <ChevronIcon expanded={expanded} />
        </button>
      </div>
      {note && (
        <p className={`text-xs ${note.tone === "amber" ? "font-medium text-amber-600" : "text-gray-500"}`}>
          {note.text}
        </p>
      )}
      {expanded &&
        (isLoading ? (
          <p className="border-t border-gray-100 pt-3 text-sm text-gray-500">Loading…</p>
        ) : (
          <BonusPointsList entries={bonusPoints} />
        ))}
    </li>
  );
}
