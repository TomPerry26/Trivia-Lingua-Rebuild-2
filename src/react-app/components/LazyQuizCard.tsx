import { useState, useRef, useEffect } from "react";
import { Link } from "react-router";
import { BookOpen, ChevronRight, CheckCircle2, Lock } from "lucide-react";
import type { Quiz } from "@/shared/types";
import { useAuth } from "@/react-app/contexts/AuthContext";
import { hasAccess, type AccessLevel } from "@/shared/access-levels";

interface LazyQuizCardProps {
  quiz: Quiz;
  className?: string;
  userAccessLevel?: AccessLevel;
}

const dotColors = {
  Superbeginner: "bg-blue-500",
  Beginner: "bg-green-500",
  Intermediate: "bg-orange-500",
  Advanced: "bg-red-500"
};

const SkeletonCard = ({ className }: { className?: string }) => (
  <div className={`bg-white/80 backdrop-blur-lg rounded-2xl shadow-lg p-4 border border-orange-100 animate-pulse ${className || ""}`}>
    <div className="flex items-start justify-between">
      <div className="flex-1">
        <div className="flex items-center gap-2 mb-1.5">
          <div className="w-2 h-2 rounded-full bg-gray-300"></div>
          <div className="h-3 w-16 bg-gray-300 rounded"></div>
        </div>
        <div className="h-5 bg-gray-300 rounded mb-1.5 w-3/4"></div>
        <div className="flex items-center gap-2">
          <div className="w-3.5 h-3.5 bg-gray-300 rounded"></div>
          <div className="h-3 w-24 bg-gray-300 rounded"></div>
        </div>
      </div>
      <div className="w-5 h-5 bg-gray-300 rounded flex-shrink-0"></div>
    </div>
  </div>
);

const SCROLL_POSITION_KEY = "quizzes-scroll-position";

export default function LazyQuizCard({ quiz, className, userAccessLevel }: LazyQuizCardProps) {
  const [isVisible, setIsVisible] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);
  const { user, redirectToLogin } = useAuth();

  // Determine user's access level
  const effectiveAccessLevel = userAccessLevel || (user ? 'member' : 'guest');
  
  // Check if quiz has min_access_level and if user has access
  const quizAccessLevel = ((quiz as any).visibility_tier ?? (quiz as any).min_access_level) as AccessLevel | undefined;
  const requiredAccess = (quiz as any).access_required as AccessLevel | null | undefined;
  const isLocked = Boolean(requiredAccess) || (quizAccessLevel ? !hasAccess(effectiveAccessLevel, quizAccessLevel) : false);
  const parsedWordCount = Number((quiz as any).total_word_count);
  const exactWordCount = Number.isFinite(parsedWordCount) ? parsedWordCount : null;

  const handleClick = () => {
    // Save current scroll position before navigating
    sessionStorage.setItem(SCROLL_POSITION_KEY, window.scrollY.toString());
  };

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { 
        rootMargin: "200px", // Load cards 200px before they come into view
        threshold: 0.01 
      }
    );

    if (cardRef.current) {
      observer.observe(cardRef.current);
    }

    return () => {
      observer.disconnect();
    };
  }, []);

  if (!isVisible) {
    return (
      <div ref={cardRef}>
        <SkeletonCard className={className} />
      </div>
    );
  }

  if (isLocked) {
    return (
      <div
        className={`group bg-white/80 backdrop-blur-lg rounded-2xl shadow-lg p-4 border border-orange-100 ${className || ""}`}
      >
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1.5">
              <div className={`w-2 h-2 rounded-full ${dotColors[quiz.difficulty as keyof typeof dotColors]}`}></div>
              <span className="text-xs font-semibold text-gray-500">{quiz.difficulty}</span>
            </div>
            <h4 className="text-base font-bold text-gray-800 mb-1.5 truncate">{quiz.title}</h4>
            <p className="text-xs text-amber-700 font-semibold mb-2">Member-only quiz</p>
            <button
              onClick={redirectToLogin}
              className="text-xs font-semibold text-orange-600 hover:text-orange-700 underline underline-offset-2"
            >
              Sign up to unlock
            </button>
          </div>
          <Lock className="w-5 h-5 text-gray-400 flex-shrink-0" />
        </div>
      </div>
    );
  }

  return (
    <Link
      to={`/quiz/${quiz.id}`}
      onClick={handleClick}
      className={`block group bg-white/80 backdrop-blur-lg rounded-2xl shadow-lg hover:shadow-xl p-4 border border-orange-100 transition-all duration-200 hover:scale-105 ${className || ""}`}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1.5">
            <div className={`w-2 h-2 rounded-full ${dotColors[quiz.difficulty as keyof typeof dotColors]}`}></div>
            <span className="text-xs font-semibold text-gray-500">
              {quiz.difficulty}
            </span>
          </div>
          <h4 className="text-base font-bold text-gray-800 group-hover:text-orange-600 transition-colors mb-1.5 truncate">
            {quiz.title}
          </h4>
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <BookOpen className="w-3.5 h-3.5" />
            <span>≈ {exactWordCount !== null ? exactWordCount.toLocaleString() : "500-1000"} words</span>
          </div>
        </div>
        {quiz.is_completed ? (
          <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0" />
        ) : (
          <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-orange-600 transition-colors flex-shrink-0" />
        )}
      </div>
    </Link>
  );
}
