import React, { useState, useEffect } from 'react';
import { X, Download } from 'lucide-react';
import { Database, Company, EventParticipant } from '../../../../lib/types';
import { crmService } from '../../../../lib/services/crmService';
import { toast } from 'sonner';
import * as XLSX from 'xlsx';

import { getOfficeEmail, getPersonalEmail } from '../../events/utils/notesHelper';

interface ExportConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  databases: Database[];
  filteredDatabases: Database[];
  selectedDatabaseIds: number[];
  selectedColumns: string[];
  setSelectedColumns: React.Dispatch<React.SetStateAction<string[]>>;
  onExportSuccess: (exportedIds: number[]) => void;
}

const EXPORT_COLUMNS = [
  { key: 'groupName', label: 'Nama Group' },
  { key: 'brandName', label: 'Nama Brand' },
  { key: 'companyName', label: 'Company Name' },
  { key: 'salutation', label: 'Salutation' },
  { key: 'firstName', label: 'First Name' },
  { key: 'lastName', label: 'Last Name' },
  { key: 'position', label: 'Position' },
  { key: 'specialityDivision', label: 'Division' },
  { key: 'jobTitle', label: 'Job Title' },
  { key: 'address', label: 'Address' },
  { key: 'officePhone', label: 'Office Phone' },
  { key: 'mobilePhone', label: 'Mobile Phone' },
  { key: 'companyEmail', label: 'Company Email Address' },
  { key: 'personalEmail', label: 'Personal Email Address' },
  { key: 'industry', label: 'Industry' },
  { key: 'revenueSize', label: 'Company Size (Revenue)' },
  { key: 'employeeSize', label: 'Company Size (Employee)' },
  { key: 'hardware', label: 'Company Hardware' },
  { key: 'linkedin', label: 'Linkedin Link' },
  { key: 'city', label: 'City' },
  { key: 'postalCode', label: 'Postal Code' },
  { key: 'website', label: 'Company Website' },
  { key: 'eventHistory', label: 'Event Participation' }
];

