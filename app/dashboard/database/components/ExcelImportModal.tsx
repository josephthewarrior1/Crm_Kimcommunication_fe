import React, { useState, useEffect, useRef, useMemo } from 'react';
import * as XLSX from 'xlsx';
import { X, Loader2, Upload, Download, AlertCircle, RefreshCw, AlertTriangle, CheckCircle2, Search, Filter } from 'lucide-react';
import { crmService } from '../../../../lib/services/crmService';
import type { DatabaseImportResult } from '../../../../lib/types';
import { auditLogService } from '../../../../lib/services/auditLogService';
import { useAuth } from '../../../../lib/context/AuthContext';
import { toast } from 'sonner';

interface ExcelImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportSuccess: () => void;
}

export type RowStatus = 'NEW' | 'DUPLICATE' | 'INCOMPLETE' | 'CONFLICT' | 'ERROR';

export interface ProcessedRowPreview {
  rowNum: number;
  groupName: string;
  companyName: string;
  firstName: string;
  lastName: string;
  jobTitle: string;
  email: string;
  companyEmail: string;
  personalEmail: string;
  mobilePhone: string;
  existingDatabaseId?: number;
  status: RowStatus;
  message: string;
  isIssue: boolean;
}

export interface ProcessedImportPreview {
  totalRows: number;
  newCount: number;
  duplicateCount: number;
  incompleteCount: number;
  conflictCount: number;
  issuesCount: number;
  rows: ProcessedRowPreview[];
}

type TabType = 'ISSUES' | 'ALL' | 'INCOMPLETE' | 'CONFLICT' | 'DUPLICATE' | 'NEW';

const EXPECTED_HEADERS = [
  'No',
  'Nama Group/Holding Company',
  'Nama Brand',
  'Company Name',
  'Salutation',
  'First Name',
  'Last Name',
  'Position',
  'Division',
  'Jobtitle',
  'Address',
  'Office Phone',
  'Mobile Phone',
  'Company Email Address',
  'Personal Email Address',
  'Industry',
  'Company Size (Revenue)',
  'Company Size (Employee)',
  'Company Hardware',
  'Linkedin Link',
  'City',
  'Postal Code',
  'Company Website',
];

const normalizeHeader = (value: unknown) => String(value || '').trim().replace(/\s+/g, ' ').toLowerCase();

const validateDatabaseTemplateHeader = async (file: File) => {
  const workbook = XLSX.read(await file.arrayBuffer(), { type: 'array' });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, blankrows: false });
  const headers = rows[0] || [];
  const problems = EXPECTED_HEADERS
    .map((expected, index) => {
      const actual = headers[index];
      return normalizeHeader(actual) === normalizeHeader(expected)
        ? null
        : `Kolom ${index + 1} harus "${expected}", terbaca "${actual || '[kosong]'}"`;
    })
    .filter(Boolean);

  if (problems.length) {
    throw new Error(`Header Excel tidak sesuai template. ${problems.slice(0, 5).join(' | ')}. Download ulang template dan paste data tanpa mengubah urutan/nama kolom.`);
  }
};

