import { lazy, Suspense, useEffect, type ReactNode } from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation, Link } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'sonner';
import { AuthProvider } from '@/context/AuthContext';
import { SettingsProvider } from '@/context/SettingsContext';
import { ErrorBoundary } from '@/components/ErrorBoundary';

const PageLoader = () => (
  <div className="min-h-screen flex items-center justify-center" style={{ background: '#000' }}>
    <div className="lb-bracket t-yellow" style={{ padding: '24px 40px', textAlign: 'center' }}>
      <div className="lb-bracket-corner lb-c-tl" />
      <div className="lb-bracket-corner lb-c-tr" />
      <div className="lb-bracket-corner lb-c-bl" />
      <div className="lb-bracket-corner lb-c-br" />
      <p className="lb-mono ts-blink" style={{ color: 'var(--c-green)', fontSize: '12px', letterSpacing: '0.15em', margin: 0 }}>
        &gt; loading…
      </p>
    </div>
  </div>
);

function RouteBoundary({ children }: { children: ReactNode }) {
  return (
    <ErrorBoundary>
      <Suspense fallback={<PageLoader />}>
        {children}
      </Suspense>
    </ErrorBoundary>
  );
}

function wrap(element: ReactNode) {
  return <RouteBoundary>{element}</RouteBoundary>;
}

function ScrollToTop() {
  const location = useLocation();
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
  }, [location.pathname, location.search]);
  return null;
}

// ── Public pages ──────────────────────────────────────────────────────────────
const HomePage               = lazy(() => import('@/pages/HomePage'));
const AboutPage              = lazy(() => import('@/pages/AboutPage'));
const EventsPage             = lazy(() => import('@/pages/EventsPage'));
const EventDetailPage        = lazy(() => import('@/pages/EventDetailPage'));
const TeamPage               = lazy(() => import('@/pages/TeamPage'));
const TeamMemberProfilePage  = lazy(() => import('@/pages/TeamMemberProfilePage'));
const AchievementsPage       = lazy(() => import('@/pages/AchievementsPage'));
const AchievementDetailPage  = lazy(() => import('@/pages/AchievementDetailPage'));
const AnnouncementsPage      = lazy(() => import('@/pages/AnnouncementsPage'));
const AnnouncementDetailPage = lazy(() => import('@/pages/AnnouncementDetailPage'));
const SignInPage             = lazy(() => import('@/pages/SignInPage'));
const AuthCallbackPage       = lazy(() => import('@/pages/AuthCallbackPage'));
const OnboardingPage         = lazy(() => import('@/pages/OnboardingPage'));
const PrivacyPolicyPage      = lazy(() => import('@/pages/PrivacyPolicyPage'));
const VerifyCertificatePage  = lazy(() => import('@/pages/VerifyCertificatePage'));
const JoinUsPage             = lazy(() => import('@/pages/JoinUsPage'));
const PollDetailPage         = lazy(() => import('@/pages/PollDetailPage'));

// ── Games (new) ───────────────────────────────────────────────────────────────
const GamesPage      = lazy(() => import('@/pages/GamesPage'));
const GameDetailPage = lazy(() => import('@/pages/GameDetailPage'));
const GamePlayRouter = lazy(() => import('@/pages/games/GamePlayRouter'));

// ── Leaderboard (public) ──────────────────────────────────────────────────────
const LeaderboardPage = lazy(() => import('@/pages/LeaderboardPage'));

// ── Dashboard ─────────────────────────────────────────────────────────────────
const DashboardLayout        = lazy(() => import('@/components/dashboard/DashboardLayout'));
const DashboardOverview      = lazy(() => import('@/pages/dashboard/DashboardOverview'));
const DashboardEvents        = lazy(() => import('@/pages/dashboard/DashboardEvents'));
const DashboardAnnouncements = lazy(() => import('@/pages/dashboard/DashboardAnnouncements'));
const DashboardLeaderboard   = lazy(() => import('@/pages/dashboard/DashboardLeaderboard'));
const DashboardCertificates  = lazy(() => import('@/pages/dashboard/DashboardCertificates'));
const CreateEvent            = lazy(() => import('@/pages/dashboard/CreateEvent'));
const CreateAnnouncement     = lazy(() => import('@/pages/dashboard/CreateAnnouncement'));
const ProfilePage            = lazy(() => import('@/pages/dashboard/ProfilePage'));
const ImageUploadTool        = lazy(() => import('@/pages/dashboard/ImageUploadTool'));
const EditTeamProfile        = lazy(() => import('@/pages/dashboard/EditTeamProfile'));
const AttendancePage         = lazy(() => import('@/pages/dashboard/AttendancePage'));
const EventAdminHub          = lazy(() => import('@/components/attendance/EventAdminHub'));

