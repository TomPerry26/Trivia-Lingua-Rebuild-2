import { useState } from "react";
import { useNavigate } from "react-router";
import { ArrowLeft, Download, Loader2, BookOpen, TrendingUp, FileText } from "lucide-react";
import Papa from "papaparse";

export default function UserDataExportPage() {
  const navigate = useNavigate();
  const [exporting, setExporting] = useState<string | null>(null);

  const exportData = async (type: string, filename: string) => {
    setExporting(type);

    try {
      const response = await fetch(`/api/admin/export/${type}`);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: "Unknown error" }));
        throw new Error(errorData.error || `Server error: ${response.status}`);
      }

      const data = await response.json();
      
      if (!data.rows || data.rows.length === 0) {
        alert(`No ${type} data to export`);
        return;
      }
      
      // Convert to CSV
      const csv = Papa.unparse(data.rows);
      
      // Add UTF-8 BOM for Excel compatibility
      const csvWithBOM = '\uFEFF' + csv;
      
      // Download
      const blob = new Blob([csvWithBOM], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${filename}_${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      
      alert(`Successfully exported ${data.rows.length} ${type} records`);
    } catch (error) {
      console.error("Export failed:", error);
      const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
      alert(`Export failed: ${errorMessage}`);
    } finally {
      setExporting(null);
    }
  };

  const exportCards = [
    {
      type: "user-progress",
      title: "User Progress",
      description: "Export reading stats, streaks, and goals for all users",
      icon: TrendingUp,
      color: "green",
      filename: "user_progress_export"
    },
    {
      type: "quiz-attempts",
      title: "Quiz Attempts",
      description: "Export all quiz completion records with scores",
      icon: FileText,
      color: "orange",
      filename: "quiz_attempts_export"
    },
    {
      type: "external-reading",
      title: "External Reading",
      description: "Export external reading log entries",
      icon: BookOpen,
      color: "purple",
      filename: "external_reading_export"
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-red-50 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <button
            onClick={() => navigate("/admin")}
            className="flex items-center gap-2 text-gray-600 hover:text-orange-600 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            <span>Back to Admin</span>
          </button>
          <h1 className="text-3xl font-bold text-gray-800">User Data Exports</h1>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {exportCards.map((card) => {
            const Icon = card.icon;
            const isExporting = exporting === card.type;
            
            const colorMap: Record<string, {
              border: string;
              iconBg: string;
              iconText: string;
              button: string;
            }> = {
              blue: {
                border: "border-blue-100",
                iconBg: "bg-blue-100",
                iconText: "text-blue-600",
                button: "bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700"
              },
              green: {
                border: "border-green-100",
                iconBg: "bg-green-100",
                iconText: "text-green-600",
                button: "bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700"
              },
              orange: {
                border: "border-orange-100",
                iconBg: "bg-orange-100",
                iconText: "text-orange-600",
                button: "bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700"
              },
              purple: {
                border: "border-purple-100",
                iconBg: "bg-purple-100",
                iconText: "text-purple-600",
                button: "bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700"
              }
            };
            
            const colorClasses = colorMap[card.color];
            
            return (
              <div
                key={card.type}
                className={`bg-white/80 backdrop-blur-lg rounded-3xl shadow-xl p-8 border ${colorClasses.border}`}
              >
                <div className="flex items-start gap-4 mb-4">
                  <div className={`p-3 ${colorClasses.iconBg} rounded-xl`}>
                    <Icon className={`w-6 h-6 ${colorClasses.iconText}`} />
                  </div>
                  <div className="flex-1">
                    <h2 className="text-xl font-bold text-gray-800 mb-2">{card.title}</h2>
                    <p className="text-gray-600 text-sm">{card.description}</p>
                  </div>
                </div>
                
                <button
                  onClick={() => exportData(card.type, card.filename)}
                  disabled={isExporting}
                  className={`w-full py-3 px-6 ${colorClasses.button} disabled:from-gray-400 disabled:to-gray-500 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all flex items-center justify-center gap-2`}
                >
                  {isExporting ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Exporting...
                    </>
                  ) : (
                    <>
                      <Download className="w-5 h-5" />
                      Export CSV
                    </>
                  )}
                </button>
              </div>
            );
          })}
        </div>

        <div className="mt-8 bg-white/80 backdrop-blur-lg rounded-3xl shadow-xl p-6 border border-gray-100">
          <h3 className="font-bold text-gray-800 mb-3">About These Exports</h3>
          <ul className="space-y-2 text-sm text-gray-600">
            <li><strong>User Progress:</strong> Reading statistics including daily/total words read, current and longest streaks, total quizzes completed, daily targets, email opt-in status, and PWA installation status</li>
            <li><strong>Quiz Attempts:</strong> Complete history of quiz completions with scores, words read, and timestamps</li>
            <li><strong>External Reading:</strong> Log of reading done outside the quiz system, including source type and word counts</li>
          </ul>
          <p className="text-sm text-gray-500 mt-4">
            All exports include timestamps and are formatted for compatibility with Excel and Google Sheets.
          </p>
        </div>
      </div>
    </div>
  );
}
