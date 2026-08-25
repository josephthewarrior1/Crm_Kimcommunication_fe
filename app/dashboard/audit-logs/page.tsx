'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../../../lib/context/AuthContext';
import { AuditLog } from '../../../lib/types';
import { auditLogService } from '../../../lib/services/auditLogService';
import {
  History,
  Search,
  Filter,
  Download,
  RefreshCw,
  Calendar,
  User,
  Shield,
  Layers,
  Activity,
  PlusCircle,
  Edit,
  Trash2,
  Upload,
  CheckCircle2,
  XCircle,
  ShieldAlert,
  LogIn,
  SlidersHorizontal,
  ChevronLeft,
  ChevronRight,
  Clock,
  Eye,
  X,
  FileSpreadsheet
} from 'lucide-react';
import { toast } from 'sonner';

export default function AuditLogsPage() {
  const { user, isAdmin, isManager } = useAuth();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedModule, setSelectedModule] = useState('ALL');
  const [selectedAction, setSelectedAction] = useState('ALL');
  const [selectedUser, setSelectedUser] = useState('ALL');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // View mode: 'table' | 'timeline'
  const [viewMode, setViewMode] = useState<'table' | 'timeline'>('table');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);

  // Detail Modal
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);

  const fetchLogs = async (showToast: boolean = false) => {
    try {
      if (showToast) setRefreshing(true);
      else setLoading(true);

      const data = await auditLogService.getAuditLogs({
        search: searchQuery || undefined,
        module: selectedModule !== 'ALL' ? selectedModule : undefined,
        actionType: selectedAction !== 'ALL' ? selectedAction : undefined,
        username: selectedUser !== 'ALL' ? selectedUser : undefined,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
      });

      setLogs(data);
      if (showToast) {
        toast.success('Audit logs berhasil diperbarui!');
      }
    } catch (err: any) {
      toast.error('Gagal mengambil audit logs: ' + (err.message || 'Unknown error'));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [selectedModule, selectedAction, selectedUser, startDate, endDate]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchLogs();
    setCurrentPage(1);
  };

  const handleResetFilters = () => {
    setSearchQuery('');
    setSelectedModule('ALL');
    setSelectedAction('ALL');
    setSelectedUser('ALL');
    setStartDate('');
    setEndDate('');
    setCurrentPage(1);
  };

  const handleExport = () => {
    if (filteredLogs.length === 0) {
      toast.error('Tidak ada data log untuk diekspor.');
      return;
    }
    auditLogService.exportToExcel(filteredLogs, `CRM_Activity_Audit_Logs_${new Date().toISOString().slice(0,10)}.xlsx`);
    toast.success(`Berhasil mengekspor ${filteredLogs.length} data log ke Excel!`);
  };

  // Extract unique usernames for filter dropdown
  const uniqueUsers = useMemo(() => {
    const users = new Set<string>();
    logs.forEach(l => { if (l.username) users.add(l.username); });
    return Array.from(users);
  }, [logs]);

  // Client-side quick search filtering if user typed in search input
  const filteredLogs = useMemo(() => {
    if (!searchQuery.trim()) return logs;
    const q = searchQuery.toLowerCase().trim();
    return logs.filter(l =>
      l.username.toLowerCase().includes(q) ||
      (l.userFullName && l.userFullName.toLowerCase().includes(q)) ||
      l.description.toLowerCase().includes(q) ||
      (l.targetName && l.targetName.toLowerCase().includes(q)) ||
      l.module.toLowerCase().includes(q) ||
      l.actionType.toLowerCase().includes(q)
    );
  }, [logs, searchQuery]);

  // Pagination slice
  const totalPages = Math.ceil(filteredLogs.length / pageSize) || 1;
  const paginatedLogs = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredLogs.slice(start, start + pageSize);
  }, [filteredLogs, currentPage, pageSize]);

  // Analytics / Stat summary
  const stats = useMemo(() => {
    const now = new Date();
    const isToday = (dateStr: string) => {
      const d = new Date(dateStr);
      return d.toDateString() === now.toDateString();
    };

    const todayCount = logs.filter(l => isToday(l.createdAt)).length;
    
    // User activity counts
    const userCounts: Record<string, number> = {};
    logs.forEach(l => {
      userCounts[l.username] = (userCounts[l.username] || 0) + 1;
    });

    let topUser = '-';
    let topUserMax = 0;
    Object.entries(userCounts).forEach(([u, count]) => {
      if (count > topUserMax) {
        topUserMax = count;
        topUser = u;
      }
    });

    const criticalCount = logs.filter(l => 
      ['DELETE', 'APPROVE_TAKEOUT', 'REJECT_TAKEOUT', 'FLAG_TIKUS'].includes(l.actionType)
    ).length;

    return {
      total: logs.length,
      today: todayCount,
      topUser: topUser !== '-' ? `${topUser} (${topUserMax})` : '-',
      critical: criticalCount
    };
  }, [logs]);

  const getActionBadge = (action: string) => {
    switch (action) {
      case 'CREATE':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-bold rounded-lg">
            <PlusCircle className="w-3.5 h-3.5" /> CREATE
          </span>
        );
      case 'UPDATE':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-blue-50 text-blue-700 border border-blue-200 text-xs font-bold rounded-lg">
            <Edit className="w-3.5 h-3.5" /> UPDATE
          </span>
        );
      case 'DELETE':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-red-50 text-red-700 border border-red-200 text-xs font-bold rounded-lg">
            <Trash2 className="w-3.5 h-3.5" /> DELETE
          </span>
        );
      case 'IMPORT_EXCEL':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-purple-50 text-purple-700 border border-purple-200 text-xs font-bold rounded-lg">
            <Upload className="w-3.5 h-3.5" /> IMPORT EXCEL
          </span>
        );
      case 'APPROVE_TAKEOUT':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-bold rounded-lg">
            <CheckCircle2 className="w-3.5 h-3.5" /> APPROVED
          </span>
        );
      case 'REJECT_TAKEOUT':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-rose-50 text-rose-700 border border-rose-200 text-xs font-bold rounded-lg">
            <XCircle className="w-3.5 h-3.5" /> REJECTED
          </span>
        );
      case 'FLAG_TIKUS':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-amber-50 text-amber-800 border border-amber-300 text-xs font-bold rounded-lg">
            <ShieldAlert className="w-3.5 h-3.5" /> FLAGGED
          </span>
        );
      case 'LOGIN':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-indigo-50 text-indigo-700 border border-indigo-200 text-xs font-bold rounded-lg">
            <LogIn className="w-3.5 h-3.5" /> LOGIN
          </span>
        );
      case 'STATUS_CHANGE':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-cyan-50 text-cyan-800 border border-cyan-200 text-xs font-bold rounded-lg">
            <Activity className="w-3.5 h-3.5" /> STATUS CHANGE
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-slate-100 text-slate-700 border border-slate-200 text-xs font-bold rounded-lg">
            {action}
          </span>
        );
    }
  };

  const getModuleBadge = (mod: string) => {
    switch (mod) {
      case 'DATABASE':
        return <span className="text-xs font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-100">Database Kontak</span>;
      case 'COMPANIES':
        return <span className="text-xs font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-100">Company</span>;
      case 'GROUPS':
        return <span className="text-xs font-bold text-teal-700 bg-teal-50 px-2 py-0.5 rounded-md border border-teal-100">Group Holding</span>;
      case 'EVENTS':
        return <span className="text-xs font-bold text-violet-700 bg-violet-50 px-2 py-0.5 rounded-md border border-violet-100">Event</span>;
      case 'PARTICIPANTS':
        return <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-100">Peserta Event</span>;
      case 'TAKEOUT':
        return <span className="text-xs font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-100">Takeout Request</span>;
      case 'FLAGGED':
        return <span className="text-xs font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-md border border-rose-100">Flagged Fraud</span>;
      case 'USER_MANAGEMENT':
        return <span className="text-xs font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200">User Management</span>;
      case 'AUTH':
        return <span className="text-xs font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200">Autentikasi</span>;
      default:
        return <span className="text-xs font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md">{mod}</span>;
    }
  };

  const getRoleBadge = (role?: string) => {
    switch (role?.toUpperCase()) {
      case 'ADMIN':
        return <span className="text-[10px] uppercase font-black tracking-wider text-violet-700 bg-violet-100/80 px-1.5 py-0.5 rounded">Admin</span>;
      case 'MANAGER':
        return <span className="text-[10px] uppercase font-black tracking-wider text-emerald-700 bg-emerald-100/80 px-1.5 py-0.5 rounded">Manager</span>;
      default:
        return <span className="text-[10px] uppercase font-bold tracking-wider text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded">User</span>;
    }
  };

  const parseToDate = (dateStr: string): Date => {
    if (!dateStr) return new Date();
    let s = String(dateStr).trim();
    // Jika format ISO dari server tanpa Z atau offset timezone, tambahkan Z (asumsikan UTC)
    if (s.includes('T') && !s.endsWith('Z') && !/[+-]\d{2}(:\d{2})?$/.test(s)) {
      s += 'Z';
    }
    return new Date(s);
  };

  const formatTimestamp = (dateStr: string) => {
    try {
      const d = parseToDate(dateStr);
      return {
        formatted: d.toLocaleString('id-ID', {
          timeZone: 'Asia/Jakarta',
          day: '2-digit',
          month: 'short',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: false
        }).replace(/\./g, ':'),
        timeAgo: getTimeAgo(d)
      };
    } catch {
      return { formatted: dateStr, timeAgo: '' };
    }
  };

  const getTimeAgo = (date: Date) => {
    const diff = Math.floor((Date.now() - date.getTime()) / 1000);
    if (diff < 0 || diff < 60) return 'Baru saja';
    if (diff < 3600) return `${Math.floor(diff / 60)} mnt lalu`;
    if (diff < 86400) return `${Math.floor(diff / 3600)} jam lalu`;
    return `${Math.floor(diff / 86400)} hari lalu`;
  };

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-[1600px] mx-auto text-slate-900">
      {/* 1. Header & Actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-blue-600 text-white rounded-xl shadow-md shadow-blue-600/20">
              <History className="w-6 h-6" />
            </div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">Activity & Audit Logs</h1>
          </div>
          <p className="text-xs md:text-sm text-slate-500 mt-1">
            Lacak riwayat seluruh aktivitas, perubahan data, impor Excel, dan jejak operasional pengguna secara transparan.
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <button
            onClick={() => fetchLogs(true)}
            disabled={refreshing}
            className="px-3.5 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-2 disabled:opacity-60"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin text-blue-600' : ''}`} />
            Refresh
          </button>

          <button
            onClick={handleExport}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-emerald-600/20 flex items-center gap-2"
          >
            <Download className="w-3.5 h-3.5" />
            Export Logs (.xlsx)
          </button>
        </div>
      </div>

      {/* 2. Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Riwayat Log</span>
            <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
              <Layers className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-slate-900 mt-2">{stats.total}</p>
          <p className="text-xs text-slate-400 mt-1">Entri jejak audit tersimpan</p>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Aktivitas Hari Ini</span>
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-emerald-700 mt-2">{stats.today}</p>
          <p className="text-xs text-slate-400 mt-1">Tindakan dieksekusi hari ini</p>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">User Paling Aktif</span>
            <div className="p-2 bg-violet-50 text-violet-600 rounded-xl">
              <User className="w-4 h-4" />
            </div>
          </div>
          <p className="text-lg font-black text-violet-700 mt-2 truncate">{stats.topUser}</p>
          <p className="text-xs text-slate-400 mt-1">Berdasarkan total aksi</p>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Aksi Kritis / Berisiko</span>
            <div className="p-2 bg-rose-50 text-rose-600 rounded-xl">
              <ShieldAlert className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-rose-700 mt-2">{stats.critical}</p>
          <p className="text-xs text-slate-400 mt-1">Penghapusan & approval takeout</p>
        </div>
      </div>

      {/* 3. Filter & Controls Bar */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
          {/* Search Form */}
          <form onSubmit={handleSearchSubmit} className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari berdasarkan nama user, target, deskripsi, atau modul..."
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
            />
          </form>

          {/* View Mode Toggle */}
          <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl shrink-0 self-end lg:self-auto">
            <button
              onClick={() => setViewMode('table')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                viewMode === 'table'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Table View
            </button>
            <button
              onClick={() => setViewMode('timeline')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                viewMode === 'timeline'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Timeline Feed
            </button>
          </div>
        </div>

        {/* Dropdown Filters */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3 pt-2 border-t border-slate-100">
          {/* Module Filter */}
          <div>
            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
              Modul
            </label>
            <select
              value={selectedModule}
              onChange={(e) => { setSelectedModule(e.target.value); setCurrentPage(1); }}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            >
              <option value="ALL">Semua Modul</option>
              <option value="DATABASE">Database Kontak</option>
              <option value="EVENTS">Event</option>
              <option value="PARTICIPANTS">Peserta Event</option>
              <option value="COMPANIES">Companies</option>
              <option value="GROUPS">Groups</option>
              <option value="TAKEOUT">Takeout Request</option>
              <option value="FLAGGED">Flagged Fraud</option>
              <option value="USER_MANAGEMENT">User Management</option>
              <option value="AUTH">Autentikasi</option>
            </select>
          </div>

          {/* Action Filter */}
          <div>
            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
              Tipe Aksi
            </label>
            <select
              value={selectedAction}
              onChange={(e) => { setSelectedAction(e.target.value); setCurrentPage(1); }}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            >
              <option value="ALL">Semua Aksi</option>
              <option value="CREATE">CREATE (Tambah Data)</option>
              <option value="UPDATE">UPDATE (Edit Data)</option>
              <option value="DELETE">DELETE (Hapus Data)</option>
              <option value="IMPORT_EXCEL">IMPORT EXCEL</option>
              <option value="STATUS_CHANGE">STATUS CHANGE</option>
              <option value="APPROVE_TAKEOUT">APPROVE TAKEOUT</option>
              <option value="REJECT_TAKEOUT">REJECT TAKEOUT</option>
              <option value="FLAG_TIKUS">FLAG TIKUS</option>
              <option value="LOGIN">LOGIN</option>
            </select>
          </div>

          {/* User Filter */}
          <div>
            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
              Pelaku (User)
            </label>
            <select
              value={selectedUser}
              onChange={(e) => { setSelectedUser(e.target.value); setCurrentPage(1); }}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            >
              <option value="ALL">Semua Pengguna</option>
              {uniqueUsers.map(u => (
                <option key={u} value={u}>{u}</option>
              ))}
            </select>
          </div>

          {/* Start Date */}
          <div>
            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
              Dari Tanggal
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => { setStartDate(e.target.value); setCurrentPage(1); }}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            />
          </div>

          {/* End Date & Reset */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                Sampai Tanggal
              </label>
              {(selectedModule !== 'ALL' || selectedAction !== 'ALL' || selectedUser !== 'ALL' || startDate || endDate || searchQuery) && (
                <button
                  onClick={handleResetFilters}
                  className="text-[11px] font-bold text-blue-600 hover:text-blue-700 hover:underline"
                >
                  Reset
                </button>
              )}
            </div>
            <input
              type="date"
              value={endDate}
              onChange={(e) => { setEndDate(e.target.value); setCurrentPage(1); }}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            />
          </div>
        </div>
      </div>

      {/* 4. Main Content: Table or Timeline */}
      {loading ? (
        <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center shadow-sm">
          <RefreshCw className="w-8 h-8 text-blue-600 animate-spin mx-auto mb-3" />
          <p className="text-sm font-bold text-slate-700">Memuat riwayat audit log...</p>
          <p className="text-xs text-slate-400 mt-1">Mengambil data jejak aktivitas terbaru</p>
        </div>
      ) : filteredLogs.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center shadow-sm">
          <div className="w-12 h-12 bg-slate-100 text-slate-400 rounded-2xl flex items-center justify-center mx-auto mb-3">
            <History className="w-6 h-6" />
          </div>
          <h3 className="text-base font-extrabold text-slate-800">Tidak ada riwayat log yang sesuai</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
            Tidak ditemukan catatan aktivitas dengan kriteria pencarian atau filter yang Anda pilih.
          </p>
          <button
            onClick={handleResetFilters}
            className="mt-4 px-4 py-2 bg-blue-50 text-blue-600 hover:bg-blue-100 border border-blue-200 text-xs font-bold rounded-xl transition-all"
          >
            Reset Semua Filter
          </button>
        </div>
      ) : viewMode === 'table' ? (
        /* TABLE VIEW */
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/80 text-slate-500 uppercase tracking-wider font-extrabold">
                  <th className="py-3.5 px-4">Waktu</th>
                  <th className="py-3.5 px-4">Pelaku (User)</th>
                  <th className="py-3.5 px-4">Modul</th>
                  <th className="py-3.5 px-4">Aksi</th>
                  <th className="py-3.5 px-4">Target Entitas</th>
                  <th className="py-3.5 px-4">Deskripsi Aktivitas</th>
                  <th className="py-3.5 px-4 text-right">Detail</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {paginatedLogs.map((log) => {
                  const { formatted, timeAgo } = formatTimestamp(log.createdAt);
                  return (
                    <tr
                      key={log.id}
                      className="hover:bg-slate-50/80 transition-colors group cursor-pointer"
                      onClick={() => setSelectedLog(log)}
                    >
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="font-bold text-slate-800 font-mono text-[11px]">{formatted}</div>
                        <div className="text-[10px] text-slate-400 font-medium">{timeAgo}</div>
                      </td>

                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 text-white font-bold flex items-center justify-center text-[10px] shadow-sm">
                            {log.username.slice(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <div className="font-bold text-slate-900 flex items-center gap-1.5">
                              {log.userFullName || log.username}
                              {getRoleBadge(log.userRole)}
                            </div>
                            <div className="text-[10px] text-slate-400">@{log.username}</div>
                          </div>
                        </div>
                      </td>

                      <td className="py-3.5 px-4 whitespace-nowrap">
                        {getModuleBadge(log.module)}
                      </td>

                      <td className="py-3.5 px-4 whitespace-nowrap">
                        {getActionBadge(log.actionType)}
                      </td>

                      <td className="py-3.5 px-4 font-semibold text-slate-800 max-w-[200px] truncate">
                        {log.targetName || <span className="text-slate-300">-</span>}
                      </td>

                      <td className="py-3.5 px-4 text-slate-600 max-w-[320px]">
                        <p className="line-clamp-2 leading-relaxed">{log.description}</p>
                      </td>

                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedLog(log);
                          }}
                          className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors inline-flex items-center gap-1 text-[11px] font-bold"
                        >
                          <Eye className="w-4 h-4" />
                          <span className="hidden sm:inline">Lihat</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-6 py-4 border-t border-slate-100 bg-slate-50/50">
            <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
              <span>Menampilkan</span>
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="px-2 py-1 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-700 focus:outline-none"
              >
                <option value={10}>10</option>
                <option value={15}>15</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
              </select>
              <span>dari <strong>{filteredLogs.length}</strong> total data</span>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="p-1.5 bg-white border border-slate-200 text-slate-600 hover:text-slate-900 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed shadow-sm transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-xs font-bold text-slate-700 px-2">
                Halaman {currentPage} dari {totalPages}
              </span>
              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="p-1.5 bg-white border border-slate-200 text-slate-600 hover:text-slate-900 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed shadow-sm transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* TIMELINE FEED VIEW */
        <div className="space-y-4">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
            <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
              {paginatedLogs.map((log) => {
                const { formatted, timeAgo } = formatTimestamp(log.createdAt);
                return (
                  <div key={log.id} className="relative group">
                    {/* Circle Indicator */}
                    <div className="absolute -left-[30px] top-1.5 w-4 h-4 rounded-full bg-white border-2 border-blue-600 group-hover:scale-125 transition-transform" />

                    <div className="bg-slate-50 hover:bg-blue-50/40 border border-slate-200/80 rounded-xl p-4 transition-all shadow-sm space-y-2.5">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-blue-600 text-white font-bold flex items-center justify-center text-[10px]">
                            {log.username.slice(0, 2).toUpperCase()}
                          </div>
                          <span className="text-xs font-extrabold text-slate-900">{log.userFullName || log.username}</span>
                          {getRoleBadge(log.userRole)}
                          <span className="text-slate-300">•</span>
                          {getModuleBadge(log.module)}
                          {getActionBadge(log.actionType)}
                        </div>

                        <span className="text-[11px] font-mono text-slate-400 font-medium">{formatted} ({timeAgo})</span>
                      </div>

                      <p className="text-xs text-slate-700 leading-relaxed font-medium">
                        {log.description}
                      </p>

                      {log.targetName && (
                        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-white border border-slate-200 rounded-lg text-[11px] font-bold text-slate-600">
                          <span>Target:</span>
                          <span className="text-blue-700">{log.targetName}</span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Timeline Pagination */}
          <div className="flex items-center justify-center gap-2 pt-2">
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="px-3 py-1.5 bg-white border border-slate-200 text-slate-600 text-xs font-bold rounded-xl disabled:opacity-40 shadow-sm"
            >
              Sebelumnya
            </button>
            <span className="text-xs font-bold text-slate-700 px-3">
              Halaman {currentPage} / {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="px-3 py-1.5 bg-white border border-slate-200 text-slate-600 text-xs font-bold rounded-xl disabled:opacity-40 shadow-sm"
            >
              Berikutnya
            </button>
          </div>
        </div>
      )}

      {/* 5. Detail Modal */}
      {selectedLog && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-white border border-slate-200 rounded-2xl p-6 shadow-2xl relative animate-in scale-in duration-200 space-y-4">
            <button
              onClick={() => setSelectedLog(null)}
              className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl">
                <History className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-extrabold text-slate-900">Detail Riwayat Aktivitas</h3>
                <p className="text-xs text-slate-400 font-mono">Log ID #{selectedLog.id}</p>
              </div>
            </div>

            <div className="space-y-3 bg-slate-50 border border-slate-200/80 rounded-xl p-4 text-xs divide-y divide-slate-200/60">
              <div className="flex justify-between items-center pb-2">
                <span className="text-slate-500 font-medium">Waktu Kejadian</span>
                <span className="font-bold text-slate-800 font-mono">
                  {formatTimestamp(selectedLog.createdAt).formatted}
                </span>
              </div>

              <div className="flex justify-between items-center py-2">
                <span className="text-slate-500 font-medium">Pelaku (Actor)</span>
                <div className="text-right">
                  <span className="font-extrabold text-slate-900 block">{selectedLog.userFullName || selectedLog.username}</span>
                  <span className="text-[11px] text-slate-400">@{selectedLog.username} ({selectedLog.userRole || 'USER'})</span>
                </div>
              </div>

              <div className="flex justify-between items-center py-2">
                <span className="text-slate-500 font-medium">Modul</span>
                <div>{getModuleBadge(selectedLog.module)}</div>
              </div>

              <div className="flex justify-between items-center py-2">
                <span className="text-slate-500 font-medium">Tipe Aksi</span>
                <div>{getActionBadge(selectedLog.actionType)}</div>
              </div>

              {selectedLog.targetName && (
                <div className="flex justify-between items-center py-2">
                  <span className="text-slate-500 font-medium">Target Entitas</span>
                  <span className="font-bold text-blue-700">{selectedLog.targetName}</span>
                </div>
              )}

              <div className="flex justify-between items-center py-2">
                <span className="text-slate-500 font-medium">IP Address</span>
                <span className="font-mono text-slate-600">{selectedLog.ipAddress || '127.0.0.1'}</span>
              </div>

              <div className="pt-2">
                <span className="text-slate-500 font-medium block mb-1">Deskripsi Lengkap:</span>
                <p className="p-2.5 bg-white border border-slate-200 rounded-lg text-slate-800 leading-relaxed font-medium">
                  {selectedLog.description}
                </p>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setSelectedLog(null)}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-colors"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
