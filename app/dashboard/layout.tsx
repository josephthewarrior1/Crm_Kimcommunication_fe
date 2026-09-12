'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useAuth } from '../../lib/context/AuthContext';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { crmService } from '../../lib/services/crmService';
import { checkDatabaseCompleteness } from './database/utils/validationHelper';
import DatabaseTargetWarning from './components/DatabaseTargetWarning';
import {
  LayoutDashboard,
  Building2,
  FolderTree,
  Users,
  Database as DatabaseIcon,
  CalendarDays,
  LogOut,
  Menu,
  X,
  User,
  Loader2,
  ShieldAlert,
  UserX,
  UserPlus,
  History,
  Wand2,
  Target
} from 'lucide-react';

function DashboardLayoutContent({ children }: { children: React.ReactNode }) {

  const { user, logout, isLoading, isAdmin, isManager, isUser } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [dirtyDbCount, setDirtyDbCount] = useState<number | null>(null);

  useEffect(() => {
    if (user && !isUser) {
      crmService.getDatabases().then(dbs => {
        const count = dbs.filter((c: any) => c.isActive !== false && checkDatabaseCompleteness(c).isIncomplete).length;
        setDirtyDbCount(count);
      }).catch(() => {});
    }
  }, [pathname, user]);

  const isViewer = isUser || (!isAdmin && !isManager);

  // ponytail: Viewer role is restricted to Events page only
  React.useEffect(() => {
    if (!isLoading && isViewer && pathname !== '/dashboard/events') {
      router.replace('/dashboard/events');
    }
  }, [isLoading, isViewer, pathname, router]);

  const getRoleTextClass = (roleName?: string) => {
    switch (roleName?.toUpperCase()) {
      case 'ADMIN':
        return 'text-violet-600 font-bold';
      case 'MANAGER':
        return 'text-emerald-600 font-bold';
      default:
        return 'text-slate-500 font-semibold';
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 text-slate-900">
        <div className="text-center">
          <Loader2 className="w-10 h-10 animate-spin text-blue-600 mx-auto mb-3" />
          <p className="text-sm text-slate-500 font-mono">Verifying Session...</p>
        </div>
      </div>
    );
  }

  const currentTab = searchParams ? searchParams.get('tab') : null;

  // Define sidebar menu items
  const menuItems: Array<{ name: string; path: string; icon: any; badge?: number }> = [
    { name: 'Overview', path: '/dashboard', icon: LayoutDashboard },
    { name: 'Groups', path: '/dashboard/groups', icon: FolderTree },
    { name: 'Companies', path: '/dashboard/companies', icon: Building2 },
    { name: 'Database', path: '/dashboard/database', icon: DatabaseIcon },
    { name: 'Events', path: '/dashboard/events', icon: CalendarDays },
    { name: 'Flagged Identities', path: '/dashboard/flagged', icon: ShieldAlert },
    { name: 'Takeout Requests', path: '/dashboard/takeout', icon: UserX },
    { name: 'Activity Logs', path: '/dashboard/audit-logs', icon: History },
    { name: 'Data Cleaner', path: '/dashboard/data-cleaner', icon: Wand2 },
    { name: 'Target', path: '/dashboard/targets', icon: Target },
    { name: 'User Management', path: '/dashboard/users', icon: User },
  ];

  // Filter based on user roles
  const filteredMenuItems = menuItems.filter((item) => {
    if (isViewer) {
      return item.path === '/dashboard/events';
    }
    if (item.path === '/dashboard/takeout' || item.path === '/dashboard/users' || item.path === '/dashboard/data-cleaner' || item.path === '/dashboard/targets') {
      return isAdmin;
    }
    if (item.path === '/dashboard/audit-logs') {
      return isAdmin || isManager;
    }
    return true;
  });

  const handleNav = (path: string) => {
    router.push(path);
    setMobileMenuOpen(false);
  };

  return (
    <div className="min-h-screen flex bg-slate-100 pt-14 text-slate-900">
      <a href="#workspace-content" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-16 focus:z-[60] focus:rounded-md focus:bg-white focus:px-4 focus:py-3 focus:text-blue-700 focus:shadow-lg">Skip to content</a>
      {/* 1. Large Screen Sidebar */}
      <aside className="sticky top-14 hidden h-[calc(100dvh-3.5rem)] w-[88px] shrink-0 flex-col border-r border-slate-200 bg-[#f0f0f0] md:flex lg:w-56">
        <div className="hidden h-20 shrink-0 items-center gap-3 border-b border-slate-200 px-5 lg:flex">
          <div className="w-9 h-9 bg-white border border-slate-200 rounded-lg text-blue-700 flex items-center justify-center">
            <Building2 className="w-5 h-5" />
          </div>
          <div>
            <span className="block font-semibold text-sm text-slate-900">Your workspace</span>
            <span className="block text-xs text-slate-500">KIM Communications</span>
          </div>
        </div>

        <nav aria-label="Main navigation" className="flex-1 space-y-1 overflow-y-auto px-2 py-3 lg:px-3">
          {filteredMenuItems.map((item) => {
            const isDirtyMenu = item.path.includes('tab=dirty');
            const isActive = isDirtyMenu 
              ? (pathname === '/dashboard/database' && currentTab === 'dirty')
              : (pathname === item.path && (!item.path.includes('/dashboard/database') || currentTab !== 'dirty'));
            const Icon = item.icon;
            return (
              <button
                key={item.name}
                onClick={() => handleNav(item.path)}
                title={item.name}
                aria-current={isActive ? 'page' : undefined}
                className={`group relative w-full flex items-center justify-center lg:justify-between px-1 lg:px-3 py-2.5 rounded-md font-medium text-sm transition-colors ${
                  isActive
                    ? 'bg-white text-blue-700 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-white/70'
                }`}
              >
                {isActive && <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-6 rounded-r-full bg-blue-600" />}
                <div className="flex flex-col lg:flex-row items-center gap-1 lg:gap-3 min-w-0">
                  <span className={`w-6 h-6 flex items-center justify-center shrink-0 ${
                    isActive ? 'text-blue-700' : 'text-slate-500 group-hover:text-slate-700'
                  }`}>
                    <Icon className="w-5 h-5" strokeWidth={1.7} />
                  </span>
                  <span className="text-[10px] leading-3.5 lg:text-[13px] lg:leading-5 text-center lg:text-left">{item.name}</span>
                </div>
                {item.badge !== undefined && item.badge !== null && item.badge > 0 && (
                  <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full ${
                    isActive ? 'bg-blue-100 text-blue-700' : 'bg-amber-100 text-amber-800 border border-amber-200/60'
                  }`}>
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
        <div className="hidden shrink-0 border-t border-slate-200 px-5 py-4 text-[11px] text-slate-500 lg:block">KIM CRM · Lead management</div>
      </aside>

      {/* 2. Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile Header / Top Bar */}
        <header className="fixed inset-x-0 top-0 z-30 flex h-14 items-center justify-between gap-3 bg-[#464775] px-3 text-white shadow-sm sm:px-5">
          <div className="flex min-w-0 items-center gap-3">
            <button
              onClick={() => setMobileMenuOpen(true)}
              aria-label="Open navigation"
              aria-expanded={mobileMenuOpen}
              aria-controls="mobile-navigation"
              className="md:hidden p-2 text-white/80 hover:text-white hover:bg-white/10 rounded-md focus-visible:outline-white"
            >
              <Menu className="w-6 h-6" />
            </button>
            <span className="hidden h-8 w-8 shrink-0 items-center justify-center rounded-md bg-white/15 md:flex"><Building2 className="h-5 w-5" strokeWidth={1.7} /></span>
            <span className="shrink-0 text-[15px] font-semibold tracking-tight">KIM CRM</span>
            <span aria-hidden="true" className="hidden h-5 w-px bg-white/20 sm:block" />
            <span className="hidden truncate text-sm text-white/80 sm:block">{filteredMenuItems.find((i) => pathname === i.path)?.name || 'Dashboard'}</span>
          </div>

          <div className="flex items-center gap-4">
            {/* Top Right User Profile Dropdown */}
            <div className="relative">
              <button
                onClick={() => setDropdownOpen(!dropdownOpen)}
                aria-label="Account options"
                aria-expanded={dropdownOpen}
                aria-controls="account-options"
                className="flex items-center gap-2 rounded-md px-2 py-1.5 transition-colors hover:bg-white/10 focus-visible:outline-white"
              >
                {/* Avatar with original blue style */}
                <div className="w-8 h-8 rounded-full bg-[#e8e8f7] flex items-center justify-center text-[#444791] font-semibold text-sm select-none">
                  {user?.fullName?.charAt(0).toUpperCase() || user?.username?.charAt(0).toUpperCase() || 'U'}
                </div>
                
                {/* User info text stack */}
                <div className="hidden md:flex flex-col text-left">
                  <span className="max-w-40 truncate text-xs font-semibold text-white leading-tight">
                    {user?.fullName || user?.username}
                  </span>
                  {user?.roles?.[0] && (
                    <span className={`w-fit rounded-sm bg-white/95 px-1 py-0.5 text-[9px] uppercase tracking-wide leading-none mt-1 ${getRoleTextClass(user.roles[0])}`}>
                      {user.roles[0]}
                    </span>
                  )}
                </div>
                
                <svg className={`w-3.5 h-3.5 text-white/70 transition-transform duration-200 ${dropdownOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {dropdownOpen && (
                <>
                  {/* Backdrop overlay to close when clicking outside */}
                  <div className="fixed inset-0 z-10" onClick={() => setDropdownOpen(false)}></div>
                  
                  <div id="account-options" className="absolute right-0 mt-2 w-64 max-w-[calc(100vw-2rem)] bg-white border border-slate-200 rounded-lg shadow-xl py-2 z-20 animate-in fade-in slide-in-from-top-1 duration-100 text-slate-900">
                    <div className="px-4 py-2.5 border-b border-slate-100 bg-slate-50/40 rounded-t-xl">
                      <p className="text-sm font-bold text-slate-800 truncate">{user?.fullName || user?.username}</p>
                      <p className="text-xs text-slate-500 truncate mt-0.5">{user?.email}</p>
                    </div>
                    <div className="p-1.5 space-y-1">
                      {isAdmin && (
                        <button
                          onClick={() => {
                            setDropdownOpen(false);
                            router.push('/dashboard/users');
                          }}
                          className="w-full flex items-center gap-2 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 rounded-lg transition-all"
                        >
                          <UserPlus className="w-4 h-4 text-slate-400" />
                          Create User Account
                        </button>
                      )}
                      <button
                        onClick={() => {
                          setDropdownOpen(false);
                          logout();
                        }}
                        className="w-full flex items-center gap-2 px-3 py-2 text-sm font-semibold text-red-600 hover:bg-red-50 rounded-lg transition-all"
                      >
                        <LogOut className="w-4 h-4" />
                        Logout
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </header>

        {/* Content Body */}
        <main id="workspace-content" tabIndex={-1} className="teams-content scroll-mt-14 flex-1 min-w-0 p-4 sm:p-6 xl:p-8 w-full max-w-[1680px] mx-auto">
          {!isViewer && user && <DatabaseTargetWarning />}
          {children}
        </main>
      </div>

      {/* 3. Mobile Navigation Drawer Overlay */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 md:hidden">
          <div id="mobile-navigation" className="fixed top-0 bottom-0 left-0 w-72 max-w-[calc(100vw-2rem)] bg-[#f0f0f0] border-r border-slate-200 flex flex-col p-4 shadow-2xl animate-in slide-in-from-left duration-200">
            <div className="flex items-center justify-between mb-7">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-blue-600 rounded-xl text-white flex items-center justify-center shadow-md shadow-blue-600/15">
                  <Building2 className="w-5 h-5" />
                </div>
                <div>
                  <span className="block font-black text-lg text-blue-950">KIM CRM</span>
                  <span className="block text-[9px] font-bold uppercase tracking-[0.2em] text-blue-400">Lead System</span>
                </div>
              </div>
              <button
                onClick={() => setMobileMenuOpen(false)}
                aria-label="Close navigation"
                className="p-2 text-slate-500 hover:text-slate-900 hover:bg-blue-50 rounded-xl"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <nav aria-label="Mobile navigation" className="flex-1 space-y-1 overflow-y-auto">
              {filteredMenuItems.map((item) => {
                const isDirtyMenu = item.path.includes('tab=dirty');
                const isActive = isDirtyMenu 
                  ? (pathname === '/dashboard/database' && currentTab === 'dirty')
                  : (pathname === item.path && (!item.path.includes('/dashboard/database') || currentTab !== 'dirty'));
                const Icon = item.icon;
                return (
                  <button
                    key={item.name}
                    onClick={() => handleNav(item.path)}
                    aria-current={isActive ? 'page' : undefined}
                    className={`group relative w-full flex items-center justify-between px-3.5 py-3 rounded-md font-medium text-sm transition-colors ${
                      isActive
                        ? 'bg-white text-blue-700 shadow-sm'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-white/70'
                    }`}
                  >
                    {isActive && <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-6 rounded-r-full bg-blue-600" />}
                    <div className="flex items-center gap-3 min-w-0">
                      <span className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                        isActive ? 'bg-white/15' : 'bg-white border border-blue-50 group-hover:border-blue-100'
                      }`}>
                        <Icon className="w-4 h-4" />
                      </span>
                      <span>{item.name}</span>
                    </div>
                    {item.badge !== undefined && item.badge !== null && item.badge > 0 && (
                      <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full ${
                        isActive ? 'bg-white/20 text-white' : 'bg-amber-100 text-amber-800 border border-amber-200/60'
                      }`}>
                        {item.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </nav>

            <div className="border-t border-blue-50 pt-5">
              <div className="rounded-2xl bg-blue-50/80 border border-blue-100 p-4 mb-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-2xl bg-white border border-blue-100 flex items-center justify-center text-blue-600 font-black shrink-0">
                    {user?.fullName?.charAt(0).toUpperCase() || user?.username?.charAt(0).toUpperCase() || 'U'}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-black text-slate-900 truncate">{user?.fullName || user?.username}</p>
                    <p className="text-xs text-slate-500 truncate">{user?.email}</p>
                  </div>
                </div>
              </div>
              <button
                onClick={() => logout()}
                className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-white hover:bg-red-50 hover:text-red-600 border border-blue-100 hover:border-red-200 rounded-2xl text-slate-700 text-sm font-bold transition-all"
              >
                <LogOut className="w-4 h-4" />
                Logout
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-slate-50 text-slate-900">
        <div className="text-center">
          <Loader2 className="w-10 h-10 animate-spin text-blue-600 mx-auto mb-3" />
          <p className="text-sm text-slate-500 font-mono">Loading Dashboard...</p>
        </div>
      </div>
    }>
      <DashboardLayoutContent>{children}</DashboardLayoutContent>
    </Suspense>
  );
}

