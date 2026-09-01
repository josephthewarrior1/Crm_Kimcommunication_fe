import React, { useRef, useState, useEffect } from 'react';
import { EventParticipant } from '../../../../lib/types';
import { AlertCircle, Edit2, Trash2, History, ShieldAlert, UserX, MoreVertical } from 'lucide-react';
import { extractPicFromNotes, getOfficeEmail, getPersonalEmail } from '../utils/notesHelper';
import { EventColumnConfig, DEFAULT_COLUMN_CONFIG } from '../utils/columnConfigHelper';

import { normalizePhone } from '../../database/utils/phoneHelper';

interface ReminderTableProps {
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
  adminName?: string;
}

export const ReminderTable: React.FC<ReminderTableProps> = ({
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
  columnConfig = DEFAULT_COLUMN_CONFIG,
  adminName = 'Admin'
}) => {
  const topScrollRef = useRef<HTMLDivElement>(null);
  const tableScrollRef = useRef<HTMLDivElement>(null);
  const tableRef = useRef<HTMLTableElement>(null);
  const [tableScrollWidth, setTableScrollWidth] = useState(0);
  const [openMenuId, setOpenMenuId] = useState<number | null>(null);

  useEffect(() => {
    if (tableRef.current) {
      setTableScrollWidth(tableRef.current.scrollWidth);
    }
  }, [filteredParticipants]);

  useEffect(() => {
    setOpenMenuId(null);
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
        <table ref={tableRef} className="w-full min-w-[1800px] text-left border-collapse text-sm">
        <thead className="sticky top-0 z-10 bg-slate-50 border-b border-slate-200">
          <tr className="text-slate-500 uppercase tracking-wider text-xs font-semibold whitespace-nowrap">
            {!isUser && <th className="py-3 px-3 text-left sticky left-0 bg-slate-50 z-10">Actions</th>}
            <th className="py-3 px-2 w-8 text-center"></th>
            <th className="py-3 px-2 w-8 text-center">
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
                className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500 cursor-pointer"
              />
            </th>
            {columnConfig.companyName !== false && <th className="py-3 px-3">Company Name</th>}
            {columnConfig.salutation !== false && <th className="py-3 px-3">Salutation</th>}
            {columnConfig.firstName !== false && <th className="py-3 px-3">First Name</th>}
            {columnConfig.lastName !== false && <th className="py-3 px-3">Last Name</th>}
            {columnConfig.positionLevel !== false && <th className="py-3 px-3">Position</th>}
            {columnConfig.jobTitle !== false && <th className="py-3 px-3">Job Title</th>}
            {columnConfig.officePhone !== false && <th className="py-3 px-3">Office Phone</th>}
            {columnConfig.mobilePhone !== false && <th className="py-3 px-3">Mobile Phone</th>}
            {columnConfig.officeEmail !== false && <th className="py-3 px-3">Office Email</th>}
            {columnConfig.personalEmail !== false && <th className="py-3 px-3">Personal Email</th>}
            {columnConfig.industry !== false && <th className="py-3 px-3">Industry</th>}
            {columnConfig.telemarketingLogs !== false && onOpenEngagementModal && <th className="py-3 px-3">Telemarketing Logs</th>}
            {columnConfig.remarks !== false && (
              <>
                <th className="py-3 px-3 text-center">H-7</th>
                <th className="py-3 px-3 text-center">H-3</th>
                <th className="py-3 px-3 text-center">H-1</th>
              </>
            )}
            {columnConfig.pic !== false && <th className="py-3 px-3">PIC</th>}
            {columnConfig.notes !== false && <th className="py-3 px-3">Notes</th>}
            {!isUser && <th className="hidden">Actions</th>}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {filteredParticipants.map((p) => {
            const isTakeout = Boolean(p.notes?.includes('[TAKEOUT]') || p.notes?.includes('[Opt-Out]') || p.notes?.toLowerCase().includes('takeout') || (p.database as any)?.isRemovalRequested);
            const isTikus = Boolean(!isTakeout && (!p.database?.isActive || (p.database as any)?.isSuspected || p.notes?.includes('[TIKUS]') || p.notes?.includes('Tikus') || p.participantStatus === 'red'));
            const isDeclined = p.confirmationStatus === 'decline' || p.confirmationStatus === 'declined';
            
            return (
              <tr
                key={p.id}
                className={`relative transition-colors border-b border-slate-100 ${
                  isTikus
                    ? 'bg-red-50/70 hover:bg-red-100/70'
                    : isTakeout
                    ? 'bg-amber-50/70 hover:bg-amber-100/70 opacity-80'
                    : isDeclined
                    ? 'bg-rose-50/40 hover:bg-rose-100/40'
                    : 'hover:bg-slate-50/50'
                }`}
              >
                {!isUser && (
                  <td
                    onClick={(e) => e.stopPropagation()}
                    className={`py-2.5 px-3 text-left sticky left-0 bg-white ${openMenuId === p.id ? 'z-40' : 'z-[1]'}`}
                  >
                    <div className="relative">
                      <button
                        type="button"
                        onClick={() => setOpenMenuId((current) => (current === p.id ? null : p.id))}
                        className="inline-flex items-center justify-center p-1.5 rounded-md border border-slate-200 bg-white text-slate-500 hover:text-slate-900 hover:bg-slate-100 cursor-pointer transition-colors"
                      >
                        <MoreVertical className="w-4 h-4" />
                      </button>
                      {openMenuId === p.id && (
                        <>
                          <div
                            className="fixed inset-0 z-10"
                            onClick={() => setOpenMenuId(null)}
                          />
                          <div className="absolute left-0 top-9 z-50 w-44 rounded-lg border border-slate-200 bg-white p-1.5 shadow-lg">
                            <button
                              onClick={() => {
                                setOpenMenuId(null);
                                handleOpenUpdateParticipantModal(p);
                              }}
                              className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm font-medium text-slate-700 hover:bg-slate-50"
                            >
                              <Edit2 className="w-4 h-4 text-slate-400" />
                              Edit Participant
                            </button>
                            <button
                              onClick={() => {
                                setOpenMenuId(null);
                                openDeleteParticipantConfirm(p);
                              }}
                              className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm font-medium text-red-600 hover:bg-red-50"
                            >
                              <Trash2 className="w-4 h-4 text-red-500" />
                              Remove Participant
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  </td>
                )}
                <td className="py-2.5 px-2 text-center">
                  {checkDatabaseCompleteness(p.database).isIncomplete && (
                    <span
                      className="inline-flex cursor-help text-amber-500 hover:text-amber-600 transition-colors"
                      title={`Semua kolom wajib diisi kecuali Division, Database Type, dan Data Source.\n\nKolom kosong:\n• ${checkDatabaseCompleteness(p.database).missingFields.join("\n• ")}`}
                    >
                      <AlertCircle className="w-4 h-4 shrink-0" />
                    </span>
                  )}
                </td>
                <td className="py-2.5 px-2 text-center">
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
                    className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500 cursor-pointer"
                  />
                </td>
                {columnConfig.companyName !== false && (
                  <td className="py-2.5 px-3 font-medium text-slate-700">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span>{p.database.company?.name || <span className="text-slate-400">-</span>}</span>
                      {isTikus ? (
                        <span
                          className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-medium bg-rose-50 text-rose-600 rounded-md shrink-0 cursor-help"
                          title="PERINGATAN: Peserta ini terdaftar sebagai Tikus / Flagged Identity!"
                        >
                          <ShieldAlert className="w-3 h-3 text-red-500 shrink-0" />
                          Tikus
                        </span>
                      ) : isTakeout ? (
                        <span
                          className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-medium bg-amber-50 text-amber-600 rounded-md shrink-0 cursor-help"
                          title="Status kontak: Request Takeout"
                        >
                          <UserX className="w-3 h-3 text-amber-500 shrink-0" />
                          Takeout
                        </span>
                      ) : isDeclined ? (
                        <span
                          className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-medium bg-rose-50 text-rose-600 rounded-md shrink-0"
                        >
                          Declined
                        </span>
                      ) : null}
                    </div>
                  </td>
                )}
                {columnConfig.salutation !== false && (
                  <td className="py-2.5 px-3 text-slate-500">
                    {p.database.salutation || '-'}
                  </td>
                )}
                {columnConfig.firstName !== false && (
                  <td className="py-2.5 px-3 font-semibold text-slate-900">
                    {p.database.firstName}
                  </td>
                )}
                {columnConfig.lastName !== false && (
                  <td className="py-2.5 px-3 font-semibold text-slate-900">
                    {p.database.lastName || '-'}
                  </td>
                )}
                {columnConfig.positionLevel !== false && (
                  <td className="py-2.5 px-3 text-slate-600">
                    {p.database.positionLevel || '-'}
                  </td>
                )}
                {columnConfig.jobTitle !== false && (
                  <td className="py-2.5 px-3 text-slate-700">
                    {p.database.jobTitle || '-'}
                  </td>
                )}
                {columnConfig.officePhone !== false && (
                  <td className="py-2.5 px-3 text-slate-600">
                    {p.database.company?.officePhone ? normalizePhone(p.database.company.officePhone) : '-'}
                  </td>
                )}
                {columnConfig.mobilePhone !== false && (
                  <td className="py-2.5 px-3 text-slate-700">
                    {p.database.mobilePhone ? normalizePhone(p.database.mobilePhone) : '-'}
                  </td>
                )}
                {columnConfig.officeEmail !== false && (
                  <td className="py-2.5 px-3 text-slate-600">
                    {getOfficeEmail(p.database.emails)}
                  </td>
                )}
                {columnConfig.personalEmail !== false && (
                  <td className="py-2.5 px-3 text-slate-600">
                    {getPersonalEmail(p.database.emails)}
                  </td>
                )}
                {columnConfig.industry !== false && (
                  <td className="py-2.5 px-3 text-slate-600 whitespace-nowrap">
                    {p.database.company?.industry || '-'}
                  </td>
                )}
                {columnConfig.telemarketingLogs !== false && onOpenEngagementModal && (
                  <td className="py-2.5 px-3">
                    <button
                      onClick={() => onOpenEngagementModal(p)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-700 text-sm font-medium rounded-md border border-slate-200 transition-all focus:outline-none cursor-pointer"
                      title="Buka Telemarketing Logs (Call, Email, WA)"
                    >
                      <History className="w-4 h-4 text-slate-500" />
                      <span>View Logs</span>
                    </button>
                  </td>
                )}
                {columnConfig.remarks !== false && (
                  <>
                    {/* H-7 Dropdown */}
                    <td className="py-2.5 px-3">
                      <div className="flex justify-center">
                        <select
                          value={cleanStatusValue(p.reminderH7)}
                          disabled={isUser}
                          onChange={(e) => handleDirectUpdateParticipant(p, 'reminderH7', e.target.value)}
                          className={`text-sm font-medium border rounded-md px-2.5 py-1.5 focus:outline-none cursor-pointer transition-all ${getStatusBadgeStyle(cleanStatusValue(p.reminderH7))}`}
                        >
                          <option value="" className="text-slate-500 bg-white font-normal">- None</option>
                          <option value="not_respon_yet" className="text-slate-500 bg-white font-normal">Not respond yet</option>
                          <option value="not_respond_2x" className="text-slate-500 bg-white font-medium">Not respond 2x</option>
                          <option value="tentative" className="text-amber-700 bg-white font-medium">Tentative</option>
                          <option value="confirm" className="text-emerald-700 bg-white font-medium">Confirm</option>
                          <option value="unable_to_attend" className="text-rose-600 bg-white font-medium">Unable to attend</option>
                        </select>
                      </div>
                    </td>
                    {/* H-3 Dropdown */}
                    <td className="py-2.5 px-3">
                      <div className="flex justify-center">
                        <select
                          value={cleanStatusValue(p.reminderH3)}
                          disabled={isUser}
                          onChange={(e) => handleDirectUpdateParticipant(p, 'reminderH3', e.target.value)}
                          className={`text-sm font-medium border rounded-md px-2.5 py-1.5 focus:outline-none cursor-pointer transition-all ${getStatusBadgeStyle(cleanStatusValue(p.reminderH3))}`}
                        >
                          <option value="" className="text-slate-500 bg-white font-normal">- None</option>
                          <option value="not_respon_yet" className="text-slate-500 bg-white font-normal">Not respond yet</option>
                          <option value="not_respond_2x" className="text-slate-500 bg-white font-medium">Not respond 2x</option>
                          <option value="tentative" className="text-amber-700 bg-white font-medium">Tentative</option>
                          <option value="confirm" className="text-emerald-700 bg-white font-medium">Confirm</option>
                          <option value="unable_to_attend" className="text-rose-600 bg-white font-medium">Unable to attend</option>
                        </select>
                      </div>
                    </td>
                    {/* H-1 Dropdown */}
                    <td className="py-2.5 px-3">
                      <div className="flex justify-center">
                        <select
                          value={cleanStatusValue(p.reminderH1)}
                          disabled={isUser}
                          onChange={(e) => handleDirectUpdateParticipant(p, 'reminderH1', e.target.value)}
                          className={`text-sm font-medium border rounded-md px-2.5 py-1.5 focus:outline-none cursor-pointer transition-all ${getStatusBadgeStyle(cleanStatusValue(p.reminderH1))}`}
                        >
                          <option value="" className="text-slate-500 bg-white font-normal">- None</option>
                          <option value="not_respon_yet" className="text-slate-500 bg-white font-normal">Not respond yet</option>
                          <option value="not_respond_2x" className="text-slate-500 bg-white font-medium">Not respond 2x</option>
                          <option value="tentative" className="text-amber-700 bg-white font-medium">Tentative</option>
                          <option value="confirm" className="text-emerald-700 bg-white font-medium">Confirm</option>
                          <option value="unable_to_attend" className="text-rose-600 bg-white font-medium">Unable to attend</option>
                        </select>
                      </div>
                    </td>
                  </>
                )}
                {columnConfig.pic !== false && (
                  <td className="py-2.5 px-3 text-slate-700 font-medium whitespace-nowrap">
                    {(() => {
                      const pic = extractPicFromNotes(p.notes).pic;
                      return pic.toLowerCase() === 'admin' ? adminName : pic;
                    })()}
                  </td>
                )}
                {columnConfig.notes !== false && (
                  <td
                    onClick={() => handleOpenUpdateParticipantModal(p)}
                    className="py-2.5 px-3 text-slate-600 max-w-[140px] truncate cursor-pointer hover:text-blue-600 hover:underline transition-all"
                    title="Click to edit notes & details"
                  >
                    {extractPicFromNotes(p.notes).cleanNotes || '-'}
                  </td>
                )}
              <td className="hidden">
                {!isUser && (
                  <>
                    <button
                      onClick={() => handleOpenUpdateParticipantModal(p)}
                      className="inline-flex p-1.5 hover:bg-blue-50 hover:text-blue-600 rounded-md text-slate-400 transition-all"
                      title="Edit Participant & Notes"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => openDeleteParticipantConfirm(p)}
                      className="inline-flex p-1.5 hover:bg-red-50 hover:text-red-600 rounded-md text-slate-400 hover:text-red-600 transition-all"
                      title="Remove Participant"
                    >
                      <Trash2 className="w-4 h-4" />
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
