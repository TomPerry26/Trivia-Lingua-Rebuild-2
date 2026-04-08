import { useParams, useNavigate } from "react-router";
import { useState, useEffect } from "react";
import { Loader2, Check, X, BookOpen, RotateCcw, Share2 } from "lucide-react";
import confetti from "canvas-confetti";
import QuestionFeedback from "../components/QuestionFeedback";
import MetaTags from "../components/MetaTags";
import { queryClient } from "@/react-app/lib/queryClient";
import { useAuth } from "@getmocha/users-service/react";
import QuizSchema from "../components/QuizSchema";
import AccessGate from "../components/AccessGate";
import { hasAccess, type AccessLevel } from "@/shared/access-levels";
import { updateGuestProgress } from "@/react-app/lib/guestProgress";
import { extractIdFromSlug, buildQuizUrl } from "@/shared/slug-utils";

// Helper to get or create guest session ID
function getGuestSessionId(): string {
  const storageKey = 'guestSessionId';
  let sessionId = localStorage.getItem(storageKey);
  if (!sessionId) {
    // Generate UUID-like ID with guest_ prefix
    sessionId = 'guest_' + crypto.randomUUID();
    localStorage.setItem(storageKey, sessionId);
  }
  return sessionId;
}

interface Question {
  id: number;
  quiz_id: number;
  question_text: string;
  correct_answer: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  explanation: string;
  word_count: number;
  question_order: number;
  image_url?: string;
  explanation_image_url?: string;
}

interface Quiz {
  id: number;
  title: string;
  topic: string;
  difficulty: string;
  min_access_level: AccessLevel;
  questions: Question[];
}

