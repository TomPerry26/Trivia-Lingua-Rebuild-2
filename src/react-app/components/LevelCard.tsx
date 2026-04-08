import { TrendingUp } from "lucide-react";

interface LevelCardProps {
  totalWordsRead: number;
}

const LEVEL_THRESHOLDS = [
  { level: 1, threshold: 1000, name: "First Steps" },
  { level: 2, threshold: 5000, name: "Building Momentum" },
  { level: 3, threshold: 10000, name: "Word Explorer" },
  { level: 4, threshold: 25000, name: "Dedicated Reader" },
  { level: 5, threshold: 50000, name: "Input Enthusiast" },
  { level: 6, threshold: 100000, name: "Hundred Thousand Club" },
  { level: 7, threshold: 250000, name: "Quarter Million Milestone" },
  { level: 8, threshold: 500000, name: "Half Million Reader" },
  { level: 9, threshold: 1000000, name: "Million Word Milestone" },
];

function getCurrentLevel(wordsRead: number) {
  for (let i = LEVEL_THRESHOLDS.length - 1; i >= 0; i--) {
    if (wordsRead >= LEVEL_THRESHOLDS[i].threshold) {
      return {
        current: LEVEL_THRESHOLDS[i],
        next: LEVEL_THRESHOLDS[i + 1] || null,
      };
    }
  }
  
  return {
    current: null,
    next: LEVEL_THRESHOLDS[0],
  };
}

export default function LevelCard({ totalWordsRead }: LevelCardProps) {
  const { current, next } = getCurrentLevel(totalWordsRead);
  
  const progress = next
    ? ((totalWordsRead - (current?.threshold || 0)) / (next.threshold - (current?.threshold || 0))) * 100
    : 100;

  return (
    <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-lg border border-amber-100/50 p-6">
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2 bg-gradient-to-br from-amber-500 to-orange-500 rounded-xl">
          <TrendingUp className="w-5 h-5 text-white" />
        </div>
        <h2 className="text-xl font-bold text-gray-900">Reading Level</h2>
      </div>

      {current ? (
        <>
          <div className="mb-4">
            <div className="flex items-baseline gap-2 mb-1">
              <span className="text-4xl font-bold bg-gradient-to-r from-amber-600 to-orange-600 bg-clip-text text-transparent">
                Level {current.level}
              </span>
            </div>
            <p className="text-lg text-gray-700 font-medium">{current.name}</p>
          </div>

          {next && (
            <>
              <div className="mb-2">
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-600">
                    {totalWordsRead.toLocaleString()} words
                  </span>
                  <span className="text-gray-600">
                    Next: {next.threshold.toLocaleString()}
                  </span>
                </div>
                <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-amber-500 to-orange-500 rounded-full transition-all duration-500"
                    style={{ width: `${Math.min(progress, 100)}%` }}
                  />
                </div>
              </div>
              <p className="text-sm text-gray-600 mt-2">
                {(next.threshold - totalWordsRead).toLocaleString()} words until Level {next.level}
              </p>
            </>
          )}
        </>
      ) : (
        <>
          <div className="mb-4">
            <div className="flex items-baseline gap-2 mb-1">
              <span className="text-4xl font-bold text-gray-400">Level 0</span>
            </div>
            <p className="text-lg text-gray-500 font-medium">Getting Started</p>
          </div>

          <div className="mb-2">
            <div className="flex justify-between text-sm mb-1">
              <span className="text-gray-600">
                {totalWordsRead.toLocaleString()} words
              </span>
              <span className="text-gray-600">
                Next: {next.threshold.toLocaleString()}
              </span>
            </div>
            <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-amber-500 to-orange-500 rounded-full transition-all duration-500"
                style={{ width: `${Math.min(progress, 100)}%` }}
              />
            </div>
          </div>
          <p className="text-sm text-gray-600 mt-2">
            {(next.threshold - totalWordsRead).toLocaleString()} words until Level {next.level}
          </p>
        </>
      )}
    </div>
  );
}
