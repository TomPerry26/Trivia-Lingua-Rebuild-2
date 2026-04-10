import { HashRouter as Router, Routes, Route, Navigate } from "react-router";
import { AuthProvider } from "@/react-app/contexts/AuthContext";
import { QueryClientProvider } from "@tanstack/react-query";
import { HelmetProvider } from "react-helmet-async";
import { lazy, Suspense } from "react";
import { Loader2 } from "lucide-react";
import Layout from "@/react-app/components/Layout";
import { ProtectedRoute } from "@/react-app/components/ProtectedRoute";
import { AdminRoute } from "@/react-app/components/AdminRoute";
import { queryClient } from "@/react-app/lib/queryClient";

// Priority pages - loaded immediately for fast initial render
import InicioPage from "@/react-app/pages/Inicio";
import QuizzesPage from "@/react-app/pages/Quizzes";
import ProgressPage from "@/react-app/pages/Progress";
import LoginPage from "@/react-app/pages/Login";
import AuthCallbackPage from "@/react-app/pages/AuthCallback";
import PrivacyPage from "@/react-app/pages/Privacy";

// Lazy loaded pages - split into separate chunks
const ProfilePage = lazy(() => import("@/react-app/pages/Profile"));
const QuizPage = lazy(() => import("@/react-app/pages/Quiz"));
const ContactPage = lazy(() => import("@/react-app/pages/Contact"));
const AboutPage = lazy(() => import("@/react-app/pages/About"));
const BlogPage = lazy(() => import("@/react-app/pages/Blog"));
const BlogPostPage = lazy(() => import("@/react-app/pages/BlogPost"));
const TopicPage = lazy(() => import("@/react-app/pages/Topic"));
const DifficultyPage = lazy(() => import("@/react-app/pages/Difficulty"));

// Admin pages - lazy loaded since only used by admins
const DashboardPage = lazy(() => import("@/react-app/pages/Dashboard"));
const ManageQuizzesPage = lazy(() => import("@/react-app/pages/ManageQuizzes"));
const BulkOperationsPage = lazy(() => import("@/react-app/pages/BulkOperations"));

const EditQuizPage = lazy(() => import("@/react-app/pages/EditQuiz"));
const UserFeedbackAdminPage = lazy(() => import("@/react-app/pages/UserFeedbackAdmin"));
const UserDataExportPage = lazy(() => import("@/react-app/pages/UserDataExport"));

// Loading fallback component
function LoadingFallback() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-red-50">
      <div className="animate-spin">
        <Loader2 className="w-10 h-10 text-orange-500" />
      </div>
    </div>
  );
}

export default function App() {
  return (
    <HelmetProvider>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <Router>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/privacy" element={<PrivacyPage />} />
          <Route path="/auth/callback" element={<AuthCallbackPage />} />
          
          {/* Priority routes - no lazy loading */}
          <Route path="/" element={<Layout><InicioPage /></Layout>} />
          <Route path="/quizzes" element={<Layout><QuizzesPage /></Layout>} />
          <Route path="/progress" element={<Layout><ProgressPage /></Layout>} />
          
          {/* Lazy loaded routes with Layout */}
          <Route path="/profile" element={
            <ProtectedRoute>
              <Layout>
                <Suspense fallback={<LoadingFallback />}>
                  <ProfilePage />
                </Suspense>
              </Layout>
            </ProtectedRoute>
          } />
          <Route path="/contact" element={
            <ProtectedRoute>
              <Layout>
                <Suspense fallback={<LoadingFallback />}>
                  <ContactPage />
                </Suspense>
              </Layout>
            </ProtectedRoute>
          } />
          <Route path="/about" element={
            <Layout>
              <Suspense fallback={<LoadingFallback />}>
                <AboutPage />
              </Suspense>
            </Layout>
          } />
          
          {/* Blog routes - accessible to guests */}
          <Route path="/blog" element={
            <Layout>
              <Suspense fallback={<LoadingFallback />}>
                <BlogPage />
              </Suspense>
            </Layout>
          } />
          <Route path="/blog/:slug" element={
            <Layout>
              <Suspense fallback={<LoadingFallback />}>
                <BlogPostPage />
              </Suspense>
            </Layout>
          } />
          
          {/* Quiz page - lazy loaded, accessible to guests */}
          <Route path="/quiz/:id" element={
            <Suspense fallback={<LoadingFallback />}>
              <QuizPage />
            </Suspense>
          } />
          
          {/* Slug-based quiz URL */}
          <Route path="/es/quiz/:slugWithId" element={
            <Suspense fallback={<LoadingFallback />}>
              <QuizPage />
            </Suspense>
          } />
          
          {/* Topic landing pages - accessible to guests */}
          <Route path="/es/topic/:slug" element={
            <Layout>
              <Suspense fallback={<LoadingFallback />}>
                <TopicPage />
              </Suspense>
            </Layout>
          } />
          
          {/* Difficulty landing pages - accessible to guests */}
          <Route path="/es/:slug" element={
            <Layout>
              <Suspense fallback={<LoadingFallback />}>
                <DifficultyPage />
              </Suspense>
            </Layout>
          } />
          
          {/* Admin routes - all lazy loaded, protected by AdminRoute */}
          <Route path="/admin/dashboard" element={
            <AdminRoute>
              <Suspense fallback={<LoadingFallback />}>
                <DashboardPage />
              </Suspense>
            </AdminRoute>
          } />
          <Route path="/admin/quizzes" element={
            <AdminRoute>
              <Suspense fallback={<LoadingFallback />}>
                <ManageQuizzesPage />
              </Suspense>
            </AdminRoute>
          } />
          <Route path="/admin/bulk-operations" element={
            <AdminRoute>
              <Suspense fallback={<LoadingFallback />}>
                <BulkOperationsPage />
              </Suspense>
            </AdminRoute>
          } />

          <Route path="/admin/user-feedback" element={
            <AdminRoute>
              <Suspense fallback={<LoadingFallback />}>
                <UserFeedbackAdminPage />
              </Suspense>
            </AdminRoute>
          } />
          <Route path="/admin/user-data-export" element={
            <AdminRoute>
              <Suspense fallback={<LoadingFallback />}>
                <UserDataExportPage />
              </Suspense>
            </AdminRoute>
          } />
          <Route path="/admin/edit/:id" element={
            <AdminRoute>
              <Suspense fallback={<LoadingFallback />}>
                <EditQuizPage />
              </Suspense>
            </AdminRoute>
          } />
          
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
          </Router>
        </AuthProvider>
      </QueryClientProvider>
    </HelmetProvider>
  );
}
