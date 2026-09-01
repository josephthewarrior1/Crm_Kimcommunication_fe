'use client';

import React, { useState, useEffect, useRef } from 'react';
import { crmService } from '../../../lib/services/crmService';
import { Database, Company, DatabaseEmail, EventParticipant, FlaggedIdentity } from '../../../lib/types';
import { Users, Search, Plus, ExternalLink, Building2, Download, Calendar, MoreVertical, ShieldAlert, AlertCircle, Edit2, Trash2, Upload, CheckCircle, Loader2, RefreshCw, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '../../../lib/context/AuthContext';
import { useSearchParams } from 'next/navigation';
import { normalizePhone } from './utils/phoneHelper';
import { checkDatabaseCompleteness } from './utils/validationHelper';
import { getOfficeEmail, getPersonalEmail } from '../events/utils/notesHelper';
import { INDUSTRIES } from '../../../lib/constants';
import indonesiaCities from './data/indonesia-cities.json';

import { DatabaseDetailModal } from './components/DatabaseDetailModal';
import { CreateDatabaseModal } from './components/CreateDatabaseModal';
import { EditDatabaseModal } from './components/EditDatabaseModal';
import { EmailModal } from './components/EmailModal';
import { TakeoutModal } from './components/TakeoutModal';
import { ExcelImportModal } from './components/ExcelImportModal';
import { DeleteConfirmModal } from './components/DeleteConfirmModal';
import { ExportConfigModal } from './components/ExportConfigModal';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../../components/ui/select';

const EXPORT_COLUMNS = [
  { key: 'groupName', label: 'Nama Group' },
  { key: 'brandName', label: 'Nama Brand' },
  { key: 'companyName', label: 'Company Name' },
  { key: 'salutation', label: 'Salutation' },
  { key: 'firstName', label: 'First Name' },
  { key: 'lastName', label: 'Last Name' },
  { key: 'position', label: 'Position' },
  { key: 'specialityDivision', label: 'Division' },
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

const normalizeCityName = (city: string | null | undefined): string => {
  return (city || '')
    .trim()
    .toUpperCase()
    .replace(/^(KABUPATEN|KOTA ADMINISTRASI|KOTA)\s+/i, '')
    .replace(/[^A-Z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
};

const toTitleCase = (value: string): string => {
  return value.toLowerCase().replace(/\b\w/g, (char) => char.toUpperCase());
};

const CITY_LABELS = new Map(
  (indonesiaCities as Array<{ name: string }>).map((city) => [
    normalizeCityName(city.name),
    toTitleCase(city.name)
  ])
);

export default function DatabasesPage() {
  const { isAdmin, isManager, isUser } = useAuth();
  const searchParams = useSearchParams();
  const [databases, setDatabases] = useState<Database[]>([]);
  const [databaseSummary, setDatabaseSummary] = useState({ all: 0, clean: 0, dirty: 0 });
  const [databaseFilterOptions, setDatabaseFilterOptions] = useState<{
    cities: Array<{ value: string; label: string }>;
    groups: Array<{ id: number; name: string }>;
    companies: Array<{ id: number; name: string }>;
    industries: string[];
    positionLevels: string[];
  }>({
    cities: [],
    groups: [],
    companies: [],
    industries: [],
    positionLevels: []
  });
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Advanced Filter states
  const [filterCompanyId, setFilterCompanyId] = useState('');
  const [filterGroupId, setFilterGroupId] = useState('');
  const [filterPositionLevel, setFilterPositionLevel] = useState('');
  const [filterIndustry, setFilterIndustry] = useState('');
  const [filterCity, setFilterCity] = useState('');

  // Sorting state
  const [sortBy, setSortBy] = useState<string>('id');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  const handleSort = (field: string) => {
    if (sortBy === field) {
      setSortOrder(prev => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortBy(field);
      setSortOrder('asc');
    }
  };

  // Table scroll sync state & refs
  const topScrollRef = useRef<HTMLDivElement>(null);
  const tableScrollRef = useRef<HTMLDivElement>(null);
  const tableRef = useRef<HTMLTableElement>(null);
  const [tableScrollWidth, setTableScrollWidth] = useState(0);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const [serverTotalItems, setServerTotalItems] = useState(0);
  const [serverTotalPages, setServerTotalPages] = useState(1);
  const [flags, setFlags] = useState<FlaggedIdentity[]>([]);
  const [exportDatabases, setExportDatabases] = useState<Database[]>([]);

  const initialTab = searchParams ? searchParams.get('tab') : null;
  const [activeTabFilter, setActiveTabFilter] = useState<'all' | 'clean' | 'dirty'>(
    initialTab === 'dirty' ? 'dirty' : initialTab === 'clean' ? 'clean' : 'all'
  );

  useEffect(() => {
    const tabParam = searchParams ? searchParams.get('tab') : null;
    if (tabParam === 'dirty') setActiveTabFilter('dirty');
    else if (tabParam === 'clean') setActiveTabFilter('clean');
  }, [searchParams]);

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
  const [dropdownPos, setDropdownPos] = useState<{ top: number; right: number } | null>(null);

  const handleToggleDropdown = (e: React.MouseEvent, id: number) => {
    e.stopPropagation();
    if (activeDropdownId === id) {
      setActiveDropdownId(null);
      setDropdownPos(null);
    } else {
      const rect = e.currentTarget.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      const dropdownHeight = 160;
      let top = rect.bottom + 4;
      if (spaceBelow < dropdownHeight && rect.top > dropdownHeight) {
        top = rect.top - dropdownHeight - 4;
      }
      const right = window.innerWidth - rect.right;
      setDropdownPos({ top, right });
      setActiveDropdownId(id);
    }
  };

  // Focus detail state
  const [detailDatabase, setDetailDatabase] = useState<Database | null>(null);
  const [detailDatabaseEmails, setDetailEmails] = useState<DatabaseEmail[]>([]);
  const [loadingDetailDatabaseEmails, setLoadingDetailEmails] = useState(false);
  const [detailEvents, setDetailEvents] = useState<EventParticipant[]>([]);
  const [loadingDetailEvents, setLoadingDetailEvents] = useState(false);

  // Delete database target state
  const [deletingDatabase, setDeletingDatabase] = useState<Database | null>(null);

  useEffect(() => {
    void loadAuxiliaryData();
  }, []);

  useEffect(() => {
    const searchVal = searchParams.get('search');
    if (searchVal) {
      setSearchQuery(searchVal);
    }
  }, [searchParams]);

  async function loadAuxiliaryData() {
    try {
      const flagList = await crmService.getFlaggedIdentities();
      setFlags(flagList || []);
    } catch (err) {
      toast.error('Failed to load flagged data');
    }
  }

  async function loadDatabasePage(pageOverride?: number) {
    setLoading(true);
    try {
      const response = await crmService.getDatabasesList({
        search: searchQuery || undefined,
        groupId: filterGroupId || undefined,
        companyId: filterCompanyId || undefined,
        positionLevel: filterPositionLevel || undefined,
        industry: filterIndustry || undefined,
        city: filterCity || undefined,
        tab: activeTabFilter,
        sortBy,
        sortOrder,
        page: pageOverride ?? currentPage,
        size: itemsPerPage
      });

      setDatabases(response.items || []);
      setServerTotalItems(response.total || 0);
      setServerTotalPages(response.totalPages || 1);
      setDatabaseSummary(response.summary || { all: 0, clean: 0, dirty: 0 });
    } catch (err) {
      toast.error('Failed to load databases list');
    } finally {
      setLoading(false);
    }
  }

  async function loadDatabaseFilterOptions() {
    try {
      const response = await crmService.getDatabaseFilterOptions({
        search: searchQuery || undefined,
        groupId: filterGroupId || undefined,
        companyId: filterCompanyId || undefined,
        positionLevel: filterPositionLevel || undefined,
        industry: filterIndustry || undefined,
        city: filterCity || undefined,
        tab: activeTabFilter
      });
      setDatabaseFilterOptions({
        cities: response.cities || [],
        groups: response.groups || [],
        companies: response.companies || [],
        industries: response.industries || [],
        positionLevels: response.positionLevels || []
      });
    } catch {
      setDatabaseFilterOptions({
        cities: [],
        groups: [],
        companies: [],
        industries: [],
        positionLevels: []
      });
    }
  }

  const refreshDatabasePage = async () => {
    await Promise.all([
      loadDatabasePage(currentPage),
      crmService.getFlaggedIdentities().then((items) => setFlags(items || [])).catch(() => {})
    ]);
  };

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

  // Dynamic dropdown options based on active filters
  const filteredCompanyOptions = databaseFilterOptions.companies;
  const filteredIndustryOptions = databaseFilterOptions.industries.length > 0 ? databaseFilterOptions.industries : INDUSTRIES;
  const filteredGroupOptions = databaseFilterOptions.groups;
  const filteredCityOptions = databaseFilterOptions.cities;
  const filteredPositionOptions = databaseFilterOptions.positionLevels;
  const modalCompanies: Company[] = [
    ...databases
      .map((database) => database.company)
      .filter((company): company is Company => Boolean(company?.id)),
    ...(editingDatabase?.company ? [editingDatabase.company] : []),
    ...(detailDatabase?.company ? [detailDatabase.company] : []),
    ...(selectedDatabase?.company ? [selectedDatabase.company] : [])
  ].filter((company, index, array) => array.findIndex((item) => item.id === company.id) === index);

  const handleGroupChange = (groupId: string) => {
    setFilterGroupId(groupId);
    if (groupId && filterCompanyId && !filteredCompanyOptions.some((company) => company.id.toString() === filterCompanyId)) {
      setFilterCompanyId('');
    }
  };

  const handleCompanyChange = (companyId: string) => {
    setFilterCompanyId(companyId);
  };

  const handleIndustryChange = (industry: string) => {
    setFilterIndustry(industry);
  };

  const handleCityChange = (city: string) => {
    setFilterCity(city);
  };

  const isFilterActive = searchQuery || filterGroupId || filterCompanyId || filterPositionLevel || filterIndustry || filterCity || sortBy !== 'id' || sortOrder !== 'asc' || activeTabFilter !== 'all';

  const handleResetFilters = () => {
    setSearchQuery('');
    setFilterGroupId('');
    setFilterCompanyId('');
    setFilterPositionLevel('');
    setFilterIndustry('');
    setFilterCity('');
    setSortBy('id');
    setSortOrder('asc');
    setActiveTabFilter('all');
  };

  const filteredDatabases = databases;
  const currentDatabases = databases;
  const isAllSelected = currentDatabases.length > 0 && currentDatabases.every(d => selectedDatabaseIds.includes(d.id));

  const handleToggleSelectAll = () => {
    if (isAllSelected) {
      const filteredIds = currentDatabases.map(d => d.id);
      setSelectedDatabaseIds(prev => prev.filter(id => !filteredIds.includes(id)));
    } else {
      const filteredIds = currentDatabases.map(d => d.id);
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

  // Reset current page when query, filter or sorting changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, filterCompanyId, filterGroupId, filterPositionLevel, filterIndustry, filterCity, sortBy, sortOrder, activeTabFilter]);

  useEffect(() => {
    void loadDatabasePage();
  }, [currentPage, searchQuery, filterCompanyId, filterGroupId, filterPositionLevel, filterIndustry, filterCity, sortBy, sortOrder, activeTabFilter]);

  useEffect(() => {
    void loadDatabaseFilterOptions();
  }, [searchQuery, filterCompanyId, filterGroupId, filterPositionLevel, filterIndustry, filterCity, activeTabFilter]);

  // Update table scroll width for top scrollbar sync
  useEffect(() => {
    if (tableRef.current) {
      setTableScrollWidth(tableRef.current.scrollWidth);
    }
  }, [databases, currentPage]);

  const totalItems = serverTotalItems;
  const totalPages = serverTotalPages;
  const indexOfFirstItem = totalItems === 0 ? 0 : ((currentPage - 1) * itemsPerPage) + 1;
  const indexOfLastItem = Math.min(currentPage * itemsPerPage, totalItems);

  const handleOpenExportConfig = async () => {
    if (filteredDatabases.length === 0) {
      toast.error("Tidak ada data database untuk di-export.");
      return;
    }
    try {
      const response = await crmService.getDatabasesList({
        search: searchQuery || undefined,
        groupId: filterGroupId || undefined,
        companyId: filterCompanyId || undefined,
        positionLevel: filterPositionLevel || undefined,
        industry: filterIndustry || undefined,
        city: filterCity || undefined,
        tab: activeTabFilter,
        sortBy,
        sortOrder,
        page: 1,
        size: 5000
      });
      setExportDatabases(response.items || []);
    } catch {
      setExportDatabases(databases);
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

      {/* Quality Status Tab Pills */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 pb-3">
        <button
          onClick={() => setActiveTabFilter('all')}
          className={`px-4 py-2 text-xs font-bold rounded-xl transition-all ${
            activeTabFilter === 'all'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          Semua Data ({databaseSummary.all})
        </button>
        <button
          onClick={() => setActiveTabFilter('clean')}
          className={`inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-xl transition-all ${
            activeTabFilter === 'clean'
              ? 'bg-emerald-600 text-white shadow-sm'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <CheckCircle className="w-3.5 h-3.5" />
          Database Bersih ({databaseSummary.clean})
        </button>
        <button
          onClick={() => setActiveTabFilter('dirty')}
          className={`inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-xl transition-all ${
            activeTabFilter === 'dirty'
              ? 'bg-amber-600 text-white shadow-sm'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <AlertCircle className="w-3.5 h-3.5" />
          Database Kotor ({databaseSummary.dirty})
        </button>
      </div>

      {/* Advanced Filters Area */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm space-y-4">
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-3">
          <div className="flex items-center flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2">
            <Search className="w-5 h-5 text-slate-400 mr-2" />
            <input
              type="text"
              placeholder="Search by name, company, job title, phone, source..."
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
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">City</label>
            <Select
              value={filterCity || 'ALL'}
              onValueChange={(val) => handleCityChange(val === 'ALL' ? '' : val)}
            >
              <SelectTrigger className="w-full h-9 px-3 py-2 bg-slate-50 border border-slate-200 focus:border-blue-500 rounded-xl text-slate-900 text-xs focus:outline-none transition-all focus:bg-white shadow-none">
                <SelectValue placeholder="All Cities" />
              </SelectTrigger>
              <SelectContent side="bottom" sideOffset={4} className="bg-white border border-slate-200 shadow-xl rounded-xl z-50">
                <SelectItem value="ALL">All Cities</SelectItem>
                {filteredCityOptions.map((city) => (
                  <SelectItem key={city.value} value={city.value}>{city.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Group</label>
            <Select
              value={filterGroupId || 'ALL'}
              onValueChange={(val) => handleGroupChange(val === 'ALL' ? '' : val)}
            >
              <SelectTrigger className="w-full h-9 px-3 py-2 bg-slate-50 border border-slate-200 focus:border-blue-500 rounded-xl text-slate-900 text-xs focus:outline-none transition-all focus:bg-white shadow-none">
                <SelectValue placeholder="All Groups" />
              </SelectTrigger>
              <SelectContent side="bottom" sideOffset={4} className="bg-white border border-slate-200 shadow-xl rounded-xl z-50">
                <SelectItem value="ALL">All Groups</SelectItem>
                {filteredGroupOptions.map((g) => (
                  <SelectItem key={g.id} value={String(g.id)}>{g.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Company</label>
            <Select
              value={filterCompanyId || 'ALL'}
              onValueChange={(val) => handleCompanyChange(val === 'ALL' ? '' : val)}
            >
              <SelectTrigger className="w-full h-9 px-3 py-2 bg-slate-50 border border-slate-200 focus:border-blue-500 rounded-xl text-slate-900 text-xs focus:outline-none transition-all focus:bg-white shadow-none">
                <SelectValue placeholder="All Companies" />
              </SelectTrigger>
              <SelectContent side="bottom" sideOffset={4} className="bg-white border border-slate-200 shadow-xl rounded-xl z-50">
                <SelectItem value="ALL">All Companies</SelectItem>
                {filteredCompanyOptions.map((c) => (
                  <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Industry</label>
            <Select
              value={filterIndustry || 'ALL'}
              onValueChange={(val) => handleIndustryChange(val === 'ALL' ? '' : val)}
            >
              <SelectTrigger className="w-full h-9 px-3 py-2 bg-slate-50 border border-slate-200 focus:border-blue-500 rounded-xl text-slate-900 text-xs focus:outline-none transition-all focus:bg-white shadow-none">
                <SelectValue placeholder="All Industries" />
              </SelectTrigger>
              <SelectContent side="bottom" sideOffset={4} className="bg-white border border-slate-200 shadow-xl rounded-xl z-50">
                <SelectItem value="ALL">All Industries</SelectItem>
                {filteredIndustryOptions.map((ind) => (
                  <SelectItem key={ind} value={ind}>{ind}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Position Level</label>
            <Select
              value={filterPositionLevel || 'ALL'}
              onValueChange={(val) => setFilterPositionLevel(val === 'ALL' ? '' : val)}
            >
              <SelectTrigger className="w-full h-9 px-3 py-2 bg-slate-50 border border-slate-200 focus:border-blue-500 rounded-xl text-slate-900 text-xs focus:outline-none transition-all focus:bg-white shadow-none">
                <SelectValue placeholder="All Levels" />
              </SelectTrigger>
              <SelectContent side="bottom" sideOffset={4} className="bg-white border border-slate-200 shadow-xl rounded-xl z-50">
                <SelectItem value="ALL">All Levels</SelectItem>
                {filteredPositionOptions.map((level) => (
                  <SelectItem key={level} value={level}>{level}</SelectItem>
                ))}
              </SelectContent>
            </Select>
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
            <div style={{ width: tableScrollWidth ? `${tableScrollWidth}px` : '2200px', height: '10px' }} />
          </div>

          <div
            ref={tableScrollRef}
            onScroll={() => {
              if (topScrollRef.current && tableScrollRef.current) {
                topScrollRef.current.scrollLeft = tableScrollRef.current.scrollLeft;
              }
            }}
            className="overflow-x-auto"
          >
            <table ref={tableRef} className="w-full text-left border-collapse text-sm">
              <thead className="sticky top-0 z-10 bg-slate-50 border-b border-slate-200">
                <tr className="text-slate-500 uppercase tracking-wider text-xs font-semibold whitespace-nowrap text-left">
                  <th className="py-3 px-3 text-xs font-semibold text-slate-500 uppercase tracking-wider w-10 text-center"></th>
                  <th className="py-3 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider text-left sticky left-0 bg-slate-50 z-10">Actions</th>
                  <th
                    onClick={() => handleSort('groupName')}
                    className="py-3 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider cursor-pointer hover:bg-slate-100 transition-colors select-none group/th"
                  >
                    <div className="flex items-center gap-1.5">
                      <span>Nama Group/Holding Company</span>
                      {sortBy === 'groupName' ? (
                        sortOrder === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-blue-600 shrink-0" /> : <ArrowDown className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                      ) : (
                        <ArrowUpDown className="w-3 h-3 text-slate-300 opacity-0 group-hover/th:opacity-100 transition-opacity shrink-0" />
                      )}
                    </div>
                  </th>
                  <th
                    onClick={() => handleSort('brandName')}
                    className="py-3 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider cursor-pointer hover:bg-slate-100 transition-colors select-none group/th"
                  >
                    <div className="flex items-center gap-1.5">
                      <span>Nama Brand</span>
                      {sortBy === 'brandName' ? (
                        sortOrder === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-blue-600 shrink-0" /> : <ArrowDown className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                      ) : (
                        <ArrowUpDown className="w-3 h-3 text-slate-300 opacity-0 group-hover/th:opacity-100 transition-opacity shrink-0" />
                      )}
                    </div>
                  </th>
                  <th
                    onClick={() => handleSort('companyName')}
                    className="py-3 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider cursor-pointer hover:bg-slate-100 transition-colors select-none group/th"
                  >
                    <div className="flex items-center gap-1.5">
                      <span>Company Name</span>
                      {sortBy === 'companyName' ? (
                        sortOrder === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-blue-600 shrink-0" /> : <ArrowDown className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                      ) : (
                        <ArrowUpDown className="w-3 h-3 text-slate-300 opacity-0 group-hover/th:opacity-100 transition-opacity shrink-0" />
                      )}
                    </div>
                  </th>
                  <th className="py-3 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Salutation</th>
                  <th
                    onClick={() => handleSort('firstName')}
                    className="py-3 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider cursor-pointer hover:bg-slate-100 transition-colors select-none group/th"
                  >
                    <div className="flex items-center gap-1.5">
                      <span>First Name</span>
                      {sortBy === 'firstName' ? (
                        sortOrder === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-blue-600 shrink-0" /> : <ArrowDown className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                      ) : (
                        <ArrowUpDown className="w-3 h-3 text-slate-300 opacity-0 group-hover/th:opacity-100 transition-opacity shrink-0" />
                      )}
                    </div>
                  </th>
                  <th
                    onClick={() => handleSort('lastName')}
                    className="py-3 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider cursor-pointer hover:bg-slate-100 transition-colors select-none group/th"
                  >
                    <div className="flex items-center gap-1.5">
                      <span>Last Name</span>
                      {sortBy === 'lastName' ? (
                        sortOrder === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-blue-600 shrink-0" /> : <ArrowDown className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                      ) : (
                        <ArrowUpDown className="w-3 h-3 text-slate-300 opacity-0 group-hover/th:opacity-100 transition-opacity shrink-0" />
                      )}
                    </div>
                  </th>
                  <th
                    onClick={() => handleSort('position')}
                    className="py-3 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider cursor-pointer hover:bg-slate-100 transition-colors select-none group/th"
                  >
                    <div className="flex items-center gap-1.5">
                      <span>Position</span>
                      {sortBy === 'position' ? (
                        sortOrder === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-blue-600 shrink-0" /> : <ArrowDown className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                      ) : (
                        <ArrowUpDown className="w-3 h-3 text-slate-300 opacity-0 group-hover/th:opacity-100 transition-opacity shrink-0" />
                      )}
                    </div>
                  </th>
                  <th className="py-3 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Division</th>
                  <th
                    onClick={() => handleSort('jobTitle')}
                    className="py-3 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider cursor-pointer hover:bg-slate-100 transition-colors select-none group/th"
                  >
                    <div className="flex items-center gap-1.5">
                      <span>Jobtitle</span>
                      {sortBy === 'jobTitle' ? (
                        sortOrder === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-blue-600 shrink-0" /> : <ArrowDown className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                      ) : (
                        <ArrowUpDown className="w-3 h-3 text-slate-300 opacity-0 group-hover/th:opacity-100 transition-opacity shrink-0" />
                      )}
                    </div>
                  </th>
                  <th className="py-4 px-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Address</th>
                  <th className="py-4 px-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Office Phone</th>
                  <th className="py-4 px-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Mobile Phone</th>
                  <th className="py-4 px-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Company Email Address</th>
                  <th className="py-4 px-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Personal Email Address</th>
                  <th
                    onClick={() => handleSort('industry')}
                    className="py-4 px-4 text-xs font-bold text-slate-500 uppercase tracking-wider cursor-pointer hover:bg-slate-100/80 transition-colors select-none group/th"
                  >
                    <div className="flex items-center gap-1.5">
                      <span>Industry</span>
                      {sortBy === 'industry' ? (
                        sortOrder === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-blue-600 shrink-0" /> : <ArrowDown className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                      ) : (
                        <ArrowUpDown className="w-3 h-3 text-slate-300 opacity-0 group-hover/th:opacity-100 transition-opacity shrink-0" />
                      )}
                    </div>
                  </th>
                  <th className="py-4 px-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Company Size (Revenue)</th>
                  <th className="py-4 px-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Company Size (Employee)</th>
                  <th className="py-4 px-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Company Hardware</th>
                  <th className="py-4 px-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Linkedin Link</th>
                  <th
                    onClick={() => handleSort('city')}
                    className="py-4 px-4 text-xs font-bold text-slate-500 uppercase tracking-wider cursor-pointer hover:bg-slate-100/80 transition-colors select-none group/th"
                  >
                    <div className="flex items-center gap-1.5">
                      <span>City</span>
                      {sortBy === 'city' ? (
                        sortOrder === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-blue-600 shrink-0" /> : <ArrowDown className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                      ) : (
                        <ArrowUpDown className="w-3 h-3 text-slate-300 opacity-0 group-hover/th:opacity-100 transition-opacity shrink-0" />
                      )}
                    </div>
                  </th>
                  <th className="py-4 px-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Postal Code</th>
                  <th className="py-4 px-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Company Website</th>
                  <th className="hidden">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {currentDatabases.map((c, idx, slicedArray) => {
                  const isNearBottom = slicedArray.length <= 2 || idx >= slicedArray.length - 2;
                  
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
                  
                  // 3. Match unlinked manual Flagged Identities by subscriber phone digits or email
                  if (flags && flags.length > 0) {
                    const cPhoneDigits = c.mobilePhone ? c.mobilePhone.replace(/[^0-9]/g, '').replace(/^62|^0/, '') : '';
                    flags.forEach(f => {
                      if (f.status === 'cleared') return;
                      if (f.database?.id === c.id) return; // already in dbFlags

                      let matched = false;
                      if (f.phoneUsed && cPhoneDigits) {
                        const fDigits = f.phoneUsed.replace(/[^0-9]/g, '').replace(/^62|^0/, '');
                        if (fDigits && fDigits === cPhoneDigits) {
                          matched = true;
                        }
                      }
                      if (!matched && f.emailUsed && c.emails) {
                        const fEmail = f.emailUsed.trim().toLowerCase();
                        if (c.emails.some(e => e.email && e.email.trim().toLowerCase() === fEmail)) {
                          matched = true;
                        }
                      }
                      if (matched) {
                        localFlags.push({
                          flagReason: f.flagReason || 'duplicate_phone',
                          evidenceNotes: `Nomor/email terdaftar di Spam List Flagged Identities (${f.nameUsed || 'Profile ' + f.id})`
                        });
                      }
                    });
                  }
                  
                  const allFlags = [...dbFlags, ...localFlags];
                  const isFlaggedTikus = allFlags.length > 0;
                  const hasConfirmedFlag = dbFlags.some(f => f.status === 'confirmed');

                  return (
                    <tr
                      key={c.id}
                      onClick={() => handleOpenDetailModal(c)}
                      className={`group transition-all cursor-pointer group/row ${
                        !c.isActive
                          ? 'opacity-60 bg-slate-50/20 hover:bg-slate-50/80'
                          : isFlaggedTikus && !hasConfirmedFlag
                          ? 'bg-amber-50/40 hover:bg-amber-50/70 border-l-2 border-l-amber-400'
                          : 'hover:bg-slate-50/80'
                      }`}
                    >
                      <td
                        onClick={(e) => e.stopPropagation()}
                        className={`py-4 px-4 text-sm text-left sticky left-0 ${
                          !c.isActive
                            ? 'bg-slate-50/90'
                            : isFlaggedTikus && !hasConfirmedFlag
                            ? 'bg-amber-50/90'
                            : 'bg-white'
                        } group-hover:bg-slate-50/90 ${activeDropdownId === c.id ? 'z-30' : 'z-10'} shadow-[4px_0_8px_-4px_rgba(0,0,0,0.1)] transition-colors`}
                      >
                        <div className="inline-flex items-center justify-start gap-2">
                          {isFlaggedTikus && !hasConfirmedFlag && (
                            <span
                              className="inline-flex items-center gap-1 cursor-help px-2 py-0.5 text-[10px] font-bold bg-amber-100/90 border border-amber-300 text-amber-800 rounded-md shrink-0 transition-colors shadow-2xs"
                              title={`Mencurigakan / Dicurigai Tikus:\n• ${allFlags.map(f => `${f.flagReason === 'duplicate_phone' ? 'Nomor telepon duplikat dengan nama lain' : f.flagReason === 'duplicate_email' ? 'Email duplikat dengan nama lain' : f.flagReason || 'Aktivitas mencurigakan'}: ${f.evidenceNotes || ''}`).join('\n• ')}`}
                            >
                              <ShieldAlert className="w-3 h-3 text-amber-600 shrink-0" />
                              Suspected
                            </span>
                          )}
                          {!c.isActive && (
                            <span className="inline-flex items-center px-2 py-0.5 text-[10px] font-bold bg-red-100/90 border border-red-300 text-red-800 rounded-md shrink-0 shadow-2xs">
                              INACTIVE
                            </span>
                          )}
                          <div className="relative text-left">
                            <button
                              onClick={(e) => handleToggleDropdown(e, c.id)}
                              className="inline-flex p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors border border-slate-200 bg-white shadow-sm"
                              title="Actions"
                            >
                              <MoreVertical className="w-4 h-4" />
                            </button>

                            {activeDropdownId === c.id && dropdownPos && (
                              <>
                                {/* Overlay to close when clicking outside */}
                                <div
                                  className="fixed inset-0 z-40 bg-transparent"
                                  onClick={() => {
                                    setActiveDropdownId(null);
                                    setDropdownPos(null);
                                  }}
                                />
                                <div
                                  style={{
                                    position: 'fixed',
                                    top: `${dropdownPos.top}px`,
                                    right: `${dropdownPos.right}px`,
                                  }}
                                  className="w-48 bg-white border border-slate-200 rounded-xl shadow-2xl z-50 py-1.5 duration-100 text-left animate-in fade-in zoom-in-95"
                                >
                                  {!isUser && (
                                    <button
                                      onClick={() => {
                                        setActiveDropdownId(null);
                                        setDropdownPos(null);
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
                                        setDropdownPos(null);
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
                                          setDropdownPos(null);
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
                        </div>
                      </td>
                      <td className="py-4 px-3 text-center">
                        {checkDatabaseCompleteness(c).isIncomplete && (
                          <span
                            className="inline-flex cursor-help text-amber-500 hover:text-amber-600 transition-colors"
                            title={`Semua kolom wajib diisi kecuali Division, Database Type, dan Data Source.\n\nKolom kosong:\n• ${checkDatabaseCompleteness(c).missingFields.join("\n• ")}`}
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
                      <td className="py-4 px-4 text-sm font-bold text-slate-900 group-hover/row:text-blue-600 transition-colors">
                        {c.firstName}
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
                        {c.company?.officePhone ? normalizePhone(c.company.officePhone) : '-'}
                      </td>
                      <td className="py-4 px-4 text-sm font-mono text-slate-700">
                        {c.mobilePhone ? normalizePhone(c.mobilePhone) : '-'}
                      </td>
                      <td className="py-4 px-4 text-xs font-mono text-slate-600">
                        {getOfficeEmail(c.emails)}
                      </td>
                      <td className="py-4 px-4 text-xs font-mono text-slate-600">
                        {getPersonalEmail(c.emails)}
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
                            onClick={(e) => e.stopPropagation()}
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
                            onClick={(e) => e.stopPropagation()}
                            className="text-blue-600 hover:text-blue-500 font-semibold inline-flex items-center gap-1"
                          >
                            Website <ExternalLink className="w-3 h-3" />
                          </a>
                        ) : '-'}
                      </td>
                      <td className="hidden">
                        <div className="inline-flex items-center justify-end gap-2">
                          {isFlaggedTikus && !hasConfirmedFlag && (
                            <span
                              className="inline-flex items-center gap-1 cursor-help px-2 py-0.5 text-[10px] font-bold bg-amber-100/90 border border-amber-300 text-amber-800 rounded-md shrink-0 transition-colors shadow-2xs"
                              title={`Mencurigakan / Dicurigai Tikus:\n${allFlags.map(f => `• ${f.flagReason === 'duplicate_phone' ? 'Nomor telepon duplikat dengan nama lain' : f.flagReason === 'duplicate_email' ? 'Email duplikat dengan nama lain' : f.flagReason || 'Aktivitas mencurigakan'}: ${f.evidenceNotes || ''}`).join('\n')}`}
                            >
                              <ShieldAlert className="w-3 h-3 text-amber-600 shrink-0" />
                              Suspected
                            </span>
                          )}
                          {!c.isActive && (
                            <span className="inline-flex items-center px-2 py-0.5 text-[10px] font-bold bg-red-100/90 border border-red-300 text-red-800 rounded-md shrink-0 shadow-2xs">
                              INACTIVE
                            </span>
                          )}
                          <div className="relative text-left">
                            <button
                              onClick={(e) => handleToggleDropdown(e, c.id)}
                              className="inline-flex p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors border border-slate-200 bg-white shadow-sm"
                              title="Actions"
                            >
                              <MoreVertical className="w-4 h-4" />
                            </button>

                        {activeDropdownId === c.id && dropdownPos && (
                          <>
                            {/* Overlay to close when clicking outside */}
                            <div
                              className="fixed inset-0 z-40 bg-transparent"
                              onClick={() => {
                                setActiveDropdownId(null);
                                setDropdownPos(null);
                              }}
                            />
                            <div
                              style={{
                                position: 'fixed',
                                top: `${dropdownPos.top}px`,
                                right: `${dropdownPos.right}px`,
                              }}
                              className="w-48 bg-white border border-slate-200 rounded-xl shadow-2xl z-50 py-1.5 duration-100 text-left animate-in fade-in zoom-in-95"
                            >
                              {!isUser && (
                                <button
                                  onClick={() => {
                                    setActiveDropdownId(null);
                                    setDropdownPos(null);
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
                                    setDropdownPos(null);
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
                                      setDropdownPos(null);
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
                  Showing <span className="font-extrabold text-slate-800">{indexOfFirstItem}</span> to{' '}
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
        companies={modalCompanies}
      />

      {/* Add Database Modal */}
      <CreateDatabaseModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        companies={modalCompanies}
        onCreated={refreshDatabasePage}
      />

      {/* Edit Database Modal */}
      <EditDatabaseModal
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          setEditingDatabase(null);
        }}
        database={editingDatabase!}
        companies={modalCompanies}
        onUpdated={refreshDatabasePage}
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
          onSubmitSuccess={refreshDatabasePage}
        />
      )}

      {/* Export Configuration Modal Overlay */}
      <ExportConfigModal
        isOpen={isExportConfigModalOpen}
        onClose={() => setIsExportConfigModalOpen(false)}
        databases={exportDatabases.length > 0 ? exportDatabases : databases}
        filteredDatabases={exportDatabases.length > 0 ? exportDatabases : filteredDatabases}
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
          onConfirmSuccess={refreshDatabasePage}
        />
      )}

      {/* Excel Import Modal Overlay */}
      <ExcelImportModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        onImportSuccess={refreshDatabasePage}
      />
    </div>
  );
}

