import { useState } from "react";
import type { TeamBonusPoint } from "../lib/api";

type BonusPointsEditorProps = {
  entries: TeamBonusPoint[];
  onAdd: (input: { points: number; description: string }) => Promise<unknown>;
  onEdit: (id: number, input: { points?: number; description?: string }) => Promise<unknown>;
  onDelete: (id: number) => Promise<unknown>;
};

function parsePoints(value: string): number | null {
  const points = Number(value);
  return Number.isInteger(points) && points > 0 ? points : null;
}

export function BonusPointsEditor({ entries, onAdd, onEdit, onDelete }: BonusPointsEditorProps) {
  const [newPoints, setNewPoints] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [isAdding, setIsAdding] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);

  const [editingId, setEditingId] = useState<number | null>(null);
  const [editPoints, setEditPoints] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editError, setEditError] = useState<string | null>(null);
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  return (
    <div className="flex flex-col gap-2 border-t border-gray-100 pt-3">
      <span className="text-sm font-medium text-gray-700">Bonus points</span>
      {deleteError && <p className="text-xs text-red-600">{deleteError}</p>}

      {entries.length > 0 && (
        <ul className="flex flex-col gap-2">
          {entries.map((entry) =>
            editingId === entry.id ? (
              <li key={entry.id} className="flex flex-col gap-2 rounded border border-gray-200 p-2">
                <input
                  type="number"
                  min={1}
                  className="rounded border border-gray-300 px-2 py-1 text-sm"
                  value={editPoints}
                  onChange={(e) => setEditPoints(e.target.value)}
                />
                <input
                  className="rounded border border-gray-300 px-2 py-1 text-sm"
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                />
                {editError && <p className="text-xs text-red-600">{editError}</p>}
                <div className="flex gap-2">
                  <button
                    type="button"
                    disabled={isSavingEdit}
                    className="min-h-11 rounded bg-blue-600 px-3 py-1 text-sm text-white disabled:opacity-50"
                    onClick={async () => {
                      const points = parsePoints(editPoints);
                      if (!points || !editDescription.trim()) {
                        setEditError("Enter a positive whole number and a description.");
                        return;
                      }
                      setEditError(null);
                      setIsSavingEdit(true);
                      try {
                        await onEdit(entry.id, { points, description: editDescription.trim() });
                        setEditingId(null);
                      } catch (err) {
                        setEditError(err instanceof Error ? err.message : "Failed to save changes");
                      } finally {
                        setIsSavingEdit(false);
                      }
                    }}
                  >
                    Save
                  </button>
                  <button
                    type="button"
                    disabled={isSavingEdit}
                    className="min-h-11 rounded border border-gray-300 px-3 py-1 text-sm disabled:opacity-50"
                    onClick={() => setEditingId(null)}
                  >
                    Cancel
                  </button>
                </div>
              </li>
            ) : (
              <li
                key={entry.id}
                className="flex items-center justify-between gap-2 rounded border border-gray-200 p-2 text-sm"
              >
                <span className="min-w-0 flex-1 truncate">
                  +{entry.points} — {entry.description}
                </span>
                <div className="flex shrink-0 gap-3">
                  <button
                    type="button"
                    className="min-h-11 min-w-11 text-blue-600"
                    onClick={() => {
                      setEditingId(entry.id);
                      setEditPoints(String(entry.points));
                      setEditDescription(entry.description);
                      setEditError(null);
                    }}
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    disabled={deletingId === entry.id}
                    className="min-h-11 min-w-11 text-red-600 disabled:opacity-50"
                    onClick={async () => {
                      setDeleteError(null);
                      setDeletingId(entry.id);
                      try {
                        await onDelete(entry.id);
                      } catch (err) {
                        setDeleteError(err instanceof Error ? err.message : "Failed to delete entry");
                      } finally {
                        setDeletingId(null);
                      }
                    }}
                  >
                    Delete
                  </button>
                </div>
              </li>
            ),
          )}
        </ul>
      )}

      <div className="flex flex-col gap-2">
        <input
          type="number"
          min={1}
          placeholder="Points"
          className="rounded border border-gray-300 px-2 py-1 text-sm"
          value={newPoints}
          onChange={(e) => setNewPoints(e.target.value)}
        />
        <input
          placeholder="Reason"
          className="rounded border border-gray-300 px-2 py-1 text-sm"
          value={newDescription}
          onChange={(e) => setNewDescription(e.target.value)}
        />
        {addError && <p className="text-xs text-red-600">{addError}</p>}
        <button
          type="button"
          disabled={isAdding}
          className="min-h-11 self-start rounded border border-gray-300 px-3 py-1 text-sm disabled:opacity-50"
          onClick={async () => {
            const points = parsePoints(newPoints);
            if (!points || !newDescription.trim()) {
              setAddError("Enter a positive whole number and a description.");
              return;
            }
            setAddError(null);
            setIsAdding(true);
            try {
              await onAdd({ points, description: newDescription.trim() });
              setNewPoints("");
              setNewDescription("");
            } catch (err) {
              setAddError(err instanceof Error ? err.message : "Failed to add bonus points");
            } finally {
              setIsAdding(false);
            }
          }}
        >
          Add bonus points
        </button>
      </div>
    </div>
  );
}
