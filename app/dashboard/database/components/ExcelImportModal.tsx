import React, { useState, useEffect, useRef, useMemo } from 'react';
import { X, Loader2, Upload, Download, AlertCircle, RefreshCw, AlertTriangle, CheckCircle2, Search, Filter } from 'lucide-react';
import { crmService } from '../../../../lib/services/crmService';
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
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  const resetState = () => {
    setSelectedImportFile(null);
    setImportPreview(null);
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
      const data = await crmService.previewDatabasesExcel(selectedImportFile);
      clearInterval(ticker);
      setImportProgress(100);
      setImportPhase('Preview siap!');
      await new Promise(r => setTimeout(r, 300));

      // Client-side conflict detection to catch duplicate emails across different names in the file
      const rawRows = data.rows || [];
      const emailToRowsMap: Record<string, { rowNum: number; fullName: string }[]> = {};
      
      rawRows.forEach((r: any) => {
        const em = (r.email || '').trim().toLowerCase();
        const fullName = `${r.firstName || ''} ${r.lastName || ''}`.trim();
        if (em) {
          if (!emailToRowsMap[em]) emailToRowsMap[em] = [];
          emailToRowsMap[em].push({ rowNum: r.rowNum, fullName });
        }
      });

      let incompleteCount = 0;
      let conflictCount = 0;
      let duplicateCount = 0;
      let newCount = 0;

      const processedRows: ProcessedRowPreview[] = rawRows.map((r: any) => {
        let status: RowStatus = (r.status as RowStatus) || 'NEW';
        let message = r.message || '';
        const em = (r.email || '').trim().toLowerCase();
        const currentFullName = `${r.firstName || ''} ${r.lastName || ''}`.trim();

        // Check if this email is shared with a different individual in the same file
        if (em && emailToRowsMap[em] && emailToRowsMap[em].length > 1) {
          const conflicting = emailToRowsMap[em].filter(
            entry => entry.rowNum !== r.rowNum && entry.fullName.toLowerCase() !== currentFullName.toLowerCase()
          );

          if (conflicting.length > 0) {
            status = 'CONFLICT';
            const otherInfo = conflicting.map(c => `Baris ${c.rowNum} (${c.fullName})`).join(', ');
            message = `⚠️ Konflik Email: Email '${em}' kembar dengan ${otherInfo}. Satu email tidak boleh dipakai 2 nama berbeda.`;
          }
        }

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
        toast.warning(`Ditemukan ${issuesCount} baris data bermasalah yang harus diperbaiki.`);
      } else {
        setActiveTab('ALL');
        toast.success('File Excel valid! Silakan tinjau data sebelum import.');
      }
    } catch (err: any) {
      clearInterval(ticker);
      setImportProgress(0);
      toast.error(err.message || 'Gagal memproses preview file Excel');
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

    if (importPreview && importPreview.issuesCount > 0) {
      toast.error(`Import ditolak: Harap perbaiki ${importPreview.issuesCount} baris yang bermasalah di file Excel terlebih dahulu.`);
      return;
    }

    setImportingExcel(true);
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
          description: `Mengimpor data kontak massal dari file '${selectedImportFile.name}' (${res.count || 0} database diproses).`
        });
      }

      onImportSuccess();
      handleClose();
    } catch (err: any) {
      clearInterval(ticker);
      setImportProgress(0);
      toast.error(err.message || 'Gagal mengimpor data Excel');
    } finally {
      setImportingExcel(false);
      setImportProgress(0);
      setImportPhase('');
    }
  };

  const handleClose = () => {
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
          row.message.toLowerCase().includes(query);

        if (!matchesQuery) return false;
      }

      return true;
    });
  }, [importPreview, activeTab, searchQuery]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className={`w-full ${importPreview ? 'max-w-4xl' : 'max-w-md'} bg-white border border-slate-200 rounded-2xl p-6 shadow-2xl relative max-h-[92vh] flex flex-col animate-in scale-in duration-200 text-slate-900 transition-all`}>
        <button
          onClick={handleClose}
          className="absolute top-4 right-4 p-1 text-slate-400 hover:text-slate-600 rounded-lg transition-colors z-20"
        >
          <X className="w-5 h-5" />
        </button>

        {!importPreview ? (
          <div>
            <div className="text-center mb-6">
              <div className="inline-flex p-3 bg-blue-50 border border-blue-100 text-blue-600 rounded-xl mb-3">
                <Upload className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-extrabold text-slate-900">Import Databases from Excel</h3>
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
                      onClick={(e) => {
                        e.stopPropagation();
                        e.preventDefault();
                        resetState();
                      }}
                      className="px-2.5 py-1 bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 text-[11px] font-bold rounded-lg transition-colors inline-flex items-center gap-1"
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
                    <span className="text-xs font-black text-blue-600 tabular-nums">{importProgress}%</span>
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
          <div className="flex flex-col flex-1 overflow-hidden space-y-4">
            <div>
              <h3 className="text-lg font-extrabold text-slate-900">Hasil Analisis & Preview Excel</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Periksa status kelengkapan data dan konflik sebelum melakukan import massal.
              </p>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
              <div 
                onClick={() => setActiveTab('ALL')}
                className={`p-2.5 rounded-xl text-center cursor-pointer transition-all border ${activeTab === 'ALL' ? 'bg-slate-100 border-slate-400 ring-2 ring-slate-400/20' : 'bg-slate-50 border-slate-200 hover:bg-slate-100/70'}`}
              >
                <span className="block text-lg font-black text-slate-900">{importPreview.totalRows}</span>
                <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider block mt-0.5">Total Baris</span>
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
                <span className={`block text-lg font-black ${importPreview.issuesCount > 0 ? 'text-red-600' : 'text-slate-400'}`}>
                  {importPreview.issuesCount}
                </span>
                <span className={`text-[9px] font-bold uppercase tracking-wider block mt-0.5 ${importPreview.issuesCount > 0 ? 'text-red-600' : 'text-slate-400'}`}>
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
                <span className={`block text-lg font-black ${importPreview.incompleteCount > 0 ? 'text-rose-600' : 'text-slate-400'}`}>
                  {importPreview.incompleteCount}
                </span>
                <span className={`text-[9px] font-bold uppercase tracking-wider block mt-0.5 ${importPreview.incompleteCount > 0 ? 'text-rose-600' : 'text-slate-400'}`}>
                  Belum Lengkap
                </span>
              </div>

              <div 
                onClick={() => setActiveTab('DUPLICATE')}
                className={`p-2.5 rounded-xl text-center cursor-pointer transition-all border ${activeTab === 'DUPLICATE' ? 'bg-amber-100 border-amber-500 ring-2 ring-amber-500/20' : 'bg-amber-50 border-amber-200 hover:bg-amber-100/70'}`}
              >
                <span className="block text-lg font-black text-amber-600">{importPreview.duplicateCount}</span>
                <span className="text-[9px] font-bold text-amber-600 uppercase tracking-wider block mt-0.5">Update Database</span>
              </div>

              <div 
                onClick={() => setActiveTab('NEW')}
                className={`p-2.5 rounded-xl text-center cursor-pointer transition-all border ${activeTab === 'NEW' ? 'bg-emerald-100 border-emerald-500 ring-2 ring-emerald-500/20' : 'bg-emerald-50 border-emerald-200 hover:bg-emerald-100/70'}`}
              >
                <span className="block text-lg font-black text-emerald-600">{importPreview.newCount}</span>
                <span className="text-[9px] font-bold text-emerald-600 uppercase tracking-wider block mt-0.5">Kontak Baru</span>
              </div>
            </div>

            {/* Alert Banners */}
            {importPreview.issuesCount > 0 ? (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-start gap-2.5 text-xs text-red-900 shrink-0">
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                <div>
                  <span className="font-extrabold text-red-700">Import Ditolak: </span>
                  Ditemukan <span className="font-bold underline">{importPreview.issuesCount} baris data bermasalah</span> (data belum lengkap atau email kembar antar kontak berbeda). Silakan tinjau tabel di bawah dan perbaiki di file Excel Anda.
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
            <div className="flex-1 min-h-0 flex flex-col">
              <div className="flex justify-between items-center mb-1.5 text-[11px] text-slate-500">
                <span className="font-semibold">
                  Menampilkan <span className="font-bold text-slate-900">{filteredRows.length}</span> baris data
                  {activeTab === 'ISSUES' ? ' (Hanya Yang Bermasalah)' : ''}
                </span>
                <span className="text-[10px] text-slate-400 italic">
                  * Gulir ke bawah untuk melihat semua baris
                </span>
              </div>

              <div className="flex-1 overflow-y-auto border border-slate-200 rounded-xl bg-white max-h-[38vh] shadow-inner">
                {filteredRows.length === 0 ? (
                  <div className="p-8 text-center text-slate-400 text-xs">
                    <Filter className="w-6 h-6 mx-auto mb-2 opacity-40" />
                    Tidak ada baris data yang cocok dengan filter atau pencarian ini.
                  </div>
                ) : (
                  <table className="w-full text-left border-collapse text-[11px]">
                    <thead>
                      <tr className="bg-slate-100/90 text-slate-600 font-bold border-b border-slate-200 sticky top-0 z-10 backdrop-blur-xs">
                        <th className="py-2 px-3 w-16 text-center">Baris</th>
                        <th className="py-2 px-3 w-36">Nama</th>
                        <th className="py-2 px-3 w-40">Perusahaan / Holding</th>
                        <th className="py-2 px-3 w-40">Email</th>
                        <th className="py-2 px-3 w-28">Status</th>
                        <th className="py-2 px-3">Rincian Error / Keterangan</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-700">
                      {filteredRows.map((r) => {
                        const isProblem = r.isIssue;
                        return (
                          <tr 
                            key={r.rowNum} 
                            className={`transition-colors ${
                              r.status === 'INCOMPLETE'
                                ? 'bg-red-50/50 hover:bg-red-50/80 border-l-4 border-l-red-500'
                                : r.status === 'CONFLICT' || r.status === 'ERROR'
                                ? 'bg-orange-50/50 hover:bg-orange-50/80 border-l-4 border-l-orange-500'
                                : r.status === 'DUPLICATE'
                                ? 'hover:bg-amber-50/30'
                                : 'hover:bg-slate-50/50'
                            }`}
                          >
                            <td className="py-2 px-3 font-bold text-slate-600 text-center">
                              <span className="px-1.5 py-0.5 bg-slate-100 rounded text-slate-700 font-mono">
                                #{r.rowNum}
                              </span>
                            </td>
                            <td className="py-2 px-3 font-bold text-slate-900">
                              {r.firstName || r.lastName ? `${r.firstName} ${r.lastName}`.trim() : <span className="text-red-500 italic">[Nama Kosong]</span>}
                            </td>
                            <td className="py-2 px-3">
                              <span className="block text-slate-800 font-medium truncate max-w-[160px]">{r.companyName || '-'}</span>
                              {r.groupName && <span className="text-[9px] text-slate-400 block truncate max-w-[160px]">Holding: {r.groupName}</span>}
                            </td>
                            <td className="py-2 px-3 font-mono text-[10px] break-all">
                              {r.email || <span className="text-red-500 italic">[Email Kosong]</span>}
                            </td>
                            <td className="py-2 px-3 whitespace-nowrap">
                              {r.status === 'INCOMPLETE' ? (
                                <span className="px-1.5 py-0.5 bg-red-100 border border-red-300 text-red-700 text-[9px] font-extrabold rounded inline-flex items-center gap-1">
                                  <AlertCircle className="w-3 h-3 text-red-600" />
                                  BELUM LENGKAP
                                </span>
                              ) : r.status === 'CONFLICT' ? (
                                <span className="px-1.5 py-0.5 bg-orange-100 border border-orange-300 text-orange-800 text-[9px] font-extrabold rounded inline-flex items-center gap-1">
                                  <AlertTriangle className="w-3 h-3 text-orange-600" />
                                  KONFLIK
                                </span>
                              ) : r.status === 'NEW' ? (
                                <span className="px-1.5 py-0.5 bg-emerald-50 border border-emerald-200 text-emerald-700 text-[9px] font-bold rounded">
                                  BARU
                                </span>
                              ) : (
                                <span className="px-1.5 py-0.5 bg-amber-50 border border-amber-200 text-amber-700 text-[9px] font-bold rounded">
                                  UPDATE DB
                                </span>
                              )}
                            </td>
                            <td className={`py-2 px-3 leading-relaxed text-[10.5px] ${
                              isProblem ? 'text-red-700 font-semibold' : 'text-slate-600'
                            }`}>
                              {r.message}
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
                  <span className="text-xs font-black text-blue-600 tabular-nums">{importProgress}%</span>
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
                <p className="text-[10px] text-blue-500 font-medium">
                  {importProgress < 100
                    ? 'Jangan tutup jendela ini sampai import selesai.'
                    : '✓ Data berhasil diimport!'}
                </p>
              </div>
            )}

            {/* Footer Controls */}
            <div className="flex gap-3 justify-between pt-3 border-t border-slate-100 shrink-0">
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
                  disabled={importingExcel || Boolean(importPreview.issuesCount > 0)}
                  className={`px-5 py-2 text-white text-xs font-bold rounded-xl flex items-center gap-2 transition-all ${
                    importPreview.issuesCount > 0
                      ? 'bg-slate-300 text-slate-500 cursor-not-allowed border border-slate-300'
                      : 'bg-blue-600 hover:bg-blue-500 active:bg-blue-700 shadow-md shadow-blue-500/20 disabled:opacity-50'
                  }`}
                >
                  {importingExcel ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                  {importingExcel
                    ? 'Mengimpor Data...'
                    : importPreview.issuesCount > 0
                    ? `Import Ditolak (${importPreview.issuesCount} Baris Error)`
                    : `Konfirmasi & Import (${importPreview.totalRows} Data)`}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
