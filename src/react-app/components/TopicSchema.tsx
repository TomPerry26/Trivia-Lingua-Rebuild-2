import { Helmet } from "react-helmet-async";
import type { Topic } from "@/data/topics";

interface TopicFAQ {
  question: string;
  answer: string;
}

interface TopicSchemaProps {
  topic: Topic;
  quizCount: number;
  description: string;
  faqs?: TopicFAQ[];
}

export default function TopicSchema({ topic, quizCount, description, faqs = [] }: TopicSchemaProps) {
  const collectionSchema = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    "name": `${topic.name} Spanish Quizzes`,
    "description": description,
    "url": `https://trivialingua.com/es/topic/${topic.slug}`,
    "inLanguage": "es",
    "numberOfItems": quizCount,
    "about": {
      "@type": "Thing",
      "name": topic.name
    },
    "isPartOf": {
      "@type": "WebSite",
      "name": "Trivia Lingua",
      "url": "https://trivialingua.com"
    }
  };

  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": [
      {
        "@type": "ListItem",
        "position": 1,
        "name": "Home",
        "item": "https://trivialingua.com/"
      },
      {
        "@type": "ListItem",
        "position": 2,
        "name": "Quizzes",
        "item": "https://trivialingua.com/quizzes"
      },
      {
        "@type": "ListItem",
        "position": 3,
        "name": topic.name,
        "item": `https://trivialingua.com/es/topic/${topic.slug}`
      }
    ]
  };

  const faqSchema = faqs.length > 0 ? {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": faqs.map(faq => ({
      "@type": "Question",
      "name": faq.question,
      "acceptedAnswer": {
        "@type": "Answer",
        "text": faq.answer
      }
    }))
  } : null;

  return (
    <Helmet>
      <script type="application/ld+json">
        {JSON.stringify(collectionSchema)}
      </script>
      <script type="application/ld+json">
        {JSON.stringify(breadcrumbSchema)}
      </script>
      {faqSchema && (
        <script type="application/ld+json">
          {JSON.stringify(faqSchema)}
        </script>
      )}
    </Helmet>
  );
}
