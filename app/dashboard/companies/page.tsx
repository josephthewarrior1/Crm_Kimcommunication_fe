'use client';

import React, { useState, useEffect } from 'react';
import { crmService } from '../../../lib/services/crmService';
import { Company, Group } from '../../../lib/types';
import { Building2, Search, Plus, X, Loader2, Globe, Phone, MapPin, Edit2, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { INDUSTRIES, REVENUE_SIZES, EMPLOYEE_SIZES } from '../../../lib/constants';


export default function CompaniesPage() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Create Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Form Fields for Create
  const [name, setName] = useState('');
  const [brandName, setBrandName] = useState('');
  const [selectedGroupId, setSelectedGroupId] = useState('');
  const [address, setAddress] = useState('');
  const [officePhone, setOfficePhone] = useState('');
  const [website, setWebsite] = useState('');
  const [industry, setIndustry] = useState('');
  const [companySizeRevenue, setCompanySizeRevenue] = useState('');
  const [companySizeEmployee, setCompanySizeEmployee] = useState('');
  const [companyHardware, setCompanyHardware] = useState('');
  const [city, setCity] = useState('');

  // Edit Modal State
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingCompany, setEditingCompany] = useState<Company | null>(null);
  const [editName, setEditName] = useState('');
  const [editBrandName, setEditBrandName] = useState('');
  const [editSelectedGroupId, setEditSelectedGroupId] = useState('');
  const [editAddress, setEditAddress] = useState('');
  const [editOfficePhone, setEditOfficePhone] = useState('');
  const [editWebsite, setEditWebsite] = useState('');
  const [editIndustry, setEditIndustry] = useState('');
  const [editCompanySizeRevenue, setEditCompanySizeRevenue] = useState('');
  const [editCompanySizeEmployee, setEditCompanySizeEmployee] = useState('');
  const [editCompanyHardware, setEditCompanyHardware] = useState('');
  const [editCity, setEditCity] = useState('');

  // Delete Confirm State
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [deletingCompany, setDeletingCompany] = useState<Company | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    try {
      const [cData, gData] = await Promise.all([
        crmService.getCompanies(),
        crmService.getGroups()
      ]);
      setCompanies(cData);
      setGroups(gData);
    } catch (err) {
      toast.error('Failed to load companies or groups data');
    } finally {
      setLoading(false);
    }
  }

  const handleCreateCompany = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error('Company name is required');
      return;
    }

    setSubmitting(true);
    try {
      await crmService.createCompany(
        {
          name: name.trim(),
          brandName: brandName.trim() || undefined,
          address: address.trim() || undefined,
          officePhone: officePhone.trim() || undefined,
          website: website.trim() || undefined,
          industry: industry.trim() || undefined,
          companySizeRevenue: companySizeRevenue.trim() || undefined,
          companySizeEmployee: companySizeEmployee.trim() || undefined,
          companyHardware: companyHardware.trim() || undefined,
          city: city.trim() || undefined
        },
        selectedGroupId ? Number(selectedGroupId) : undefined
      );

      toast.success('Company created successfully!');
      
      // Reset form
      setName('');
      setBrandName('');
      setSelectedGroupId('');
      setAddress('');
      setOfficePhone('');
      setWebsite('');
      setIndustry('');
      setCompanySizeRevenue('');
      setCompanySizeEmployee('');
      setCompanyHardware('');
      setCity('');
      setIsModalOpen(false);
      loadData();
    } catch (err: any) {
      toast.error(err.message || 'Failed to create company');
    } finally {
      setSubmitting(false);
    }
  };

  const openEditModal = (company: Company) => {
    setEditingCompany(company);
    setEditName(company.name);
    setEditBrandName(company.brandName || '');
    setEditSelectedGroupId(company.group?.id ? company.group.id.toString() : '');
    setEditAddress(company.address || '');
    setEditOfficePhone(company.officePhone || '');
    setEditWebsite(company.website || '');
    setEditIndustry(company.industry || '');
    setEditCompanySizeRevenue(company.companySizeRevenue || '');
    setEditCompanySizeEmployee(company.companySizeEmployee || '');
    setEditCompanyHardware(company.companyHardware || '');
    setEditCity(company.city || '');
    setIsEditModalOpen(true);
  };

  const handleUpdateCompany = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCompany) return;
    if (!editName.trim()) {
      toast.error('Company name is required');
      return;
    }

    setSubmitting(true);
    try {
      await crmService.updateCompany(
        editingCompany.id,
        {
          name: editName.trim(),
          brandName: editBrandName.trim() || undefined,
          address: editAddress.trim() || undefined,
          officePhone: editOfficePhone.trim() || undefined,
          website: editWebsite.trim() || undefined,
          industry: editIndustry.trim() || undefined,
          companySizeRevenue: editCompanySizeRevenue.trim() || undefined,
          companySizeEmployee: editCompanySizeEmployee.trim() || undefined,
          companyHardware: editCompanyHardware.trim() || undefined,
          city: editCity.trim() || undefined
        },
        editSelectedGroupId ? Number(editSelectedGroupId) : undefined
      );

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

  const openDeleteConfirm = (company: Company) => {
    setDeletingCompany(company);
    setIsDeleteConfirmOpen(true);
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
    return (
      c.name.toLowerCase().includes(query) ||
      (c.brandName && c.brandName.toLowerCase().includes(query)) ||
      (c.city && c.city.toLowerCase().includes(query)) ||
      (c.group?.name && c.group.name.toLowerCase().includes(query))
    );
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-200 text-slate-900">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-extrabold text-slate-900">Companies</h2>
          <p className="text-sm text-slate-500 mt-1">Manage partner companies and target corporate leads.</p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white text-sm font-bold rounded-xl shadow-md shadow-blue-600/10 transition-all self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          Add Company
        </button>
      </div>

      {/* Control Bar */}
      <div className="flex items-center max-w-md bg-white border border-slate-200 rounded-xl px-3 py-2 shadow-sm">
        <Search className="w-5 h-5 text-slate-400 mr-2" />
        <input
          type="text"
          placeholder="Search by name, brand, city or group..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="flex-1 bg-transparent text-sm text-slate-900 placeholder-slate-400 focus:outline-none"
        />
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
                  <th className="py-4 px-6 text-xs font-bold text-slate-500 uppercase tracking-wider">Contact Info</th>
                  <th className="py-4 px-6 text-xs font-bold text-slate-500 uppercase tracking-wider">Details</th>
                  <th className="py-4 px-6 text-xs font-bold text-slate-500 uppercase tracking-wider">City</th>
                  <th className="py-4 px-6 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredCompanies.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50/50 transition-all">
                    <td className="py-4 px-6">
                      <p className="text-sm font-bold text-slate-900">{c.name}</p>
                      {c.brandName && (
                        <p className="text-xs text-blue-600 font-medium mt-0.5">Brand: {c.brandName}</p>
                      )}
                    </td>
                    <td className="py-4 px-6 text-sm">
                      {c.group ? (
                        <span className="px-2 py-1 text-xs font-bold bg-blue-50 border border-blue-100 text-blue-600 rounded-lg">
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
                    <td className="py-4 px-6 text-sm text-right space-x-2">
                      <button
                        onClick={() => openEditModal(c)}
                        className="inline-flex p-1.5 text-slate-500 hover:text-blue-600 hover:bg-slate-100 rounded-lg transition-colors"
                        title="Edit Company"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => openDeleteConfirm(c)}
                        className="inline-flex p-1.5 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Delete Company"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add Company Modal Overlay */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-2xl bg-white border border-slate-200 rounded-2xl p-6 shadow-xl relative max-h-[90vh] overflow-y-auto animate-in scale-in duration-200">
            <button
              onClick={() => setIsModalOpen(false)}
              className="absolute top-4 right-4 p-1 text-slate-400 hover:text-slate-600 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-xl font-extrabold text-slate-900 mb-6">Add New Company</h3>

            <form onSubmit={handleCreateCompany} className="space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">Legal Company Name *</label>
                  <input
                    type="text"
                    placeholder="e.g. PT Toyota Astra Motor"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 focus:border-blue-500 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none transition-all focus:bg-white"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">Brand Name</label>
                  <input
                    type="text"
                    placeholder="e.g. Toyota"
                    value={brandName}
                    onChange={(e) => setBrandName(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 focus:border-blue-500 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none transition-all focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">Parent Group Holding</label>
                  <select
                    value={selectedGroupId}
                    onChange={(e) => setSelectedGroupId(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 focus:border-blue-500 rounded-xl text-slate-900 focus:outline-none transition-all focus:bg-white"
                  >
                    <option value="">No Group (Independent)</option>
                    {groups.map((g) => (
                      <option key={g.id} value={g.id}>
                        {g.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">Industry</label>
                  <select
                    value={industry}
                    onChange={(e) => setIndustry(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 focus:border-blue-500 rounded-xl text-slate-900 focus:outline-none transition-all focus:bg-white"
                  >
                    <option value="">Select Industry</option>
                    {INDUSTRIES.map((ind) => (
                      <option key={ind} value={ind}>
                        {ind}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">Office Phone</label>
                  <input
                    type="text"
                    placeholder="e.g. 021-123456"
                    value={officePhone}
                    onChange={(e) => setOfficePhone(e.target.value.replace(/[^0-9+\-()\s]/g, ''))}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 focus:border-blue-500 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none transition-all focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">Website URL</label>
                  <input
                    type="text"
                    placeholder="e.g. www.toyota.co.id"
                    value={website}
                    onChange={(e) => setWebsite(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 focus:border-blue-500 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none transition-all focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">Company Size (Employees)</label>
                  <select
                    value={companySizeEmployee}
                    onChange={(e) => setCompanySizeEmployee(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 focus:border-blue-500 rounded-xl text-slate-900 focus:outline-none transition-all focus:bg-white"
                  >
                    <option value="">Select Employee Size</option>
                    {EMPLOYEE_SIZES.map((sz) => (
                      <option key={sz} value={sz}>{sz}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">Company Size (Revenue)</label>
                  <select
                    value={companySizeRevenue}
                    onChange={(e) => setCompanySizeRevenue(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 focus:border-blue-500 rounded-xl text-slate-900 focus:outline-none transition-all focus:bg-white"
                  >
                    <option value="">Select Revenue Size</option>
                    {REVENUE_SIZES.map((sz) => (
                      <option key={sz} value={sz}>{sz}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">City</label>
                  <input
                    type="text"
                    placeholder="e.g. Jakarta Utara"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 focus:border-blue-500 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none transition-all focus:bg-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Address</label>
                <textarea
                  placeholder="Full office address..."
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  rows={2}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 focus:border-blue-500 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none transition-all resize-none focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Company Hardware (Details)</label>
                <textarea
                  placeholder="List hardware, servers, laptops used..."
                  value={companyHardware}
                  onChange={(e) => setCompanyHardware(e.target.value)}
                  rows={2}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 focus:border-blue-500 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none transition-all resize-none focus:bg-white"
                />
              </div>

              <div className="flex gap-3 justify-end pt-4 border-t border-slate-100 mt-6">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 active:bg-slate-200 text-slate-700 text-sm font-medium rounded-xl transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white text-sm font-bold rounded-xl flex items-center gap-2 transition-all disabled:opacity-50"
                >
                  {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                  Save Company
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Company Modal Overlay */}
      {isEditModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-2xl bg-white border border-slate-200 rounded-2xl p-6 shadow-xl relative max-h-[90vh] overflow-y-auto animate-in scale-in duration-200">
            <button
              onClick={() => {
                setIsEditModalOpen(false);
                setEditingCompany(null);
              }}
              className="absolute top-4 right-4 p-1 text-slate-400 hover:text-slate-600 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-xl font-extrabold text-slate-900 mb-6">Edit Company</h3>

            <form onSubmit={handleUpdateCompany} className="space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">Legal Company Name *</label>
                  <input
                    type="text"
                    placeholder="e.g. PT Toyota Astra Motor"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 focus:border-blue-500 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none transition-all focus:bg-white"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">Brand Name</label>
                  <input
                    type="text"
                    placeholder="e.g. Toyota"
                    value={editBrandName}
                    onChange={(e) => setEditBrandName(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 focus:border-blue-500 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none transition-all focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">Parent Group Holding</label>
                  <select
                    value={editSelectedGroupId}
                    onChange={(e) => setEditSelectedGroupId(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 focus:border-blue-500 rounded-xl text-slate-900 focus:outline-none transition-all focus:bg-white"
                  >
                    <option value="">No Group (Independent)</option>
                    {groups.map((g) => (
                      <option key={g.id} value={g.id}>
                        {g.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">Industry</label>
                  <select
                    value={editIndustry}
                    onChange={(e) => setEditIndustry(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 focus:border-blue-500 rounded-xl text-slate-900 focus:outline-none transition-all focus:bg-white"
                  >
                    <option value="">Select Industry</option>
                    {INDUSTRIES.map((ind) => (
                      <option key={ind} value={ind}>
                        {ind}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">Office Phone</label>
                  <input
                    type="text"
                    placeholder="e.g. 021-123456"
                    value={editOfficePhone}
                    onChange={(e) => setEditOfficePhone(e.target.value.replace(/[^0-9+\-()\s]/g, ''))}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 focus:border-blue-500 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none transition-all focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">Website URL</label>
                  <input
                    type="text"
                    placeholder="e.g. www.toyota.co.id"
                    value={editWebsite}
                    onChange={(e) => setEditWebsite(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 focus:border-blue-500 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none transition-all focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">Company Size (Employees)</label>
                  <select
                    value={editCompanySizeEmployee}
                    onChange={(e) => setEditCompanySizeEmployee(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 focus:border-blue-500 rounded-xl text-slate-900 focus:outline-none transition-all focus:bg-white"
                  >
                    <option value="">Select Employee Size</option>
                    {EMPLOYEE_SIZES.map((sz) => (
                      <option key={sz} value={sz}>{sz}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">Company Size (Revenue)</label>
                  <select
                    value={editCompanySizeRevenue}
                    onChange={(e) => setEditCompanySizeRevenue(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 focus:border-blue-500 rounded-xl text-slate-900 focus:outline-none transition-all focus:bg-white"
                  >
                    <option value="">Select Revenue Size</option>
                    {REVENUE_SIZES.map((sz) => (
                      <option key={sz} value={sz}>{sz}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">City</label>
                  <input
                    type="text"
                    placeholder="e.g. Jakarta Utara"
                    value={editCity}
                    onChange={(e) => setEditCity(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 focus:border-blue-500 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none transition-all focus:bg-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Address</label>
                <textarea
                  placeholder="Full office address..."
                  value={editAddress}
                  onChange={(e) => setEditAddress(e.target.value)}
                  rows={2}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 focus:border-blue-500 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none transition-all resize-none focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Company Hardware (Details)</label>
                <textarea
                  placeholder="List hardware, servers, laptops used..."
                  value={editCompanyHardware}
                  onChange={(e) => setEditCompanyHardware(e.target.value)}
                  rows={2}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 focus:border-blue-500 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none transition-all resize-none focus:bg-white"
                />
              </div>

              <div className="flex gap-3 justify-end pt-4 border-t border-slate-100 mt-6">
                <button
                  type="button"
                  onClick={() => {
                    setIsEditModalOpen(false);
                    setEditingCompany(null);
                  }}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 active:bg-slate-200 text-slate-700 text-sm font-medium rounded-xl transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white text-sm font-bold rounded-xl flex items-center gap-2 transition-all disabled:opacity-50"
                >
                  {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal Overlay */}
      {isDeleteConfirmOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white border border-slate-200 rounded-2xl p-6 shadow-xl relative animate-in scale-in duration-200">
            <h3 className="text-lg font-bold text-slate-900 mb-2">Delete Company</h3>
            <p className="text-sm text-slate-500 mb-6">
              Are you sure you want to delete the company <span className="font-semibold text-slate-800">"{deletingCompany?.name}"</span>? 
              This action cannot be undone. Associated contacts will have their company references removed (nullified).
            </p>

            <div className="flex gap-3 justify-end">
              <button
                type="button"
                onClick={() => {
                  setIsDeleteConfirmOpen(false);
                  setDeletingCompany(null);
                }}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 active:bg-slate-200 text-slate-700 text-sm font-medium rounded-xl transition-all"
                disabled={submitting}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteCompany}
                disabled={submitting}
                className="px-5 py-2 bg-red-600 hover:bg-red-500 active:bg-red-700 text-white text-sm font-bold rounded-xl flex items-center gap-2 transition-all disabled:opacity-50"
              >
                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                Yes, Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

