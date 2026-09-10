import type { ScheduleMatch } from "../../../shared/schedule";
import { teamLabel } from "../lib/teamLabel";

const EVENT_LABELS: Record<ScheduleMatch["event"], string> = {
  kubb: "Kubb",
  flunkyball: "Flunkyball",
  tug_of_war: "Tug of War",
};

function TeamChip({ team }: { team: ScheduleMatch["teamA"] }) {
  return (
    <span className="flex items-center gap-2">
      <span
        className="h-4 w-4 shrink-0 rounded-full border border-gray-200"
        style={{ backgroundColor: team.color ?? "transparent" }}
      />
      <span className={team.name ? "" : "italic text-gray-400"}>{teamLabel(team)}</span>
    </span>
  );
}

export function MatchRow({ match }: { match: ScheduleMatch }) {
  return (
    <div className="flex items-center justify-between rounded-md border border-gray-100 px-3 py-2">
      <div className="flex flex-col gap-1 text-sm">
        <TeamChip team={match.teamA} />
        <TeamChip team={match.teamB} />
      </div>
      <span className="text-xs font-medium uppercase tracking-wide text-gray-500">
        {EVENT_LABELS[match.event]}
      </span>
    </div>
  );
}
