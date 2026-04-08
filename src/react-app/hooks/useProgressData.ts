import { useQuery } from "@tanstack/react-query";

interface ProgressData {
  progress: {
    daily_words_read: number;
    total_words_read: number;
    current_streak: number;
    longest_streak: number;
    total_quizzes_completed: number;
    daily_target: number;
    quiz_words: number;
    external_words: number;
  };
  recentAttempts: Array<{
    id: number;
    quiz_title: string;
    score: number;
    words_read: number;
    created_at: string;
  }>;
  dailyActivity: Array<{
    date: string;
    total_words: number;
  }>;
  dailyTarget: number;
  currentStreak: number;
  lastActivityDate: string | null;
}

async function fetchProgressData(year: string, month: string): Promise<ProgressData> {
  const response = await fetch(`/api/progress-data?year=${year}&month=${month}`);
  if (!response.ok) {
    throw new Error("Failed to fetch progress data");
  }
  return response.json();
}

export function useProgressData(year: string, month: string) {
  const { data, isLoading, error } = useQuery({
    queryKey: ["progress-data", year, month],
    queryFn: () => fetchProgressData(year, month),
    staleTime: 1000 * 60, // 1 minute - progress data updates frequently
  });

  return {
    data: data || null,
    loading: isLoading,
    error,
  };
}
