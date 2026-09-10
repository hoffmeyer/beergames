import { useQuery } from "@tanstack/react-query";
import { fetchSchedule } from "../lib/api";
import { RoundCard } from "../components/RoundCard";

export function SchedulePage() {
  const scheduleQuery = useQuery({ queryKey: ["schedule"], queryFn: fetchSchedule });

  if (scheduleQuery.isLoading) {
    return <p className="p-4">Loading schedule…</p>;
  }
  if (scheduleQuery.isError) {
    return <p className="p-4 text-red-600">Failed to load schedule.</p>;
  }

  const rounds = scheduleQuery.data ?? [];

  return (
    <div className="flex flex-col gap-4 p-4">
      <h1 className="text-xl font-semibold">Schedule</h1>
      {rounds.map((round) => (
        <RoundCard key={round.roundNumber} round={round} />
      ))}
    </div>
  );
}
