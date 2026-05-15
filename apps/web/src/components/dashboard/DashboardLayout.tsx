import { useState, useEffect, useMemo } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/context/AuthContext';
import { useSettings } from '@/context/SettingsContext';
import { Menu, X, ChevronRight, LogOut } from 'lucide-react';
import { cn } from '@/lib/utils';

interface NavItem {
  id: string;
  name: string;
  href: string;
  badge?: number;
}

const breadcrumbNames: Record<string, string> = {
  '/dashboard': 'Overview',
  '/dashboard/events': 'My Events',
  '/dashboard/announcements': 'Announcements',
  '/dashboard/profile': 'Profile',
  '/dashboard/certificates': 'Certificates',
  '/dashboard/leaderboard': 'Leaderboard',
  '/dashboard/events/new': 'Create Event',
  '/dashboard/announcements/new': 'Create Announcement',
  '/dashboard/upload': 'Upload Image',
  '/dashboard/attendance': 'Take Attendance',
  '/admin/users': 'User Management',
  '/admin/team': 'Team Management',
  '/admin/achievements': 'Achievements',
  '/admin/audit-log': 'Audit Log',
  '/admin/event-registrations': 'Event Registrations',
  '/admin/certificates': 'Certificates',
  '/admin/mail': 'Send Mail',
  '/admin/public-view': 'Public View',
  '/admin/game-content': 'Game Content',
  '/admin/hiring': 'Hiring',
  '/admin/settings': 'Settings',
};

const PROFILE_EXEMPT_PATHS = new Set(['/dashboard/profile', '/dashboard/certificates']);

const buildCoreMemberNavItems = (attendanceEnabled: boolean): NavItem[] => {
  const items: NavItem[] = [];
  if (attendanceEnabled) {
    items.push({ id: 'core-attendance', name: 'attendance', href: '/dashboard/attendance' });
  }
  items.push(
    { id: 'core-create-event', name: 'create event', href: '/dashboard/events/new' },
    { id: 'core-create-announcement', name: 'create announcement', href: '/dashboard/announcements/new' },
    { id: 'core-upload', name: 'upload image', href: '/dashboard/upload' },
  );
  return items;
};

const getAdminNavItems = (
  certificatesEnabled: boolean,
  isSuperAdmin?: boolean,
  isPresident?: boolean,
) => {
  const items: NavItem[] = [
    { id: 'admin-users', name: 'users', href: '/admin/users' },
    { id: 'admin-team', name: 'team', href: '/admin/team' },
    { id: 'admin-achievements', name: 'achievements', href: '/admin/achievements' },
    { id: 'admin-public-view', name: 'public view', href: '/admin/public-view' },
  ];

  if (isSuperAdmin || isPresident) items.push({ id: 'admin-audit', name: 'audit log', href: '/admin/audit-log' });
  items.push({ id: 'admin-registrations', name: 'event registrations', href: '/admin/event-registrations' });
  if (certificatesEnabled !== false) items.push({ id: 'admin-certificates', name: 'certificates', href: '/admin/certificates' });
  items.push({ id: 'admin-mail', name: 'send mail', href: '/admin/mail' });
  items.push({ id: 'admin-hiring', name: 'hiring', href: '/admin/hiring' });
  items.push({ id: 'admin-game-content', name: 'game content', href: '/admin/game-content' });
  if (isSuperAdmin || isPresident) items.push({ id: 'admin-settings', name: 'settings', href: '/admin/settings' });
  return items;
};

function hrefPathname(href: string): string {
  return href.split('?')[0];
}

function isNavHrefActive(href: string, pathname: string): boolean {
  const path = hrefPathname(href);
  return pathname === path || pathname.startsWith(`${path}/`);
}

function resolveActiveNavId(items: NavItem[], pathname: string, search: string): string | null {
  const fullUrl = pathname + search;
  const exactFull = items.find((item) => item.href === fullUrl);
  if (exactFull) return exactFull.id;
  const matches = items.filter((item) => isNavHrefActive(item.href, pathname));
  if (matches.length === 0) return null;
  const exactMatches = matches.filter((item) => hrefPathname(item.href) === pathname);
  const ranked = (exactMatches.length > 0 ? exactMatches : matches).sort((a, b) => hrefPathname(b.href).length - hrefPathname(a.href).length);
  return ranked[0]?.id ?? null;
}

