import { Link } from "react-router";
import { ChevronRight } from "lucide-react";
import { getTopicBySlug, type Topic } from "@/data/topics";

interface RelatedTopicsProps {
  relatedSlugs: string[];
}

export default function RelatedTopics({ relatedSlugs }: RelatedTopicsProps) {
  // Filter out any invalid slugs and get full topic data
  const relatedTopics = relatedSlugs
    .map(slug => getTopicBySlug(slug))
    .filter((topic): topic is Topic => topic !== undefined);

  if (relatedTopics.length === 0) {
    return null;
  }

  return (
    <section id="related-topics" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <h2 className="text-3xl font-bold text-gray-900 mb-8">
        Related Topics
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {relatedTopics.map((topic) => (
          <Link
            key={topic.slug}
            to={`/es/topic/${topic.slug}`}
            className="group relative overflow-hidden rounded-xl bg-gradient-to-br shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105"
            style={{
              background: `linear-gradient(to bottom right, ${topic.color}, ${topic.color}dd)`
            }}
          >
            <div className="absolute inset-0 bg-black/20"></div>
            <div className="relative p-6 text-white">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-2xl font-bold">{topic.name}</h3>
                <ChevronRight className="w-6 h-6 group-hover:translate-x-1 transition-transform" />
              </div>
              <p className="text-white/90 text-sm">
                Explore {topic.name} quizzes
              </p>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
