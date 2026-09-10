import { useQuery } from "@tanstack/react-query";
import { fetchLeaderboard } from "../lib/api";
import type { LeaderboardRow } from "../lib/api";

function tiedNames(rows: LeaderboardRow[], row: LeaderboardRow): string {
  const byNumber = new Map(rows.map((r) => [r.number, r.name]));
  return row.tiedWith.map((number) => byNumber.get(number) ?? `Team ${number}`).join(", ");
}

type TieNote = { tone: "amber" | "gray"; text: string };

function tieNote(rows: LeaderboardRow[], row: LeaderboardRow): TieNote | null {
  if (row.tiedWith.length === 0) {
    return null;
  }
  const names = tiedNames(rows, row);
  if (row.needsTiebreaker) {
    return { tone: "amber", text: `Tied with ${names} — needs a manual tiebreaker.` };
  }
  if (row.resolvedBy === "head_to_head") {
    return { tone: "gray", text: `Tied on wins with ${names} — ranked by head-to-head result.` };
  }
  return { tone: "gray", text: `Tied on wins with ${names} — pending their head-to-head match.` };
}

export function LeaderboardPage() {
  const leaderboardQuery = useQuery({
    queryKey: ["leaderboard"],
    queryFn: fetchLeaderboard,
    refetchInterval: 5000,
  });

  if (leaderboardQuery.isLoading) {
    return <p className="p-4">Loading leaderboard…</p>;
  }
  if (leaderboardQuery.isError) {
    return <p className="p-4 text-red-600">Failed to load leaderboard.</p>;
  }

  const rows = leaderboardQuery.data ?? [];

  return (
    <div className="flex flex-col gap-4 p-4">
      <h1 className="text-xl font-semibold">Leaderboard</h1>
      {rows.length === 0 ? (
        <p className="text-gray-500">No teams yet.</p>
      ) : (
        <ol className="flex flex-col gap-2">
          {rows.map((row) => {
            const note = tieNote(rows, row);
            return (
              <li key={row.number} className="flex flex-col gap-1 rounded-lg border border-gray-200 p-3">
                <div className="flex items-center gap-3">
                  <span className="w-6 text-right font-semibold text-gray-500">{row.rank}</span>
                  <span
                    className="h-4 w-4 shrink-0 rounded-full border border-gray-300"
                    style={{ backgroundColor: row.color }}
                  />
                  <span className="flex-1 font-medium">{row.name}</span>
                  <span className="text-sm text-gray-600">
                    {row.wins} win{row.wins === 1 ? "" : "s"} · {row.matchesPlayed} played
                  </span>
                </div>
                {note && (
                  <p className={`text-xs ${note.tone === "amber" ? "font-medium text-amber-600" : "text-gray-500"}`}>
                    {note.text}
                  </p>
                )}
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}
