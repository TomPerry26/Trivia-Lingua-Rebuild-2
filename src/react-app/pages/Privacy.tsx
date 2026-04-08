import { Link } from "react-router";
import { useEffect } from "react";
export default function PrivacyPage() {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);
  return <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-red-50 flex items-center justify-center p-4 py-8">
      <div className="max-w-3xl w-full bg-white/80 backdrop-blur-lg rounded-3xl shadow-2xl p-8 border border-orange-100">
        <h1 className="text-3xl font-bold text-gray-800 mb-6">Privacy Policy</h1>
        
        <p className="text-gray-700 mb-6">
          Trivia Lingua respects your privacy.
        </p>

        <h2 className="text-xl font-bold text-gray-800 mb-3">Data we collect</h2>
        <ul className="list-disc list-inside space-y-2 mb-6 text-gray-700">
          <li>
            <strong>When you sign in with Google:</strong> your name, email address, and profile picture (used only to save your progress and personalise your experience).
          </li>
          <li>
            <strong>Quiz progress:</strong> words read, streaks, completed quizzes (stored to show your stats).
          </li>
          <li>
            <strong>Email preferences:</strong> your opt-in status for receiving occasional newsletter emails with reading tips, announcements and updates.
          </li>
          <li>
            <strong>Analytics:</strong> We use Google Analytics to understand how the app is used (anonymous data – no personal identification).
          </li>
        </ul>

        <h2 className="text-xl font-bold text-gray-800 mb-3">How we use it</h2>
        <ul className="list-disc list-inside space-y-2 mb-6 text-gray-700">
          <li>To save your progress and show your levels/streaks.</li>
          <li>To improve the app (e.g. which quizzes are popular).</li>
          <li>To send occasional newsletter emails (only if you've opted in).</li>
        </ul>

        <h2 className="text-xl font-bold text-gray-800 mb-3">We do not</h2>
        <ul className="list-disc list-inside space-y-2 mb-6 text-gray-700">
          <li>Sell or share your personal data with anyone.</li>
          <li>Use it for advertising.</li>
        </ul>

        <h2 className="text-xl font-bold text-gray-800 mb-3">Payments</h2>
        <p className="text-gray-700 mb-6">Donations via Ko-fi/Stripe are processed by them – we don't store payment details.</p>

        <h2 className="text-xl font-bold text-gray-800 mb-3">Email communications</h2>
        <p className="text-gray-700 mb-6">You can opt in or out of receiving newsletter emails at any time from your Profile settings. We will only send newsletter emails to users who have explicitly opted in. Essential service emails (e.g. for transactions, for security alerts) may be sent without opt-in.</p>

        <h2 className="text-xl font-bold text-gray-800 mb-3">Cookies / Local Storage</h2>
        <p className="text-gray-700 mb-6">
          Used for login session and PWA functionality.
        </p>

        <p className="text-gray-700 mb-6">
          <strong>Questions?</strong> Contact us via the app.
        </p>

        <p className="text-sm text-gray-500 mb-6">
          Last updated: January 2026
        </p>

        <Link to="/login" className="inline-block px-6 py-3 bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all">Back</Link>
      </div>
    </div>;
}