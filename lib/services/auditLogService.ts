import { ApiService, getAuthHeaders } from './apiService';
import { AuditLog, AuditLogFilterOptions, AuditLogListResponse, AuditLogSummary } from '../types';
import * as XLSX from 'xlsx';

const STORAGE_KEY = 'kim_crm_audit_logs';

// Default initial log seed to give immediate visibility if DB is freshly cleaned
const INITIAL_LOG_SEEDS: AuditLog[] = [
  {
    id: 1,
    userId: 1,
    username: 'admin',
    userFullName: 'System Administrator',
    userRole: 'ADMIN',
    module: 'AUTH',
    actionType: 'LOGIN',
    targetId: null,
    targetName: 'Session Auth',
    description: 'Administrator logged in to CRM dashboard',
    ipAddress: '127.0.0.1',
    createdAt: new Date(Date.now() - 3600000 * 2).toISOString()
  }
];

export class AuditLogService extends ApiService {
  constructor() {
    super();
  }

  private getLocalLogs(): AuditLog[] {
    if (typeof window === 'undefined') return INITIAL_LOG_SEEDS;
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      if (!data) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(INITIAL_LOG_SEEDS));
        return INITIAL_LOG_SEEDS;
      }
      return JSON.parse(data);
    } catch {
      return INITIAL_LOG_SEEDS;
    }
  }

  private saveLocalLogs(logs: AuditLog[]) {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(logs.slice(0, 1000))); // keep max 1000 logs
    } catch (e) {
      console.warn('Failed to save audit logs to localStorage:', e);
    }
  }

  async getAuditLogs(filters?: {
    username?: string;
    module?: string;
    actionType?: string;
    search?: string;
    startDate?: string;
    endDate?: string;
    page?: number;
    size?: number;
  }): Promise<AuditLogListResponse> {
    try {
      // Try backend endpoint first
      const query = new URLSearchParams();
      if (filters?.username) query.append('username', filters.username);
      if (filters?.module) query.append('module', filters.module);
      if (filters?.actionType) query.append('actionType', filters.actionType);
      if (filters?.search) query.append('search', filters.search);
      if (filters?.startDate) query.append('startDate', filters.startDate);
      if (filters?.endDate) query.append('endDate', filters.endDate);
      if (filters?.page) query.append('page', String(filters.page));
      if (filters?.size) query.append('size', String(filters.size));

      const qs = query.toString();
      const response = await this.get<AuditLogListResponse | AuditLog[]>(`/api/audit-logs${qs ? `?${qs}` : ''}`);
      if (Array.isArray(response)) {
        return {
          items: response,
          page: filters?.page || 1,
          size: filters?.size || response.length,
          total: response.length,
          totalPages: 1
        };
      }
      return response;
    } catch {
      // Fallback to local storage
    }

    // Local fallback with filtering
    let logs = this.getLocalLogs();

    if (filters?.search) {
      const q = filters.search.toLowerCase();
      logs = logs.filter(l =>
        l.username.toLowerCase().includes(q) ||
        (l.userFullName && l.userFullName.toLowerCase().includes(q)) ||
        l.description.toLowerCase().includes(q) ||
        (l.targetName && l.targetName.toLowerCase().includes(q)) ||
        l.module.toLowerCase().includes(q) ||
        l.actionType.toLowerCase().includes(q)
      );
    }

    if (filters?.username && filters.username !== 'ALL') {
      logs = logs.filter(l => l.username.toLowerCase() === filters.username!.toLowerCase());
    }

    if (filters?.module && filters.module !== 'ALL') {
      logs = logs.filter(l => l.module === filters.module);
    }

    if (filters?.actionType && filters.actionType !== 'ALL') {
      logs = logs.filter(l => l.actionType === filters.actionType);
    }

    if (filters?.startDate) {
      const start = new Date(filters.startDate).getTime();
      logs = logs.filter(l => new Date(l.createdAt).getTime() >= start);
    }

    if (filters?.endDate) {
      const end = new Date(filters.endDate).getTime() + 86400000; // inclusive whole day
      logs = logs.filter(l => new Date(l.createdAt).getTime() <= end);
    }

    logs = logs.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    const page = filters?.page || 1;
    const size = filters?.size || 15;
    const start = (page - 1) * size;
    return {
      items: logs.slice(start, start + size),
      page,
      size,
      total: logs.length,
      totalPages: Math.max(1, Math.ceil(logs.length / size))
    };
  }

  async getAuditLogsSummary(filters?: {
    username?: string;
    module?: string;
    actionType?: string;
    search?: string;
    startDate?: string;
    endDate?: string;
  }): Promise<AuditLogSummary> {
    const query = new URLSearchParams();
    if (filters?.username) query.append('username', filters.username);
    if (filters?.module) query.append('module', filters.module);
    if (filters?.actionType) query.append('actionType', filters.actionType);
    if (filters?.search) query.append('search', filters.search);
    if (filters?.startDate) query.append('startDate', filters.startDate);
    if (filters?.endDate) query.append('endDate', filters.endDate);

    const qs = query.toString();
    try {
      return await this.get<AuditLogSummary>(`/api/audit-logs/summary${qs ? `?${qs}` : ''}`);
    } catch {
      const { items: logs, total } = await this.getAuditLogs({ ...filters, page: 1, size: 1000 });
      const today = new Date().toDateString();
      const counts = logs.reduce<Record<string, number>>((acc, log) => {
        acc[log.username] = (acc[log.username] || 0) + 1;
        return acc;
      }, {});
      const top = Object.entries(counts).sort((a, b) => b[1] - a[1])[0];

      return {
        total,
        today: logs.filter(log => new Date(log.createdAt).toDateString() === today).length,
        topUser: top?.[0] || '-',
        topUserCount: top?.[1] || 0,
        critical: logs.filter(log => ['DELETE', 'APPROVE_TAKEOUT', 'REJECT_TAKEOUT', 'FLAG_TIKUS'].includes(log.actionType)).length
      };
    }
  }

  async getAuditLogFilterOptions(): Promise<AuditLogFilterOptions> {
    try {
      return await this.get<AuditLogFilterOptions>('/api/audit-logs/filter-options');
    } catch {
      const logs = this.getLocalLogs();
      return {
        users: Array.from(new Set(logs.map(log => log.username).filter(Boolean))).sort(),
        modules: Array.from(new Set(logs.map(log => log.module).filter(Boolean))).sort(),
        actionTypes: Array.from(new Set(logs.map(log => log.actionType).filter(Boolean))).sort()
      };
    }
  }

  async recordLog(entry: {
    userId?: number | null;
    username: string;
    userFullName?: string;
    userRole?: string;
    module: AuditLog['module'];
    actionType: AuditLog['actionType'];
    targetId?: string | number | null;
    targetName?: string | null;
    description: string;
    ipAddress?: string | null;
  }): Promise<AuditLog> {
    const newLog: AuditLog = {
      id: Date.now(),
      userId: entry.userId ?? null,
      username: entry.username || 'unknown',
      userFullName: entry.userFullName || entry.username,
      userRole: entry.userRole || 'USER',
      module: entry.module,
      actionType: entry.actionType,
      targetId: entry.targetId ?? null,
      targetName: entry.targetName ?? null,
      description: entry.description,
      ipAddress: entry.ipAddress || '127.0.0.1',
      createdAt: new Date().toISOString()
    };

    // Save locally immediately
    const existing = this.getLocalLogs();
    this.saveLocalLogs([newLog, ...existing]);

    // Send asynchronously to backend API
    try {
      await this.post<AuditLog>('/api/audit-logs', newLog);
    } catch {
      // Backend not yet implementing endpoint or offline
    }

    return newLog;
  }

  exportToExcel(logs: AuditLog[], filename: string = 'CRM_Activity_Audit_Logs.xlsx') {
    const data = logs.map((log, index) => {
      let rawDate = String(log.createdAt || '').trim();
      if (rawDate.includes('T') && !rawDate.endsWith('Z') && !/[+-]\d{2}/.test(rawDate)) {
        rawDate += 'Z';
      }
      const d = rawDate ? new Date(rawDate) : new Date();

      return {
        'No': index + 1,
        'Timestamp': d.toLocaleString('id-ID', {
          timeZone: 'Asia/Jakarta',
          day: '2-digit',
          month: 'short',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: false
        }).replace(/\./g, ':'),
        'Username': log.username,
        'User Full Name': log.userFullName || '-',
        'Role': log.userRole || '-',
        'Module': log.module,
        'Action': log.actionType,
        'Target Name': log.targetName || '-',
        'Description': log.description,
        'IP Address': log.ipAddress || '-'
      };
    });

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Activity Logs');

    // Auto fit column widths
    const headers = Object.keys(data[0] || {});
    worksheet['!cols'] = headers.map(h => ({ wch: Math.max(h.length + 4, 16) }));

    XLSX.writeFile(workbook, filename);
  }
}

export const auditLogService = new AuditLogService();
