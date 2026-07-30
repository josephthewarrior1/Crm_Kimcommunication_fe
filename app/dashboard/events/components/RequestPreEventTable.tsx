import React, { useRef, useState, useEffect } from 'react';
import { EventParticipant } from '../../../../lib/types';
import { AlertCircle, Phone, Mail, Edit2, Trash2, History } from 'lucide-react';
import { extractPreEventApprovalStatus } from '../utils/notesHelper';

const WhatsAppIcon = ({ className = "w-4 h-4" }: { className?: string }) => (
  <svg 
    className={className} 
    viewBox="0 0 24 24" 
    fill="currentColor"
  >
    <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946C.06 5.348 5.397.01 12.008.01c3.202.001 6.212 1.246 8.477 3.513 2.262 2.268 3.507 5.28 3.505 8.484-.004 6.657-5.34 11.997-11.953 11.997-2.005-.001-3.973-.502-5.724-1.455L0 24zm6.59-4.846c1.6.95 3.188 1.449 4.825 1.451 5.436 0 9.86-4.37 9.864-9.799.002-2.63-1.023-5.101-2.885-6.97C16.528 2.017 14.077.99 11.457.99c-5.442 0-9.869 4.37-9.872 9.799-.001 1.764.475 3.486 1.38 5.03l-.996 3.639 3.733-.974h-.055zm11.367-7.39c-.3-.15-1.772-.875-2.046-.975-.276-.1-.476-.15-.676.15-.2.3-.776.975-.95 1.175-.175.2-.35.225-.65.075-.3-.15-1.267-.467-2.414-1.485-.893-.797-1.496-1.783-1.672-2.083-.176-.3-.019-.462.13-.61.135-.133.3-.35.45-.525.15-.175.2-.3.3-.5.1-.2.05-.375-.025-.525-.075-.15-.676-1.625-.926-2.225-.244-.589-.493-.51-.676-.519-.174-.009-.373-.01-.572-.01-.2 0-.525.075-.8.375-.276.3-1.05 1.025-1.05 2.5 0 1.475 1.075 2.9 1.225 3.1.15.2 2.11 3.22 5.11 4.52.714.31 1.27.495 1.703.63.717.228 1.368.196 1.884.12.573-.085 1.772-.725 2.022-1.425.25-.7.25-1.3 0-1.425-.075-.15-.275-.225-.575-.375z"/>
  </svg>
);

interface RequestPreEventTableProps {
  filteredParticipants: EventParticipant[];
  selectedParticipantIds: number[];
  setSelectedParticipantIds: React.Dispatch<React.SetStateAction<number[]>>;
  activeTab: 'request' | 'pre_event' | 'declined' | 'reminder' | 'reminder_dday';
  checkDatabaseCompleteness: (c: any) => { isIncomplete: boolean; missingFields: string[] };
  handleToggleEngagement: (participant: EventParticipant, type: 'CALL' | 'EMAIL' | 'WHATSAPP') => void;
  handleDirectUpdateParticipant: (
    participant: EventParticipant,
    field: 'remarks' | 'attendance' | 'confirmationStatus' | 'preEventApprovalStatus' | 'reminderH7' | 'reminderH3' | 'reminderH1' | 'reminderHariH',
    value: string
  ) => void;
  handleOpenUpdateParticipantModal: (participant: EventParticipant) => void;
  openDeleteParticipantConfirm: (participant: EventParticipant) => void;
  isUser: boolean;
  isAdmin?: boolean;
  adminName?: string;
  extractPicFromNotes: (notes: string | null | undefined) => { pic: string; cleanNotes: string };
  getStatusBadgeStyle: (status: string) => string;
  getConfirmationStatusBadgeStyle: (status: string) => string;
  onOpenEngagementModal?: (participant: EventParticipant) => void;
}

