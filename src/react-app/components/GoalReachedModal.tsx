import { Flame, Share2 } from "lucide-react";
import { useEffect } from "react";
import confetti from "canvas-confetti";

interface GoalReachedModalProps {
  streak: number;
  wordsRead: number;
  dailyTarget: number;
  onKeepPlaying: () => void;
}

export default function GoalReachedModal({
  streak,
  wordsRead,
  dailyTarget,
  onKeepPlaying,
}: GoalReachedModalProps) {
  useEffect(() => {
    // Fire confetti when modal appears
    const duration = 3000;
    const animationEnd = Date.now() + duration;

    const interval = setInterval(() => {
      const timeLeft = animationEnd - Date.now();

      if (timeLeft <= 0) {
        clearInterval(interval);
        return;
      }

      confetti({
        particleCount: 3,
        angle: 60,
        spread: 55,
        origin: { x: 0, y: 0.6 },
        colors: ['#f97316', '#fb923c', '#fdba74', '#fed7aa', '#fbbf24'],
      });
      confetti({
        particleCount: 3,
        angle: 120,
        spread: 55,
        origin: { x: 1, y: 0.6 },
        colors: ['#f97316', '#fb923c', '#fdba74', '#fed7aa', '#fbbf24'],
      });
    }, 50);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-300" style={{ pointerEvents: 'auto' }}>
      <div className="relative max-w-lg w-full mx-4 bg-gradient-to-br from-orange-50 via-amber-50 to-yellow-50 rounded-3xl shadow-2xl border-4 border-orange-300 overflow-hidden animate-in zoom-in duration-500">
        {/* Decorative elements */}
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
          <div className="absolute -top-20 -right-20 w-64 h-64 bg-gradient-to-br from-orange-400/20 to-yellow-400/20 rounded-full blur-3xl"></div>
          <div className="absolute -bottom-20 -left-20 w-64 h-64 bg-gradient-to-br from-red-400/20 to-orange-400/20 rounded-full blur-3xl"></div>
        </div>

        {/* Content */}
        <div className="relative p-6 text-center">
          {/* Title */}
          <h2 className="text-4xl font-black text-gray-800 mb-6">
            You hit your daily goal!
          </h2>

          {/* Stats */}
          <div className="space-y-4 mb-8">
            {/* Words Progress */}
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-5 border-2 border-orange-200 shadow-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="text-gray-600 font-semibold">Words read today</span>
                <span className="text-3xl font-black bg-gradient-to-r from-orange-600 to-red-600 bg-clip-text text-transparent">
                  {wordsRead.toLocaleString()}
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-orange-500 via-amber-500 to-yellow-500 rounded-full transition-all duration-1000 shadow-lg"
                  style={{ width: `${Math.min((wordsRead / dailyTarget) * 100, 100)}%` }}
                />
              </div>
              <p className="text-xs text-gray-500 mt-2">
                Goal: {dailyTarget.toLocaleString()} words
              </p>
            </div>

            {/* Streak */}
            <div className="bg-gradient-to-r from-orange-500 to-yellow-500 rounded-2xl p-5 shadow-lg">
              <div className="flex items-center justify-center gap-3 mb-1">
                <Flame className="w-8 h-8 text-white drop-shadow-lg" />
                <span className="text-5xl font-black text-white drop-shadow-lg">
                  {streak}
                </span>
              </div>
              <p className="text-white font-bold text-lg drop-shadow">
                day streak
              </p>
            </div>
          </div>

          {/* CTA Buttons */}
          <div className="flex items-center gap-3">
            <button
              onClick={onKeepPlaying}
              className="flex-1 py-4 px-8 bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white text-lg font-bold rounded-xl shadow-2xl hover:shadow-orange-500/50 transition-all transform hover:scale-105 active:scale-95"
            >
              Keep playing
            </button>
            <button
              onClick={async () => {
                const shareData = {
                  title: "I hit my daily goal on Trivia Lingua!",
                  text: `I hit my daily goal of ${dailyTarget.toLocaleString()} words on Trivia Lingua! My current streak is ${streak} ${streak === 1 ? 'day' : 'days'}. Join me at www.trivialingua.com for fun, daily Spanish quizzes!`,
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
              className="py-4 px-6 bg-white hover:bg-gray-50 text-orange-600 rounded-xl shadow-lg border-2 border-orange-200 transition-all transform hover:scale-105 active:scale-95"
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
