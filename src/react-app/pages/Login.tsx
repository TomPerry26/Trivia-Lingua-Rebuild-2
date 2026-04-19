import { useAuth } from "@/react-app/contexts/AuthContext";
import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router";
import { Sparkles, BookOpen, TrendingUp, Smartphone } from "lucide-react";
import MetaTags from "@/react-app/components/MetaTags";
import LoginPageSchema from "@/react-app/components/LoginPageSchema";
import { OG_IMAGE_URL, SITE_URL } from "@/react-app/lib/site";

// No animations needed - removed for stability
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
  }>;
}
export default function LoginPage() {
  const {
    user,
    redirectToLogin,
    signInWithMagicLink,
    isPending
  } = useAuth();
  const navigate = useNavigate();
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [magicLinkMessage, setMagicLinkMessage] = useState<string | null>(null);
  const [currentTopicIndex, setCurrentTopicIndex] = useState(0);
  const topics = ["Harry Potter", "Marvel", "Taylor Swift", "Star Wars", "Geography", "Music", "Film", "Sport", "Star Trek", "History", "Batman", "Food", "Culture", "Pokemon", "Animals"];
  useEffect(() => {
    if (user) {
      navigate("/");
    }
  }, [user, navigate]);
  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setInstallPrompt(e as BeforeInstallPromptEvent);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTopicIndex((prev) => (prev + 1) % topics.length);
    }, 3000);
    return () => clearInterval(interval);
  }, [topics.length]);
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
  const handleStartPlaying = async () => {
    setLoginError(null);
    setMagicLinkMessage(null);
    try {
      await redirectToLogin();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to start OAuth login.";
      setLoginError(message);
    }
  };
  const handleMagicLinkSignIn = async () => {
    setLoginError(null);
    setMagicLinkMessage(null);

    try {
      await signInWithMagicLink(email);
      setMagicLinkMessage("Check your email for a secure sign-in link.");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to send magic-link email.";
      setLoginError(message);
    }
  };
  if (isPending) {
    return <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-amber-50 to-orange-100">
        <div className="animate-spin">
          <div className="w-10 h-10 border-4 border-orange-500 border-t-transparent rounded-full"></div>
        </div>
      </div>;
  }
  return <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-red-50 flex flex-col">
      <MetaTags title="Learn Spanish with Daily Trivia Quizzes | Trivia Lingua" description="Free Spanish reading practice through fun trivia quizzes about Harry Potter, Marvel, music, and more. Track progress, build streaks, and improve your Spanish naturally at every level." url={`${SITE_URL}/login`} image={OG_IMAGE_URL} />
      <LoginPageSchema />
      {/* Fixed Top Header */}
      <header className="bg-white/80 backdrop-blur-lg border-b border-orange-100 fixed top-0 left-0 right-0 z-50 h-16">
        <div className="px-4 md:px-6 h-full flex items-center justify-between">
          {/* Left: App Title - Always visible */}
          <div className="flex items-center gap-1.5 md:gap-2">
            <h1 className="text-lg md:text-2xl font-bold text-orange-600 whitespace-nowrap">
              Trivia Lingua
            </h1>
            <span className="bg-orange-100 text-orange-600 text-xs font-semibold px-1.5 md:px-2 py-0.5 rounded-md whitespace-nowrap">
              Beta
            </span>
          </div>
          
          {/* Right: Support Link + Start Playing Button */}
          <div className="flex items-center gap-2 md:gap-4">
            <a href="https://ko-fi.com/trivialingua" target="_blank" rel="noopener noreferrer" className="text-gray-600 hover:text-orange-600 transition-colors font-medium">
              <span className="sm:hidden text-xl leading-none">☕</span>
              <span className="hidden sm:inline text-sm">☕ Support this project</span>
            </a>
            <button onClick={handleStartPlaying} className="px-3 md:px-6 py-2 md:py-2.5 bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white text-sm md:text-base font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 whitespace-nowrap">Start playing</button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <div className="pt-32 md:pt-40 px-4 pb-16 md:pb-20 text-center relative overflow-hidden">
        {/* Decorative Background Elements */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-20 left-10 w-72 h-72 bg-orange-400/40 rounded-full blur-3xl animate-pulse"></div>
          <div className="absolute top-40 right-10 w-96 h-96 bg-red-400/40 rounded-full blur-3xl animate-pulse" style={{
          animationDelay: '1s'
        }}></div>
          <div className="absolute bottom-20 left-1/2 w-80 h-80 bg-amber-400/40 rounded-full blur-3xl animate-pulse" style={{
          animationDelay: '2s'
        }}></div>
        </div>

        <div className="max-w-5xl mx-auto relative z-10">
          <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-black mb-8 md:mb-12 leading-snug tracking-tight text-center overflow-visible">
            <span className="block bg-gradient-to-r from-orange-600 via-red-500 to-pink-600 bg-clip-text text-transparent">Learn Spanish with fun, daily trivia quizzes on</span>
            <span className="block text-gray-900 dark:text-white italic whitespace-nowrap overflow-visible pb-2" aria-live="polite">
              {topics[currentTopicIndex]}
            </span>
          </h1>

          <button onClick={handleStartPlaying} className="group px-10 md:px-12 py-4 md:py-5 bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white text-xl md:text-2xl font-bold rounded-2xl shadow-2xl hover:shadow-orange-500/50 transition-all duration-300 transform hover:scale-105 hover:-translate-y-1 relative overflow-hidden">
            <span className="relative z-10 flex items-center gap-2 justify-center">
              Start playing now
              <Sparkles className="w-6 h-6 group-hover:rotate-12 transition-transform" />
            </span>
            <div className="absolute inset-0 bg-gradient-to-r from-orange-400 to-red-400 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
          </button>
          {loginError ? (
            <p className="mt-4 text-sm text-red-600 font-medium">{loginError}</p>
          ) : null}
          <div className="mt-4 max-w-md mx-auto bg-white/75 rounded-2xl p-4 border border-orange-100 shadow">
            <p className="text-sm font-semibold text-gray-700 mb-2">Or sign in with magic link</p>
            <div className="flex flex-col sm:flex-row gap-2">
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="you@example.com"
                className="flex-1 rounded-xl border border-orange-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300"
              />
              <button
                onClick={handleMagicLinkSignIn}
                className="px-4 py-2 bg-white border border-orange-300 text-orange-700 rounded-xl text-sm font-semibold hover:bg-orange-50"
              >
                Email me link
              </button>
            </div>
            {magicLinkMessage ? <p className="mt-2 text-sm text-green-700">{magicLinkMessage}</p> : null}
          </div>
          
          <div className="mt-4 flex flex-wrap items-center justify-center gap-3 md:gap-6 text-xs md:text-sm text-gray-600">
            <span className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 bg-orange-500 rounded-full flex-shrink-0"></span>
              <span className="whitespace-nowrap">Levels A1-B2</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 bg-orange-500 rounded-full flex-shrink-0"></span>
              <span className="whitespace-nowrap">Free</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 bg-orange-500 rounded-full flex-shrink-0"></span>
              <span className="whitespace-nowrap">Track Your Progress</span>
            </span>
          </div>
        </div>
      </div>

      {/* Benefits Section */}
      <div className="max-w-6xl mx-auto px-4 py-12 md:py-16">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
          <div className="bg-white/60 backdrop-blur-sm rounded-2xl p-6 md:p-8 shadow-lg hover:shadow-xl transition-all duration-300 border border-orange-100 group hover:-translate-y-1 text-center">
            <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-red-500 rounded-xl flex items-center justify-center mb-4 shadow-lg group-hover:scale-110 transition-transform mx-auto">
              <Sparkles className="w-6 h-6 text-white" />
            </div>
            <h3 className="text-xl font-bold text-gray-800 mb-2">Topics you actually care about</h3>
            <p className="text-gray-600">Harry Potter, Marvel, Taylor Swift, geography, film, music and more</p>
          </div>

          <div className="bg-white/60 backdrop-blur-sm rounded-2xl p-6 md:p-8 shadow-lg hover:shadow-xl transition-all duration-300 border border-orange-100 group hover:-translate-y-1 text-center">
            <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-red-500 rounded-xl flex items-center justify-center mb-4 shadow-lg group-hover:scale-110 transition-transform mx-auto">
              <BookOpen className="w-6 h-6 text-white" />
            </div>
            <h3 className="text-xl font-bold text-gray-800 mb-2">Content in Spanish for every level (A1, A2, B1, B2)</h3>
            <p className="text-gray-600">No grammar drills. No dictionary. Just natural, fun reading in Spanish</p>
          </div>

          <div className="bg-white/60 backdrop-blur-sm rounded-2xl p-6 md:p-8 shadow-lg hover:shadow-xl transition-all duration-300 border border-orange-100 group hover:-translate-y-1 text-center">
            <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-red-500 rounded-xl flex items-center justify-center mb-4 shadow-lg group-hover:scale-110 transition-transform mx-auto">
              <TrendingUp className="w-6 h-6 text-white" />
            </div>
            <h3 className="text-xl font-bold text-gray-800 mb-2">Track your progress</h3>
            <p className="text-gray-600">Track every word you read, build streaks and watch your Spanish progress grow</p>
          </div>
        </div>

        {/* Install Card */}
        <div className="mt-6 md:mt-8">
          <div className="bg-white/60 backdrop-blur-sm rounded-2xl p-6 md:p-8 shadow-lg hover:shadow-xl transition-all duration-300 border border-orange-100 text-center">
            <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-red-500 rounded-xl flex items-center justify-center mb-4 shadow-lg mx-auto">
              <Smartphone className="w-6 h-6 text-white" />
            </div>
            <h3 className="text-xl font-bold text-gray-800 mb-2">Install Trivia Lingua as an app</h3>
            <p className="text-gray-600 mb-4">
              Get the best experience by installing Trivia Lingua on your device.
            </p>
            {installPrompt ? <button onClick={handleInstallClick} className="px-6 py-3 bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-200">
                Install Now
              </button> : <div className="space-y-2 text-sm text-gray-600">
                <p><strong>iPhone/iPad:</strong> Share → Add to Home Screen</p>
                <p><strong>Android:</strong> Menu → Install app / Add to Home Screen</p>
              </div>}
          </div>
        </div>
      </div>
      
      {/* Footer */}
      <footer className="py-4 px-4 text-center">
        <div className="grid grid-cols-2 gap-3 max-w-xs mx-auto md:flex md:items-center md:justify-center md:gap-4 md:max-w-none">
          <Link to="/about" className="text-gray-600 hover:text-orange-600 text-sm transition-colors">
            About & FAQ
          </Link>
          <Link to="/privacy" className="text-gray-600 hover:text-orange-600 text-sm transition-colors">
            Privacy
          </Link>
          <a href="https://ko-fi.com/trivialingua" target="_blank" rel="noopener noreferrer" className="text-gray-600 hover:text-orange-600 text-sm transition-colors col-span-2 md:col-span-1">
            Support this project
          </a>
        </div>
      </footer>
    </div>;
}
