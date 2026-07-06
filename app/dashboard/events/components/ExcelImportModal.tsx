import React from 'react';
import { X, Plus, Download, Loader2 } from 'lucide-react';

interface ExcelImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  importLeadsFile: File | null;
  setImportLeadsFile: (file: File | null) => void;
  isImportingLeads: boolean;
  importLeadsProgress: number;
  activeTab: string;
  onImport: () => void;
}

export const ExcelImportModal: React.FC<ExcelImportModalProps> = ({
  isOpen,
  onClose,
  importLeadsFile,
  setImportLeadsFile,
  isImportingLeads,
  importLeadsProgress,
  activeTab,
  onImport
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-start justify-center p-4 overflow-y-auto pt-10 sm:pt-16">
      <div className="w-full max-w-md bg-white border border-slate-200 rounded-2xl p-6 shadow-xl relative animate-in scale-in duration-200 text-slate-900">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1 text-slate-400 hover:text-slate-600 rounded-lg transition-colors"
          disabled={isImportingLeads}
        >
          <X className="w-5 h-5" />
        </button>

        <div className="text-center mb-6">
          <div className="inline-flex p-3 bg-blue-50 border border-blue-100 text-blue-600 rounded-xl mb-3">
            <Plus className="w-6 h-6" />
          </div>
          <h3 className="text-xl font-extrabold text-slate-900">Import Leads Excel</h3>
          <p className="text-xs text-slate-500 mt-1">
            Unggah berkas Excel berisi daftar kontak untuk dimasukkan ke tab <strong className="text-blue-600">{activeTab === 'pre_event' ? 'Pre-Event' : 'Request'}</strong>.
          </p>
        </div>

        <div className="space-y-4">
          <div className="border-2 border-dashed border-slate-200 rounded-2xl p-6 text-center hover:bg-slate-50/50 transition-colors relative cursor-pointer">
            <input
              type="file"
              accept=".xlsx, .xls"
              onChange={(e) => {
                if (e.target.files && e.target.files[0]) {
                  setImportLeadsFile(e.target.files[0]);
                }
              }}
              className="absolute inset-0 opacity-0 cursor-pointer"
              disabled={isImportingLeads}
            />
            <Download className="w-8 h-8 text-slate-400 mx-auto mb-2" />
            <span className="block text-xs font-bold text-slate-700">
              {importLeadsFile ? importLeadsFile.name : 'Pilih berkas Excel (.xlsx)'}
            </span>
            <span className="block text-[10px] text-slate-400 mt-1">Maksimal ukuran 5MB</span>
          </div>

          {isImportingLeads && (
            <div className="space-y-2">
              <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                <div
                  className="bg-blue-600 h-2 transition-all duration-300 rounded-full"
                  style={{ width: `${importLeadsProgress}%` }}
                />
              </div>
              <span className="text-[10px] font-bold text-blue-600 block text-center">
                Memproses... {importLeadsProgress}%
              </span>
            </div>
          )}

          <div className="flex gap-3 justify-end pt-4 border-t border-slate-100 mt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium rounded-xl transition-all"
              disabled={isImportingLeads}
            >
              Batal
            </button>
            <button
              type="button"
              onClick={onImport}
              disabled={!importLeadsFile || isImportingLeads}
              className="px-5 py-2 bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white text-xs font-bold rounded-xl flex items-center gap-2 transition-all disabled:opacity-50"
            >
              {isImportingLeads ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
              Mulai Impor
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
