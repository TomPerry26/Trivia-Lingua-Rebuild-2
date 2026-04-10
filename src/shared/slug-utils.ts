/**
 * Generates a URL-friendly slug from a quiz title
 * 
 * @param title - The quiz title to convert to a slug
 * @param maxWords - Maximum number of words to include (default: 5)
 * @returns A slug string suitable for URLs
 * 
 * @example
 * generateSlug("Harry Potter Quotes and Famous Lines") 
 * // Returns: "harry-potter-quotes-famous-lines"
 * 
 * generateSlug("¿Qué tan bien conoces a Taylor Swift?")
 * // Returns: "que-tan-bien-conoces-taylor"
 */
export function generateSlug(title: string, maxWords: number = 5): string {
  return title
    .toLowerCase()
    // Remove accents and special characters
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    // Replace non-alphanumeric characters (except spaces) with nothing
    .replace(/[^a-z0-9\s-]/g, '')
    // Replace multiple spaces or hyphens with a single hyphen
    .replace(/[\s-]+/g, '-')
    // Remove leading/trailing hyphens
    .replace(/^-+|-+$/g, '')
    // Limit to maxWords
    .split('-')
    .slice(0, maxWords)
    .join('-');
}

/**
 * Constructs a full quiz URL path with language prefix and slug
 * Can accept either a slug string or a quiz object
 * 
 * @param slugOrQuiz - The quiz slug string (including ID), or a quiz object with id and optional url_slug
 * @param language - Language code (default: 'es')
 * @returns The full URL path
 * 
 * @example
 * buildQuizUrl("harry-potter-quotes-387")
 * // Returns: "/es/quiz/harry-potter-quotes-387"
 * 
 * buildQuizUrl({ id: 387, url_slug: "harry-potter-quotes-387" })
 * // Returns: "/es/quiz/harry-potter-quotes-387"
 * 
 * buildQuizUrl({ id: 387, title: "Harry Potter Quotes" })
 * // Returns: "/quiz/387" (fallback when no slug)
 */
export function buildQuizUrl(
  slugOrQuiz: string | { id: number; url_slug?: string | null; title?: string },
  language: string = 'es'
): string {
  // Handle quiz object
  if (typeof slugOrQuiz === 'object') {
    const quiz = slugOrQuiz;
    if (quiz.url_slug) {
      // Ensure slug includes trailing numeric ID for reliable route parsing.
      const hasTrailingId = /-\d+$/.test(quiz.url_slug);
      const normalizedSlug = hasTrailingId ? quiz.url_slug : `${quiz.url_slug}-${quiz.id}`;
      return `/${language}/quiz/${normalizedSlug}`;
    }
    // Fallback to old format if no slug
    return `/quiz/${quiz.id}`;
  }
  
  // Handle slug string
  const slug = slugOrQuiz;
  return `/${language}/quiz/${slug}`;
}

/**
 * Extracts the quiz ID from a slug-based URL parameter
 * 
 * @param slugWithId - The slug with ID appended (e.g., "harry-potter-quotes-387")
 * @returns The numeric quiz ID, or null if not found
 * 
 * @example
 * extractIdFromSlug("harry-potter-quotes-387")
 * // Returns: 387
 */
export function extractIdFromSlug(slugWithId: string): number | null {
  const parts = slugWithId.split('-');
  const lastPart = parts[parts.length - 1];
  const id = parseInt(lastPart, 10);
  return isNaN(id) ? null : id;
}
