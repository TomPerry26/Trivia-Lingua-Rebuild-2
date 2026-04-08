import { useAuth } from "@getmocha/users-service/react";
import { User, Mail, Calendar, LogOut, Smartphone, ArrowRight, HelpCircle, MessageSquare, Bell } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { Link, useLocation } from "react-router";
import { useProgressQuery } from "../hooks/useProgressQuery";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export default function ProfilePage() {
  const {
    user,
    logout
  } = useAuth();
  const location = useLocation();
  const hasScrolledRef = useRef(false);
  const { progress } = useProgressQuery();
  const [emailOptIn, setEmailOptIn] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  
  // Handle hash scrolling when navigating to this page
  useEffect(() => {
    if (location.hash && !hasScrolledRef.current) {
      const elementId = location.hash.replace('#', '');
      const scrollToElement = () => {
        const element = document.getElementById(elementId);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'start' });
          hasScrolledRef.current = true;
        }
      };
      // Try immediately, then retry after render
      scrollToElement();
      const timeout = setTimeout(scrollToElement, 100);
      return () => clearTimeout(timeout);
    }
  }, [location.hash]);

  useEffect(() => {
    if (progress) {
      setEmailOptIn(Boolean((progress as any).email_opt_in));
    }
  }, [progress]);

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setInstallPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstallClick = async () => {
    if (!installPrompt) return;

    try {
      await installPrompt.prompt();
      const choiceResult = await installPrompt.userChoice;
      
      if (choiceResult.outcome === 'accepted') {
        setInstallPrompt(null);
      }
    } catch (error) {
      console.error('Failed to show install prompt:', error);
    }
  };

  const handleLogout = async () => {
    await logout();
  };

  const handleEmailOptInChange = async (checked: boolean) => {
    setIsSaving(true);
    try {
      const response = await fetch("/api/progress/email-opt-in", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email_opt_in: checked }),
      });

      if (response.ok) {
        setEmailOptIn(checked);
      }
    } catch (error) {
      console.error("Failed to update email preference:", error);
    } finally {
      setIsSaving(false);
    }
  };

  const userName = user?.google_user_data?.name || (user?.email ? user.email.split('@')[0].charAt(0).toUpperCase() + user.email.split('@')[0].slice(1) : 'User');
  const profilePicture = user?.google_user_data?.picture;
  const memberSince = user?.created_at ? new Date(user.created_at).toLocaleDateString('en-US', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  }) : new Date().toLocaleDateString('en-US', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });



  return <div className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-gray-800 mb-8">Your Profile</h1>

      {/* User Info Card */}
      <div className="bg-white/80 backdrop-blur-lg rounded-3xl shadow-xl p-8 mb-8 border border-orange-100">
        <div className="flex items-center gap-6 mb-6">
          {profilePicture ? (
            <img 
              src={profilePicture} 
              alt={userName}
              className="w-20 h-20 rounded-full object-cover"
            />
          ) : (
            <div className="w-20 h-20 bg-gradient-to-br from-orange-500 to-red-500 rounded-full flex items-center justify-center">
              <User className="w-10 h-10 text-white" />
            </div>
          )}
          <div>
            <h2 className="text-2xl font-bold text-gray-800">
              {userName}
            </h2>
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex items-center gap-3 text-gray-700">
            <Mail className="w-5 h-5 text-orange-500" />
            <span>{user?.email}</span>
          </div>
          <div className="flex items-center gap-3 text-gray-700">
            <Calendar className="w-5 h-5 text-orange-500" />
            <span>Member since {memberSince}</span>
          </div>
        </div>
      </div>

      {/* Email Settings Card */}
      <div className="bg-white/80 backdrop-blur-lg rounded-3xl shadow-xl p-8 mb-8 border border-purple-100">
        <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-3">
          <Bell className="w-6 h-6 text-purple-600" />
          Email Settings
        </h3>
        <label className="flex items-start gap-3 cursor-pointer group">
          <input
            type="checkbox"
            checked={emailOptIn}
            onChange={(e) => handleEmailOptInChange(e.target.checked)}
            disabled={isSaving}
            className="mt-1 w-5 h-5 rounded border-2 border-purple-300 text-purple-600 focus:ring-purple-500 focus:ring-offset-0 cursor-pointer disabled:opacity-50"
          />
          <span className="text-gray-700 group-hover:text-gray-900 transition-colors">
            I want to receive occasional emails with reading tips and Trivia Lingua updates
          </span>
        </label>
      </div>

      {/* Install PWA Card */}
      <div id="install-instructions" className="bg-gradient-to-r from-orange-50 to-amber-50 rounded-3xl shadow-xl p-8 mb-8 border-2 border-orange-200">
        <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-3">
          <Smartphone className="w-6 h-6 text-orange-600" />
          Install as an App
        </h3>
        <p className="text-gray-700 leading-relaxed mb-4">
          Get the best experience by installing Trivia Lingua on your device. It feels like a native app!
        </p>
        {installPrompt ? (
          <button
            onClick={handleInstallClick}
            className="px-6 py-3 bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-200"
          >
            Install Now
          </button>
        ) : (
          <div className="space-y-3">
            <div className="bg-white/80 rounded-lg p-4">
              <h4 className="font-semibold text-gray-800 mb-2">📱 On iPhone/iPad:</h4>
              <ol className="text-sm text-gray-700 space-y-1 list-decimal list-inside">
                <li>Tap the Share button in Safari</li>
                <li>Scroll down and tap "Add to Home Screen"</li>
                <li>Tap "Add" in the top right</li>
              </ol>
            </div>
            <div className="bg-white/80 rounded-lg p-4">
              <h4 className="font-semibold text-gray-800 mb-2">🤖 On Android:</h4>
              <ol className="text-sm text-gray-700 space-y-1 list-decimal list-inside">
                <li>Tap the menu (three dots) in Chrome</li>
                <li>Tap "Install app" or "Add to Home screen"</li>
                <li>Tap "Install"</li>
              </ol>
            </div>
          </div>
        )}
      </div>

      {/* Support this project Banner */}
      <a 
        href="https://ko-fi.com/trivialingua" 
        target="_blank" 
        rel="noopener noreferrer" 
        className="block bg-gradient-to-r from-blue-500 to-cyan-600 rounded-2xl shadow-lg p-6 mb-4 hover:shadow-xl transition-all"
      >
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="bg-white/20 p-3 rounded-xl flex items-center justify-center w-12 h-12">
              <span className="text-2xl leading-none">☕</span>
            </div>
            <div>
              <h3 className="text-xl font-bold text-white mb-1">
                Support this project
              </h3>
              <p className="text-white/90 text-sm">
                Keep the quizzes and new features coming, and support Trivia Lingua
              </p>
            </div>
          </div>
          <ArrowRight className="w-6 h-6 text-white flex-shrink-0" />
        </div>
      </a>

      {/* About & FAQ Banner */}
      <Link to="/about" className="block bg-gradient-to-r from-green-500 to-teal-600 rounded-2xl shadow-lg p-6 mb-4 hover:shadow-xl transition-all">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="bg-white/20 p-3 rounded-xl">
              <HelpCircle className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-white mb-1">
                About & FAQ
              </h3>
              <p className="text-white/90 text-sm">
                Learn more about Trivia Lingua and find answers to common questions
              </p>
            </div>
          </div>
          <ArrowRight className="w-6 h-6 text-white flex-shrink-0" />
        </div>
      </Link>

      {/* Contact Us Banner */}
      <Link to="/contact" className="block bg-gradient-to-r from-purple-500 to-pink-600 rounded-2xl shadow-lg p-6 mb-8 hover:shadow-xl transition-all">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="bg-white/20 p-3 rounded-xl">
              <MessageSquare className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-white mb-1">
                Contact Us
              </h3>
              <p className="text-white/90 text-sm">
                Get in touch with questions, feedback, or topic requests
              </p>
            </div>
          </div>
          <ArrowRight className="w-6 h-6 text-white flex-shrink-0" />
        </div>
      </Link>

      {/* Logout Button */}
      <button onClick={handleLogout} className="w-full py-4 px-6 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all flex items-center justify-center gap-3">
        <LogOut className="w-5 h-5" />
        Log Out
      </button>
    </div>;
}
