import { useState } from "react";
import { createPortal } from "react-dom";
import { X, Mail } from "lucide-react";

interface EmailOptInModalProps {
  onClose: () => void;
}

export default function EmailOptInModal({ onClose }: EmailOptInModalProps) {
  const [isOptedIn, setIsOptedIn] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await fetch("/api/progress/email-opt-in", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email_opt_in: isOptedIn }),
      });
      onClose();
    } catch (error) {
      console.error("Failed to save email preference:", error);
      onClose();
    } finally {
      setIsSaving(false);
    }
  };

  const handleNotNow = () => {
    onClose();
  };

  return createPortal(
    <div 
      style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 9999 }} 
      className="bg-black/50 backdrop-blur-sm flex items-center justify-center p-4"
    >
      <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full">
        <div className="p-8">
          {/* Close button */}
          <button
            onClick={onClose}
            className="float-right text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>

          {/* Icon */}
          <div className="w-16 h-16 bg-gradient-to-br from-orange-500 to-red-500 rounded-2xl flex items-center justify-center mb-6 shadow-lg">
            <Mail className="w-8 h-8 text-white" />
          </div>

          {/* Header */}
          <h2 className="text-3xl font-bold text-gray-800 mb-4">
            Stay in touch
          </h2>

          {/* Body */}
          <p className="text-gray-700 leading-relaxed mb-6">
            Welcome to Trivia Lingua! Would you like to hear about new quizzes, reading tips, and occasional updates?
          </p>

          {/* Checkbox */}
          <label className="flex items-start gap-3 cursor-pointer group mb-4 p-4 rounded-xl hover:bg-orange-50 transition-colors">
            <input
              type="checkbox"
              checked={isOptedIn}
              onChange={(e) => setIsOptedIn(e.target.checked)}
              className="mt-1 w-5 h-5 rounded border-2 border-orange-300 text-orange-600 focus:ring-orange-500 focus:ring-offset-0 cursor-pointer"
            />
            <span className="text-gray-700 group-hover:text-gray-900 transition-colors">
              I want to receive occasional emails with reading tips and Trivia Lingua updates
            </span>
          </label>

          {/* Supporting text */}
          <p className="text-sm text-gray-500 mb-6">
            You can subscribe or unsubscribe at any time on your Profile page.
          </p>

          {/* Buttons */}
          <div className="flex gap-3">
            <button
              onClick={handleNotNow}
              disabled={isSaving}
              className="flex-1 px-6 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold rounded-xl transition-all disabled:opacity-50"
            >
              Not now
            </button>
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="flex-1 px-6 py-3 bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all disabled:opacity-50"
            >
              {isSaving ? "Saving..." : "Save preferences"}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
