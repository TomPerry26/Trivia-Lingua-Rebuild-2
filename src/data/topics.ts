// Topic landing pages for SEO
// Only topics listed here will have dedicated landing pages

export interface Topic {
  slug: string;
  name: string;
  color: string;
  gradient: string;
}

export const topics: Topic[] = [
  {
    slug: "harry-potter",
    name: "Harry Potter",
    color: "#740001",
    gradient: "from-red-900 via-red-800 to-amber-900"
  },
  {
    slug: "marvel",
    name: "Marvel",
    color: "#ED1D24",
    gradient: "from-red-600 via-red-700 to-red-900"
  },
  {
    slug: "taylor-swift",
    name: "Taylor Swift",
    color: "#8B5A8E",
    gradient: "from-purple-600 via-pink-600 to-purple-800"
  },
  {
    slug: "star-wars",
    name: "Star Wars",
    color: "#FFE81F",
    gradient: "from-yellow-400 via-yellow-600 to-amber-900"
  },
  {
    slug: "geography",
    name: "Geography",
    color: "#2E7D32",
    gradient: "from-green-600 via-teal-600 to-blue-700"
  },
  {
    slug: "music",
    name: "Music",
    color: "#D32F2F",
    gradient: "from-pink-600 via-red-600 to-purple-700"
  },
  {
    slug: "film",
    name: "Film",
    color: "#7B1FA2",
    gradient: "from-purple-700 via-purple-900 to-indigo-900"
  },
  {
    slug: "sport",
    name: "Sport",
    color: "#FF6F00",
    gradient: "from-orange-600 via-orange-700 to-red-700"
  },
  {
    slug: "history",
    name: "History",
    color: "#5D4037",
    gradient: "from-amber-800 via-orange-900 to-stone-900"
  },
  {
    slug: "food",
    name: "Food",
    color: "#F57C00",
    gradient: "from-orange-500 via-amber-600 to-red-600"
  },
  {
    slug: "star-trek",
    name: "Star Trek",
    color: "#0066CC",
    gradient: "from-blue-600 via-blue-800 to-slate-900"
  },
  {
    slug: "spain",
    name: "Spain",
    color: "#C60B1E",
    gradient: "from-red-600 via-yellow-500 to-red-600"
  },
  {
    slug: "animals",
    name: "Animals",
    color: "#4CAF50",
    gradient: "from-green-500 via-emerald-600 to-teal-700"
  },
  {
    slug: "science",
    name: "Science",
    color: "#1976D2",
    gradient: "from-blue-600 via-indigo-700 to-purple-800"
  },
  {
    slug: "general-knowledge",
    name: "General Knowledge",
    color: "#FF9800",
    gradient: "from-amber-500 via-orange-600 to-red-600"
  },
  {
    slug: "superheroes",
    name: "Superheroes",
    color: "#1565C0",
    gradient: "from-blue-700 via-red-600 to-yellow-500"
  },
  {
    slug: "comedy",
    name: "Comedy",
    color: "#E91E63",
    gradient: "from-pink-500 via-rose-600 to-purple-700"
  }
];

// Helper function to find topic by slug
export function getTopicBySlug(slug: string): Topic | undefined {
  return topics.find(topic => topic.slug === slug);
}

// Helper function to get all topic slugs (useful for validation)
export function getAllTopicSlugs(): string[] {
  return topics.map(topic => topic.slug);
}
