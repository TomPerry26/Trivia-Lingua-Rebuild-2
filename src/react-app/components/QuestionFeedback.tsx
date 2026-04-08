import { useState } from "react";
import { createPortal } from "react-dom";
import { ThumbsUp, ThumbsDown, Flag, X } from "lucide-react";
import { useAuth } from "@getmocha/users-service/react";

interface QuestionFeedbackProps {
  questionId: number;
  quizId: number;
}

export default function QuestionFeedback({ questionId, quizId }: QuestionFeedbackProps) {
  const { user } = useAuth();

  const [showReportModal, setShowReportModal] = useState(false);
  const [rating, setRating] = useState<"up" | "down" | null>(null);

  const [issueType, setIssueType] = useState("");
  const [description, setDescription] = useState("");

  const [isSubmittingReport, setIsSubmittingReport] = useState(false);

  // Don't show feedback controls if user is not authenticated
  if (!user) {
    return null;
  }

  const handleUpvote = async () => {
    setRating("up");
    try {
      await fetch("/api/question-feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question_id: questionId,
          quiz_id: quizId,
          rating: "up",
        }),
      });
    } catch (error) {
      console.error("Failed to submit feedback:", error);
    }
  };

  const handleDownvote = async () => {
    setRating("down");
    try {
      await fetch("/api/question-feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question_id: questionId,
          quiz_id: quizId,
          rating: "down",
        }),
      });
    } catch (error) {
      console.error("Failed to submit feedback:", error);
    }
  };



  const submitReport = async () => {
    if (!issueType) return;

    setIsSubmittingReport(true);
    try {
      await fetch("/api/question-reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question_id: questionId,
          quiz_id: quizId,
          issue_type: issueType,
          description: description || undefined,
        }),
      });
      setShowReportModal(false);
    } catch (error) {
      console.error("Failed to submit report:", error);
      setIsSubmittingReport(false);
    }
  };

  return (
    <>
      <div className="flex items-center justify-center gap-4 py-3 border-t border-gray-100">
        <div className="flex items-center gap-2">
          <button
            onClick={handleUpvote}
            className="p-2.5 transition-all"
            title="This question was helpful"
          >
            <ThumbsUp 
              className={`w-6 h-6 transition-all ${
                rating === "up" ? "text-green-600" : "text-gray-400 hover:text-green-600"
              }`}
              fill={rating === "up" ? "currentColor" : "none"}
            />
          </button>
          <button
            onClick={handleDownvote}
            className="p-2.5 transition-all"
            title="This question needs improvement"
          >
            <ThumbsDown 
              className={`w-6 h-6 transition-all ${
                rating === "down" ? "text-red-600" : "text-gray-400 hover:text-red-600"
              }`}
              fill={rating === "down" ? "currentColor" : "none"}
            />
          </button>
        </div>
        <button
          onClick={() => setShowReportModal(true)}
          className="text-xs text-gray-400 hover:text-orange-600 underline transition-colors"
        >
          Give feedback
        </button>
      </div>

      {/* Report Modal */}
      {showReportModal && createPortal(
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Flag className="w-5 h-5 text-orange-500" />
                <h3 className="text-lg font-bold text-gray-800">Give feedback</h3>
              </div>
              <button
                onClick={() => setShowReportModal(false)}
                className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Feedback type
              </label>
              <select
                value={issueType}
                onChange={(e) => setIssueType(e.target.value)}
                className="w-full p-3 border-2 border-gray-200 rounded-xl text-sm focus:border-orange-300 focus:outline-none"
              >
                <option value="">Select an option</option>
                <option value="Too easy">Too easy</option>
                <option value="Too hard">Too hard</option>
                <option value="Issue with the trivia">Issue with the trivia</option>
                <option value="Issue with the Spanish">Issue with the Spanish</option>
                <option value="Typo/bug">Typo/bug</option>
                <option value="More like this!">More like this!</option>
                <option value="Suggestion">Suggestion</option>
                <option value="Other">Other</option>
              </select>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Message
              </label>
              <textarea
                placeholder="Tell us what's on your mind..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full p-3 border-2 border-gray-200 rounded-xl text-sm focus:border-orange-300 focus:outline-none resize-none"
                rows={4}
              />
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => setShowReportModal(false)}
                disabled={isSubmittingReport}
                className="flex-1 py-2.5 px-4 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
              <button
                onClick={submitReport}
                disabled={!issueType || isSubmittingReport}
                className="flex-1 py-2.5 px-4 bg-orange-500 hover:bg-orange-600 text-white font-semibold rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmittingReport ? "Submitting..." : "Submit"}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
