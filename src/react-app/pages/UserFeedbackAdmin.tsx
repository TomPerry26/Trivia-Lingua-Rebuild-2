import { useState, useEffect } from "react";
import { ThumbsUp, ThumbsDown, Flag, Mail, MessageCircle, Trash2 } from "lucide-react";

interface Feedback {
  id: number;
  user_id: string;
  question_id: number;
  quiz_id: number;
  rating: string;
  reason: string | null;
  comment: string | null;
  created_at: string;
  question_text: string;
  quiz_title: string;
}

interface Report {
  id: number;
  user_id: string;
  question_id: number;
  quiz_id: number;
  issue_type: string;
  description: string | null;
  created_at: string;
  question_text: string;
  quiz_title: string;
}

interface Message {
  id: number;
  user_id: string;
  user_email: string;
  subject: string;
  message: string;
  created_at: string;
}

export default function UserFeedbackAdmin() {
  const [feedback, setFeedback] = useState<Feedback[]>([]);
  const [reports, setReports] = useState<Report[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"ratings" | "reports" | "messages">("messages");

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch question feedback
        const feedbackResponse = await fetch("/api/admin/question-feedback");
        if (feedbackResponse.ok) {
          const feedbackData = await feedbackResponse.json();
          setFeedback(feedbackData.feedback);
          setReports(feedbackData.reports);
        }

        // Fetch messages
        const messagesResponse = await fetch("/api/admin/messages");
        if (messagesResponse.ok) {
          const messagesData = await messagesResponse.json();
          setMessages(messagesData);
        }
      } catch (error) {
        console.error("Failed to fetch data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const handleDelete = async (type: "message" | "rating" | "report", id: number) => {
    const typeLabels = {
      message: "message",
      rating: "rating",
      report: "report"
    };
    const endpoints = {
      message: `/api/admin/messages/${id}`,
      rating: `/api/admin/question-feedback/${id}`,
      report: `/api/admin/question-reports/${id}`
    };

    if (!confirm(`Are you sure you want to delete this ${typeLabels[type]}?`)) {
      return;
    }

    try {
      const response = await fetch(endpoints[type], {
        method: "DELETE",
      });

      if (response.ok) {
        if (type === "message") setMessages(messages.filter(m => m.id !== id));
        if (type === "rating") setFeedback(feedback.filter(f => f.id !== id));
        if (type === "report") setReports(reports.filter(r => r.id !== id));
      } else {
        alert(`Failed to delete ${typeLabels[type]}`);
      }
    } catch (error) {
      console.error(`Failed to delete ${typeLabels[type]}:`, error);
      alert(`Failed to delete ${typeLabels[type]}`);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-amber-50 to-orange-100">
        <p className="text-gray-600">Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-red-50 p-4">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-800">User Feedback</h1>
          <p className="text-gray-600 mt-1">Question ratings, reports, and user messages</p>
        </div>

        {/* Tabs */}
        <div className="bg-white/80 backdrop-blur-lg rounded-2xl shadow-lg border border-orange-100 mb-6">
          <div className="flex border-b border-gray-200">
            <button
              onClick={() => setActiveTab("messages")}
              className={`flex-1 px-4 py-3 font-semibold transition-colors ${
                activeTab === "messages"
                  ? "text-orange-600 border-b-2 border-orange-600"
                  : "text-gray-600 hover:text-gray-800"
              }`}
            >
              Messages ({messages.length})
            </button>
            <button
              onClick={() => setActiveTab("ratings")}
              className={`flex-1 px-4 py-3 font-semibold transition-colors ${
                activeTab === "ratings"
                  ? "text-orange-600 border-b-2 border-orange-600"
                  : "text-gray-600 hover:text-gray-800"
              }`}
            >
              Ratings ({feedback.length})
            </button>
            <button
              onClick={() => setActiveTab("reports")}
              className={`flex-1 px-4 py-3 font-semibold transition-colors ${
                activeTab === "reports"
                  ? "text-orange-600 border-b-2 border-orange-600"
                  : "text-gray-600 hover:text-gray-800"
              }`}
            >
              Reports ({reports.length})
            </button>
          </div>

          <div className="p-4">
            {/* Messages Tab */}
            {activeTab === "messages" && (
              <div className="space-y-3">
                {messages.map((item) => (
                  <div
                    key={item.id}
                    className="border-2 border-gray-200 rounded-xl p-4 hover:border-orange-200 transition-colors"
                  >
                    <div className="flex items-start gap-3">
                      <div className={`p-2 rounded-lg ${
                        item.subject === "Contact Us" ? "bg-blue-100" :
                        item.subject === "General Feedback" ? "bg-green-100" :
                        item.subject === "Report an issue" ? "bg-red-100" :
                        item.subject === "Request a Topic" ? "bg-purple-100" :
                        "bg-gray-100"
                      }`}>
                        {item.subject === "Contact Us" ? (
                          <Mail className="w-5 h-5 text-blue-600" />
                        ) : (
                          <MessageCircle className={`w-5 h-5 ${
                            item.subject === "General Feedback" ? "text-green-600" :
                            item.subject === "Report an issue" ? "text-red-600" :
                            item.subject === "Request a Topic" ? "text-purple-600" :
                            "text-gray-600"
                          }`} />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <span className="text-sm font-semibold text-gray-800">{item.user_email}</span>
                          <span className={`inline-block px-2 py-0.5 ${
                            item.subject === "Contact Us" ? "bg-blue-100 text-blue-700" :
                            item.subject === "General Feedback" ? "bg-green-100 text-green-700" :
                            item.subject === "Report an issue" ? "bg-red-100 text-red-700" :
                            item.subject === "Request a Topic" ? "bg-purple-100 text-purple-700" :
                            "bg-gray-100 text-gray-700"
                          } text-xs rounded-full`}>
                            {item.subject}
                          </span>
                          <span className="text-xs text-gray-500">
                            {new Date(item.created_at).toLocaleDateString()}
                          </span>
                        </div>
                        <p className="text-sm text-gray-700 bg-gray-50 p-3 rounded-lg mt-2 break-words whitespace-pre-wrap">
                          {item.message}
                        </p>
                      </div>
                      <button
                        onClick={() => handleDelete("message", item.id)}
                        className="flex items-center gap-1 px-3 py-2 bg-red-500 hover:bg-red-600 text-white font-semibold rounded-lg transition-colors text-sm flex-shrink-0"
                      >
                        <Trash2 className="w-4 h-4" />
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
                {messages.length === 0 && (
                  <p className="text-center text-gray-500 py-8">No messages yet</p>
                )}
              </div>
            )}

            {/* Ratings Tab */}
            {activeTab === "ratings" && (
              <div className="space-y-3">
                {feedback.map((item) => (
                  <div
                    key={item.id}
                    className="border-2 border-gray-200 rounded-xl p-4 hover:border-orange-200 transition-colors"
                  >
                    <div className="flex items-start gap-3">
                      <div className={`p-2 rounded-lg ${item.rating === "up" ? "bg-green-100" : "bg-red-100"}`}>
                        {item.rating === "up" ? (
                          <ThumbsUp className="w-5 h-5 text-green-600" />
                        ) : (
                          <ThumbsDown className="w-5 h-5 text-red-600" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <a
                            href={`/admin/edit/${item.quiz_id}`}
                            className="text-sm font-semibold text-orange-600 hover:text-orange-700 hover:underline transition-colors cursor-pointer"
                          >
                            {item.quiz_title}
                          </a>
                          <span className="text-xs text-gray-500">
                            {new Date(item.created_at).toLocaleDateString()}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600 mb-2 break-words">
                          {item.question_text}
                        </p>
                        {item.reason && (
                          <div className="inline-block px-2 py-1 bg-orange-100 text-orange-700 text-xs rounded-full mb-2">
                            {item.reason}
                          </div>
                        )}
                        {item.comment && (
                          <p className="text-sm text-gray-700 bg-gray-50 p-2 rounded-lg mt-2 break-words">
                            {item.comment}
                          </p>
                        )}
                      </div>
                      <button
                        onClick={() => handleDelete("rating", item.id)}
                        className="flex items-center gap-1 px-3 py-2 bg-red-500 hover:bg-red-600 text-white font-semibold rounded-lg transition-colors text-sm flex-shrink-0"
                      >
                        <Trash2 className="w-4 h-4" />
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
                {feedback.length === 0 && (
                  <p className="text-center text-gray-500 py-8">No ratings yet</p>
                )}
              </div>
            )}

            {/* Reports Tab */}
            {activeTab === "reports" && (
              <div className="space-y-3">
                {reports.map((item) => (
                  <div
                    key={item.id}
                    className="border-2 border-gray-200 rounded-xl p-4 hover:border-orange-200 transition-colors"
                  >
                    <div className="flex items-start gap-3">
                      <div className="p-2 rounded-lg bg-orange-100">
                        <Flag className="w-5 h-5 text-orange-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <a
                            href={`/admin/edit/${item.quiz_id}`}
                            className="text-sm font-semibold text-orange-600 hover:text-orange-700 hover:underline transition-colors cursor-pointer"
                          >
                            {item.quiz_title}
                          </a>
                          <span className="inline-block px-2 py-0.5 bg-orange-100 text-orange-700 text-xs rounded-full">
                            {item.issue_type}
                          </span>
                          <span className="text-xs text-gray-500">
                            {new Date(item.created_at).toLocaleDateString()}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600 mb-2 break-words">
                          {item.question_text}
                        </p>
                        {item.description && (
                          <p className="text-sm text-gray-700 bg-gray-50 p-2 rounded-lg mt-2 break-words">
                            {item.description}
                          </p>
                        )}
                      </div>
                      <button
                        onClick={() => handleDelete("report", item.id)}
                        className="flex items-center gap-1 px-3 py-2 bg-red-500 hover:bg-red-600 text-white font-semibold rounded-lg transition-colors text-sm flex-shrink-0"
                      >
                        <Trash2 className="w-4 h-4" />
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
                {reports.length === 0 && (
                  <p className="text-center text-gray-500 py-8">No reports yet</p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
