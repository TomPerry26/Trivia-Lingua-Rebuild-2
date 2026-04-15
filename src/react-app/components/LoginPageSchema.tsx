import { useEffect } from "react";
import { OG_IMAGE_URL, SITE_URL } from "@/react-app/lib/site";

export default function LoginPageSchema() {
  useEffect(() => {
    const schemaData = {
      "@context": "https://schema.org",
      "@type": "WebApplication",
      "name": "Trivia Lingua",
      "applicationCategory": "EducationalApplication",
      "description": "Learn Spanish through fun daily trivia quizzes about topics you love. Practice reading comprehension with quizzes about Harry Potter, Marvel, music, geography, and more. Track your progress and build daily streaks.",
      "url": SITE_URL,
      "image": OG_IMAGE_URL,
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
