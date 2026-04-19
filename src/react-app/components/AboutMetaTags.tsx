import { Helmet } from "react-helmet-async";
import { OG_IMAGE_URL, SITE_URL } from "@/react-app/lib/site";

export default function AboutMetaTags() {
  const title = "About Trivia Lingua | Learn Spanish Through Fun Trivia Quizzes";
  const description = "Learn how Trivia Lingua helps you learn Spanish through comprehensible input. Daily trivia quizzes on Harry Potter, Marvel, Taylor Swift, and more. All levels from superbeginner to advanced.";
  const url = `${SITE_URL}/about`;
  const imageUrl = OG_IMAGE_URL;

  return (
    <Helmet>
      <title>{title}</title>
      <meta name="description" content={description} />
      
      {/* Open Graph */}
      <meta property="og:type" content="website" />
      <meta property="og:url" content={url} />
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:image" content={imageUrl} />
      
      {/* Twitter Card */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:url" content={url} />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={imageUrl} />
    </Helmet>
  );
}
