import { ReactNode, useState, useEffect, useRef } from "react";
import { Link, useLocation } from "react-router";
import { useAuth } from "@getmocha/users-service/react";
import { Home, BookOpen, BarChart3, User as UserIcon, LogOut, Edit2, PieChart, Mail, MessageCircle, List, Database, Eye, Target } from "lucide-react";
import { useProgressQuery } from "@/react-app/hooks/useProgressQuery";
import EmailOptInModal from "@/react-app/components/EmailOptInModal";
import GoalReachedModal from "@/react-app/components/GoalReachedModal";
import LevelReachedModal from "@/react-app/components/LevelReachedModal";
import { getGuestProgress, updateGuestDailyTarget } from "@/react-app/lib/guestProgress";
interface LayoutProps {
  children: ReactNode;
}
export default function Layout({
  children
}: LayoutProps) {
  const {
    user,
    logout,
    redirectToLogin
  } = useAuth();
  const location = useLocation();
  const {
    progress,
    updateTarget
  } = useProgressQuery();
  const [isEditingTarget, setIsEditingTarget] = useState(false);
  const [targetInput, setTargetInput] = useState("");
  const [showUserMenu, setShowUserMenu] = useState(false);

  // Guest progress tracking
  const guestProgress = !user ? getGuestProgress() : null;
  const dailyWordsRead = user ? progress?.daily_words_read || 0 : guestProgress?.wordsRead || 0;
  const dailyTarget = user ? progress?.daily_target || 1000 : guestProgress?.dailyTarget || 1000;
  const [showEmailOptInPreview, setShowEmailOptInPreview] = useState(false);
  const [showGoalPreview, setShowGoalPreview] = useState(false);
  const [showLevelPreview, setShowLevelPreview] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const navItems = [{
    path: "/",
    label: "Home",
    icon: Home
  }, {
    path: "/quizzes",
    label: "Quizzes",
    icon: BookOpen
  }, {
    path: "/progress",
    label: "Progress",
    icon: BarChart3
  }, {
    path: "/profile",
    label: user ? "Profile" : "Sign in",
    icon: UserIcon,
    isSignIn: !user
  }];
  const isActive = (path: string) => location.pathname === path;
  const handleNavClick = (path: string, e: React.MouseEvent<HTMLAnchorElement>) => {
    if (location.pathname === path) {
      e.preventDefault();
      window.scrollTo({
        top: 0,
        behavior: 'smooth'
      });
    }
  };
  const handleLogout = async () => {
    await logout();
  };
  const handleEditTarget = () => {
    const currentTarget = user ? progress?.daily_target || 1000 : guestProgress?.dailyTarget || 1000;
    setTargetInput(String(currentTarget));
    setIsEditingTarget(true);
  };
  const handleSaveTarget = async () => {
    const newTarget = parseInt(targetInput);
    if (newTarget >= 100 && newTarget <= 10000) {
      if (user) {
        await updateTarget(newTarget);
      } else {
        updateGuestDailyTarget(newTarget);
      }
      setIsEditingTarget(false);
    }
  };
  const handleCancelEdit = () => {
    setIsEditingTarget(false);
  };
  const getUserInitials = () => {
    if (!user?.email) return "";

    // Try to get name from email (e.g., "tom.perry@example.com" -> "TP")
    const emailParts = user.email.split("@")[0].split(".");
    if (emailParts.length >= 2) {
      return (emailParts[0][0] + emailParts[1][0]).toUpperCase();
    }

    // Fallback to first two letters of email
    return user.email.substring(0, 2).toUpperCase();
  };

  // Close dropdown when clicking outside
  // Check if user is admin
  useEffect(() => {
    if (user) {
      fetch('/api/users/me')
        .then(res => res.ok ? res.json() : null)
        .then(data => {
          if (data?.access_level === 'beta') {
            setIsAdmin(true);
          } else {
            setIsAdmin(false);
          }
        })
        .catch(() => setIsAdmin(false));
    } else {
      setIsAdmin(false);
    }
  }, [user]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setShowUserMenu(false);
      }
    };
    if (showUserMenu) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showUserMenu]);
  return <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-red-50 overflow-x-hidden">
      {/* Fixed Top Header - Full Width */}
      <header className="bg-white/80 backdrop-blur-lg border-b border-orange-100 fixed top-0 left-0 right-0 z-50 h-16">
        <div className="px-4 md:px-6 h-full flex items-center justify-between gap-2 md:gap-4">
          {/* Left: App Title - Hidden on mobile, shown on tablet+ */}
          <div className="hidden sm:flex items-center gap-2 flex-shrink-0">
            <h1 className="text-xl md:text-2xl font-bold text-orange-600">
              Trivia Lingua
            </h1>
            <span className="bg-orange-100 text-orange-600 text-xs font-semibold px-2 py-0.5 rounded-md">
              Beta
            </span>
          </div>
          
          {/* Center: Daily Goal Progress - Always visible, but styled differently on mobile */}
          <div className="flex-1 max-w-2xl px-2 md:px-4">
            <div className="bg-gradient-to-r from-orange-50 to-red-50 rounded-xl px-2 py-1.5 sm:px-4 sm:py-2 border border-orange-200 shadow-sm">
              <div className="flex items-center gap-1.5 sm:gap-3">
                <span className="text-xs sm:text-sm font-bold text-orange-700 whitespace-nowrap">Daily Goal</span>
                <div className="flex-1 bg-white/60 rounded-full h-2.5 sm:h-3 overflow-hidden border border-orange-200">
                  <div className="h-full bg-gradient-to-r from-orange-500 to-red-500 rounded-full transition-all duration-500 shadow-sm" style={{
                  width: `${Math.min(dailyWordsRead / dailyTarget * 100, 100)}%`
                }} />
                </div>
                <span className="text-xs sm:text-sm font-bold text-gray-800 whitespace-nowrap">
                  {dailyWordsRead}/{dailyTarget}
                </span>
                <button onClick={handleEditTarget} className="p-1 sm:p-1.5 hover:bg-orange-100 rounded-lg transition-colors" title="Edit daily goal">
                  <Edit2 className="w-3.5 sm:w-4 h-3.5 sm:h-4 text-orange-600" />
                </button>
              </div>
            </div>
          </div>
          
          {/* Right: User Avatar with Dropdown - Always takes space but invisible when no admin */}
          <div className="relative flex-shrink-0" ref={userMenuRef}>
          {isAdmin ? <>
            <button onClick={() => setShowUserMenu(!showUserMenu)} className="w-10 h-10 rounded-full bg-gradient-to-br from-orange-500 to-red-500 text-white font-semibold flex items-center justify-center shadow-lg hover:shadow-xl transition-all hover:scale-105" title="User menu">
              {getUserInitials() || <UserIcon className="w-5 h-5" />}
            </button>

            {/* Dropdown Menu */}
            {showUserMenu && <div className="absolute right-0 top-12 w-64 bg-white rounded-xl shadow-2xl border border-orange-100 py-2 z-50">
                {/* Email */}
                <div className="px-4 py-3 border-b border-gray-100">
                  <p className="text-xs text-gray-500 mb-1">Signed in as</p>
                  <p className="text-sm font-semibold text-gray-800 truncate">{user?.email}</p>
                </div>

                {/* Menu Items */}
                <Link to="/admin/dashboard" onClick={() => setShowUserMenu(false)} className="flex items-center gap-3 px-4 py-3 hover:bg-orange-50 transition-colors">
                  <PieChart className="w-5 h-5 text-gray-600" />
                  <span className="text-sm font-medium text-gray-700">Dashboard</span>
                </Link>

                <Link to="/admin/quizzes" onClick={() => setShowUserMenu(false)} className="flex items-center gap-3 px-4 py-3 hover:bg-orange-50 transition-colors">
                  <List className="w-5 h-5 text-gray-600" />
                  <span className="text-sm font-medium text-gray-700">Manage Quizzes</span>
                </Link>

                <Link to="/admin/bulk-operations" onClick={() => setShowUserMenu(false)} className="flex items-center gap-3 px-4 py-3 hover:bg-orange-50 transition-colors">
                  <Database className="w-5 h-5 text-gray-600" />
                  <span className="text-sm font-medium text-gray-700">Bulk Operations</span>
                </Link>

                <Link to="/admin/user-feedback" onClick={() => setShowUserMenu(false)} className="flex items-center gap-3 px-4 py-3 hover:bg-orange-50 transition-colors">
                  <MessageCircle className="w-5 h-5 text-gray-600" />
                  <span className="text-sm font-medium text-gray-700">User Feedback</span>
                </Link>

                <Link to="/admin/user-data-export" onClick={() => setShowUserMenu(false)} className="flex items-center gap-3 px-4 py-3 hover:bg-orange-50 transition-colors">
                  <Database className="w-5 h-5 text-gray-600" />
                  <span className="text-sm font-medium text-gray-700">User Data Exports</span>
                </Link>

                <button onClick={() => {
                setShowUserMenu(false);
                setShowEmailOptInPreview(true);
              }} className="flex items-center gap-3 px-4 py-3 hover:bg-orange-50 transition-colors w-full text-left">
                  <Mail className="w-5 h-5 text-gray-600" />
                  <span className="text-sm font-medium text-gray-700">Preview Email Modal</span>
                </button>

                <button onClick={() => {
                setShowUserMenu(false);
                setShowGoalPreview(true);
              }} className="flex items-center gap-3 px-4 py-3 hover:bg-orange-50 transition-colors w-full text-left">
                  <Eye className="w-5 h-5 text-gray-600" />
                  <span className="text-sm font-medium text-gray-700">Preview Goal Modal</span>
                </button>

                <button onClick={() => {
                setShowUserMenu(false);
                setShowLevelPreview(true);
              }} className="flex items-center gap-3 px-4 py-3 hover:bg-orange-50 transition-colors w-full text-left">
                  <Target className="w-5 h-5 text-gray-600" />
                  <span className="text-sm font-medium text-gray-700">Preview Level Modal</span>
                </button>

                <div className="border-t border-gray-100 mt-2 pt-2">
                  <button onClick={() => {
                  setShowUserMenu(false);
                  handleLogout();
                }} className="flex items-center gap-3 px-4 py-3 hover:bg-red-50 transition-colors w-full text-left">
                    <LogOut className="w-5 h-5 text-red-600" />
                    <span className="text-sm font-medium text-red-600">Log out</span>
                  </button>
                </div>
              </div>}
          </> : <div className="w-10 h-10 hidden sm:block"></div>}
          </div>
        </div>
      </header>

      {/* Edit Target Modal */}
      {isEditingTarget && <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="p-4 md:p-6">
              <h3 className="text-xl md:text-2xl font-bold text-gray-800 mb-4">Set Daily Goal</h3>
              
              {/* Preset Options */}
              <div className="space-y-2 mb-4">
              <button onClick={() => setTargetInput("750")} className={`w-full text-left p-3 rounded-xl border-2 transition-all ${targetInput === "750" ? "border-orange-500 bg-orange-50" : "border-gray-200 hover:border-orange-300 bg-white"}`}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-lg font-bold text-gray-800">Casual</span>
                  <span className="text-lg font-bold text-orange-600">750 words</span>
                </div>
                <p className="text-sm text-gray-600">Perfect for relaxed daily practice</p>
              </button>

              <button onClick={() => setTargetInput("1500")} className={`w-full text-left p-3 rounded-xl border-2 transition-all ${targetInput === "1500" ? "border-orange-500 bg-orange-50" : "border-gray-200 hover:border-orange-300 bg-white"}`}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-lg font-bold text-gray-800">Engaged</span>
                  <span className="text-lg font-bold text-orange-600">1500 words</span>
                </div>
                <p className="text-sm text-gray-600">Make steady progress</p>
              </button>

              <button onClick={() => setTargetInput("2500")} className={`w-full text-left p-3 rounded-xl border-2 transition-all ${targetInput === "2500" ? "border-orange-500 bg-orange-50" : "border-gray-200 hover:border-orange-300 bg-white"}`}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-lg font-bold text-gray-800">Dedicated</span>
                  <span className="text-lg font-bold text-orange-600">2500 words</span>
                </div>
                <p className="text-sm text-gray-600">Make fast progress</p>
              </button>

              {/* Custom Goal Option */}
              <div className={`p-3 rounded-xl border-2 transition-all ${!["750", "1500", "2500"].includes(targetInput) ? "border-orange-500 bg-orange-50" : "border-gray-200 bg-white"}`}>
                <div className="mb-2">
                  <span className="text-lg font-bold text-gray-800">Set your own goal</span>
                </div>
                <input type="number" value={targetInput} onChange={e => setTargetInput(e.target.value)} min="100" max="10000" className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-orange-500 focus:outline-none text-lg" placeholder="Enter custom goal" />
                <p className="text-xs text-gray-500 mt-2">
                  Between 100 and 10,000 words
                </p>
              </div>
              </div>

              <div className="flex gap-3">
                <button onClick={handleCancelEdit} className="flex-1 px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold rounded-xl transition-colors">
                  Cancel
                </button>
                <button onClick={handleSaveTarget} className="flex-1 px-4 py-2.5 bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white font-semibold rounded-xl shadow-lg transition-all">
                  Save
                </button>
              </div>
            </div>
          </div>
        </div>}

      {/* Admin Preview Modals */}
      {showEmailOptInPreview && <EmailOptInModal onClose={() => setShowEmailOptInPreview(false)} />}
      {showGoalPreview && <GoalReachedModal streak={7} wordsRead={1500} dailyTarget={1000} onKeepPlaying={() => setShowGoalPreview(false)} />}
      {showLevelPreview && <LevelReachedModal level={4} levelName="Dedicated Reader" nextLevel={5} totalWords={25000} currentStreak={7} quizzesCompleted={42} bestStreak={14} onKeepPlaying={() => setShowLevelPreview(false)} />}

      {/* Desktop Sidebar - Starts Below Header */}
      <aside className="hidden md:flex fixed left-0 top-16 bottom-0 w-64 bg-white/80 backdrop-blur-lg border-r border-orange-100 flex-col z-40">
        <nav className="flex-1 px-4 py-6 space-y-2">
          {navItems.map(item => {
          const Icon = item.icon;
          const active = isActive(item.path);
          if (item.isSignIn) {
            return <button key={item.path} onClick={redirectToLogin} className="flex items-center gap-3 px-4 py-3 rounded-xl font-semibold transition-all text-gray-700 hover:bg-orange-50 w-full text-left">
                <Icon className="w-5 h-5" />
                <span>{item.label}</span>
              </button>;
          }
          return <Link key={item.path} to={item.path} onClick={e => handleNavClick(item.path, e)} className={`flex items-center gap-3 px-4 py-3 rounded-xl font-semibold transition-all ${active ? "bg-gradient-to-r from-orange-500 to-red-500 text-white shadow-lg" : "text-gray-700 hover:bg-orange-50"}`}>
                <Icon className="w-5 h-5" />
                <span>{item.label}</span>
              </Link>;
        })}
        </nav>
        
        {/* Contact Link */}
        <div className="px-4 pb-6">
          <Link to="/contact" className="w-full flex items-center justify-center gap-3 px-4 py-3 bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded-xl transition-colors">
            <MessageCircle className="w-5 h-5" />
            <span>Contact</span>
          </Link>
        </div>
      </aside>

      {/* Main Content */}
      <main className="pt-16 pb-20 md:pb-8 md:pl-64">
        {children}
      </main>

      {/* Mobile Bottom Navigation */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-lg border-t border-orange-100 z-50">
        <div className="grid grid-cols-5 h-16">
          {navItems.map(item => {
          const Icon = item.icon;
          const active = isActive(item.path);
          if (item.isSignIn) {
            return <button key={item.path} onClick={redirectToLogin} className="flex flex-col items-center justify-center gap-1 text-gray-500">
                <Icon className="w-6 h-6" />
                <span className="text-xs font-semibold">{item.label}</span>
              </button>;
          }
          return <Link key={item.path} to={item.path} onClick={e => handleNavClick(item.path, e)} className={`flex flex-col items-center justify-center gap-1 transition-colors ${active ? "text-orange-600" : "text-gray-500"}`}>
                <Icon className={`w-6 h-6 ${active ? "scale-110" : ""} transition-transform`} />
                <span className="text-xs font-semibold">{item.label}</span>
              </Link>;
        })}
          <Link to="/contact" className="flex flex-col items-center justify-center gap-1 text-purple-600">
            <MessageCircle className="w-6 h-6" />
            <span className="text-xs font-semibold">Contact</span>
          </Link>
        </div>
      </nav>
    </div>;
}