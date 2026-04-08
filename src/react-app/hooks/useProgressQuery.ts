import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { UserProgress } from "@/shared/types";

function getLocalDate(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

async function fetchProgress(): Promise<UserProgress> {
  const localDate = getLocalDate();
  const response = await fetch(`/api/progress?local_date=${localDate}`);
  if (!response.ok) {
    throw new Error("Failed to fetch progress");
  }
  return response.json();
}

async function updateTarget(newTarget: number): Promise<void> {
  const response = await fetch("/api/progress/target", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ daily_target: newTarget }),
  });
  if (!response.ok) {
    throw new Error("Failed to update target");
  }
}

export function useProgressQuery() {
  const queryClient = useQueryClient();

  const { data: progress, isLoading: loading, error } = useQuery({
    queryKey: ["progress"],
    queryFn: fetchProgress,
    staleTime: 1000 * 60, // Progress is stale after 1 minute (update more frequently)
  });

  const updateTargetMutation = useMutation({
    mutationFn: updateTarget,
    onSuccess: () => {
      // Invalidate and refetch progress after updating target
      queryClient.invalidateQueries({ queryKey: ["progress"] });
    },
  });

  return {
    progress: progress || null,
    loading,
    error,
    refreshProgress: () => queryClient.invalidateQueries({ queryKey: ["progress"] }),
    updateTarget: updateTargetMutation.mutate,
  };
}
