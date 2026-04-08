import { Link } from "react-router";
import { ChevronRight } from "lucide-react";
import { difficulties } from "@/data/difficulties";

interface MoreDifficultyLevelsProps {
  currentSlug: string;
}

export default function MoreDifficultyLevels({ currentSlug }: MoreDifficultyLevelsProps) {
  // Get all difficulties except the current one
  const otherDifficulties = difficulties.filter(d => d.slug !== currentSlug);

  if (otherDifficulties.length === 0) {
    return null;
  }

  return (
    <section id="more-levels" className="mt-16 mb-10">
      <h2 className="text-3xl font-bold mb-6">
        More Difficulty Levels
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {otherDifficulties.map((difficulty) => (
          <Link
            key={difficulty.slug}
            to={`/es/${difficulty.slug}`}
            onClick={() => window.scrollTo(0, 0)}
            className="group relative overflow-hidden rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105"
            style={{ backgroundColor: difficulty.color }}
          >
            <div className="p-8 text-white">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <h3 className="text-2xl font-bold">{difficulty.name}</h3>
                  <p className="text-white/90 text-sm mt-1">CEFR Level {difficulty.cefr}</p>
                </div>
                <ChevronRight className="w-6 h-6 group-hover:translate-x-1 transition-transform" />
              </div>
              <p className="text-white/80 text-sm mt-4">
                Explore {difficulty.name} quizzes
              </p>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
