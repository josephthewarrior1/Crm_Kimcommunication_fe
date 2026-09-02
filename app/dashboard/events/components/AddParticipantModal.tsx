import React, { useEffect, useState } from 'react';
import { Loader2, X } from 'lucide-react';
import { Event, EventAvailableDatabasesResponse, EventParticipant } from '../../../../lib/types';
import { crmService } from '../../../../lib/services/crmService';
import { toast } from 'sonner';

interface AddParticipantModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedEvent: Event;
  participants: EventParticipant[];
  onAddParticipant: (selectedIds: number[], notes: string) => Promise<void>;
  submittingParticipant: boolean;
}

const emptyResponse: EventAvailableDatabasesResponse = {
  eventId: 0,
  total: 0,
  items: [],
  filterOptions: {
    companies: [],
    positions: [],
    industries: [],
    cities: [],
    invitedEvents: []
  }
};

export const AddParticipantModal: React.FC<AddParticipantModalProps> = ({
  isOpen,
  onClose,
  selectedEvent,
  participants,
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
  const [loadingDatabases, setLoadingDatabases] = useState(false);
  const [response, setResponse] = useState<EventAvailableDatabasesResponse>(emptyResponse);

  useEffect(() => {
    if (!isOpen) return;

    const loadAvailableDatabases = async () => {
      setLoadingDatabases(true);
      try {
        const result = await crmService.getAvailableDatabasesForEvent(selectedEvent.id, {
          search: databaseSearch || undefined,
          company: filterAddParticipantCompany || undefined,
          position: filterAddParticipantPosition || undefined,
          industry: filterAddParticipantIndustry || undefined,
          city: filterAddParticipantCity || undefined,
          invitedEventId: filterAddParticipantEventId || undefined
        });
        setResponse(result || emptyResponse);
      } catch {
        setResponse(emptyResponse);
        toast.error('Failed to load available databases');
      } finally {
        setLoadingDatabases(false);
      }
    };

    void loadAvailableDatabases();
  }, [
    isOpen,
    selectedEvent.id,
    databaseSearch,
    filterAddParticipantCompany,
    filterAddParticipantPosition,
    filterAddParticipantIndustry,
    filterAddParticipantCity,
    filterAddParticipantEventId
  ]);

  useEffect(() => {
    if (!isOpen) return;
    setSelectedDatabaseIds((prev) =>
      prev.filter((id) => response.items.some((item) => item.database.id === id))
    );
  }, [isOpen, response.items]);

  useEffect(() => {
    if (!isOpen) return;
    setSelectedDatabaseIds([]);
    setNotes('');
    setDatabaseSearch('');
    setFilterAddParticipantCompany('');
    setFilterAddParticipantPosition('');
    setFilterAddParticipantIndustry('');
    setFilterAddParticipantCity('');
    setFilterAddParticipantEventId('');
    setResponse(emptyResponse);
  }, [isOpen, selectedEvent.id]);

  if (!isOpen) return null;

  const visibleItems = response.items;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedDatabaseIds.length === 0) return;
    void onAddParticipant(selectedDatabaseIds, notes);
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

        <h3 className="text-xl font-bold text-slate-900 mb-4 shrink-0">Add Database as Participant</h3>

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
                        {response.filterOptions.companies.map((compName) => (
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
                        {response.filterOptions.positions.map((level) => (
                          <option key={level} value={level}>{level}</option>
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
                        {response.filterOptions.industries.map((industryName) => (
                          <option key={industryName} value={industryName}>{industryName}</option>
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
                        {response.filterOptions.cities.map((cityName) => (
                          <option key={cityName} value={cityName}>{cityName}</option>
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
                        {response.filterOptions.invitedEvents.map((evt) => (
                          <option key={evt.id} value={String(evt.id)}>{evt.name}</option>
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
                      className="text-[10px] font-bold text-red-600 hover:text-red-750 transition-colors uppercase pt-1"
                    >
                      Clear Modal Filters
                    </button>
                  )}
                </div>
              </div>

              <div className="border border-slate-200 rounded-xl p-3 bg-slate-50/50 space-y-2 max-h-[180px] overflow-y-auto">
                {loadingDatabases ? (
                  <div className="py-6 flex items-center justify-center">
                    <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
                  </div>
                ) : visibleItems.length === 0 ? (
                  <p className="text-center text-xs text-slate-400 py-4">No available databases found.</p>
                ) : (
                  visibleItems.map((item) => {
                    const database = item.database;
                    const isChecked = selectedDatabaseIds.includes(database.id);

                    return (
                      <label
                        key={database.id}
                        className="flex items-center gap-3 p-2 bg-white border border-slate-100 rounded-lg cursor-pointer hover:bg-slate-50 transition-colors"
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => {
                            if (isChecked) {
                              setSelectedDatabaseIds(selectedDatabaseIds.filter((id) => id !== database.id));
                            } else {
                              setSelectedDatabaseIds([...selectedDatabaseIds, database.id]);
                            }
                          }}
                          className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500"
                        />
                        <div className="text-xs flex-1">
                          <p className="font-bold text-slate-900">{database.firstName} {database.lastName}</p>
                          {database.company?.name && (
                            <p className="text-[10px] text-slate-500 font-medium">{database.company.name}</p>
                          )}

                          {item.invitedEvents.length > 0 && (
                            <div className="mt-1.5 flex flex-wrap gap-1 items-center">
                              <span className="text-[9px] font-bold text-slate-400">Invited to:</span>
                              {item.invitedEvents.map((invitedEvent) => (
                                <span
                                  key={`${database.id}-${invitedEvent.id}`}
                                  className="inline-flex px-1.5 py-0.5 rounded text-[8px] font-bold bg-slate-50 border border-slate-200 text-slate-600 uppercase tracking-wide"
                                >
                                  {invitedEvent.name}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      </label>
                    );
                  })
                )}
              </div>

              {visibleItems.length > 0 && (
                <div className="flex items-center justify-between text-[11px] mt-2 px-1 text-blue-600 font-bold">
                  <button
                    type="button"
                    onClick={() => {
                      const allVisibleIds = visibleItems.map((item) => item.database.id);
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
                      const allVisibleIds = visibleItems.map((item) => item.database.id);
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
              {participants.length > 0 && (
                <p className="text-[10px] text-slate-400 px-1">
                  Current event already has {participants.length} participant(s).
                </p>
              )}
            </div>
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

          <div className="flex justify-end gap-2 pt-4 border-t border-slate-100 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-sm font-bold rounded-xl transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submittingParticipant || selectedDatabaseIds.length === 0}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:bg-blue-300 text-white text-sm font-bold rounded-xl transition-all"
            >
              {submittingParticipant ? 'Adding...' : `Add ${selectedDatabaseIds.length || ''}`.trim()}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
