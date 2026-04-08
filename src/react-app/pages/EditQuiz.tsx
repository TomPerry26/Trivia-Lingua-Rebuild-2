import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router";
import { ArrowLeft, Plus, Trash2, Loader2, X, ArrowUp, ArrowDown } from "lucide-react";

interface QuestionForm {
  id?: number;
  question_text: string;
  correct_answer: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  explanation: string;
  image_url?: string;
  explanation_image_url?: string;
  question_order?: number;
}

interface Topic {
  id: number;
  name: string;
}

export default function EditQuizPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [title, setTitle] = useState("");
  const [difficulty, setDifficulty] = useState("Beginner");
  const [status, setStatus] = useState<'draft' | 'published'>('published');
  const [availableTopics, setAvailableTopics] = useState<Topic[]>([]);
  const [selectedTopics, setSelectedTopics] = useState<string[]>([]);
  const [topicInput, setTopicInput] = useState("");
  const [questions, setQuestions] = useState<QuestionForm[]>([]);

useEffect(() => {
    // Save the return path when mounting
    const currentParams = new URLSearchParams(window.location.search);
    const returnParams = currentParams.toString();
    const returnPath = returnParams ? `/admin/quizzes?${returnParams}` : "/admin/quizzes";
    sessionStorage.setItem("manageQuizzesReturnPath", returnPath);
  }, []);

  useEffect(() => {
    const fetchQuiz = async () => {
      try {
        // Fetch quiz details
        const quizResponse = await fetch(`/api/admin/quizzes/${id}`);
        if (!quizResponse.ok) {
          throw new Error("Failed to fetch quiz");
        }
        const quizData = await quizResponse.json();
        
        setTitle(quizData.title);
        setDifficulty(quizData.difficulty);
        setStatus(quizData.status || 'published');
        setSelectedTopics(quizData.topics || []);
        setQuestions(quizData.questions || []);
        
        // Fetch available topics
        const topicsResponse = await fetch("/api/topics");
        if (topicsResponse.ok) {
          const topicsData = await topicsResponse.json();
          setAvailableTopics(topicsData);
        }
      } catch (error) {
        console.error("Failed to fetch quiz:", error);
        alert("Failed to load quiz");
        navigate("/admin");
      } finally {
        setLoading(false);
      }
    };

    fetchQuiz();
  }, [id, navigate]);

  const addTopic = (topicName: string) => {
    const trimmed = topicName.trim();
    if (trimmed && !selectedTopics.includes(trimmed)) {
      setSelectedTopics([...selectedTopics, trimmed]);
      setTopicInput("");
      
      if (!availableTopics.find(t => t.name === trimmed)) {
        setAvailableTopics([...availableTopics, { id: -1, name: trimmed }]);
      }
    }
  };

  const removeTopic = (topicName: string) => {
    setSelectedTopics(selectedTopics.filter(t => t !== topicName));
  };

  const addQuestion = () => {
    setQuestions([
      ...questions,
      {
        question_text: "",
        correct_answer: "",
        option_a: "",
        option_b: "",
        option_c: "",
        option_d: "",
        explanation: "",
        image_url: "",
        explanation_image_url: "",
      },
    ]);
  };

  const removeQuestion = (index: number) => {
    setQuestions(questions.filter((_, i) => i !== index));
  };

  const moveQuestionUp = (index: number) => {
    if (index === 0) return;
    const newQuestions = [...questions];
    [newQuestions[index - 1], newQuestions[index]] = [newQuestions[index], newQuestions[index - 1]];
    setQuestions(newQuestions);
  };

  const moveQuestionDown = (index: number) => {
    if (index === questions.length - 1) return;
    const newQuestions = [...questions];
    [newQuestions[index], newQuestions[index + 1]] = [newQuestions[index + 1], newQuestions[index]];
    setQuestions(newQuestions);
  };

  const updateQuestion = (
    index: number,
    field: keyof QuestionForm,
    value: string
  ) => {
    const newQuestions = [...questions];
    (newQuestions[index] as any)[field] = value;
    setQuestions(newQuestions);
  };

  const isCorrectAnswerValid = (question: QuestionForm): boolean => {
    const options = [
      question.option_a,
      question.option_b,
      question.option_c,
      question.option_d,
    ];
    return options.includes(question.correct_answer);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const response = await fetch(`/api/admin/quizzes/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title,
          difficulty,
          status,
          topics: selectedTopics,
          questions: questions.map((q, index) => ({
            id: q.id,
            question_text: q.question_text,
            correct_answer: q.correct_answer,
            option_a: q.option_a,
            option_b: q.option_b,
            option_c: q.option_c,
            option_d: q.option_d,
            explanation: q.explanation,
            image_url: q.image_url || null,
            explanation_image_url: q.explanation_image_url || null,
            question_order: index + 1,
          })),
        }),
      });

      if (response.ok) {
        alert("Quiz updated successfully!");
        // Preserve the search params from when we came to this page
        const returnPath = sessionStorage.getItem("manageQuizzesReturnPath") || "/admin/quizzes";
        sessionStorage.removeItem("manageQuizzesReturnPath");
        navigate(returnPath);
      } else {
        alert("Error updating quiz");
      }
    } catch (error) {
      console.error("Failed to update quiz:", error);
      alert("Error updating quiz");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-amber-50 to-orange-100">
        <div className="animate-spin">
          <Loader2 className="w-10 h-10 text-orange-500" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-red-50 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <button
            onClick={() => {
              const returnPath = sessionStorage.getItem("manageQuizzesReturnPath") || "/admin/quizzes";
              sessionStorage.removeItem("manageQuizzesReturnPath");
              navigate(returnPath);
            }}
            className="flex items-center gap-2 text-gray-600 hover:text-orange-600 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            <span>Back to Manage Quizzes</span>
          </button>
          <h1 className="text-3xl font-bold text-gray-800">Edit Quiz</h1>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Quiz Info */}
          <div className="bg-white/80 backdrop-blur-lg rounded-3xl shadow-xl p-8 border border-orange-100">
            <h2 className="text-xl font-bold text-gray-800 mb-6">
              Quiz Information
            </h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Title
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500"
                  placeholder="e.g., Animals"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Difficulty
                </label>
                <select
                  value={difficulty}
                  onChange={(e) => setDifficulty(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500"
                >
                  <option value="Superbeginner">Superbeginner</option>
                  <option value="Beginner">Beginner</option>
                  <option value="Intermediate">Intermediate</option>
                  <option value="Advanced">Advanced</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Status
                </label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as 'draft' | 'published')}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500"
                >
                  <option value="published">Published</option>
                  <option value="draft">Draft</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Topics (Tags)
                </label>
                <div className="flex gap-2 mb-2">
                  <input
                    type="text"
                    value={topicInput}
                    onChange={(e) => setTopicInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        addTopic(topicInput);
                      }
                    }}
                    className="flex-1 px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500"
                    placeholder="Type a topic and press Enter"
                    list="topic-suggestions"
                  />
                  <datalist id="topic-suggestions">
                    {availableTopics.map((t) => (
                      <option key={t.id} value={t.name} />
                    ))}
                  </datalist>
                  <button
                    type="button"
                    onClick={() => addTopic(topicInput)}
                    className="px-4 py-3 bg-orange-500 hover:bg-orange-600 text-white font-semibold rounded-xl transition-colors"
                  >
                    Add
                  </button>
                </div>
                {selectedTopics.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {selectedTopics.map((t) => (
                      <span
                        key={t}
                        className="inline-flex items-center gap-1 px-3 py-1 bg-orange-100 text-orange-700 rounded-full text-sm font-semibold"
                      >
                        {t}
                        <button
                          type="button"
                          onClick={() => removeTopic(t)}
                          className="hover:bg-orange-200 rounded-full p-0.5 transition-colors"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Questions */}
          {questions.map((question, index) => (
            <div
              key={index}
              className="bg-white/80 backdrop-blur-lg rounded-3xl shadow-xl p-8 border border-orange-100"
            >
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                  <h3 className="text-xl font-bold text-gray-800">
                    Question {index + 1}
                  </h3>
                  <div className="flex gap-1">
                    <button
                      type="button"
                      onClick={() => moveQuestionUp(index)}
                      disabled={index === 0}
                      className={`p-1 rounded-lg ${
                        index === 0
                          ? 'text-gray-300 cursor-not-allowed'
                          : 'text-orange-600 hover:bg-orange-50'
                      }`}
                      title="Move up"
                    >
                      <ArrowUp className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => moveQuestionDown(index)}
                      disabled={index === questions.length - 1}
                      className={`p-1 rounded-lg ${
                        index === questions.length - 1
                          ? 'text-gray-300 cursor-not-allowed'
                          : 'text-orange-600 hover:bg-orange-50'
                      }`}
                      title="Move down"
                    >
                      <ArrowDown className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                {questions.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeQuestion(index)}
                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                )}
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Question
                  </label>
                  <input
                    type="text"
                    value={question.question_text}
                    onChange={(e) =>
                      updateQuestion(index, "question_text", e.target.value)
                    }
                    required
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Image URL (optional)
                  </label>
                  <input
                    type="url"
                    value={question.image_url || ""}
                    onChange={(e) =>
                      updateQuestion(index, "image_url", e.target.value)
                    }
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500"
                    placeholder="https://example.com/image.jpg"
                  />
                  {question.image_url && (
                    <div className="mt-2">
                      <img
                        src={question.image_url}
                        alt="Question preview"
                        className="max-w-full h-auto rounded-lg border border-gray-200"
                        style={{ maxHeight: "200px" }}
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = "none";
                        }}
                      />
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Option A
                    </label>
                    <input
                      type="text"
                      value={question.option_a}
                      onChange={(e) =>
                        updateQuestion(index, "option_a", e.target.value)
                      }
                      required
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Option B
                    </label>
                    <input
                      type="text"
                      value={question.option_b}
                      onChange={(e) =>
                        updateQuestion(index, "option_b", e.target.value)
                      }
                      required
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Option C
                    </label>
                    <input
                      type="text"
                      value={question.option_c}
                      onChange={(e) =>
                        updateQuestion(index, "option_c", e.target.value)
                      }
                      required
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Option D
                    </label>
                    <input
                      type="text"
                      value={question.option_d}
                      onChange={(e) =>
                        updateQuestion(index, "option_d", e.target.value)
                      }
                      required
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Correct Answer
                  </label>
                  <input
                    type="text"
                    value={question.correct_answer}
                    onChange={(e) =>
                      updateQuestion(index, "correct_answer", e.target.value)
                    }
                    required
                    className={`w-full px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 ${
                      question.correct_answer && !isCorrectAnswerValid(question)
                        ? "border-red-500 bg-red-50 focus:ring-red-500"
                        : "border-gray-300 focus:ring-orange-500"
                    }`}
                    placeholder="Must match exactly one of the options"
                  />
                  {question.correct_answer && !isCorrectAnswerValid(question) && (
                    <div className="mt-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                      <p className="text-sm text-red-700 font-semibold">
                        ⚠️ Warning: Correct Answer doesn't match any option exactly
                      </p>
                      <p className="text-xs text-red-600 mt-1">
                        Make sure it matches one of the options above, including spaces and capitalization
                      </p>
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Explanation
                  </label>
                  <textarea
                    value={question.explanation}
                    onChange={(e) =>
                      updateQuestion(index, "explanation", e.target.value)
                    }
                    required
                    rows={6}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500"
                    placeholder="Write a clear explanation in Spanish..."
                  />
                  <p className="text-sm text-gray-500 mt-1">
                    Question word count:{" "}
                    {question.question_text.split(/\s+/).filter((w) => w.trim())
                      .length +
                      question.option_a.split(/\s+/).filter((w) => w.trim())
                        .length +
                      question.option_b.split(/\s+/).filter((w) => w.trim())
                        .length +
                      question.option_c.split(/\s+/).filter((w) => w.trim())
                        .length +
                      question.option_d.split(/\s+/).filter((w) => w.trim())
                        .length +
                      question.explanation.split(/\s+/).filter((w) => w.trim())
                        .length}{" "}
                    words (question + options + explanation)
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Explanation Image URL (optional)
                  </label>
                  <input
                    type="url"
                    value={question.explanation_image_url || ""}
                    onChange={(e) =>
                      updateQuestion(index, "explanation_image_url", e.target.value)
                    }
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500"
                    placeholder="https://example.com/explanation-image.jpg"
                  />
                  {question.explanation_image_url && (
                    <div className="mt-2">
                      <img
                        src={question.explanation_image_url}
                        alt="Explanation preview"
                        className="max-w-full h-auto rounded-lg border border-gray-200"
                        style={{ maxHeight: "200px" }}
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = "none";
                        }}
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}

          {/* Add Question Button */}
          <button
            type="button"
            onClick={addQuestion}
            className="w-full py-4 px-6 bg-white hover:bg-gray-50 text-gray-700 font-semibold rounded-xl border-2 border-dashed border-gray-300 hover:border-orange-300 transition-all flex items-center justify-center gap-2"
          >
            <Plus className="w-5 h-5" />
            Add Question
          </button>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={submitting}
            className="w-full py-4 px-6 bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 disabled:from-gray-400 disabled:to-gray-500 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all flex items-center justify-center gap-2"
          >
            {submitting ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Updating...
              </>
            ) : (
              "Update Quiz"
            )}
          </button>
        </form>

        {/* Floating Update Button */}
        <button
          onClick={handleSubmit}
          disabled={submitting}
          className="fixed bottom-6 right-6 p-4 bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 disabled:from-gray-400 disabled:to-gray-500 text-white font-semibold rounded-full shadow-2xl hover:shadow-3xl transition-all z-50 flex items-center gap-2"
          title="Update Quiz"
        >
          {submitting ? (
            <Loader2 className="w-6 h-6 animate-spin" />
          ) : (
            <span className="whitespace-nowrap">Update Quiz</span>
          )}
        </button>
      </div>
    </div>
  );
}
