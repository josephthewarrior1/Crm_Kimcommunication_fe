import React, { useState, useEffect } from 'react';
import { X, Loader2 } from 'lucide-react';
import { Group } from '../../../../lib/types';

interface EditGroupModalProps {
  isOpen: boolean;
  onClose: () => void;
  group: Group;
  onSubmit: (data: { name: string; notes?: string }) => Promise<void>;
  submitting: boolean;
}

export const EditGroupModal: React.FC<EditGroupModalProps> = ({
  isOpen,
  onClose,
  group,
  onSubmit,
  submitting
}) => {
  const [name, setName] = useState('');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (group) {
      setName(group.name);
      setNotes(group.notes || '');
    }
  }, [group]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({ name: name.trim(), notes: notes.trim() || undefined });
  };

  return (
    <div className="ms-modal-overlay">
      <div className="ms-modal w-full max-w-md">
        <div className="ms-modal-header">
        <button
          onClick={onClose}
          className="ms-modal-close"
          type="button"
        >
          <X className="w-5 h-5" />
        </button>

        <h3 className="ms-modal-title">Edit Group</h3>
        </div>

        <form onSubmit={handleSubmit} className="ms-modal-form">
          <div className="ms-modal-body space-y-5">
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Group Name *</label>
            <input
              type="text"
              placeholder="e.g. Astra Group"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-2.5 bg-slate-55 border border-slate-200 focus:border-blue-500 rounded-md text-slate-900 placeholder-slate-400 focus:outline-none transition-all focus:bg-white text-sm"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Notes</label>
            <textarea
              placeholder="Additional descriptions..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              className="w-full px-4 py-2.5 bg-slate-55 border border-slate-200 focus:border-blue-500 rounded-md text-slate-900 placeholder-slate-400 focus:outline-none transition-all resize-none focus:bg-white text-sm"
            />
          </div>

          </div>
          <div className="ms-modal-footer">
            <button
              type="button"
              onClick={onClose}
              className="ms-modal-secondary"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="ms-modal-primary"
            >
              {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
              Save Changes
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
