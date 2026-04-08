import { useState, useEffect } from "react";
import { Helmet } from "react-helmet-async";
import { Link } from "react-router";
import { Loader2, Calendar, User } from "lucide-react";

interface BlogPost {
  id: number;
  slug: string;
  title: string;
  excerpt: string;
  author: string | null;
  published_at: string;
}

export default function Blog() {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPosts = async () => {
      try {
        const response = await fetch("/api/blog");
        if (response.ok) {
          const data = await response.json();
          setPosts(data);
        }
      } catch (error) {
        console.error("Error fetching blog posts:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchPosts();
  }, []);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", { 
      year: "numeric", 
      month: "long", 
      day: "numeric" 
    });
  };

  return (
    <>
      <Helmet>
        <title>Blog - Trivia Lingua</title>
        <meta name="description" content="Insights, tips, and stories about learning Spanish through trivia quizzes. Discover effective language learning strategies and cultural insights." />
      </Helmet>

      <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-red-50">
        <div className="max-w-4xl mx-auto px-4 py-12">
          {/* Header */}
          <div className="text-center mb-12">
            <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
              Blog
            </h1>
            <p className="text-lg text-gray-700 max-w-2xl mx-auto">
              Insights, tips, and stories about learning Spanish through trivia
            </p>
          </div>

          {/* Loading State */}
          {loading && (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
            </div>
          )}

          {/* Blog Posts */}
          {!loading && posts.length > 0 && (
            <div className="space-y-8">
              {posts.map((post) => (
                <Link
                  key={post.id}
                  to={`/blog/${post.slug}`}
                  className="block bg-white rounded-xl shadow-md hover:shadow-lg transition-shadow p-8 border border-gray-100"
                >
                  <h2 className="text-2xl font-bold text-gray-900 mb-3 hover:text-orange-600 transition-colors">
                    {post.title}
                  </h2>
                  <p className="text-gray-700 mb-4 leading-relaxed">
                    {post.excerpt}
                  </p>
                  <div className="flex items-center gap-6 text-sm text-gray-600">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4" />
                      <span>{formatDate(post.published_at)}</span>
                    </div>
                    {post.author && (
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4" />
                        <span>{post.author}</span>
                      </div>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          )}

          {/* Empty State */}
          {!loading && posts.length === 0 && (
            <div className="text-center py-20">
              <p className="text-gray-600 text-lg">No blog posts yet. Check back soon!</p>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
