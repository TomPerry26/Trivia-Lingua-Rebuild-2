import { Helmet } from "react-helmet-async";

interface DifficultySchemaProps {
  title: string;
  description: string;
  slug: string;
  cefrLevel: string;
}

export function DifficultySchema({ title, description, slug, cefrLevel }: DifficultySchemaProps) {
  const schema = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    "name": title,
    "description": description,
    "url": `https://trivialingua.com/es/${slug}`,
    "inLanguage": "es",
    "educationalLevel": cefrLevel,
    "about": {
      "@type": "Thing",
      "name": "Spanish Language Learning",
      "description": `${cefrLevel} level Spanish language learning through interactive quizzes`
    }
  };

  return (
    <Helmet>
      <script type="application/ld+json">
        {JSON.stringify(schema)}
      </script>
    </Helmet>
  );
}
