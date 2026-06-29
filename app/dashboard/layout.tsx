'use client';

import React, { useState } from 'react';
import { useAuth } from '../../lib/context/AuthContext';
import { useRouter, usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Building2,
  FolderTree,
  Users,
  CalendarDays,
  Settings,
  LogOut,
  Menu,
  X,
  User,
  Loader2,
  ShieldAlert,
  UserX,
  UserPlus
} from 'lucide-react';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, logout, isLoading, isAdmin } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);

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

  // Define sidebar menu items
  const menuItems = [
    { name: 'Overview', path: '/dashboard', icon: LayoutDashboard },
    { name: 'Groups', path: '/dashboard/groups', icon: FolderTree },
    { name: 'Companies', path: '/dashboard/companies', icon: Building2 },
    { name: 'Contacts', path: '/dashboard/contacts', icon: Users },
    { name: 'Events', path: '/dashboard/events', icon: CalendarDays },
    { name: 'Flagged Identities', path: '/dashboard/flagged', icon: ShieldAlert },
    { name: 'Removal Requests', path: '/dashboard/settings', icon: UserX },
    { name: 'User Management', path: '/dashboard/users', icon: User },
  ];

  // Filter based on user roles
  const filteredMenuItems = menuItems.filter((item) => {
    if (item.path === '/dashboard/settings' || item.path === '/dashboard/users') {
      return isAdmin;
    }
    if (item.path === '/dashboard/flagged') {
      const isManager = user?.roles?.includes('MANAGER') || false;
      return isAdmin || isManager;
    }
    return true;
  });

  const handleNav = (path: string) => {
    router.push(path);
    setMobileMenuOpen(false);
  };

  return (
    <div className="min-h-screen flex bg-slate-50 text-slate-900 font-sans">
      {/* 1. Large Screen Sidebar */}
      <aside className="hidden md:flex flex-col w-64 bg-white border-r border-slate-200 shrink-0">
        <div className="h-16 flex items-center gap-3 px-6 border-b border-slate-200 bg-white">
          <div className="p-1.5 bg-blue-600 rounded-lg text-white">
            <Building2 className="w-5 h-5" />
          </div>
          <span className="font-extrabold text-xl tracking-tight text-blue-900">KIM CRM</span>
        </div>

        <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
          {filteredMenuItems.map((item) => {
            const isActive = pathname === item.path;
            const Icon = item.icon;
            return (
              <button
                key={item.name}
                onClick={() => handleNav(item.path)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium text-sm transition-all ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/15'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <Icon className="w-5 h-5" />
                {item.name}
              </button>
            );
          })}
        </nav>
      </aside>

      {/* 2. Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-x-hidden">
        {/* Mobile Header / Top Bar */}
        <header className="h-16 flex items-center justify-between px-6 bg-white border-b border-slate-200 sticky top-0 z-30 shadow-sm">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="md:hidden p-2 -ml-2 text-slate-500 hover:text-slate-900 rounded-lg"
            >
              <Menu className="w-6 h-6" />
            </button>
            <h1 className="text-lg font-bold text-slate-900 md:text-xl">
              {filteredMenuItems.find((i) => pathname === i.path)?.name || 'Dashboard'}
            </h1>
          </div>

          <div className="flex items-center gap-4">
            {/* Top Right User Profile Dropdown */}
            <div className="relative">
              <button
                onClick={() => setDropdownOpen(!dropdownOpen)}
                className="flex items-center gap-2 px-3 py-1.5 hover:bg-slate-100 active:bg-slate-200 rounded-xl transition-all duration-150 focus:outline-none"
              >
                <div className="w-8 h-8 rounded-full bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 font-bold text-sm">
                  {user?.fullName?.charAt(0).toUpperCase() || user?.username?.charAt(0).toUpperCase() || 'U'}
                </div>
                <span className="hidden sm:inline text-sm font-semibold text-slate-700">{user?.fullName || user?.username}</span>
                <svg className={`w-4 h-4 text-slate-500 transition-transform ${dropdownOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {dropdownOpen && (
                <>
                  {/* Backdrop overlay to close when clicking outside */}
                  <div className="fixed inset-0 z-10" onClick={() => setDropdownOpen(false)}></div>
                  
                  <div className="absolute right-0 mt-2 w-56 bg-white border border-slate-200 rounded-xl shadow-lg py-2 z-20 animate-in fade-in slide-in-from-top-1 duration-100 text-slate-900">
                    <div className="px-4 py-2 border-b border-slate-100">
                      <p className="text-sm font-bold text-slate-900 truncate">{user?.fullName || user?.username}</p>
                      <p className="text-xs text-slate-500 truncate">{user?.email}</p>
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
        <main className="flex-1 p-6 md:p-8 max-w-7xl w-full mx-auto">
          {children}
        </main>
      </div>

      {/* 3. Mobile Navigation Drawer Overlay */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 md:hidden">
          <div className="fixed top-0 bottom-0 left-0 w-64 bg-white border-r border-slate-200 flex flex-col p-6 shadow-2xl animate-in slide-in-from-left duration-200">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-blue-600 rounded-lg text-white">
                  <Building2 className="w-5 h-5" />
                </div>
                <span className="font-extrabold text-xl text-blue-900">KIM CRM</span>
              </div>
              <button
                onClick={() => setMobileMenuOpen(false)}
                className="p-1 text-slate-500 hover:text-slate-900 rounded-lg"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <nav className="flex-1 space-y-1">
              {filteredMenuItems.map((item) => {
                const isActive = pathname === item.path;
                const Icon = item.icon;
                return (
                  <button
                    key={item.name}
                    onClick={() => handleNav(item.path)}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium text-sm transition-all ${
                      isActive
                        ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/15'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                    {item.name}
                  </button>
                );
              })}
            </nav>

            <div className="border-t border-slate-100 pt-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 font-bold">
                  {user?.fullName?.charAt(0).toUpperCase() || 'U'}
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-900">{user?.fullName || user?.username}</p>
                  <p className="text-xs text-slate-500">{user?.email}</p>
                </div>
              </div>
              <button
                onClick={() => logout()}
                className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-slate-100 hover:bg-red-50 hover:text-red-600 border border-slate-200 hover:border-red-200 rounded-xl text-slate-700 text-sm font-medium transition-all"
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
