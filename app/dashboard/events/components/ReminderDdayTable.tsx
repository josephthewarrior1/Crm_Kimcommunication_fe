import React, { useRef, useState, useEffect } from 'react';
import { EventParticipant } from '../../../../lib/types';
import { AlertCircle, Edit2, Trash2, History, ShieldAlert, UserX } from 'lucide-react';
import { extractPicFromNotes, getOfficeEmail, getPersonalEmail } from '../utils/notesHelper';

import { EventColumnConfig, DEFAULT_COLUMN_CONFIG } from '../utils/columnConfigHelper';

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
  onOpenEngagementModal?: (participant: EventParticipant) => void;
  columnConfig?: EventColumnConfig;
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
  getStatusBadgeStyle,
  onOpenEngagementModal,
  columnConfig = DEFAULT_COLUMN_CONFIG
}) => {
  const topScrollRef = useRef<HTMLDivElement>(null);
  const tableScrollRef = useRef<HTMLDivElement>(null);
  const tableRef = useRef<HTMLTableElement>(null);
  const [tableScrollWidth, setTableScrollWidth] = useState(0);

  useEffect(() => {
    if (tableRef.current) {
      setTableScrollWidth(tableRef.current.scrollWidth);
    }
  }, [filteredParticipants]);

  const cleanStatusValue = (value?: string | null) => {
    if (!value || value === 'null' || value === 'undefined') return '';
    return value;
  };

  return (
    <div className="flex-1 border border-slate-200 rounded-xl bg-white shadow-sm overflow-hidden flex flex-col">
      {/* Top Horizontal Scrollbar */}
      <div
        ref={topScrollRef}
        onScroll={() => {
          if (topScrollRef.current && tableScrollRef.current) {
            tableScrollRef.current.scrollLeft = topScrollRef.current.scrollLeft;
          }
        }}
        className="overflow-x-auto border-b border-slate-100 bg-slate-50/50"
      >
        <div style={{ width: tableScrollWidth ? `${tableScrollWidth}px` : '1800px', height: '10px' }} />
      </div>

      <div
        ref={tableScrollRef}
        onScroll={() => {
          if (topScrollRef.current && tableScrollRef.current) {
            topScrollRef.current.scrollLeft = tableScrollRef.current.scrollLeft;
          }
        }}
        className="flex-1 max-h-[620px] overflow-auto"
      >
        <table ref={tableRef} className="w-full min-w-[1800px] text-left border-collapse text-[11px]">
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
            {columnConfig.companyName !== false && <th className="py-2 px-3">Company Name</th>}
            {columnConfig.salutation !== false && <th className="py-2 px-3">Salutation</th>}
            {columnConfig.firstName !== false && <th className="py-2 px-3">First Name</th>}
            {columnConfig.lastName !== false && <th className="py-2 px-3">Last Name</th>}
            {columnConfig.positionLevel !== false && <th className="py-2 px-3">Position</th>}
            {columnConfig.jobTitle !== false && <th className="py-2 px-3">Job Title</th>}
            {columnConfig.officePhone !== false && <th className="py-2 px-3">Office Phone</th>}
            {columnConfig.mobilePhone !== false && <th className="py-2 px-3">Mobile Phone</th>}
            {columnConfig.officeEmail !== false && <th className="py-2 px-3">Office Email</th>}
            {columnConfig.personalEmail !== false && <th className="py-2 px-3">Personal Email</th>}
            {columnConfig.industry !== false && <th className="py-2 px-3">Industry</th>}
            {columnConfig.telemarketingLogs !== false && onOpenEngagementModal && <th className="py-2 px-3">Telemarketing Logs</th>}
            {columnConfig.remarks !== false && <th className="py-2 px-3 text-center">Hari H</th>}
            {columnConfig.notes !== false && <th className="py-2 px-3">Notes</th>}
            {!isUser && <th className="py-2 px-3 text-right">Actions</th>}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {filteredParticipants.map((p) => {
            const isInactiveOrTakeout = !p.database?.isActive;
            const isDeclined = p.confirmationStatus === 'decline' || p.confirmationStatus === 'declined';
            const isTikus = Boolean((p.database as any)?.isSuspected || p.notes?.includes('[TIKUS]') || p.notes?.includes('Tikus') || p.participantStatus === 'red');

            return (
              <tr
                key={p.id}
                className={`transition-colors border-b border-slate-100 ${
                  isTikus
                    ? 'bg-red-50/70 hover:bg-red-100/70'
                    : isInactiveOrTakeout
                    ? 'bg-slate-50/70 hover:bg-slate-100/70 opacity-80'
                    : isDeclined
                    ? 'bg-rose-50/40 hover:bg-rose-100/40'
                    : 'hover:bg-slate-50/50'
                }`}
              >
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
                {columnConfig.companyName !== false && (
                  <td className="py-1.5 px-3 font-semibold text-slate-700">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span>{p.database.company?.name || <span className="text-slate-400">-</span>}</span>
                      {isTikus ? (
                        <span
                          className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[9px] font-extrabold bg-red-100/90 border border-red-200 text-red-700 rounded-md shrink-0 cursor-help shadow-2xs"
                          title="PERINGATAN: Peserta ini terdaftar sebagai Tikus!"
                        >
                          <ShieldAlert className="w-3 h-3 text-red-600 shrink-0" />
                          TIKUS
                        </span>
                      ) : isInactiveOrTakeout ? (
                        <span
                          className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[9px] font-extrabold bg-amber-50 border border-amber-200 text-amber-700 rounded-md shrink-0 cursor-help shadow-2xs"
                          title="Status kontak: Non-Aktif / Request Takeout"
                        >
                          <UserX className="w-3 h-3 text-amber-600 shrink-0" />
                          TAKEOUT
                        </span>
                      ) : isDeclined ? (
                        <span
                          className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[9px] font-extrabold bg-rose-50 border border-rose-200 text-rose-700 rounded-md shrink-0 shadow-2xs"
                        >
                          DECLINED
                        </span>
                      ) : null}
                    </div>
                  </td>
                )}
                {columnConfig.salutation !== false && (
                  <td className="py-1.5 px-3 text-slate-500">
                    {p.database.salutation || '-'}
                  </td>
                )}
                {columnConfig.firstName !== false && (
                  <td className="py-1.5 px-3 font-bold text-slate-900">
                    {p.database.firstName}
                  </td>
                )}
                {columnConfig.lastName !== false && (
                  <td className="py-1.5 px-3 font-bold text-slate-900">
                    {p.database.lastName || '-'}
                  </td>
                )}
                {columnConfig.positionLevel !== false && (
                  <td className="py-1.5 px-3 text-slate-655 font-medium">
                    {p.database.positionLevel || '-'}
                  </td>
                )}
                {columnConfig.jobTitle !== false && (
                  <td className="py-1.5 px-3 text-slate-950 font-medium">
                    {p.database.jobTitle || '-'}
                  </td>
                )}
                {columnConfig.officePhone !== false && (
                  <td className="py-1.5 px-3 font-mono text-slate-600">
                    {p.database.company?.officePhone || '-'}
                  </td>
                )}
                {columnConfig.mobilePhone !== false && (
                  <td className="py-1.5 px-3 font-mono text-slate-700">
                    {p.database.mobilePhone || '-'}
                  </td>
                )}
                {columnConfig.officeEmail !== false && (
                  <td className="py-1.5 px-3 font-mono text-slate-600">
                    {getOfficeEmail(p.database.emails)}
                  </td>
                )}
                {columnConfig.personalEmail !== false && (
                  <td className="py-1.5 px-3 font-mono text-slate-600">
                    {getPersonalEmail(p.database.emails)}
                  </td>
                )}
                {columnConfig.industry !== false && (
                  <td className="py-1.5 px-3 text-slate-700 whitespace-nowrap">
                    {p.database.company?.industry || '-'}
                  </td>
                )}
                {columnConfig.telemarketingLogs !== false && onOpenEngagementModal && (
                  <td className="py-1.5 px-3">
                    <button
                      onClick={() => onOpenEngagementModal(p)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 hover:bg-blue-50 hover:text-blue-600 text-slate-700 text-xs font-bold rounded-xl border border-slate-200/80 transition-all shadow-2xs focus:outline-none cursor-pointer"
                      title="Buka Telemarketing Logs (Call, Email, WA)"
                    >
                      <History className="w-3.5 h-3.5 text-blue-600" />
                      <span>View Logs</span>
                    </button>
                  </td>
                )}
                {columnConfig.remarks !== false && (
                  /* Hari H Dropdown */
                  <td className="py-1.5 px-3">
                    <div className="flex justify-center">
                      {(() => {
                        const effectiveHariH = cleanStatusValue(p.reminderHariH) || (p.attendanceStatus?.toLowerCase() === 'attended' ? 'on_location' : '');
                        return (
                          <select
                            value={effectiveHariH}
                            disabled={isUser}
                            onChange={(e) => handleDirectUpdateParticipant(p, 'reminderHariH', e.target.value)}
                            className={`text-[10px] font-extrabold border rounded-lg px-2.5 py-1 focus:outline-none cursor-pointer transition-all ${getStatusBadgeStyle(effectiveHariH)}`}
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
                        );
                      })()}
                    </div>
                  </td>
                )}
                {columnConfig.notes !== false && (
                  <td
                    onClick={() => handleOpenUpdateParticipantModal(p)}
                    className="py-1.5 px-3 text-slate-600 max-w-[140px] truncate cursor-pointer hover:text-blue-600 hover:underline transition-all"
                    title="Click to edit notes & details"
                  >
                    {extractPicFromNotes(p.notes).cleanNotes || '-'}
                  </td>
                )}
              <td className="py-1.5 px-3 text-right whitespace-nowrap space-x-1">
                {!isUser && (
                  <>
                    <button
                      onClick={() => handleOpenUpdateParticipantModal(p)}
                      className="inline-flex p-1.5 hover:bg-blue-50 hover:text-blue-600 rounded-lg text-slate-400 transition-all"
                      title="Edit Participant & Notes"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => openDeleteParticipantConfirm(p)}
                      className="inline-flex p-1.5 hover:bg-red-50 hover:text-red-650 rounded-lg text-slate-400 hover:text-red-650 transition-all"
                      title="Remove Participant"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </>
                )}
              </td>
            </tr>
          );
        })}
        </tbody>
      </table>
      </div>
    </div>
  );
};