export const ExportConfigModal: React.FC<ExportConfigModalProps> = ({
  isOpen,
  onClose,
  databases,
  filteredDatabases,
  selectedDatabaseIds,
  selectedColumns,
  setSelectedColumns,
  onExportSuccess
}) => {
  const [tempSelectedDbIds, setTempSelectedDbIds] = useState<number[]>([]);

  useEffect(() => {
    if (isOpen) {
      if (selectedDatabaseIds.length > 0) {
        setTempSelectedDbIds(selectedDatabaseIds);
      } else {
        setTempSelectedDbIds(filteredDatabases.map(d => d.id));
      }
    }
  }, [isOpen, selectedDatabaseIds, filteredDatabases]);

  if (!isOpen) return null;

  const handleExecuteExport = async () => {
    const rowsToExport = databases.filter(d => tempSelectedDbIds.includes(d.id));

    if (rowsToExport.length === 0) {
      toast.error("Tidak ada data database yang terpilih untuk di-export.");
      return;
    }

    if (selectedColumns.length === 0) {
      toast.error("Harap pilih minimal satu kolom untuk di-export.");
      return;
    }

    const loadingToastId = toast.loading("Sedang mengambil data event & memproses Excel...");

    try {
      let eventParticipants: EventParticipant[] = [];
      if (selectedColumns.includes('eventHistory')) {
        eventParticipants = await crmService.getEventParticipants();
      }

      const dataToExport = rowsToExport.map((c, index) => {
        const rowData: Record<string, any> = { 'No': index + 1 };
        
        if (selectedColumns.includes('groupName')) rowData['Nama Group'] = c.company?.group?.name || '-';
        if (selectedColumns.includes('brandName')) rowData['Nama Brand'] = c.company?.brandName || '-';
        if (selectedColumns.includes('companyName')) rowData['Company Name'] = c.company?.name || '-';
        if (selectedColumns.includes('salutation')) rowData['Salutation'] = c.salutation || '-';
        if (selectedColumns.includes('firstName')) rowData['First Name'] = c.firstName || '-';
        if (selectedColumns.includes('lastName')) rowData['Last Name'] = c.lastName || '-';
        if (selectedColumns.includes('position')) rowData['Position'] = c.positionLevel || '-';
        if (selectedColumns.includes('specialityDivision')) rowData['Division'] = c.specialityDivision || '-';
        if (selectedColumns.includes('jobTitle')) rowData['Job Title'] = c.jobTitle || '-';
        if (selectedColumns.includes('address')) rowData['Address'] = c.company?.address || '-';
        if (selectedColumns.includes('officePhone')) rowData['Office Phone'] = c.company?.officePhone || '-';
        if (selectedColumns.includes('mobilePhone')) rowData['Mobile Phone'] = c.mobilePhone || '-';
        if (selectedColumns.includes('companyEmail')) {
          rowData['Company Email Address'] = getOfficeEmail(c.emails);
        }
        if (selectedColumns.includes('personalEmail')) {
          rowData['Personal Email Address'] = getPersonalEmail(c.emails);
        }
        if (selectedColumns.includes('industry')) rowData['Industry'] = c.company?.industry || '-';
        if (selectedColumns.includes('revenueSize')) rowData['Company Size (Revenue)'] = c.company?.companySizeRevenue || '-';
        if (selectedColumns.includes('employeeSize')) rowData['Company Size (Employee)'] = c.company?.companySizeEmployee || '-';
        if (selectedColumns.includes('hardware')) rowData['Company Hardware'] = c.company?.companyHardware || '-';
        if (selectedColumns.includes('linkedin')) rowData['Linkedin Link'] = c.linkedinUrl || '-';
        if (selectedColumns.includes('city')) rowData['City'] = c.company?.city || '-';
        if (selectedColumns.includes('postalCode')) rowData['Postal Code'] = c.company?.postalCode || '-';
        if (selectedColumns.includes('website')) rowData['Company Website'] = c.company?.website || '-';
        
        if (selectedColumns.includes('eventHistory')) {
          const matchingParticipants = eventParticipants.filter(p => p.database?.id === c.id);
          const eventNames = matchingParticipants.map(p => p.event?.name).filter(Boolean);
          rowData['Event Participation'] = eventNames.length > 0 ? eventNames.join(', ') : '-';
        }

        return rowData;
      });

      const worksheet = XLSX.utils.json_to_sheet(dataToExport);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Databases');

      // Auto fit column width
      const maxLens = dataToExport.reduce((acc, row) => {
        Object.keys(row).forEach((key) => {
          const valStr = String(row[key as keyof typeof row]);
          acc[key] = Math.max(acc[key] || 10, valStr.length);
        });
        return acc;
      }, {} as Record<string, number>);

      worksheet['!cols'] = Object.keys(maxLens).map(key => ({
        wch: maxLens[key] + 3
      }));

      let fileName = 'Databases_Export.xlsx';
      if (tempSelectedDbIds.length > 0) {
        fileName = `Databases_Selected_${tempSelectedDbIds.length}_Export.xlsx`;
      }

      XLSX.writeFile(workbook, fileName);
      toast.success('Database berhasil di-export ke Excel!', { id: loadingToastId });
      onExportSuccess(tempSelectedDbIds);
      onClose();
    } catch (err: any) {
      toast.error(`Gagal melakukan export: ${err.message || err}`, { id: loadingToastId });
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-start justify-center p-4 overflow-y-auto pt-10 sm:pt-16">
      <div className="w-full max-w-2xl bg-white border border-slate-200 rounded-2xl p-6 shadow-xl relative max-h-[90vh] overflow-y-auto animate-in scale-in duration-200 text-slate-900">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1 text-slate-400 hover:text-slate-600 rounded-lg transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="mb-6">
          <div className="inline-flex p-3 bg-blue-50 border border-blue-100 text-blue-600 rounded-xl mb-3">
            <Download className="w-6 h-6" />
          </div>
          <h3 className="text-xl font-extrabold text-slate-900">Custom Export Excel</h3>
          <p className="text-xs text-slate-500 mt-1">
            Pilih kolom dan tentukan kontak yang ingin di-export ke dalam file Excel.
          </p>
        </div>

        <div className="space-y-6">
          {/* Row selection info and list */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">1. Pilih Orang/Kontak yang mau di-export:</h4>
              <div className="flex gap-2">
                <button
                  onClick={() => setTempSelectedDbIds(filteredDatabases.map(d => d.id))}
                  className="text-[10px] font-bold text-blue-600 hover:underline"
                >
                  Pilih Semua ({filteredDatabases.length})
                </button>
                <span className="text-slate-300">|</span>
                <button
                  onClick={() => setTempSelectedDbIds([])}
                  className="text-[10px] font-bold hover:underline text-red-650"
                >
                  Kosongkan
                </button>
              </div>
            </div>

            <div className="border border-slate-200 rounded-lg bg-white overflow-hidden shadow-sm">
              <div className="max-h-[180px] overflow-y-auto divide-y divide-slate-100">
                {filteredDatabases.map((c) => {
                  const isChecked = tempSelectedDbIds.includes(c.id);
                  return (
                    <label
                      key={c.id}
                      className={`flex items-center gap-3 p-2.5 hover:bg-slate-50 transition-colors cursor-pointer text-xs ${isChecked ? 'bg-blue-50/20' : ''}`}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => {
                          setTempSelectedDbIds(prev =>
                            prev.includes(c.id)
                              ? prev.filter(id => id !== c.id)
                              : [...prev, c.id]
                          );
                        }}
                        className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500 cursor-pointer shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        <span className="font-bold text-slate-900 block truncate">
                          {c.salutation || 'Mr'}. {c.firstName} {c.lastName}
                        </span>
                        <span className="text-[10px] text-slate-500 block truncate">
                          {c.jobTitle || 'No Title'} at {c.company?.name || 'No Company'}
                        </span>
                      </div>
                      <span className="text-[10px] text-slate-400 font-mono shrink-0">
                        {c.mobilePhone || 'No Phone'}
                      </span>
                    </label>
                  );
                })}
              </div>
            </div>

            <p className="text-[10px] font-semibold text-slate-500 mt-2 text-right italic">
              * Menampilkan {filteredDatabases.length} kontak hasil filter aktif. Terpilih <strong className="text-blue-600 font-bold">{tempSelectedDbIds.length}</strong> untuk diexport.
            </p>
          </div>

          {/* Column/Heading selection list */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">2. Kolom / Heading yang mau di-export:</h4>
              <div className="flex gap-2">
                <button
                  onClick={() => setSelectedColumns(EXPORT_COLUMNS.map(col => col.key))}
                  className="text-[10px] font-bold text-blue-600 hover:underline"
                >
                  Select All
                </button>
                <span className="text-slate-300">|</span>
                <button
                  onClick={() => setSelectedColumns([])}
                  className="text-[10px] font-bold text-blue-600 hover:underline"
                >
                  Clear All
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 border border-slate-200 rounded-xl p-4 bg-white max-h-[40vh] overflow-y-auto">
              {EXPORT_COLUMNS.map((col) => {
                const isChecked = selectedColumns.includes(col.key);
                return (
                  <label
                    key={col.key}
                    className={`flex items-center gap-2.5 p-2 rounded-lg border text-xs font-medium cursor-pointer transition-all ${isChecked ? 'bg-blue-50/50 border-blue-200 text-blue-900 font-semibold' : 'border-slate-100 hover:bg-slate-55 text-slate-650'}`}
                  >
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => {
                        setSelectedColumns(prev => 
                          prev.includes(col.key)
                            ? prev.filter((k: string) => k !== col.key)
                            : [...prev, col.key]
                        );
                      }}
                      className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500 cursor-pointer"
                    />
                    {col.label}
                  </label>
                );
              })}
            </div>
          </div>

          <div className="flex gap-3 justify-end pt-4 border-t border-slate-100 mt-6">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-medium rounded-xl transition-all"
            >
              Batal
            </button>
            <button
              type="button"
              onClick={handleExecuteExport}
              className="px-5 py-2 bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white text-sm font-bold rounded-xl flex items-center gap-2 transition-all"
            >
              <Download className="w-4 h-4" />
              Unduh Excel ({tempSelectedDbIds.length} Data)
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
