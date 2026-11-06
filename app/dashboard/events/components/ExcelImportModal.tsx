import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  X,
  Loader2,
  Upload,
  Download,
  AlertCircle,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  Search
} from 'lucide-react';
import { EventParticipantsImportValidationResponse } from '../../../../lib/types';
import { crmService } from '../../../../lib/services/crmService';
import { toast } from 'sonner';

interface ExcelImportModalProps {
  eventDestination?: 'company' | 'participant';
  onConfigureEvent?: () => void;
  isOpen: boolean;
  onClose: () => void;
  eventId?: number;
  importParticipantsFile: File | null;
  setImportParticipantsFile: (file: File | null) => void;
  isImportingParticipants: boolean;
  importParticipantsProgress: number;
  activeTab: string;
  onImport: (destination: 'company' | 'participant') => void;
  onDownloadTemplate: (destination: 'company' | 'participant') => void;
}

type RowStatus = 'NEW' | 'DUPLICATE' | 'INCOMPLETE' | 'CONFLICT';
type PreviewTab = 'ALL' | 'ISSUES' | 'CONFLICT' | 'DUPLICATE' | 'NEW';

interface PreviewRow {
  rowNum: number;
  companyName: string;
  firstName: string;
  lastName: string;
  jobTitle: string;
  email: string;
  mobilePhone: string;
  status: RowStatus;
  message: string;
  warnings: string[];
  missingFields: string[];
  isIssue: boolean;
}

interface ImportPreview {
  destination: 'company' | 'participant';
  totalRows: number;
  newCount: number;
  duplicateCount: number;
  incompleteCount: number;
  conflictCount: number;
  issuesCount: number;
  rows: PreviewRow[];
}

