import React from 'react';
import { EventLead } from '../../../../lib/types';
import { AlertCircle, Edit2, Trash2 } from 'lucide-react';
import { extractPicFromNotes } from '../utils/notesHelper';

interface ReminderTableProps {
  filteredLeads: EventLead[];
  selectedLeadIds: number[];
  setSelectedLeadIds: React.Dispatch<React.SetStateAction<number[]>>;
  checkDatabaseCompleteness: (c: any) => { isIncomplete: boolean; missingFields: string[] };
  handleDirectUpdateLead: (
    lead: EventLead,
    field: 'remarks' | 'attendance' | 'confirmationStatus' | 'reminderH7' | 'reminderH3' | 'reminderH1' | 'reminderHariH',
    value: string
  ) => void;
  handleOpenUpdateLeadModal: (lead: EventLead) => void;
  openDeleteLeadConfirm: (lead: EventLead) => void;
  isUser: boolean;
  getStatusBadgeStyle: (status: string) => string;
}

export const ReminderTable: React.FC<ReminderTableProps> = ({
  filteredLeads,
  selectedLeadIds,
  setSelectedLeadIds,
  checkDatabaseCompleteness,
  handleDirectUpdateLead,
  handleOpenUpdateLeadModal,
  openDeleteLeadConfirm,
  isUser,
  getStatusBadgeStyle
}) => {
  return (
    <div className="flex-1 overflow-x-auto border border-slate-200 rounded-xl bg-white shadow-sm">
      <table className="w-full min-w-[1800px] text-left border-collapse text-xs">
        <thead className="sticky top-0 z-10 bg-slate-50 shadow-[0_1px_0_0_rgba(226,232,240,1)]">
          <tr className="border-b border-slate-200 text-slate-500 uppercase tracking-wider font-semibold whitespace-nowrap">
            <th className="py-3 px-3 w-10 text-center"></th>
            <th className="py-3 px-3 w-10 text-center">
              <input
                type="checkbox"
                disabled={isUser}
                checked={filteredLeads.length > 0 && selectedLeadIds.length === filteredLeads.length}
                onChange={(e) => {
                  if (e.target.checked) {
                    setSelectedLeadIds(filteredLeads.map(l => l.id));
                  } else {
                    setSelectedLeadIds([]);
                  }
                }}
                className="w-3.5 h-3.5 text-blue-600 border-slate-300 rounded focus:ring-blue-500 cursor-pointer"
              />
            </th>
            <th className="py-3 px-4">Company Name</th>
            <th className="py-3 px-4">Salutation</th>
            <th className="py-3 px-4">First Name</th>
            <th className="py-3 px-4">Last Name</th>
            <th className="py-3 px-4">Position</th>
            <th className="py-3 px-4">Job Title</th>
            <th className="py-3 px-4">Office Phone</th>
            <th className="py-3 px-4">Mobile Phone</th>
            <th className="py-3 px-4">Office Email</th>
            <th className="py-3 px-4">Personal Email</th>
            <th className="py-3 px-4 text-center">H-7</th>
            <th className="py-3 px-4 text-center">H-3</th>
            <th className="py-3 px-4 text-center">H-1</th>
            <th className="py-3 px-4">Notes</th>
            <th className="py-3 px-4 text-right">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {filteredLeads.map((l) => (
            <tr key={l.id} className="hover:bg-slate-50/30 transition-all">
              <td className="py-3.5 px-3 text-center">
                {checkDatabaseCompleteness(l.database).isIncomplete && (
                  <span
                    className="inline-flex cursor-help text-amber-500 hover:text-amber-600 transition-colors"
                    title={`Semua kolom wajib diisi kecuali Division/Speciality, Database Type, dan Data Source.\n\nKolom kosong:\n• ${checkDatabaseCompleteness(l.database).missingFields.join("\n• ")}`}
                  >
                    <AlertCircle className="w-4 h-4 shrink-0" />
                  </span>
                )}
              </td>
              <td className="py-3.5 px-3 text-center">
                <input
                  type="checkbox"
                  disabled={isUser}
                  checked={selectedLeadIds.includes(l.id)}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setSelectedLeadIds([...selectedLeadIds, l.id]);
                    } else {
                      setSelectedLeadIds(selectedLeadIds.filter((id) => id !== l.id));
                    }
                  }}
                  className="w-3.5 h-3.5 text-blue-600 border-slate-350 rounded focus:ring-blue-500 cursor-pointer"
                />
              </td>
              <td className="py-3.5 px-4 font-semibold text-slate-700">
                {l.database.company?.name || <span className="text-slate-400">-</span>}
              </td>
              <td className="py-3.5 px-4 text-slate-500">
                {l.database.salutation || '-'}
              </td>
              <td className="py-3.5 px-4 font-bold text-slate-900">
                {l.database.firstName}
              </td>
              <td className="py-3.5 px-4 font-bold text-slate-900">
                {l.database.lastName || '-'}
              </td>
              <td className="py-3.5 px-4 text-slate-655 font-medium">
                {l.database.positionLevel || '-'}
              </td>
              <td className="py-3.5 px-4 text-slate-950 font-medium">
                {l.database.jobTitle || '-'}
              </td>
              <td className="py-3.5 px-4 font-mono text-slate-600">
                {l.database.company?.officePhone || '-'}
              </td>
              <td className="py-3.5 px-4 font-mono text-slate-700">
                {l.database.mobilePhone || '-'}
              </td>
              <td className="py-3.5 px-4 font-mono text-slate-600">
                {l.database.emails?.find(e => e.emailType === 'company' || e.isCorporate)?.email || '-'}
              </td>
              <td className="py-3.5 px-4 font-mono text-slate-600">
                {l.database.emails?.find(e => e.emailType === 'personal' && !e.isCorporate)?.email || '-'}
              </td>
              {/* H-7 Dropdown */}
              <td className="py-3.5 px-4">
                <div className="flex justify-center">
                  <select
                    value={l.reminderH7 || ''}
                    disabled={isUser}
                    onChange={(e) => handleDirectUpdateLead(l, 'reminderH7', e.target.value)}
                    className={`text-[10px] font-extrabold border rounded-lg px-2.5 py-1 focus:outline-none cursor-pointer transition-all ${getStatusBadgeStyle(l.reminderH7 || '')}`}
                  >
                    <option value="" className="text-slate-700 bg-white font-normal">- None</option>
                    <option value="not_respon_yet" className="text-slate-700 bg-white font-normal">Not respond yet</option>
                    <option value="not_respond_2x" className="text-slate-750 bg-white font-semibold">Not respond 2x</option>
                    <option value="tentative" className="text-amber-700 bg-white font-extrabold">Tentative</option>
                    <option value="confirm" className="text-emerald-700 bg-white font-extrabold">Confirm</option>
                    <option value="unable_to_attend" className="text-rose-700 bg-white font-extrabold">Unable to attend</option>
                  </select>
                </div>
              </td>
              {/* H-3 Dropdown */}
              <td className="py-3.5 px-4">
                <div className="flex justify-center">
                  <select
                    value={l.reminderH3 || ''}
                    disabled={isUser}
                    onChange={(e) => handleDirectUpdateLead(l, 'reminderH3', e.target.value)}
                    className={`text-[10px] font-extrabold border rounded-lg px-2.5 py-1 focus:outline-none cursor-pointer transition-all ${getStatusBadgeStyle(l.reminderH3 || '')}`}
                  >
                    <option value="" className="text-slate-700 bg-white font-normal">- None</option>
                    <option value="not_respon_yet" className="text-slate-700 bg-white font-normal">Not respond yet</option>
                    <option value="not_respond_2x" className="text-slate-755 bg-white font-semibold">Not respond 2x</option>
                    <option value="tentative" className="text-amber-700 bg-white font-extrabold">Tentative</option>
                    <option value="confirm" className="text-emerald-700 bg-white font-extrabold">Confirm</option>
                    <option value="unable_to_attend" className="text-rose-700 bg-white font-extrabold">Unable to attend</option>
                  </select>
                </div>
              </td>
              {/* H-1 Dropdown */}
              <td className="py-3.5 px-4">
                <div className="flex justify-center">
                  <select
                    value={l.reminderH1 || ''}
                    disabled={isUser}
                    onChange={(e) => handleDirectUpdateLead(l, 'reminderH1', e.target.value)}
                    className={`text-[10px] font-extrabold border rounded-lg px-2.5 py-1 focus:outline-none cursor-pointer transition-all ${getStatusBadgeStyle(l.reminderH1 || '')}`}
                  >
                    <option value="" className="text-slate-700 bg-white font-normal">- None</option>
                    <option value="not_respon_yet" className="text-slate-700 bg-white font-normal">Not respond yet</option>
                    <option value="not_respond_2x" className="text-slate-755 bg-white font-semibold">Not respond 2x</option>
                    <option value="tentative" className="text-amber-700 bg-white font-extrabold">Tentative</option>
                    <option value="confirm" className="text-emerald-700 bg-white font-extrabold">Confirm</option>
                    <option value="unable_to_attend" className="text-rose-700 bg-white font-extrabold">Unable to attend</option>
                  </select>
                </div>
              </td>
              <td className="py-3.5 px-4 text-slate-500 max-w-[120px] truncate" title={extractPicFromNotes(l.notes).cleanNotes}>
                {extractPicFromNotes(l.notes).cleanNotes}
              </td>
              <td className="py-3.5 px-4 text-right space-x-1">
                  {!isUser && (
                    <button
                      onClick={() => handleOpenUpdateLeadModal(l)}
                      className="inline-flex p-1.5 hover:bg-slate-100 hover:text-blue-600 rounded-lg text-slate-500 transition-all"
                      title="Update Status"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                  {!isUser && (
                    <button
                      onClick={() => openDeleteLeadConfirm(l)}
                      className="inline-flex p-1.5 hover:bg-red-50 hover:text-red-650 rounded-lg text-slate-400 hover:text-red-650 transition-all"
                      title="Remove Participant"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
