import { Helmet } from "react-helmet-async";

export default function AboutMetaTags() {
  const title = "About Trivia Lingua | Learn Spanish Through Fun Trivia Quizzes";
  const description = "Learn how Trivia Lingua helps you learn Spanish through comprehensible input. Daily trivia quizzes on Harry Potter, Marvel, Taylor Swift, and more. All levels from superbeginner to advanced.";
  const url = "https://www.trivialingua.com/about";
  const imageUrl = "https://019b272f-a125-73ff-b876-e31472c7c4fa.mochausercontent.com/Open-Graph-(Home-1200).jpg";

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
