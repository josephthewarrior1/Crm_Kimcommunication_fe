'use client';

import React, { useState, useEffect } from 'react';
import { crmService } from '../../../lib/services/crmService';
import { Company, Group, Database } from '../../../lib/types';
import { Building2, Search, Plus, Loader2, Globe, Phone, MapPin, Edit2, Trash2, Eye, Users } from 'lucide-react';
import { toast } from 'sonner';
import { INDUSTRIES } from '../../../lib/constants';
import { useAuth } from '../../../lib/context/AuthContext';
import { useSearchParams, useRouter } from 'next/navigation';
import { AddCompanyModal } from './components/AddCompanyModal';
import { EditCompanyModal } from './components/EditCompanyModal';
import { DeleteCompanyConfirmModal } from './components/DeleteCompanyConfirmModal';
import { CompanyDetailModal } from './components/CompanyDetailModal';

export default function CompaniesPage() {
  const { isAdmin, isManager, isUser } = useAuth();
  const searchParams = useSearchParams();
  const router = useRouter();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [databases, setDatabases] = useState<Database[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterIndustry, setFilterIndustry] = useState('');
  const [filterGroup, setFilterGroup] = useState('');
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  
  // Modal States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingCompany, setEditingCompany] = useState<Company | null>(null);

  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [deletingCompany, setDeletingCompany] = useState<Company | null>(null);

  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [detailCompany, setDetailCompany] = useState<Company | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    const searchVal = searchParams.get('search');
    if (searchVal) {
      setSearchQuery(searchVal);
    }
  }, [searchParams]);

  // Reset current page when query, industry or group filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, filterIndustry, filterGroup]);

  async function loadData() {
    setLoading(true);
    try {
      const [cData, gData, databasesData] = await Promise.all([
        crmService.getCompanies(),
        crmService.getGroups(),
        crmService.getDatabases()
      ]);
      setCompanies(cData);
      setGroups(gData);
      setDatabases(databasesData);
    } catch (err) {
      toast.error('Failed to load companies, groups or databases data');
    } finally {
      setLoading(false);
    }
  }

  const handleCreateCompany = async (data: any, groupId?: number) => {
    setSubmitting(true);
    try {
      await crmService.createCompany(data, groupId);
      toast.success('Company created successfully!');
      setIsModalOpen(false);
      loadData();
    } catch (err: any) {
      toast.error(err.message || 'Failed to create company');
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateCompany = async (data: any, groupId?: number) => {
    if (!editingCompany) return;
    setSubmitting(true);
    try {
      await crmService.updateCompany(editingCompany.id, data, groupId);
      toast.success('Company updated successfully!');
      setIsEditModalOpen(false);
      setEditingCompany(null);
      loadData();
    } catch (err: any) {
      toast.error(err.message || 'Failed to update company');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteCompany = async () => {
    if (!deletingCompany) return;
    setSubmitting(true);
    try {
      await crmService.deleteCompany(deletingCompany.id);
      toast.success('Company deleted successfully!');
      setIsDeleteConfirmOpen(false);
      setDeletingCompany(null);
      loadData();
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete company');
    } finally {
      setSubmitting(false);
    }
  };
  const filteredCompanies = companies.filter((c) => {
    const query = searchQuery.toLowerCase();
    const matchesSearch =
      c.name.toLowerCase().includes(query) ||
      (c.brandName && c.brandName.toLowerCase().includes(query)) ||
      (c.city && c.city.toLowerCase().includes(query)) ||
      (c.group?.name && c.group.name.toLowerCase().includes(query));

    const matchesIndustry = !filterIndustry || (() => {
      if (!c.industry) return false;
      const normalize = (str: string) => {
        return str
          .trim()
          .toLowerCase()
          .replace(/mm/g, 'm')
          .replace(/s$/, ''); // singularize
      };
      const dbInd = normalize(c.industry);
      const filterInd = normalize(filterIndustry);
      return dbInd === filterInd || dbInd.includes(filterInd) || filterInd.includes(dbInd);
    })();

    const matchesGroup = !filterGroup || (c.group && c.group.id === Number(filterGroup));

    return matchesSearch && matchesIndustry && matchesGroup;
  });

  const totalItems = filteredCompanies.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentCompanies = filteredCompanies.slice(indexOfFirstItem, indexOfLastItem);

  return (
    <div className="space-y-6 animate-in fade-in duration-200 text-slate-900">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-extrabold text-slate-900">Companies</h2>
          <p className="text-sm text-slate-500 mt-1">Manage partner companies and target corporate leads.</p>
        </div>
        {!isUser && (
          <button
            onClick={() => setIsModalOpen(true)}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white text-sm font-bold rounded-xl shadow-md shadow-blue-600/10 transition-all self-start sm:self-auto"
          >
            <Plus className="w-4 h-4" />
            Add Company
          </button>
        )}
      </div>

      {/* Control Bar */}
      <div className="flex flex-col sm:flex-row gap-4 items-stretch sm:items-center">
        {/* Search Input */}
        <div className="flex items-center flex-1 max-w-md bg-white border border-slate-200 rounded-xl px-3 py-2 shadow-sm">
          <Search className="w-5 h-5 text-slate-400 mr-2" />
          <input
            type="text"
            placeholder="Search by name, brand, city or group..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1 bg-transparent text-sm text-slate-900 placeholder-slate-400 focus:outline-none"
          />
        </div>

        {/* Industry Filter Dropdown */}
        <div className="w-full sm:w-64">
          <select
            value={filterIndustry}
            onChange={(e) => setFilterIndustry(e.target.value)}
            className="w-full px-3 py-2.5 bg-white border border-slate-200 text-slate-700 text-sm font-semibold rounded-xl focus:outline-none focus:border-blue-500 shadow-sm cursor-pointer"
          >
            <option value="">All Industries</option>
            {INDUSTRIES.map((ind) => (
              <option key={ind} value={ind}>
                {ind}
              </option>
            ))}
          </select>
        </div>

        {/* Holding Group Filter Dropdown */}
        <div className="w-full sm:w-64">
          <select
            value={filterGroup}
            onChange={(e) => setFilterGroup(e.target.value)}
            className="w-full px-3 py-2.5 bg-white border border-slate-200 text-slate-700 text-sm font-semibold rounded-xl focus:outline-none focus:border-blue-500 shadow-sm cursor-pointer"
          >
            <option value="">All Groups</option>
            {groups.map((g) => (
              <option key={g.id} value={g.id.toString()}>
                {g.name}
              </option>
            ))}
          </select>
        </div>

        {/* Reset Filter Button */}
        {(filterIndustry || filterGroup) && (
          <button
            onClick={() => {
              setFilterIndustry('');
              setFilterGroup('');
            }}
            className="px-3.5 py-2.5 text-xs font-bold text-red-650 hover:text-red-500 bg-red-50 hover:bg-red-100/55 rounded-xl border border-red-200 transition-all self-start sm:self-auto"
          >
            Clear Filters
          </button>
        )}
      </div>

      {/* Companies List Table */}
      {loading ? (
        <div className="h-[40vh] flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-blue-605" />
        </div>
      ) : filteredCompanies.length === 0 ? (
        <div className="p-12 text-center border border-slate-200 rounded-2xl bg-white shadow-sm">
          <Building2 className="w-10 h-10 text-slate-400 mx-auto mb-3" />
          <h3 className="font-bold text-slate-700">No companies found</h3>
          <p className="text-xs text-slate-500 mt-1">
            {searchQuery ? 'Try adjusting your search filters.' : 'Get started by creating your first company.'}
          </p>
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/50">
                  <th className="py-4 px-6 text-xs font-bold text-slate-500 uppercase tracking-wider">Company Name</th>
                  <th className="py-4 px-6 text-xs font-bold text-slate-500 uppercase tracking-wider">Parent Group</th>
                  <th className="py-4 px-6 text-xs font-bold text-slate-500 uppercase tracking-wider">Database Info</th>
                  <th className="py-4 px-6 text-xs font-bold text-slate-500 uppercase tracking-wider">Details</th>
                  <th className="py-4 px-6 text-xs font-bold text-slate-500 uppercase tracking-wider">City</th>
                  <th className="py-4 px-6 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {currentCompanies.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50/50 transition-all">
                    <td className="py-4 px-6">
                      <p className="text-sm font-bold text-slate-900">{c.name}</p>
                      <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                        {c.brandName && (
                          <span className="text-xs text-blue-650 font-medium">Brand: {c.brandName}</span>
                        )}
                        {c.brandName && <span className="text-slate-300 text-[10px]">•</span>}
                        <span className="text-[11px] text-slate-500 font-medium flex items-center gap-0.5">
                          <Users className="w-3 h-3 text-slate-400" />
                          {databases.filter(database => database.company?.id === c.id && database.isActive).length} Databases
                        </span>
                      </div>
                    </td>
                    <td className="py-4 px-6 text-sm">
                      {c.group ? (
                        <span 
                          className="inline-block max-w-[180px] truncate px-2.5 py-1 text-xs font-bold bg-blue-50 border border-blue-100 text-blue-600 rounded-lg align-middle"
                          title={c.group.name}
                        >
                          {c.group.name}
                        </span>
                      ) : (
                        <span className="text-slate-400">-</span>
                      )}
                    </td>
                    <td className="py-4 px-6 text-xs space-y-1">
                      {c.website && (
                        <a
                          href={c.website.startsWith('http') ? c.website : `https://${c.website}`}
                          target="_blank"
                          rel="noreferrer"
                          className="flex items-center gap-1.5 text-blue-600 hover:text-blue-500 transition-colors"
                        >
                          <Globe className="w-3.5 h-3.5" />
                          {c.website.replace(/(^\w+:|^)\/\//, '')}
                        </a>
                      )}
                      {c.officePhone && (
                        <p className="flex items-center gap-1.5 text-slate-500 font-mono">
                          <Phone className="w-3.5 h-3.5 text-slate-400" />
                          {c.officePhone}
                        </p>
                      )}
                    </td>
                    <td className="py-4 px-6 text-xs space-y-1">
                      {c.industry && (
                        <p className="text-slate-700">
                          <span className="text-slate-400 font-medium">Industry:</span> {c.industry}
                        </p>
                      )}
                      {(c.companySizeRevenue || c.companySizeEmployee) && (
                        <p className="text-slate-600">
                          <span className="text-slate-400 font-medium">Size:</span>{' '}
                          {[c.companySizeRevenue, c.companySizeEmployee].filter(Boolean).join(' / ')}
                        </p>
                      )}
                    </td>
                    <td className="py-4 px-6 text-sm font-medium text-slate-700">
                      {c.city ? (
                        <p className="flex items-center gap-1 text-slate-500">
                          <MapPin className="w-3.5 h-3.5 text-slate-400" />
                          {c.city}
                        </p>
                      ) : (
                        '-'
                      )}
                    </td>
                    <td className="py-4 px-6 text-sm text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => {
                            setDetailCompany(c);
                            setIsDetailModalOpen(true);
                          }}
                          className="inline-flex p-1.5 text-slate-500 hover:text-blue-600 hover:bg-slate-100 rounded-lg transition-colors border border-slate-200 bg-white shadow-sm"
                          title="View Details"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        {!isUser && (
                          <button
                            onClick={() => {
                              setEditingCompany(c);
                              setIsEditModalOpen(true);
                            }}
                            className="inline-flex p-1.5 text-slate-500 hover:text-blue-600 hover:bg-slate-100 rounded-lg transition-colors border border-slate-200 bg-white shadow-sm"
                            title="Edit Company"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                        )}
                        {isAdmin && (
                          <button
                            onClick={() => {
                              setDeletingCompany(c);
                              setIsDeleteConfirmOpen(true);
                            }}
                            className="inline-flex p-1.5 text-slate-500 hover:text-red-600 hover:bg-red-55 rounded-lg transition-colors border border-slate-200 bg-white shadow-sm"
                            title="Delete Company"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
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
                  of <span className="font-extrabold text-slate-800">{totalItems}</span> companies
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
      {/* Add Company Modal Overlay */}
      <AddCompanyModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        groups={groups}
        onSubmit={handleCreateCompany}
        submitting={submitting}
      />

      {/* Edit Company Modal Overlay */}
      {editingCompany && (
        <EditCompanyModal
          isOpen={isEditModalOpen}
          onClose={() => {
            setIsEditModalOpen(false);
            setEditingCompany(null);
          }}
          groups={groups}
          company={editingCompany}
          onSubmit={handleUpdateCompany}
          submitting={submitting}
        />
      )}

      {/* Delete Confirmation Modal Overlay */}
      {deletingCompany && (
        <DeleteCompanyConfirmModal
          isOpen={isDeleteConfirmOpen}
          onClose={() => {
            setIsDeleteConfirmOpen(false);
            setDeletingCompany(null);
          }}
          company={deletingCompany}
          onConfirm={handleDeleteCompany}
          submitting={submitting}
        />
      )}

      {/* Company Details Modal Overlay */}
      {detailCompany && (
        <CompanyDetailModal
          isOpen={isDetailModalOpen}
          onClose={() => {
            setIsDetailModalOpen(false);
            setDetailCompany(null);
          }}
          company={detailCompany}
          databases={databases}
          onGoToEmployeeDetails={(fullName) => {
            router.push(`/dashboard/databases?search=${encodeURIComponent(fullName)}`);
          }}
        />
      )}
    </div>
  );
}

