import { useState } from "react";
import { TeamAvatar } from "./TeamAvatar";
import { BonusPointsEditor } from "./BonusPointsEditor";
import { useTeamBonusPoints } from "../lib/useTeamBonusPoints";
import type { Team } from "../lib/api";

type AdminTeamBonusPointsProps = {
  team: Team;
};

export function AdminTeamBonusPoints({ team }: AdminTeamBonusPointsProps) {
  const [expanded, setExpanded] = useState(false);
  const { bonusPoints, bonusTotal, isError, add, edit, remove } = useTeamBonusPoints(team.number);

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-gray-200 p-4">
      <div className="flex items-center justify-between">
        <div className="flex min-w-0 items-center gap-3">
          <TeamAvatar avatar={team.avatar} size="md" />
          <span className="truncate font-medium">
            #{team.number} {team.name}
          </span>
          {bonusTotal > 0 && (
            <span className="shrink-0 rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600">
              +{bonusTotal} bonus
            </span>
          )}
        </div>
        <button
          type="button"
          className="min-h-11 min-w-11 shrink-0 text-sm text-blue-600"
          onClick={() => setExpanded((prev) => !prev)}
        >
          {expanded ? "Close" : "Add points"}
        </button>
      </div>

      {isError && <p className="text-sm text-red-600">Failed to load bonus points.</p>}

      {expanded && !isError && (
        <BonusPointsEditor entries={bonusPoints} onAdd={add} onEdit={edit} onDelete={remove} />
      )}
    </div>
  );
}
