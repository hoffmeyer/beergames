import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AvatarPicker } from "./AvatarPicker";
import { TeamAvatar } from "./TeamAvatar";
import { BonusPointsEditor } from "./BonusPointsEditor";
import {
  createTeamBonusPoint,
  deleteTeamBonusPoint,
  fetchTeamBonusPoints,
  updateTeamBonusPoint,
} from "../lib/api";
import type { Team } from "../lib/api";

type TeamCardProps = {
  team: Team;
  takenAvatars: string[];
  onSave: (input: { name?: string; avatar?: string }) => Promise<unknown>;
};

export function TeamCard({ team, takenAvatars, onSave }: TeamCardProps) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(team.name);
  const [avatar, setAvatar] = useState<string | null>(team.avatar);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const queryClient = useQueryClient();
  const bonusPointsQuery = useQuery({
    queryKey: ["bonus-points", team.number],
    queryFn: () => fetchTeamBonusPoints(team.number),
  });
  const bonusPoints = bonusPointsQuery.data ?? [];
  const bonusTotal = bonusPoints.reduce((sum, entry) => sum + entry.points, 0);

  function invalidateBonusPoints() {
    queryClient.invalidateQueries({ queryKey: ["bonus-points", team.number] });
    queryClient.invalidateQueries({ queryKey: ["leaderboard"] });
  }

  const addBonusPointMutation = useMutation({
    mutationFn: (input: { points: number; description: string }) =>
      createTeamBonusPoint(team.number, input),
    onSuccess: invalidateBonusPoints,
  });
  const editBonusPointMutation = useMutation({
    mutationFn: ({ id, input }: { id: number; input: { points?: number; description?: string } }) =>
      updateTeamBonusPoint(id, input),
    onSuccess: invalidateBonusPoints,
  });
  const deleteBonusPointMutation = useMutation({
    mutationFn: (id: number) => deleteTeamBonusPoint(id),
    onSuccess: invalidateBonusPoints,
  });

  if (!editing) {
    return (
      <div className="flex items-center justify-between rounded-lg border border-gray-200 p-4">
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
          onClick={() => {
            setName(team.name);
            setAvatar(team.avatar);
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

      <BonusPointsEditor
        entries={bonusPoints}
        onAdd={(input) => addBonusPointMutation.mutateAsync(input)}
        onEdit={(id, input) => editBonusPointMutation.mutateAsync({ id, input })}
        onDelete={(id) => deleteBonusPointMutation.mutateAsync(id)}
      />
    </div>
  );
}
