'use client';

import React, { useState, useEffect } from 'react';
import { X, Calendar, CheckCircle2, Search, Loader2 } from 'lucide-react';
import { AppUser, Event } from '../../../../lib/types';
import { crmService } from '../../../../lib/services/crmService';
import { getViewerAllowedEventIds, saveViewerAllowedEventIds } from '../../../../lib/utils/viewerAccessHelper';
import { toast } from 'sonner';

interface ManageViewerEventsModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetUser: AppUser | null;
}

export const ManageViewerEventsModal: React.FC<ManageViewerEventsModalProps> = ({
  isOpen,
  onClose,
  targetUser
}) => {
  const [events, setEvents] = useState<Event[]>([]);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const pageSize = 12;

  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen && targetUser) {
      setSearch('');
      setCurrentPage(1);

      const allowed = getViewerAllowedEventIds(targetUser);
      setSelectedIds(allowed);
    }
  }, [isOpen, targetUser]);

  useEffect(() => {
    if (isOpen && targetUser) {
      loadEvents();
    }
  }, [isOpen, targetUser, search, currentPage]);

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
      toast.error('Failed to load events list for permission assignment.');
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = (id: number) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const handleSelectAll = () => {
    const visibleEventIds = events.map((event) => event.id);
    const allVisibleSelected = visibleEventIds.length > 0 && visibleEventIds.every((id) => selectedIds.includes(id));

    if (allVisibleSelected) {
      setSelectedIds((prev) => prev.filter((id) => !visibleEventIds.includes(id)));
    } else {
      setSelectedIds((prev) => Array.from(new Set([...prev, ...visibleEventIds])));
    }
  };

  const handleSave = async () => {
    if (!targetUser) return;
    setSubmitting(true);
    try {
      // Save to backend database API
      await crmService.updateUserAllowedEvents(targetUser.id, selectedIds).catch(() => null);
      saveViewerAllowedEventIds(targetUser.id, selectedIds);
      targetUser.allowedEventIds = selectedIds;

      // If updating current logged-in user, also update session storage
      try {
        const savedUserJson = localStorage.getItem('user');
        if (savedUserJson) {
          const parsed = JSON.parse(savedUserJson);
          if (parsed.id === targetUser.id) {
            parsed.allowedEventIds = selectedIds;
            localStorage.setItem('user', JSON.stringify(parsed));
          }
        }
      } catch {}

      toast.success(`Event access permissions saved for "${targetUser.username}"! (${selectedIds.length} event(s) allowed)`);
      onClose();
    } catch (err: any) {
      toast.error(err.message || 'Failed to save event permissions');
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen || !targetUser) return null;
  const allVisibleSelected = events.length > 0 && events.every((event) => selectedIds.includes(event.id));

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-lg w-full p-6 space-y-5 animate-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div>
            <h3 className="font-extrabold text-lg text-slate-900 flex items-center gap-2">
              <Calendar className="w-5 h-5 text-blue-600" />
              Event Access Permissions
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Select which events <strong className="text-slate-800">{targetUser.fullName || targetUser.username}</strong> ({targetUser.roles?.[0] || 'USER'}) can access or be assigned to.
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-700 rounded-lg transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search & Select All Toolbar */}
        <div className="flex items-center justify-between gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search event name..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-blue-500"
            />
          </div>
          <button
            type="button"
            onClick={handleSelectAll}
            className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-all whitespace-nowrap"
          >
            {allVisibleSelected ? 'Deselect Page' : 'Select Page'}
          </button>
        </div>

        {/* Events Checkbox List */}
        {loading ? (
          <div className="py-12 flex justify-center">
            <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
          </div>
        ) : events.length === 0 ? (
          <div className="py-8 text-center text-xs text-slate-400">
            No events found.
          </div>
        ) : (
          <div className="max-h-60 overflow-y-auto space-y-1.5 pr-1 border border-slate-100 rounded-xl p-2 bg-slate-50/50">
            {events.map((evt) => {
              const isChecked = selectedIds.includes(evt.id);
              return (
                <div
                  key={evt.id}
                  onClick={() => handleToggle(evt.id)}
                  className={`flex items-center justify-between p-2.5 rounded-xl border transition-all cursor-pointer select-none ${
                    isChecked
                      ? 'bg-blue-50/80 border-blue-200 text-blue-950 font-bold shadow-2xs'
                      : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0 pr-2">
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => {}}
                      className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500 pointer-events-none"
                    />
                    <div className="truncate">
                      <p className="text-xs truncate">{evt.name}</p>
                      <p className="text-[10px] text-slate-400 font-normal">Client: {evt.clientName || 'Independent'}</p>
                    </div>
                  </div>
                  {isChecked && <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0" />}
                </div>
              );
            })}
          </div>
        )}

        <div className="flex items-center justify-between text-xs text-slate-500">
          <span>
            Showing {events.length === 0 ? 0 : ((currentPage - 1) * pageSize) + 1}-{Math.min(currentPage * pageSize, totalItems)} of {totalItems} events
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
              disabled={currentPage === 1 || loading}
              className="px-2.5 py-1 rounded-lg border border-slate-200 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-50"
            >
              Prev
            </button>
            <span className="font-semibold text-slate-700">
              {currentPage} / {totalPages}
            </span>
            <button
              type="button"
              onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages || loading}
              className="px-2.5 py-1 rounded-lg border border-slate-200 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-50"
            >
              Next
            </button>
          </div>
        </div>

        <div className="flex items-center justify-between pt-2 border-t border-slate-100">
          <span className="text-xs font-semibold text-slate-500">
            Allowed: <strong className="text-blue-600">{selectedIds.length}</strong> of {totalItems} events
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-all"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl shadow-md shadow-blue-600/10 transition-all"
            >
              Save Event Access
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
