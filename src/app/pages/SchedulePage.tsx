import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { clearMatchResult, fetchSchedule, recordMatchResult } from "../lib/api";
import { RoundCard } from "../components/RoundCard";
import { ScoreEntryModal } from "../components/ScoreEntryModal";
import type { ScheduleMatch } from "../../../shared/schedule";

export function SchedulePage() {
  const queryClient = useQueryClient();
  const scheduleQuery = useQuery({ queryKey: ["schedule"], queryFn: fetchSchedule });
  const [selectedMatchId, setSelectedMatchId] = useState<number | null>(null);

  const recordMutation = useMutation({
    mutationFn: ({ matchId, winnerTeamNumber }: { matchId: number; winnerTeamNumber: number }) =>
      recordMatchResult(matchId, winnerTeamNumber),
    onSuccess: () => {
      clearMutation.reset();
      queryClient.invalidateQueries({ queryKey: ["schedule"] });
    },
  });

  const clearMutation = useMutation({
    mutationFn: (matchId: number) => clearMatchResult(matchId),
    onSuccess: () => {
      recordMutation.reset();
      queryClient.invalidateQueries({ queryKey: ["schedule"] });
    },
  });

  if (scheduleQuery.isLoading) {
    return <p className="p-4">Loading schedule…</p>;
  }
  if (scheduleQuery.isError) {
    return <p className="p-4 text-red-600">Failed to load schedule.</p>;
  }

  const rounds = scheduleQuery.data ?? [];
  const selectedMatch: ScheduleMatch | undefined = rounds
    .flatMap((round) => round.matches)
    .find((match) => match.id === selectedMatchId);

  const closeModal = () => {
    setSelectedMatchId(null);
    recordMutation.reset();
    clearMutation.reset();
  };

  return (
    <div className="flex flex-col gap-4 p-4">
      <h1 className="text-xl font-semibold">Schedule</h1>
      {rounds.map((round) => (
        <RoundCard key={round.roundNumber} round={round} onSelectMatch={(match) => setSelectedMatchId(match.id)} />
      ))}
      {selectedMatch && (
        <ScoreEntryModal
          match={selectedMatch}
          isSaving={recordMutation.isPending || clearMutation.isPending}
          error={
            recordMutation.isError
              ? (recordMutation.error as Error).message
              : clearMutation.isError
                ? (clearMutation.error as Error).message
                : null
          }
          onRecord={(winnerTeamNumber) =>
            recordMutation.mutate({ matchId: selectedMatch.id, winnerTeamNumber })
          }
          onClear={() => clearMutation.mutate(selectedMatch.id)}
          onClose={closeModal}
        />
      )}
    </div>
  );
}
