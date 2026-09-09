'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useAuth } from '../../lib/context/AuthContext';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { crmService } from '../../lib/services/crmService';
import { checkDatabaseCompleteness } from './database/utils/validationHelper';
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
  Wand2
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
    { name: 'User Management', path: '/dashboard/users', icon: User },
  ];

  // Filter based on user roles
  const filteredMenuItems = menuItems.filter((item) => {
    if (isViewer) {
      return item.path === '/dashboard/events';
    }
    if (item.path === '/dashboard/takeout' || item.path === '/dashboard/users' || item.path === '/dashboard/data-cleaner') {
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
    <div className="workspace-shell min-h-screen flex text-slate-900">
      {/* 1. Large Screen Sidebar */}
      <aside className="workspace-sidebar hidden md:flex flex-col shrink-0">
        <div className="workspace-brand flex items-center">
          <div className="workspace-mark" aria-hidden="true">K</div>
          <div>
            <span className="block font-semibold text-sm tracking-tight text-slate-800">KIM CRM</span>
            <span className="block text-[11px] text-slate-500 mt-0.5">Workspace</span>
          </div>
        </div>

        <nav className="workspace-nav flex-1 space-y-0.5 overflow-y-auto" aria-label="Workspace navigation">
          <p className="workspace-nav-label">Workspace</p>
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
                className="workspace-nav-item group relative w-full flex items-center justify-between"
              >

                <div className="flex items-center gap-3 min-w-0">
                  <span className="workspace-nav-icon">
                    <Icon className="w-4 h-4" />
                  </span>
                  <span>{item.name}</span>
                </div>
                {item.badge !== undefined && item.badge !== null && item.badge > 0 && (
                  <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full ${
                    isActive ? 'bg-white text-slate-600' : 'bg-amber-100 text-amber-800 border border-amber-200/60'
                  }`}>
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
        <div className="px-5 py-5 border-t border-slate-200 text-[11px] text-slate-400">
          <p className="font-medium text-slate-500">KIM Communications</p>
          <p className="mt-1">CRM &amp; Lead Management</p>
        </div>
      </aside>

      {/* 2. Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-x-hidden">
        {/* Mobile Header / Top Bar */}
        <header className="workspace-topbar flex items-center justify-between sticky top-0 z-30">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileMenuOpen(true)}
              aria-label="Open navigation"
              className="md:hidden p-2 -ml-2 text-slate-500 hover:text-slate-900 rounded-lg"
            >
              <Menu className="w-6 h-6" />
            </button>
            <span className="hidden sm:inline text-xs text-slate-400">KIM workspace</span>
            <span className="hidden sm:inline text-slate-300" aria-hidden="true">/</span>
            <h1 className="text-sm font-medium text-slate-700">
              {filteredMenuItems.find((i) => pathname === i.path)?.name || 'Dashboard'}
            </h1>
          </div>

          <div className="flex items-center gap-4">
            {/* Top Right User Profile Dropdown */}
            <div className="relative">
              <button
                onClick={() => setDropdownOpen(!dropdownOpen)}
                aria-label="Account menu"
                aria-expanded={dropdownOpen}
                className="flex items-center gap-2 px-2 py-1 hover:bg-slate-50 rounded-md transition-colors"
              >
                {/* Account avatar */}
                <div className="w-7 h-7 rounded-md bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-600 font-semibold text-xs select-none">
                  {user?.fullName?.charAt(0).toUpperCase() || user?.username?.charAt(0).toUpperCase() || 'U'}
                </div>

                {/* User info text stack */}
                <div className="hidden md:flex flex-col text-left">
                  <span className="text-xs font-bold text-slate-800 leading-tight">
                    {user?.fullName || user?.username}
                  </span>
                  {user?.roles?.[0] && (
                    <span className={`text-[9px] uppercase tracking-wider leading-none mt-0.5 ${getRoleTextClass(user.roles[0])}`}>
                      {user.roles[0]}
                    </span>
                  )}
                </div>

                <svg className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 ${dropdownOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {dropdownOpen && (
                <>
                  {/* Backdrop overlay to close when clicking outside */}
                  <div className="fixed inset-0 z-10" onClick={() => setDropdownOpen(false)}></div>

                  <div className="absolute right-0 mt-2 w-56 bg-white border border-slate-200 rounded-xl shadow-lg py-2 z-20 animate-in fade-in slide-in-from-top-1 duration-100 text-slate-900">
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
        <main className="workspace-content flex-1 w-full mx-auto">
          {children}
        </main>
      </div>

      {/* 3. Mobile Navigation Drawer Overlay */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 md:hidden">
          <div className="fixed top-0 bottom-0 left-0 w-64 bg-slate-50 border-r border-slate-200 flex flex-col p-4 shadow-2xl animate-in slide-in-from-left duration-200">
            <div className="flex items-center justify-between mb-7">
              <div className="flex items-center gap-3">
                <div className="workspace-mark" aria-hidden="true">K</div>
                <div>
                  <span className="block font-semibold text-sm text-slate-800">KIM CRM</span>
                  <span className="block text-[11px] text-slate-500 mt-0.5">Workspace</span>
                </div>
              </div>
              <button
                onClick={() => setMobileMenuOpen(false)}
                aria-label="Close navigation"
                className="p-2 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-md"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <nav className="flex-1 space-y-1.5 overflow-y-auto">
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
                    className="workspace-nav-item group relative w-full flex items-center justify-between"
                  >

                    <div className="flex items-center gap-3 min-w-0">
                      <span className="workspace-nav-icon">
                        <Icon className="w-4 h-4" />
                      </span>
                      <span>{item.name}</span>
                    </div>
                    {item.badge !== undefined && item.badge !== null && item.badge > 0 && (
                      <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full ${
                        isActive ? 'bg-white text-slate-600' : 'bg-amber-100 text-amber-800 border border-amber-200/60'
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

