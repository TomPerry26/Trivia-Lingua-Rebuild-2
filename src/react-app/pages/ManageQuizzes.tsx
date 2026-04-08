import { useState, useEffect, useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { ArrowLeft, Edit, Loader2, Trash2, ChevronLeft, ChevronRight } from "lucide-react";
import type { Quiz } from "@/shared/types";

export default function ManageQuizzesPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  
  // Initialize state from URL params
  const [searchTerm, setSearchTerm] = useState(searchParams.get("search") || "");
  const [filterDifficulty, setFilterDifficulty] = useState<string>(searchParams.get("difficulty") || "All");
  const [filterTopic, setFilterTopic] = useState<string>(searchParams.get("topic") || "All");
  const [filterStatus, setFilterStatus] = useState<string>(searchParams.get("status") || "All");
  const [sortBy, setSortBy] = useState<string>(searchParams.get("sort") || "New");
  const [currentPage, setCurrentPage] = useState(parseInt(searchParams.get("page") || "1"));
  const [isInitialMount, setIsInitialMount] = useState(true);
  const itemsPerPage = 20;

useEffect(() => {
    setIsInitialMount(false);
  }, []);

  useEffect(() => {
    const fetchQuizzes = async () => {
      try {
        const response = await fetch("/api/admin/quizzes/all");
        if (response.ok) {
          const data = await response.json();
          setQuizzes(data);
        }
      } catch (error) {
        console.error("Failed to fetch quizzes:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchQuizzes();
  }, []);

  // Update URL params when filters change
  useEffect(() => {
    const params = new URLSearchParams();
    if (searchTerm) params.set("search", searchTerm);
    if (filterDifficulty !== "All") params.set("difficulty", filterDifficulty);
    if (filterTopic !== "All") params.set("topic", filterTopic);
    if (filterStatus !== "All") params.set("status", filterStatus);
    if (sortBy !== "New") params.set("sort", sortBy);
    if (currentPage !== 1) params.set("page", currentPage.toString());
    
    setSearchParams(params, { replace: true });
  }, [searchTerm, filterDifficulty, filterTopic, filterStatus, sortBy, currentPage, setSearchParams]);

  // Restore scroll position on mount
  useEffect(() => {
    const savedScrollPosition = sessionStorage.getItem("manageQuizzesScrollPosition");
    if (savedScrollPosition) {
      setTimeout(() => {
        window.scrollTo(0, parseInt(savedScrollPosition));
        sessionStorage.removeItem("manageQuizzesScrollPosition");
      }, 100);
    }
  }, []);

  

  // Extract all unique topics from quizzes
  const allTopics = useMemo(() => {
    const topicSet = new Set<string>();
    quizzes.forEach(quiz => {
      if (quiz.topics && Array.isArray(quiz.topics)) {
        quiz.topics.forEach((topic: string) => {
          if (topic) topicSet.add(topic);
        });
      }
    });
    return Array.from(topicSet).sort((a, b) => a.localeCompare(b));
  }, [quizzes]);

  const filteredQuizzes = quizzes.filter((quiz) => {
    const matchesSearch = quiz.title.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesDifficulty = filterDifficulty === "All" || quiz.difficulty === filterDifficulty;
    const matchesTopic = filterTopic === "All" || (
      quiz.topics && Array.isArray(quiz.topics) && quiz.topics.includes(filterTopic)
    );
    const matchesStatus = filterStatus === "All" || 
      (filterStatus === "Published" && quiz.status === "published") ||
      (filterStatus === "Draft" && quiz.status === "draft");
    return matchesSearch && matchesDifficulty && matchesTopic && matchesStatus;
  });

  // Apply sorting
  const sortedQuizzes = [...filteredQuizzes].sort((a, b) => {
    switch (sortBy) {
      case "New":
        return b.id - a.id; // Newest first (higher ID = newer)
      case "Old":
        return a.id - b.id; // Oldest first (lower ID = older)
      case "A-Z":
        return a.title.localeCompare(b.title);
      case "Z-A":
        return b.title.localeCompare(a.title);
      default:
        return 0;
    }
  });

  // Reset to page 1 when filters or sort change (but not on initial mount)
  useEffect(() => {
    if (!isInitialMount) {
      setCurrentPage(1);
    }
  }, [searchTerm, filterDifficulty, filterTopic, filterStatus, sortBy]);

  

  // Pagination calculations
  const totalPages = Math.ceil(sortedQuizzes.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedQuizzes = sortedQuizzes.slice(startIndex, endIndex);

const goToPage = (page: number) => {
    setCurrentPage(Math.max(1, Math.min(page, totalPages)));
  };

  const handleEditClick = (e: React.MouseEvent, quizId: number) => {
    // If Ctrl or Cmd key is pressed, let the browser handle it (opens in new tab)
    if (e.ctrlKey || e.metaKey) {
      return;
    }
    
    // Otherwise prevent default and use navigate
    e.preventDefault();
    sessionStorage.setItem("manageQuizzesScrollPosition", window.scrollY.toString());
    navigate(`/admin/edit/${quizId}`);
  };

  const handleDelete = async (quiz: Quiz) => {
    const confirmMessage = `Are you sure you want to delete "${quiz.title}"?\n\nThis will permanently delete:\n- The quiz\n- All ${quiz.total_word_count} words of content\n- All ${quiz.completions} completion records\n\nThis action cannot be undone.`;
    
    if (!confirm(confirmMessage)) {
      return;
    }

    try {
      const response = await fetch(`/api/admin/quizzes/${quiz.id}`, {
        method: "DELETE",
      });

      if (response.ok) {
        // Remove from local state
        setQuizzes(quizzes.filter(q => q.id !== quiz.id));
        alert("Quiz deleted successfully");
      } else {
        alert("Failed to delete quiz");
      }
    } catch (error) {
      console.error("Failed to delete quiz:", error);
      alert("Failed to delete quiz");
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-red-50 py-8 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <button
            onClick={() => navigate("/admin")}
            className="flex items-center gap-2 text-gray-600 hover:text-orange-600 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            <span>Back to Admin</span>
          </button>
          <h1 className="text-3xl font-bold text-gray-800">Manage Quizzes</h1>
        </div>

        {/* Filters */}
        <div className="bg-white/80 backdrop-blur-lg rounded-3xl shadow-xl p-6 border border-orange-100 mb-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            <div>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search by title..."
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
            </div>
            <div>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500"
              >
                <option value="All">All Quizzes</option>
                <option value="Published">Published</option>
                <option value="Draft">Draft</option>
              </select>
            </div>
            <div>
              <select
                value={filterDifficulty}
                onChange={(e) => setFilterDifficulty(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500"
              >
                <option value="All">All Levels</option>
                <option value="Superbeginner">Superbeginner</option>
                <option value="Beginner">Beginner</option>
                <option value="Intermediate">Intermediate</option>
                <option value="Advanced">Advanced</option>
              </select>
            </div>
            <div>
              <select
                value={filterTopic}
                onChange={(e) => setFilterTopic(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500"
              >
                <option value="All">All Topics</option>
                {allTopics.map(topic => (
                  <option key={topic} value={topic}>{topic}</option>
                ))}
              </select>
            </div>
            <div>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500"
              >
                <option value="New">Newest First</option>
                <option value="Old">Oldest First</option>
                <option value="A-Z">A-Z</option>
                <option value="Z-A">Z-A</option>
              </select>
            </div>
          </div>
        </div>

        {/* Quiz List */}
        <div className="bg-white/80 backdrop-blur-lg rounded-3xl shadow-xl p-6 border border-orange-100">
          {sortedQuizzes.length === 0 ? (
            <p className="text-gray-600 text-center py-8">
              {searchTerm || filterDifficulty !== "All" || filterTopic !== "All" || filterStatus !== "All"
                ? "No quizzes match your filters" 
                : "No quizzes created yet"}
            </p>
          ) : (
            <div className="space-y-3">
              {paginatedQuizzes.map((quiz) => (
                <div
                  key={quiz.id}
                  className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors"
                >
                  <div className="flex-1">
                    <h3 className="font-bold text-gray-800 mb-2">{quiz.title}</h3>
                    <div className="flex items-center flex-wrap gap-2">
                      <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded-lg text-xs font-semibold">
                        {quiz.difficulty}
                      </span>
                      <span className={`px-2 py-1 rounded-lg text-xs font-semibold ${
                        quiz.status === 'published' 
                          ? 'bg-green-100 text-green-700' 
                          : 'bg-gray-100 text-gray-700'
                      }`}>
                        {quiz.status === 'published' ? 'Published' : 'Draft'}
                      </span>
                      <span className="text-sm text-gray-600">
                        {quiz.total_word_count} words
                      </span>
                      <span className="text-sm text-gray-600">
                        {quiz.completions} completions
                      </span>
                    </div>
                    {quiz.topics && quiz.topics.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {quiz.topics.map((topic: string) => (
                          <span
                            key={topic}
                            className="px-2 py-0.5 bg-orange-100 text-orange-700 rounded-full text-xs font-semibold"
                          >
                            {topic}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="flex gap-2 md:flex-shrink-0">
                    <a
                      href={`/admin/edit/${quiz.id}`}
                      onClick={(e) => handleEditClick(e, quiz.id)}
                      className="flex-1 md:flex-initial flex items-center justify-center gap-2 px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white font-semibold rounded-xl transition-colors cursor-pointer"
                    >
                      <Edit className="w-4 h-4" />
                      <span>Edit</span>
                    </a>
                    <button
                      onClick={() => handleDelete(quiz)}
                      className="flex-1 md:flex-initial flex items-center justify-center gap-2 px-4 py-2 bg-red-500 hover:bg-red-600 text-white font-semibold rounded-xl transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                      <span>Delete</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Pagination */}
        {sortedQuizzes.length > 0 && totalPages > 1 && (
          <div className="mt-6 flex items-center justify-center gap-2">
            <button
              onClick={() => goToPage(currentPage - 1)}
              disabled={currentPage === 1}
              className="p-2 rounded-lg bg-white border border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => {
              // Show first page, last page, current page, and pages around current
              const showPage = 
                page === 1 || 
                page === totalPages || 
                (page >= currentPage - 1 && page <= currentPage + 1);
              
              const showEllipsis = 
                (page === 2 && currentPage > 3) ||
                (page === totalPages - 1 && currentPage < totalPages - 2);
              
              if (!showPage && !showEllipsis) return null;
              
              if (showEllipsis) {
                return <span key={page} className="px-2 text-gray-500">...</span>;
              }
              
              return (
                <button
                  key={page}
                  onClick={() => goToPage(page)}
                  className={`min-w-[40px] px-3 py-2 rounded-lg font-semibold transition-colors ${
                    currentPage === page
                      ? "bg-orange-500 text-white"
                      : "bg-white border border-gray-300 hover:bg-gray-50 text-gray-700"
                  }`}
                >
                  {page}
                </button>
              );
            })}
            
            <button
              onClick={() => goToPage(currentPage + 1)}
              disabled={currentPage === totalPages}
              className="p-2 rounded-lg bg-white border border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        )}

        <div className="mt-4 text-center text-gray-600">
          Showing {startIndex + 1}-{Math.min(endIndex, sortedQuizzes.length)} of {sortedQuizzes.length} quizzes
          {sortedQuizzes.length !== quizzes.length && ` (${quizzes.length} total)`}
        </div>
      </div>
    </div>
  );
}
