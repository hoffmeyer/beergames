import { useQuery } from "@tanstack/react-query";
import { fetchLeaderboard } from "../lib/api";
import type { LeaderboardRow } from "../lib/api";
import { LoadingState } from "../components/LoadingState";
import { ErrorState } from "../components/ErrorState";
import { LeaderboardEntry } from "../components/LeaderboardEntry";

function tiedNames(rows: LeaderboardRow[], row: LeaderboardRow): string {
  const byNumber = new Map(rows.map((r) => [r.number, r.name]));
  return row.tiedWith.map((number) => byNumber.get(number) ?? `Team ${number}`).join(", ");
}

function tieNote(rows: LeaderboardRow[], row: LeaderboardRow): string | null {
  if (row.tiedWith.length === 0) {
    return null;
  }
  return `Tied with ${tiedNames(rows, row)} — needs more bonus points to resolve.`;
}

export function LeaderboardPage() {
  const leaderboardQuery = useQuery({
    queryKey: ["leaderboard"],
    queryFn: fetchLeaderboard,
    refetchInterval: 5000,
  });

  if (leaderboardQuery.isLoading) {
    return <LoadingState label="Loading leaderboard…" />;
  }
  if (leaderboardQuery.isError) {
    return <ErrorState label="Failed to load leaderboard." onRetry={() => leaderboardQuery.refetch()} />;
  }

  const rows = leaderboardQuery.data ?? [];

  return (
    <div className="flex flex-col gap-4 p-4">
      <h1 className="text-xl font-semibold">Leaderboard</h1>
      {rows.length === 0 ? (
        <p className="text-gray-500">No teams yet.</p>
      ) : (
        <ol className="flex flex-col gap-2">
          {rows.map((row) => (
            <LeaderboardEntry key={row.number} row={row} note={tieNote(rows, row)} />
          ))}
        </ol>
      )}
    </div>
  );
}
