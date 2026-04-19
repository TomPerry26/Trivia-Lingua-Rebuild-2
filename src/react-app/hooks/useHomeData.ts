import { useQuery } from "@tanstack/react-query";
import type { HomeData } from "@/shared/types";
import { fetchWithSupabaseAuth } from "@/react-app/lib/fetchWithSupabaseAuth";

async function fetchHomeData(): Promise<HomeData> {
  const response = await fetchWithSupabaseAuth("/api/home-data");
  if (!response.ok) {
    throw new Error("Failed to fetch home data");
  }
  return response.json();
}

export function useHomeData() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["home-data"],
    queryFn: fetchHomeData,
    staleTime: 1000 * 60 * 10, // 10 minutes - home data doesn't change often
  });

  return {
    homeData: data || null,
    loading: isLoading,
    error,
  };
}
