import React from 'react';
import { EventParticipant } from '../../../../lib/types';
import { AlertCircle, Phone, Mail, Edit2, Trash2 } from 'lucide-react';

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
  activeTab: 'request' | 'pre_event' | 'reminder' | 'reminder_dday';
  checkDatabaseCompleteness: (c: any) => { isIncomplete: boolean; missingFields: string[] };
  handleToggleEngagement: (participant: EventParticipant, type: 'CALL' | 'EMAIL' | 'WHATSAPP') => void;
  handleDirectUpdateParticipant: (
    participant: EventParticipant,
    field: 'remarks' | 'attendance' | 'confirmationStatus' | 'reminderH7' | 'reminderH3' | 'reminderH1' | 'reminderHariH',
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
  getConfirmationStatusBadgeStyle
}) => {
  return (
    <div className="flex-1 max-h-[620px] overflow-auto border border-slate-200 rounded-xl bg-white shadow-sm">
      <table className="w-full min-w-[1850px] text-left border-collapse text-[11px]">
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
            {activeTab !== 'request' && <th className="py-2 px-3">Engagement</th>}
            {activeTab !== 'request' && <th className="py-2 px-3">Tele Remarks</th>}
            <th className="py-2 px-3 text-center">Confirmation Status</th>
            {isAdmin && activeTab !== 'request' && <th className="py-2 px-3">PIC</th>}
            <th className="py-2 px-3">Notes</th>
            <th className="py-2 px-3 text-right">Actions</th>
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
                {activeTab !== 'request' && (
                  <td className="py-1.5 px-3">
                    <div className="flex items-center gap-2.5 text-slate-400">
                      {/* Call Engagement */}
                      <button
                        onDoubleClick={() => handleToggleEngagement(p, 'CALL')}
                        className="p-1 hover:bg-slate-100 rounded-lg transition-all focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                        title={`Call Status: ${p.callStatus || 'NOT_CONTACTED'} (Double-click to toggle)`}
                      >
                        <Phone 
                          className={`w-4 h-4 transition-all ${
                            p.callStatus === 'CONNECTED' 
                              ? 'text-blue-600 fill-blue-500/10 scale-110 font-bold' 
                              : p.callStatus && p.callStatus !== 'NOT_CONTACTED' 
                                ? 'text-slate-600' 
                                : 'text-slate-300'
                          }`} 
                        />
                      </button>

                      {/* Email Engagement */}
                      <button
                        onDoubleClick={() => handleToggleEngagement(p, 'EMAIL')}
                        className="p-1 hover:bg-slate-100 rounded-lg transition-all focus:outline-none focus:ring-2 focus:ring-rose-500/20"
                        title={`Email Status: ${p.emailStatus || 'NOT_SENT'} (Double-click to toggle)`}
                      >
                        <Mail 
                          className={`w-4 h-4 transition-all ${
                            p.emailStatus === 'SENT' || p.emailStatus === 'OPENED' || p.emailStatus === 'RESPONDED'
                              ? 'text-rose-500 fill-rose-500/10 scale-110' 
                              : 'text-slate-300'
                          }`} 
                        />
                      </button>

                      {/* WhatsApp Engagement */}
                      <button
                        onDoubleClick={() => handleToggleEngagement(p, 'WHATSAPP')}
                        className="p-1 hover:bg-slate-100 rounded-lg transition-all focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                        title={`WhatsApp Status: ${p.whatsappStatus || 'NOT_SENT'} (Double-click to toggle)`}
                      >
                        <WhatsAppIcon 
                          className={`w-4 h-4 transition-all ${
                            p.whatsappStatus === 'SENT' || p.whatsappStatus === 'RESPONDED'
                              ? 'text-[#25D366] scale-110 filter drop-shadow-[0_1px_2px_rgba(37,211,102,0.2)]' 
                              : 'text-slate-300'
                          }`} 
                        />
                      </button>
                    </div>
                  </td>
                )}
                {activeTab !== 'request' && (
                  <td className="py-1.5 px-3">
                    <select
                      disabled={isUser}
                      value={p.participantStatus || 'not_respon_yet'}
                      onChange={(e) => handleDirectUpdateParticipant(p, 'remarks', e.target.value)}
                      className={`text-[10px] font-extrabold border rounded-lg px-2.5 py-1 focus:outline-none cursor-pointer transition-all ${getStatusBadgeStyle(p.participantStatus)}`}
                    >
                      <option value="not_respon_yet" className="text-slate-705 bg-white font-normal">Not respond yet</option>
                      <option value="not_respond_2x" className="text-slate-700 bg-white font-semibold">Not respond 2x</option>
                      <option value="registered" className="text-indigo-950 bg-white font-extrabold">Registered</option>
                      <option value="tentative" className="text-slate-700 bg-white font-extrabold">Tentative</option>
                      <option value="not_interest" className="text-slate-400 bg-white font-extrabold">Not Interest</option>
                    </select>
                  </td>
                )}
                <td className="py-1.5 px-3">
                  <div className="flex justify-center">
                    <select
                      disabled={isUser}
                      value={p.confirmationStatus || 'pending'}
                      onChange={(e) => handleDirectUpdateParticipant(p, 'confirmationStatus', e.target.value)}
                      className={`text-[10px] font-extrabold border rounded-lg px-2.5 py-1 focus:outline-none cursor-pointer transition-all ${getConfirmationStatusBadgeStyle(p.confirmationStatus || 'pending')}`}
                    >
                      <option value="pending" className="text-slate-700 bg-white font-extrabold">Pending</option>
                      <option value="approve" className="text-indigo-950 bg-white font-extrabold">Approve</option>
                      <option value="decline" className="text-slate-400 bg-white font-extrabold">Decline</option>
                    </select>
                  </div>
                </td>
                {isAdmin && activeTab !== 'request' && (
                  <td className="py-1.5 px-3 font-bold text-slate-700">
                    {displayPic}
                  </td>
                )}
                <td className="py-1.5 px-3 text-slate-500 max-w-[120px] truncate" title={cleanNotes}>
                  {cleanNotes}
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
            );
          })}
        </tbody>
      </table>
    </div>
  );
};
