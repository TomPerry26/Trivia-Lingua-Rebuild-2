import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router";
import { Smartphone, ChevronRight } from "lucide-react";
import { useAuth } from "@getmocha/users-service/react";
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
  }>;
}
export default function SmartBanner() {
  const navigate = useNavigate();
  const location = useLocation();
  const {
    user,
    redirectToLogin
  } = useAuth();
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showPWABanner, setShowPWABanner] = useState(false);
  useEffect(() => {
    // Check if user is on mobile and not in PWA mode
    const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches;

    // Show PWA banner only for mobile users not in PWA mode
    if (isMobile && !isStandalone) {
      setShowPWABanner(true);
    }

    // Listen for install prompt
    const handler = (e: Event) => {
      e.preventDefault();
      setInstallPrompt(e as BeforeInstallPromptEvent);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);
  const handleInstallClick = async () => {
    if (installPrompt) {
      try {
        await installPrompt.prompt();
        const choiceResult = await installPrompt.userChoice;
        if (choiceResult.outcome === 'accepted') {
          setInstallPrompt(null);
        }
      } catch (error) {
        console.error('Failed to show install prompt:', error);
      }
    } else {
      // If already on profile page, just scroll
      if (location.pathname === '/profile') {
        const element = document.getElementById('install-instructions');
        if (element) {
          element.scrollIntoView({
            behavior: 'smooth',
            block: 'start'
          });
        }
      } else {
        // Navigate to profile page with hash - Profile page handles scrolling
        navigate('/profile#install-instructions');
      }
    }
  };
  if (showPWABanner) {
    return <div className="relative overflow-hidden bg-gradient-to-r from-orange-500 to-amber-500 rounded-2xl shadow-lg p-4 animate-gradient">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Smartphone className="w-8 h-8 text-white flex-shrink-0" />
            <div>
              <p className="text-white font-bold text-lg">
                Install Trivia Lingua
              </p>
              <p className="text-white/90 text-sm">
                Get the best experience with our app
              </p>
            </div>
          </div>
          <button onClick={handleInstallClick} className="w-full sm:w-auto bg-white hover:bg-gray-50 text-orange-600 px-4 py-3 rounded-xl font-semibold shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 flex-shrink-0">
            <span>Install Now</span>
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>;
  }

  // Default banner for non-mobile or PWA users
  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Trivia Lingua - Learn Spanish',
          text: 'Check out Trivia Lingua - learn Spanish with fun daily trivia quizzes!',
          url: window.location.origin
        });
      } catch (error) {
        // User cancelled or share failed
        console.error('Share failed:', error);
      }
    }
  };

  // Guest banner - encourage sign-in
  if (!user) {
    return <div className="relative overflow-hidden bg-gradient-to-br from-orange-500 via-red-500 to-amber-500 rounded-2xl shadow-2xl p-6 md:p-8 animate-gradient">
        <div className="absolute top-0 right-0 w-48 h-48 bg-white/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 left-0 w-32 h-32 bg-white/10 rounded-full blur-3xl"></div>
        
        <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-4 md:gap-6">
          <div className="flex-1 text-center md:text-left">
            <h3 className="text-xl md:text-3xl font-bold text-white mb-2">
              Get the full experience 🇪🇸
            </h3>
            <p className="text-white/90 text-base md:text-lg">Hundreds more quizzes. Track your progress.</p>
          </div>
          
          <div className="flex-shrink-0">
            <button onClick={redirectToLogin} className="group bg-white hover:bg-gray-50 text-orange-600 px-6 md:px-8 py-3 md:py-4 rounded-2xl font-bold text-base md:text-lg shadow-xl hover:shadow-2xl transition-all duration-200 flex items-center gap-2">
              <span>Sign in</span>
              <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </button>
          </div>
        </div>
      </div>;
  }
  return <div className="relative overflow-hidden bg-gradient-to-br from-orange-500 via-red-500 to-amber-500 rounded-2xl shadow-2xl p-6 md:p-8 animate-gradient">
      <div className="absolute top-0 right-0 w-48 h-48 bg-white/10 rounded-full blur-3xl"></div>
      <div className="absolute bottom-0 left-0 w-32 h-32 bg-white/10 rounded-full blur-3xl"></div>
      
      <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-4 md:gap-6">
        <div className="flex-1 text-center md:text-left">
          <h3 className="text-xl md:text-3xl font-bold text-white mb-2">
            Know someone learning Spanish? 🇪🇸
          </h3>
          <p className="text-white/90 text-base md:text-lg">
            Share the fun—your friends will thank you!
          </p>
        </div>
        
        <div className="flex-shrink-0">
          <button onClick={handleShare} className="group bg-white hover:bg-gray-50 text-orange-600 px-6 md:px-8 py-3 md:py-4 rounded-2xl font-bold text-base md:text-lg shadow-xl hover:shadow-2xl transition-all duration-200 flex items-center gap-2">
            <span>Share Now</span>
            <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </button>
        </div>
      </div>
    </div>;
}