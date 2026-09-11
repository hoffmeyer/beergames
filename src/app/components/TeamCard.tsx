import { useState } from "react";
import { AvatarPicker } from "./AvatarPicker";
import { BonusPointsList } from "./BonusPointsList";
import { TeamAvatar } from "./TeamAvatar";
import { useTeamBonusPoints } from "../lib/useTeamBonusPoints";
import type { Team } from "../lib/api";

type TeamCardProps = {
  team: Team;
  takenAvatars: string[];
  onSave: (input: { name?: string; avatar?: string }) => Promise<unknown>;
};

function PencilIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth={1.5} className="h-5 w-5">
      <path
        d="M13.5 3.5l3 3L6 17H3v-3L13.5 3.5z"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

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

export function TeamCard({ team, takenAvatars, onSave }: TeamCardProps) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(team.name);
  const [avatar, setAvatar] = useState<string | null>(team.avatar);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [bonusExpanded, setBonusExpanded] = useState(false);

  const { bonusPoints, bonusTotal } = useTeamBonusPoints(team.number);

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
        <div className="flex shrink-0 items-center gap-1">
          <button
            type="button"
            aria-label={bonusExpanded ? "Hide bonus points" : "Show bonus points"}
            className="flex min-h-11 min-w-11 items-center justify-center text-gray-600"
            onClick={() => setBonusExpanded((expanded) => !expanded)}
          >
            <ChevronIcon expanded={bonusExpanded} />
          </button>
          <button
            type="button"
            aria-label="Edit team"
            className="flex min-h-11 min-w-11 items-center justify-center text-blue-600"
            onClick={() => {
              setName(team.name);
              setAvatar(team.avatar);
              setError(null);
              setEditing(true);
            }}
          >
            <PencilIcon />
          </button>
        </div>
      </div>

      {editing && (
        <div className="flex flex-col gap-3">
          <input
            className="rounded border border-gray-300 px-3 py-2 text-base"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <AvatarPicker value={avatar} takenAvatars={takenAvatars} onChange={setAvatar} />
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="flex gap-2">
            <button
              type="button"
              disabled={isSaving || !name.trim() || !avatar}
              className="min-h-11 rounded bg-blue-600 px-4 py-2 text-white disabled:opacity-50"
              onClick={async () => {
                if (!avatar) return;
                setError(null);
                setIsSaving(true);
                try {
                  await onSave({ name: name.trim(), avatar });
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
      )}

      {bonusExpanded && <BonusPointsList entries={bonusPoints} />}
    </div>
  );
}
