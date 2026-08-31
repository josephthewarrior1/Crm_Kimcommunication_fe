import React, { useState, useEffect } from 'react';
import { X, Columns, Check, RotateCcw, Calendar, Search, Loader2 } from 'lucide-react';
import { AppUser, Event } from '../../../../lib/types';
import { crmService } from '../../../../lib/services/crmService';
import { 
  EventColumnConfig, 
  ALL_EVENT_COLUMNS, 
  DEFAULT_COLUMN_CONFIG, 
  getEventColumnConfig, 
  saveEventColumnConfig 
} from '../../events/utils/columnConfigHelper';
import { toast } from 'sonner';

interface ManageUserColumnsModalProps {
  user: AppUser | null;
  isOpen: boolean;
  onClose: () => void;
}

export const ManageUserColumnsModal: React.FC<ManageUserColumnsModalProps> = ({
  user,
  isOpen,
  onClose
}) => {
  const [events, setEvents] = useState<Event[]>([]);
  const [selectedEventId, setSelectedEventId] = useState<number | undefined>(undefined);
  const [config, setConfig] = useState<EventColumnConfig>(DEFAULT_COLUMN_CONFIG);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const pageSize = 12;

  useEffect(() => {
    if (isOpen && user) {
      setSearch('');
      setCurrentPage(1);
      loadConfig(selectedEventId);
    }
  }, [isOpen, user]);

  useEffect(() => {
    if (isOpen && user) {
      loadEvents();
    }
  }, [isOpen, user, search, currentPage]);

  const loadEvents = async () => {
    setLoading(true);
    try {
      const response = await crmService.getEventsList({
        search: search || undefined,
        page: currentPage,
        size: pageSize
      });
      setEvents(response.items || []);
      setTotalPages(response.totalPages || 1);
      setTotalItems(response.total || 0);
    } catch (err) {
      console.error('Failed to load events:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadConfig = (eventId?: number) => {
    if (!user) return;
    const cfg = getEventColumnConfig(user.id, eventId);
    setConfig(cfg);
  };

  const handleEventChange = (eventIdStr: string) => {
    const evId = eventIdStr ? Number(eventIdStr) : undefined;
    setSelectedEventId(evId);
    if (user) {
      setConfig(getEventColumnConfig(user.id, evId));
    }
  };

  const toggleColumn = (key: keyof EventColumnConfig) => {
    setConfig(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const handleSelectAll = (val: boolean) => {
    const next: EventColumnConfig = { ...config };
    ALL_EVENT_COLUMNS.forEach(col => {
      next[col.key] = val;
    });
    setConfig(next);
  };

  const handleResetDefault = () => {
    setConfig(DEFAULT_COLUMN_CONFIG);
  };

  const handleSave = () => {
    if (!user) return;
    saveEventColumnConfig(config, user.id, selectedEventId);
    const scopeLabel = selectedEventId 
      ? `Event "${events.find(e => e.id === selectedEventId)?.name || selectedEventId}"` 
      : 'semua Event (Default)';
    toast.success(`Berhasil menyimpan tampilan kolom tabel untuk ${user.fullName || user.username} pada ${scopeLabel}!`);
    onClose();
  };

  if (!isOpen || !user) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-lg w-full overflow-hidden flex flex-col max-h-[85vh] text-slate-900 animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl">
              <Columns className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-slate-900">Custom Event Columns</h3>
              <p className="text-xs text-slate-500 font-medium">
                Atur kolom tabel event yang dapat dilihat oleh <strong className="text-slate-800">{user.fullName || user.username}</strong>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-5">
          {/* Event Scope Selection */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5 uppercase tracking-wider">
              <Calendar className="w-3.5 h-3.5 text-blue-600" />
              Pilih Scope Event
            </label>
            <div className="space-y-3">
              <select
                value={selectedEventId || ''}
                onChange={(e) => handleEventChange(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 text-slate-800 text-xs font-semibold rounded-xl focus:outline-none focus:border-blue-500 cursor-pointer"
              >
                <option value="">Semua Event (Default General User)</option>
                {events.map((ev) => (
                  <option key={ev.id} value={ev.id}>
                    Khusus Event: {ev.name}
                  </option>
                ))}
              </select>

              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Cari event..."
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-blue-500"
                />
              </div>

              {loading ? (
                <div className="py-4 flex justify-center">
                  <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
                </div>
              ) : (
                <div className="flex items-center justify-between text-[11px] text-slate-500">
                  <span>
                    Showing {events.length === 0 ? 0 : ((currentPage - 1) * pageSize) + 1}-{Math.min(currentPage * pageSize, totalItems)} of {totalItems} events
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                      disabled={currentPage === 1}
                      className="px-2 py-1 rounded-lg border border-slate-200 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-50"
                    >
                      Prev
                    </button>
                    <span className="font-semibold text-slate-700">
                      {currentPage} / {totalPages}
                    </span>
                    <button
                      type="button"
                      onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                      disabled={currentPage === totalPages}
                      className="px-2 py-1 rounded-lg border border-slate-200 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-50"
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </div>
            <p className="text-[10px] text-slate-500">
              *Jika memilih event tertentu, pengaturan ini hanya berlaku khusus untuk event tersebut.
            </p>
          </div>

          {/* Quick Actions */}
          <div className="flex items-center justify-between pt-2 border-t border-slate-100">
            <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">Daftar Kolom Tabel</span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => handleSelectAll(true)}
                className="text-[11px] font-bold text-blue-600 hover:underline cursor-pointer"
              >
                Pilih Semua
              </button>
              <span className="text-slate-300">•</span>
              <button
                type="button"
                onClick={() => handleSelectAll(false)}
                className="text-[11px] font-bold text-slate-500 hover:underline cursor-pointer"
              >
                Hapus Semua
              </button>
              <span className="text-slate-300">•</span>
              <button
                type="button"
                onClick={handleResetDefault}
                className="text-[11px] font-bold text-amber-600 hover:underline flex items-center gap-1 cursor-pointer"
              >
                <RotateCcw className="w-3 h-3" />
                Reset
              </button>
            </div>
          </div>

          {/* Checkbox List */}
          <div className="grid grid-cols-2 gap-2.5 bg-slate-50/70 p-3 rounded-xl border border-slate-200/80">
            {ALL_EVENT_COLUMNS.map((col) => {
              const isChecked = config[col.key] !== false;
              return (
                <label
                  key={col.key}
                  className={`flex items-center gap-2.5 p-2 rounded-lg border text-xs font-semibold transition-all cursor-pointer select-none ${
                    isChecked
                      ? 'bg-white border-blue-200 text-blue-900 shadow-2xs'
                      : 'bg-slate-100/50 border-slate-200 text-slate-400'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={() => toggleColumn(col.key)}
                    className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500 cursor-pointer"
                  />
                  <span className="truncate">{col.label}</span>
                </label>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/50 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-800 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors cursor-pointer"
          >
            Batal
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-500 rounded-xl transition-all shadow-sm flex items-center gap-1.5 cursor-pointer"
          >
            <Check className="w-4 h-4" />
            Simpan Tampilan
          </button>
        </div>

      </div>
    </div>
  );
};
