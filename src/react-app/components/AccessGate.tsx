import { Lock } from "lucide-react";
import { useAuth } from "@/react-app/contexts/AuthContext";
import type { AccessLevel } from "@/shared/access-levels";

interface AccessGateProps {
  requiredLevel: AccessLevel;
  onUpgrade: () => void;
}

export default function AccessGate({ requiredLevel, onUpgrade }: AccessGateProps) {
  const { user, redirectToLogin } = useAuth();

  const getMessage = () => {
    if (!user && requiredLevel === 'member') {
      return {
        title: "Sign in to play this quiz",
        description: "Create a free account to track your progress, build streaks, and unlock more quizzes.",
        buttonText: "Sign in",
        action: redirectToLogin
      };
    }
    
    if (requiredLevel === 'premium') {
      return {
        title: "Premium quiz",
        description: "Upgrade to premium to access this quiz and hundreds more.",
        buttonText: "Upgrade to Premium",
        action: onUpgrade
      };
    }
    
    if (requiredLevel === 'beta') {
      return {
        title: "Beta access required",
        description: "This quiz is only available to beta testers.",
        buttonText: "Learn More",
        action: onUpgrade
      };
    }

    return {
      title: "Locked",
      description: "You don't have access to this quiz yet.",
      buttonText: "Learn More",
      action: onUpgrade
    };
  };

  const message = getMessage();

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-red-50 py-8 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white/80 backdrop-blur-lg rounded-3xl shadow-2xl p-8 border border-orange-100 text-center">
          <div className="mb-6">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-orange-500 to-red-500 rounded-full mb-4">
              <Lock className="w-10 h-10 text-white" />
            </div>
            <h2 className="text-3xl font-bold text-gray-800 mb-2">{message.title}</h2>
            <p className="text-gray-600 text-lg">{message.description}</p>
          </div>

          <button
            onClick={message.action}
            className="w-full py-4 px-6 bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all text-lg"
          >
            {message.buttonText}
          </button>

          <a
            href="/"
            className="block mt-4 text-gray-500 hover:text-gray-700 font-medium transition-colors"
          >
            ← Back to home
          </a>
        </div>
      </div>
    </div>
  );
}
