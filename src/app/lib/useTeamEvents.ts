import { useQuery } from "@tanstack/react-query";
import { fetchTeamEvents } from "./api";

export function useTeamEvents(teamNumber: number, options?: { enabled?: boolean }) {
  const teamEventsQuery = useQuery({
    queryKey: ["team-events", teamNumber],
    queryFn: () => fetchTeamEvents(teamNumber),
    enabled: options?.enabled,
  });

  return {
    teamEvents: teamEventsQuery.data ?? [],
    isLoading: teamEventsQuery.isLoading,
    isError: teamEventsQuery.isError,
  };
}
