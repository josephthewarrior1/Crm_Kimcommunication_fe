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
    <div className="flex-1 max-h-[620px] overflow-auto border border-slate-200 rounded-xl bg-white shadow-sm">
      <table className="w-full min-w-[1800px] text-left border-collapse text-[11px]">
        <thead className="sticky top-0 z-10 bg-slate-50 shadow-[0_1px_0_0_rgba(226,232,240,1)]">
          <tr className="border-b border-slate-200 text-slate-450 uppercase tracking-widest font-bold text-[9px] whitespace-nowrap">
            <th className="py-2 px-2 w-8 text-center"></th>
            <th className="py-2 px-2 w-8 text-center">
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
            <th className="py-2 px-3">Company Name</th>
            <th className="py-2 px-3">Salutation</th>
            <th className="py-2 px-3">First Name</th>
            <th className="py-2 px-3">Last Name</th>
            <th className="py-2 px-3">Position</th>
            <th className="py-2 px-3">Job Title</th>
            <th className="py-2 px-3">Office Phone</th>
            <th className="py-2 px-3">Mobile Phone</th>
            <th className="py-2 px-3">Office Email</th>
            <th className="py-2 px-3">Personal Email</th>
            <th className="py-2 px-3 text-center">Hari H</th>
            <th className="py-2 px-3">Notes</th>
            <th className="py-2 px-3 text-right">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {filteredParticipants.map((p) => (
            <tr key={p.id} className="hover:bg-slate-50/50 border-b border-slate-100 transition-colors">
              <td className="py-1.5 px-2 text-center">
                {checkDatabaseCompleteness(p.database).isIncomplete && (
                  <span
                    className="inline-flex cursor-help text-amber-500 hover:text-amber-600 transition-colors"
                    title={`Semua kolom wajib diisi kecuali Division/Speciality, Database Type, dan Data Source.\n\nKolom kosong:\n• ${checkDatabaseCompleteness(p.database).missingFields.join("\n• ")}`}
                  >
                    <AlertCircle className="w-4 h-4 shrink-0" />
                  </span>
                )}
              </td>
              <td className="py-1.5 px-2 text-center">
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
              <td className="py-1.5 px-3 font-semibold text-slate-700">
                {p.database.company?.name || <span className="text-slate-400">-</span>}
              </td>
              <td className="py-1.5 px-3 text-slate-500">
                {p.database.salutation || '-'}
              </td>
              <td className="py-1.5 px-3 font-bold text-slate-900">
                {p.database.firstName}
              </td>
              <td className="py-1.5 px-3 font-bold text-slate-900">
                {p.database.lastName || '-'}
              </td>
              <td className="py-1.5 px-3 text-slate-655 font-medium">
                {p.database.positionLevel || '-'}
              </td>
              <td className="py-1.5 px-3 text-slate-950 font-medium">
                {p.database.jobTitle || '-'}
              </td>
              <td className="py-1.5 px-3 font-mono text-slate-600">
                {p.database.company?.officePhone || '-'}
              </td>
              <td className="py-1.5 px-3 font-mono text-slate-700">
                {p.database.mobilePhone || '-'}
              </td>
              <td className="py-1.5 px-3 font-mono text-slate-600">
                {p.database.emails?.find(e => e.emailType === 'company' || e.isCorporate)?.email || '-'}
              </td>
              <td className="py-1.5 px-3 font-mono text-slate-600">
                {p.database.emails?.find(e => e.emailType === 'personal' && !e.isCorporate)?.email || '-'}
              </td>
              {/* Hari H Dropdown */}
              <td className="py-1.5 px-3">
                <div className="flex justify-center">
                  <select
                    value={p.reminderHariH || ''}
                    disabled={isUser}
                    onChange={(e) => handleDirectUpdateParticipant(p, 'reminderHariH', e.target.value)}
                    className={`text-[10px] font-extrabold border rounded-lg px-2.5 py-1 focus:outline-none cursor-pointer transition-all ${getStatusBadgeStyle(p.reminderHariH || '')}`}
                  >
                    <option value="" className="text-slate-500 bg-white font-normal">- None</option>
                    <option value="on_location" className="text-indigo-950 bg-white font-extrabold">On Location</option>
                    <option value="on_the_way" className="text-slate-700 bg-white font-extrabold">On The Way</option>
                    <option value="not_respon_yet" className="text-slate-500 bg-white font-normal">Not Respond Yet</option>
                    <option value="not_respond_2x" className="text-slate-400 bg-white font-normal">Not Respond 2x</option>
                    <option value="not_respond_3x" className="text-slate-400 bg-white font-normal">Not Respond 3x</option>
                    <option value="not_respond_4x" className="text-slate-400 bg-white font-normal">Not Respond 4x</option>
                    <option value="not_respond_5x" className="text-slate-400 bg-white font-normal">Not Respond 5x</option>
                    <option value="not_respond_6x" className="text-slate-400 bg-white font-normal">Not Respond 6x</option>
                    <option value="not_respond_7x" className="text-slate-400 bg-white font-normal">Not Respond 7x</option>
                    <option value="not_respond_8x" className="text-slate-400 bg-white font-normal">Not Respond 8x</option>
                    <option value="not_respond_9x" className="text-slate-400 bg-white font-normal">Not Respond 9x</option>
                    <option value="unable_to_attend" className="text-slate-400 bg-white font-extrabold">Unable Attend</option>
                  </select>
                </div>
              </td>
              <td className="py-1.5 px-3 text-slate-500 max-w-[120px] truncate" title={extractPicFromNotes(p.notes).cleanNotes}>
                {extractPicFromNotes(p.notes).cleanNotes}
              </td>
              <td className="py-1.5 px-3 text-right whitespace-nowrap space-x-1">
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
