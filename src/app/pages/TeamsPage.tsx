import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createTeam, fetchTeams, updateTeam } from "../lib/api";
import { TeamCard } from "../components/TeamCard";
import { TeamForm } from "../components/TeamForm";
import { LoadingState } from "../components/LoadingState";
import { ErrorState } from "../components/ErrorState";

export function TeamsPage() {
  const queryClient = useQueryClient();
  const teamsQuery = useQuery({ queryKey: ["teams"], queryFn: fetchTeams });

  const createMutation = useMutation({
    mutationFn: createTeam,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["teams"] }),
  });

  const updateMutation = useMutation({
    mutationFn: ({
      number,
      input,
    }: {
      number: number;
      input: { name?: string; color?: string };
    }) => updateTeam(number, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["teams"] }),
  });

  if (teamsQuery.isLoading) {
    return <LoadingState label="Loading teams…" />;
  }
  if (teamsQuery.isError) {
    return <ErrorState label="Failed to load teams." onRetry={() => teamsQuery.refetch()} />;
  }

  const teams = teamsQuery.data ?? [];

  return (
    <div className="flex flex-col gap-4 p-4">
      <h1 className="text-xl font-semibold">Teams</h1>
      {teams.map((team) => (
        <TeamCard
          key={team.number}
          team={team}
          takenColors={teams.filter((t) => t.number !== team.number).map((t) => t.color)}
          onSave={(input) => updateMutation.mutateAsync({ number: team.number, input })}
        />
      ))}
      {teams.length < 5 && (
        <TeamForm
          takenColors={teams.map((t) => t.color)}
          isSubmitting={createMutation.isPending}
          error={createMutation.isError ? (createMutation.error as Error).message : null}
          onSubmit={(input) => createMutation.mutateAsync(input)}
        />
      )}
    </div>
  );
}
