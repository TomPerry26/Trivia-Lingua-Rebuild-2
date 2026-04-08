// Difficulty level landing pages for SEO
// Content stored in difficulty_content table

export interface Difficulty {
  slug: string;
  name: string;
  cefr: string;
  color: string;
  gradient: string;
}

export const difficulties: Difficulty[] = [
  {
    slug: "superbeginner-a1-quizzes",
    name: "Superbeginner",
    cefr: "A1",
    color: "#3b82f6",
    gradient: "from-blue-500 via-blue-600 to-indigo-700"
  },
  {
    slug: "beginner-a2-quizzes",
    name: "Beginner",
    cefr: "A2",
    color: "#10b981",
    gradient: "from-green-500 via-emerald-600 to-green-700"
  },
  {
    slug: "intermediate-b1-quizzes",
    name: "Intermediate",
    cefr: "B1",
    color: "#f59e0b",
    gradient: "from-amber-500 via-orange-600 to-red-600"
  }
];

// Helper function to find difficulty by slug
export function getDifficultyBySlug(slug: string): Difficulty | undefined {
  return difficulties.find(difficulty => difficulty.slug === slug);
}

// Helper function to map difficulty name to slug
export function getDifficultySlug(difficultyName: string): string | undefined {
  const normalized = difficultyName.toLowerCase();
  const difficulty = difficulties.find(d => d.name.toLowerCase() === normalized);
  return difficulty?.slug;
}

// Helper function to get all difficulty slugs
export function getAllDifficultySlugs(): string[] {
  return difficulties.map(difficulty => difficulty.slug);
}
