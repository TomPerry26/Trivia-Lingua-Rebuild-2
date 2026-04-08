import { Helmet } from "react-helmet-async";

interface DifficultyMetaTagsProps {
  title: string;
  description: string;
  slug: string;
}

export function DifficultyMetaTags({ title, description, slug }: DifficultyMetaTagsProps) {
  const canonicalUrl = `https://trivialingua.com/es/${slug}`;

  return (
    <Helmet>
      <title>{title} | Trivia Lingua</title>
      <meta name="description" content={description} />
      <link rel="canonical" href={canonicalUrl} />
      
      {/* Open Graph */}
      <meta property="og:title" content={`${title} | Trivia Lingua`} />
      <meta property="og:description" content={description} />
      <meta property="og:url" content={canonicalUrl} />
      <meta property="og:type" content="website" />
      
      {/* Twitter */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={`${title} | Trivia Lingua`} />
      <meta name="twitter:description" content={description} />
    </Helmet>
  );
}
