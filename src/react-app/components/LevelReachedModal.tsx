import { BookOpen, Flame, Trophy, Target, Share2 } from "lucide-react";
import { useEffect } from "react";
import confetti from "canvas-confetti";

interface LevelReachedModalProps {
  level: number;
  levelName: string;
  nextLevel: number | null;
  totalWords: number;
  currentStreak: number;
  quizzesCompleted: number;
  bestStreak: number;
  onKeepPlaying: () => void;
}

export default function LevelReachedModal({
  level,
  levelName,
  nextLevel,
  totalWords,
  currentStreak,
  quizzesCompleted,
  bestStreak,
  onKeepPlaying,
}: LevelReachedModalProps) {
  useEffect(() => {
    // Fire confetti when modal appears - extra spectacular for level up!
    const duration = 4000;
    const animationEnd = Date.now() + duration;

    const interval = setInterval(() => {
      const timeLeft = animationEnd - Date.now();

      if (timeLeft <= 0) {
        clearInterval(interval);
        return;
      }

      confetti({
        particleCount: 7,
        angle: 60,
        spread: 70,
        origin: { x: 0, y: 0.6 },
        colors: ['#f97316', '#fb923c', '#fdba74', '#fed7aa', '#fbbf24'],
      });
      confetti({
        particleCount: 7,
        angle: 120,
        spread: 70,
        origin: { x: 1, y: 0.6 },
        colors: ['#f97316', '#fb923c', '#fdba74', '#fed7aa', '#fbbf24'],
      });
      confetti({
        particleCount: 5,
        angle: 90,
        spread: 80,
        origin: { x: 0.5, y: 0.3 },
        colors: ['#f97316', '#fb923c', '#fdba74', '#fed7aa', '#fbbf24'],
      });
    }, 40);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-6 bg-gradient-to-br from-orange-500 to-red-500 animate-in fade-in duration-300" style={{ pointerEvents: 'auto' }}>
      <div className="relative max-w-2xl w-full my-auto py-8">
        {/* Decorative background elements */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-20 left-10 w-72 h-72 bg-white/10 rounded-full blur-3xl animate-pulse"></div>
          <div className="absolute bottom-20 right-10 w-96 h-96 bg-white/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
        </div>

        {/* Content */}
        <div className="relative text-center">
          {/* Header */}
          <h2 className="text-3xl sm:text-4xl md:text-4xl font-black text-white mb-3 drop-shadow-lg whitespace-nowrap overflow-hidden text-ellipsis px-2">
            You reached Level {level}:
          </h2>
          <h3 className="text-2xl md:text-3xl font-bold text-white/90 mb-6 drop-shadow-lg">
            {levelName}!
          </h3>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 gap-3 md:gap-4 mb-6">
            {/* Total Words */}
            <div className="bg-white/95 backdrop-blur-lg rounded-2xl p-4 md:p-3 shadow-2xl border border-orange-100">
              <div className="p-2 bg-orange-100 rounded-xl w-fit mb-2 mx-auto">
                <BookOpen className="w-5 h-5 md:w-4 md:h-4 text-orange-600" />
              </div>
              <p className="text-xs text-gray-600 mb-0.5">Total Words</p>
              <p className="text-2xl md:text-xl font-bold text-gray-800">
                {totalWords.toLocaleString()}
              </p>
            </div>

            {/* Current Streak */}
            <div className="bg-white/95 backdrop-blur-lg rounded-2xl p-4 md:p-3 shadow-2xl border border-orange-100">
              <div className="p-2 bg-red-100 rounded-xl w-fit mb-2 mx-auto">
                <Flame className="w-5 h-5 md:w-4 md:h-4 text-red-600" />
              </div>
              <p className="text-xs text-gray-600 mb-0.5">Current Streak</p>
              <p className="text-2xl md:text-xl font-bold text-gray-800">
                {currentStreak}
                <span className="text-sm ml-1">
                  {currentStreak === 1 ? "day" : "days"}
                </span>
              </p>
            </div>

            {/* Quizzes Completed */}
            <div className="bg-white/95 backdrop-blur-lg rounded-2xl p-4 md:p-3 shadow-2xl border border-orange-100">
              <div className="p-2 bg-amber-100 rounded-xl w-fit mb-2 mx-auto">
                <Trophy className="w-5 h-5 md:w-4 md:h-4 text-amber-600" />
              </div>
              <p className="text-xs text-gray-600 mb-0.5">Quizzes</p>
              <p className="text-2xl md:text-xl font-bold text-gray-800">
                {quizzesCompleted}
              </p>
            </div>

            {/* Best Streak */}
            <div className="bg-white/95 backdrop-blur-lg rounded-2xl p-4 md:p-3 shadow-2xl border border-orange-100">
              <div className="p-2 bg-green-100 rounded-xl w-fit mb-2 mx-auto">
                <Target className="w-5 h-5 md:w-4 md:h-4 text-green-600" />
              </div>
              <p className="text-xs text-gray-600 mb-0.5">Best Streak</p>
              <p className="text-2xl md:text-xl font-bold text-gray-800">
                {bestStreak}
                <span className="text-sm ml-1">
                  {bestStreak === 1 ? "day" : "days"}
                </span>
              </p>
            </div>
          </div>

          {/* Next Level */}
          {nextLevel && (
            <div className="mb-6">
              <p className="text-lg md:text-xl font-bold text-white drop-shadow-lg">
                Next: Level {nextLevel}
              </p>
            </div>
          )}

          {/* CTA Buttons */}
          <div className="flex items-center gap-3 mb-4">
            <button
              onClick={onKeepPlaying}
              className="flex-1 py-4 px-8 bg-white hover:bg-gray-50 text-gray-800 text-lg font-bold rounded-xl shadow-2xl transition-all transform hover:scale-105 active:scale-95"
            >
              Keep playing
            </button>
            <button
              onClick={async () => {
                const shareData = {
                  title: `I hit Level ${level} on Trivia Lingua!`,
                  text: `I hit level ${level} and read ${totalWords.toLocaleString()} words in Spanish on Trivia Lingua!`,
                  url: "https://www.trivialingua.com",
                };

                try {
                  if (navigator.share) {
                    await navigator.share(shareData);
                  } else {
                    await navigator.clipboard.writeText(`${shareData.text}\n${shareData.url}`);
                    alert("Link copied to clipboard!");
                  }
                } catch (error) {
                  console.error("Error sharing:", error);
                }
              }}
              className="py-4 px-6 bg-white hover:bg-gray-50 text-orange-600 rounded-xl shadow-2xl transition-all transform hover:scale-105 active:scale-95"
              aria-label="Share"
            >
              <Share2 className="w-6 h-6" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
