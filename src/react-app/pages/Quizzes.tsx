import { useQuizzesPaginated } from "@/react-app/hooks/useQuizzesPaginated";
import { Loader2, ChevronDown, X } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import LazyQuizCard from "@/react-app/components/LazyQuizCard";
import GoalReachedModal from "@/react-app/components/GoalReachedModal";
import LevelReachedModal from "@/react-app/components/LevelReachedModal";
type SortOption = "latest" | "popular" | "a-z";

const QUIZZES_PER_PAGE = 24;
const SCROLL_POSITION_KEY = "quizzes-scroll-position";

export default function QuizzesPage() {
  const [selectedDifficulties, setSelectedDifficulties] = useState<string[]>([]);
  const [selectedTopics, setSelectedTopics] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState<SortOption>("latest");
  const [showDifficultyDropdown, setShowDifficultyDropdown] = useState(false);
  const [showTopicDropdown, setShowTopicDropdown] = useState(false);
  const [showSortDropdown, setShowSortDropdown] = useState(false);
  const [highlightedTopicIndex, setHighlightedTopicIndex] = useState<number>(-1);
  const [allTopics, setAllTopics] = useState<string[]>([]);
  const [showGoalModal, setShowGoalModal] = useState(false);
  const [goalModalData, setGoalModalData] = useState<{
    streak: number;
    wordsRead: number;
    dailyTarget: number;
  } | null>(null);
  const [showLevelModal, setShowLevelModal] = useState(false);
  const [levelModalData, setLevelModalData] = useState<{
    level: number;
    levelName: string;
    nextLevel: number | null;
    totalWords: number;
    quizzesCompleted: number;
    bestStreak: number;
  } | null>(null);
  
  const {
    quizzes,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
  } = useQuizzesPaginated(selectedDifficulties, selectedTopics, sortBy, QUIZZES_PER_PAGE);
  const difficultyRef = useRef<HTMLDivElement>(null);
  const topicRef = useRef<HTMLDivElement>(null);
  const sortRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const topicItemRefs = useRef<(HTMLLabelElement | null)[]>([]);
  
  // Check for goal reached when returning from a quiz
  useEffect(() => {
    const goalData = sessionStorage.getItem("goal-reached");
    if (goalData) {
      try {
        const data = JSON.parse(goalData);
        setGoalModalData(data);
        setShowGoalModal(true);
        sessionStorage.removeItem("goal-reached");
      } catch (error) {
        console.error("Failed to parse goal data:", error);
      }
    }

    // Check for level reached when returning from a quiz
    const levelData = sessionStorage.getItem("level-reached");
    if (levelData) {
      try {
        const data = JSON.parse(levelData);
        setLevelModalData(data);
        setShowLevelModal(true);
        sessionStorage.removeItem("level-reached");
      } catch (error) {
        console.error("Failed to parse level data:", error);
      }
    }
  }, []);

  // Restore scroll position when returning from a quiz
  useEffect(() => {
    const savedPosition = sessionStorage.getItem(SCROLL_POSITION_KEY);
    if (savedPosition) {
      const position = parseInt(savedPosition, 10);
      // Wait for content to load before scrolling
      setTimeout(() => {
        window.scrollTo(0, position);
        sessionStorage.removeItem(SCROLL_POSITION_KEY);
      }, 100);
    }
  }, []);

  // Clear saved scroll position if filters change (user is actively browsing)
  useEffect(() => {
    sessionStorage.removeItem(SCROLL_POSITION_KEY);
  }, [selectedDifficulties, selectedTopics, sortBy]);
  
  // Fetch all topics for the dropdown
  useEffect(() => {
    const fetchTopics = async () => {
      try {
        const response = await fetch("/api/topics");
        if (response.ok) {
          const topics = await response.json();
          const topicNames = topics.map((t: any) => t.name).sort((a: string, b: string) => a.localeCompare(b));
          setAllTopics(topicNames);
        }
      } catch (error) {
        console.error("Failed to fetch topics:", error);
      }
    };
    fetchTopics();
  }, []);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (difficultyRef.current && !difficultyRef.current.contains(event.target as Node)) {
        setShowDifficultyDropdown(false);
      }
      if (topicRef.current && !topicRef.current.contains(event.target as Node)) {
        setShowTopicDropdown(false);
        setHighlightedTopicIndex(-1);
      }
      if (sortRef.current && !sortRef.current.contains(event.target as Node)) {
        setShowSortDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Keyboard navigation for topics dropdown
  useEffect(() => {
    if (!showTopicDropdown) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      // Only handle single letter keys
      if (event.key.length === 1 && /[a-z]/i.test(event.key)) {
        const letter = event.key.toLowerCase();
        
        // Find first topic starting with this letter
        const index = allTopics.findIndex(topic => 
          topic.toLowerCase().startsWith(letter)
        );
        
        if (index !== -1) {
          setHighlightedTopicIndex(index);
          
          // Scroll to the highlighted item
          if (topicItemRefs.current[index]) {
            topicItemRefs.current[index]?.scrollIntoView({
              block: 'nearest',
              behavior: 'smooth'
            });
          }
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [showTopicDropdown, allTopics]);
  const difficulties = ["Superbeginner", "Beginner", "Intermediate"];

  // Intersection Observer for infinite scroll
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasNextPage && !isFetchingNextPage) {
          fetchNextPage();
        }
      },
      { threshold: 0.1, rootMargin: '100px' }
    );

    const currentBottomRef = bottomRef.current;
    if (currentBottomRef) {
      observer.observe(currentBottomRef);
    }

    return () => {
      if (currentBottomRef) {
        observer.unobserve(currentBottomRef);
      }
    };
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);
  const toggleDifficulty = (difficulty: string) => {
    setSelectedDifficulties(prev => prev.includes(difficulty) ? prev.filter(d => d !== difficulty) : [...prev, difficulty]);
  };
  const toggleTopic = (topic: string) => {
    setSelectedTopics(prev => prev.includes(topic) ? prev.filter(t => t !== topic) : [...prev, topic]);
  };
  const selectAllDifficulties = () => {
    setSelectedDifficulties([]);
  };
  const selectAllTopics = () => {
    setSelectedTopics([]);
  };
  const clearFilters = () => {
    setSelectedDifficulties([]);
    setSelectedTopics([]);
    setSortBy("latest");
  };
  const removeChip = (type: "difficulty" | "topic", value: string) => {
    if (type === "difficulty") {
      setSelectedDifficulties(prev => prev.filter(d => d !== value));
    } else {
      setSelectedTopics(prev => prev.filter(t => t !== value));
    }
  };
  const hasActiveFilters = selectedDifficulties.length > 0 || selectedTopics.length > 0;
  const sortLabels = {
    latest: "Latest",
    popular: "Most Popular",
    "a-z": "A–Z"
  };
  // Only show full page loader on initial load when we have no data at all
  const showFullPageLoader = isLoading && quizzes.length === 0;
  
  if (showFullPageLoader) {
    return <div className="flex items-center justify-center min-h-[calc(100vh-8rem)]">
        <div className="animate-spin">
          <Loader2 className="w-10 h-10 text-orange-500" />
        </div>
      </div>;
  }
  const hasOpenDropdown = showDifficultyDropdown || showTopicDropdown || showSortDropdown;

  return <>
    {showGoalModal && goalModalData && (
      <GoalReachedModal
        streak={goalModalData.streak}
        wordsRead={goalModalData.wordsRead}
        dailyTarget={goalModalData.dailyTarget}
        onKeepPlaying={() => setShowGoalModal(false)}
      />
    )}

    {showLevelModal && levelModalData && (
      <LevelReachedModal
        level={levelModalData.level}
        levelName={levelModalData.levelName}
        nextLevel={levelModalData.nextLevel}
        totalWords={levelModalData.totalWords}
        currentStreak={levelModalData.bestStreak}
        quizzesCompleted={levelModalData.quizzesCompleted}
        bestStreak={levelModalData.bestStreak}
        onKeepPlaying={() => setShowLevelModal(false)}
      />
    )}
    
    <div className="max-w-6xl mx-auto px-4 py-4 overflow-x-hidden">
      {/* Backdrop overlay when any dropdown is open */}
      {hasOpenDropdown && (
        <div 
          className="fixed inset-0 z-[25] bg-black/10"
          onClick={() => {
            setShowDifficultyDropdown(false);
            setShowTopicDropdown(false);
            setShowSortDropdown(false);
          }}
        />
      )}

      {/* Dropdowns Row */}
      <div className="mb-4 bg-gradient-to-br from-orange-50 via-amber-50 to-orange-100 backdrop-blur-lg rounded-2xl shadow-lg p-3 md:p-4 border border-orange-200 relative z-30">
        <div className="grid grid-cols-3 gap-2 md:gap-3">
          {/* Difficulty Dropdown */}
          <div ref={difficultyRef} className="relative">
            <button onClick={() => setShowDifficultyDropdown(!showDifficultyDropdown)} className="w-full px-2 md:px-4 py-2.5 bg-white border border-gray-300 rounded-xl text-left flex items-center justify-between hover:border-orange-400 transition-colors focus:outline-none focus:ring-2 focus:ring-orange-500">
              <span className="text-xs md:text-sm text-gray-700 truncate font-semibold">
                {selectedDifficulties.length === 0 ? "Level" : `Level (${selectedDifficulties.length})`}
              </span>
              <ChevronDown className="w-3.5 h-3.5 md:w-4 md:h-4 text-gray-500 flex-shrink-0" />
            </button>
            {showDifficultyDropdown && <div className="absolute z-[60] w-full min-w-[200px] md:min-w-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-xl max-h-72 overflow-y-auto">
                <button onClick={() => {
              selectAllDifficulties();
              setShowDifficultyDropdown(false);
            }} className="w-full px-4 md:px-4 py-3 md:py-2 text-left text-sm md:text-sm hover:bg-orange-50 transition-colors border-b border-gray-100 font-semibold text-orange-600">
                  All
                </button>
                {difficulties.map(difficulty => <label key={difficulty} className="flex items-center px-4 md:px-4 py-3 md:py-2 hover:bg-gray-50 cursor-pointer transition-colors">
                    <input type="checkbox" checked={selectedDifficulties.includes(difficulty)} onChange={() => toggleDifficulty(difficulty)} className="mr-3 w-5 h-5 md:w-4 md:h-4 text-orange-600 rounded focus:ring-orange-500 flex-shrink-0" />
                    <span className="text-sm md:text-sm text-gray-700">{difficulty}</span>
                  </label>)}
              </div>}
          </div>

          {/* Topic Dropdown */}
          <div ref={topicRef} className="relative">
            <button onClick={() => setShowTopicDropdown(!showTopicDropdown)} className="w-full px-2 md:px-4 py-2.5 bg-white border border-gray-300 rounded-xl text-left flex items-center justify-between hover:border-orange-400 transition-colors focus:outline-none focus:ring-2 focus:ring-orange-500">
              <span className="text-xs md:text-sm text-gray-700 truncate font-semibold">
                {selectedTopics.length === 0 ? "Topics" : `Topics (${selectedTopics.length})`}
              </span>
              <ChevronDown className="w-3.5 h-3.5 md:w-4 md:h-4 text-gray-500 flex-shrink-0" />
            </button>
            {showTopicDropdown && <div className="absolute z-[60] w-full min-w-[200px] md:min-w-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-xl max-h-72 overflow-y-auto">
                <button onClick={() => {
              selectAllTopics();
              setShowTopicDropdown(false);
              setHighlightedTopicIndex(-1);
            }} className="w-full px-4 md:px-4 py-3 md:py-2 text-left text-sm md:text-sm hover:bg-orange-50 transition-colors border-b border-gray-100 font-semibold text-orange-600">
                  All
                </button>
                {allTopics.map((topic, index) => <label 
                    key={topic} 
                    ref={el => { topicItemRefs.current[index] = el; }}
                    className={`flex items-center px-4 md:px-4 py-3 md:py-2 hover:bg-gray-50 cursor-pointer transition-colors ${
                      highlightedTopicIndex === index ? 'bg-orange-50 ring-2 ring-orange-300 ring-inset' : ''
                    }`}
                  >
                    <input type="checkbox" checked={selectedTopics.includes(topic)} onChange={() => toggleTopic(topic)} className="mr-3 w-5 h-5 md:w-4 md:h-4 text-orange-600 rounded focus:ring-orange-500 flex-shrink-0" />
                    <span className="text-sm md:text-sm text-gray-700">{topic}</span>
                  </label>)}
              </div>}
          </div>

          {/* Sort Dropdown */}
          <div ref={sortRef} className="relative">
            <button onClick={() => setShowSortDropdown(!showSortDropdown)} className="w-full px-2 md:px-4 py-2.5 bg-white border border-gray-300 rounded-xl text-left flex items-center justify-between hover:border-orange-400 transition-colors focus:outline-none focus:ring-2 focus:ring-orange-500">
              <span className="text-xs md:text-sm text-gray-700 truncate font-semibold">{sortLabels[sortBy]}</span>
              <ChevronDown className="w-3.5 h-3.5 md:w-4 md:h-4 text-gray-500 flex-shrink-0" />
            </button>
            {showSortDropdown && <div className="absolute z-[60] right-0 w-[180px] md:w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-xl">
                {(Object.keys(sortLabels) as SortOption[]).map(option => <button key={option} onClick={() => {
              setSortBy(option);
              setShowSortDropdown(false);
            }} className={`w-full px-4 py-2 text-left text-sm hover:bg-gray-50 transition-colors ${sortBy === option ? "bg-orange-50 text-orange-600 font-semibold" : "text-gray-700"}`}>
                    {sortLabels[option]}
                  </button>)}
              </div>}
          </div>
        </div>
      </div>

      {/* Chips Row */}
      {hasActiveFilters && <div className="mb-6 flex items-center justify-between gap-3 flex-wrap">
          <div className="flex flex-wrap gap-2">
            {selectedDifficulties.map(difficulty => <span key={difficulty} className="inline-flex items-center gap-2 bg-gradient-to-r from-orange-500 to-red-500 text-white px-3 py-1.5 rounded-full text-sm font-semibold">
                {difficulty}
                <button onClick={() => removeChip("difficulty", difficulty)} className="hover:bg-white/20 rounded-full p-0.5 transition-colors">
                  <X className="w-3.5 h-3.5" />
                </button>
              </span>)}
            {selectedTopics.map(topic => <span key={topic} className="inline-flex items-center gap-2 bg-gradient-to-r from-orange-500 to-red-500 text-white px-3 py-1.5 rounded-full text-sm font-semibold">
                {topic}
                <button onClick={() => removeChip("topic", topic)} className="hover:bg-white/20 rounded-full p-0.5 transition-colors">
                  <X className="w-3.5 h-3.5" />
                </button>
              </span>)}
          </div>
          <button onClick={clearFilters} className="text-sm text-orange-600 hover:text-orange-700 font-semibold whitespace-nowrap">
            Clear all
          </button>
        </div>}

      {/* Quiz Grid */}
      {quizzes.length === 0 && !isLoading ? <div className="text-center py-12 bg-white/80 backdrop-blur-lg rounded-2xl shadow-lg">
          <p className="text-gray-600 mb-4">
            {hasActiveFilters ? "No quizzes match your filters." : "Loading quizzes..."}
          </p>
          {hasActiveFilters && (
            <button onClick={clearFilters} className="text-orange-600 hover:text-orange-700 font-semibold">
              Clear filters
            </button>
          )}
        </div> : <>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {quizzes.map(quiz => (
            <LazyQuizCard key={quiz.id} quiz={quiz} />
          ))}
        </div>

        {/* Loading More Spinner */}
        {isFetchingNextPage && (
          <div className="flex justify-center items-center py-8">
            <Loader2 className="w-6 h-6 text-orange-500 animate-spin" />
            <span className="ml-3 text-gray-600 font-medium">Loading more...</span>
          </div>
        )}

        {/* End Message */}
        {!hasNextPage && quizzes.length > 0 && (
          <div className="text-center py-8">
            <p className="text-gray-500 font-medium">That's all for now! 🎉</p>
          </div>
        )}

        {/* Intersection Observer Target */}
        <div ref={bottomRef} className="h-4" />
      </>}
    </div>
  </>;
}