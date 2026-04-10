import { useProgressQuery } from "@/react-app/hooks/useProgressQuery";
import { useProgressData } from "@/react-app/hooks/useProgressData";
import { Loader2, BookOpen, Flame, Trophy, Target, ChevronLeft, ChevronRight, Plus, X, Heart } from "lucide-react";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import LevelCard from "@/react-app/components/LevelCard";
import { useAuth } from "@/react-app/contexts/AuthContext";
import { getGuestProgress } from "@/react-app/lib/guestProgress";
export default function ProgressPage() {
  const queryClient = useQueryClient();
  const {
    user,
    redirectToLogin
  } = useAuth();
  const {
    progress,
    loading: progressLoading
  } = useProgressQuery();
  const [currentDate, setCurrentDate] = useState(new Date());
  const year = currentDate.getFullYear().toString();
  const month = String(currentDate.getMonth() + 1).padStart(2, '0');
  const {
    data: progressData,
    loading: dataLoading
  } = useProgressData(year, month);

  // Guest progress
  const guestProgress = !user ? getGuestProgress() : null;
  const dailyActivity = progressData?.dailyActivity || [];
  const dailyTarget = progressData?.dailyTarget || 1000;
  const currentStreak = progressData?.currentStreak || 0;
  const lastActivityDate = progressData?.lastActivityDate || null;

  // For guests, create a single-day activity from their session data
  const guestDailyActivity = guestProgress ? [{
    date: new Date().toISOString().split('T')[0],
    total_words: guestProgress.wordsRead
  }] : [];
  const effectiveDailyActivity = user ? dailyActivity : guestDailyActivity;
  const effectiveDailyTarget = user ? dailyTarget : guestProgress?.dailyTarget || 1000;
  const effectiveCurrentStreak = user ? currentStreak : 0;
  const effectiveLastActivityDate = user ? lastActivityDate : null;

  // External reading modal state
  const [showExternalModal, setShowExternalModal] = useState(false);
  const [externalWords, setExternalWords] = useState("");
  const [externalSourceType, setExternalSourceType] = useState("Book");
  const [externalDetails, setExternalDetails] = useState("");
  const [externalDate, setExternalDate] = useState(new Date().toISOString().split('T')[0]);
  const [submittingExternal, setSubmittingExternal] = useState(false);
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);
  const [successWords, setSuccessWords] = useState(0);
  const sourceTypeOptions = ["Book", "Website/Article", "Comic/Manga", "Subtitles (Netflix, YouTube, etc.)", "Social Media (X, Reddit, etc.)", "Other"];
  const handleSubmitExternal = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmittingExternal(true);
    try {
      const words = parseInt(externalWords);
      const response = await fetch("/api/external-reading", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          words_read: words,
          source_type: externalSourceType,
          details: externalDetails || undefined,
          reading_date: externalDate
        })
      });
      if (response.ok) {
        setSuccessWords(words);
        setShowSuccessMessage(true);
        setShowExternalModal(false);
        setExternalWords("");
        setExternalSourceType("Book");
        setExternalDetails("");
        setExternalDate(new Date().toISOString().split('T')[0]);

        // Invalidate queries to refetch data
        queryClient.invalidateQueries({
          queryKey: ["progress"]
        });
        queryClient.invalidateQueries({
          queryKey: ["progress-data", year, month]
        });

        // Hide success message after 4 seconds
        setTimeout(() => setShowSuccessMessage(false), 4000);
      }
    } catch (error) {
      console.error("Error logging external reading:", error);
    } finally {
      setSubmittingExternal(false);
    }
  };
  if (progressLoading && user) {
    return <div className="flex items-center justify-center min-h-[calc(100vh-8rem)]">
        <div className="animate-spin">
          <Loader2 className="w-10 h-10 text-orange-500" />
        </div>
      </div>;
  }

  // Use guest data if not logged in, otherwise use member data
  const totalWords = user ? progress?.total_words_read || 0 : guestProgress?.wordsRead || 0;
  const quizWords = user ? progress?.quiz_words || 0 : guestProgress?.wordsRead || 0;
  const externalWordsToday = user ? progress?.external_words || 0 : 0;
  const totalQuizzesCompleted = user ? progress?.total_quizzes_completed || 0 : guestProgress?.quizzesCompleted || 0;
  const currentStreakValue = user ? progress?.current_streak || 0 : 0;
  const longestStreakValue = user ? progress?.longest_streak || 0 : 0;

  // Calendar logic
  const calendarYear = currentDate.getFullYear();
  const calendarMonth = currentDate.getMonth();
  const firstDay = new Date(calendarYear, calendarMonth, 1);
  const lastDay = new Date(calendarYear, calendarMonth + 1, 0);
  const daysInMonth = lastDay.getDate();
  const startingDayOfWeek = firstDay.getDay(); // 0 = Sunday

  const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  const goToPreviousMonth = () => {
    setCurrentDate(new Date(calendarYear, calendarMonth - 1, 1));
  };
  const goToNextMonth = () => {
    const today = new Date();
    if (calendarYear < today.getFullYear() || calendarYear === today.getFullYear() && calendarMonth < today.getMonth()) {
      setCurrentDate(new Date(calendarYear, calendarMonth + 1, 1));
    }
  };
  const canGoNext = () => {
    const today = new Date();
    return calendarYear < today.getFullYear() || calendarYear === today.getFullYear() && calendarMonth < today.getMonth();
  };
  const getColorForWords = (words: number) => {
    if (words === 0) return "bg-gray-50";
    if (words >= effectiveDailyTarget) return "bg-orange-500";
    return "bg-orange-200";
  };
  const getWordsForDate = (date: string) => {
    const activity = effectiveDailyActivity.find(d => d.date === date);
    return activity?.total_words || 0;
  };
  const isInCurrentStreak = (dateStr: string) => {
    if (!effectiveLastActivityDate || effectiveCurrentStreak === 0) return false;
    const date = new Date(dateStr);
    const lastDate = new Date(effectiveLastActivityDate);
    const streakStart = new Date(lastDate);
    streakStart.setDate(streakStart.getDate() - effectiveCurrentStreak + 1);
    return date >= streakStart && date <= lastDate;
  };
  const formatWordCount = (words: number): string => {
    if (words === 0) return "";
    if (words >= 1000000) return `${(words / 1000000).toFixed(1)}m`;
    return `${(words / 1000).toFixed(1)}k`;
  };
  return <div className="max-w-7xl mx-auto px-4 py-6 md:py-8">
      <div className="flex items-center justify-between mb-6 md:mb-8">
        <h1 className="text-2xl md:text-3xl font-bold text-gray-800">Your Progress</h1>
        {user && <button onClick={() => setShowExternalModal(true)} className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white font-semibold rounded-xl shadow-lg transition-all">
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">Log External Reading</span>
            <span className="sm:hidden">Log Reading</span>
          </button>}
      </div>

      {/* Guest sign-in banner */}
      {!user && <div className="mb-6 bg-gradient-to-r from-orange-500 to-red-500 rounded-2xl shadow-xl p-6 text-white">
          <h2 className="text-xl md:text-2xl font-bold mb-2">Don't lose your progress!</h2>
          <p className="text-white/90 mb-4">Your progress will be lost when you close your browser. Create a free account to track your language journey!</p>
          <button onClick={() => redirectToLogin()} className="bg-white text-orange-600 px-6 py-3 rounded-xl font-bold hover:bg-gray-50 transition-colors">
            Sign in to save progress
          </button>
        </div>}

      {/* Success Message */}
      {showSuccessMessage && <div className="mb-6 p-4 bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-200 rounded-xl flex items-center justify-center gap-2 animate-pulse">
          <Heart className="w-5 h-5 text-red-500 fill-red-500" />
          <p className="text-green-700 font-semibold">
            Great! +{successWords.toLocaleString()} words added
          </p>
          <Heart className="w-5 h-5 text-red-500 fill-red-500" />
        </div>}

      {/* Level Card */}
      <div className="mb-6">
        <LevelCard totalWordsRead={totalWords} />
      </div>

      {/* Words Breakdown */}
      <div className="bg-white/80 backdrop-blur-lg rounded-2xl shadow-xl p-4 md:p-6 mb-6 border border-orange-100">
        <h2 className="text-lg font-bold text-gray-800 mb-4">Today's Reading</h2>
        <div className="grid grid-cols-3 gap-3 md:gap-4">
          <div className="text-center p-3 md:p-4 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl">
            <p className="text-xs md:text-sm text-gray-600 mb-1">Quizzes</p>
            <p className="text-xl md:text-2xl font-bold text-blue-600">{quizWords}</p>
          </div>
          <div className="text-center p-3 md:p-4 bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl">
            <p className="text-xs md:text-sm text-gray-600 mb-1">External</p>
            <p className="text-xl md:text-2xl font-bold text-purple-600">{externalWordsToday}</p>
          </div>
          <div className="text-center p-3 md:p-4 bg-gradient-to-br from-orange-50 to-amber-50 rounded-xl">
            <p className="text-xs md:text-sm text-gray-600 mb-1">Total</p>
            <p className="text-xl md:text-2xl font-bold text-orange-600">
              {quizWords + externalWordsToday}
            </p>
          </div>
        </div>
      </div>

      {/* Stats Grid + Calendar Layout */}
      <div className="grid md:grid-cols-2 gap-6 mb-6 md:mb-8">
        {/* Left Column: Stats Grid (2×2) */}
        <div className="grid grid-cols-2 gap-3 md:gap-4 h-fit">
          {/* Total Words */}
          <div className="bg-white/80 backdrop-blur-lg rounded-2xl md:rounded-3xl shadow-xl p-4 md:p-6 border border-orange-100">
            <div className="p-2 md:p-3 bg-orange-100 rounded-xl w-fit mb-3">
              <BookOpen className="w-5 h-5 md:w-6 md:h-6 text-orange-600" />
            </div>
            <p className="text-xs md:text-sm text-gray-600 mb-1 truncate">Total Words</p>
            <p className="text-xl md:text-2xl lg:text-3xl font-bold text-gray-800 break-words">
              {totalWords.toLocaleString()}
            </p>
          </div>

          {/* Current Streak */}
          <div className="bg-white/80 backdrop-blur-lg rounded-2xl md:rounded-3xl shadow-xl p-4 md:p-6 border border-orange-100">
            <div className="p-2 md:p-3 bg-red-100 rounded-xl w-fit mb-3">
              <Flame className="w-5 h-5 md:w-6 md:h-6 text-red-600" />
            </div>
            <p className="text-xs md:text-sm text-gray-600 mb-1 truncate">Current Streak</p>
            <p className="text-xl md:text-2xl lg:text-3xl font-bold text-gray-800 break-words">
              {currentStreakValue}
              <span className="text-sm md:text-base ml-1">
                {currentStreakValue === 1 ? "day" : "days"}
              </span>
            </p>
          </div>

          {/* Quizzes Completed */}
          <div className="bg-white/80 backdrop-blur-lg rounded-2xl md:rounded-3xl shadow-xl p-4 md:p-6 border border-orange-100">
            <div className="p-2 md:p-3 bg-amber-100 rounded-xl w-fit mb-3">
              <Trophy className="w-5 h-5 md:w-6 md:h-6 text-amber-600" />
            </div>
            <p className="text-xs md:text-sm text-gray-600 mb-1 truncate">Quizzes</p>
            <p className="text-xl md:text-2xl lg:text-3xl font-bold text-gray-800 break-words">
              {totalQuizzesCompleted}
            </p>
          </div>

          {/* Best Streak */}
          <div className="bg-white/80 backdrop-blur-lg rounded-2xl md:rounded-3xl shadow-xl p-4 md:p-6 border border-orange-100">
            <div className="p-2 md:p-3 bg-green-100 rounded-xl w-fit mb-3">
              <Target className="w-5 h-5 md:w-6 md:h-6 text-green-600" />
            </div>
            <p className="text-xs md:text-sm text-gray-600 mb-1 truncate">Best Streak</p>
            <p className="text-xl md:text-2xl lg:text-3xl font-bold text-gray-800 break-words">
              {longestStreakValue}
              <span className="text-sm md:text-base ml-1">
                {longestStreakValue === 1 ? "day" : "days"}
              </span>
            </p>
          </div>
        </div>

        {/* Right Column: Activity Calendar */}
        <div className="bg-white/80 backdrop-blur-lg rounded-2xl md:rounded-3xl shadow-xl p-4 md:p-6 border border-orange-100 flex flex-col md:h-full">
          <div className="flex items-center justify-center gap-2 mb-3">
            <button onClick={goToPreviousMonth} className="p-1.5 hover:bg-orange-100 rounded-lg transition-colors">
              <ChevronLeft className="w-4 h-4 md:w-5 md:h-5 text-gray-600" />
            </button>
            <span className="text-sm md:text-base font-semibold text-gray-700 min-w-[110px] md:min-w-[130px] text-center">
              {monthNames[calendarMonth]} {calendarYear}
            </span>
            <button onClick={goToNextMonth} disabled={!canGoNext()} className={`p-1.5 rounded-lg transition-colors ${canGoNext() ? "hover:bg-orange-100" : "opacity-30 cursor-not-allowed"}`}>
              <ChevronRight className="w-4 h-4 md:w-5 md:h-5 text-gray-600" />
            </button>
          </div>

          {/* Calendar Grid */}
          <div className="flex-1 flex flex-col justify-center relative">
            {/* Loading overlay for calendar data */}
            {dataLoading && <div className="absolute inset-0 bg-white/60 backdrop-blur-sm rounded-xl flex items-center justify-center z-10">
                <Loader2 className="w-6 h-6 text-orange-500 animate-spin" />
              </div>}
            
            {/* Day headers */}
            <div className="grid grid-cols-7 gap-0.5 md:gap-1 mb-1">
              {["S", "M", "T", "W", "T", "F", "S"].map((day, idx) => <div key={idx} className="text-center text-[10px] md:text-xs font-semibold text-gray-500 py-1">
                  {day}
                </div>)}
            </div>

            {/* Calendar days */}
            <div className="grid grid-cols-7 gap-0.5 md:gap-1 select-none">
              {/* Empty cells for days before month starts */}
              {Array.from({
              length: startingDayOfWeek
            }).map((_, i) => <div key={`empty-${i}`} className="aspect-square" />)}

              {/* Actual days */}
              {Array.from({
              length: daysInMonth
            }).map((_, i) => {
              const day = i + 1;
              const dateStr = `${calendarYear}-${String(calendarMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
              const words = getWordsForDate(dateStr);
              const inStreak = isInCurrentStreak(dateStr);
              const color = getColorForWords(words);
              const hitTarget = words >= effectiveDailyTarget;
              const formattedWords = formatWordCount(words);
              return <div key={day} className={`aspect-square rounded-md ${color} flex flex-col items-center justify-center ${inStreak ? "ring-1 md:ring-2 ring-orange-500 ring-offset-1" : ""} ${hitTarget && words > 0 ? "shadow-md" : ""}`}>
                    <span className={`text-sm md:text-base font-bold leading-none mb-0.5 ${words >= effectiveDailyTarget ? "text-white" : "text-gray-700"}`}>
                      {day}
                    </span>
                    {formattedWords && <span className={`text-[9px] md:text-[10px] font-semibold leading-none ${words >= effectiveDailyTarget ? "text-white/90" : "text-gray-600"}`}>
                      {formattedWords}
                    </span>}
                  </div>;
            })}
            </div>
          </div>
        </div>
      </div>

      {/* External Reading Modal */}
      {showExternalModal && <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto overflow-x-hidden">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-gray-800">Log External Reading</h3>
              <button onClick={() => setShowExternalModal(false)} className="p-1 hover:bg-gray-100 rounded-lg transition-colors">
                <X className="w-5 h-5 text-gray-600" />
              </button>
            </div>

            <form onSubmit={handleSubmitExternal} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Words read *
                </label>
                <input type="number" value={externalWords} onChange={e => setExternalWords(e.target.value)} min="1" required className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-orange-500 focus:outline-none text-lg" placeholder="e.g., 1500" autoFocus />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Source *</label>
                <select value={externalSourceType} onChange={e => setExternalSourceType(e.target.value)} required className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-orange-500 focus:outline-none">
                  {sourceTypeOptions.map(option => <option key={option} value={option}>
                      {option}
                    </option>)}
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Details (optional)
                </label>
                <input type="text" value={externalDetails} onChange={e => setExternalDetails(e.target.value)} className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-orange-500 focus:outline-none" placeholder="e.g. title, show name, article topic" />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Date
                </label>
                <input type="date" value={externalDate} onChange={e => setExternalDate(e.target.value)} max={new Date().toISOString().split('T')[0]} className="w-full max-w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-orange-500 focus:outline-none overflow-hidden" />
              </div>

              <button type="submit" disabled={submittingExternal} className="w-full px-4 py-3 bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 disabled:from-gray-400 disabled:to-gray-400 text-white font-semibold rounded-xl shadow-lg transition-all flex items-center justify-center gap-2">
                {submittingExternal ? <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Saving...
                  </> : "Submit"}
              </button>
            </form>
          </div>
        </div>}
    </div>;
}