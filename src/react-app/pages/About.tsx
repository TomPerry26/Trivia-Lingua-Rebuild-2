import { Link } from "react-router";
import { ChevronLeft, ChevronDown, ChevronUp, Coffee } from "lucide-react";
import { useState, useEffect } from "react";
import AboutMetaTags from "@/react-app/components/AboutMetaTags";
import AboutPageSchema from "@/react-app/components/AboutPageSchema";

export default function AboutPage() {
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const faqs = [
    {
      question: "How does Trivia Lingua help you learn Spanish?",
      answer: "Pure comprehensible input. No explicit grammar or translations."
    },
    {
      question: "Why use trivia quizzes to learn Spanish?",
      answer: "Short, interactive quizzes make reading feel like play instead of homework. Familiar topics (film, music, geography) provide context to guess meanings naturally, while tracking words/streaks keeps you motivated."
    },
    {
      question: "What Spanish levels (A1, A2, B1, B2) does Trivia Lingua cover?",
      answer: "There are currently three levels:\n• Superbeginner (~A1)\n• Beginner (~A2)\n• Intermediate (~B1)\n\nStart with what feels comfortable!\n\nRemember each level is a spectrum: easier beginner quizzes, for example, would lean towards A1, harder ones towards B1. If a quiz feels too difficult, simply come back later—it's a great way to measure progress!\n\nAdvanced (~B2) quizzes will be available in the future."
    },
    {
      question: "Will Trivia Lingua teach other languages besides Spanish?",
      answer: "Yes! The initial focus is expanding Spanish content across the full spectrum (A1 to B2+), taking you from your first words to native-level material. In the future, other languages will be added under the Trivia Lingua brand."
    },
    {
      question: "How many Spanish quizzes are added daily?",
      answer: "You can expect 3-5 new trivia quizzes every single day, including weekends, so you can practice your Spanish reading daily."
    },
    {
      question: "Can I request topics for quizzes?",
      answer: "Absolutely—use the in-app feedback form to suggest topics. We'd love to hear your ideas!"
    },
    {
      question: "What's the best way to support Trivia Lingua?",
      answer: "The biggest way you can help right now is by spreading the word!\n• Tell friends, family or classmates learning Spanish\n• Share your progress or favourite quizzes on Reddit, Discord or social media\n• Recommend it in language learning communities\n\nIf you're really enjoying the daily quizzes and want to help add even more quizzes faster (new topics, levels and more), you can also buy me a coffee ☕ – entirely optional but hugely appreciated.",
      hasKofiButton: true
    },
    {
      question: "Is Trivia Lingua free or paid?",
      answer: "The core app and a large library of quizzes will always remain completely free and accessible to everyone.\n\nAs the platform grows, I plan to add an optional premium subscription to help sustain daily updates and new features. Premium would unlock things like:\n• Full access to the entire quiz library\n• More daily updates\n• Extra features\n\nIf you'd like to support faster growth now, you can buy me a coffee ☕ – entirely optional but hugely appreciated!",
      hasKofiButton: true
    },
    {
      question: "How do I report bugs or suggest features?",
      answer: "The platform is currently in beta, so occasional bugs are possible. Please report them via the in-app Feedback button."
    },
    {
      question: "Is my data safe?",
      answer: "We only collect what's needed: Google profile for login, quiz progress for stats. No ads, no selling data.",
      hasPrivacyLink: true
    },
    {
      question: "Do I need a Google account to log in?",
      answer: "Yes, at the moment Trivia Lingua uses \"Sign in with Google\" for login.\n\nBut don't worry — you do not need a Gmail address!\n\nAny email address linked to a Google Account works (for example, your YouTube, work, or personal non-Gmail email). If you already use Google services with that email, you're good to go."
    },
    {
      question: "Can I download Trivia Lingua as a mobile app?",
      answer: "Yes—it's a progressive web app (PWA). You can install it on both iOS and Android for a native-like experience. Instructions are available on your Profile page."
    },
    {
      question: "What's the long-term vision for Trivia Lingua?",
      answer: "To become the go-to reading companion for immersion language learners worldwide—the \"Dreaming Spanish for reading.\" Starting with Spanish, the roadmap includes superbeginner to advanced levels, then expansion to other languages (French, Italian, German and beyond). Ultimately: thousands of quizzes, millions of words, varied question formats, optional audio, deeper analytics, community challenges, leaderboards, and more. If this is helping your journey, your feedback—and support—will directly shape the future."
    }
  ];

  const toggleFaq = (index: number) => {
    setOpenFaq(openFaq === index ? null : index);
  };

  return (
    <>
      <AboutMetaTags />
      <AboutPageSchema />
      <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-red-50">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Back Button */}
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-orange-600 hover:text-orange-700 font-semibold mb-6"
        >
          <ChevronLeft className="w-5 h-5" />
          Back to Home
        </Link>

        {/* About Section */}
        <div className="bg-white rounded-2xl shadow-lg p-8 mb-8">
          <h1 className="text-4xl font-bold text-gray-800 mb-6">About</h1>
          <p className="text-gray-700 leading-relaxed text-lg">
            Trivia Lingua is a platform for learning Spanish through massive, enjoyable reading. 
            It delivers comprehensible input via fun, addictive trivia quizzes on topics you love: 
            Harry Potter, Marvel, football, history, Taylor Swift, geography, Star Wars, and much more.
          </p>
          <p className="text-gray-700 leading-relaxed text-lg mt-4">
            No grammar rules, no lookups required—just fun questions in carefully graded Spanish. 
            Track every word you read, build streaks and log external reading. New quizzes added daily.
          </p>
          <p className="text-gray-700 leading-relaxed text-lg mt-4">
            Built by a fellow immersion learner who wanted reading to feel as effortless as Dreaming Spanish made listening.
          </p>
        </div>

        {/* FAQ Section */}
        <div className="bg-white rounded-2xl shadow-lg p-8">
          <h2 className="text-3xl font-bold text-gray-800 mb-6">FAQ</h2>
          <div className="space-y-4">
            {faqs.map((faq, index) => (
              <div
                key={index}
                className="border-2 border-gray-200 rounded-xl overflow-hidden"
              >
                <button
                  onClick={() => toggleFaq(index)}
                  className="w-full px-6 py-4 flex items-center justify-between bg-white hover:bg-orange-50 transition-colors"
                >
                  <span className="font-semibold text-gray-800 text-left">
                    {faq.question}
                  </span>
                  {openFaq === index ? (
                    <ChevronUp className="w-5 h-5 text-orange-600 flex-shrink-0 ml-4" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-orange-600 flex-shrink-0 ml-4" />
                  )}
                </button>
                {openFaq === index && (
                  <div className="px-6 py-4 bg-orange-50 border-t-2 border-gray-200">
                    <p className="text-gray-700 leading-relaxed whitespace-pre-line">
                      {faq.answer}
                    </p>
                    {faq.hasPrivacyLink && (
                      <p className="text-gray-700 mt-2">
                        See our{" "}
                        <Link to="/privacy" className="text-orange-600 hover:text-orange-700 font-semibold underline">
                          Privacy Policy
                        </Link>
                        {" "}for details.
                      </p>
                    )}
                    {faq.hasKofiButton && (
                      <a
                        href="https://ko-fi.com/trivialingua"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 mt-4 px-6 py-3 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-bold rounded-xl shadow-lg transition-all"
                      >
                        <Coffee className="w-5 h-5" />
                        Buy me a coffee
                      </a>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
      </div>
    </>
  );
}