export default function QuizPage() {
  const params = useParams<{ id?: string; slugWithId?: string }>();
  const navigate = useNavigate();
  
  // Extract quiz ID from either format: /quiz/:id or /es/quiz/:slugWithId
  const quizId = params.id || (params.slugWithId ? String(extractIdFromSlug(params.slugWithId)) : null);
  const { user, isPending: authPending, redirectToLogin } = useAuth();
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [hasQuizAccess, setHasQuizAccess] = useState(true);
  const [nextQuizId, setNextQuizId] = useState<number | null>(null);
  const [nextQuizTitle, setNextQuizTitle] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [showExplanation, setShowExplanation] = useState(false);
  const [score, setScore] = useState(0);
  const [answers, setAnswers] = useState<boolean[]>([]);
  const [selectedAnswers, setSelectedAnswers] = useState<(string | null)[]>([]);
  const [quizCompleted, setQuizCompleted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      // Wait for auth to finish loading
      if (authPending) {
        return;
      }

      try {
        // Get user's access level
        let accessLevel: AccessLevel = 'guest';
        if (user) {
          const profileResponse = await fetch('/api/users/me');
          if (profileResponse.ok) {
            const profileData = await profileResponse.json();
            accessLevel = profileData.access_level || 'member';
          } else {
            accessLevel = 'member'; // Default for logged-in users
          }
        }

        // Fetch the quiz
        const quizResponse = await fetch(`/api/quizzes/${quizId}`);
        if (quizResponse.ok) {
          const quizData = await quizResponse.json();
          setQuiz(quizData);
          
          // Check if user has access to this quiz
          const canAccess = hasAccess(accessLevel, quizData.min_access_level);
          setHasQuizAccess(canAccess);
        }
      } catch (error) {
        console.error("Failed to fetch quiz:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [quizId, user, authPending]);

  useEffect(() => {
    if (quizCompleted) {
      window.scrollTo(0, 0);
    }
  }, [quizCompleted]);

  useEffect(() => {
    // Scroll to top instantly whenever the question changes
    window.scrollTo(0, 0);
  }, [currentQuestionIndex]);

  const handleAnswerSelect = (answer: string) => {
    if (showExplanation) return;
    // Check if this question was already answered
    if (selectedAnswers[currentQuestionIndex] !== undefined) return;
    
    setSelectedAnswer(answer);
    setShowExplanation(true);

    const currentQuestion = quiz!.questions[currentQuestionIndex];
    const isCorrect = answer === currentQuestion.correct_answer;
    
    if (isCorrect) {
      setScore(score + 1);
    }
    
    setAnswers([...answers, isCorrect]);
    
    // Store the selected answer for this question
    const newSelectedAnswers = [...selectedAnswers];
    newSelectedAnswers[currentQuestionIndex] = answer;
    setSelectedAnswers(newSelectedAnswers);
  };

  const handleNext = () => {
    if (currentQuestionIndex < quiz!.questions.length - 1) {
      const nextIndex = currentQuestionIndex + 1;
      setCurrentQuestionIndex(nextIndex);
      // Check if the next question was already answered
      if (selectedAnswers[nextIndex] !== undefined) {
        setSelectedAnswer(selectedAnswers[nextIndex]);
        setShowExplanation(true);
      } else {
        setSelectedAnswer(null);
        setShowExplanation(false);
      }
    } else {
      // Prevent duplicate submissions
      if (!submitting) {
        completeQuiz();
      }
    }
  };

  const handlePrevious = () => {
    if (currentQuestionIndex > 0) {
      const prevIndex = currentQuestionIndex - 1;
      setCurrentQuestionIndex(prevIndex);
      // Previous questions are always answered
      setSelectedAnswer(selectedAnswers[prevIndex]);
      setShowExplanation(true);
    }
  };

  const completeQuiz = async () => {
    setSubmitting(true);
    const totalWordsRead = quiz!.questions.reduce((sum, q) => sum + q.word_count, 0);
    
    if (user) {
      // Authenticated user - use the authenticated endpoint
      try {
        const response = await fetch(`/api/quizzes/${quizId}/complete`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            score,
            words_read: totalWordsRead,
          }),
        });
        
        if (response.ok) {
          const data = await response.json();
          setNextQuizId(data.nextQuizId);
          
          // Fetch next quiz title if available
          if (data.nextQuizId) {
            try {
              const nextQuizResponse = await fetch(`/api/quizzes/${data.nextQuizId}`);
              if (nextQuizResponse.ok) {
                const nextQuizData = await nextQuizResponse.json();
                setNextQuizTitle(nextQuizData.title);
              }
            } catch (error) {
              console.error("Failed to fetch next quiz title:", error);
            }
          }
          
          // Store goal reached info in sessionStorage for the Quizzes page to show
          if (data.goalReached) {
            sessionStorage.setItem("goal-reached", JSON.stringify({
              streak: data.currentStreak,
              wordsRead: data.dailyWordsRead,
              dailyTarget: data.dailyTarget,
            }));
          }
          
          // Store level reached info in sessionStorage for the Quizzes page to show
          if (data.levelReached && data.levelData) {
            sessionStorage.setItem("level-reached", JSON.stringify(data.levelData));
          }
          
          // Invalidate quiz queries so the completion status updates immediately
          queryClient.invalidateQueries({ queryKey: ["quizzes-paginated"] });
          queryClient.invalidateQueries({ queryKey: ["home-data"] });
          queryClient.invalidateQueries({ queryKey: ["progress-data"] });
          queryClient.invalidateQueries({ queryKey: ["progress"] });
        }
      } catch (error) {
        console.error("Failed to save quiz completion:", error);
      }
    } else {
      // Guest user - use the guest endpoint with session ID
      try {
        const guestSessionId = getGuestSessionId();
        await fetch(`/api/quizzes/${quizId}/complete-guest`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            score,
            words_read: totalWordsRead,
            guest_session_id: guestSessionId,
          }),
        });
        
        // Update localStorage for guest progress tracking
        updateGuestProgress(totalWordsRead);
      } catch (error) {
        console.error("Failed to save guest quiz completion:", error);
      }
    }

    setQuizCompleted(true);
    
    // Fire confetti
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 },
      colors: ['#f97316', '#fb923c', '#fdba74', '#fed7aa'],
    });
  };

  const handleNextQuiz = () => {
    if (nextQuizId) {
      // Fallback to old format - we don't have slug data for next quiz
      navigate(`/quiz/${nextQuizId}`);
      window.location.reload(); // Reload to reset state
    } else {
      navigate('/quizzes');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-amber-50 to-orange-100">
        <div className="animate-spin">
          <Loader2 className="w-10 h-10 text-orange-500" />
        </div>
      </div>
    );
  }

  if (!quiz) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-amber-50 to-orange-100">
        <div className="text-center">
          <p className="text-gray-600 mb-4">Quiz not found</p>
          <button
            onClick={() => navigate(-1)}
            className="py-2 px-6 bg-orange-500 hover:bg-orange-600 text-white font-semibold rounded-xl transition-colors"
          >
            Back
          </button>
        </div>
      </div>
    );
  }

  // Show access gate if user doesn't have access
  if (!hasQuizAccess) {
    return <AccessGate requiredLevel={quiz.min_access_level} onUpgrade={() => navigate('/pricing')} />;
  }

  if (quizCompleted) {
    const totalWordsRead = quiz.questions.reduce((sum, q) => sum + q.word_count, 0);

    const handleShare = async () => {
      const shareData = {
        title: `I just played "${quiz.title}" on Trivia Lingua!`,
        text: `I scored ${score}/${quiz.questions.length} and read ${totalWordsRead} words on "${quiz.title}". Join me?`,
        url: "https://www.trivialingua.com",
      };

      try {
        if (navigator.share) {
          await navigator.share(shareData);
        } else {
          // Fallback: copy to clipboard
          await navigator.clipboard.writeText(`${shareData.text}\n${shareData.url}`);
          alert("Link copied to clipboard!");
        }
      } catch (error) {
        console.error("Error sharing:", error);
      }
    };

    return (
      <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-red-50 py-4 px-4">
        <div className="max-w-2xl mx-auto">
          <div className="bg-white/80 backdrop-blur-lg rounded-3xl shadow-2xl p-6 border border-orange-100 text-center">
            <div className="mb-4">
              <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-orange-500 to-red-500 rounded-full mb-3">
                <span className="text-4xl">🎉</span>
              </div>
              <h2 className="text-2xl font-bold text-gray-800 mb-1">Quiz Completed!</h2>
              <p className="text-gray-600">Excellent work!</p>
            </div>

            <div className="bg-gradient-to-r from-orange-50 to-amber-50 rounded-2xl p-5 mb-6">
              <div className="text-5xl font-bold bg-gradient-to-r from-orange-600 to-red-600 bg-clip-text text-transparent mb-1">
                {score}/{quiz.questions.length}
              </div>
              <div className="text-3xl font-bold text-orange-600">
                {totalWordsRead} words read
              </div>
            </div>

            <div className="space-y-4">
              {/* Primary action button */}
              {!user ? (
                <button
                  onClick={redirectToLogin}
                  className="w-full py-3 px-6 bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all"
                >
                  Sign in to track your progress
                </button>
              ) : nextQuizId && nextQuizTitle && (
                <button
                  onClick={handleNextQuiz}
                  className="w-full py-3 px-6 bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all"
                >
                  Next: {nextQuizTitle}
                </button>
              )}

              {/* Icon buttons row */}
              <div className="grid grid-cols-3 gap-3">
                <button
                  onClick={() => navigate('/quizzes')}
                  className="flex flex-col items-center gap-2 py-3 px-2 bg-white hover:bg-gray-50 text-gray-700 font-medium rounded-xl border-2 border-gray-200 transition-colors"
                >
                  <BookOpen className="w-7 h-7" />
                  <span className="text-xs">All quizzes</span>
                </button>
                <button
                  onClick={() => window.location.reload()}
                  className="flex flex-col items-center gap-2 py-3 px-2 bg-white hover:bg-gray-50 text-gray-700 font-medium rounded-xl border-2 border-gray-200 transition-colors"
                >
                  <RotateCcw className="w-7 h-7" />
                  <span className="text-xs">Retake quiz</span>
                </button>
                <button
                  onClick={handleShare}
                  className="flex flex-col items-center gap-2 py-3 px-2 bg-white hover:bg-gray-50 text-gray-700 font-medium rounded-xl border-2 border-gray-200 transition-colors"
                >
                  <Share2 className="w-7 h-7" />
                  <span className="text-xs">Share</span>
                </button>
              </div>

              {/* Buy me a coffee section */}
              <div className="mt-6 pt-6 border-t border-gray-200">
                <p className="text-gray-600 text-center mb-3 font-medium">
                  Enjoyed the quiz? Keep them coming!
                </p>
                <a
                  href="https://ko-fi.com/trivialingua"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 w-full py-3 px-6 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all"
                >
                  <span className="text-xl">☕</span>
                  <span>Buy me a coffee</span>
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const currentQuestion = quiz.questions[currentQuestionIndex];
  const options = [
    { key: 'A', value: currentQuestion.option_a },
    { key: 'B', value: currentQuestion.option_b },
    { key: 'C', value: currentQuestion.option_c },
    { key: 'D', value: currentQuestion.option_d },
  ];

  const quizMetaDescription = quiz.questions.slice(0, 2)
    .map(q => q.question_text)
    .join(' | ')
    .substring(0, 155) + '...';

  const quizUrl = (quiz as any).url_slug 
    ? buildQuizUrl({ id: quiz.id, url_slug: (quiz as any).url_slug })
    : `/quiz/${quiz.id}`;

  return (
      <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-red-50 py-4 px-4">
        <MetaTags
          title={`${quiz.title} - Trivia Lingua`}
          description={quizMetaDescription}
          url={`https://k3ssqlqvt37e2.mocha.app${quizUrl}`}
          image="https://019b272f-a125-73ff-b876-e31472c7c4fa.mochausercontent.com/Open-Graph-(Home-1200).jpg"
        />
        <QuizSchema quiz={quiz} />
        <div className="max-w-3xl mx-auto">
        {/* Quiz Info with Progress */}
        <div className="bg-white/80 backdrop-blur-lg rounded-2xl shadow-xl p-4 mb-4 border border-orange-100">
          <h1 className="text-xl font-bold text-gray-800 mb-3">{quiz.title}</h1>
          
          {/* Progress Bar */}
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="h-full bg-gradient-to-r from-orange-500 to-red-500 rounded-full transition-all duration-300"
              style={{ width: `${((currentQuestionIndex + 1) / quiz.questions.length) * 100}%` }}
            />
          </div>
        </div>

        {/* Question */}
        <div className="bg-white/80 backdrop-blur-lg rounded-2xl shadow-xl p-5 mb-4 border border-orange-100">
          <h2 className="text-xl font-bold text-gray-800 mb-5">
            {currentQuestion.question_text}
          </h2>
          
          {currentQuestion.image_url && (
            <div className="mb-5">
              <img
                src={currentQuestion.image_url}
                alt="Question illustration"
                className="w-full md:max-w-sm md:mx-auto h-auto rounded-xl"
                style={{ maxHeight: "400px", objectFit: "contain" }}
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = "none";
                }}
              />
            </div>
          )}

          <div className="space-y-2.5">
            {options.map((option) => {
              const isSelected = selectedAnswer === option.value;
              const isCorrect = option.value === currentQuestion.correct_answer;
              const isAlreadyAnswered = selectedAnswers[currentQuestionIndex] !== undefined;
              
              let buttonClass = "w-full p-3 text-left rounded-xl font-semibold transition-all border-2 ";
              
              if (!showExplanation) {
                buttonClass += "bg-white hover:bg-orange-50 border-gray-200 hover:border-orange-300 text-gray-800";
              } else if (isCorrect) {
                buttonClass += "bg-green-50 border-green-500 text-green-800";
              } else if (isSelected && !isCorrect) {
                buttonClass += "bg-red-50 border-red-500 text-red-800";
              } else {
                buttonClass += "bg-gray-50 border-gray-200 text-gray-500";
              }

              return (
                <button
                  key={option.key}
                  onClick={() => handleAnswerSelect(option.value)}
                  disabled={showExplanation || isAlreadyAnswered}
                  className={buttonClass}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-gray-100 text-gray-600 font-bold text-sm">
                        {option.key}
                      </span>
                      <span>{option.value}</span>
                    </div>
                    {showExplanation && isCorrect && (
                      <Check className="w-6 h-6 text-green-600" />
                    )}
                    {showExplanation && isSelected && !isCorrect && (
                      <X className="w-6 h-6 text-red-600" />
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Explanation */}
        {showExplanation && (
          <div className="bg-white/80 backdrop-blur-lg rounded-2xl shadow-xl p-5 mb-4 border border-orange-100 animate-in fade-in duration-300">
            <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full mb-3 ${
              selectedAnswer === currentQuestion.correct_answer
                ? 'bg-green-100 text-green-700'
                : 'bg-red-100 text-red-700'
            }`}>
              {selectedAnswer === currentQuestion.correct_answer ? (
                <>
                  <Check className="w-4 h-4" />
                  <span className="font-semibold text-sm">Correct!</span>
                </>
              ) : (
                <>
                  <X className="w-4 h-4" />
                  <span className="font-semibold text-sm">Incorrect</span>
                </>
              )}
            </div>
            
            <div className="prose prose-orange max-w-none">
              <p className="text-gray-700 text-sm leading-relaxed whitespace-pre-line">
                {currentQuestion.explanation}
              </p>
            </div>

            {currentQuestion.explanation_image_url && (
              <div className="mt-4 mb-4">
                <img
                  src={currentQuestion.explanation_image_url}
                  alt="Explanation illustration"
                  className="w-full md:max-w-sm md:mx-auto h-auto rounded-xl"
                  style={{ maxHeight: "400px", objectFit: "contain" }}
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = "none";
                  }}
                />
              </div>
            )}

            <QuestionFeedback questionId={currentQuestion.id} quizId={quiz.id} />

            <button
              onClick={handleNext}
              disabled={submitting && currentQuestionIndex === quiz.questions.length - 1}
              className="w-full mt-4 py-3 px-6 bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting && currentQuestionIndex === quiz.questions.length - 1 
                ? 'Submitting...' 
                : currentQuestionIndex < quiz.questions.length - 1 
                  ? 'Next question' 
                  : 'View results'}
            </button>
          </div>
        )}

        {/* Navigation buttons */}
        {selectedAnswers.length > 0 && (
          <div className="flex items-center justify-center gap-2 mt-3 mb-4">
            <button
              onClick={handlePrevious}
              disabled={currentQuestionIndex === 0}
              className="px-3 py-1.5 text-xs font-medium text-gray-500 hover:text-orange-500 disabled:text-gray-300 disabled:cursor-not-allowed transition-colors"
            >
              ← Previous
            </button>
            <span className="text-xs text-gray-400 font-medium">
              {currentQuestionIndex + 1} / {quiz.questions.length}
            </span>
            <button
              onClick={handleNext}
              disabled={currentQuestionIndex >= selectedAnswers.length - 1}
              className="px-3 py-1.5 text-xs font-medium text-gray-500 hover:text-orange-500 disabled:text-gray-300 disabled:cursor-not-allowed transition-colors"
            >
              Next →
            </button>
          </div>
        )}
        </div>
      </div>
  );
}
