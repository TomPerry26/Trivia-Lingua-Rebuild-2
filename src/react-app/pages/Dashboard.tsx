import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import { BookOpen, Users, Activity, Target, Mail } from "lucide-react";

interface DashboardStats {
  totalQuizzes: number;
  totalWords: number;
  totalUsers: number;
  totalAttempts: number;
  totalTopics: number;
  difficultyBreakdown: Array<{ difficulty: string; count: number }>;
  popularQuizzes: Array<{
    id: number;
    title: string;
    difficulty: string;
    completions: number;
  }>;
  recentActivity: Array<{ date: string; signups: number; attempts: number; words: number; unique_users: number; unique_guests: number }>;
  weeklyTotals: {
    signups: number;
    unique_users: number;
    unique_guests: number;
    attempts: number;
    words: number;
  };
  streakStats: {
    averageStreak: number;
    medianStreak: number;
    longestStreaks: number[];
    usersWithWeekStreak: number;
    percentWithWeekStreak: number;
  };
  userStats: {
    totalRegistered: number;
    signupsToday: number;
    signupsWeek: number;
    pwaInstalls: number;
    newsletterSubscribers: number;
  };
  readingStats: {
    totalWordsRead: number;
    wordsReadToday: number;
    wordsReadWeek: number;
    avgWordsPerUserDaily: number;
    avgWordsPerUserWeekly: number;
  };
}

