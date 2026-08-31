import React, { useState, useEffect } from 'react';
import { X, Loader2, Search } from 'lucide-react';
import { Group } from '../../../../lib/types';
import { INDUSTRIES, REVENUE_SIZES, EMPLOYEE_SIZES } from '../../../../lib/constants';

interface AddCompanyModalProps {
  isOpen: boolean;
  onClose: () => void;
  groups: Group[];
  onSubmit: (data: {
    name: string;
    brandName?: string;
    address?: string;
    officePhone?: string;
    website?: string;
    industry?: string;
    companySizeRevenue?: string;
    companySizeEmployee?: string;
    companyHardware?: string;
    city?: string;
    postalCode?: string;
  }, groupId?: number) => Promise<void>;
  submitting: boolean;
}

export const AddCompanyModal: React.FC<AddCompanyModalProps> = ({
  isOpen,
  onClose,
  groups,
  onSubmit,
  submitting
}) => {
  const [name, setName] = useState('');
  const [brandName, setBrandName] = useState('');
  const [selectedGroupId, setSelectedGroupId] = useState('');
  const [groupSearchQuery, setGroupSearchQuery] = useState('');
  const [address, setAddress] = useState('');
  const [officePhone, setOfficePhone] = useState('');
  const [website, setWebsite] = useState('');
  const [industry, setIndustry] = useState('');
  const [companySizeRevenue, setCompanySizeRevenue] = useState('');
  const [companySizeEmployee, setCompanySizeEmployee] = useState('');
  const [companyHardware, setCompanyHardware] = useState('');
  const [city, setCity] = useState('');
  const [postalCode, setPostalCode] = useState('');

  useEffect(() => {
    if (isOpen) {
      setName('');
      setBrandName('');
      setSelectedGroupId('');
      setGroupSearchQuery('');
      setAddress('');
      setOfficePhone('');
      setWebsite('');
      setIndustry('');
      setCompanySizeRevenue('');
      setCompanySizeEmployee('');
      setCompanyHardware('');
      setCity('');
      setPostalCode('');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const filteredGroups = groups.filter((group) =>
    (group.name || '').toLowerCase().includes(groupSearchQuery.toLowerCase().trim())
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(
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
        city: city.trim() || undefined,
        postalCode: postalCode.trim() || undefined
      },
      selectedGroupId ? Number(selectedGroupId) : undefined
    );
  };

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl bg-white border border-slate-200 rounded-2xl p-6 shadow-xl relative max-h-[90vh] overflow-y-auto animate-in scale-in duration-200 text-slate-900">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1 text-slate-400 hover:text-slate-600 rounded-lg transition-colors"
          type="button"
        >
          <X className="w-5 h-5" />
        </button>

        <h3 className="text-xl font-extrabold text-slate-900 mb-6">Add New Company</h3>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">Legal Company Name *</label>
              <input
                type="text"
                placeholder="e.g. Toyota Astra Motor PT"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-4 py-2.5 bg-slate-55 border border-slate-200 focus:border-blue-500 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none transition-all focus:bg-white text-sm"
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
                className="w-full px-4 py-2.5 bg-slate-55 border border-slate-200 focus:border-blue-500 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none transition-all focus:bg-white text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">Parent Group Holding</label>
              <div className="space-y-2">
                <div className="relative">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    placeholder="Search group..."
                    value={groupSearchQuery}
                    onChange={(e) => setGroupSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-3 py-2.5 bg-slate-55 border border-slate-200 focus:border-blue-500 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none transition-all focus:bg-white text-sm"
                  />
                </div>
                <select
                  value={selectedGroupId}
                  onChange={(e) => setSelectedGroupId(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-55 border border-slate-200 focus:border-blue-500 rounded-xl text-slate-900 focus:outline-none transition-all focus:bg-white text-sm cursor-pointer"
                >
                  <option value="">No Group (Independent)</option>
                  {filteredGroups.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">Industry</label>
              <select
                value={industry}
                onChange={(e) => setIndustry(e.target.value)}
                className="w-full px-4 py-2.5 bg-slate-55 border border-slate-200 focus:border-blue-500 rounded-xl text-slate-900 focus:outline-none transition-all focus:bg-white text-sm cursor-pointer"
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
                className="w-full px-4 py-2.5 bg-slate-55 border border-slate-200 focus:border-blue-500 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none transition-all focus:bg-white text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">Website URL</label>
              <input
                type="text"
                placeholder="e.g. www.toyota.co.id"
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
                className="w-full px-4 py-2.5 bg-slate-55 border border-slate-200 focus:border-blue-500 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none transition-all focus:bg-white text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">Company Size (Employees)</label>
              <select
                value={companySizeEmployee}
                onChange={(e) => setCompanySizeEmployee(e.target.value)}
                className="w-full px-4 py-2.5 bg-slate-55 border border-slate-200 focus:border-blue-500 rounded-xl text-slate-900 focus:outline-none transition-all focus:bg-white text-sm cursor-pointer"
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
                className="w-full px-4 py-2.5 bg-slate-55 border border-slate-200 focus:border-blue-500 rounded-xl text-slate-900 focus:outline-none transition-all focus:bg-white text-sm cursor-pointer"
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
                className="w-full px-4 py-2.5 bg-slate-55 border border-slate-200 focus:border-blue-500 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none transition-all focus:bg-white text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">Postal Code</label>
              <input
                type="text"
                placeholder="e.g. 14330"
                value={postalCode}
                onChange={(e) => setPostalCode(e.target.value)}
                className="w-full px-4 py-2.5 bg-slate-55 border border-slate-200 focus:border-blue-500 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none transition-all focus:bg-white text-sm"
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
              className="w-full px-4 py-2.5 bg-slate-55 border border-slate-200 focus:border-blue-500 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none transition-all resize-none focus:bg-white text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Company Hardware (Details)</label>
            <textarea
              placeholder="List hardware, servers, laptops used..."
              value={companyHardware}
              onChange={(e) => setCompanyHardware(e.target.value)}
              rows={2}
              className="w-full px-4 py-2.5 bg-slate-55 border border-slate-200 focus:border-blue-500 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none transition-all resize-none focus:bg-white text-sm"
            />
          </div>

          <div className="flex gap-3 justify-end pt-4 border-t border-slate-100 mt-6">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-105 hover:bg-slate-200 active:bg-slate-200 text-slate-700 text-sm font-medium rounded-xl transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2 bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white text-sm font-bold rounded-xl flex items-center gap-2 transition-all disabled:opacity-50 shadow-md shadow-blue-600/10"
            >
              {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
              Save Company
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
