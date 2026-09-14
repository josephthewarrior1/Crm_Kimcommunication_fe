'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import * as Dialog from '@radix-ui/react-dialog';
import { useAuth } from '../../lib/context/AuthContext';
import { useRouter, usePathname } from 'next/navigation';
import DatabaseTargetWarning from './components/DatabaseTargetWarning';
import {
  LayoutDashboard,
  Building2,
  FolderTree,
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
  Target,
  ChevronRight,
} from 'lucide-react';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, logout, isLoading, isAdmin, isManager, isUser } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const accountButtonRef = React.useRef<HTMLButtonElement>(null);
  const isViewer = isUser || (!isAdmin && !isManager);

  // ponytail: Viewer role is restricted to Events page only.
  useEffect(() => {
    if (!isLoading && isViewer && pathname !== '/dashboard/events') {
      router.replace('/dashboard/events');
    }
  }, [isLoading, isViewer, pathname, router]);

  useEffect(() => {
    setMobileMenuOpen(false);
    setDropdownOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!mobileMenuOpen) return;
    const desktop = window.matchMedia('(min-width: 768px)');
    const closeOnDesktop = () => {
      if (desktop.matches) setMobileMenuOpen(false);
    };
    closeOnDesktop();
    desktop.addEventListener('change', closeOnDesktop);
    return () => desktop.removeEventListener('change', closeOnDesktop);
  }, [mobileMenuOpen]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 text-slate-900">
        <div className="text-center">
          <Loader2 className="w-10 h-10 animate-spin text-blue-600 mx-auto mb-3" />
          <p className="text-sm text-slate-500">Verifying session...</p>
        </div>
      </div>
    );
  }

  const menuItems = [
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

  const filteredMenuItems = menuItems.filter((item) => {
    if (isViewer) return item.path === '/dashboard/events';
    if (item.path === '/dashboard/takeout' || item.path === '/dashboard/users' || item.path === '/dashboard/data-cleaner' || item.path === '/dashboard/targets') {
      return isAdmin;
    }
    if (item.path === '/dashboard/audit-logs') return isAdmin || isManager;
    return true;
  });
  const isActivePath = (path: string) => pathname === path || (path !== '/dashboard' && pathname.startsWith(`${path}/`));
  const currentPage = filteredMenuItems.find((item) => isActivePath(item.path))?.name || 'Dashboard';
  const menuSections = [
    { name: 'Workspace', items: menuItems.slice(0, 5).filter((item) => filteredMenuItems.includes(item)) },
    { name: 'Management', items: menuItems.slice(5).filter((item) => filteredMenuItems.includes(item)) },
  ];
  const initial = user?.fullName?.charAt(0).toUpperCase() || user?.username?.charAt(0).toUpperCase() || 'U';

  const renderNavigation = (compact = false) => (
    <nav aria-label={compact ? 'Main navigation' : 'Mobile navigation'} className="workspace-navigation min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 py-4">
      {menuSections.filter((section) => section.items.length > 0).map((section, index) => (
        <div key={section.name} className={index > 0 ? 'mt-3 border-t border-slate-200 pt-3' : undefined}>
          <p className={`mb-2 px-3 text-[11px] font-semibold text-slate-500 ${compact ? 'md:sr-only lg:not-sr-only lg:mb-2 lg:px-3' : ''}`}>
            {section.name}
          </p>
          <div className="space-y-0.5">
            {section.items.map((item) => {
              const isActive = isActivePath(item.path);
              const Icon = item.icon;
              return (
                <Link
                  key={item.path}
                  href={item.path}
                  prefetch={false}
                  onClick={() => setMobileMenuOpen(false)}
                  title={compact ? item.name : undefined}
                  aria-current={isActive ? 'page' : undefined}
                  className={`group relative flex min-h-10 items-center gap-3 rounded-md px-3 py-2 text-[13px] font-medium transition-colors ${compact ? 'md:justify-center lg:justify-start' : ''} ${isActive ? 'bg-blue-50 text-blue-700' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'}`}
                >
                  {isActive && <span aria-hidden="true" className="absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r-full bg-blue-600" />}
                  <Icon aria-hidden="true" className={`h-5 w-5 shrink-0 ${isActive ? 'text-blue-600' : 'text-slate-500 group-hover:text-slate-700'}`} strokeWidth={1.7} />
                  <span className={compact ? 'md:sr-only lg:not-sr-only' : undefined}>{item.name}</span>
                </Link>
              );
            })}
          </div>
        </div>
      ))}
    </nav>
  );

  return (
    <Dialog.Root open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
      <div className="min-h-dvh bg-slate-100 text-slate-900 md:pl-20 lg:pl-60">
        <a href="#workspace-content" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-2 focus:z-[60] focus:rounded-md focus:bg-white focus:px-4 focus:py-3 focus:text-blue-700 focus:shadow-lg">Skip to content</a>

        <aside className="fixed inset-y-0 left-0 z-30 hidden w-20 flex-col border-r border-slate-200 bg-white md:flex lg:w-60">
          <Link href={isViewer ? '/dashboard/events' : '/dashboard'} className="flex h-16 shrink-0 items-center justify-center gap-3 border-b border-slate-200 px-3 lg:justify-start lg:px-6" aria-label="KIM CRM · KIM Communications">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-600 text-white"><Building2 aria-hidden="true" className="h-5 w-5" strokeWidth={1.7} /></span>
            <span className="hidden min-w-0 lg:block">
              <span className="block text-[15px] font-semibold leading-5 tracking-tight">KIM CRM</span>
              <span className="block text-[11px] leading-4 text-slate-500">KIM Communications</span>
            </span>
          </Link>
          {renderNavigation(true)}
        </aside>

        <header className="relative z-30 flex h-16 items-center justify-between gap-3 border-b border-slate-200 bg-white px-4 sm:px-6 xl:px-8">
          <div className="flex min-w-0 items-center gap-3">
            <Dialog.Trigger asChild>
              <button type="button" aria-label="Open navigation" className="-ml-2 rounded-md p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-900 md:hidden">
                <Menu aria-hidden="true" className="h-5 w-5" />
              </button>
            </Dialog.Trigger>
            <span className="shrink-0 text-[15px] font-semibold tracking-tight md:hidden">KIM CRM</span>
            <span className="hidden text-[13px] text-slate-500 md:block">Workspace</span>
            <ChevronRight aria-hidden="true" className="hidden h-3.5 w-3.5 shrink-0 text-slate-300 sm:block" />
            <span className="hidden truncate text-[13px] font-semibold text-blue-700 sm:block">{currentPage}</span>
          </div>

          <div className="relative shrink-0" onKeyDown={(event) => {
            if (event.key === 'Escape') {
              setDropdownOpen(false);
              accountButtonRef.current?.focus();
            }
          }}>
            <button
              ref={accountButtonRef}
              type="button"
              onClick={() => setDropdownOpen(!dropdownOpen)}
              aria-label="Account options"
              aria-expanded={dropdownOpen}
              aria-controls={dropdownOpen ? 'account-options' : undefined}
              className="flex items-center gap-2.5 rounded-md px-2 py-1.5 transition-colors hover:bg-slate-100"
            >
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-50 text-sm font-semibold text-blue-700 ring-1 ring-blue-100">{initial}</span>
              <span className="hidden flex-col text-left md:flex">
                <span className="max-w-40 truncate text-xs font-semibold leading-tight">{user?.fullName || user?.username}</span>
                {user?.roles?.[0] && <span className="mt-1 text-[10px] leading-none text-slate-500">{user.roles[0] === 'MANAGER' ? 'PIC' : user.roles[0]}</span>}
              </span>
              <svg aria-hidden="true" className={`h-3.5 w-3.5 text-slate-500 transition-transform ${dropdownOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            {dropdownOpen && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setDropdownOpen(false)} />
                <div id="account-options" className="absolute right-0 z-20 mt-2 w-64 max-w-[calc(100vw-2rem)] rounded-lg border border-slate-200 bg-white py-2 text-slate-900 shadow-xl">
                  <div className="border-b border-slate-100 px-4 py-2.5">
                    <p className="truncate text-sm font-semibold">{user?.fullName || user?.username}</p>
                    <p className="mt-0.5 truncate text-xs text-slate-500">{user?.email}</p>
                  </div>
                  <div className="space-y-1 p-1.5">
                    {isAdmin && (
                      <Link href="/dashboard/users" onClick={() => setDropdownOpen(false)} className="flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
                        <UserPlus aria-hidden="true" className="h-4 w-4 text-slate-500" />Create User Account
                      </Link>
                    )}
                    <button type="button" onClick={() => { setDropdownOpen(false); logout(); }} className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50">
                      <LogOut aria-hidden="true" className="h-4 w-4" />Logout
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </header>

        <main id="workspace-content" tabIndex={-1} className="teams-content mx-auto min-h-[calc(100dvh-4rem)] w-full min-w-0 max-w-[1680px] p-4 sm:p-6 xl:p-8">
          {!isViewer && user && <DatabaseTargetWarning />}
          <React.Suspense fallback={<p role="status" className="py-8 text-sm text-slate-500">Loading page...</p>}>
            {children}
          </React.Suspense>
        </main>

        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-50 bg-slate-900/40 md:hidden" />
          <Dialog.Content aria-describedby={undefined} className="fixed inset-y-0 left-0 z-50 flex w-72 max-w-[calc(100vw-2rem)] flex-col border-r border-slate-200 bg-white shadow-2xl focus:outline-none md:hidden">
            <div className="flex h-16 shrink-0 items-center gap-3 border-b border-slate-200 px-5">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-600 text-white"><Building2 aria-hidden="true" className="h-5 w-5" strokeWidth={1.7} /></span>
              <div className="min-w-0 flex-1">
                <Dialog.Title className="text-[15px] font-semibold leading-5 tracking-tight">KIM CRM</Dialog.Title>
                <p className="text-[11px] leading-4 text-slate-500">KIM Communications</p>
              </div>
              <Dialog.Close asChild>
                <button type="button" aria-label="Close navigation" className="-mr-2 rounded-md p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-900"><X aria-hidden="true" className="h-5 w-5" /></button>
              </Dialog.Close>
            </div>
            {renderNavigation()}
            <div className="shrink-0 border-t border-slate-200 p-3">
              <div className="flex items-center gap-3 px-3 py-2">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-100 text-sm font-semibold text-blue-800">{initial}</span>
                <div className="min-w-0">
                  <p className="truncate text-[13px] font-semibold text-slate-900">{user?.fullName || user?.username}</p>
                  <p className="truncate text-[11px] text-slate-500">{user?.email}</p>
                </div>
              </div>
              <button type="button" onClick={() => { setMobileMenuOpen(false); logout(); }} className="mt-1 flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-[13px] font-medium text-slate-600 hover:bg-red-50 hover:text-red-600">
                <LogOut aria-hidden="true" className="h-5 w-5" strokeWidth={1.7} />Logout
              </button>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </div>
    </Dialog.Root>
  );
}