export default function Dashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [timeframe, setTimeframe] = useState<string>("all");
  const [difficultyFilter, setDifficultyFilter] = useState<string>("all");

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        const response = await fetch(
          `/api/admin/dashboard?timeframe=${timeframe}&difficulty=${difficultyFilter}`
        );
        
        if (response.status === 403 || response.status === 401) {
          // Not authorized - redirect to home
          navigate("/");
          return;
        }
        
        if (response.ok) {
          const data = await response.json();
          setStats(data);
        }
      } catch (error) {
        console.error("Failed to fetch dashboard stats:", error);
        navigate("/");
      } finally {
        setLoading(false);
      }
    };

    fetchDashboard();
  }, [navigate, timeframe, difficultyFilter]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-amber-50 to-orange-100">
        <div className="text-center">
          <div className="animate-spin mb-4">
            <Activity className="w-10 h-10 text-orange-500 mx-auto" />
          </div>
          <p className="text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="p-6">
        <p className="text-gray-600">Failed to load dashboard data</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-red-50 p-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-4">
          <h1 className="text-3xl font-bold text-gray-800">Admin Dashboard</h1>
        </div>

        {/* Row 1: Total Registered Users, Quiz Attempts, Total Words Read */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
          {/* Total Registered Users */}
          <div className="bg-white/80 backdrop-blur-lg rounded-2xl shadow-xl p-4 border border-orange-100">
            <div className="flex items-center justify-between mb-2">
              <div className="p-2 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-xl">
                <Users className="w-5 h-5 text-white" />
              </div>
              <span className="text-2xl font-bold text-gray-800">{stats.userStats.totalRegistered}</span>
            </div>
            <h3 className="text-sm font-semibold text-gray-600">Total Registered Users</h3>
          </div>

          {/* Quiz Attempts */}
          <div className="bg-white/80 backdrop-blur-lg rounded-2xl shadow-xl p-4 border border-orange-100">
            <div className="flex items-center justify-between mb-2">
              <div className="p-2 bg-gradient-to-br from-pink-500 to-rose-500 rounded-xl">
                <Activity className="w-5 h-5 text-white" />
              </div>
              <span className="text-2xl font-bold text-gray-800">{stats.totalAttempts}</span>
            </div>
            <h3 className="text-sm font-semibold text-gray-600">Quiz Attempts</h3>
          </div>

          {/* Total Words Read */}
          <div className="bg-white/80 backdrop-blur-lg rounded-2xl shadow-xl p-4 border border-orange-100">
            <div className="flex items-center justify-between mb-2">
              <div className="p-2 bg-gradient-to-br from-violet-500 to-purple-500 rounded-xl">
                <BookOpen className="w-5 h-5 text-white" />
              </div>
              <span className="text-2xl font-bold text-gray-800">{stats.readingStats.totalWordsRead.toLocaleString()}</span>
            </div>
            <h3 className="text-sm font-semibold text-gray-600">Total Words Read</h3>
          </div>
        </div>

        {/* Row 2: Total Quizzes, Total Words, PWA Installs, Newsletter Subscribers */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
          {/* Total Quizzes */}
          <div className="bg-white/80 backdrop-blur-lg rounded-2xl shadow-xl p-4 border border-orange-100">
            <div className="flex items-center justify-between mb-2">
              <div className="p-2 bg-gradient-to-br from-orange-500 to-red-500 rounded-xl">
                <BookOpen className="w-5 h-5 text-white" />
              </div>
              <span className="text-2xl font-bold text-gray-800">{stats.totalQuizzes}</span>
            </div>
            <h3 className="text-sm font-semibold text-gray-600">Total Quizzes</h3>
          </div>

          {/* Total Words */}
          <div className="bg-white/80 backdrop-blur-lg rounded-2xl shadow-xl p-4 border border-orange-100">
            <div className="flex items-center justify-between mb-2">
              <div className="p-2 bg-gradient-to-br from-blue-500 to-purple-500 rounded-xl">
                <Target className="w-5 h-5 text-white" />
              </div>
              <span className="text-2xl font-bold text-gray-800">{stats.totalWords.toLocaleString()}</span>
            </div>
            <h3 className="text-sm font-semibold text-gray-600">Total Words</h3>
          </div>

          {/* PWA Installs */}
          <div className="bg-white/80 backdrop-blur-lg rounded-2xl shadow-xl p-4 border border-orange-100">
            <div className="flex items-center justify-between mb-2">
              <div className="p-2 bg-gradient-to-br from-violet-500 to-purple-500 rounded-xl">
                <Activity className="w-5 h-5 text-white" />
              </div>
              <span className="text-2xl font-bold text-gray-800">{stats.userStats.pwaInstalls}</span>
            </div>
            <h3 className="text-sm font-semibold text-gray-600">PWA Installs</h3>
          </div>

          {/* Newsletter Subscribers */}
          <div className="bg-white/80 backdrop-blur-lg rounded-2xl shadow-xl p-4 border border-orange-100">
            <div className="flex items-center justify-between mb-2">
              <div className="p-2 bg-gradient-to-br from-pink-500 to-rose-500 rounded-xl">
                <Mail className="w-5 h-5 text-white" />
              </div>
              <span className="text-2xl font-bold text-gray-800">{stats.userStats.newsletterSubscribers}</span>
            </div>
            <h3 className="text-sm font-semibold text-gray-600">Newsletter Subscribers</h3>
          </div>
        </div>

        {/* Two Column Layout for Details */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
          {/* Difficulty Breakdown */}
          <div className="bg-white/80 backdrop-blur-lg rounded-2xl shadow-xl p-4 border border-orange-100">
            <h2 className="text-lg font-bold text-gray-800 mb-3">Quizzes by Difficulty</h2>
            <div className="space-y-2">
              {stats.difficultyBreakdown.map((item) => (
                <div key={item.difficulty}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-semibold text-gray-700 capitalize">
                      {item.difficulty}
                    </span>
                    <span className="text-sm font-bold text-gray-800">{item.count}</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className={`h-full rounded-full ${
                        item.difficulty === "beginner"
                          ? "bg-gradient-to-r from-green-400 to-green-600"
                          : item.difficulty === "intermediate"
                          ? "bg-gradient-to-r from-orange-400 to-orange-600"
                          : "bg-gradient-to-r from-red-400 to-red-600"
                      }`}
                      style={{
                        width: `${(item.count / stats.totalQuizzes) * 100}%`,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Recent Activity */}
          <div className="bg-white/80 backdrop-blur-lg rounded-2xl shadow-xl p-4 border border-orange-100">
            <h2 className="text-lg font-bold text-gray-800 mb-3">Recent Activity (Last 7 Days)</h2>
            {stats.recentActivity.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b-2 border-gray-200">
                      <th className="text-left py-2 text-gray-600 font-semibold">Date</th>
                      <th className="text-right py-2 text-gray-600 font-semibold">Sign-ups</th>
                      <th className="text-right py-2 text-gray-600 font-semibold">Users</th>
                      <th className="text-right py-2 text-gray-600 font-semibold">Guests</th>
                      <th className="text-right py-2 text-gray-600 font-semibold">Attempts</th>
                      <th className="text-right py-2 text-orange-600 font-semibold">Words</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stats.recentActivity.map((day) => (
                      <tr key={day.date} className="border-b border-gray-100 last:border-0">
                        <td className="py-2 text-gray-600">
                          {new Date(day.date).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                          })}
                        </td>
                        <td className="text-right py-2 text-gray-700 font-semibold">{day.signups}</td>
                        <td className="text-right py-2 text-gray-700 font-semibold">{day.unique_users}</td>
                        <td className="text-right py-2 text-gray-700 font-semibold">{day.unique_guests}</td>
                        <td className="text-right py-2 text-gray-700 font-semibold">{day.attempts}</td>
                        <td className="text-right py-2 text-orange-600 font-semibold">
                          {day.words.toLocaleString()}
                        </td>
                      </tr>
                    ))}
                    {/* Weekly Totals */}
                    <tr className="border-t-2 border-orange-200">
                      <td className="py-2 pt-3 text-gray-800 font-bold">Weekly Total</td>
                      <td className="text-right py-2 pt-3 text-gray-800 font-bold">{stats.weeklyTotals.signups}</td>
                      <td className="text-right py-2 pt-3 text-gray-800 font-bold">{stats.weeklyTotals.unique_users}</td>
                      <td className="text-right py-2 pt-3 text-gray-800 font-bold">{stats.weeklyTotals.unique_guests}</td>
                      <td className="text-right py-2 pt-3 text-gray-800 font-bold">{stats.weeklyTotals.attempts}</td>
                      <td className="text-right py-2 pt-3 text-orange-700 font-bold">
                        {stats.weeklyTotals.words.toLocaleString()}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-gray-500 text-sm">No activity in the last 7 days</p>
            )}
          </div>
        </div>

        {/* Most Popular Quizzes */}
        <div className="bg-white/80 backdrop-blur-lg rounded-2xl shadow-xl p-4 border border-orange-100">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4">
            <h2 className="text-lg font-bold text-gray-800">Most Popular Quizzes</h2>
            <div className="flex gap-2 w-full sm:w-auto">
              <select
                value={timeframe}
                onChange={(e) => setTimeframe(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 text-sm font-semibold text-gray-700 bg-white"
              >
                <option value="all">All Time</option>
                <option value="today">Today</option>
                <option value="week">This Week</option>
                <option value="month">This Month</option>
              </select>
              <select
                value={difficultyFilter}
                onChange={(e) => setDifficultyFilter(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 text-sm font-semibold text-gray-700 bg-white"
              >
                <option value="all">All Levels</option>
                <option value="superbeginner">Superbeginner</option>
                <option value="beginner">Beginner</option>
                <option value="intermediate">Intermediate</option>
                <option value="advanced">Advanced</option>
              </select>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-2 px-3 text-sm font-semibold text-gray-600">Rank</th>
                  <th className="text-left py-2 px-3 text-sm font-semibold text-gray-600">Quiz Title</th>
                  <th className="text-left py-2 px-3 text-sm font-semibold text-gray-600">Difficulty</th>
                  <th className="text-right py-2 px-3 text-sm font-semibold text-gray-600">Completions</th>
                </tr>
              </thead>
              <tbody>
                {stats.popularQuizzes.map((quiz, index) => (
                  <tr
                    key={quiz.id}
                    className="border-b border-gray-100 hover:bg-orange-50 transition-colors"
                  >
                    <td className="py-2 px-3">
                      <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-gradient-to-r from-orange-500 to-red-500 text-white font-bold text-xs">
                        {index + 1}
                      </span>
                    </td>
                    <td className="py-2 px-3 text-sm font-medium text-gray-800">{quiz.title}</td>
                    <td className="py-2 px-3">
                      <span
                        className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold ${
                          quiz.difficulty === "beginner"
                            ? "bg-green-100 text-green-700"
                            : quiz.difficulty === "intermediate"
                            ? "bg-orange-100 text-orange-700"
                            : "bg-red-100 text-red-700"
                        }`}
                      >
                        {quiz.difficulty}
                      </span>
                    </td>
                    <td className="py-2 px-3 text-right text-sm font-bold text-gray-800">
                      {quiz.completions}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
