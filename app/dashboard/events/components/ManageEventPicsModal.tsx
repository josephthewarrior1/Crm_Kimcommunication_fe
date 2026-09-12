import React, { useEffect, useState } from 'react';
import { Calendar, CheckCircle2, Loader2, Users, X } from 'lucide-react';
import { AppUser, Event } from '../../../../lib/types';
import { crmService } from '../../../../lib/services/crmService';
import { toast } from 'sonner';

interface ManageEventPicsModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedEvent: Event | null;
  usersList: AppUser[];
  onSaved: () => Promise<void> | void;
}

export const ManageEventPicsModal: React.FC<ManageEventPicsModalProps> = ({
  isOpen,
  onClose,
  selectedEvent,
  usersList,
  onSaved
}) => {
  const [selectedUserIds, setSelectedUserIds] = useState<number[]>([]);
  const [initialSelectedUserIds, setInitialSelectedUserIds] = useState<number[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const candidateUsers = usersList
    .filter((user) => user.roles?.includes('ADMIN') || user.roles?.includes('MANAGER'))
    .filter((user) => {
      const uname = (user.username || '').toLowerCase();
      const fname = (user.fullName || '').toLowerCase();
      return uname !== 'kevin' && !fname.includes('kevin');
    })
    .sort((a, b) => (a.fullName || a.username).localeCompare(b.fullName || b.username));

  useEffect(() => {
    if (!isOpen || !selectedEvent) return;
    const currentUserIds = candidateUsers
      .filter((user) => Array.isArray(user.allowedEventIds) && user.allowedEventIds.includes(selectedEvent.id))
      .map((user) => user.id);
    setSelectedUserIds(currentUserIds);
    setInitialSelectedUserIds(currentUserIds);
  }, [isOpen, selectedEvent?.id, usersList]);

  if (!isOpen || !selectedEvent) return null;

  const getUserName = (user: AppUser) => user.fullName || user.username;

  const toggleUser = (id: number) => {
    setSelectedUserIds((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id]
    );
  };

  const handleSave = async () => {
    setSubmitting(true);
    try {
      const selectedSet = new Set(selectedUserIds);
      const changedUsers = candidateUsers.filter((user) => {
        const hadAccess = Array.isArray(user.allowedEventIds) && user.allowedEventIds.includes(selectedEvent.id);
        return hadAccess !== selectedSet.has(user.id);
      });

      await Promise.all(changedUsers.map((user) => {
        const currentIds = Array.isArray(user.allowedEventIds) ? user.allowedEventIds : [];
        const nextIds = selectedSet.has(user.id)
          ? Array.from(new Set([...currentIds, selectedEvent.id]))
          : currentIds.filter((eventId) => eventId !== selectedEvent.id);
        return crmService.updateUserAllowedEvents(user.id, nextIds);
      }));

      toast.success(`PIC event tersimpan (${selectedUserIds.length} user aktif).`);
      await onSaved();
      onClose();
    } catch (err: any) {
      toast.error(err.message || 'Gagal menyimpan PIC event.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="ms-modal-overlay">
      <div className="ms-modal w-full max-w-lg">
        <div className="ms-modal-header pr-14">
          <div>
            <h3 className="ms-modal-title flex items-center gap-2">
              <Users className="w-5 h-5 text-[#5b5fc7]" />
              Manage PIC Event
            </h3>
            <p className="ms-modal-description mt-2">
              Pilih admin atau manager yang ditugaskan menangani leads untuk event ini.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="ms-modal-close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="ms-modal-body space-y-4">
        <div className="ms-modal-section">
          <div className="flex items-center gap-2 text-sm font-bold text-slate-800">
            <Calendar className="w-4 h-4 text-[#5b5fc7]" />
            <span className="truncate">{selectedEvent.name}</span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1">
            PIC yang dicentang akan muncul di Assign PIC dan Auto Split.
          </p>
        </div>

        <div className="space-y-2">
          {candidateUsers.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-400">
              Belum ada user ADMIN atau MANAGER.
            </div>
          ) : candidateUsers.map((candidate) => {
            const name = getUserName(candidate);
            const role = candidate.roles?.includes('ADMIN') ? 'ADMIN' : 'MANAGER';
            const checked = selectedUserIds.includes(candidate.id);
            return (
              <button
                key={candidate.id}
                type="button"
                onClick={() => toggleUser(candidate.id)}
                className={`w-full flex items-center justify-between p-3 rounded-xl border text-left transition-all ${
                  checked
                    ? 'bg-blue-50/80 border-blue-200 text-blue-950'
                    : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                }`}
              >
                <span className="min-w-0">
                  <span className="block text-xs font-bold truncate">{name}</span>
                  <span className="block break-words text-[10px] text-slate-400">{role} - {candidate.email}</span>
                </span>
                {checked && <CheckCircle2 className="w-4 h-4 text-[#5b5fc7] shrink-0" />}
              </button>
            );
          })}
        </div>

        </div>
        <div className="ms-modal-footer items-center justify-between">
          <span className="text-xs font-semibold text-slate-500">
            Terpilih: <strong className="text-[#5b5fc7]">{selectedUserIds.length}</strong> PIC
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="ms-modal-secondary px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-md transition-all disabled:opacity-60"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={submitting}
              className="ms-modal-primary px-4 py-2 bg-[#5b5fc7] hover:bg-[#4f52b2] text-white text-xs font-bold rounded-md shadow-md shadow-blue-600/10 transition-all disabled:opacity-60 inline-flex items-center gap-2"
            >
              {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              Save PIC
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
