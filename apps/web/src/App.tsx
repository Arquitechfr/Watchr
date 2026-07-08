import { useEffect, useState } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "./theme/ThemeProvider";
import { Snackbar } from "./components/Snackbar";
import { useAuthStore } from "./store/authStore";
import { queryClient } from "./lib/queryClient";
import { AppLayout } from "./components/layout/AppLayout";
import { ProtectedRoute } from "./hooks/ProtectedRoute";
import { remoteConfigService } from "./services/remoteConfig";

import { LoginPage } from "./pages/LoginPage";
import { RegisterPage } from "./pages/RegisterPage";
import { ForgotPasswordPage } from "./pages/ForgotPasswordPage";
import { ResetPasswordPage } from "./pages/ResetPasswordPage";

import { SeriesPage } from "./pages/SeriesPage";
import { MoviesPage } from "./pages/MoviesPage";
import { SearchPage } from "./pages/SearchPage";
import { NewsPage } from "./pages/NewsPage";
import { NewsArticleDetailPage } from "./pages/NewsArticleDetailPage";
import { ProfilePage } from "./pages/ProfilePage";
import { ProfileSettingsPage } from "./pages/profile/ProfileSettingsPage";
import { EditProfilePage } from "./pages/profile/EditProfilePage";
import { LanguagePage } from "./pages/profile/LanguagePage";
import { NotificationsPage } from "./pages/profile/NotificationsPage";
import { AppearancePage } from "./pages/profile/AppearancePage";
import { ProfileDataPage } from "./pages/profile/ProfileDataPage";
import { LibraryPage } from "./pages/LibraryPage";
import { ShowDetailPage } from "./pages/ShowDetailPage";
import { ShowCommentsPage } from "./pages/ShowCommentsPage";
import { EpisodeDetailPage } from "./pages/EpisodeDetailPage";
import { CommentThreadPage } from "./pages/CommentThreadPage";
import { OnboardingPage } from "./pages/OnboardingPage";
import { ImportPage } from "./pages/ImportPage";
import { ImportReviewPage } from "./pages/ImportReviewPage";
import { ExportPage } from "./pages/ExportPage";

function AuthRedirect() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  return <Navigate to={isAuthenticated ? "/series" : "/login"} replace />;
}

export default function App() {
  const hydrate = useAuthStore((s) => s.hydrate);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    let mounted = true;

    async function bootstrap() {
      await remoteConfigService.init();
      await hydrate();
      if (mounted) setIsReady(true);
    }

    bootstrap();

    return () => {
      mounted = false;
    };
  }, [hydrate]);

  if (!isReady) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<AuthRedirect />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />
            <Route path="/reset-password" element={<ResetPasswordPage />} />

            <Route
              element={
                <ProtectedRoute>
                  <AppLayout />
                </ProtectedRoute>
              }
            >
              <Route path="/series" element={<SeriesPage />} />
              <Route path="/movies" element={<MoviesPage />} />
              <Route path="/search" element={<SearchPage />} />
              <Route path="/news" element={<NewsPage />} />
              <Route path="/news/article" element={<NewsArticleDetailPage />} />
              <Route path="/profile" element={<ProfilePage />} />
              <Route path="/profile/settings" element={<ProfileSettingsPage />} />
              <Route path="/profile/edit" element={<EditProfilePage />} />
              <Route path="/profile/language" element={<LanguagePage />} />
              <Route path="/profile/notifications" element={<NotificationsPage />} />
              <Route path="/profile/appearance" element={<AppearancePage />} />
              <Route path="/profile/data" element={<ProfileDataPage />} />
              <Route path="/profile/import" element={<ImportPage />} />
              <Route path="/profile/export" element={<ExportPage />} />
              <Route path="/library" element={<LibraryPage />} />
              <Route path="/onboarding" element={<OnboardingPage />} />
              <Route path="/show/:tmdbId" element={<ShowDetailPage />} />
              <Route path="/show/:tmdbId/comments" element={<ShowCommentsPage />} />
              <Route path="/show/:tmdbId/season/:season/episode/:episode" element={<EpisodeDetailPage />} />
              <Route path="/comments/:commentId" element={<CommentThreadPage />} />
              <Route path="/import" element={<ImportPage />} />
              <Route path="/import/:jobId/review" element={<ImportReviewPage />} />
              <Route path="/export" element={<ExportPage />} />
            </Route>

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
          <Snackbar />
        </BrowserRouter>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