export const ExcelImportModal: React.FC<ExcelImportModalProps> = ({
  isOpen,
  onClose,
  onImportSuccess
}) => {
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedImportFile, setSelectedImportFile] = useState<File | null>(null);
  const [importingExcel, setImportingExcel] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [importPhase, setImportPhase] = useState('');
  const [importPreview, setImportPreview] = useState<ProcessedImportPreview | null>(null);
  const [importResult, setImportResult] = useState<DatabaseImportResult | null>(null);
  const [uploadError, setUploadError] = useState('');
  const cleanCount = (importPreview?.newCount || 0) + (importPreview?.duplicateCount || 0);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  const resetState = () => {
    setSelectedImportFile(null);
    setImportPreview(null);
    setImportResult(null);
    setUploadError('');
    setImportingExcel(false);
    setImportProgress(0);
    setImportPhase('');
    setLoadingPreview(false);
    setActiveTab('ALL');
    setSearchQuery('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  useEffect(() => {
    if (isOpen) {
      resetState();
    }
  }, [isOpen]);

  const handlePreviewExcel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedImportFile) {
      toast.error('Silakan pilih file Excel terlebih dahulu');
      return;
    }

    setLoadingPreview(true);
    setUploadError('');
    setImportProgress(0);
    setImportPhase('Membaca file Excel...');

    const previewPhases = [
      { pct: 20, label: 'Membaca file Excel...' },
      { pct: 50, label: 'Mengurai baris data & memeriksa duplikasi internal...' },
      { pct: 75, label: 'Mencocokkan dengan database...' },
      { pct: 90, label: 'Menyiapkan preview & analisis error...' },
    ];
    let pi = 0;
    const ticker = setInterval(() => {
      if (pi < previewPhases.length) {
        setImportProgress(previewPhases[pi].pct);
        setImportPhase(previewPhases[pi].label);
        pi++;
      }
    }, 450);

    try {
      await validateDatabaseTemplateHeader(selectedImportFile);
      const data = await crmService.previewDatabasesExcel(selectedImportFile);
      clearInterval(ticker);
      setImportProgress(100);
      setImportPhase('Preview siap!');
      await new Promise(r => setTimeout(r, 300));

      // The backend validates typed emails and uses the same rules when importing.
      const rawRows = data.rows || [];

      let incompleteCount = 0;
      let conflictCount = 0;
      let duplicateCount = 0;
      let newCount = 0;

      const processedRows: ProcessedRowPreview[] = rawRows.map((r) => {
        const status: RowStatus = r.status || 'ERROR';
        const message = r.message || '';

        if (status === 'INCOMPLETE') {
          incompleteCount++;
        } else if (status === 'CONFLICT' || status === 'ERROR') {
          conflictCount++;
        } else if (status === 'DUPLICATE') {
          duplicateCount++;
        } else {
          newCount++;
        }

        const isIssue = status === 'INCOMPLETE' || status === 'CONFLICT' || status === 'ERROR';

        return {
          rowNum: r.rowNum,
          groupName: r.groupName || '',
          companyName: r.companyName || '',
          firstName: r.firstName || '',
          lastName: r.lastName || '',
          jobTitle: r.jobTitle || '',
          email: r.email || '',
          companyEmail: r.companyEmail || '',
          personalEmail: r.personalEmail || '',
          mobilePhone: r.mobilePhone || '',
          existingDatabaseId: r.existingDatabaseId,
          status,
          message,
          isIssue
        };
      });

      const issuesCount = incompleteCount + conflictCount;

      const processedData: ProcessedImportPreview = {
        totalRows: processedRows.length,
        newCount,
        duplicateCount,
        incompleteCount,
        conflictCount,
        issuesCount,
        rows: processedRows
      };

      setImportPreview(processedData);
      
      // Default to ISSUES tab if there are errors, otherwise ALL
      if (issuesCount > 0) {
        setActiveTab('ISSUES');
        toast.warning(`${issuesCount} baris bermasalah akan dilewati. Baris bersih tetap bisa diimport.`);
      } else {
        setActiveTab('ALL');
        toast.success('File Excel valid! Silakan tinjau data sebelum import.');
      }
    } catch (err: any) {
      clearInterval(ticker);
      setImportProgress(0);
      setUploadError(err.message || 'Gagal memproses preview file Excel');
    } finally {
      setLoadingPreview(false);
      setImportProgress(0);
      setImportPhase('');
    }
  };

  const handleImportExcel = async (e: React.MouseEvent) => {
    e.preventDefault();
    if (!selectedImportFile) {
      toast.error('Pilih file Excel terlebih dahulu');
      return;
    }

    if (!importPreview || importingExcel || importResult) return;

    if (cleanCount === 0) {
      toast.error('Tidak ada baris bersih untuk diimport. Perbaiki file Excel terlebih dahulu.');
      return;
    }

    setImportingExcel(true);
    setUploadError('');
    setImportProgress(0);
    setImportPhase('Mengirim data ke server...');

    const phases = [
      { pct: 10, label: 'Mengirim file ke server...' },
      { pct: 25, label: 'Membaca baris Excel...' },
      { pct: 40, label: 'Memvalidasi data kontak...' },
      { pct: 55, label: 'Menyinkronkan group & perusahaan...' },
      { pct: 70, label: 'Menyimpan kontak baru...' },
      { pct: 85, label: 'Memeriksa duplikasi data...' },
      { pct: 95, label: 'Hampir selesai...' },
    ];
    let phaseIdx = 0;
    const ticker = setInterval(() => {
      if (phaseIdx < phases.length) {
        setImportProgress(phases[phaseIdx].pct);
        setImportPhase(phases[phaseIdx].label);
        phaseIdx++;
      }
    }, 600);

    try {
      const res = await crmService.importDatabasesExcel(selectedImportFile);
      clearInterval(ticker);
      setImportProgress(100);
      setImportPhase('Import selesai!');
      await new Promise(r => setTimeout(r, 600));
      toast.success(res.message || `Berhasil mengimpor ${res.count} database!`);
      
      if (user) {
        auditLogService.recordLog({
          userId: user.id,
          username: user.username,
          userFullName: user.fullName,
          userRole: user.roles?.[0] || 'USER',
          module: 'DATABASE',
          actionType: 'IMPORT_EXCEL',
          targetName: selectedImportFile.name,
          description: `Import '${selectedImportFile.name}': ${res.count} baris diproses, ${res.skippedCount || 0} dilewati.`
        });
      }

      setImportResult(res);
      onImportSuccess();
    } catch (err: any) {
      clearInterval(ticker);
      setImportProgress(0);
      setUploadError(err.message || 'Gagal mengimpor data Excel');
    } finally {
      setImportingExcel(false);
      setImportProgress(0);
      setImportPhase('');
    }
  };

  const handleClose = () => {
    if (importingExcel || loadingPreview) return;
    resetState();
    onClose();
  };

  // Filter and search rows
  const filteredRows = useMemo(() => {
    if (!importPreview) return [];
    
    return importPreview.rows.filter(row => {
      // Tab filter
      if (activeTab === 'ISSUES' && !row.isIssue) return false;
      if (activeTab === 'INCOMPLETE' && row.status !== 'INCOMPLETE') return false;
      if (activeTab === 'CONFLICT' && row.status !== 'CONFLICT' && row.status !== 'ERROR') return false;
      if (activeTab === 'DUPLICATE' && row.status !== 'DUPLICATE') return false;
      if (activeTab === 'NEW' && row.status !== 'NEW') return false;

      // Search filter
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        const matchesQuery = 
          row.rowNum.toString().includes(query) ||
          `${row.firstName} ${row.lastName}`.toLowerCase().includes(query) ||
          row.companyName.toLowerCase().includes(query) ||
          row.groupName.toLowerCase().includes(query) ||
          row.email.toLowerCase().includes(query) ||
          row.companyEmail.toLowerCase().includes(query) ||
          row.personalEmail.toLowerCase().includes(query) ||
          row.mobilePhone.includes(query) ||
          row.message.toLowerCase().includes(query);

        if (!matchesQuery) return false;
      }

      return true;
    });
  }, [importPreview, activeTab, searchQuery]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-2 sm:p-4">
      <div className={`w-full ${importPreview ? 'max-w-[1440px] h-[92dvh]' : 'max-w-md'} bg-white border border-slate-200 rounded-2xl p-4 sm:p-6 shadow-2xl relative max-h-[94dvh] overflow-y-auto sm:overflow-hidden flex flex-col animate-in scale-in duration-200 motion-reduce:animate-none text-slate-900`}>
        <button
          aria-label="Tutup import Excel"
          onClick={handleClose}
          className="absolute top-4 right-4 p-1 text-slate-400 hover:text-slate-600 rounded-lg transition-colors z-20"
        >
          <X className="w-5 h-5" />
        </button>

        {uploadError && (
          <div role="alert" className="mb-4 mr-8 p-4 rounded-xl border border-red-300 bg-red-50 text-red-900 shrink-0 max-h-[28dvh] overflow-auto">
            <p className="font-bold text-base mb-2">Upload belum berhasil</p>
            <p className="text-base leading-6 whitespace-pre-wrap break-words">{uploadError}</p>
          </div>
        )}

        {importResult ? (
          <div className="flex flex-col sm:min-h-0 flex-1 gap-4" role="region" aria-label="Hasil import">
            <div className="pr-8">
              <h3 className="text-xl font-bold">Import Selesai</h3>
              <p className="mt-1 text-sm text-slate-600" role="status">
                {importResult.count} baris berhasil diproses: {importResult.newCount ?? importResult.count} baru, {importResult.updatedCount ?? 0} update.
                {' '}{importResult.skippedCount || 0} baris dilewati.
              </p>
            </div>
            {(importResult.skippedCount || 0) > 0 && (
              <>
                <p className="text-base leading-6 text-amber-900 bg-amber-50 border border-amber-200 rounded-xl p-4">
                  Baris di bawah tidak disimpan. Perbaiki dan upload ulang hanya baris yang dilewati.
                </p>
                <div className="overflow-auto border border-slate-200 rounded-xl flex-1 min-h-[240px] sm:min-h-0">
                  <table className="w-full text-left text-sm table-fixed block sm:table">
                    <thead className="bg-slate-100 sticky top-0 hidden sm:table-header-group"><tr><th className="p-4 w-28">Baris Excel</th><th className="p-4 w-[28%]">Nama / Company</th><th className="p-4">Alasan dilewati</th></tr></thead>
                    <tbody className="block sm:table-row-group">
                      {importResult.skippedRows.map(row => (
                        <tr key={row.rowNum} className="border-t border-slate-200 block sm:table-row">
                          <td className="p-4 pb-1 sm:pb-4 align-top font-bold block sm:table-cell"><span className="sm:hidden">Baris Excel </span>#{row.rowNum}</td>
                          <td className="p-4 pt-1 sm:pt-4 align-top break-words block sm:table-cell">{row.firstName} {row.lastName}<span className="block text-slate-500">{row.companyName}</span></td>
                          <td className="p-4 align-top text-red-800 bg-red-50/60 block sm:table-cell">
                            <span className="block sm:hidden font-semibold mb-2">Alasan dilewati</span>
                            <ul className="list-disc pl-5 space-y-2 text-base leading-6 font-medium break-words">
                              {row.message.split(/\s+\|\s+|\n/).filter(Boolean).map((message, index) => <li key={index}>{message}</li>)}
                            </ul>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
            <div className="flex justify-between gap-3 border-t pt-3 shrink-0">
              <button type="button" onClick={resetState} className="px-4 py-2 bg-slate-100 rounded-xl text-xs font-semibold">Upload File Lain</button>
              <button type="button" onClick={handleClose} className="px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-semibold">Selesai</button>
            </div>
          </div>
        ) : !importPreview ? (
          <div>
            <div className="text-center mb-6">
              <div className="inline-flex p-3 bg-blue-50 border border-blue-100 text-blue-600 rounded-xl mb-3">
                <Upload className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-slate-900">Import Databases from Excel</h3>
              <p className="text-xs text-slate-500 mt-1">
                Upload template spreadsheet untuk import massal grup holding, perusahaan, dan kontak database.
              </p>
              <div className="mt-3">
                <a
                  href="/Database_Template.xlsx"
                  download="Database_Template.xlsx"
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-600 hover:text-blue-500 hover:underline"
                >
                  <Download className="w-3.5 h-3.5" />
                  Download Database Template (.xlsx)
                </a>
              </div>
            </div>

            <form onSubmit={handlePreviewExcel} className="space-y-4">
              <div className="border-2 border-dashed border-slate-200 rounded-2xl p-6 hover:bg-slate-50 transition-all flex flex-col items-center justify-center gap-2 cursor-pointer relative group">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx, .xls"
                  onClick={(e) => {
                    (e.target as HTMLInputElement).value = '';
                  }}
                  onChange={(e) => {
                    if (e.target.files && e.target.files.length > 0) {
                      setSelectedImportFile(e.target.files[0]);
                    }
                  }}
                  className="absolute inset-0 opacity-0 cursor-pointer"
                  disabled={loadingPreview}
                />
                <div className="p-2.5 bg-slate-100 group-hover:bg-blue-50 group-hover:text-blue-600 text-slate-500 rounded-xl transition-all">
                  <Upload className="w-5 h-5" />
                </div>
                {selectedImportFile ? (
                  <div className="text-center z-10">
                    <p className="text-sm font-bold text-slate-800 break-all">{selectedImportFile.name}</p>
                    <p className="text-xs text-slate-500 mb-1.5">{(selectedImportFile.size / 1024).toFixed(1)} KB</p>
                    <button
                      type="button"
                      disabled={loadingPreview}
                      onClick={(e) => {
                        e.stopPropagation();
                        e.preventDefault();
                        resetState();
                      }}
                      className="px-2.5 py-1 bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 text-xs font-semibold rounded-lg transition-colors inline-flex items-center gap-1"
                    >
                      <RefreshCw className="w-3 h-3" /> Ganti File
                    </button>
                  </div>
                ) : (
                  <div className="text-center">
                    <p className="text-sm font-semibold text-slate-700">Klik atau tarik file Excel ke sini</p>
                    <p className="text-xs text-slate-400 mt-0.5">Mendukung format .xlsx dan .xls</p>
                  </div>
                )}
              </div>

              {/* Progress Bar - Preview */}
              {loadingPreview && (
                <div className="mt-4 space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-semibold text-slate-600">{importPhase}</span>
                    <span className="text-xs font-bold text-blue-600 tabular-nums">{importProgress}%</span>
                  </div>
                  <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-blue-500 to-blue-400 rounded-full transition-all duration-500 ease-out"
                      style={{ width: `${importProgress}%` }}
                    />
                  </div>
                </div>
              )}

              <div className="flex gap-3 justify-end pt-4 border-t border-slate-100 mt-6">
                <button
                  type="button"
                  onClick={handleClose}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-medium rounded-xl transition-all"
                  disabled={loadingPreview}
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={loadingPreview || !selectedImportFile}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white text-sm font-bold rounded-xl flex items-center gap-2 transition-all disabled:opacity-50"
                >
                  {loadingPreview ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                  Preview & Analisis Excel
                </button>
              </div>
            </form>
          </div>
        ) : (
          <div className="flex flex-col flex-1 sm:min-h-0 sm:overflow-hidden space-y-4">
            <div className="pr-8 shrink-0">
              <h3 className="text-xl font-bold text-slate-900">Hasil Analisis & Preview Excel</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Hanya {cleanCount} baris bersih yang diproses: {importPreview.newCount} kontak baru dan {importPreview.duplicateCount} update. {importPreview.issuesCount} baris kotor dilewati. Tab hanya menyaring tampilan.
                Kolom kosong dan email lama tetap dipertahankan. Data company yang sudah terisi tidak ditimpa.
              </p>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
              <div 
                onClick={() => setActiveTab('ALL')}
                className={`p-2.5 rounded-xl text-center cursor-pointer transition-all border ${activeTab === 'ALL' ? 'bg-slate-100 border-slate-400 ring-2 ring-slate-400/20' : 'bg-slate-50 border-slate-200 hover:bg-slate-100/70'}`}
              >
                <span className="block text-lg font-bold text-slate-900">{importPreview.totalRows}</span>
                <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider block mt-0.5">Total Baris</span>
              </div>

              <div 
                onClick={() => setActiveTab('ISSUES')}
                className={`p-2.5 rounded-xl text-center cursor-pointer transition-all border ${
                  importPreview.issuesCount > 0
                    ? activeTab === 'ISSUES'
                      ? 'bg-red-100 border-red-500 ring-2 ring-red-500/20'
                      : 'bg-red-50 border-red-200 hover:bg-red-100/70'
                    : 'bg-slate-50 border-slate-200 opacity-60'
                }`}
              >
                <span className={`block text-lg font-bold ${importPreview.issuesCount > 0 ? 'text-red-600' : 'text-slate-400'}`}>
                  {importPreview.issuesCount}
                </span>
                <span className={`text-[10px] font-semibold uppercase tracking-wider block mt-0.5 ${importPreview.issuesCount > 0 ? 'text-red-600' : 'text-slate-400'}`}>
                  🚨 Bermasalah / Error
                </span>
              </div>

              <div 
                onClick={() => setActiveTab('INCOMPLETE')}
                className={`p-2.5 rounded-xl text-center cursor-pointer transition-all border ${
                  importPreview.incompleteCount > 0
                    ? activeTab === 'INCOMPLETE'
                      ? 'bg-rose-100 border-rose-500 ring-2 ring-rose-500/20'
                      : 'bg-rose-50 border-rose-200 hover:bg-rose-100/70'
                    : 'bg-slate-50 border-slate-200 opacity-60'
                }`}
              >
                <span className={`block text-lg font-bold ${importPreview.incompleteCount > 0 ? 'text-rose-600' : 'text-slate-400'}`}>
                  {importPreview.incompleteCount}
                </span>
                <span className={`text-[10px] font-semibold uppercase tracking-wider block mt-0.5 ${importPreview.incompleteCount > 0 ? 'text-rose-600' : 'text-slate-400'}`}>
                  Belum Lengkap
                </span>
              </div>

              <div 
                onClick={() => setActiveTab('DUPLICATE')}
                className={`p-2.5 rounded-xl text-center cursor-pointer transition-all border ${activeTab === 'DUPLICATE' ? 'bg-amber-100 border-amber-500 ring-2 ring-amber-500/20' : 'bg-amber-50 border-amber-200 hover:bg-amber-100/70'}`}
              >
                <span className="block text-lg font-bold text-amber-600">{importPreview.duplicateCount}</span>
                <span className="text-[10px] font-semibold text-amber-600 uppercase tracking-wider block mt-0.5">Update Database</span>
              </div>

              <div 
                onClick={() => setActiveTab('NEW')}
                className={`p-2.5 rounded-xl text-center cursor-pointer transition-all border ${activeTab === 'NEW' ? 'bg-emerald-100 border-emerald-500 ring-2 ring-emerald-500/20' : 'bg-emerald-50 border-emerald-200 hover:bg-emerald-100/70'}`}
              >
                <span className="block text-lg font-bold text-emerald-600">{importPreview.newCount}</span>
                <span className="text-[10px] font-semibold text-emerald-600 uppercase tracking-wider block mt-0.5">Kontak Baru</span>
              </div>
            </div>

            {/* Alert Banners */}
            {importPreview.issuesCount > 0 ? (
              <div className="p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3 text-sm leading-6 text-red-900 shrink-0">
                <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold text-red-700">Baris kotor akan dilewati: </span>
                  {importPreview.issuesCount} baris belum lengkap atau konflik tidak akan disimpan. {cleanCount > 0 ? `${cleanCount} baris bersih tetap bisa diimport.` : 'Tidak ada baris bersih; perbaiki file lalu upload ulang.'} Company email dan nomor kantor boleh digunakan bersama. Hasil import akan menyertakan daftar baris yang dilewati.
                </div>
              </div>
            ) : importPreview.duplicateCount > 0 ? (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-2.5 text-xs text-amber-900 shrink-0">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold">Info Sinkronisasi: </span>
                  {importPreview.duplicateCount} kontak sudah ada di database. Data kontak ini akan <span className="font-bold underline">diperbarui (sinkron)</span> tanpa menduplikasi record.
                </div>
              </div>
            ) : (
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-start gap-2.5 text-xs text-emerald-900 shrink-0">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold">Semua data valid! </span>
                  Sebanyak {importPreview.newCount} kontak baru siap disimpan ke database.
                </div>
              </div>
            )}

            {/* Search & Filter Bar */}
            <div className="flex flex-col sm:flex-row gap-2 items-stretch sm:items-center justify-between shrink-0">
              {/* Filter Tabs */}
              <div className="flex items-center gap-1 overflow-x-auto pb-1 text-xs font-semibold">
                <button
                  type="button"
                  onClick={() => setActiveTab('ISSUES')}
                  className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all whitespace-nowrap ${
                    activeTab === 'ISSUES'
                      ? 'bg-red-600 text-white font-bold shadow-sm'
                      : importPreview.issuesCount > 0
                      ? 'bg-red-50 text-red-700 hover:bg-red-100'
                      : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                  }`}
                >
                  <AlertCircle className="w-3.5 h-3.5" />
                  🚨 Bermasalah ({importPreview.issuesCount})
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('ALL')}
                  className={`px-3 py-1.5 rounded-lg transition-all whitespace-nowrap ${
                    activeTab === 'ALL'
                      ? 'bg-slate-900 text-white font-bold shadow-sm'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  Semua ({importPreview.totalRows})
                </button>

                {importPreview.incompleteCount > 0 && (
                  <button
                    type="button"
                    onClick={() => setActiveTab('INCOMPLETE')}
                    className={`px-3 py-1.5 rounded-lg transition-all whitespace-nowrap ${
                      activeTab === 'INCOMPLETE'
                        ? 'bg-rose-600 text-white font-bold shadow-sm'
                        : 'bg-rose-50 text-rose-700 hover:bg-rose-100'
                    }`}
                  >
                    Belum Lengkap ({importPreview.incompleteCount})
                  </button>
                )}

                {importPreview.conflictCount > 0 && (
                  <button
                    type="button"
                    onClick={() => setActiveTab('CONFLICT')}
                    className={`px-3 py-1.5 rounded-lg transition-all whitespace-nowrap ${
                      activeTab === 'CONFLICT'
                        ? 'bg-orange-600 text-white font-bold shadow-sm'
                        : 'bg-orange-50 text-orange-700 hover:bg-orange-100'
                    }`}
                  >
                    Konflik ({importPreview.conflictCount})
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => setActiveTab('DUPLICATE')}
                  className={`px-3 py-1.5 rounded-lg transition-all whitespace-nowrap ${
                    activeTab === 'DUPLICATE'
                      ? 'bg-amber-600 text-white font-bold shadow-sm'
                      : 'bg-amber-50 text-amber-700 hover:bg-amber-100'
                  }`}
                >
                  Update DB ({importPreview.duplicateCount})
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('NEW')}
                  className={`px-3 py-1.5 rounded-lg transition-all whitespace-nowrap ${
                    activeTab === 'NEW'
                      ? 'bg-emerald-600 text-white font-bold shadow-sm'
                      : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                  }`}
                >
                  Baru ({importPreview.newCount})
                </button>
              </div>

              {/* Search Box */}
              <div className="relative min-w-[200px] sm:w-64">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Cari baris, nama, email..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 focus:bg-white transition-all"
                />
                {searchQuery && (
                  <button 
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>
            </div>

            {/* Table Area (Full Visibility, No 10-row slice!) */}
            <div className="flex-1 min-h-[240px] sm:min-h-0 flex flex-col">
              <div className="flex justify-between items-center mb-1.5 text-xs text-slate-500">
                <span className="font-semibold">
                  Menampilkan <span className="font-bold text-slate-900">{filteredRows.length}</span> baris data
                  {activeTab === 'ISSUES' ? ' (Hanya Yang Bermasalah)' : ''}
                </span>
                <span className="text-[10px] text-slate-400 italic">
                  * Gulir ke bawah untuk melihat semua baris
                </span>
              </div>

              <div className="flex-1 overflow-auto border border-slate-200 rounded-xl bg-white">
                {filteredRows.length === 0 ? (
                  <div className="p-8 text-center text-slate-400 text-xs">
                    <Filter className="w-6 h-6 mx-auto mb-2 opacity-40" />
                    Tidak ada baris data yang cocok dengan filter atau pencarian ini.
                  </div>
                ) : (
                  <table className="w-full sm:min-w-[1240px] table-fixed text-left border-collapse text-sm block sm:table">
                    <thead className="hidden sm:table-header-group">
                      <tr className="bg-slate-100/90 text-slate-600 font-bold border-b border-slate-200 sticky top-0 z-10 backdrop-blur-xs">
                        <th className="py-3 px-3 w-20 text-center">Baris</th>
                        <th className="py-3 px-3 w-36">Nama</th>
                        <th className="py-3 px-3 w-44">Perusahaan / Holding</th>
                        <th className="py-3 px-3 w-52">Email / Mobile</th>
                        <th className="py-3 px-3 w-40">Status</th>
                        <th className="py-3 px-4">Rincian Error / Keterangan</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 text-slate-700 block sm:table-row-group">
                      {filteredRows.map((r) => {
                        const isProblem = r.isIssue;
                        return (
                          <tr 
                            key={r.rowNum} 
                            className={`transition-colors block sm:table-row [&>td]:block sm:[&>td]:table-cell [&>td]:align-top [&>td]:break-words ${
                              r.status === 'INCOMPLETE'
                                ? 'bg-red-50/50 hover:bg-red-50/80 border-l-4 border-l-red-500'
                                : r.status === 'CONFLICT' || r.status === 'ERROR'
                                ? 'bg-orange-50/50 hover:bg-orange-50/80 border-l-4 border-l-orange-500'
                                : r.status === 'DUPLICATE'
                                ? 'hover:bg-amber-50/30'
                                : 'hover:bg-slate-50/50'
                            }`}
                          >
                            <td className="py-3 px-3 font-bold text-slate-600 sm:text-center">
                              <span className="sm:hidden mr-2">Baris Excel</span>
                              <span className="px-1.5 py-0.5 bg-slate-100 rounded text-slate-700 font-mono">
                                #{r.rowNum}
                              </span>
                            </td>
                            <td className="py-2 px-3 font-bold text-slate-900">
                              {r.firstName || r.lastName ? `${r.firstName} ${r.lastName}`.trim() : <span className="text-red-500 italic">[Nama Kosong]</span>}
                            </td>
                            <td className="py-2 px-3">
                              <span className="block text-slate-800 font-medium">{r.companyName || '-'}</span>
                              {r.groupName && <span className="text-xs text-slate-500 block mt-1">Holding: {r.groupName}</span>}
                            </td>
                            <td className="py-2 px-3 text-xs leading-5 break-words">
                              <span className="block">Kantor: {r.companyEmail || '-'}</span>
                              <span className="block">Personal: {r.personalEmail || '-'}</span>
                              <span className="block">Mobile: {r.mobilePhone || '-'}</span>
                            </td>
                            <td className="py-2 px-3 whitespace-nowrap">
                              {r.status === 'INCOMPLETE' ? (
                                <span className="px-1.5 py-0.5 bg-red-100 border border-red-300 text-red-700 text-[10px] font-bold rounded inline-flex items-center gap-1">
                                  <AlertCircle className="w-3 h-3 text-red-600" />
                                  BELUM LENGKAP
                                </span>
                              ) : r.status === 'CONFLICT' || r.status === 'ERROR' ? (
                                <span className="px-1.5 py-0.5 bg-orange-100 border border-orange-300 text-orange-800 text-[10px] font-bold rounded inline-flex items-center gap-1">
                                  <AlertTriangle className="w-3 h-3 text-orange-600" />
                                  KONFLIK
                                </span>
                              ) : r.status === 'NEW' ? (
                                <span className="px-1.5 py-0.5 bg-emerald-50 border border-emerald-200 text-emerald-700 text-[10px] font-semibold rounded">
                                  BARU
                                </span>
                              ) : (
                                <span className="px-1.5 py-0.5 bg-amber-50 border border-amber-200 text-amber-700 text-[10px] font-semibold rounded">
                                  UPDATE DB {r.existingDatabaseId ? `#${r.existingDatabaseId}` : ''}
                                </span>
                              )}
                            </td>
                            <td className={`py-4 px-4 text-base leading-6 ${
                              isProblem 
                                ? 'text-red-800 font-medium bg-red-50/60'
                                : r.message.includes('Peringatan') || r.message.includes('⚠️')
                                ? 'text-amber-800 font-medium bg-amber-50/50 rounded px-1.5'
                                : 'text-slate-600'
                            }`}>
                              <span className="sm:hidden block font-semibold mb-2">{isProblem ? 'Perlu diperbaiki' : 'Keterangan'}</span>
                              <ul className="list-disc pl-5 space-y-2">
                                {r.message.split(/\s+\|\s+|\n/).filter(Boolean).map((message, index) => <li key={index}>{message}</li>)}
                              </ul>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </div>
            </div>

            {/* Progress Bar - Import */}
            {importingExcel && (
              <div className="space-y-2 p-4 bg-blue-50 border border-blue-100 rounded-xl shrink-0">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-semibold text-blue-700">{importPhase}</span>
                  <span className="text-xs font-bold text-blue-600 tabular-nums">{importProgress}%</span>
                </div>
                <div className="w-full h-3 bg-blue-100 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500 ease-out"
                    style={{
                      width: `${importProgress}%`,
                      background: importProgress === 100
                        ? 'linear-gradient(90deg, #10b981, #34d399)'
                        : 'linear-gradient(90deg, #2563eb, #60a5fa)'
                    }}
                  />
                </div>
                <p className="text-xs text-blue-500 font-medium">
                  {importProgress < 100
                    ? 'Jangan tutup jendela ini sampai import selesai.'
                    : '✓ Data berhasil diimport!'}
                </p>
              </div>
            )}

            {/* Footer Controls */}
            <div className="flex flex-wrap gap-3 justify-between pt-3 border-t border-slate-100 shrink-0">
              <button
                type="button"
                onClick={() => {
                  resetState();
                }}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition-all"
                disabled={importingExcel}
              >
                Ganti File / Upload Ulang
              </button>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleClose}
                  className="px-4 py-2 hover:bg-slate-100 text-slate-600 text-xs font-semibold rounded-xl transition-all"
                  disabled={importingExcel}
                >
                  Tutup
                </button>
                <button
                  type="button"
                  onClick={handleImportExcel}
                  disabled={importingExcel || cleanCount === 0}
                  className={`px-5 py-2 text-white text-xs font-bold rounded-xl flex items-center gap-2 transition-all ${
                    cleanCount === 0
                      ? 'bg-slate-300 text-slate-500 cursor-not-allowed border border-slate-300'
                      : 'bg-blue-600 hover:bg-blue-500 active:bg-blue-700 shadow-md shadow-blue-500/20 disabled:opacity-50'
                  }`}
                >
                  {importingExcel ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                  {importingExcel
                    ? 'Mengimpor Data...'
                    : cleanCount === 0
                    ? 'Tidak Ada Data Bersih'
                    : `Import ${cleanCount} Data Bersih`}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
