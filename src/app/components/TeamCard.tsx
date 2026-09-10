import { useState } from "react";
import { ColorPicker } from "./ColorPicker";
import type { Team } from "../lib/api";

type TeamCardProps = {
  team: Team;
  takenColors: string[];
  onSave: (input: { name?: string; color?: string }) => Promise<unknown>;
};

export function TeamCard({ team, takenColors, onSave }: TeamCardProps) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(team.name);
  const [color, setColor] = useState<string | null>(team.color);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!editing) {
    return (
      <div className="flex items-center justify-between rounded-lg border border-gray-200 p-4">
        <div className="flex min-w-0 items-center gap-3">
          <span
            className="h-8 w-8 shrink-0 rounded-full"
            style={{ backgroundColor: team.color }}
          />
          <span className="truncate font-medium">
            #{team.number} {team.name}
          </span>
        </div>
        <button
          type="button"
          className="min-h-11 min-w-11 shrink-0 text-sm text-blue-600"
          onClick={() => {
            setName(team.name);
            setColor(team.color);
            setError(null);
            setEditing(true);
          }}
        >
          Edit
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-gray-200 p-4">
      <input
        className="rounded border border-gray-300 px-3 py-2 text-base"
        value={name}
        onChange={(e) => setName(e.target.value)}
      />
      <ColorPicker value={color} takenColors={takenColors} onChange={setColor} />
      {error && <p className="text-sm text-red-600">{error}</p>}
      <div className="flex gap-2">
        <button
          type="button"
          disabled={isSaving || !name.trim() || !color}
          className="min-h-11 rounded bg-blue-600 px-4 py-2 text-white disabled:opacity-50"
          onClick={async () => {
            if (!color) return;
            setError(null);
            setIsSaving(true);
            try {
              await onSave({ name: name.trim(), color });
              setEditing(false);
            } catch (err) {
              setError(err instanceof Error ? err.message : "Failed to save changes");
            } finally {
              setIsSaving(false);
            }
          }}
        >
          Save
        </button>
        <button
          type="button"
          className="min-h-11 rounded border border-gray-300 px-4 py-2"
          onClick={() => setEditing(false)}
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
