import React, { useState, useEffect, useRef } from 'react';
import { X, Loader2, Upload, Download, AlertCircle, RefreshCw } from 'lucide-react';
import { EventParticipant } from '../../../../lib/types';
import { toast } from 'sonner';
import * as XLSX from 'xlsx';

interface ExcelImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  importParticipantsFile: File | null;
  setImportParticipantsFile: (file: File | null) => void;
  isImportingParticipants: boolean;
  importParticipantsProgress: number;
  activeTab: string;
  onImport: () => void;
  onDownloadTemplate: () => void;
  participants: EventParticipant[];
}

export const ExcelImportModal: React.FC<ExcelImportModalProps> = ({
  isOpen,
  onClose,
  importParticipantsFile,
  setImportParticipantsFile,
  isImportingParticipants,
  importParticipantsProgress,
  activeTab,
  onImport,
  onDownloadTemplate,
  participants
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importPreview, setImportPreview] = useState<{
    totalRows: number;
    newCount: number;
    duplicateCount: number;
    rows: Array<{
      rowNum: number;
      companyName: string;
      firstName: string;
      lastName: string;
      jobTitle: string;
      email: string;
      status: 'NEW' | 'DUPLICATE';
      message: string;
    }>;
  } | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);

  const resetState = () => {
    setImportPreview(null);
    setImportParticipantsFile(null);
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
    if (!importParticipantsFile) {
      toast.error('Please select an Excel file first');
      return;
    }

    setLoadingPreview(true);

    try {
      const reader = new FileReader();
      const fileData = await new Promise<ArrayBuffer>((resolve, reject) => {
        reader.onload = (e) => {
          if (e.target?.result) resolve(e.target.result as ArrayBuffer);
          else reject(new Error('Failed to read file'));
        };
        reader.onerror = () => reject(reader.error);
        reader.readAsArrayBuffer(importParticipantsFile);
      });

      const workbook = XLSX.read(fileData, { type: 'array' });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const parsedRows = XLSX.utils.sheet_to_json<any>(worksheet);

      if (parsedRows.length === 0) {
        toast.error('File Excel kosong atau tidak terbaca.');
        return;
      }

      let newCount = 0;
      let duplicateCount = 0;

      const previewRows = parsedRows.map((row, index) => {
        const companyName = String(row['Company Name'] || '').trim();
        const firstName = String(row['First Name'] || '').trim();
        const lastName = String(row['Last Name'] || '').trim();
        const jobTitle = String(row['Jobtitle'] || '').trim();
        const email = String(row['Company Email Address'] || row['Personal Email Address'] || '').trim();

        // Check duplicates against local participants list
        const isDuplicate = participants.some(
          p => p.database?.firstName?.toLowerCase() === firstName.toLowerCase() &&
               p.database?.lastName?.toLowerCase() === lastName.toLowerCase()
        );

        if (isDuplicate) {
          duplicateCount++;
        } else {
          newCount++;
        }

        return {
          rowNum: index + 1,
          companyName: companyName || '-',
          firstName: firstName || '-',
          lastName: lastName || '-',
          jobTitle: jobTitle || '-',
          email: email || '-',
          status: isDuplicate ? 'DUPLICATE' : 'NEW' as 'NEW' | 'DUPLICATE',
          message: isDuplicate ? 'Already in Event' : 'Ready'
        };
      });

      setImportPreview({
        totalRows: parsedRows.length,
        newCount,
        duplicateCount,
        rows: previewRows
      });
      toast.success('File Excel berhasil diurai! Tinjau data di bawah.');
    } catch (err: any) {
      toast.error(err.message || 'Gagal memproses file Excel.');
    } finally {
      setLoadingPreview(false);
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
          disabled={isImportingParticipants}
        >
          <X className="w-5 h-5" />
        </button>

        {!importPreview ? (
          <div>
            <div className="text-center mb-6">
              <div className="inline-flex p-3 bg-blue-50 border border-blue-100 text-blue-600 rounded-xl mb-3">
                <Upload className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-extrabold text-slate-900">Import Participants Excel</h3>
              <p className="text-xs text-slate-500 mt-1">
                Unggah berkas Excel berisi daftar kontak untuk dimasukkan ke tab <strong className="text-blue-600">{activeTab === 'pre_event' ? 'Pre-Event' : 'Request'}</strong>.
              </p>
              <div className="mt-3">
                <button
                  type="button"
                  onClick={onDownloadTemplate}
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-600 hover:text-blue-500 hover:underline"
                >
                  <Download className="w-3.5 h-3.5" />
                  Download Participants Template (.xlsx)
                </button>
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
                    if (e.target.files && e.target.files[0]) {
                      setImportParticipantsFile(e.target.files[0]);
                    }
                  }}
                  className="absolute inset-0 opacity-0 cursor-pointer"
                  disabled={loadingPreview}
                />
                <div className="p-2.5 bg-slate-100 group-hover:bg-blue-50 group-hover:text-blue-600 text-slate-500 rounded-xl transition-all">
                  <Upload className="w-5 h-5" />
                </div>
                {importParticipantsFile ? (
                  <div className="text-center z-10">
                    <p className="text-sm font-bold text-slate-800 break-all">{importParticipantsFile.name}</p>
                    <p className="text-xs text-slate-500 mb-1.5">{(importParticipantsFile.size / 1024).toFixed(1)} KB</p>
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

              {loadingPreview && (
                <div className="py-2 flex flex-col items-center justify-center gap-2 text-blue-600 text-xs font-bold">
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Membaca file Excel...</span>
                </div>
              )}

              <div className="flex gap-3 justify-end pt-4 border-t border-slate-100 mt-4">
                <button
                  type="button"
                  onClick={handleClose}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium rounded-xl transition-all"
                  disabled={loadingPreview}
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={!importParticipantsFile || loadingPreview}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white text-xs font-bold rounded-xl flex items-center gap-2 transition-all disabled:opacity-50"
                >
                  {loadingPreview ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
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
                Review parsed rows and duplicate warnings before importing.
              </p>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-3 gap-3">
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl text-center">
                <span className="block text-2xl font-black text-slate-900">{importPreview.totalRows}</span>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Rows</span>
              </div>
              <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-2xl text-center">
                <span className="block text-2xl font-black text-emerald-700">{importPreview.newCount}</span>
                <span className="text-[10px] font-bold text-emerald-500 uppercase tracking-wider">New Contacts</span>
              </div>
              <div className="p-4 bg-amber-50 border border-amber-100 rounded-2xl text-center">
                <span className="block text-2xl font-black text-amber-700">{importPreview.duplicateCount}</span>
                <span className="text-[10px] font-bold text-amber-500 uppercase tracking-wider">Duplicates</span>
              </div>
            </div>

            {/* Preview Table */}
            <div className="border border-slate-200 rounded-xl overflow-hidden max-h-[40vh] overflow-y-auto bg-white shadow-sm">
              <table className="w-full text-left border-collapse text-xs">
                <thead className="sticky top-0 bg-slate-50 border-b border-slate-200">
                  <tr className="text-slate-500 uppercase font-semibold">
                    <th className="py-2.5 px-3 w-12 text-center">No</th>
                    <th className="py-2.5 px-3">First Name</th>
                    <th className="py-2.5 px-3">Last Name</th>
                    <th className="py-2.5 px-3">Company</th>
                    <th className="py-2.5 px-3">Job Title</th>
                    <th className="py-2.5 px-3">Email</th>
                    <th className="py-2.5 px-3 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {importPreview.rows.map((row) => (
                    <tr key={row.rowNum} className="hover:bg-slate-50/50 transition-all">
                      <td className="py-2.5 px-3 text-center text-slate-400 font-mono">{row.rowNum}</td>
                      <td className="py-2.5 px-3 font-bold text-slate-800">{row.firstName}</td>
                      <td className="py-2.5 px-3 font-bold text-slate-800">{row.lastName}</td>
                      <td className="py-2.5 px-3 text-slate-600 font-medium">{row.companyName}</td>
                      <td className="py-2.5 px-3 text-slate-600">{row.jobTitle}</td>
                      <td className="py-2.5 px-3 text-slate-500 font-mono">{row.email}</td>
                      <td className="py-2.5 px-3 text-right">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          row.status === 'DUPLICATE'
                            ? 'bg-amber-50 text-amber-600 border border-amber-100'
                            : 'bg-emerald-50 text-emerald-600 border border-emerald-100'
                        }`}>
                          {row.status === 'DUPLICATE' ? 'Duplicate' : 'New'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Footer buttons */}
            <div className="flex gap-3 justify-between pt-4 border-t border-slate-100 mt-6">
              <button
                type="button"
                onClick={resetState}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition-all"
                disabled={isImportingParticipants}
              >
                Kembali ke Upload
              </button>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleClose}
                  className="px-4 py-2 hover:bg-slate-100 text-slate-600 text-xs font-medium rounded-xl transition-all"
                  disabled={isImportingParticipants}
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={onImport}
                  disabled={isImportingParticipants}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white text-xs font-bold rounded-xl flex items-center gap-2 transition-all disabled:opacity-50 shadow-sm"
                >
                  {isImportingParticipants ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                  Mulai Impor
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
