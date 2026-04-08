import { Helmet } from "react-helmet-async";
import type { Topic } from "@/data/topics";

interface TopicMetaTagsProps {
  topic: Topic;
  description: string;
}

export default function TopicMetaTags({ topic, description }: TopicMetaTagsProps) {
  const title = `${topic.name} Spanish Quizzes - Learn Spanish with ${topic.name} Trivia`;
  const url = `https://trivialingua.com/es/topic/${topic.slug}`;
  
  return (
    <Helmet>
      <title>{title}</title>
      <meta name="description" content={description} />
      
      {/* Open Graph / Facebook */}
      <meta property="og:type" content="website" />
      <meta property="og:url" content={url} />
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      
      {/* Twitter */}
      <meta property="twitter:card" content="summary_large_image" />
      <meta property="twitter:url" content={url} />
      <meta property="twitter:title" content={title} />
      <meta property="twitter:description" content={description} />
      
      {/* Canonical URL */}
      <link rel="canonical" href={url} />
    </Helmet>
  );
}
