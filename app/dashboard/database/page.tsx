'use client';

import React, { useState, useEffect } from 'react';
import { crmService } from '../../../lib/services/crmService';
import { Database, Company, DatabaseEmail, Group, EventParticipant, FlaggedIdentity } from '../../../lib/types';
import { Users, Search, Plus, ExternalLink, Eye, Building2, Download, Calendar, MoreVertical, ShieldAlert, AlertCircle, Edit2, Trash2, Upload, CheckCircle, Loader2, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '../../../lib/context/AuthContext';
import { useSearchParams } from 'next/navigation';
import { matchesIndustryFilter } from './utils/industryHelper';
import { normalizePhone } from './utils/phoneHelper';
import { checkDatabaseCompleteness } from './utils/validationHelper';
import { INDUSTRIES } from '../../../lib/constants';

import { DatabaseDetailModal } from './components/DatabaseDetailModal';
import { CreateDatabaseModal } from './components/CreateDatabaseModal';
import { EditDatabaseModal } from './components/EditDatabaseModal';
import { EmailModal } from './components/EmailModal';
import { TakeoutModal } from './components/TakeoutModal';
import { ExcelImportModal } from './components/ExcelImportModal';
import { DeleteConfirmModal } from './components/DeleteConfirmModal';
import { ExportConfigModal } from './components/ExportConfigModal';

const EXPORT_COLUMNS = [
  { key: 'groupName', label: 'Nama Group' },
  { key: 'brandName', label: 'Nama Brand' },
  { key: 'companyName', label: 'Company Name' },
  { key: 'salutation', label: 'Salutation' },
  { key: 'firstName', label: 'First Name' },
  { key: 'lastName', label: 'Last Name' },
  { key: 'position', label: 'Position' },
  { key: 'specialityDivision', label: 'Speciality/Division' },
  { key: 'jobTitle', label: 'Job Title' },
  { key: 'address', label: 'Address' },
  { key: 'officePhone', label: 'Office Phone' },
  { key: 'mobilePhone', label: 'Mobile Phone' },
  { key: 'companyEmail', label: 'Company Email Address' },
  { key: 'personalEmail', label: 'Personal Email Address' },
  { key: 'industry', label: 'Industry' },
  { key: 'revenueSize', label: 'Company Size (Revenue)' },
  { key: 'employeeSize', label: 'Company Size (Employee)' },
  { key: 'hardware', label: 'Company Hardware' },
  { key: 'linkedin', label: 'Linkedin Link' },
  { key: 'city', label: 'City' },
  { key: 'postalCode', label: 'Postal Code' },
  { key: 'website', label: 'Company Website' },
  { key: 'eventHistory', label: 'Event Participation' }
];

export default function DatabasesPage() {
  const { isAdmin, isManager, isUser } = useAuth();
  const searchParams = useSearchParams();
  const [databases, setDatabases] = useState<Database[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Advanced Filter states
  const [filterCompanyId, setFilterCompanyId] = useState('');
  const [filterGroupId, setFilterGroupId] = useState('');
  const [filterPositionLevel, setFilterPositionLevel] = useState('');
  const [filterJobTitle, setFilterJobTitle] = useState('');
  const [filterIndustry, setFilterIndustry] = useState('');

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const [flags, setFlags] = useState<FlaggedIdentity[]>([]);

  // Selection and Custom Export states
  const [selectedDatabaseIds, setSelectedDatabaseIds] = useState<number[]>([]);
  const [tempSelectedDbIds, setTempSelectedDbIds] = useState<number[]>([]);
  const [isExportConfigModalOpen, setIsExportConfigModalOpen] = useState(false);
  const [selectedColumns, setSelectedColumns] = useState<string[]>(EXPORT_COLUMNS.map(col => col.key));

  const handleToggleSelect = (id: number) => {
    setSelectedDatabaseIds(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };


  // Modals state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);
  const [isTakeoutModalOpen, setIsTakeoutModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);

  // Focus database edit state
  const [editingDatabase, setEditingDatabase] = useState<Database | null>(null);

  // Focus database state
  const [selectedDatabase, setSelectedDatabase] = useState<Database | null>(null);
  const [databaseEmails, setDatabaseEmails] = useState<DatabaseEmail[]>([]);
  const [loadingDatabaseEmails, setLoadingEmails] = useState(false);
  const [activeDropdownId, setActiveDropdownId] = useState<number | null>(null);

  // Focus detail state
  const [detailDatabase, setDetailDatabase] = useState<Database | null>(null);
  const [detailDatabaseEmails, setDetailEmails] = useState<DatabaseEmail[]>([]);
  const [loadingDetailDatabaseEmails, setLoadingDetailEmails] = useState(false);
  const [detailEvents, setDetailEvents] = useState<EventParticipant[]>([]);
  const [loadingDetailEvents, setLoadingDetailEvents] = useState(false);

  // Delete database target state
  const [deletingDatabase, setDeletingDatabase] = useState<Database | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    const searchVal = searchParams.get('search');
    if (searchVal) {
      setSearchQuery(searchVal);
    }
  }, [searchParams]);

  async function loadData() {
    setLoading(true);
    try {
      const [conList, compList, groupList, flagList] = await Promise.all([
        crmService.getDatabases(),
        crmService.getCompanies(),
        crmService.getGroups(),
        crmService.getFlaggedIdentities()
      ]);
      setDatabases(conList);
      setCompanies(compList);
      setGroups(groupList);
      setFlags(flagList || []);
    } catch (err) {
      toast.error('Failed to load databases, companies, groups or flags');
    } finally {
      setLoading(false);
    }
  }

  const openEditModal = (database: Database) => {
    setEditingDatabase(database);
    setIsEditModalOpen(true);
  };

  const openDeleteConfirm = (database: Database) => {
    setDeletingDatabase(database);
    setIsDeleteConfirmOpen(true);
  };

  const handleOpenDetailModal = async (database: Database) => {
    setDetailDatabase(database);
    setIsDetailModalOpen(true);
    setLoadingDetailEmails(true);
    setLoadingDetailEvents(true);
    try {
      const emails = await crmService.getDatabaseEmails(database.id);
      setDetailEmails(emails);
    } catch (err) {
      toast.error('Failed to load database emails');
    } finally {
      setLoadingDetailEmails(false);
    }

    try {
      const events = await crmService.getDatabaseEventParticipants(database.id);
      setDetailEvents(events);
    } catch (err) {
      toast.error('Failed to load database event participation history');
    } finally {
      setLoadingDetailEvents(false);
    }
  };

  const handleOpenEmailModal = async (database: Database) => {
    setSelectedDatabase(database);
    setIsEmailModalOpen(true);
    setLoadingEmails(true);
    try {
      const emails = await crmService.getDatabaseEmails(database.id);
      setDatabaseEmails(emails);
    } catch (err) {
      toast.error('Failed to load emails for this database');
    } finally {
      setLoadingEmails(false);
    }
  };

  const handleOpenTakeoutModal = (database: Database) => {
    setSelectedDatabase(database);
    setIsTakeoutModalOpen(true);
  };

  const isFilterActive = searchQuery || filterGroupId || filterCompanyId || filterPositionLevel || filterJobTitle || filterIndustry;

  const handleResetFilters = () => {
    setSearchQuery('');
    setFilterGroupId('');
    setFilterCompanyId('');
    setFilterPositionLevel('');
    setFilterJobTitle('');
    setFilterIndustry('');
  };


  // Search and Advanced Filters
  const filteredDatabases = databases.filter((c) => {
    // Hide opted-out / inactive databases from the active lists
    if (c.isActive === false) return false;

    // Hide confirmed Tikus/Spam from the main databases directory entirely
    const isConfirmedTikus = flags.some(f => f.database?.id === c.id && f.status === 'confirmed');
    if (isConfirmedTikus) return false;

    // 1. General search query
    const query = searchQuery.toLowerCase();
    const fullName = `${c.firstName} ${c.lastName}`.toLowerCase();
    const matchesSearch =
      !query ||
      fullName.includes(query) ||
      (c.company?.name && c.company.name.toLowerCase().includes(query)) ||
      (c.jobTitle && c.jobTitle.toLowerCase().includes(query)) ||
      (c.mobilePhone && c.mobilePhone.includes(query)) ||
      (c.source && c.source.toLowerCase().includes(query));

    // 2. Company filter
    const matchesCompany = !filterCompanyId || (c.company?.id?.toString() === filterCompanyId);

    // 3. Group filter
    const matchesGroup = !filterGroupId || (c.company?.group?.id?.toString() === filterGroupId);

    // 4. Position Level filter
    const matchesPositionLevel = !filterPositionLevel || (c.positionLevel === filterPositionLevel);

    // 5. Job Title filter
    const matchesJobTitle = !filterJobTitle || (c.jobTitle && c.jobTitle.toLowerCase().includes(filterJobTitle.toLowerCase()));

    // 6. Industry filter
    const matchesIndustry = !filterIndustry || matchesIndustryFilter(c.company?.industry, filterIndustry);

    return matchesSearch && matchesCompany && matchesGroup && matchesPositionLevel && matchesJobTitle && matchesIndustry;
  });

  const isAllSelected = filteredDatabases.length > 0 && filteredDatabases.every(d => selectedDatabaseIds.includes(d.id));

  const handleToggleSelectAll = () => {
    if (isAllSelected) {
      const filteredIds = filteredDatabases.map(d => d.id);
      setSelectedDatabaseIds(prev => prev.filter(id => !filteredIds.includes(id)));
    } else {
      const filteredIds = filteredDatabases.map(d => d.id);
      setSelectedDatabaseIds(prev => {
        const newSelection = [...prev];
        filteredIds.forEach(id => {
          if (!newSelection.includes(id)) {
            newSelection.push(id);
          }
        });
        return newSelection;
      });
    }
  };

  // Reset current page when query or any filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, filterCompanyId, filterGroupId, filterPositionLevel, filterJobTitle, filterIndustry]);

  const totalItems = filteredDatabases.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentDatabases = filteredDatabases.slice(indexOfFirstItem, indexOfLastItem);

  const handleOpenExportConfig = () => {
    if (filteredDatabases.length === 0) {
      toast.error("Tidak ada data database untuk di-export.");
      return;
    }
    setIsExportConfigModalOpen(true);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200 text-slate-900">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-extrabold text-slate-900">Databases</h2>
          <p className="text-sm text-slate-500 mt-1">Manage database persons, corporate roles, and corporate vs personal emails.</p>
        </div>
        <div className="flex flex-wrap items-center gap-3 self-start sm:self-auto">
          {filteredDatabases.length > 0 && (
            <button
              onClick={handleOpenExportConfig}
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-white border border-slate-200 hover:bg-slate-50 active:bg-slate-100 text-slate-700 text-sm font-bold rounded-xl shadow-sm transition-all"
            >
              <Download className="w-4 h-4 text-slate-500" />
              Export Excel
            </button>
          )}
          {!isUser && (
            <>
              <button
                onClick={() => setIsImportModalOpen(true)}
                className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-white border border-slate-200 hover:bg-slate-50 active:bg-slate-100 text-slate-700 text-sm font-bold rounded-xl shadow-sm transition-all"
              >
                <Upload className="w-4 h-4 text-slate-500" />
                Import Excel
              </button>
              <button
                onClick={() => setIsCreateModalOpen(true)}
                className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white text-sm font-bold rounded-xl shadow-md shadow-blue-600/10 transition-all"
              >
                <Plus className="w-4 h-4" />
                Add Database
              </button>
            </>
          )}
        </div>
      </div>

      {/* Advanced Filters Area */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2">
            <Search className="w-5 h-5 text-slate-400 mr-2" />
            <input
              type="text"
              placeholder="Search by name, company, phone, source..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1 bg-transparent text-sm text-slate-900 placeholder-slate-400 focus:outline-none"
            />
          </div>
          {isFilterActive && (
            <button
              onClick={handleResetFilters}
              className="inline-flex items-center justify-center gap-1.5 px-4 py-2 bg-slate-100 hover:bg-slate-205 active:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl border border-slate-200 transition-all self-start md:self-auto"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Reset Filters
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3 pt-2 border-t border-slate-100">
          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Group</label>
            <select
              value={filterGroupId}
              onChange={(e) => setFilterGroupId(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 focus:border-blue-500 rounded-xl text-slate-900 text-xs focus:outline-none transition-all focus:bg-white"
            >
              <option value="">All Groups</option>
              {groups.map((g) => (
                <option key={g.id} value={g.id}>{g.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Company</label>
            <select
              value={filterCompanyId}
              onChange={(e) => setFilterCompanyId(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 focus:border-blue-500 rounded-xl text-slate-900 text-xs focus:outline-none transition-all focus:bg-white"
            >
              <option value="">All Companies</option>
              {companies.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Industry</label>
            <select
              value={filterIndustry}
              onChange={(e) => setFilterIndustry(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 focus:border-blue-500 rounded-xl text-slate-900 text-xs focus:outline-none transition-all focus:bg-white"
            >
              <option value="">All Industries</option>
              {INDUSTRIES.map((ind) => (
                <option key={ind} value={ind}>{ind}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Position Level</label>
            <select
              value={filterPositionLevel}
              onChange={(e) => setFilterPositionLevel(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 focus:border-blue-500 rounded-xl text-slate-900 text-xs focus:outline-none transition-all focus:bg-white"
            >
              <option value="">All Levels</option>
              <option value="unknown">unknown</option>
              <option value="C-level//GM/Director">C-level//GM/Director</option>
              <option value="Manajerial/Head">Manajerial/Head</option>
              <option value="Staff">Staff</option>
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Job Title</label>
            <input
              type="text"
              placeholder="e.g. IT Manager"
              value={filterJobTitle}
              onChange={(e) => setFilterJobTitle(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 focus:border-blue-500 rounded-xl text-slate-900 text-xs focus:outline-none transition-all placeholder-slate-450 focus:bg-white"
            />
          </div>
        </div>
      </div>


      {/* Databases List Table */}
      {loading ? (
        <div className="h-[40vh] flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        </div>
      ) : filteredDatabases.length === 0 ? (
        <div className="p-12 text-center border border-slate-200 rounded-2xl bg-white shadow-sm">
          <Users className="w-10 h-10 text-slate-400 mx-auto mb-3" />
          <h3 className="font-bold text-slate-700">No databases found</h3>
          <p className="text-xs text-slate-500 mt-1">
            {searchQuery ? 'Try adjusting your search criteria.' : 'Create a new database to populate the database.'}
          </p>
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto min-h-[350px]">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/50 whitespace-nowrap">
                  <th className="py-4 px-3 text-xs font-bold text-slate-500 uppercase tracking-wider w-10 text-center"></th>
                  <th className="py-4 px-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Nama Group/Holding Company</th>
                  <th className="py-4 px-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Nama Brand</th>
                  <th className="py-4 px-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Company Name</th>
                  <th className="py-4 px-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Salutation</th>
                  <th className="py-4 px-4 text-xs font-bold text-slate-500 uppercase tracking-wider">First Name</th>
                  <th className="py-4 px-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Last Name</th>
                  <th className="py-4 px-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Position</th>
                  <th className="py-4 px-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Speciality/Division</th>
                  <th className="py-4 px-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Jobtitle</th>
                  <th className="py-4 px-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Address</th>
                  <th className="py-4 px-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Office Phone</th>
                  <th className="py-4 px-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Mobile Phone</th>
                  <th className="py-4 px-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Company Email Address</th>
                  <th className="py-4 px-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Personal Email Address</th>
                  <th className="py-4 px-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Industry</th>
                  <th className="py-4 px-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Company Size (Revenue)</th>
                  <th className="py-4 px-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Company Size (Employee)</th>
                  <th className="py-4 px-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Company Hardware</th>
                  <th className="py-4 px-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Linkedin Link</th>
                  <th className="py-4 px-4 text-xs font-bold text-slate-500 uppercase tracking-wider">City</th>
                  <th className="py-4 px-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Postal Code</th>
                  <th className="py-4 px-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Company Website</th>
                  <th className="py-4 px-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right sticky right-0 bg-slate-50 z-10 shadow-[-4px_0_8px_-4px_rgba(0,0,0,0.1)]">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {currentDatabases.map((c, idx, slicedArray) => {
                  const isNearBottom = idx >= slicedArray.length - 2 && idx >= 2;
                  
                  // 1. Get flags from database
                  const dbFlags = flags.filter(f => f.database?.id === c.id && f.status !== 'cleared');
                  
                  // 2. Compute dynamic client-side duplicate indications
                  const localFlags: any[] = [];
                  
                  if (c.mobilePhone) {
                    const normCurrent = normalizePhone(c.mobilePhone);
                    const matchingDatabases = databases.filter(other => 
                      other.id !== c.id && 
                      other.isActive && 
                      other.mobilePhone && 
                      normalizePhone(other.mobilePhone) === normCurrent &&
                      (other.firstName !== c.firstName || other.lastName !== c.lastName)
                    );
                    if (matchingDatabases.length > 0) {
                      localFlags.push({
                        flagReason: 'duplicate_phone',
                        evidenceNotes: `Nomor telepon sama dengan ${matchingDatabases.map(m => `${m.firstName} ${m.lastName}`).join(', ')}`
                      });
                    }
                  }
                  
                  if (c.emails && c.emails.length > 0) {
                    c.emails.forEach(ce => {
                      if (!ce.email) return;
                      const matchingDatabases = databases.filter(other => 
                        other.id !== c.id && 
                        other.isActive && 
                        other.emails && 
                        other.emails.some(oe => oe.email && oe.email.toLowerCase() === ce.email.toLowerCase()) &&
                        (other.firstName !== c.firstName || other.lastName !== c.lastName)
                      );
                      if (matchingDatabases.length > 0) {
                        localFlags.push({
                          flagReason: 'duplicate_email',
                          evidenceNotes: `Email ${ce.email} sama dengan ${matchingDatabases.map(m => `${m.firstName} ${m.lastName}`).join(', ')}`
                        });
                      }
                    });
                  }
                  
                  const allFlags = [...dbFlags, ...localFlags];
                  const isFlaggedTikus = allFlags.length > 0;
                  const hasConfirmedFlag = dbFlags.some(f => f.status === 'confirmed');

                  return (
                    <tr key={c.id} className={`group hover:bg-slate-50/30 transition-all ${!c.isActive ? 'opacity-60 bg-slate-50/20' : ''}`}>
                      <td className="py-4 px-3 text-center">
                        {checkDatabaseCompleteness(c).isIncomplete && (
                          <span
                            className="inline-flex cursor-help text-amber-500 hover:text-amber-600 transition-colors"
                            title={`Semua kolom wajib diisi kecuali Division/Speciality, Database Type, dan Data Source.\n\nKolom kosong:\n• ${checkDatabaseCompleteness(c).missingFields.join("\n• ")}`}
                          >
                            <AlertCircle className="w-4 h-4 shrink-0" />
                          </span>
                        )}
                      </td>
                      <td className="py-4 px-4 text-sm font-medium text-slate-600">
                        {c.company?.group?.name || <span className="text-slate-400">-</span>}
                      </td>
                      <td className="py-4 px-4 text-sm font-medium text-slate-650">
                        {c.company?.brandName || <span className="text-slate-400">-</span>}
                      </td>
                      <td className="py-4 px-4 text-sm font-semibold text-slate-700">
                        {c.company?.name || <span className="text-slate-400">-</span>}
                      </td>
                      <td className="py-4 px-4 text-sm text-slate-500">
                        {c.salutation || '-'}
                      </td>
                      <td className="py-4 px-4">
                        <p className="text-sm font-bold text-slate-900 flex items-center gap-1.5 flex-wrap">
                          {isFlaggedTikus && !hasConfirmedFlag && (
                            <span
                              className="inline-flex items-center gap-1 cursor-help px-1.5 py-0.5 text-[9px] font-bold bg-amber-50 border border-amber-100 text-amber-600 rounded-md shrink-0 transition-colors"
                              title={`Mencurigakan / Dicurigai Tikus:\n${allFlags.map(f => `• ${f.flagReason === 'duplicate_phone' ? 'Nomor telepon duplikat dengan nama lain' : f.flagReason === 'duplicate_email' ? 'Email duplikat dengan nama lain' : f.flagReason || 'Aktivitas mencurigakan'}: ${f.evidenceNotes || ''}`).join('\n')}`}
                            >
                              <ShieldAlert className="w-2.5 h-2.5 text-amber-500" />
                              Suspected
                            </span>
                          )}
                          <span className="truncate max-w-[150px] inline-block align-middle font-bold text-slate-900" title={c.firstName}>
                            {c.firstName}
                          </span>
                        </p>
                        {!c.isActive && (
                          <span className="inline-block mt-1 px-1.5 py-0.5 text-[10px] font-bold bg-red-50 border border-red-100 text-red-600 rounded-md">
                            INACTIVE
                          </span>
                        )}
                      </td>
                      <td className="py-4 px-4 text-sm font-bold text-slate-900">
                        {c.lastName || '-'}
                      </td>
                      <td className="py-4 px-4 text-sm text-slate-655 font-medium">
                        {c.positionLevel || '-'}
                      </td>
                      <td className="py-4 px-4 text-sm text-slate-600">
                        {c.specialityDivision || '-'}
                      </td>
                      <td className="py-4 px-4 text-sm text-slate-950 font-medium">
                        {c.jobTitle || '-'}
                      </td>
                      <td className="py-4 px-4 text-xs text-slate-600 max-w-[200px] truncate" title={c.company?.address}>
                        {c.company?.address || '-'}
                      </td>
                      <td className="py-4 px-4 text-sm font-mono text-slate-600">
                        {c.company?.officePhone || '-'}
                      </td>
                      <td className="py-4 px-4 text-sm font-mono text-slate-700">
                        {c.mobilePhone || '-'}
                      </td>
                      <td className="py-4 px-4 text-xs font-mono text-slate-600">
                        {c.emails?.find(e => e.emailType === 'company' || e.isCorporate)?.email || '-'}
                      </td>
                      <td className="py-4 px-4 text-xs font-mono text-slate-600">
                        {c.emails?.find(e => e.emailType === 'personal' && !e.isCorporate)?.email || '-'}
                      </td>
                      <td className="py-4 px-4 text-sm text-slate-600">
                        {c.company?.industry || '-'}
                      </td>
                      <td className="py-4 px-4 text-sm text-slate-600">
                        {c.company?.companySizeRevenue || '-'}
                      </td>
                      <td className="py-4 px-4 text-sm text-slate-600">
                        {c.company?.companySizeEmployee || '-'}
                      </td>
                      <td className="py-4 px-4 text-xs text-slate-600 max-w-[150px] truncate" title={c.company?.companyHardware}>
                        {c.company?.companyHardware || '-'}
                      </td>
                      <td className="py-4 px-4 text-xs">
                        {c.linkedinUrl ? (
                          <a
                            href={c.linkedinUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="text-blue-600 hover:text-blue-500 font-semibold inline-flex items-center gap-1"
                          >
                            LinkedIn <ExternalLink className="w-3 h-3" />
                          </a>
                        ) : '-'}
                      </td>
                      <td className="py-4 px-4 text-sm text-slate-600">
                        {c.company?.city || '-'}
                      </td>
                      <td className="py-4 px-4 text-sm font-mono text-slate-600">
                        {c.company?.postalCode || '-'}
                      </td>
                      <td className="py-4 px-4 text-xs">
                        {c.company?.website ? (
                          <a
                            href={c.company.website.startsWith('http') ? c.company.website : `https://${c.company.website}`}
                            target="_blank"
                            rel="noreferrer"
                            className="text-blue-600 hover:text-blue-500 font-semibold inline-flex items-center gap-1"
                          >
                            Website <ExternalLink className="w-3 h-3" />
                          </a>
                        ) : '-'}
                      </td>
                      <td className="py-4 px-4 text-sm text-right sticky right-0 bg-white group-hover:bg-slate-50/90 z-10 shadow-[-4px_0_8px_-4px_rgba(0,0,0,0.1)] transition-colors">
                      <div className="inline-block text-left">
                        <button
                          onClick={() => setActiveDropdownId(activeDropdownId === c.id ? null : c.id)}
                          className="inline-flex p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors border border-slate-200 bg-white shadow-sm"
                          title="Actions"
                        >
                          <MoreVertical className="w-4 h-4" />
                        </button>

                        {activeDropdownId === c.id && (
                          <>
                            {/* Overlay to close when clicking outside */}
                            <div
                              className="fixed inset-0 z-10"
                              onClick={() => setActiveDropdownId(null)}
                            />
                            <div className={`absolute right-6 ${isNearBottom ? 'bottom-full mb-1 origin-bottom animate-in fade-in slide-in-from-bottom-2' : 'mt-1 origin-top animate-in fade-in slide-in-from-top-2'} w-48 bg-white border border-slate-200 rounded-xl shadow-lg z-20 py-1.5 duration-100 text-left`}>
                              <button
                                onClick={() => {
                                  setActiveDropdownId(null);
                                  handleOpenDetailModal(c);
                                }}
                                className="w-full px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition-colors flex items-center gap-2"
                              >
                                <Eye className="w-3.5 h-3.5 text-slate-400" />
                                View Details
                              </button>

                              {!isUser && (
                                <button
                                  onClick={() => {
                                    setActiveDropdownId(null);
                                    openEditModal(c);
                                  }}
                                  className="w-full px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition-colors flex items-center gap-2"
                                >
                                  <Edit2 className="w-3.5 h-3.5 text-slate-400" />
                                  Edit Database
                                </button>
                              )}

                              {c.isActive && !isUser && (
                                <button
                                  onClick={() => {
                                    setActiveDropdownId(null);
                                    handleOpenTakeoutModal(c);
                                  }}
                                  className="w-full px-4 py-2 text-xs font-semibold text-amber-700 hover:bg-amber-50 hover:text-amber-900 transition-colors flex items-center gap-2"
                                >
                                  <ShieldAlert className="w-3.5 h-3.5 text-amber-500" />
                                  Request Takeout
                                </button>
                              )}

                              {isAdmin && (
                                <>
                                  <div className="border-t border-slate-100 my-1" />
                                  <button
                                    onClick={() => {
                                      setActiveDropdownId(null);
                                      openDeleteConfirm(c);
                                    }}
                                    className="w-full px-4 py-2 text-xs font-semibold text-red-650 hover:bg-red-50 hover:text-red-900 transition-colors flex items-center gap-2"
                                  >
                                    <Trash2 className="w-3.5 h-3.5 text-red-500" />
                                    Delete
                                  </button>
                                </>
                              )}
                            </div>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                  );
                })}
              </tbody>
            </table>

          </div>
          
          {/* Integrated Pagination Footer */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-slate-100 bg-slate-50/30 px-6 py-4">
              {/* Left Side: Info */}
              <div className="hidden sm:block">
                <p className="text-xs font-semibold text-slate-500">
                  Showing <span className="font-extrabold text-slate-800">{indexOfFirstItem + 1}</span> to{' '}
                  <span className="font-extrabold text-slate-800">
                    {Math.min(indexOfLastItem, totalItems)}
                  </span>{' '}
                  of <span className="font-extrabold text-slate-800">{totalItems}</span> databases
                </p>
              </div>

              {/* Right Side: Flat Controls */}
              <div className="flex flex-1 sm:flex-initial items-center justify-between sm:justify-end gap-2">
                {/* Previous Button */}
                <button
                  onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                  className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-500 hover:text-slate-800 disabled:opacity-40 disabled:hover:bg-white disabled:hover:text-slate-500 transition-all shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 disabled:cursor-not-allowed"
                  title="Previous Page"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                  </svg>
                </button>

                {/* Page numbers */}
                <div className="flex items-center gap-1">
                  {Array.from({ length: totalPages }).map((_, i) => {
                    const pageNumber = i + 1;
                    if (totalPages > 6 && Math.abs(currentPage - pageNumber) > 2 && pageNumber !== 1 && pageNumber !== totalPages) {
                      if (pageNumber === 2 || pageNumber === totalPages - 1) {
                        return <span key={pageNumber} className="text-xs font-bold text-slate-400 px-1">...</span>;
                      }
                      return null;
                    }

                    return (
                      <button
                        key={pageNumber}
                        onClick={() => setCurrentPage(pageNumber)}
                        className={`min-w-[28px] h-7 flex items-center justify-center rounded-lg text-xs font-bold transition-all ${
                          currentPage === pageNumber
                            ? 'bg-blue-600 text-white shadow-sm shadow-blue-600/20'
                            : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 bg-transparent'
                        }`}
                      >
                        {pageNumber}
                      </button>
                    );
                  })}
                </div>

                {/* Next Button */}
                <button
                  onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                  disabled={currentPage === totalPages}
                  className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-500 hover:text-slate-800 disabled:opacity-40 disabled:hover:bg-white disabled:hover:text-slate-500 transition-all shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 disabled:cursor-not-allowed"
                  title="Next Page"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </div>
            </div>
          )}
        </div>
      )}
      {/* View Database Detail Modal */}
      <DatabaseDetailModal
        isOpen={isDetailModalOpen}
        onClose={() => {
          setIsDetailModalOpen(false);
          setDetailDatabase(null);
          setDetailEmails([]);
          setDetailEvents([]);
        }}
        database={detailDatabase!}
        emails={detailDatabaseEmails}
        loadingEmails={loadingDetailDatabaseEmails}
        events={detailEvents}
        loadingEvents={loadingDetailEvents}
        companies={companies}
      />

      {/* Add Database Modal */}
      <CreateDatabaseModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        companies={companies}
        onCreated={loadData}
      />

      {/* Edit Database Modal */}
      <EditDatabaseModal
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          setEditingDatabase(null);
        }}
        database={editingDatabase!}
        companies={companies}
        onUpdated={loadData}
      />

      {/* Manage Emails Modal */}
      {selectedDatabase && (
        <EmailModal
          isOpen={isEmailModalOpen}
          onClose={() => setIsEmailModalOpen(false)}
          database={selectedDatabase}
          emails={databaseEmails}
          loadingEmails={loadingDatabaseEmails}
          onEmailAdded={async () => {
            const emails = await crmService.getDatabaseEmails(selectedDatabase.id);
            setDatabaseEmails(emails);
          }}
        />
      )}

      {/* Takeout Modal Overlay */}
      {selectedDatabase && (
        <TakeoutModal
          isOpen={isTakeoutModalOpen}
          onClose={() => setIsTakeoutModalOpen(false)}
          database={selectedDatabase}
          onSubmitSuccess={loadData}
        />
      )}

      {/* Export Configuration Modal Overlay */}
      <ExportConfigModal
        isOpen={isExportConfigModalOpen}
        onClose={() => setIsExportConfigModalOpen(false)}
        databases={databases}
        filteredDatabases={filteredDatabases}
        selectedDatabaseIds={selectedDatabaseIds}
        selectedColumns={selectedColumns}
        setSelectedColumns={setSelectedColumns}
        onExportSuccess={(exportedIds) => {
          setSelectedDatabaseIds(exportedIds);
        }}
      />

      {/* Delete Confirmation Modal Overlay */}
      {deletingDatabase && (
        <DeleteConfirmModal
          isOpen={isDeleteConfirmOpen}
          onClose={() => {
            setIsDeleteConfirmOpen(false);
            setDeletingDatabase(null);
          }}
          database={deletingDatabase}
          onConfirmSuccess={loadData}
        />
      )}

      {/* Excel Import Modal Overlay */}
      <ExcelImportModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        onImportSuccess={loadData}
      />
    </div>
  );
}

