import { useEffect } from "react";

export default function LoginPageSchema() {
  useEffect(() => {
    const schemaData = {
      "@context": "https://schema.org",
      "@type": "WebApplication",
      "name": "Trivia Lingua",
      "applicationCategory": "EducationalApplication",
      "description": "Learn Spanish through fun daily trivia quizzes about topics you love. Practice reading comprehension with quizzes about Harry Potter, Marvel, music, geography, and more. Track your progress and build daily streaks.",
      "url": "https://k3ssqlqvt37e2.mocha.app",
      "image": "https://019b272f-a125-73ff-b876-e31472c7c4fa.mochausercontent.com/Open-Graph-(Home-1200).jpg",
      "inLanguage": "en",
      "educationalUse": "Spanish language learning and reading practice",
      "offers": {
        "@type": "Offer",
        "price": "0",
        "priceCurrency": "USD"
      },
      "featureList": [
        "Daily Spanish trivia quizzes",
        "Multiple difficulty levels from Superbeginner to Advanced",
        "Progress tracking and streak building",
        "Word count tracking",
        "Quizzes about popular topics: Harry Potter, Marvel, Taylor Swift, geography, film, music",
        "Natural reading practice without grammar drills"
      ]
    };

    const script = document.createElement("script");
    script.type = "application/ld+json";
    script.text = JSON.stringify(schemaData);
    script.id = "login-page-schema";

    document.head.appendChild(script);

    return () => {
      const existingScript = document.getElementById("login-page-schema");
      if (existingScript) {
        existingScript.remove();
      }
    };
  }, []);

  return null;
}
