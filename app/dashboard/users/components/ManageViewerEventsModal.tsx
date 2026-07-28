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

  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen && targetUser) {
      loadEventsAndPermissions();
    }
  }, [isOpen, targetUser]);

  const loadEventsAndPermissions = async () => {
    setLoading(true);
    try {
      const allEvents = await crmService.getEvents();
      setEvents(allEvents);

      if (targetUser) {
        const allowed = getViewerAllowedEventIds(targetUser);
        setSelectedIds(allowed);
      }
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
    if (selectedIds.length === events.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(events.map(e => e.id));
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

      toast.success(`Event access permissions saved to Database for viewer "${targetUser.username}"! (${selectedIds.length} event(s) allowed)`);
      onClose();
    } catch (err: any) {
      toast.error(err.message || 'Failed to save event permissions');
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen || !targetUser) return null;

  const filtered = events.filter(e => e.name.toLowerCase().includes(search.toLowerCase()) || (e.clientName && e.clientName.toLowerCase().includes(search.toLowerCase())));

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-lg w-full p-6 space-y-5 animate-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div>
            <h3 className="font-extrabold text-lg text-slate-900 flex items-center gap-2">
              <Calendar className="w-5 h-5 text-blue-600" />
              Viewer Event Access Control
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Select which events <strong className="text-slate-800">{targetUser.fullName || targetUser.username}</strong> is allowed to view.
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
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-blue-500"
            />
          </div>
          <button
            type="button"
            onClick={handleSelectAll}
            className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-all whitespace-nowrap"
          >
            {selectedIds.length === events.length ? 'Deselect All' : 'Select All'}
          </button>
        </div>

        {/* Events Checkbox List */}
        {loading ? (
          <div className="py-12 flex justify-center">
            <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-8 text-center text-xs text-slate-400">
            No events found.
          </div>
        ) : (
          <div className="max-h-60 overflow-y-auto space-y-1.5 pr-1 border border-slate-100 rounded-xl p-2 bg-slate-50/50">
            {filtered.map((evt) => {
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

        <div className="flex items-center justify-between pt-2 border-t border-slate-100">
          <span className="text-xs font-semibold text-slate-500">
            Allowed: <strong className="text-blue-600">{selectedIds.length}</strong> of {events.length} events
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
