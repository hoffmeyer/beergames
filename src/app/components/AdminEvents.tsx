import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchTeams } from "../lib/api";
import type { Event } from "../lib/api";
import { useEvents } from "../lib/useEvents";
import { EventForm } from "./EventForm";
import { LoadingState } from "./LoadingState";
import { ErrorState } from "./ErrorState";

function placementSummary(event: Event, teamNames: Map<number, string>): string {
  return [...event.placements]
    .sort((a, b) => a.rank - b.rank)
    .map((p) => `${teamNames.get(p.teamNumber) ?? `Team ${p.teamNumber}`} (#${p.rank})`)
    .join(", ");
}

export function AdminEvents() {
  const teamsQuery = useQuery({ queryKey: ["teams"], queryFn: fetchTeams });
  const { events, isLoading, isError, refetch, add, edit, remove } = useEvents();
  const [editingId, setEditingId] = useState<number | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const teams = teamsQuery.data ?? [];
  const teamNames = new Map(teams.map((t) => [t.number, t.name]));

  return (
    <div className="flex flex-col gap-3">
      <h2 className="font-medium">Events</h2>
      {(teamsQuery.isLoading || isLoading) && <LoadingState label="Loading events…" />}
      {(teamsQuery.isError || isError) && (
        <ErrorState label="Failed to load events." onRetry={() => refetch()} />
      )}
      {deleteError && <p className="text-sm text-red-600">{deleteError}</p>}

      {events.map((event) =>
        editingId === event.id ? (
          <EventForm
            key={event.id}
            teams={teams}
            initialEvent={event}
            submitLabel="Save"
            onSubmit={async (input) => {
              await edit(event.id, input);
              setEditingId(null);
            }}
            onCancel={() => setEditingId(null)}
          />
        ) : (
          <div
            key={event.id}
            className="flex items-center justify-between gap-2 rounded-lg border border-gray-200 p-4"
          >
            <div className="min-w-0 flex-1">
              <p className="truncate font-medium">{event.name}</p>
              <p className="truncate text-sm text-gray-600">{placementSummary(event, teamNames)}</p>
            </div>
            <div className="flex shrink-0 gap-3">
              <button
                type="button"
                className="min-h-11 min-w-11 text-blue-600"
                onClick={() => setEditingId(event.id)}
              >
                Edit
              </button>
              <button
                type="button"
                disabled={deletingId === event.id}
                className="min-h-11 min-w-11 text-red-600 disabled:opacity-50"
                onClick={async () => {
                  setDeleteError(null);
                  setDeletingId(event.id);
                  try {
                    await remove(event.id);
                  } catch (err) {
                    setDeleteError(err instanceof Error ? err.message : "Failed to delete event");
                  } finally {
                    setDeletingId(null);
                  }
                }}
              >
                Delete
              </button>
            </div>
          </div>
        ),
      )}

      {teams.length === 5 ? (
        <EventForm teams={teams} submitLabel="Add event" onSubmit={(input) => add(input)} />
      ) : (
        <p className="text-sm text-gray-500">Create all 5 teams before recording events.</p>
      )}
    </div>
  );
}
