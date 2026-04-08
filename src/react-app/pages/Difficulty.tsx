import { useParams, Link } from "react-router";
import { useQuery } from "@tanstack/react-query";
import { getDifficultyBySlug } from "@/data/difficulties";
import { DifficultyMetaTags } from "@/react-app/components/DifficultyMetaTags";
import { DifficultySchema } from "@/react-app/components/DifficultySchema";
import LazyQuizCard from "@/react-app/components/LazyQuizCard";
import MoreDifficultyLevels from "@/react-app/components/MoreDifficultyLevels";
import RelatedTopics from "@/react-app/components/RelatedTopics";
import { Loader2, BookOpen, Target, TrendingUp, Home } from "lucide-react";

interface DifficultyContent {
  difficulty: string;
  cefrLevel: string;
  title: string;
  description: string;
  whatYoullLearn: string;
  whyThisLevel: string;
  howToProgress: string;
  metaDescription: string;
}

export default function Difficulty() {
  const { slug } = useParams<{ slug: string }>();
  const difficulty = getDifficultyBySlug(slug || "");

  const { data: content, isLoading: contentLoading } = useQuery<DifficultyContent>({
    queryKey: ["difficulty-content", slug],
    queryFn: async () => {
      const response = await fetch(`/api/difficulty/${slug}/content`);
      if (!response.ok) throw new Error("Failed to fetch content");
      return response.json();
    },
    enabled: !!slug,
  });

  const { data: quizzesData, isLoading: quizzesLoading } = useQuery({
    queryKey: ["difficulty-quizzes", difficulty?.name],
    queryFn: async () => {
      const response = await fetch(`/api/quizzes/paginated?difficulties=${difficulty?.name}&limit=100`);
      if (!response.ok) throw new Error("Failed to fetch quizzes");
      return response.json();
    },
    enabled: !!difficulty,
  });

  const { data: relatedTopicSlugs = [] } = useQuery<string[]>({
    queryKey: ["difficulty-related", slug],
    queryFn: async () => {
      const response = await fetch(`/api/difficulty/${slug}/related`);
      if (!response.ok) throw new Error("Failed to fetch related topics");
      return response.json();
    },
    enabled: !!slug,
  });

  const quizzes = quizzesData?.quizzes || [];

  if (!difficulty) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Difficulty Level Not Found</h1>
          <Link to="/" className="text-primary hover:underline">
            Return to Home
          </Link>
        </div>
      </div>
    );
  }

  if (contentLoading || !content) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <DifficultyMetaTags
        title={content.title}
        description={content.metaDescription}
        slug={slug || ""}
      />
      <DifficultySchema
        title={content.title}
        description={content.description}
        slug={slug || ""}
        cefrLevel={content.cefrLevel}
      />

      {/* Hero Section */}
      <div className="text-white py-16" style={{ backgroundColor: difficulty.color }}>
        <div className="max-w-6xl mx-auto px-4">
          {/* Breadcrumbs */}
          <nav className="mb-6 text-sm text-white/80 flex items-center">
            <Link to="/" className="hover:text-white inline-flex items-center gap-1">
              <Home className="h-4 w-4" />
              Home
            </Link>
            <span className="mx-2">›</span>
            <span className="text-white">{content.title}</span>
          </nav>

          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            {content.title}
          </h1>
          <p className="text-xl md:text-2xl text-white/90 mb-6 max-w-3xl">
            {content.description}
          </p>

          {/* CTA Button */}
          <div className="mt-8">
            <button
              onClick={() => {
                document.getElementById('quizzes')?.scrollIntoView({ 
                  behavior: 'smooth',
                  block: 'start'
                });
              }}
              className="px-8 py-3 bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white font-semibold text-lg rounded-xl shadow-lg hover:shadow-xl transition-all duration-200"
            >
              Browse Quizzes
            </button>
          </div>
        </div>
      </div>

      {/* Table of Contents */}
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="bg-muted/50 rounded-lg p-6 mb-12">
          <h2 className="text-lg font-semibold mb-4">On This Page</h2>
          <nav className="grid grid-cols-1 md:grid-cols-2 gap-2">
            <a href="#what-youll-learn" className="text-primary hover:underline">
              What You'll Learn
            </a>
            <a href="#why-this-level" className="text-primary hover:underline">
              Why This Level
            </a>
            <a href="#how-to-progress" className="text-primary hover:underline">
              How to Progress
            </a>
            <a href="#quizzes" className="text-primary hover:underline">
              Browse Quizzes
            </a>
            <a href="#more-levels" className="text-primary hover:underline">
              More Difficulty Levels
            </a>
            {relatedTopicSlugs.length > 0 && (
              <a href="#related-topics" className="text-primary hover:underline">
                Related Topics
              </a>
            )}
          </nav>
        </div>

        {/* Content Sections */}
        <div className="space-y-12 mb-16">
          {/* What You'll Learn */}
          <section id="what-youll-learn">
            <div className="flex items-center gap-3 mb-4">
              <BookOpen className="h-6 w-6 text-primary" />
              <h2 className="text-2xl font-bold">What You'll Learn</h2>
            </div>
            <div className="prose prose-lg max-w-none">
              <p className="text-muted-foreground whitespace-pre-line leading-relaxed">
                {content.whatYoullLearn}
              </p>
            </div>
          </section>

          {/* Why This Level */}
          <section id="why-this-level">
            <div className="flex items-center gap-3 mb-4">
              <Target className="h-6 w-6 text-primary" />
              <h2 className="text-2xl font-bold">Why This Level</h2>
            </div>
            <div className="prose prose-lg max-w-none">
              <p className="text-muted-foreground whitespace-pre-line leading-relaxed">
                {content.whyThisLevel}
              </p>
            </div>
          </section>

          {/* How to Progress */}
          <section id="how-to-progress">
            <div className="flex items-center gap-3 mb-4">
              <TrendingUp className="h-6 w-6 text-primary" />
              <h2 className="text-2xl font-bold">How to Progress</h2>
            </div>
            <div className="prose prose-lg max-w-none">
              <p className="text-muted-foreground whitespace-pre-line leading-relaxed">
                {content.howToProgress}
              </p>
            </div>
          </section>
        </div>

        {/* Quizzes Grid */}
        <section id="quizzes">
          <h2 className="text-3xl font-bold mb-6">
            {content.title} Quizzes
          </h2>
          {quizzesLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : quizzes && quizzes.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {quizzes.map((quiz: any) => (
                <LazyQuizCard key={quiz.id} quiz={quiz} />
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              <p>No quizzes available at this level yet. Check back soon!</p>
            </div>
          )}
        </section>

        {/* More Difficulty Levels */}
        <MoreDifficultyLevels currentSlug={slug || ""} />
      </div>

      {/* Related Topics */}
      {relatedTopicSlugs.length > 0 && (
        <RelatedTopics relatedSlugs={relatedTopicSlugs} />
      )}
    </div>
  );
}