// ── Admin ─────────────────────────────────────────────────────────────────────
const AdminUsersRealtime     = lazy(() => import('@/pages/admin/AdminUsersRealtime'));
const AdminTeam              = lazy(() => import('@/pages/admin/AdminTeam'));
const AdminAchievements      = lazy(() => import('@/pages/admin/AdminAchievements'));
const AdminSettings          = lazy(() => import('@/pages/admin/AdminSettings'));
const AdminEventRegistrations = lazy(() => import('@/pages/admin/AdminEventRegistrations'));
const EditEvent              = lazy(() => import('@/pages/admin/EditEvent'));
const AdminCertificates      = lazy(() => import('@/pages/admin/AdminCertificates'));
const AdminAuditLog          = lazy(() => import('@/pages/admin/AdminAuditLog'));
const AdminMail              = lazy(() => import('@/pages/admin/AdminMail'));
const AdminPublicView        = lazy(() => import('@/pages/admin/AdminPublicView'));
const AdminGameContent       = lazy(() => import('@/pages/admin/AdminGameContent'));
const AdminHiring            = lazy(() => import('@/pages/admin/AdminHiring'));

import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { SuperAdminOrPresidentRoute } from '@/components/auth/SuperAdminOrPresidentRoute';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,
      gcTime: 1000 * 60 * 30,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <SettingsProvider>
          <ErrorBoundary>
            <Router>
              <ScrollToTop />
              <Toaster
                position="top-right"
                toastOptions={{ style: { background: 'var(--bg-2)', border: '1px solid var(--line-2)', color: '#fff', fontFamily: '"JetBrains Mono", monospace', borderRadius: 0 } }}
              />
              <Routes>
                {/* ── Public ───────────────────────────────────────────── */}
                <Route path="/"              element={wrap(<HomePage />)} />
                <Route path="/about"         element={wrap(<AboutPage />)} />
                <Route path="/events"        element={wrap(<EventsPage />)} />
                <Route path="/events/:id"    element={wrap(<EventDetailPage />)} />
                <Route path="/announcements"     element={wrap(<AnnouncementsPage />)} />
                <Route path="/announcements/:id" element={wrap(<AnnouncementDetailPage />)} />
                <Route path="/team"          element={wrap(<TeamPage />)} />
                <Route path="/team/:slug"    element={wrap(<TeamMemberProfilePage />)} />
                <Route path="/members"       element={wrap(<TeamPage />)} />
                <Route path="/members/:slug" element={wrap(<TeamMemberProfilePage />)} />
                <Route path="/achievements"      element={wrap(<AchievementsPage />)} />
                <Route path="/achievements/:id"  element={wrap(<AchievementDetailPage />)} />
                <Route path="/games"         element={wrap(<GamesPage />)} />
                <Route path="/games/:id"     element={wrap(<GameDetailPage />)} />
                <Route path="/leaderboard"   element={wrap(<LeaderboardPage />)} />
                <Route path="/signin"        element={wrap(<SignInPage />)} />
                <Route path="/signup"        element={wrap(<SignInPage />)} />
                <Route path="/auth/callback" element={wrap(<AuthCallbackPage />)} />
                <Route path="/onboarding"    element={wrap(<OnboardingPage />)} />
                <Route path="/verify"        element={wrap(<VerifyCertificatePage />)} />
                <Route path="/verify/:certId" element={wrap(<VerifyCertificatePage />)} />
                <Route path="/privacy-policy" element={wrap(<PrivacyPolicyPage />)} />
                <Route path="/join-us"       element={wrap(<JoinUsPage />)} />
                <Route path="/polls/:slug"   element={wrap(<PollDetailPage />)} />

                {/* ── Protected user ────────────────────────────────────── */}
                <Route element={<ProtectedRoute minRole="USER" />}>
                  <Route path="/games/:id/play" element={wrap(<GamePlayRouter />)} />
                  <Route path="/dashboard" element={wrap(<DashboardLayout />)}>
                    <Route index           element={wrap(<DashboardOverview />)} />
                    <Route path="events"   element={wrap(<DashboardEvents />)} />
                    <Route path="announcements" element={wrap(<DashboardAnnouncements />)} />
                    <Route path="leaderboard"   element={wrap(<DashboardLeaderboard />)} />
                    <Route path="events/new"    element={wrap(<CreateEvent />)} />
                    <Route path="announcements/new" element={wrap(<CreateAnnouncement />)} />
                    <Route path="upload"   element={wrap(<ImageUploadTool />)} />
                    <Route path="profile"  element={wrap(<ProfilePage />)} />
                    <Route path="team/:id/edit" element={wrap(<EditTeamProfile />)} />
                    <Route path="certificates"  element={wrap(<DashboardCertificates />)} />
                    <Route element={<ProtectedRoute minRole="CORE_MEMBER" />}>
                      <Route path="attendance"                     element={wrap(<AttendancePage />)} />
                      <Route path="events/:eventId/attendance"     element={wrap(<EventAdminHub />)} />
                    </Route>
                  </Route>
                </Route>

                {/* ── Protected admin ───────────────────────────────────── */}
                <Route element={<ProtectedRoute minRole="ADMIN" />}>
                  <Route path="/admin" element={wrap(<DashboardLayout />)}>
                    <Route path="users"              element={wrap(<AdminUsersRealtime />)} />
                    <Route path="team"               element={wrap(<AdminTeam />)} />
                    <Route path="achievements"       element={wrap(<AdminAchievements />)} />
                    <Route path="event-registrations" element={wrap(<AdminEventRegistrations />)} />
                    <Route path="events/:id/edit"    element={wrap(<EditEvent />)} />
                    <Route path="certificates"       element={wrap(<AdminCertificates />)} />
                    <Route path="audit-log"          element={wrap(<AdminAuditLog />)} />
                    <Route path="mail"               element={wrap(<AdminMail />)} />
                    <Route path="public-view"        element={wrap(<AdminPublicView />)} />
                    <Route path="game-content"       element={wrap(<AdminGameContent />)} />
                    <Route path="hiring"             element={wrap(<AdminHiring />)} />
                    <Route path="events/:eventId/attendance" element={wrap(<EventAdminHub />)} />
                    <Route element={<SuperAdminOrPresidentRoute />}>
                      <Route path="settings" element={wrap(<AdminSettings />)} />
                    </Route>
                  </Route>
                </Route>

                {/* ── 404 ──────────────────────────────────────────────── */}
                <Route path="*" element={<NotFound />} />
              </Routes>
            </Router>
          </ErrorBoundary>
        </SettingsProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

function NotFound() {
  return (
    <div className="lb-root" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
      <div className="lb-scanlines" />
      <div className="lb-grid-bg" />
      <div className="lb-bracket t-yellow" style={{ position: 'relative', zIndex: 1, padding: '48px', textAlign: 'center', maxWidth: 480 }}>
        <div className="lb-bracket-tag">error_404</div>
        <div className="lb-bracket-corner lb-c-tl" />
        <div className="lb-bracket-corner lb-c-tr" />
        <div className="lb-bracket-corner lb-c-bl" />
        <div className="lb-bracket-corner lb-c-br" />
        <h1 className="lb-headline" style={{ fontSize: '80px', marginBottom: '16px' }}>404</h1>
        <p className="lb-sub" style={{ margin: '0 auto 32px' }}>Page not found. This route doesn't exist in the Tesseract universe.</p>
        <Link to="/" className="lb-btn-primary">← GO HOME</Link>
      </div>
    </div>
  );
}

export default App;
