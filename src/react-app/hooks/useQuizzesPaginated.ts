import { useInfiniteQuery } from "@tanstack/react-query";
import type { Quiz } from "@/shared/types";

interface FetchQuizzesParams {
  difficulties: string[];
  topics: string[];
  sortBy: "latest" | "popular" | "a-z";
  limit: number;
}

interface QuizzesPage {
  quizzes: Quiz[];
  total: number;
  limit: number;
  offset: number;
}

async function fetchQuizzes(
  params: FetchQuizzesParams,
  pageParam: number
): Promise<QuizzesPage> {
  const queryParams = new URLSearchParams();
  queryParams.append("limit", params.limit.toString());
  queryParams.append("offset", pageParam.toString());
  
  if (params.difficulties.length > 0) {
    queryParams.append("difficulties", params.difficulties.join(","));
  }
  
  if (params.topics.length > 0) {
    queryParams.append("topics", params.topics.join(","));
  }
  
  queryParams.append("sort", params.sortBy);
  
  const primaryResponse = await fetch(`/api/quizzes/paginated?${queryParams.toString()}`);
  if (primaryResponse.ok) {
    return primaryResponse.json();
  }

  if (primaryResponse.status === 404) {
    const fallbackResponse = await fetch(`/api/quizzes?${queryParams.toString()}`);
    if (fallbackResponse.ok) {
      return fallbackResponse.json();
    }
  }

  throw new Error("Failed to fetch quizzes");
}

export function useQuizzesPaginated(
  difficulties: string[],
  topics: string[],
  sortBy: "latest" | "popular" | "a-z",
  limit: number = 24
) {
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    isFetching,
    error,
  } = useInfiniteQuery({
    queryKey: ["quizzes-paginated", difficulties, topics, sortBy, limit],
    queryFn: ({ pageParam = 0 }) =>
      fetchQuizzes({ difficulties, topics, sortBy, limit }, pageParam),
    getNextPageParam: (lastPage) => {
      const nextOffset = lastPage.offset + lastPage.limit;
      return nextOffset < lastPage.total ? nextOffset : undefined;
    },
    initialPageParam: 0,
    staleTime: 1000 * 60 * 5, // 5 minutes
    placeholderData: (previousData) => previousData,
  });

  // Flatten all pages into a single array
  const quizzes = data?.pages.flatMap((page) => page.quizzes) || [];
  const total = data?.pages[0]?.total || 0;

  return {
    quizzes,
    total,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    isFetching,
    error,
  };
}
