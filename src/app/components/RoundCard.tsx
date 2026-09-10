import type { ScheduleRound } from "../../../shared/schedule";
import { MatchRow } from "./MatchRow";
import { teamLabel } from "../lib/teamLabel";

export function RoundCard({ round }: { round: ScheduleRound }) {
  return (
    <div className="flex flex-col gap-3 rounded-lg border border-gray-200 p-4">
      <div className="flex items-baseline justify-between">
        <h2 className="font-semibold">Round {round.roundNumber}</h2>
        <span className="text-xs text-gray-500">Resting: {teamLabel(round.restingTeam)}</span>
      </div>
      <div className="flex flex-col gap-2">
        {round.matches.map((match) => (
          <MatchRow key={match.id} match={match} />
        ))}
      </div>
    </div>
  );
}