export const ExcelImportModal: React.FC<ExcelImportModalProps> = ({
  eventDestination,
  onConfigureEvent,
  isOpen,
  onClose,
  eventId,
  importParticipantsFile,
  setImportParticipantsFile,
  isImportingParticipants,
  importParticipantsProgress,
  activeTab,
  onImport,
  onDownloadTemplate
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const destination = eventDestination || '';
  const [importPreview, setImportPreview] = useState<ImportPreview | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [previewPhase, setPreviewPhase] = useState('');
  const [previewProgress, setPreviewProgress] = useState(0);
  const [previewTab, setPreviewTab] = useState<PreviewTab>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  const resetState = () => {
    setImportPreview(null);
    setImportParticipantsFile(null);
    setLoadingPreview(false);
    setPreviewPhase('');
    setPreviewProgress(0);
    setPreviewTab('ALL');
    setSearchQuery('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  useEffect(() => {
    if (isOpen) {
      resetState();
    }
  }, [isOpen, eventDestination]);

  const filteredRows = useMemo(() => {
    if (!importPreview) return [];

    return importPreview.rows.filter((row) => {
      if (previewTab === 'ISSUES' && !row.isIssue) return false;
      if (previewTab === 'CONFLICT' && row.status !== 'CONFLICT') return false;
      if (previewTab === 'DUPLICATE' && row.status !== 'DUPLICATE') return false;
      if (previewTab === 'NEW' && row.status !== 'NEW') return false;

      if (searchQuery.trim()) {
        const query = searchQuery.trim().toLowerCase();
        const haystack = [
          row.rowNum,
          row.firstName,
          row.lastName,
          row.companyName,
          row.jobTitle,
          row.email,
          row.mobilePhone,
          row.message,
          ...row.warnings,
          ...row.missingFields
        ]
          .join(' ')
          .toLowerCase();

        if (!haystack.includes(query)) return false;
      }

      return true;
    });
  }, [importPreview, previewTab, searchQuery]);

  if (!isOpen) return null;

  const handlePreviewExcel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!destination) {
      toast.error('Tentukan jenis event melalui Edit Event sebelum import.');
      return;
    }
    if (!importParticipantsFile) {
      toast.error('Silakan pilih file Excel terlebih dahulu');
      return;
    }

    setLoadingPreview(true);
    setPreviewProgress(0);
    setPreviewPhase('Membaca file Excel...');

    const previewPhases = [
      { pct: 20, label: 'Membaca file Excel...' },
      { pct: 50, label: 'Mengurai data participant...' },
      { pct: 75, label: 'Mengecek duplikasi participant event...' },
      { pct: 90, label: 'Menyiapkan preview import...' }
    ];

    let phaseIndex = 0;
    const ticker = setInterval(() => {
      if (phaseIndex < previewPhases.length) {
        setPreviewProgress(previewPhases[phaseIndex].pct);
        setPreviewPhase(previewPhases[phaseIndex].label);
        phaseIndex++;
      }
    }, 350);

    try {
      if (!eventId) {
        throw new Error('Event belum dipilih.');
      }

      const validationResult: EventParticipantsImportValidationResponse = await crmService.validateEventParticipantsImport(
        eventId,
        importParticipantsFile,
        destination,
        activeTab
      );
      if (validationResult.destination !== destination) throw new Error('Tujuan preview tidak sesuai. Muat ulang preview sebelum import.');

      let newCount = 0;
      let duplicateCount = 0;
      let incompleteCount = 0;
      let conflictCount = 0;

      const previewRows: PreviewRow[] = (validationResult.rows || []).map((row) => {
        let status: RowStatus = 'NEW';
        if (row.status === 'conflict') {
          status = 'CONFLICT';
          conflictCount++;
        } else if (row.status === 'duplicate' || (row.status === 'valid' && row.existingDatabaseId)) {
          status = 'DUPLICATE';
          duplicateCount++;
        } else if (row.status === 'error') {
          status = 'INCOMPLETE';
          incompleteCount++;
        } else {
          newCount++;
        }

        const message = row.issues?.length
          ? row.issues.join(', ')
          : status === 'DUPLICATE'
          ? row.existingParticipantId
            ? 'Participant sudah ada di event ini'
            : 'Kontak sudah ada di database'
          : 'Siap diimport ke event';

        return {
          rowNum: row.rowNumber,
          companyName: row.companyName || '-',
          firstName: row.firstName || '-',
          lastName: row.lastName || '-',
          jobTitle: row.jobTitle || '-',
          email: row.companyEmail || row.personalEmail || '-',
          mobilePhone: row.mobilePhone || '-',
          status,
          message,
          warnings: row.warnings || [],
          missingFields: row.missingFields || [],
          isIssue: status === 'INCOMPLETE' || status === 'CONFLICT'
        };
      });

      clearInterval(ticker);
      setPreviewProgress(100);
      setPreviewPhase('Preview siap!');
      await new Promise((resolve) => setTimeout(resolve, 250));

      const nextPreview: ImportPreview = {
        destination,
        totalRows: validationResult.summary?.totalRows ?? previewRows.length,
        newCount,
        duplicateCount,
        incompleteCount,
        conflictCount,
        issuesCount: previewRows.filter((row) => row.isIssue).length,
        rows: previewRows
      };

      setImportPreview(nextPreview);
      if (nextPreview.issuesCount > 0) {
        setPreviewTab('ISSUES');
        toast.warning(`Ditemukan ${nextPreview.issuesCount} baris data bermasalah yang harus diperbaiki.`);
      } else {
        setPreviewTab('ALL');
        toast.success('File Excel berhasil diurai! Silakan review sebelum import.');
      }
    } catch (err: any) {
      clearInterval(ticker);
      setPreviewProgress(0);
      toast.error(err.message || 'Gagal memproses file Excel.');
    } finally {
      setLoadingPreview(false);
      setPreviewPhase('');
      setPreviewProgress(0);
    }
  };

  const handleClose = () => {
    resetState();
    onClose();
  };

  const currentTabLabel = activeTab === 'pre_event' ? 'Pre-Event' : 'Request';

  return (
    <div className="ms-modal-overlay">
      <div className={`ms-modal w-full ${importPreview ? 'max-w-4xl' : 'max-w-lg'}`}>
        <button
          onClick={handleClose}
          className="ms-modal-close z-20"
          disabled={isImportingParticipants || loadingPreview}
        >
          <X className="w-5 h-5" />
        </button>

        <div className="border-b border-slate-200 px-5 pb-4 pt-5 pr-14">
          <p className="text-sm font-semibold text-slate-700">Jenis event: {destination === 'company' ? 'Korporat' : destination === 'participant' ? 'Peserta / Publik' : 'Belum ditentukan'}</p>
          {destination ? <p className="mt-1 text-xs text-slate-600">Import mengikuti event ini → {destination === 'company' ? 'Database Perusahaan' : 'Database Peserta'}.</p> : (
            <div role="alert" className="mt-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
              Tentukan jenis event melalui Edit Event sebelum import.
              {onConfigureEvent && <button type="button" onClick={onConfigureEvent} className="mt-2 block font-semibold underline">Atur jenis event</button>}
            </div>
          )}
          <p className="mt-2 text-xs leading-5 text-slate-500">
            Import ke {currentTabLabel} cukup nama dan minimal email valid atau nomor HP/WhatsApp. Jika keduanya kosong, baris ditahan. Kolom database yang belum lengkap boleh dilengkapi setelah import.
            {destination === 'participant'
              ? ' Database Peserta menerima email pribadi, kampus, atau kantor.'
              : destination === 'company'
              ? ' Jika mengisi Company Email, gunakan email institusi/perusahaan; email pribadi dapat diisi di Personal Email.'
              : ' Jenis event menentukan tujuan import dan sync.'}
          </p>
        </div>

        {!importPreview ? (
          <div className="ms-modal-form">
            <div className="ms-modal-header pr-14">
              <div className="inline-flex p-2 bg-[#f0f0fa] text-[#5b5fc7] rounded-md mb-3">
                <Upload className="w-6 h-6" />
              </div>
              <h3 className="ms-modal-title">Import Participants from Excel</h3>
              <p className="ms-modal-description mt-2">
                Upload template spreadsheet untuk menambahkan participant ke tab <span className="font-bold text-[#5b5fc7]">{currentTabLabel}</span>.
              </p>
              <div className="mt-3">
                <button
                  type="button"
                  onClick={() => { if (destination) onDownloadTemplate(destination); }}
                  disabled={!destination || loadingPreview || isImportingParticipants}
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-[#5b5fc7] hover:text-blue-500 hover:underline disabled:opacity-50"
                >
                  <Download className="w-3.5 h-3.5" />
                  Download Participants Template (.xlsx)
                </button>
              </div>
            </div>

            <form onSubmit={handlePreviewExcel} className="ms-modal-form">
              <div className="ms-modal-body space-y-4">
              <div className="border-2 border-dashed border-slate-200 rounded-md p-6 hover:bg-slate-50 transition-all flex flex-col items-center justify-center gap-2 cursor-pointer relative group">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx, .xls"
                  onClick={(e) => {
                    (e.target as HTMLInputElement).value = '';
                  }}
                  onChange={(e) => {
                    if (e.target.files && e.target.files.length > 0) {
                      setImportParticipantsFile(e.target.files[0]);
                    }
                  }}
                  className="absolute inset-0 opacity-0 cursor-pointer"
                  disabled={!destination || loadingPreview}
                />
                <div className="p-2.5 bg-slate-100 group-hover:bg-blue-50 group-hover:text-[#5b5fc7] text-slate-500 rounded-md transition-all">
                  <Upload className="w-5 h-5" />
                </div>
                {importParticipantsFile ? (
                  <div className="text-center z-10">
                    <p className="text-sm font-bold text-slate-800 break-all">{importParticipantsFile.name}</p>
                    <p className="text-xs text-slate-500 mb-1.5">{(importParticipantsFile.size / 1024).toFixed(1)} KB</p>
                    <button
                      type="button"
                      disabled={loadingPreview || isImportingParticipants}
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

              {loadingPreview && (
                <div className="mt-4 space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-semibold text-slate-600">{previewPhase}</span>
                    <span className="text-xs font-bold text-[#5b5fc7] tabular-nums">{previewProgress}%</span>
                  </div>
                  <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-[#5b5fc7] rounded-full transition-all duration-500 ease-out"
                      style={{ width: `${previewProgress}%` }}
                    />
                  </div>
                </div>
              )}

              {isImportingParticipants && (
                <div className="mt-4 space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-semibold text-slate-600">Mengimpor participant ke event...</span>
                    <span className="text-xs font-bold text-[#5b5fc7] tabular-nums">{importParticipantsProgress}%</span>
                  </div>
                  <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-[#5b5fc7] rounded-full transition-all duration-500 ease-out"
                      style={{ width: `${importParticipantsProgress}%` }}
                    />
                  </div>
                </div>
              )}

              </div>
              <div className="ms-modal-footer">
                <button
                  type="button"
                  onClick={handleClose}
                  className="ms-modal-secondary px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-medium rounded-md transition-all"
                  disabled={loadingPreview || isImportingParticipants}
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={loadingPreview || isImportingParticipants || !importParticipantsFile || !destination}
                  className="ms-modal-primary px-5 py-2 bg-[#5b5fc7] hover:bg-[#4f52b2] active:bg-blue-700 text-white text-sm font-bold rounded-md flex items-center gap-2 transition-all disabled:opacity-50"
                >
                  {loadingPreview ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                  Preview & Analisis Excel
                </button>
              </div>
            </form>
          </div>
        ) : (
          <div className="ms-modal-form">
            <div className="ms-modal-header pr-14">
              <h3 className="ms-modal-title">Hasil Analisis & Preview Excel</h3>
              <p className="ms-modal-description mt-2">
                Review kontak untuk {currentTabLabel}. Kekurangan kolom database tidak menghalangi import; nama dan minimal email valid atau HP tetap wajib.
              </p>
            </div>

            <div className="ms-modal-body space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
              <div
                onClick={() => setPreviewTab('ALL')}
                className={`p-2.5 rounded-xl text-center cursor-pointer transition-all border ${previewTab === 'ALL' ? 'bg-slate-100 border-slate-400 ring-2 ring-slate-400/20' : 'bg-slate-50 border-slate-200 hover:bg-slate-100/70'}`}
              >
                <span className="block text-lg font-bold text-slate-900">{importPreview.totalRows}</span>
                <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider block mt-0.5">Total Baris</span>
              </div>

              <div
                onClick={() => setPreviewTab('ISSUES')}
                className={`p-2.5 rounded-xl text-center cursor-pointer transition-all border ${
                  importPreview.issuesCount > 0
                    ? previewTab === 'ISSUES'
                      ? 'bg-red-100 border-red-500 ring-2 ring-red-500/20'
                      : 'bg-red-50 border-red-200 hover:bg-red-100/70'
                    : 'bg-slate-50 border-slate-200 opacity-60'
                }`}
              >
                <span className={`block text-lg font-bold ${importPreview.issuesCount > 0 ? 'text-red-600' : 'text-slate-400'}`}>
                  {importPreview.issuesCount}
                </span>
                <span className={`text-[10px] font-semibold uppercase tracking-wider block mt-0.5 ${importPreview.issuesCount > 0 ? 'text-red-600' : 'text-slate-400'}`}>
                  Bermasalah / Error
                </span>
              </div>

              <div
                onClick={() => setPreviewTab('CONFLICT')}
                className={`p-2.5 rounded-xl text-center cursor-pointer transition-all border ${
                  importPreview.conflictCount > 0
                    ? previewTab === 'CONFLICT'
                      ? 'bg-orange-100 border-orange-500 ring-2 ring-orange-500/20'
                      : 'bg-orange-50 border-orange-200 hover:bg-orange-100/70'
                    : 'bg-slate-50 border-slate-200 opacity-60'
                }`}
              >
                <span className={`block text-lg font-bold ${importPreview.conflictCount > 0 ? 'text-orange-600' : 'text-slate-400'}`}>
                  {importPreview.conflictCount}
                </span>
                <span className={`text-[10px] font-semibold uppercase tracking-wider block mt-0.5 ${importPreview.conflictCount > 0 ? 'text-orange-600' : 'text-slate-400'}`}>
                  Konflik
                </span>
              </div>

              <div
                onClick={() => setPreviewTab('DUPLICATE')}
                className={`p-2.5 rounded-xl text-center cursor-pointer transition-all border ${previewTab === 'DUPLICATE' ? 'bg-amber-100 border-amber-500 ring-2 ring-amber-500/20' : 'bg-amber-50 border-amber-200 hover:bg-amber-100/70'}`}
              >
                <span className="block text-lg font-bold text-amber-600">{importPreview.duplicateCount}</span>
                <span className="text-[10px] font-semibold text-amber-600 uppercase tracking-wider block mt-0.5">Sudah Ada</span>
              </div>

              <div
                onClick={() => setPreviewTab('NEW')}
                className={`p-2.5 rounded-xl text-center cursor-pointer transition-all border ${previewTab === 'NEW' ? 'bg-emerald-100 border-emerald-500 ring-2 ring-emerald-500/20' : 'bg-emerald-50 border-emerald-200 hover:bg-emerald-100/70'}`}
              >
                <span className="block text-lg font-bold text-emerald-600">{importPreview.newCount}</span>
                <span className="text-[10px] font-semibold text-emerald-600 uppercase tracking-wider block mt-0.5">Participant Baru</span>
              </div>
            </div>

            {importPreview.issuesCount > 0 ? (
              <div className="p-3 bg-red-50 border border-red-200 rounded-md flex items-start gap-2.5 text-xs text-red-900 shrink-0">
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold text-red-700">Import Ditolak: </span>
                  Ditemukan <span className="font-bold underline">{importPreview.issuesCount} baris yang perlu diperbaiki</span>. Periksa nama, email/HP, tujuan database, atau konflik identitas pada keterangan baris. Lengkapi baris tersebut di Excel lalu upload ulang.
                </div>
              </div>
            ) : importPreview.duplicateCount > 0 ? (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-md flex items-start gap-2.5 text-xs text-amber-900 shrink-0">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold">Info Duplikasi: </span>
                  {importPreview.duplicateCount} kontak sudah dikenal. Kontak yang sudah ada di event ini dilewati; kontak dari database ditautkan ke event tanpa membuat profil baru.
                </div>
              </div>
            ) : (
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-md flex items-start gap-2.5 text-xs text-emerald-900 shrink-0">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold">Semua data siap. </span>
                  Sebanyak {importPreview.newCount} participant baru bisa langsung diimport ke event ini.
                </div>
              </div>
            )}

            {importPreview.rows.some(row => !row.isIssue && row.missingFields.length > 0) && (
              <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-xs leading-5 text-amber-900">
                Data belum lengkap tetap boleh masuk {currentTabLabel}. Kontak baru yang belum memenuhi kelengkapan database masuk Data Kotor; data kontak yang sudah tersimpan tetap dipertahankan.
              </div>
            )}

            <div className="relative shrink-0">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari nama, company, jabatan, email, HP, atau pesan..."
                aria-label="Cari baris preview import event"
                className="w-full pl-10 pr-4 py-2.5 rounded-md border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400 text-sm"
              />
            </div>

            <div className="border border-slate-200 rounded-md overflow-hidden min-w-0 bg-white">
              <div className="overflow-auto max-h-[40vh]">
                <table className="w-full min-w-[860px] text-left border-collapse text-xs">
                  <thead className="sticky top-0 bg-slate-50 border-b border-slate-200 z-10">
                    <tr className="text-slate-500 uppercase font-semibold">
                      <th className="py-3 px-3 w-14 text-center">No</th>
                      <th className="py-3 px-3">First Name</th>
                      <th className="py-3 px-3">Last Name</th>
                      <th className="py-3 px-3">Company</th>
                      <th className="py-3 px-3">Job Title</th>
                      <th className="py-3 px-3">Email</th>
                      <th className="py-3 px-3">HP / WhatsApp</th>
                      <th className="py-3 px-3">Keterangan</th>
                      <th className="py-3 px-3 text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredRows.map((row) => (
                      <tr key={row.rowNum} className="hover:bg-slate-50/60 transition-all">
                        <td className="py-3 px-3 text-center text-slate-400 font-mono">{row.rowNum}</td>
                        <td className="py-3 px-3 font-bold text-slate-800">{row.firstName}</td>
                        <td className="py-3 px-3 font-bold text-slate-800">{row.lastName}</td>
                        <td className="py-3 px-3 text-slate-600 font-medium">{row.companyName}</td>
                        <td className="py-3 px-3 text-slate-600">{row.jobTitle}</td>
                        <td className="py-3 px-3 text-slate-500 font-mono">{row.email}</td>
                        <td className="py-3 px-3 text-slate-500 font-mono">{row.mobilePhone}</td>
                        <td className="py-3 px-3 text-slate-500">
                          <p>{row.message}</p>
                          {row.warnings.map(warning => <p key={warning} className="mt-1 text-amber-800">{warning}</p>)}
                          {!row.isIssue && row.missingFields.length > 0 && (
                            <p className="mt-1 text-amber-800">
                              <strong>{row.status === 'NEW' ? 'Data Kotor — boleh import.' : 'Kelengkapan Excel.'}</strong>{' '}
                              Belum diisi: {row.missingFields.join(', ')}.
                            </p>
                          )}
                        </td>
                        <td className="py-3 px-3 text-right">
                          <span
                            className={`px-2 py-1 rounded-lg text-[10px] font-semibold border ${
                              row.status === 'INCOMPLETE'
                                ? 'bg-red-50 text-red-600 border-red-200'
                                : row.status === 'CONFLICT'
                                ? 'bg-orange-50 text-orange-600 border-orange-200'
                                : row.status === 'DUPLICATE'
                                ? 'bg-amber-50 text-amber-600 border-amber-200'
                                : 'bg-emerald-50 text-emerald-600 border-emerald-200'
                            }`}
                          >
                            {row.status === 'INCOMPLETE' ? 'Perlu perbaikan' : row.status === 'CONFLICT' ? 'Konflik' : row.status === 'DUPLICATE' ? 'Sudah ada' : 'Baru'}
                          </span>
                        </td>
                      </tr>
                    ))}
                    {filteredRows.length === 0 && (
                      <tr>
                        <td colSpan={9} className="py-10 px-4 text-center text-slate-500">
                          Tidak ada baris yang cocok dengan filter pencarian.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {isImportingParticipants && (
              <div className="space-y-2 shrink-0">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-semibold text-slate-600">Mengimpor participant ke event...</span>
                  <span className="text-xs font-bold text-[#5b5fc7] tabular-nums">{importParticipantsProgress}%</span>
                </div>
                <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[#5b5fc7] rounded-full transition-all duration-500 ease-out"
                    style={{ width: `${importParticipantsProgress}%` }}
                  />
                </div>
              </div>
            )}

            </div>
            <div className="ms-modal-footer justify-between">
              <button
                type="button"
                onClick={resetState}
                className="ms-modal-secondary px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-semibold rounded-md transition-all"
                disabled={isImportingParticipants}
              >
                Kembali ke Upload
              </button>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={handleClose}
                  className="ms-modal-secondary px-4 py-2 hover:bg-slate-100 text-slate-600 text-sm font-medium rounded-md transition-all"
                  disabled={isImportingParticipants}
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={() => { if (destination && destination === importPreview.destination) onImport(destination); }}
                  disabled={isImportingParticipants || importPreview.issuesCount > 0 || !destination || destination !== importPreview.destination}
                  className="ms-modal-primary px-5 py-2 bg-[#5b5fc7] hover:bg-[#4f52b2] active:bg-blue-700 text-white text-sm font-bold rounded-md flex items-center gap-2 transition-all disabled:opacity-50 shadow-sm"
                >
                  {isImportingParticipants ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                  Mulai Import
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
