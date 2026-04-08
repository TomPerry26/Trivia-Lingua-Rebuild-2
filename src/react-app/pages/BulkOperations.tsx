import { useState } from "react";
import { useNavigate } from "react-router";
import { ArrowLeft, Download, Upload, FileText, CheckCircle, XCircle, AlertCircle, Loader2 } from "lucide-react";
import Papa from "papaparse";

interface ImportRow {
  quiz_id: string;
  quiz_title: string;
  difficulty: string;
  topics?: string;
  question_number: string;
  question_text: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  correct_answer: string;
  explanation: string;
}

interface ImportPreview {
  quiz_id: string;
  quiz_title: string;
  difficulty: string;
  topics?: string;
  questionCount: number;
  totalWords: number;
}

interface ImportResult {
  created: number;
  skipped: number;
  errors: number;
  details: string[];
}

type TabType = "import" | "export";

export default function BulkOperationsPage() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<TabType>("import");

  // Import state
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<ImportPreview[]>([]);
  const [quizStatuses, setQuizStatuses] = useState<Record<string, string>>({});
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);

  // Export state
  const [exporting, setExporting] = useState(false);



  // Import functions
  const downloadTemplate = () => {
    const template = [
      {
        quiz_id: "example_quiz_01",
        quiz_title: "Example Quiz",
        difficulty: "Beginner",
        topics: "Language, General",
        question_number: "1",
        question_text: "¿Qué color es el cielo?",
        option_a: "Rojo",
        option_b: "Azul",
        option_c: "Verde",
        option_d: "Amarillo",
        correct_answer: "Azul",
        explanation: "El cielo es azul durante el día cuando hace buen tiempo."
      }
    ];

    const csv = Papa.unparse(template);
    const csvWithBOM = '\uFEFF' + csv;
    
    const blob = new Blob([csvWithBOM], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "quiz_template.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    setFile(selectedFile);
    setPreview([]);
    setQuizStatuses({});
    setValidationErrors([]);
    setImportResult(null);

    Papa.parse(selectedFile, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const data = results.data as ImportRow[];
        const errors: string[] = [];
        const quizMap = new Map<string, ImportRow[]>();

        data.forEach((row, index) => {
          const rowNum = index + 2;

          if (!row.quiz_id) errors.push(`Row ${rowNum}: quiz_id is required`);
          if (!row.quiz_title) errors.push(`Row ${rowNum}: quiz_title is required`);
          if (!row.difficulty) errors.push(`Row ${rowNum}: difficulty is required`);
          if (!["Superbeginner", "Beginner", "Intermediate", "Advanced"].includes(row.difficulty)) {
            errors.push(`Row ${rowNum}: difficulty must be Superbeginner, Beginner, Intermediate, or Advanced`);
          }
          if (!row.question_number) errors.push(`Row ${rowNum}: question_number is required`);
          if (!row.question_text) errors.push(`Row ${rowNum}: question_text is required`);
          if (!row.option_a) errors.push(`Row ${rowNum}: option_a is required`);
          if (!row.option_b) errors.push(`Row ${rowNum}: option_b is required`);
          if (!row.option_c) errors.push(`Row ${rowNum}: option_c is required`);
          if (!row.option_d) errors.push(`Row ${rowNum}: option_d is required`);
          if (!row.correct_answer) errors.push(`Row ${rowNum}: correct_answer is required`);
          if (!row.explanation) errors.push(`Row ${rowNum}: explanation is required`);

          const validAnswers = [row.option_a, row.option_b, row.option_c, row.option_d];
          if (row.correct_answer && !validAnswers.includes(row.correct_answer)) {
            errors.push(`Row ${rowNum}: correct_answer must match one of the options exactly`);
          }

          if (row.quiz_id) {
            if (!quizMap.has(row.quiz_id)) {
              quizMap.set(row.quiz_id, []);
            }
            quizMap.get(row.quiz_id)!.push(row);
          }
        });

        setValidationErrors(errors);

        if (errors.length === 0) {
          const previews: ImportPreview[] = [];
          const statusMap: Record<string, string> = {};
          quizMap.forEach((questions, quizId) => {
            const firstQuestion = questions[0];
            const totalWords = questions.reduce((sum, q) => {
              const words = [
                q.question_text,
                q.option_a,
                q.option_b,
                q.option_c,
                q.option_d,
                q.explanation
              ].join(" ").split(/\s+/).filter(w => w.trim()).length;
              return sum + words;
            }, 0);

            previews.push({
              quiz_id: quizId,
              quiz_title: firstQuestion.quiz_title,
              difficulty: firstQuestion.difficulty,
              topics: firstQuestion.topics,
              questionCount: questions.length,
              totalWords
            });
            
            statusMap[quizId] = "published";
          });
          setPreview(previews);
          setQuizStatuses(statusMap);
        }
      }
    });
  };

  const handleImport = async () => {
    if (!file) return;

    setImporting(true);
    const formData = new FormData();
    formData.append("file", file);
    formData.append("statuses", JSON.stringify(quizStatuses));

    try {
      const response = await fetch("/api/admin/quizzes/bulk-import", {
        method: "POST",
        body: formData
      });

      if (response.ok) {
        const data = await response.json();
        setImportResult(data);
        setFile(null);
        setPreview([]);
        setQuizStatuses({});
      } else {
        const error = await response.json();
        alert(`Import failed: ${error.error}`);
      }
    } catch (error) {
      console.error("Import failed:", error);
      alert("Import failed");
    } finally {
      setImporting(false);
    }
  };

  // Export functions
  const exportAll = async () => {
    setExporting(true);

    try {
      const response = await fetch("/api/admin/quizzes/bulk-export-all");

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: "Unknown error" }));
        throw new Error(errorData.error || `Server error: ${response.status}`);
      }

      const data = await response.json();
      
      if (!data.rows || data.rows.length === 0) {
        alert("No quizzes to export");
        return;
      }
      
      const csv = Papa.unparse(data.rows);
      const csvWithBOM = '\uFEFF' + csv;
      
      const blob = new Blob([csvWithBOM], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `all_quizzes_export_${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      
      alert(`Successfully exported ${data.total || data.rows.length} quizzes with ${data.rows.length} total questions`);
    } catch (error) {
      console.error("Export failed:", error);
      const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
      alert(`Export failed: ${errorMessage}`);
    } finally {
      setExporting(false);
    }
  };

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
          <h1 className="text-3xl font-bold text-gray-800">Bulk Operations</h1>
        </div>

        {/* Tabs */}
        <div className="bg-white/80 backdrop-blur-lg rounded-3xl shadow-xl border border-orange-100 mb-6">
          <div className="flex border-b border-gray-200">
            <button
              onClick={() => setActiveTab("import")}
              className={`flex-1 px-6 py-4 font-semibold transition-colors ${
                activeTab === "import"
                  ? "text-orange-600 border-b-2 border-orange-600"
                  : "text-gray-600 hover:text-orange-600"
              }`}
            >
              <div className="flex items-center justify-center gap-2">
                <Upload className="w-5 h-5" />
                <span>Import Quizzes</span>
              </div>
            </button>
            <button
              onClick={() => setActiveTab("export")}
              className={`flex-1 px-6 py-4 font-semibold transition-colors ${
                activeTab === "export"
                  ? "text-orange-600 border-b-2 border-orange-600"
                  : "text-gray-600 hover:text-orange-600"
              }`}
            >
              <div className="flex items-center justify-center gap-2">
                <Download className="w-5 h-5" />
                <span>Export Quizzes</span>
              </div>
            </button>
          </div>

          <div className="p-8">
            {/* Import Tab Content */}
            {activeTab === "import" && (
              <div className="space-y-6">
                {/* Download Template */}
                <div className="flex items-start gap-4 pb-6 border-b border-gray-200">
                  <div className="p-3 bg-blue-100 rounded-xl">
                    <FileText className="w-6 h-6 text-blue-600" />
                  </div>
                  <div className="flex-1">
                    <h2 className="text-lg font-bold text-gray-800 mb-2">Step 1: Download Template</h2>
                    <p className="text-gray-600 mb-4">
                      Download the CSV template with the correct column structure and an example row.
                    </p>
                    <button
                      onClick={downloadTemplate}
                      className="flex items-center gap-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white font-semibold rounded-xl transition-colors"
                    >
                      <Download className="w-4 h-4" />
                      Download Template CSV
                    </button>
                  </div>
                </div>

                {/* Upload File */}
                <div className="flex items-start gap-4 pb-6 border-b border-gray-200">
                  <div className="p-3 bg-orange-100 rounded-xl">
                    <Upload className="w-6 h-6 text-orange-600" />
                  </div>
                  <div className="flex-1">
                    <h2 className="text-lg font-bold text-gray-800 mb-2">Step 2: Upload Your CSV</h2>
                    <p className="text-gray-600 mb-4">
                      Upload a CSV file with your quiz data. The file will be validated before import.
                    </p>
                    <input
                      type="file"
                      accept=".csv"
                      onChange={handleFileChange}
                      className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-semibold file:bg-orange-50 file:text-orange-700 hover:file:bg-orange-100 cursor-pointer"
                    />
                  </div>
                </div>

                {/* Validation Errors */}
                {validationErrors.length > 0 && (
                  <div className="bg-red-50 border border-red-200 rounded-xl p-6">
                    <div className="flex items-start gap-3 mb-4">
                      <XCircle className="w-6 h-6 text-red-600 flex-shrink-0 mt-0.5" />
                      <div>
                        <h3 className="font-bold text-red-800 mb-2">Validation Errors ({validationErrors.length})</h3>
                        <p className="text-red-700 text-sm mb-3">Please fix these errors before importing:</p>
                        <ul className="list-disc list-inside space-y-1 text-sm text-red-700 max-h-60 overflow-y-auto">
                          {validationErrors.map((error, i) => (
                            <li key={i}>{error}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>
                )}

                {/* Preview */}
                {preview.length > 0 && (
                  <>
                    <div className="flex items-start gap-4 pb-4">
                      <div className="p-3 bg-green-100 rounded-xl">
                        <CheckCircle className="w-6 h-6 text-green-600" />
                      </div>
                      <div className="flex-1">
                        <h2 className="text-lg font-bold text-gray-800 mb-2">Step 3: Preview & Confirm</h2>
                        <p className="text-gray-600">
                          Found {preview.length} quiz{preview.length !== 1 ? "es" : ""} to import. Review and confirm below.
                        </p>
                      </div>
                    </div>

                    <div className="space-y-4 max-h-96 overflow-y-auto mb-6">
                      {preview.map((quiz) => (
                        <div key={quiz.quiz_id} className="border border-gray-200 rounded-xl p-4 bg-white">
                          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-3 mb-2">
                            <div className="flex-1">
                              <h3 className="font-bold text-gray-800">{quiz.quiz_title}</h3>
                              <p className="text-sm text-gray-600">ID: {quiz.quiz_id}</p>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="px-3 py-1 bg-orange-100 text-orange-700 text-xs font-semibold rounded-full">
                                {quiz.difficulty}
                              </span>
                              <select
                                value={quizStatuses[quiz.quiz_id] || "published"}
                                onChange={(e) => setQuizStatuses(prev => ({
                                  ...prev,
                                  [quiz.quiz_id]: e.target.value
                                }))}
                                className="px-3 py-1 border border-gray-300 rounded-lg text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-orange-500"
                              >
                                <option value="published">Published</option>
                                <option value="draft">Draft</option>
                              </select>
                            </div>
                          </div>
                          {quiz.topics && (
                            <div className="mb-2">
                              <p className="text-xs text-gray-500 mb-1">Topics:</p>
                              <div className="flex flex-wrap gap-1">
                                {quiz.topics.split(',').map((topic, i) => (
                                  <span key={i} className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded-full">
                                    {topic.trim()}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}
                          <div className="flex gap-4 text-sm text-gray-600">
                            <span>{quiz.questionCount} questions</span>
                            <span>•</span>
                            <span>{quiz.totalWords} total words</span>
                          </div>
                        </div>
                      ))}
                    </div>

                    <button
                      onClick={handleImport}
                      disabled={importing}
                      className="w-full py-4 px-6 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 disabled:from-gray-400 disabled:to-gray-500 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all flex items-center justify-center gap-2"
                    >
                      {importing ? (
                        <>
                          <Loader2 className="w-5 h-5 animate-spin" />
                          Importing...
                        </>
                      ) : (
                        <>
                          <Upload className="w-5 h-5" />
                          Confirm Import
                        </>
                      )}
                    </button>
                  </>
                )}

                {/* Import Result */}
                {importResult && (
                  <div className="border-t border-gray-200 pt-6">
                    <div className="flex items-start gap-4 mb-6">
                      <div className={`p-3 rounded-xl ${importResult.errors > 0 ? "bg-yellow-100" : "bg-green-100"}`}>
                        {importResult.errors > 0 ? (
                          <AlertCircle className="w-6 h-6 text-yellow-600" />
                        ) : (
                          <CheckCircle className="w-6 h-6 text-green-600" />
                        )}
                      </div>
                      <div>
                        <h2 className="text-lg font-bold text-gray-800 mb-2">Import Complete</h2>
                        <div className="space-y-1 text-gray-700">
                          <p className="flex items-center gap-2">
                            <CheckCircle className="w-4 h-4 text-green-600" />
                            <span className="font-semibold">{importResult.created}</span> new quiz{importResult.created !== 1 ? "es" : ""} created
                          </p>
                          <p className="flex items-center gap-2">
                            <AlertCircle className="w-4 h-4 text-yellow-600" />
                            <span className="font-semibold">{importResult.skipped}</span> quiz{importResult.skipped !== 1 ? "es" : ""} skipped
                          </p>
                          {importResult.errors > 0 && (
                            <p className="flex items-center gap-2">
                              <XCircle className="w-4 h-4 text-red-600" />
                              <span className="font-semibold">{importResult.errors}</span> error{importResult.errors !== 1 ? "s" : ""}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>

                    {importResult.details.length > 0 && (
                      <div className="bg-gray-50 rounded-xl p-4 max-h-60 overflow-y-auto">
                        <h3 className="font-semibold text-gray-800 mb-2 text-sm">Details:</h3>
                        <ul className="space-y-1 text-sm text-gray-600">
                          {importResult.details.map((detail, i) => (
                            <li key={i}>• {detail}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Export Tab Content */}
            {activeTab === "export" && (
              <div className="space-y-6">
                {/* Export All */}
                <div>
                  <h2 className="text-lg font-bold text-gray-800 mb-4">Export All Quizzes</h2>
                  <p className="text-gray-600 mb-4">
                    Export all quizzes to a single CSV file.
                  </p>
                  <button
                    onClick={exportAll}
                    disabled={exporting}
                    className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600 disabled:from-gray-400 disabled:to-gray-500 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all"
                  >
                    {exporting ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        Exporting...
                      </>
                    ) : (
                      <>
                        <Download className="w-5 h-5" />
                        Export All Quizzes
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
