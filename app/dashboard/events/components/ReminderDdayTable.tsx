import React from 'react';
import { EventParticipant } from '../../../../lib/types';
import { AlertCircle, Edit2, Trash2 } from 'lucide-react';
import { extractPicFromNotes } from '../utils/notesHelper';

interface ReminderDdayTableProps {
  filteredParticipants: EventParticipant[];
  selectedParticipantIds: number[];
  setSelectedParticipantIds: React.Dispatch<React.SetStateAction<number[]>>;
  checkDatabaseCompleteness: (c: any) => { isIncomplete: boolean; missingFields: string[] };
  handleDirectUpdateParticipant: (
    participant: EventParticipant,
    field: 'remarks' | 'attendance' | 'confirmationStatus' | 'reminderH7' | 'reminderH3' | 'reminderH1' | 'reminderHariH',
    value: string
  ) => void;
  handleOpenUpdateParticipantModal: (participant: EventParticipant) => void;
  openDeleteParticipantConfirm: (participant: EventParticipant) => void;
  isUser: boolean;
  getStatusBadgeStyle: (status: string) => string;
}

export const ReminderDdayTable: React.FC<ReminderDdayTableProps> = ({
  filteredParticipants,
  selectedParticipantIds,
  setSelectedParticipantIds,
  checkDatabaseCompleteness,
  handleDirectUpdateParticipant,
  handleOpenUpdateParticipantModal,
  openDeleteParticipantConfirm,
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
                checked={filteredParticipants.length > 0 && selectedParticipantIds.length === filteredParticipants.length}
                onChange={(e) => {
                  if (e.target.checked) {
                    setSelectedParticipantIds(filteredParticipants.map(p => p.id));
                  } else {
                    setSelectedParticipantIds([]);
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
            <th className="py-3 px-4 text-center">Hari H</th>
            <th className="py-3 px-4">Notes</th>
            <th className="py-3 px-4 text-right">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {filteredParticipants.map((p) => (
            <tr key={p.id} className="hover:bg-slate-50/30 transition-all">
              <td className="py-3.5 px-3 text-center">
                {checkDatabaseCompleteness(p.database).isIncomplete && (
                  <span
                    className="inline-flex cursor-help text-amber-500 hover:text-amber-600 transition-colors"
                    title={`Semua kolom wajib diisi kecuali Division/Speciality, Database Type, dan Data Source.\n\nKolom kosong:\n• ${checkDatabaseCompleteness(p.database).missingFields.join("\n• ")}`}
                  >
                    <AlertCircle className="w-4 h-4 shrink-0" />
                  </span>
                )}
              </td>
              <td className="py-3.5 px-3 text-center">
                <input
                  type="checkbox"
                  disabled={isUser}
                  checked={selectedParticipantIds.includes(p.id)}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setSelectedParticipantIds([...selectedParticipantIds, p.id]);
                    } else {
                      setSelectedParticipantIds(selectedParticipantIds.filter((id) => id !== p.id));
                    }
                  }}
                  className="w-3.5 h-3.5 text-blue-600 border-slate-350 rounded focus:ring-blue-500 cursor-pointer"
                />
              </td>
              <td className="py-3.5 px-4 font-semibold text-slate-700">
                {p.database.company?.name || <span className="text-slate-400">-</span>}
              </td>
              <td className="py-3.5 px-4 text-slate-500">
                {p.database.salutation || '-'}
              </td>
              <td className="py-3.5 px-4 font-bold text-slate-900">
                {p.database.firstName}
              </td>
              <td className="py-3.5 px-4 font-bold text-slate-900">
                {p.database.lastName || '-'}
              </td>
              <td className="py-3.5 px-4 text-slate-655 font-medium">
                {p.database.positionLevel || '-'}
              </td>
              <td className="py-3.5 px-4 text-slate-950 font-medium">
                {p.database.jobTitle || '-'}
              </td>
              <td className="py-3.5 px-4 font-mono text-slate-600">
                {p.database.company?.officePhone || '-'}
              </td>
              <td className="py-3.5 px-4 font-mono text-slate-700">
                {p.database.mobilePhone || '-'}
              </td>
              <td className="py-3.5 px-4 font-mono text-slate-600">
                {p.database.emails?.find(e => e.emailType === 'company' || e.isCorporate)?.email || '-'}
              </td>
              <td className="py-3.5 px-4 font-mono text-slate-600">
                {p.database.emails?.find(e => e.emailType === 'personal' && !e.isCorporate)?.email || '-'}
              </td>
              {/* Hari H Dropdown */}
              <td className="py-3.5 px-4">
                <div className="flex justify-center">
                  <select
                    value={p.reminderHariH || ''}
                    disabled={isUser}
                    onChange={(e) => handleDirectUpdateParticipant(p, 'reminderHariH', e.target.value)}
                    className={`text-[10px] font-extrabold border rounded-lg px-2.5 py-1 focus:outline-none cursor-pointer transition-all ${getStatusBadgeStyle(p.reminderHariH || '')}`}
                  >
                    <option value="" className="text-slate-700 bg-white font-normal">- None</option>
                    <option value="on_location" className="text-emerald-700 bg-white font-extrabold">On Location</option>
                    <option value="on_the_way" className="text-blue-700 bg-white font-extrabold">On The Way</option>
                    <option value="not_respon_yet" className="text-slate-700 bg-white font-normal">Not Respond Yet</option>
                    <option value="unable_to_attend" className="text-rose-700 bg-white font-extrabold">Unable Attend</option>
                  </select>
                </div>
              </td>
              <td className="py-3.5 px-4 text-slate-500 max-w-[120px] truncate" title={extractPicFromNotes(p.notes).cleanNotes}>
                {extractPicFromNotes(p.notes).cleanNotes}
              </td>
              <td className="py-3.5 px-4 text-right space-x-1">
                  {!isUser && (
                    <button
                      onClick={() => handleOpenUpdateParticipantModal(p)}
                      className="inline-flex p-1.5 hover:bg-slate-100 hover:text-blue-600 rounded-lg text-slate-500 transition-all"
                      title="Update Status"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                  {!isUser && (
                    <button
                      onClick={() => openDeleteParticipantConfirm(p)}
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
