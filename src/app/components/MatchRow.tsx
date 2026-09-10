import type { ScheduleMatch } from "../../../shared/schedule";
import { teamLabel } from "../lib/teamLabel";
import { TeamAvatar } from "./TeamAvatar";

const EVENT_LABELS: Record<ScheduleMatch["event"], string> = {
  kubb: "Kubb",
  flunkyball: "Flunkyball",
  tug_of_war: "Tug of War",
};

function TeamChip({ team, isWinner }: { team: ScheduleMatch["teamA"]; isWinner: boolean }) {
  return (
    <span className={`flex min-w-0 items-center gap-2 ${isWinner ? "font-semibold" : ""}`}>
      <TeamAvatar avatar={team.avatar} size="sm" />
      <span className={`truncate ${team.name ? "" : "italic text-gray-400"}`}>{teamLabel(team)}</span>
      {isWinner && <span className="shrink-0 text-xs text-blue-600">Winner</span>}
    </span>
  );
}

export function MatchRow({
  match,
  onSelect,
}: {
  match: ScheduleMatch;
  onSelect: (match: ScheduleMatch) => void;
}) {
  const hasPlaceholder = match.teamA.name === null || match.teamB.name === null;

  return (
    <button
      type="button"
      disabled={hasPlaceholder}
      onClick={() => onSelect(match)}
      className="flex min-h-11 w-full items-center justify-between rounded-md border border-gray-100 px-3 py-2 text-left disabled:opacity-50"
    >
      <div className="flex min-w-0 flex-1 flex-col gap-1 text-sm">
        <TeamChip team={match.teamA} isWinner={match.winnerTeamNumber === match.teamA.number} />
        <TeamChip team={match.teamB} isWinner={match.winnerTeamNumber === match.teamB.number} />
      </div>
      <span className="shrink-0 pl-2 text-xs font-medium uppercase tracking-wide text-gray-500">
        {EVENT_LABELS[match.event]}
      </span>
    </button>
  );
}
