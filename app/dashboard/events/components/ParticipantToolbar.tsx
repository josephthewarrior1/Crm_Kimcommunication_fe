import React from 'react';
import { Search, RefreshCw } from 'lucide-react';
import { EventParticipant, AppUser } from '../../../../lib/types';

interface ParticipantToolbarProps {
  participants: EventParticipant[];
  usersList: AppUser[];
  searchQuery: string;
  setSearchQuery: (val: string) => void;
  filterCompany: string;
  setFilterCompany: (val: string) => void;
  filterPosition: string;
  setFilterPosition: (val: string) => void;
  filterIndustry: string;
  setFilterIndustry: (val: string) => void;
  filterCity: string;
  setFilterCity: (val: string) => void;
  filterPic: string;
  setFilterPic: (val: string) => void;
  activeTab: string;
  isAdmin: boolean;
  handleResetFilters: () => void;
}

export const ParticipantToolbar: React.FC<ParticipantToolbarProps> = ({
  participants,
  usersList,
  searchQuery,
  setSearchQuery,
  filterCompany,
  setFilterCompany,
  filterPosition,
  setFilterPosition,
  filterIndustry,
  setFilterIndustry,
  filterCity,
  setFilterCity,
  filterPic,
  setFilterPic,
  activeTab,
  isAdmin,
  handleResetFilters,
}) => {
  const hasActiveFilters =
    searchQuery ||
    filterCompany ||
    filterPosition ||
    filterIndustry ||
    filterCity ||
    filterPic;

  return (
    <div className="bg-slate-50/55 border border-slate-200 rounded-2xl p-4 space-y-4 mb-6 shrink-0 shadow-sm">
      <div className="flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center bg-white border border-slate-200 rounded-xl px-3 py-1.5 w-full sm:max-w-xs shadow-sm">
          <Search className="w-4 h-4 text-slate-400 mr-2" />
          <input
            type="text"
            placeholder="Search participants by name, title, company..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-transparent text-xs text-slate-900 placeholder-slate-400 focus:outline-none"
          />
        </div>
        {hasActiveFilters && (
          <button
            onClick={handleResetFilters}
            className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl border border-slate-200 transition-all self-start md:self-auto shadow-sm"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Reset Filters
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3 pt-2 border-t border-slate-100">
        <div>
          <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Filter by Company</label>
          <select
            value={filterCompany}
            onChange={(e) => setFilterCompany(e.target.value)}
            className="w-full px-2.5 py-1.5 bg-white border border-slate-200 focus:border-blue-500 rounded-lg text-slate-900 text-[11px] focus:outline-none transition-all cursor-pointer"
          >
            <option value="">All Companies</option>
            {Array.from(new Set(participants.map(p => p.database.company?.name).filter(Boolean))).sort().map((compName) => (
              <option key={compName} value={compName}>{compName}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Position Level</label>
          <select
            value={filterPosition}
            onChange={(e) => setFilterPosition(e.target.value)}
            className="w-full px-2.5 py-1.5 bg-white border border-slate-200 focus:border-blue-500 rounded-lg text-slate-900 text-[11px] focus:outline-none transition-all cursor-pointer"
          >
            <option value="">All Levels</option>
            {Array.from(new Set(participants.map(p => p.database.positionLevel).filter(Boolean))).sort().map((lvl) => (
              <option key={lvl} value={lvl}>{lvl}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Industry</label>
          <select
            value={filterIndustry}
            onChange={(e) => setFilterIndustry(e.target.value)}
            className="w-full px-2.5 py-1.5 bg-white border border-slate-200 focus:border-blue-500 rounded-lg text-slate-900 text-[11px] focus:outline-none transition-all cursor-pointer"
          >
            <option value="">All Industries</option>
            {Array.from(new Set(participants.map(p => p.database.company?.industry).filter(Boolean))).sort().map((ind) => (
              <option key={ind} value={ind}>{ind}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">City</label>
          <select
            value={filterCity}
            onChange={(e) => setFilterCity(e.target.value)}
            className="w-full px-2.5 py-1.5 bg-white border border-slate-200 focus:border-blue-500 rounded-lg text-slate-900 text-[11px] focus:outline-none transition-all cursor-pointer"
          >
            <option value="">All Cities</option>
            {Array.from(new Set(participants.map(p => p.database.company?.city).filter(Boolean))).sort().map((cty) => (
              <option key={cty} value={cty}>{cty}</option>
            ))}
          </select>
        </div>

        {isAdmin && activeTab !== 'request' && (
          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Filter by PIC</label>
            <select
              value={filterPic}
              onChange={(e) => setFilterPic(e.target.value)}
              className="w-full px-2.5 py-1.5 bg-white border border-slate-200 focus:border-blue-500 rounded-lg text-slate-900 text-[11px] focus:outline-none transition-all cursor-pointer"
            >
              <option value="">All PICs</option>
              {usersList.map((user) => {
                const name = user.fullName || user.username;
                return <option key={user.id} value={name}>{name}</option>;
              })}
            </select>
          </div>
        )}
      </div>
    </div>
  );
};
