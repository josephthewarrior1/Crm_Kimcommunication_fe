import React, { useState } from 'react';
import { X } from 'lucide-react';
import { Database, Event, EventParticipant } from '../../../../lib/types';

interface AddParticipantModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedEvent: Event;
  databases: Database[];
  participants: EventParticipant[];
  allEventParticipants: EventParticipant[];
  events: Event[];
  onAddParticipant: (selectedIds: number[], notes: string) => Promise<void>;
  submittingParticipant: boolean;
}

export const AddParticipantModal: React.FC<AddParticipantModalProps> = ({
  isOpen,
  onClose,
  selectedEvent,
  databases,
  participants,
  allEventParticipants,
  events,
  onAddParticipant,
  submittingParticipant
}) => {
  const [databaseSearch, setDatabaseSearch] = useState('');
  const [filterAddParticipantCompany, setFilterAddParticipantCompany] = useState('');
  const [filterAddParticipantPosition, setFilterAddParticipantPosition] = useState('');
  const [filterAddParticipantIndustry, setFilterAddParticipantIndustry] = useState('');
  const [filterAddParticipantCity, setFilterAddParticipantCity] = useState('');
  const [filterAddParticipantEventId, setFilterAddParticipantEventId] = useState('');
  const [selectedDatabaseIds, setSelectedDatabaseIds] = useState<number[]>([]);
  const [notes, setNotes] = useState('');

  if (!isOpen) return null;

  // Filter active databases not currently participants in the selected event
  const databasesNotInEvent = databases.filter(
    (c) => !participants.some((p) => p.database.id === c.id)
  );

  const visibleDatabases = databasesNotInEvent.filter((c) => {
    // 1. Search Query
    if (databaseSearch) {
      const term = databaseSearch.toLowerCase();
      const fullName = `${c.firstName} ${c.lastName}`.toLowerCase();
      const companyName = c.company?.name?.toLowerCase() || '';
      if (!fullName.includes(term) && !companyName.includes(term)) {
        return false;
      }
    }

    // 2. Company filter
    if (filterAddParticipantCompany && c.company?.name !== filterAddParticipantCompany) {
      return false;
    }

    // 3. Position Level filter
    if (filterAddParticipantPosition && c.positionLevel !== filterAddParticipantPosition) {
      return false;
    }

    // 4. Industry filter
    if (filterAddParticipantIndustry && c.company?.industry !== filterAddParticipantIndustry) {
      return false;
    }

    // 5. City filter
    if (filterAddParticipantCity && c.company?.city !== filterAddParticipantCity) {
      return false;
    }

    // 6. Event Participation history filter
    if (filterAddParticipantEventId) {
      const isInvited = allEventParticipants.some(
        (p) => p.database.id === c.id && p.event.id === Number(filterAddParticipantEventId)
      );
      if (!isInvited) return false;
    }

    return true;
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedDatabaseIds.length === 0) return;
    onAddParticipant(selectedDatabaseIds, notes);
  };

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="w-full max-w-lg bg-white border border-slate-200 rounded-2xl p-6 shadow-xl relative animate-in scale-in duration-200 max-h-[90vh] flex flex-col">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1 text-slate-400 hover:text-slate-600 rounded-lg transition-colors"
          type="button"
        >
          <X className="w-5 h-5" />
        </button>

        <h3 className="text-xl font-extrabold text-slate-900 mb-4 shrink-0">Add Database as Participant</h3>

        <form onSubmit={handleSubmit} className="flex-1 flex flex-col min-h-0">
          <div className="flex-1 overflow-y-auto pr-1.5 space-y-4 mb-4">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">Select Databases</label>
            
            <div className="space-y-2 mb-3">
              <input
                type="text"
                placeholder="Search databases by name or company..."
                value={databaseSearch}
                onChange={(e) => setDatabaseSearch(e.target.value)}
                className="w-full px-4 py-2 bg-slate-50 border border-slate-200 focus:border-blue-500 rounded-xl text-slate-900 text-xs focus:outline-none placeholder-slate-400 focus:bg-white"
              />

              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 space-y-3">
                <p className="text-[10px] font-bold text-slate-550 uppercase tracking-wider">Advanced Filters</p>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <label className="block text-[9px] font-bold text-slate-450 uppercase mb-0.5">Company</label>
                    <select
                      value={filterAddParticipantCompany}
                      onChange={(e) => setFilterAddParticipantCompany(e.target.value)}
                      className="w-full px-2 py-1 bg-white border border-slate-200 rounded-lg text-slate-900 text-[11px] focus:outline-none cursor-pointer"
                    >
                      <option value="">All Companies</option>
                      {Array.from(new Set(databases.map(c => c.company?.name).filter(Boolean))).sort().map((compName) => (
                        <option key={compName} value={compName}>{compName}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[9px] font-bold text-slate-450 uppercase mb-0.5">Position</label>
                    <select
                      value={filterAddParticipantPosition}
                      onChange={(e) => setFilterAddParticipantPosition(e.target.value)}
                      className="w-full px-2 py-1 bg-white border border-slate-200 rounded-lg text-slate-900 text-[11px] focus:outline-none cursor-pointer"
                    >
                      <option value="">All Levels</option>
                      {Array.from(new Set(databases.map(c => c.positionLevel).filter(Boolean))).sort().map((lvl) => (
                        <option key={lvl} value={lvl}>{lvl}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[9px] font-bold text-slate-450 uppercase mb-0.5">Industry</label>
                    <select
                      value={filterAddParticipantIndustry}
                      onChange={(e) => setFilterAddParticipantIndustry(e.target.value)}
                      className="w-full px-2 py-1 bg-white border border-slate-200 rounded-lg text-slate-900 text-[11px] focus:outline-none cursor-pointer"
                    >
                      <option value="">All Industries</option>
                      {Array.from(new Set(databases.map(c => c.company?.industry).filter(Boolean))).sort().map((ind) => (
                        <option key={ind} value={ind}>{ind}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[9px] font-bold text-slate-455 uppercase mb-0.5">City</label>
                    <select
                      value={filterAddParticipantCity}
                      onChange={(e) => setFilterAddParticipantCity(e.target.value)}
                      className="w-full px-2 py-1 bg-white border border-slate-200 rounded-lg text-slate-900 text-[11px] focus:outline-none cursor-pointer"
                    >
                      <option value="">All Cities</option>
                      {Array.from(new Set(databases.map(c => c.company?.city).filter(Boolean))).sort().map((cty) => (
                        <option key={cty} value={cty}>{cty}</option>
                      ))}
                    </select>
                  </div>

                  <div className="col-span-2 border-t border-slate-200 pt-2 mt-1">
                    <label className="block text-[9px] font-bold text-slate-450 uppercase mb-0.5">Pernah diundang ke Event</label>
                    <select
                      value={filterAddParticipantEventId}
                      onChange={(e) => setFilterAddParticipantEventId(e.target.value)}
                      className="w-full px-2 py-1 bg-white border border-slate-200 rounded-lg text-slate-900 text-[11px] focus:outline-none cursor-pointer"
                    >
                      <option value="">- Select Event -</option>
                      {events.filter(e => e.id !== selectedEvent.id).map((evt) => (
                        <option key={evt.id} value={evt.id}>{evt.name}</option>
                      ))}
                    </select>
                  </div>

                </div>

                {(filterAddParticipantCompany || filterAddParticipantPosition || filterAddParticipantIndustry || filterAddParticipantCity || filterAddParticipantEventId) && (
                  <button
                    type="button"
                    onClick={() => {
                      setFilterAddParticipantCompany('');
                      setFilterAddParticipantPosition('');
                      setFilterAddParticipantIndustry('');
                      setFilterAddParticipantCity('');
                      setFilterAddParticipantEventId('');
                    }}
                    className="text-[10px] font-extrabold text-red-600 hover:text-red-750 transition-colors uppercase pt-1"
                  >
                    Clear Modal Filters
                  </button>
                )}
              </div>
            </div>

            <div className="border border-slate-200 rounded-xl p-3 bg-slate-50/50 space-y-2 max-h-[180px] overflow-y-auto">
              {visibleDatabases.length === 0 ? (
                <p className="text-center text-xs text-slate-400 py-4">No available databases found.</p>
              ) : (
                visibleDatabases.map((c) => {
                  const isChecked = selectedDatabaseIds.includes(c.id);
                  return (
                    <label
                      key={c.id}
                      className="flex items-center gap-3 p-2 bg-white border border-slate-100 rounded-lg cursor-pointer hover:bg-slate-50 transition-colors"
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => {
                          if (isChecked) {
                            setSelectedDatabaseIds(selectedDatabaseIds.filter((id) => id !== c.id));
                          } else {
                            setSelectedDatabaseIds([...selectedDatabaseIds, c.id]);
                          }
                        }}
                        className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500"
                      />
                      <div className="text-xs flex-1">
                        <p className="font-bold text-slate-900">{c.firstName} {c.lastName}</p>
                        {c.company?.name && (
                          <p className="text-[10px] text-slate-500 font-medium">{c.company.name}</p>
                        )}
                        
                        {/* Past Events History Badges */}
                        {(() => {
                          const databaseParticipants = allEventParticipants.filter(p => p.database.id === c.id);
                          if (databaseParticipants.length === 0) return null;
                          return (
                            <div className="mt-1.5 flex flex-wrap gap-1 items-center">
                              <span className="text-[9px] font-bold text-slate-400">Invited to:</span>
                              {databaseParticipants.map(p => (
                                <span 
                                  key={p.id} 
                                  className="inline-flex px-1.5 py-0.5 rounded text-[8px] font-bold bg-slate-50 border border-slate-200 text-slate-600 uppercase tracking-wide"
                                >
                                  {p.event.name}
                                </span>
                              ))}
                            </div>
                          );
                        })()}
                      </div>
                    </label>
                  );
                })
              )}
            </div>

            {visibleDatabases.length > 0 && (
              <div className="flex items-center justify-between text-[11px] mt-2 px-1 text-blue-600 font-bold">
                <button
                  type="button"
                  onClick={() => {
                    const allVisibleIds = visibleDatabases.map((c) => c.id);
                    const uniqueIds = Array.from(new Set([...selectedDatabaseIds, ...allVisibleIds]));
                    setSelectedDatabaseIds(uniqueIds);
                  }}
                  className="hover:text-blue-550 transition-colors"
                >
                  Select All Matches
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const allVisibleIds = visibleDatabases.map((c) => c.id);
                    setSelectedDatabaseIds(selectedDatabaseIds.filter((id) => !allVisibleIds.includes(id)));
                  }}
                  className="hover:text-slate-700 text-slate-500 transition-colors"
                >
                  Deselect All Matches
                </button>
              </div>
            )}
            
            <p className="text-[10px] text-slate-500 mt-2 px-1 font-bold">
              {selectedDatabaseIds.length} database(s) selected to add
            </p>
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Participant Notes</label>
            <textarea
              placeholder="Notes about invitation..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 focus:border-blue-500 rounded-xl text-slate-900 text-xs placeholder-slate-400 focus:outline-none transition-all resize-none focus:bg-white"
            />
          </div>
        </div>

        <div className="flex gap-3 justify-end pt-4 border-t border-slate-100 mt-2 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-medium rounded-xl transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submittingParticipant || selectedDatabaseIds.length === 0}
              className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-bold rounded-xl flex items-center gap-2 transition-all disabled:opacity-50"
            >
              Add Participant
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
