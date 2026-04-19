import { useEffect } from "react";
import { OG_IMAGE_URL } from "@/react-app/lib/site";

interface Question {
  id: number;
  word_count: number;
}

interface Quiz {
  id: number;
  title: string;
  topic: string;
  difficulty: string;
  questions: Question[];
}

interface QuizSchemaProps {
  quiz: Quiz;
}

export default function QuizSchema({ quiz }: QuizSchemaProps) {
  useEffect(() => {
    // Calculate time required (30 seconds per question)
    const totalSeconds = quiz.questions.length * 30;
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    const timeRequired = seconds > 0 ? `PT${minutes}M${seconds}S` : `PT${minutes}M`;

    // Generate description with proper article (A/An)
    const startsWithVowel = /^[aeiouAEIOU]/.test(quiz.difficulty);
    const article = startsWithVowel ? "An" : "A";
    const description = `${article} ${quiz.difficulty} level Spanish quiz about ${quiz.title}. Test your knowledge with ${quiz.questions.length} questions.`;

    // Generate assesses value
    const assesses = `Spanish vocabulary and ${quiz.topic} knowledge`;

    const schemaData = {
      "@context": "https://schema.org",
      "@type": "Quiz",
      "name": quiz.title,
      "description": description,
      "educationalLevel": quiz.difficulty,
      "numberOfQuestions": quiz.questions.length,
      "timeRequired": timeRequired,
      "inLanguage": "es-ES",
      "assesses": assesses,
      "image": OG_IMAGE_URL
    };

    // Create script element
    const script = document.createElement("script");
    script.type = "application/ld+json";
    script.text = JSON.stringify(schemaData);
    script.id = "quiz-schema";

    // Add to head
    document.head.appendChild(script);

    // Cleanup on unmount
    return () => {
      const existingScript = document.getElementById("quiz-schema");
      if (existingScript) {
        existingScript.remove();
      }
    };
  }, [quiz]);

  return null;
}
