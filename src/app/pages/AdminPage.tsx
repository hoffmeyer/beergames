import { useMutation, useQueryClient } from "@tanstack/react-query";
import { resetTournament } from "../lib/api";

export function AdminPage() {
  const queryClient = useQueryClient();

  const resetMutation = useMutation({
    mutationFn: resetTournament,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["teams"] });
      queryClient.invalidateQueries({ queryKey: ["schedule"] });
      queryClient.invalidateQueries({ queryKey: ["leaderboard"] });
      queryClient.invalidateQueries({ queryKey: ["bonus-points"] });
    },
  });

  function handleReset() {
    const confirmed = window.confirm(
      "This deletes all teams, bonus points, and recorded match results, and cannot be undone. Reset the tournament?",
    );
    if (confirmed) {
      resetMutation.reset();
      resetMutation.mutate();
    }
  }

  return (
    <div className="flex flex-col gap-4 p-4">
      <h1 className="text-xl font-semibold">Admin</h1>
      <div className="flex flex-col gap-2 rounded-lg border border-red-200 bg-red-50 p-4">
        <h2 className="font-medium text-red-900">Reset tournament</h2>
        <p className="text-sm text-red-800">
          Deletes all teams, bonus points, and recorded match results so the app is ready for a new
          tournament. The fixed round/match schedule stays in place. This cannot be undone.
        </p>
        <button
          type="button"
          onClick={handleReset}
          disabled={resetMutation.isPending}
          className="min-h-11 self-start rounded bg-red-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          {resetMutation.isPending ? "Resetting…" : "Reset tournament"}
        </button>
        {resetMutation.isSuccess && (
          <p className="text-sm font-medium text-green-700">Tournament reset. Ready for new teams.</p>
        )}
        {resetMutation.isError && (
          <p className="text-sm font-medium text-red-700">
            {resetMutation.error instanceof Error ? resetMutation.error.message : "Reset failed."}
          </p>
        )}
      </div>
    </div>
  );
}
