import type { ScheduleMatch } from "../../../shared/schedule";
import { teamLabel } from "../lib/teamLabel";

type ScoreEntryModalProps = {
  match: ScheduleMatch;
  isSaving: boolean;
  error: string | null;
  onRecord: (winnerTeamNumber: number) => void;
  onClear: () => void;
  onClose: () => void;
};

export function ScoreEntryModal({
  match,
  isSaving,
  error,
  onRecord,
  onClear,
  onClose,
}: ScoreEntryModalProps) {
  return (
    <div
      className="fixed inset-0 z-10 flex items-end justify-center bg-black/40 sm:items-center"
      onClick={isSaving ? undefined : onClose}
    >
      <div
        className="flex w-full max-w-sm flex-col gap-3 rounded-t-lg bg-white p-4 sm:rounded-lg"
        style={{ paddingBottom: "max(1rem, env(safe-area-inset-bottom))" }}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-lg font-semibold">Record winner</h2>
        <div className="flex flex-col gap-2">
          {[match.teamA, match.teamB].map((team) => (
            <button
              key={team.number}
              type="button"
              disabled={isSaving}
              onClick={() => onRecord(team.number)}
              className={`min-h-11 rounded border px-4 py-2 text-left disabled:opacity-50 ${
                match.winnerTeamNumber === team.number
                  ? "border-blue-600 bg-blue-50 font-medium"
                  : "border-gray-300"
              }`}
            >
              {teamLabel(team)}
            </button>
          ))}
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <div className="flex gap-2">
          {match.winnerTeamNumber !== null && (
            <button
              type="button"
              disabled={isSaving}
              onClick={onClear}
              className="min-h-11 flex-1 rounded border border-gray-300 px-4 py-2 disabled:opacity-50"
            >
              Clear result
            </button>
          )}
          <button
            type="button"
            disabled={isSaving}
            onClick={onClose}
            className="min-h-11 flex-1 rounded border border-gray-300 px-4 py-2 disabled:opacity-50"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