export const RequestPreEventTable: React.FC<RequestPreEventTableProps> = ({
  filteredParticipants,
  selectedParticipantIds,
  setSelectedParticipantIds,
  activeTab,
  checkDatabaseCompleteness,
  handleToggleEngagement,
  handleDirectUpdateParticipant,
  handleOpenUpdateParticipantModal,
  openDeleteParticipantConfirm,
  isUser,
  isAdmin,
  adminName,
  extractPicFromNotes,
  getStatusBadgeStyle,
  getConfirmationStatusBadgeStyle,
  onOpenEngagementModal
}) => {
  const topScrollRef = useRef<HTMLDivElement>(null);
  const tableScrollRef = useRef<HTMLDivElement>(null);
  const tableRef = useRef<HTMLTableElement>(null);
  const [tableScrollWidth, setTableScrollWidth] = useState(0);
  const canEditConfirmation = !isUser || activeTab === 'request';
  const showApprovalColumn = true;

  useEffect(() => {
    if (tableRef.current) {
      setTableScrollWidth(tableRef.current.scrollWidth);
    }
  }, [filteredParticipants, activeTab]);

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
        <div style={{ width: tableScrollWidth ? `${tableScrollWidth}px` : '1850px', height: '10px' }} />
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
        <table ref={tableRef} className="w-full min-w-[1850px] text-left border-collapse text-[11px]">
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
            {activeTab !== 'request' && onOpenEngagementModal && <th className="py-2 px-3">Telemarketing Logs</th>}
            {activeTab !== 'request' && <th className="py-2 px-3">Remarks</th>}
            {showApprovalColumn && (
              <th className="py-2 px-3 text-center">
                {activeTab === 'pre_event' ? 'Pre Event Approval' : activeTab === 'request' ? 'Client Approval' : 'Client Status'}
              </th>
            )}
            {isAdmin && activeTab !== 'request' && <th className="py-2 px-3">PIC</th>}
            <th className="py-2 px-3">Notes</th>
            {!isUser && <th className="py-2 px-3 text-right">Actions</th>}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {filteredParticipants.map((p) => {
            const { pic, cleanNotes } = extractPicFromNotes(p.notes);
            const displayPic = pic.toLowerCase() === 'admin' ? (adminName || 'Admin') : pic;
            return (
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
                {activeTab !== 'request' && onOpenEngagementModal && (
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
                {activeTab !== 'request' && (
                  <td className="py-1.5 px-3">
                    <select
                      disabled={isUser}
                      value={p.participantStatus === 'confirm' ? 'registered' : (p.participantStatus || 'not_respon_yet')}
                      onChange={(e) => handleDirectUpdateParticipant(p, 'remarks', e.target.value)}
                      className={`text-[10px] font-extrabold border rounded-lg px-2.5 py-1 focus:outline-none cursor-pointer transition-all ${getStatusBadgeStyle(p.participantStatus)}`}
                    >
                      <option value="not_respon_yet" className="text-slate-705 bg-white font-normal">Not respond yet</option>
                      <option value="not_respond_2x" className="text-slate-700 bg-white font-semibold">Not respond 2x</option>
                      <option value="registered" className="text-indigo-950 bg-white font-extrabold">Registered</option>
                      <option value="tentative" className="text-slate-700 bg-white font-extrabold">Tentative</option>
                      <option value="not_interest" className="text-slate-400 bg-white font-extrabold">Not Interest</option>
                      <option value="unable_to_attend" className="text-slate-400 bg-white font-extrabold">Unable Attend</option>
                    </select>
                  </td>
                )}
                {showApprovalColumn && (
                  <td className="py-1.5 px-3">
                    <div className="flex justify-center">
                      {activeTab === 'pre_event' ? (
                        <select
                          disabled={isUser}
                          value={extractPreEventApprovalStatus(p.notes)}
                          onChange={(e) => handleDirectUpdateParticipant(p, 'preEventApprovalStatus', e.target.value)}
                          className={`text-[10px] font-extrabold border rounded-lg px-2.5 py-1 focus:outline-none cursor-pointer shadow-2xs transition-all ${getConfirmationStatusBadgeStyle(extractPreEventApprovalStatus(p.notes))}`}
                        >
                          <option value="pending" className="text-amber-800 bg-white font-extrabold">Pending</option>
                          <option value="approve" className="text-emerald-800 bg-white font-extrabold">Approve</option>
                          <option value="decline" className="text-rose-800 bg-white font-extrabold">Decline</option>
                        </select>
                      ) : (
                        <select
                          disabled={!canEditConfirmation}
                          value={
                            extractPreEventApprovalStatus(p.notes) === 'decline'
                              ? 'decline'
                              : p.confirmationStatus === 'confirmed' || p.confirmationStatus === 'approve'
                              ? 'approve'
                              : p.confirmationStatus === 'declined' || p.confirmationStatus === 'decline'
                              ? 'decline'
                              : p.confirmationStatus || 'pending'
                          }
                          onChange={(e) => {
                            const newVal = e.target.value;
                            handleDirectUpdateParticipant(p, 'confirmationStatus', newVal);
                            if (extractPreEventApprovalStatus(p.notes) === 'decline') {
                              handleDirectUpdateParticipant(p, 'preEventApprovalStatus', newVal);
                            }
                          }}
                          className={`text-[10px] font-extrabold border rounded-lg px-2.5 py-1 focus:outline-none cursor-pointer shadow-2xs transition-all ${getConfirmationStatusBadgeStyle(
                            extractPreEventApprovalStatus(p.notes) === 'decline'
                              ? 'decline'
                              : p.confirmationStatus === 'confirmed' || p.confirmationStatus === 'approve'
                              ? 'approve'
                              : p.confirmationStatus === 'declined' || p.confirmationStatus === 'decline'
                              ? 'decline'
                              : p.confirmationStatus || 'pending'
                          )}`}
                        >
                          <option value="pending" className="text-amber-800 bg-white font-extrabold">Pending</option>
                          <option value="approve" className="text-emerald-800 bg-white font-extrabold">Approve</option>
                          <option value="decline" className="text-rose-800 bg-white font-extrabold">Decline</option>
                        </select>
                      )}
                    </div>
                  </td>
                )}
                {isAdmin && activeTab !== 'request' && (
                  <td className="py-1.5 px-3 font-bold text-slate-700">
                    {displayPic}
                  </td>
                )}
                <td
                  onClick={() => {
                    if (!isUser) handleOpenUpdateParticipantModal(p);
                  }}
                  className={`py-1.5 px-3 text-slate-600 max-w-[140px] truncate transition-all ${isUser ? '' : 'cursor-pointer hover:text-blue-600 hover:underline'}`}
                  title={isUser ? cleanNotes || '-' : 'Click to edit notes & details'}
                >
                  {cleanNotes || '-'}
                </td>
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
