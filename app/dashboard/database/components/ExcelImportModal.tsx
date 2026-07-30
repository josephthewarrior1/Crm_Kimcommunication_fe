import React, { useState, useEffect, useRef } from 'react';
import { X, Loader2, Upload, Download, AlertCircle, RefreshCw } from 'lucide-react';
import { crmService } from '../../../../lib/services/crmService';
import { toast } from 'sonner';

interface ExcelImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportSuccess: () => void;
}

export const ExcelImportModal: React.FC<ExcelImportModalProps> = ({
  isOpen,
  onClose,
  onImportSuccess
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedImportFile, setSelectedImportFile] = useState<File | null>(null);
  const [importingExcel, setImportingExcel] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [importPhase, setImportPhase] = useState('');
  const [importPreview, setImportPreview] = useState<{
    totalRows: number;
    newCount: number;
    duplicateCount: number;
    incompleteCount?: number;
    rows: Array<{
      rowNum: number;
      groupName: string;
      companyName: string;
      firstName: string;
      lastName: string;
      jobTitle: string;
      email: string;
      status: 'NEW' | 'DUPLICATE' | 'INCOMPLETE';
      message: string;
    }>;
  } | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);

  const resetState = () => {
    setSelectedImportFile(null);
    setImportPreview(null);
    setImportingExcel(false);
    setImportProgress(0);
    setImportPhase('');
    setLoadingPreview(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  useEffect(() => {
    if (isOpen) {
      resetState();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handlePreviewExcel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedImportFile) {
      toast.error('Please select an Excel file first');
      return;
    }

    setLoadingPreview(true);
    setImportProgress(0);
    setImportPhase('Membaca file Excel...');

    const previewPhases = [
      { pct: 20, label: 'Membaca file Excel...' },
      { pct: 50, label: 'Mengurai baris data...' },
      { pct: 75, label: 'Mencocokkan dengan database...' },
      { pct: 90, label: 'Menyiapkan preview...' },
    ];
    let pi = 0;
    const ticker = setInterval(() => {
      if (pi < previewPhases.length) {
        setImportProgress(previewPhases[pi].pct);
        setImportPhase(previewPhases[pi].label);
        pi++;
      }
    }, 500);

    try {
      const data = await crmService.previewDatabasesExcel(selectedImportFile);
      clearInterval(ticker);
      setImportProgress(100);
      setImportPhase('Preview siap!');
      await new Promise(r => setTimeout(r, 400));
      setImportPreview(data);
      toast.success('Excel file parsed successfully! Review the preview below.');
    } catch (err: any) {
      clearInterval(ticker);
      setImportProgress(0);
      toast.error(err.message || 'Failed to preview Excel file');
    } finally {
      setLoadingPreview(false);
      setImportProgress(0);
      setImportPhase('');
    }
  };

  const handleImportExcel = async (e: React.MouseEvent) => {
    e.preventDefault();
    if (!selectedImportFile) {
      toast.error('Please select an Excel file first');
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
      { pct: 82, label: 'Memeriksa duplikasi & tikus...' },
      { pct: 90, label: 'Hampir selesai...' },
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
      toast.success(res.message || `Successfully imported ${res.count} database(s)!`);
      onImportSuccess();
      handleClose();
    } catch (err: any) {
      clearInterval(ticker);
      setImportProgress(0);
      toast.error(err.message || 'Failed to import Excel data');
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

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className={`w-full ${importPreview ? 'max-w-3xl' : 'max-w-md'} bg-white border border-slate-200 rounded-2xl p-6 shadow-xl relative max-h-[90vh] overflow-y-auto animate-in scale-in duration-200 text-slate-900 transition-all`}>
        <button
          onClick={handleClose}
          className="absolute top-4 right-4 p-1 text-slate-400 hover:text-slate-600 rounded-lg transition-colors"
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
                Upload your database template spreadsheet to bulk import groups, companies, and databases.
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
                      <RefreshCw className="w-3 h-3" /> Reset / Ganti File
                    </button>
                  </div>
                ) : (
                  <div className="text-center">
                    <p className="text-sm font-semibold text-slate-700">Click or drag Excel template here</p>
                    <p className="text-xs text-slate-400 mt-0.5">Supports .xlsx and .xls formats</p>
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
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-205 text-slate-700 text-sm font-medium rounded-xl transition-all"
                  disabled={loadingPreview}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loadingPreview || !selectedImportFile}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white text-sm font-bold rounded-xl flex items-center gap-2 transition-all disabled:opacity-50"
                >
                  {loadingPreview ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                  Preview Excel Data
                </button>
              </div>
            </form>
          </div>
        ) : (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-extrabold text-slate-900">Excel Import Preview</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Review parsed rows and synchronization details before importing.
              </p>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-4 gap-2.5">
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-center">
                <span className="block text-xl font-black text-slate-900">{importPreview.totalRows}</span>
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mt-0.5">Total Rows</span>
              </div>
              <div className="p-3 bg-emerald-50 border border-emerald-100 rounded-xl text-center">
                <span className="block text-xl font-black text-emerald-600">{importPreview.newCount}</span>
                <span className="text-[9px] font-bold text-emerald-500 uppercase tracking-wider block mt-0.5">New Databases</span>
              </div>
              <div className="p-3 bg-amber-50 border border-amber-100 rounded-xl text-center">
                <span className="block text-xl font-black text-amber-600">{importPreview.duplicateCount}</span>
                <span className="text-[9px] font-bold text-amber-500 uppercase tracking-wider block mt-0.5">Duplicates</span>
              </div>
              <div className={`p-3 rounded-xl text-center border ${importPreview.incompleteCount && importPreview.incompleteCount > 0 ? 'bg-red-50 border-red-200' : 'bg-slate-50 border-slate-200'}`}>
                <span className={`block text-xl font-black ${importPreview.incompleteCount && importPreview.incompleteCount > 0 ? 'text-red-600' : 'text-slate-400'}`}>
                  {importPreview.incompleteCount || 0}
                </span>
                <span className={`text-[9px] font-bold uppercase tracking-wider block mt-0.5 ${importPreview.incompleteCount && importPreview.incompleteCount > 0 ? 'text-red-500' : 'text-slate-400'}`}>
                  Incomplete
                </span>
              </div>
            </div>

            {/* Alert Banner */}
            {importPreview.incompleteCount && importPreview.incompleteCount > 0 ? (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-start gap-2.5 text-xs text-red-800">
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold">Import Ditolak: </span>
                  Terdapat {importPreview.incompleteCount} baris data yang belum lengkap. Harap lengkapi kolom yang kosong pada file Excel sebelum melakukan import.
                </div>
              </div>
            ) : importPreview.duplicateCount > 0 ? (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-2.5 text-xs text-amber-800">
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold">Duplicate Warning: </span>
                  {importPreview.duplicateCount} existing databases/emails detected. These entries will be <span className="font-bold underline">synchronized (details updated)</span> in the database rather than creating duplicate databases.
                </div>
              </div>
            ) : null}

            {/* Preview Table */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Preview Table (First 10 Rows)</h4>
                {importPreview.totalRows > 10 && (
                  <span className="text-[10px] font-semibold text-slate-500 italic">
                    * Showing first 10 of {importPreview.totalRows} total rows.
                  </span>
                )}
              </div>
              <div className="overflow-x-auto border border-slate-200 rounded-xl bg-white max-h-[30vh]">
                <table className="w-full text-left border-collapse text-[11px]">
                  <thead>
                    <tr className="bg-slate-50/70 text-slate-550 font-semibold border-b border-slate-200 sticky top-0 z-10">
                      <th className="py-2 px-3 w-12 text-center">Row</th>
                      <th className="py-2 px-3">Name</th>
                      <th className="py-2 px-3">Group / Company</th>
                      <th className="py-2 px-3">Email</th>
                      <th className="py-2 px-3">Status</th>
                      <th className="py-2 px-3">Action / Status Details</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {importPreview.rows.slice(0, 10).map((r) => (
                      <tr key={r.rowNum} className={`transition-colors ${r.status === 'INCOMPLETE' ? 'bg-red-50/40 hover:bg-red-50/60' : 'hover:bg-slate-50/50'}`}>
                        <td className="py-2 px-3 font-semibold text-slate-500 text-center">{r.rowNum}</td>
                        <td className="py-2 px-3 font-bold text-slate-900">{r.firstName} {r.lastName}</td>
                        <td className="py-2 px-3">
                          <span className="block text-slate-800 font-medium">{r.companyName || '-'}</span>
                          {r.groupName && <span className="text-[9px] text-slate-400 block">Holding: {r.groupName}</span>}
                        </td>
                        <td className="py-2 px-3 font-mono">{r.email || '-'}</td>
                        <td className="py-2 px-3">
                          {r.status === 'INCOMPLETE' ? (
                            <span className="px-1.5 py-0.5 bg-red-100 border border-red-200 text-red-700 text-[9px] font-extrabold rounded">
                              INCOMPLETE
                            </span>
                          ) : r.status === 'NEW' ? (
                            <span className="px-1.5 py-0.5 bg-emerald-50 border border-emerald-100 text-emerald-600 text-[9px] font-bold rounded">
                              NEW
                            </span>
                          ) : (
                            <span className="px-1.5 py-0.5 bg-amber-50 border border-amber-200 text-amber-600 text-[9px] font-bold rounded">
                              DUPLICATE
                            </span>
                          )}
                        </td>
                        <td className={`py-2 px-3 leading-tight ${r.status === 'INCOMPLETE' ? 'text-red-600 font-semibold' : 'text-slate-500'}`}>{r.message}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Progress Bar - Import */}
            {importingExcel && (
              <div className="space-y-2 p-4 bg-blue-50 border border-blue-100 rounded-xl">
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
            <div className="flex gap-3 justify-between pt-4 border-t border-slate-100 mt-6">
              <button
                type="button"
                onClick={() => {
                  resetState();
                }}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-semibold rounded-xl transition-all"
                disabled={importingExcel}
              >
                Back to Upload
              </button>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleClose}
                  className="px-4 py-2 hover:bg-slate-55 text-slate-600 text-sm font-semibold rounded-xl transition-all"
                  disabled={importingExcel}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleImportExcel}
                  disabled={importingExcel || Boolean(importPreview.incompleteCount && importPreview.incompleteCount > 0)}
                  className={`px-5 py-2 text-white text-sm font-bold rounded-xl flex items-center gap-2 transition-all ${
                    importPreview.incompleteCount && importPreview.incompleteCount > 0
                      ? 'bg-slate-300 text-slate-500 cursor-not-allowed border border-slate-300'
                      : 'bg-blue-600 hover:bg-blue-500 active:bg-blue-700 disabled:opacity-50'
                  }`}
                >
                  {importingExcel ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                  {importingExcel
                    ? 'Importing...'
                    : importPreview.incompleteCount && importPreview.incompleteCount > 0
                    ? 'Import Ditolak (Lengkapi Excel)'
                    : 'Confirm & Import'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
