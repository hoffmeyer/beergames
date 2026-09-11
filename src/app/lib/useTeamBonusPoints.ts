import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createTeamBonusPoint,
  deleteTeamBonusPoint,
  fetchTeamBonusPoints,
  updateTeamBonusPoint,
} from "./api";

export function useTeamBonusPoints(teamNumber: number, options?: { enabled?: boolean }) {
  const queryClient = useQueryClient();
  const bonusPointsQuery = useQuery({
    queryKey: ["bonus-points", teamNumber],
    queryFn: () => fetchTeamBonusPoints(teamNumber),
    enabled: options?.enabled,
  });
  const bonusPoints = bonusPointsQuery.data ?? [];
  const bonusTotal = bonusPoints.reduce((sum, entry) => sum + entry.points, 0);

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: ["bonus-points", teamNumber] });
    queryClient.invalidateQueries({ queryKey: ["leaderboard"] });
  }

  const addMutation = useMutation({
    mutationFn: (input: { points: number; description: string }) =>
      createTeamBonusPoint(teamNumber, input),
    onSuccess: invalidate,
  });
  const editMutation = useMutation({
    mutationFn: ({ id, input }: { id: number; input: { points?: number; description?: string } }) =>
      updateTeamBonusPoint(id, input),
    onSuccess: invalidate,
  });
  const deleteMutation = useMutation({
    mutationFn: (id: number) => deleteTeamBonusPoint(id),
    onSuccess: invalidate,
  });

  return {
    bonusPoints,
    bonusTotal,
    isLoading: bonusPointsQuery.isLoading,
    isError: bonusPointsQuery.isError,
    add: (input: { points: number; description: string }) => addMutation.mutateAsync(input),
    edit: (id: number, input: { points?: number; description?: string }) =>
      editMutation.mutateAsync({ id, input }),
    remove: (id: number) => deleteMutation.mutateAsync(id),
  };
}
