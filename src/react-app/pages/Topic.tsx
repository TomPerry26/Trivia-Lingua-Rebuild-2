import { useParams, Navigate } from "react-router";
import { useQuery } from "@tanstack/react-query";
import { Loader2, BookOpen, ChevronRight, ChevronDown } from "lucide-react";
import { getTopicBySlug } from "@/data/topics";
import LazyQuizCard from "@/react-app/components/LazyQuizCard";
import TopicMetaTags from "@/react-app/components/TopicMetaTags";
import TopicSchema from "@/react-app/components/TopicSchema";
import RelatedTopics from "@/react-app/components/RelatedTopics";
import DifficultyLevels from "@/react-app/components/DifficultyLevels";
import { Link } from "react-router";
import { useState } from "react";

interface TopicQuiz {
  id: number;
  title: string;
  topic: string;
  difficulty: string;
  word_count: number;
  question_count: number;
  min_access_level: string;
  url_slug: string | null;
  is_completed?: boolean;
  created_at: string;
  updated_at: string;
}

interface TopicFAQ {
  question: string;
  answer: string;
}

interface TopicContent {
  description: string;
  whyLearn: string;
  whatYoullLearn: string;
  bestFor: string;
}

function FAQItem({ question, answer }: { question: string; answer: string }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="bg-white rounded-lg border border-orange-200 overflow-hidden">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-6 py-4 flex items-center justify-between text-left hover:bg-orange-50 transition-colors"
      >
        <h3 className="text-lg font-semibold text-gray-900 pr-4">{question}</h3>
        <ChevronDown
          className={`w-5 h-5 text-orange-600 flex-shrink-0 transition-transform ${
            isOpen ? "rotate-180" : ""
          }`}
        />
      </button>
      {isOpen && (
        <div className="px-6 py-4 border-t border-orange-100 bg-orange-50/50">
          <p className="text-gray-700 leading-relaxed">{answer}</p>
        </div>
      )}
    </div>
  );
}