export default function DashboardLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [clickedNavId, setClickedNavId] = useState<string | null>(null);
  const { user, logout } = useAuth();
  const { settings, loading: settingsLoading } = useSettings();
  const location = useLocation();
  const navigate = useNavigate();

  const isNetworkUser = user?.role === 'NETWORK';
  const isStaff = user?.role === 'CORE_MEMBER' || user?.role === 'ADMIN' || user?.role === 'PRESIDENT';
  const needsProfileCompletion = user && !isStaff && !isNetworkUser && (!user.phone || !user.branch || !user.level || !user.year);

  useEffect(() => {
    if (needsProfileCompletion && !PROFILE_EXEMPT_PATHS.has(location.pathname)) {
      navigate('/dashboard/profile');
    }
  }, [needsProfileCompletion, location.pathname, navigate]);

  const isCoreMember = user?.role === 'CORE_MEMBER' || user?.role === 'ADMIN' || user?.role === 'PRESIDENT';
  const isAdmin = user?.role === 'ADMIN' || user?.role === 'PRESIDENT';

  const userNavItems = useMemo<NavItem[]>(() => {
    if (isNetworkUser) {
      return [
        { id: 'user-events', name: 'my events', href: '/dashboard/events' },
        ...(settings?.certificatesEnabled !== false
          ? [{ id: 'user-certificates', name: 'certificates', href: '/dashboard/certificates' }]
          : []),
      ];
    }
    return [
      { id: 'user-overview', name: 'overview', href: '/dashboard' },
      { id: 'user-events', name: 'my events', href: '/dashboard/events' },
      { id: 'user-announcements', name: 'announcements', href: '/dashboard/announcements' },
      ...(settings?.showLeaderboard !== false
        ? [{ id: 'user-leaderboard', name: 'leaderboard', href: '/dashboard/leaderboard' }]
        : []),
      { id: 'user-profile', name: 'profile', href: '/dashboard/profile' },
      ...(settings?.certificatesEnabled !== false
        ? [{ id: 'user-certificates', name: 'certificates', href: '/dashboard/certificates' }]
        : []),
    ];
  }, [isNetworkUser, settings?.showLeaderboard, settings?.certificatesEnabled]);

  const adminNavItems = useMemo<NavItem[]>(() => {
    if (!isAdmin) return [];
    return getAdminNavItems(
      !settingsLoading && settings?.certificatesEnabled !== false,
      user?.isSuperAdmin,
      user?.role === 'PRESIDENT',
    );
  }, [isAdmin, settingsLoading, settings?.certificatesEnabled, user?.isSuperAdmin, user?.role]);

  const coreMemberNavItems = useMemo<NavItem[]>(
    () => buildCoreMemberNavItems(settings?.attendanceEnabled !== false),
    [settings?.attendanceEnabled],
  );

  const allNavItems = useMemo(
    () => [...userNavItems, ...(isCoreMember ? coreMemberNavItems : []), ...adminNavItems],
    [userNavItems, isCoreMember, coreMemberNavItems, adminNavItems],
  );

  const routeActiveNavId = useMemo(
    () => resolveActiveNavId(allNavItems, location.pathname, location.search),
    [allNavItems, location.pathname, location.search],
  );

  const activeNavId = useMemo(() => {
    if (!clickedNavId) return routeActiveNavId;
    const clickedNav = allNavItems.find((item) => item.id === clickedNavId);
    if (clickedNav && isNavHrefActive(clickedNav.href, location.pathname)) return clickedNav.id;
    return routeActiveNavId;
  }, [clickedNavId, allNavItems, location.pathname, routeActiveNavId]);

  const handleNavClick = (navId: string) => {
    setClickedNavId(navId);
    setSidebarOpen(false);
  };

  const userInitial = user?.name?.charAt(0)?.toUpperCase() ?? '?';
  const roleLabel = user?.role?.replace(/_/g, ' ').toLowerCase() ?? '';

  return (
    <div
      className="lb-root min-h-screen relative"
      style={{ background: 'var(--bg)', color: 'var(--fg)' }}
    >
      <div className="lb-scanlines" />
      <div className="lb-grid-bg" />

      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[70] focus:bg-[var(--c-yellow)] focus:px-4 focus:py-2 focus:text-black"
      >
        Skip to content
      </a>

      {/* Mobile overlay */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-black/70 backdrop-blur-sm lg:hidden"
            onClick={() => setSidebarOpen(false)}
            aria-hidden="true"
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 w-64 transform transition-transform duration-300 ease-in-out lg:translate-x-0 flex flex-col',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0',
        )}
        style={{ background: 'var(--bg-1)', borderRight: '1px solid var(--line)' }}
      >
        {/* Logo block */}
        <div
          className="flex items-center justify-between px-5 py-4 shrink-0"
          style={{ borderBottom: '1px solid var(--line)' }}
        >
          <Link to="/" className="lb-logo-wrap">
            <img src="/tesseract-logo.png" alt="Tesseract" className="lb-logo" onError={(e) => ((e.currentTarget as HTMLImageElement).src = '/logo.jpeg')} />
            <div>
              <div className="lb-wordmark">TESSERACT</div>
              <div className="lb-wordmark-sub">// dashboard</div>
            </div>
          </Link>
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden p-1.5 transition-colors hover:bg-white/5"
            aria-label="Close sidebar"
          >
            <X className="h-5 w-5" style={{ color: 'var(--fg-dim)' }} />
          </button>
        </div>

        {/* User chip */}
        <div className="px-4 py-3 shrink-0" style={{ borderBottom: '1px solid var(--line)' }}>
          <div className="dash-me w-full">
            <div className="dash-me-avatar">
              {user?.avatar ? (
                <img src={user.avatar} alt={user.name} className="w-full h-full object-cover" />
              ) : (
                userInitial
              )}
            </div>
            <div className="dash-me-name min-w-0 flex-1">
              <div className="truncate">{user?.name}</div>
              <div className="dash-me-role truncate" title={roleLabel}>
                {roleLabel || 'member'}
              </div>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-2">
          <div className="lb-side-nav-section">// dashboard</div>
          {userNavItems.map((item, idx) => (
            <SideNavLink
              key={item.id}
              item={item}
              index={idx}
              isActive={activeNavId === item.id}
              onNavigate={() => handleNavClick(item.id)}
            />
          ))}

          {isCoreMember && (
            <>
              <div className="lb-side-nav-section mt-4">// core_member</div>
              {coreMemberNavItems.map((item, idx) => (
                <SideNavLink
                  key={item.id}
                  item={item}
                  index={idx}
                  isActive={activeNavId === item.id}
                  onNavigate={() => handleNavClick(item.id)}
                />
              ))}
            </>
          )}

          {isAdmin && (
            <>
              <div className="lb-side-nav-section mt-4">// admin</div>
              {adminNavItems.map((item, idx) => (
                <SideNavLink
                  key={item.id}
                  item={item}
                  index={idx}
                  isActive={activeNavId === item.id}
                  onNavigate={() => handleNavClick(item.id)}
                />
              ))}
            </>
          )}
        </nav>

        {/* Bottom action: sign out */}
        <div className="p-3 shrink-0" style={{ borderTop: '1px solid var(--line)' }}>
          <button onClick={logout} className="lb-btn-ghost w-full justify-center" aria-label="Log out">
            <LogOut className="h-4 w-4" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main area */}
      <div className="lg:pl-64 relative" style={{ zIndex: 1 }}>
        {/* Top bar */}
        <header
          className="sticky top-0 z-30 h-14 flex items-center gap-3 px-4 lg:px-6 backdrop-blur-md"
          style={{
            background: 'rgba(0,0,0,0.7)',
            borderBottom: '1px solid var(--line)',
          }}
        >
          <button
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden p-2 transition-colors hover:bg-white/5"
            aria-label="Open sidebar"
          >
            <Menu className="h-5 w-5" style={{ color: 'var(--fg-dim)' }} />
          </button>

          <div
            className="flex min-w-0 items-center text-xs lb-mono"
            style={{ color: 'var(--fg-mute)', letterSpacing: '0.08em' }}
          >
            <Link to="/dashboard" className="hover:text-white transition-colors uppercase">
              dashboard
            </Link>
            {location.pathname !== '/dashboard' && (
              <>
                <ChevronRight className="h-3 w-3 mx-1.5 shrink-0" />
                <span className="truncate uppercase" style={{ color: 'var(--c-yellow)' }}>
                  {breadcrumbNames[location.pathname] ||
                    location.pathname.split('/').pop()?.replace(/-/g, ' ').replace(/^\w/, (c) => c.toUpperCase())}
                </span>
              </>
            )}
          </div>

          <div className="ml-auto lb-mono text-[10px] flex items-center gap-2" style={{ color: 'var(--fg-mute)', letterSpacing: '0.12em' }}>
            <span className="lb-pulse" />
            <span className="hidden sm:inline">live</span>
          </div>
        </header>

        {/* Page content */}
        <main id="main-content" className="p-4 sm:p-6 lg:p-8 w-full min-w-0 relative" style={{ zIndex: 1 }}>
          <Outlet />
        </main>
      </div>
    </div>
  );
}

function SideNavLink({
  item,
  index,
  isActive,
  onNavigate,
}: {
  item: NavItem;
  index: number;
  isActive: boolean;
  onNavigate?: () => void;
}) {
  const badgeValue = item.badge ?? 0;
  const showBadge = badgeValue > 0;
  const indexLabel = `[${String(index + 1).padStart(2, '0')}]`;
  return (
    <Link
      to={item.href}
      onClick={onNavigate}
      className={cn('lb-side-nav-link', isActive && 'active')}
    >
      <span style={{ color: 'var(--fg-mute)', minWidth: 28 }}>{indexLabel}</span>
      <span className="flex-1 truncate">{item.name}</span>
      {showBadge && (
        <span
          className="lb-mono text-[10px] px-2 py-0.5 ml-auto"
          style={{
            background: 'var(--c-red)',
            color: '#fff',
            letterSpacing: '0.05em',
          }}
        >
          {badgeValue > 99 ? '99+' : badgeValue}
        </span>
      )}
    </Link>
  );
}
