import { useState } from "react";
import type { Event, EventPlacement, Team } from "../lib/api";

type EventFormProps = {
  teams: Team[];
  initialEvent?: Event;
  submitLabel: string;
  onSubmit: (input: { name: string; placements: EventPlacement[] }) => Promise<unknown>;
  onCancel?: () => void;
};

function initialRanks(teams: Team[], initialEvent?: Event): Record<number, string> {
  const rankByTeam = new Map(initialEvent?.placements.map((p) => [p.teamNumber, p.rank]));
  const ranks: Record<number, string> = {};
  teams.forEach((team, index) => {
    ranks[team.number] = String(rankByTeam.get(team.number) ?? index + 1);
  });
  return ranks;
}

export function EventForm({ teams, initialEvent, submitLabel, onSubmit, onCancel }: EventFormProps) {
  const [name, setName] = useState(initialEvent?.name ?? "");
  const [ranks, setRanks] = useState<Record<number, string>>(() => initialRanks(teams, initialEvent));
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  return (
    <form
      className="flex flex-col gap-3 rounded-lg border border-gray-200 p-4"
      onSubmit={async (e) => {
        e.preventDefault();
        if (!name.trim()) {
          setError("Name is required.");
          return;
        }
        const placements: EventPlacement[] = teams.map((team) => ({
          teamNumber: team.number,
          rank: Number(ranks[team.number]),
        }));
        if (placements.some((p) => !Number.isInteger(p.rank) || p.rank < 1 || p.rank > 5)) {
          setError("Pick a rank (1–5) for every team.");
          return;
        }

        setError(null);
        setIsSubmitting(true);
        try {
          await onSubmit({ name: name.trim(), placements });
          if (!initialEvent) {
            setName("");
            setRanks(initialRanks(teams));
          }
        } catch (err) {
          setError(err instanceof Error ? err.message : "Failed to save event");
        } finally {
          setIsSubmitting(false);
        }
      }}
    >
      <input
        className="rounded border border-gray-300 px-3 py-2 text-base"
        placeholder="Event name"
        value={name}
        onChange={(e) => setName(e.target.value)}
      />
      <div className="flex flex-col gap-2">
        {teams.map((team) => (
          <label key={team.number} className="flex items-center justify-between gap-2 text-sm">
            <span className="min-w-0 flex-1 truncate">
              #{team.number} {team.name}
            </span>
            <select
              className="rounded border border-gray-300 px-2 py-1 text-sm"
              value={ranks[team.number] ?? ""}
              onChange={(e) => setRanks((prev) => ({ ...prev, [team.number]: e.target.value }))}
            >
              {[1, 2, 3, 4, 5].map((rank) => (
                <option key={rank} value={rank}>
                  {rank}
                </option>
              ))}
            </select>
          </label>
        ))}
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={isSubmitting}
          className="min-h-11 rounded bg-blue-600 px-4 py-2 text-white disabled:opacity-50"
        >
          {submitLabel}
        </button>
        {onCancel && (
          <button
            type="button"
            disabled={isSubmitting}
            className="min-h-11 rounded border border-gray-300 px-4 py-2 disabled:opacity-50"
            onClick={onCancel}
          >
            Cancel
          </button>
        )}
      </div>
    </form>
  );
}