export default function TopicPage() {
  const { slug } = useParams<{ slug: string }>();
  const topic = slug ? getTopicBySlug(slug) : undefined;

  // Fetch quizzes for this topic
  const { data: quizzes = [], isLoading } = useQuery<TopicQuiz[]>({
    queryKey: ["topic-quizzes", slug],
    queryFn: async () => {
      const response = await fetch(`/api/topic/${slug}/quizzes`);
      if (!response.ok) throw new Error("Failed to fetch topic quizzes");
      return response.json();
    },
    enabled: !!slug && !!topic,
  });

  // Fetch FAQs for this topic
  const { data: faqs = [] } = useQuery<TopicFAQ[]>({
    queryKey: ["topic-faqs", slug],
    queryFn: async () => {
      const response = await fetch(`/api/topic/${slug}/faqs`);
      if (!response.ok) throw new Error("Failed to fetch topic FAQs");
      return response.json();
    },
    enabled: !!slug && !!topic,
  });

  // Fetch content for this topic
  const { data: topicContent } = useQuery<TopicContent>({
    queryKey: ["topic-content", slug],
    queryFn: async () => {
      const response = await fetch(`/api/topic/${slug}/content`);
      if (!response.ok) throw new Error("Failed to fetch topic content");
      return response.json();
    },
    enabled: !!slug && !!topic,
  });

  // Fetch related topics
  const { data: relatedSlugs = [] } = useQuery<string[]>({
    queryKey: ["topic-related", slug],
    queryFn: async () => {
      const response = await fetch(`/api/topic/${slug}/related`);
      if (!response.ok) throw new Error("Failed to fetch related topics");
      return response.json();
    },
    enabled: !!slug && !!topic,
  });

  // If topic doesn't exist, redirect to quizzes page
  if (!topic) {
    return <Navigate to="/quizzes" replace />;
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
      </div>
    );
  }

  // Count quizzes by difficulty
  const difficultyCount = {
    superbeginner: quizzes.filter(q => q.difficulty.toLowerCase() === "superbeginner").length,
    beginner: quizzes.filter(q => q.difficulty.toLowerCase() === "beginner").length,
    intermediate: quizzes.filter(q => q.difficulty.toLowerCase() === "intermediate").length,
  };

  return (
    <>
      {topicContent && (
        <>
          <TopicMetaTags topic={topic} description={topicContent.description} />
          <TopicSchema topic={topic} quizCount={quizzes.length} description={topicContent.description} faqs={faqs} />
        </>
      )}
      
      <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-red-50">
        {/* Hero Section */}
        <div className={`relative overflow-hidden bg-gradient-to-br ${topic.gradient} text-white`}>
          <div className="absolute inset-0 bg-black/20"></div>
          <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 lg:py-24">
            {/* Breadcrumb */}
            <nav className="mb-8 flex items-center gap-2 text-sm text-white/80">
              <Link to="/" className="hover:text-white transition-colors">Home</Link>
              <ChevronRight className="w-4 h-4" />
              <Link to="/quizzes" className="hover:text-white transition-colors">Quizzes</Link>
              <ChevronRight className="w-4 h-4" />
              <span className="text-white font-medium">{topic.name}</span>
            </nav>

            <div className="flex items-center gap-4 mb-6">
              <div className="w-16 h-16 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
                <BookOpen className="w-8 h-8" />
              </div>
              <div>
                <h1 className="text-4xl lg:text-5xl font-bold mb-2">{topic.name}</h1>
                <p className="text-lg text-white/90">{quizzes.length} Spanish quizzes</p>
              </div>
            </div>

            {topicContent && (
              <p className="text-lg lg:text-xl text-white/95 max-w-3xl leading-relaxed">
                {topicContent.description}
              </p>
            )}

            {/* CTA Button */}
            <div className="mt-8">
              <button
                onClick={() => {
                  document.getElementById('quiz-grid')?.scrollIntoView({ 
                    behavior: 'smooth',
                    block: 'start'
                  });
                }}
                className="px-8 py-3 bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white font-semibold text-lg rounded-xl shadow-lg hover:shadow-xl transition-all duration-200"
              >
                Browse Quizzes
              </button>
            </div>

            {/* Difficulty breakdown */}
            <div className="mt-6 flex flex-wrap gap-4">
              {difficultyCount.superbeginner > 0 && (
                <div className="bg-white/20 backdrop-blur-sm rounded-lg px-4 py-2">
                  <div className="text-sm text-white/80">Superbeginner (A1)</div>
                  <div className="text-2xl font-bold">{difficultyCount.superbeginner}</div>
                </div>
              )}
              {difficultyCount.beginner > 0 && (
                <div className="bg-white/20 backdrop-blur-sm rounded-lg px-4 py-2">
                  <div className="text-sm text-white/80">Beginner (A2)</div>
                  <div className="text-2xl font-bold">{difficultyCount.beginner}</div>
                </div>
              )}
              {difficultyCount.intermediate > 0 && (
                <div className="bg-white/20 backdrop-blur-sm rounded-lg px-4 py-2">
                  <div className="text-sm text-white/80">Intermediate (B1)</div>
                  <div className="text-2xl font-bold">{difficultyCount.intermediate}</div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Content Sections */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-10">
          {/* Table of Contents */}
          <nav className="bg-white rounded-xl shadow-sm border border-orange-100 p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Table of Contents</h2>
            <ul className="space-y-2">
              <li>
                <a 
                  href="#why-learn"
                  onClick={(e) => {
                    e.preventDefault();
                    document.getElementById('why-learn')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                  }}
                  className="text-orange-600 hover:text-orange-700 hover:underline flex items-center gap-2"
                >
                  <ChevronRight className="w-4 h-4" />
                  Why Learn Spanish with {topic.name}?
                </a>
              </li>
              <li>
                <a 
                  href="#what-youll-learn"
                  onClick={(e) => {
                    e.preventDefault();
                    document.getElementById('what-youll-learn')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                  }}
                  className="text-orange-600 hover:text-orange-700 hover:underline flex items-center gap-2"
                >
                  <ChevronRight className="w-4 h-4" />
                  What You'll Learn
                </a>
              </li>
              <li>
                <a 
                  href="#best-for"
                  onClick={(e) => {
                    e.preventDefault();
                    document.getElementById('best-for')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                  }}
                  className="text-orange-600 hover:text-orange-700 hover:underline flex items-center gap-2"
                >
                  <ChevronRight className="w-4 h-4" />
                  Best For
                </a>
              </li>
              {faqs.length > 0 && (
                <li>
                  <a 
                    href="#faq"
                    onClick={(e) => {
                      e.preventDefault();
                      document.getElementById('faq')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    }}
                    className="text-orange-600 hover:text-orange-700 hover:underline flex items-center gap-2"
                  >
                    <ChevronRight className="w-4 h-4" />
                    Frequently Asked Questions
                  </a>
                </li>
              )}
              <li>
                <a 
                  href="#quiz-grid"
                  onClick={(e) => {
                    e.preventDefault();
                    document.getElementById('quiz-grid')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                  }}
                  className="text-orange-600 hover:text-orange-700 hover:underline flex items-center gap-2"
                >
                  <ChevronRight className="w-4 h-4" />
                  {topic.name} Quizzes
                </a>
              </li>
              <li>
                <a 
                  href="#difficulty-levels"
                  onClick={(e) => {
                    e.preventDefault();
                    document.getElementById('difficulty-levels')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                  }}
                  className="text-orange-600 hover:text-orange-700 hover:underline flex items-center gap-2"
                >
                  <ChevronRight className="w-4 h-4" />
                  Difficulty Levels
                </a>
              </li>
              {relatedSlugs.length > 0 && (
                <li>
                  <a 
                    href="#related-topics"
                    onClick={(e) => {
                      e.preventDefault();
                      document.getElementById('related-topics')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    }}
                    className="text-orange-600 hover:text-orange-700 hover:underline flex items-center gap-2"
                  >
                    <ChevronRight className="w-4 h-4" />
                    Related Topics
                  </a>
                </li>
              )}
            </ul>
          </nav>

          {/* Why Learn Spanish with [Topic] */}
          {topicContent && (
            <section id="why-learn">
              <h2 className="text-3xl font-bold text-gray-900 mb-4">
                Why Learn Spanish with {topic.name}?
              </h2>
              <p className="text-lg text-gray-700 leading-relaxed">
                {topicContent.whyLearn}
              </p>
            </section>
          )}

          {/* What You'll Learn */}
          {topicContent && (
            <section id="what-youll-learn">
              <h2 className="text-3xl font-bold text-gray-900 mb-4">
                What You'll Learn
              </h2>
              <p className="text-lg text-gray-700 leading-relaxed">
                {topicContent.whatYoullLearn}
              </p>
            </section>
          )}

          {/* Best For */}
          {topicContent && (
            <section id="best-for">
              <h2 className="text-3xl font-bold text-gray-900 mb-4">
                Best For
              </h2>
              <p className="text-lg text-gray-700 leading-relaxed">
                {topicContent.bestFor}
              </p>
            </section>
          )}

          {/* FAQ Section */}
          {faqs.length > 0 && (
            <section id="faq">
              <h2 className="text-3xl font-bold text-gray-900 mb-6">
                Frequently Asked Questions
              </h2>
              <div className="space-y-4">
                {faqs.map((faq, index) => (
                  <FAQItem key={index} question={faq.question} answer={faq.answer} />
                ))}
              </div>
            </section>
          )}
        </div>

        {/* Quiz Grid */}
        <div id="quiz-grid" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <h2 className="text-3xl font-bold text-gray-900 mb-8">
            {topic.name} Quizzes
          </h2>
          {quizzes.length === 0 ? (
            <div className="text-center py-16">
              <p className="text-lg text-gray-600">No quizzes available for this topic yet.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {quizzes.map((quiz) => (
                <LazyQuizCard 
                  key={quiz.id} 
                  quiz={{
                    ...quiz,
                    total_word_count: quiz.word_count,
                    created_at: quiz.created_at || new Date().toISOString(),
                    updated_at: quiz.updated_at || new Date().toISOString(),
                  }} 
                />
              ))}
            </div>
          )}
        </div>

        {/* Difficulty Levels */}
        <DifficultyLevels />

        {/* Related Topics */}
        {relatedSlugs.length > 0 && <RelatedTopics relatedSlugs={relatedSlugs} />}
      </div>
    </>
  );
}
