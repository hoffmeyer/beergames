import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createEvent, deleteEvent, fetchEvents, updateEvent } from "./api";
import type { EventPlacement } from "./api";

export function useEvents() {
  const queryClient = useQueryClient();
  const eventsQuery = useQuery({ queryKey: ["events"], queryFn: fetchEvents });

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: ["events"] });
    queryClient.invalidateQueries({ queryKey: ["leaderboard"] });
  }

  const addMutation = useMutation({
    mutationFn: (input: { name: string; placements: EventPlacement[] }) => createEvent(input),
    onSuccess: invalidate,
  });
  const editMutation = useMutation({
    mutationFn: ({ id, input }: { id: number; input: { name?: string; placements?: EventPlacement[] } }) =>
      updateEvent(id, input),
    onSuccess: invalidate,
  });
  const deleteMutation = useMutation({
    mutationFn: (id: number) => deleteEvent(id),
    onSuccess: invalidate,
  });

  return {
    events: eventsQuery.data ?? [],
    isLoading: eventsQuery.isLoading,
    isError: eventsQuery.isError,
    refetch: eventsQuery.refetch,
    add: (input: { name: string; placements: EventPlacement[] }) => addMutation.mutateAsync(input),
    edit: (id: number, input: { name?: string; placements?: EventPlacement[] }) =>
      editMutation.mutateAsync({ id, input }),
    remove: (id: number) => deleteMutation.mutateAsync(id),
  };
}
