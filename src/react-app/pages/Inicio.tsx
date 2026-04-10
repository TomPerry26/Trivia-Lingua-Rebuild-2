import { Link } from "react-router";
import { Loader2, ChevronRight } from "lucide-react";
import LazyQuizCard from "@/react-app/components/LazyQuizCard";
import { useHomeData } from "@/react-app/hooks/useHomeData";
import type { Quiz } from "@/shared/types";
import { useState, useRef, useEffect } from "react";
import EmailOptInModal from "@/react-app/components/EmailOptInModal";
import SmartBanner from "@/react-app/components/SmartBanner";
import { useAuth } from "@/react-app/contexts/AuthContext";

export default function InicioPage() {
  const { homeData, loading } = useHomeData();
  const { user } = useAuth();
  const newSectionRef = useRef<HTMLDivElement>(null);
  const [showEmailOptInModal, setShowEmailOptInModal] = useState(false);

  useEffect(() => {
    const hasSeenEmailModal = localStorage.getItem("hasSeenEmailOptInModal");
    // Only show email modal for logged-in users
    if (user && !hasSeenEmailModal && !loading && homeData) {
      setTimeout(() => {
        setShowEmailOptInModal(true);
      }, 1000);
    }
  }, [user, loading, homeData]);

  const handleCloseEmailModal = () => {
    setShowEmailOptInModal(false);
    localStorage.setItem("hasSeenEmailOptInModal", "true");
  };

  if (loading) {
    return <div className="flex items-center justify-center min-h-[calc(100vh-8rem)]">
        <div className="animate-spin">
          <Loader2 className="w-10 h-10 text-orange-500" />
        </div>
      </div>;
  }

  if (!homeData) {
    return <div className="flex items-center justify-center min-h-[calc(100vh-8rem)]">
        <p className="text-gray-500">Failed to load home page data</p>
      </div>;
  }
  

  const ThemedRow = ({ title, quizzes }: { title: string; quizzes: Quiz[] }) => {
    if (quizzes.length === 0) return null;
    
    return (
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-gray-800 mb-4">{title}</h2>
        <div className="overflow-x-auto pb-4 -mx-4 px-4 scrollbar-hide">
          <div className="flex gap-4">
            {quizzes.map(quiz => (
              <LazyQuizCard key={quiz.id} quiz={quiz} className="flex-shrink-0 w-72" />
            ))}
          </div>
        </div>
      </div>
    );
  };



  return <div className="max-w-6xl mx-auto px-4 py-8 space-y-8 overflow-x-hidden">
      {/* Email Opt-In Modal for First-Time Users */}
      {showEmailOptInModal && (
        <EmailOptInModal onClose={handleCloseEmailModal} />
      )}

      {/* Top Banner */}
      <SmartBanner />

      {/* Latest Quizzes */}
      <div ref={newSectionRef}>
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <h2 className="text-2xl font-bold text-gray-800">New</h2>
            <span className="bg-green-100 text-green-700 text-xs font-semibold px-2.5 py-1 rounded-full">
              Updated today
            </span>
          </div>
          <Link to="/quizzes" className="text-orange-600 hover:text-orange-700 font-semibold text-sm flex items-center gap-1">
            View all
            <ChevronRight className="w-4 h-4" />
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {homeData.latestQuizzes.map(quiz => (
            <LazyQuizCard key={quiz.id} quiz={quiz} />
          ))}
        </div>
      </div>

      {/* Themed Rows from Database */}
      {homeData.homeRows.map(({ row, quizzes }) => (
        <ThemedRow 
          key={row.id} 
          title={row.title} 
          quizzes={quizzes} 
        />
      ))}

    </div>;
}