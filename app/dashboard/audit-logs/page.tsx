'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '../../../lib/context/AuthContext';
import { useRouter } from 'next/navigation';
import { AuditLog, AuditLogFilterOptions, AuditLogSummary } from '../../../lib/types';
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
  const { user, isAdmin, isManager, isLoading } = useAuth();
  const router = useRouter();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [totalLogs, setTotalLogs] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [summary, setSummary] = useState<AuditLogSummary>({
    total: 0,
    today: 0,
    topUser: '-',
    topUserCount: 0,
    critical: 0
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedModule, setSelectedModule] = useState('ALL');
  const [selectedAction, setSelectedAction] = useState('ALL');
  const [selectedUser, setSelectedUser] = useState(user?.username || 'ALL');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // View mode: 'table' | 'timeline'
  const [viewMode, setViewMode] = useState<'table' | 'timeline'>('table');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);

  // Detail Modal
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);
  const [filterOptions, setFilterOptions] = useState<AuditLogFilterOptions>({
    users: [],
    modules: [],
    actionTypes: []
  });

  useEffect(() => {
    if (isLoading) return;
    if (!isAdmin && !isManager) {
      toast.error('Access denied. Only ADMIN or MANAGER can view Activity Logs.');
      router.replace('/dashboard');
    }
  }, [isAdmin, isManager, isLoading, router]);

  const fetchLogs = async (showToast: boolean = false) => {
    if (!isAdmin && !isManager) return;
    try {
      if (showToast) setRefreshing(true);
      else setLoading(true);

      const filters = {
        search: searchQuery || undefined,
        module: selectedModule !== 'ALL' ? selectedModule : undefined,
        actionType: selectedAction !== 'ALL' ? selectedAction : undefined,
        username: isAdmin
          ? (selectedUser !== 'ALL' ? selectedUser : undefined)
          : (user?.username || undefined),
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        page: currentPage,
        size: pageSize,
      };

      const [data, stats, options] = await Promise.all([
        auditLogService.getAuditLogs(filters),
        auditLogService.getAuditLogsSummary(filters),
        auditLogService.getAuditLogFilterOptions()
      ]);

      setLogs(data.items);
      setTotalLogs(data.total);
      setTotalPages(data.totalPages);
      setSummary(stats);
      setFilterOptions(options);
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
    if (!isAdmin && !isManager) return;
    fetchLogs();
  }, [isAdmin, isManager, user?.username, selectedModule, selectedAction, selectedUser, startDate, endDate, currentPage, pageSize]);

  if (isLoading || (!isAdmin && !isManager)) {
    return null;
  }

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (currentPage !== 1) {
      setCurrentPage(1);
      return;
    }
    setCurrentPage(1);
    fetchLogs();
  };

  const handleResetFilters = () => {
    setSearchQuery('');
    setSelectedModule('ALL');
    setSelectedAction('ALL');
    setSelectedUser(isAdmin ? 'ALL' : (user?.username || 'ALL'));
    setStartDate('');
    setEndDate('');
    setCurrentPage(1);
  };

  const handleExport = () => {
    const exportLogs = async () => {
      const data = await auditLogService.getAuditLogs({
        search: searchQuery || undefined,
        module: selectedModule !== 'ALL' ? selectedModule : undefined,
        actionType: selectedAction !== 'ALL' ? selectedAction : undefined,
        username: isAdmin
          ? (selectedUser !== 'ALL' ? selectedUser : undefined)
          : (user?.username || undefined),
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        page: 1,
        size: 1000,
      });

      if (data.items.length === 0) {
        toast.error('Tidak ada data log untuk diekspor.');
        return;
      }

      auditLogService.exportToExcel(data.items, `CRM_Activity_Audit_Logs_${new Date().toISOString().slice(0,10)}.xlsx`);
      toast.success(`Berhasil mengekspor ${data.items.length} data log ke Excel!`);
    };

    exportLogs().catch((err: any) => {
      toast.error('Gagal mengekspor audit logs: ' + (err.message || 'Unknown error'));
    });
  };

  const filteredLogs = logs;
  const paginatedLogs = logs;

  const stats = {
    total: summary.total,
    today: summary.today,
    topUser: summary.topUser !== '-' ? `${summary.topUser} (${summary.topUserCount})` : '-',
    critical: summary.critical
  };

  const getActionBadge = (action: string) => {
    switch (action) {
      case 'CREATE':
        return (
          <span className="inline-flex items-center px-2 py-0.5 bg-emerald-50 text-emerald-700 text-xs font-medium rounded">
            CREATE
          </span>
        );
      case 'UPDATE':
        return (
          <span className="inline-flex items-center px-2 py-0.5 bg-blue-50 text-blue-700 text-xs font-medium rounded">
            UPDATE
          </span>
        );
      case 'DELETE':
        return (
          <span className="inline-flex items-center px-2 py-0.5 bg-red-50 text-red-700 text-xs font-medium rounded">
            DELETE
          </span>
        );
      case 'IMPORT_EXCEL':
        return (
          <span className="inline-flex items-center px-2 py-0.5 bg-purple-50 text-purple-700 text-xs font-medium rounded">
            IMPORT EXCEL
          </span>
        );
      case 'APPROVE_TAKEOUT':
        return (
          <span className="inline-flex items-center px-2 py-0.5 bg-emerald-50 text-emerald-700 text-xs font-medium rounded">
            APPROVED
          </span>
        );
      case 'REJECT_TAKEOUT':
        return (
          <span className="inline-flex items-center px-2 py-0.5 bg-rose-50 text-rose-700 text-xs font-medium rounded">
            REJECTED
          </span>
        );
      case 'FLAG_TIKUS':
        return (
          <span className="inline-flex items-center px-2 py-0.5 bg-amber-50 text-amber-700 text-xs font-medium rounded">
            FLAGGED
          </span>
        );
      case 'LOGIN':
        return (
          <span className="inline-flex items-center px-2 py-0.5 bg-indigo-50 text-indigo-700 text-xs font-medium rounded">
            LOGIN
          </span>
        );
      case 'STATUS_CHANGE':
        return (
          <span className="inline-flex items-center px-2 py-0.5 bg-cyan-50 text-cyan-700 text-xs font-medium rounded">
            STATUS CHANGE
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2 py-0.5 bg-slate-50 text-slate-600 text-xs font-medium rounded">
            {action}
          </span>
        );
    }
  };

  const getModuleBadge = (mod: string) => {
    switch (mod) {
      case 'DATABASE':
        return <span className="text-xs font-medium text-slate-600">Database Kontak</span>;
      case 'COMPANIES':
        return <span className="text-xs font-medium text-slate-600">Company</span>;
      case 'GROUPS':
        return <span className="text-xs font-medium text-slate-600">Group Holding</span>;
      case 'EVENTS':
        return <span className="text-xs font-medium text-slate-600">Event</span>;
      case 'PARTICIPANTS':
      case 'EVENT_PARTICIPANT':
        return <span className="text-xs font-medium text-slate-600">Peserta Event</span>;
      case 'TAKEOUT':
        return <span className="text-xs font-medium text-slate-600">Takeout Request</span>;
      case 'FLAGGED':
        return <span className="text-xs font-medium text-slate-600">Flagged Fraud</span>;
      case 'USER_MANAGEMENT':
        return <span className="text-xs font-medium text-slate-600">User Management</span>;
      case 'AUTH':
        return <span className="text-xs font-medium text-slate-600">Autentikasi</span>;
      default:
        return <span className="text-xs font-medium text-slate-600">{mod}</span>;
    }
  };

  const getRoleBadge = (role?: string) => {
    switch (role?.toUpperCase()) {
      case 'ADMIN':
        return <span className="px-1.5 py-0.5 rounded bg-blue-50 text-[9px] font-bold text-blue-600 leading-none">Admin</span>;
      case 'MANAGER':
        return <span className="px-1.5 py-0.5 rounded bg-emerald-50 text-[9px] font-bold text-emerald-600 leading-none">Manager</span>;
      default:
        return <span className="px-1.5 py-0.5 rounded bg-slate-100 text-[9px] font-bold text-slate-500 leading-none">User</span>;
    }
  };

  const getModuleLabel = (mod: string) => {
    switch (mod) {
      case 'DATABASE': return 'Database Kontak';
      case 'COMPANIES': return 'Companies';
      case 'GROUPS': return 'Groups';
      case 'EVENTS': return 'Event';
      case 'PARTICIPANTS':
      case 'EVENT_PARTICIPANT': return 'Peserta Event';
      case 'TAKEOUT': return 'Takeout Request';
      case 'FLAGGED': return 'Flagged Fraud';
      case 'USER_MANAGEMENT': return 'User Management';
      case 'AUTH': return 'Autentikasi';
      default: return mod;
    }
  };

  const getActionLabel = (action: string) => {
    switch (action) {
      case 'CREATE': return 'CREATE (Tambah Data)';
      case 'UPDATE': return 'UPDATE (Edit Data)';
      case 'DELETE': return 'DELETE (Hapus Data)';
      case 'IMPORT_EXCEL': return 'IMPORT EXCEL';
      case 'STATUS_CHANGE': return 'STATUS CHANGE';
      case 'APPROVE_TAKEOUT': return 'APPROVE TAKEOUT';
      case 'REJECT_TAKEOUT': return 'REJECT TAKEOUT';
      case 'FLAG_TIKUS': return 'FLAG TIKUS';
      case 'LOGIN': return 'LOGIN';
      case 'LOGOUT': return 'LOGOUT';
      default: return action;
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
            <History className="w-5 h-5 text-slate-500" />
            <h1 className="text-xl font-semibold text-slate-900">Activity & Audit Logs</h1>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            {isAdmin
              ? 'Lacak riwayat seluruh aktivitas, perubahan data, impor Excel, dan jejak operasional pengguna secara transparan.'
              : 'Lihat riwayat aktivitas akun kamu sendiri secara transparan.'}
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <button
            onClick={() => fetchLogs(true)}
            disabled={refreshing}
            className="px-3.5 py-2 bg-white hover:bg-slate-50 text-slate-600 border border-slate-200 rounded-lg text-sm font-medium transition-all flex items-center gap-2 disabled:opacity-60"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin text-blue-600' : ''}`} />
            Refresh
          </button>

          <button
            onClick={handleExport}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-all flex items-center gap-2"
          >
            <Download className="w-3.5 h-3.5" />
            Export Logs (.xlsx)
          </button>
        </div>
      </div>

      {/* 2. Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Total Riwayat Log</span>
            <Layers className="w-4 h-4 text-slate-400" />
          </div>
          <p className="text-2xl font-semibold text-slate-900 mt-2">{stats.total}</p>
        </div>

        <div className="bg-white border border-slate-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Aktivitas Hari Ini</span>
            <Clock className="w-4 h-4 text-slate-400" />
          </div>
          <p className="text-2xl font-semibold text-slate-900 mt-2">{stats.today}</p>
        </div>

        <div className="bg-white border border-slate-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">User Paling Aktif</span>
            <User className="w-4 h-4 text-slate-400" />
          </div>
          <p className="text-lg font-semibold text-slate-900 mt-2 truncate">{stats.topUser}</p>
        </div>

        <div className="bg-white border border-slate-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Aksi Kritis / Berisiko</span>
            <ShieldAlert className="w-4 h-4 text-slate-400" />
          </div>
          <p className="text-2xl font-semibold text-slate-900 mt-2">{stats.critical}</p>
        </div>
      </div>

      {/* 3. Filter & Controls Bar */}
      <div className="bg-white border border-slate-200 rounded-lg p-4 space-y-4">
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
          <form onSubmit={handleSearchSubmit} className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari berdasarkan nama user, target, deskripsi, atau modul..."
              className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
            />
          </form>

          <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg shrink-0 self-end lg:self-auto">
            <button
              onClick={() => setViewMode('table')}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                viewMode === 'table'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Table View
            </button>
            <button
              onClick={() => setViewMode('timeline')}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                viewMode === 'timeline'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Timeline Feed
            </button>
          </div>
        </div>

        <div className={`grid grid-cols-1 sm:grid-cols-2 ${isAdmin ? 'md:grid-cols-5' : 'md:grid-cols-4'} gap-3 pt-3 border-t border-slate-200`}>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">
              Modul
            </label>
            <select
              value={selectedModule}
              onChange={(e) => { setSelectedModule(e.target.value); setCurrentPage(1); }}
              className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            >
              <option value="ALL">Semua Modul</option>
              {filterOptions.modules.map(module => (
                <option key={module} value={module}>{getModuleLabel(module)}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">
              Tipe Aksi
            </label>
            <select
              value={selectedAction}
              onChange={(e) => { setSelectedAction(e.target.value); setCurrentPage(1); }}
              className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            >
              <option value="ALL">Semua Aksi</option>
              {filterOptions.actionTypes.map(action => (
                <option key={action} value={action}>{getActionLabel(action)}</option>
              ))}
            </select>
          </div>

          {isAdmin && (
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">
                Pelaku (User)
              </label>
              <select
                value={selectedUser}
                onChange={(e) => { setSelectedUser(e.target.value); setCurrentPage(1); }}
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              >
                <option value="ALL">Semua Pengguna</option>
                {filterOptions.users.map(u => (
                  <option key={u} value={u}>{u}</option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">
              Dari Tanggal
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => { setStartDate(e.target.value); setCurrentPage(1); }}
              className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-medium text-slate-500">
                Sampai Tanggal
              </label>
              {(selectedModule !== 'ALL' || selectedAction !== 'ALL' || (isAdmin && selectedUser !== 'ALL') || startDate || endDate || searchQuery) && (
                <button
                  onClick={handleResetFilters}
                  className="text-xs font-medium text-blue-600 hover:text-blue-700 hover:underline"
                >
                  Reset
                </button>
              )}
            </div>
            <input
              type="date"
              value={endDate}
              onChange={(e) => { setEndDate(e.target.value); setCurrentPage(1); }}
              className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            />
          </div>
        </div>
      </div>

      {/* 4. Main Content: Table or Timeline */}
      {loading ? (
        <div className="bg-white border border-slate-200 rounded-lg p-12 text-center">
          <RefreshCw className="w-8 h-8 text-slate-400 animate-spin mx-auto mb-3" />
          <p className="text-sm font-medium text-slate-700">Memuat riwayat audit log...</p>
          <p className="text-xs text-slate-400 mt-1">Mengambil data jejak aktivitas terbaru</p>
        </div>
      ) : filteredLogs.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-lg p-12 text-center">
          <History className="w-8 h-8 text-slate-300 mx-auto mb-3" />
          <h3 className="text-sm font-semibold text-slate-800">Tidak ada riwayat log yang sesuai</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
            Tidak ditemukan catatan aktivitas dengan kriteria pencarian atau filter yang Anda pilih.
          </p>
          <button
            onClick={handleResetFilters}
            className="mt-4 px-4 py-2 bg-blue-50 text-blue-600 hover:bg-blue-100 border border-blue-200 text-xs font-medium rounded-lg transition-all"
          >
            Reset Semua Filter
          </button>
        </div>
      ) : viewMode === 'table' ? (
        <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-slate-500 uppercase tracking-wider">
                  <th className="py-3 px-4 text-xs font-semibold">Waktu</th>
                  <th className="py-3 px-4 text-xs font-semibold w-[220px]">Pelaku (User)</th>
                  <th className="py-3 px-4 text-xs font-semibold">Modul</th>
                  <th className="py-3 px-4 text-xs font-semibold">Aksi</th>
                  <th className="py-3 px-4 text-xs font-semibold">Target Entitas</th>
                  <th className="py-3 px-4 text-xs font-semibold">Deskripsi Aktivitas</th>
                  <th className="py-3 px-4 text-xs font-semibold text-right">Detail</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {paginatedLogs.map((log) => {
                  const { formatted, timeAgo } = formatTimestamp(log.createdAt);
                  return (
                    <tr
                      key={log.id}
                      className="hover:bg-slate-50 transition-colors group cursor-pointer"
                      onClick={() => setSelectedLog(log)}
                    >
                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="font-medium text-slate-800 font-mono text-xs">{formatted}</div>
                        <div className="text-[10px] text-slate-400">{timeAgo}</div>
                      </td>

                      <td className="py-3 px-4 w-[220px]">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="font-semibold text-slate-900 truncate max-w-[130px] leading-tight">
                            {log.username}
                          </span>
                          {getRoleBadge(log.userRole)}
                        </div>
                      </td>

                      <td className="py-3 px-4 whitespace-nowrap">
                        {getModuleBadge(log.module)}
                      </td>

                      <td className="py-3 px-4 whitespace-nowrap">
                        {getActionBadge(log.actionType)}
                      </td>

                      <td className="py-3 px-4 font-medium text-slate-800 max-w-[200px] truncate">
                        {log.targetName || <span className="text-slate-300">-</span>}
                      </td>

                      <td className="py-3 px-4 text-slate-600 max-w-[320px]">
                        <p className="line-clamp-2 leading-relaxed">{log.description}</p>
                      </td>

                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedLog(log);
                          }}
                          className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors inline-flex items-center gap-1 text-xs font-medium"
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

          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-6 py-4 border-t border-slate-200">
            <div className="flex items-center gap-2 text-sm text-slate-500 font-medium">
              <span>Menampilkan</span>
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="px-2 py-1 bg-white border border-slate-200 rounded-lg text-sm font-medium text-slate-700 focus:outline-none"
              >
                <option value={10}>10</option>
                <option value={15}>15</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
              </select>
              <span>dari <strong>{totalLogs}</strong> total data</span>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="p-1.5 bg-white border border-slate-200 text-slate-600 hover:text-slate-900 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-sm font-medium text-slate-700 px-2">
                Halaman {currentPage} dari {totalPages}
              </span>
              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="p-1.5 bg-white border border-slate-200 text-slate-600 hover:text-slate-900 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="bg-white border border-slate-200 rounded-lg p-6">
            <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
              {paginatedLogs.map((log) => {
                const { formatted, timeAgo } = formatTimestamp(log.createdAt);
                return (
                  <div key={log.id} className="relative group">
                    <div className="absolute -left-[30px] top-1.5 w-3 h-3 rounded-full bg-white border-2 border-slate-400 group-hover:scale-125 transition-transform" />

                    <div className="bg-slate-50 hover:bg-blue-50/30 border border-slate-200 rounded-lg p-4 transition-all space-y-2">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-slate-900 text-white font-medium flex items-center justify-center text-[10px]">
                            {log.username.slice(0, 2).toUpperCase()}
                          </div>
                          <span className="text-xs font-medium text-slate-900">{log.userFullName || log.username}</span>
                          {getRoleBadge(log.userRole)}
                          <span className="text-slate-300">·</span>
                          {getModuleBadge(log.module)}
                          {getActionBadge(log.actionType)}
                        </div>

                        <span className="text-xs font-mono text-slate-400">{formatted} ({timeAgo})</span>
                      </div>

                      <p className="text-sm text-slate-700 leading-relaxed">
                        {log.description}
                      </p>

                      {log.targetName && (
                        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-600">
                          <span>Target:</span>
                          <span className="text-slate-900">{log.targetName}</span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="flex items-center justify-center gap-2 pt-2">
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="px-3 py-1.5 bg-white border border-slate-200 text-slate-600 text-sm font-medium rounded-lg disabled:opacity-40"
            >
              Sebelumnya
            </button>
            <span className="text-sm font-medium text-slate-700 px-3">
              Halaman {currentPage} / {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="px-3 py-1.5 bg-white border border-slate-200 text-slate-600 text-sm font-medium rounded-lg disabled:opacity-40"
            >
              Berikutnya
            </button>
          </div>
        </div>
      )}

      {/* 5. Detail Modal */}
      {selectedLog && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-white border border-slate-200 rounded-xl p-6 relative space-y-4">
            <button
              onClick={() => setSelectedLog(null)}
              className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3">
              <History className="w-5 h-5 text-slate-400" />
              <div>
                <h3 className="text-sm font-semibold text-slate-900">Detail Riwayat Aktivitas</h3>
                <p className="text-xs text-slate-400 font-mono">Log ID #{selectedLog.id}</p>
              </div>
            </div>

            <div className="space-y-3 bg-slate-50 border border-slate-200 rounded-lg p-4 text-sm divide-y divide-slate-200">
              <div className="flex justify-between items-center pb-2">
                <span className="text-slate-500 font-medium">Waktu Kejadian</span>
                <span className="font-medium text-slate-800 font-mono text-xs">
                  {formatTimestamp(selectedLog.createdAt).formatted}
                </span>
              </div>

              <div className="flex justify-between items-center py-2">
                <span className="text-slate-500 font-medium">Pelaku (Actor)</span>
                <div className="text-right">
                  <span className="font-medium text-slate-900 block">{selectedLog.userFullName || selectedLog.username}</span>
                  <span className="text-xs text-slate-400">@{selectedLog.username} ({selectedLog.userRole || 'USER'})</span>
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
                  <span className="font-medium text-slate-900">{selectedLog.targetName}</span>
                </div>
              )}

              <div className="flex justify-between items-center py-2">
                <span className="text-slate-500 font-medium">IP Address</span>
                <span className="font-mono text-slate-600 text-xs">{selectedLog.ipAddress || '127.0.0.1'}</span>
              </div>

              <div className="pt-2">
                <span className="text-slate-500 font-medium block mb-1">Deskripsi Lengkap:</span>
                <p className="p-2.5 bg-white border border-slate-200 rounded-lg text-slate-800 leading-relaxed text-sm">
                  {selectedLog.description}
                </p>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setSelectedLog(null)}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-sm font-medium transition-colors"
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
