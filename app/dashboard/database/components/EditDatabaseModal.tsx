import React, { useState, useEffect } from 'react';
import { X, Loader2, AlertCircle, Search, UserX } from 'lucide-react';
import { Company, Database, Group } from '../../../../lib/types';
import { crmService } from '../../../../lib/services/crmService';
import { toast } from 'sonner';
import { normalizePhone } from '../utils/phoneHelper';
import { INDUSTRIES, REVENUE_SIZES, EMPLOYEE_SIZES } from '../../../../lib/constants';
import { CompanyBranchSelect, useCompanyBranches } from './CompanyBranchSelect';

interface EditDatabaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  database: Database;
  companies: Company[];
  onUpdated: () => void;
  onRequestTakeout?: (database: Database) => void;
}

export const EditDatabaseModal: React.FC<EditDatabaseModalProps> = ({
  isOpen,
  onClose,
  database,
  companies,
  onUpdated,
  onRequestTakeout
}) => {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [salutation, setSalutation] = useState('');
  const [selectedCompanyId, setSelectedCompanyId] = useState('');
  const [selectedBranchId, setSelectedBranchId] = useState('');
  const [positionLevel, setPositionLevel] = useState('unknown');
  const [specialityDivision, setSpecialityDivision] = useState('');
  const [jobTitle, setJobTitle] = useState('');
  const [mobilePhone, setMobilePhone] = useState('');
  const [linkedinUrl, setLinkedinUrl] = useState('');
  const [databaseType, setDatabaseType] = useState('unknown');
  const [source, setSource] = useState('manual');
  const [isActive, setIsActive] = useState(true);
  const [databaseCompanyEmail, setDatabaseCompanyEmail] = useState('');
  const [databaseCompanyEmailId, setDatabaseCompanyEmailId] = useState('');
  const [databasePersonalEmail, setDatabasePersonalEmail] = useState('');
  const [databasePersonalEmailId, setDatabasePersonalEmailId] = useState('');
  const [isCreatingNewCompany, setIsCreatingNewCompany] = useState(false);
  const [newCompanyName, setNewCompanyName] = useState('');
  const [companySearchQuery, setCompanySearchQuery] = useState('');
  const [isCompanyDropdownOpen, setIsCompanyDropdownOpen] = useState(false);
  const [companyOptions, setCompanyOptions] = useState<Company[]>([]);
  const [companyOptionsLoading, setCompanyOptionsLoading] = useState(false);
  const [groups, setGroups] = useState<Group[]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState('');
  const [brandName, setBrandName] = useState('');
  const [companyAddress, setCompanyAddress] = useState('');
  const [officePhone, setOfficePhone] = useState('');
  const [website, setWebsite] = useState('');
  const [industry, setIndustry] = useState('');
  const [companySizeRevenue, setCompanySizeRevenue] = useState('');
  const [companySizeEmployee, setCompanySizeEmployee] = useState('');
  const [companyHardware, setCompanyHardware] = useState('');
  const [city, setCity] = useState('');
  const [postalCode, setPostalCode] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const branchSelection = useCompanyBranches(isOpen && !isCreatingNewCompany ? selectedCompanyId : '', selectedBranchId);

  useEffect(() => {
    if (!database) return;
    setFirstName(database.firstName || '');
    setLastName(database.lastName || '');
    setSalutation(database.salutation || '');
    setSelectedCompanyId(database.company?.id ? database.company.id.toString() : '');
    setSelectedBranchId(database.branch?.id?.toString() || '');
    setPositionLevel(database.positionLevel || 'unknown');
    setSpecialityDivision(database.specialityDivision || '');
    setJobTitle(database.jobTitle || '');
    setMobilePhone(database.mobilePhone || '');
    setLinkedinUrl(database.linkedinUrl || '');
    setDatabaseType(database.databaseType || 'unknown');
    setSource(database.source || 'manual');
    setIsActive(database.isActive !== false);
    setIsCreatingNewCompany(false);
    setNewCompanyName('');
    setCompanySearchQuery('');
    setIsCompanyDropdownOpen(false);
    setSubmitAttempted(false);
    setSelectedGroupId(database.company?.group?.id?.toString() || '');
    setBrandName(database.company?.brandName || '');
    setCompanyAddress(database.company?.address || '');
    setOfficePhone(database.company?.officePhone || '');
    setWebsite(database.company?.website || '');
    setIndustry(database.company?.industry || '');
    setCompanySizeRevenue(database.company?.companySizeRevenue || '');
    setCompanySizeEmployee(database.company?.companySizeEmployee || '');
    setCompanyHardware(database.company?.companyHardware || '');
    setCity(database.company?.city || '');
    setPostalCode(database.company?.postalCode || '');

    setDatabaseCompanyEmail('');
    setDatabaseCompanyEmailId('');
    setDatabasePersonalEmail('');
    setDatabasePersonalEmailId('');

    let active = true;
    const loadEmails = async () => {
      try {
        const emails = await crmService.getDatabaseEmails(database.id);
        if (!active) return;
        if (emails && emails.length > 0) {
          const compEmail = emails.find(e => (e.isCorporate || e.emailType === 'company') && e.isPrimary) 
            || [...emails.filter(e => e.isCorporate || e.emailType === 'company')].sort((a, b) => (b.id || 0) - (a.id || 0))[0];
          if (compEmail) {
            setDatabaseCompanyEmail(compEmail.email);
            setDatabaseCompanyEmailId(compEmail.id.toString());
          }
          const persEmail = emails.find(e => !e.isCorporate && e.emailType === 'personal' && e.isPrimary)
            || [...emails.filter(e => !e.isCorporate && e.emailType === 'personal')].sort((a, b) => (b.id || 0) - (a.id || 0))[0];
          if (persEmail) {
            setDatabasePersonalEmail(persEmail.email);
            setDatabasePersonalEmailId(persEmail.id.toString());
          }
        }
      } catch (err) {
        console.error('Failed to load email details', err);
      }
    };
    loadEmails();

    return () => {
      active = false;
    };
  }, [database]);

  useEffect(() => {
    if (!isOpen || isCreatingNewCompany) return;
    void loadCompanyOptions(companySearchQuery);
  }, [isOpen, isCreatingNewCompany, companySearchQuery]);

  useEffect(() => {
    if (!isOpen) return;
    crmService.getGroups().then(setGroups).catch(() => setGroups([]));
  }, [isOpen]);

  if (!isOpen) return null;

  const selectedCompany = companies.find((c) => c.id.toString() === selectedCompanyId)
    || companyOptions.find((c) => c.id.toString() === selectedCompanyId)
    || (database.company?.id.toString() === selectedCompanyId ? database.company : undefined);

  const loadCompanyOptions = async (search: string) => {
    setCompanyOptionsLoading(true);
    try {
      const response = await crmService.getCompaniesList({
        search: search || undefined,
        page: 1,
        size: 20
      });
      setCompanyOptions(response.items || []);
    } catch (err) {
      console.error('Failed to load companies:', err);
      setCompanyOptions([]);
    } finally {
      setCompanyOptionsLoading(false);
    }
  };

  const handleUpdateDatabase = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    setSubmitAttempted(true);
    if (!isCreatingNewCompany && !selectedCompanyId && (database.company?.id || companySearchQuery.trim())) {
      toast.error('Pilih perusahaan dari hasil pencarian sebelum menyimpan. Perusahaan dan cabang yang tersimpan belum diubah.');
      return;
    }
    if (!isCreatingNewCompany && !branchSelection.valid) {
      toast.error('Tunggu daftar cabang dimuat, lalu periksa pilihan cabang sebelum menyimpan.');
      return;
    }

    if (isCreatingNewCompany && !newCompanyName.trim()) {
      toast.error('Isi nama perusahaan baru, atau pilih Choose Existing untuk menyimpan tanpa perusahaan.');
      return;
    }

    setSubmitting(true);
    try {
      let resolvedCompanyId: number | undefined = selectedCompanyId ? Number(selectedCompanyId) : undefined;
      const companyDetails = {
        name: isCreatingNewCompany ? newCompanyName.trim() : (selectedCompany?.name || database.company?.name || '').trim(),
        brandName: brandName.trim() || undefined,
        address: companyAddress.trim() || undefined,
        officePhone: officePhone.trim() || undefined,
        website: website.trim() || undefined,
        industry: industry.trim() || undefined,
        companySizeRevenue: companySizeRevenue.trim() || undefined,
        companySizeEmployee: companySizeEmployee.trim() || undefined,
        companyHardware: companyHardware.trim() || undefined,
        city: city.trim() || undefined,
        postalCode: postalCode.trim() || undefined
      };
      if (isCreatingNewCompany && newCompanyName.trim()) {
        try {
          const createdComp = await crmService.createCompany(companyDetails, selectedGroupId ? Number(selectedGroupId) : undefined);
          resolvedCompanyId = createdComp.id;
        } catch (compErr: any) {
          toast.error(`Gagal membuat Perusahaan Baru: ${compErr.message}`);
          setSubmitting(false);
          return;
        }
      } else if (resolvedCompanyId && (
        Object.entries(companyDetails).some(([key, value]) => (value || '') !== String(selectedCompany?.[key as keyof Company] || '').trim())
        || selectedGroupId !== (selectedCompany?.group?.id?.toString() || '')
      )) {
        await crmService.updateCompany(resolvedCompanyId, companyDetails, selectedGroupId ? Number(selectedGroupId) : undefined);
      }

      await crmService.updateDatabase(
        database.id,
        {
          salutation,
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          positionLevel: positionLevel || 'unknown',
          specialityDivision: specialityDivision.trim(),
          jobTitle: jobTitle.trim(),
          mobilePhone: normalizePhone(mobilePhone),
          normalizedPhone: normalizePhone(mobilePhone),
          linkedinUrl: linkedinUrl.trim(),
          databaseType,
          source,
          isActive
        },
        resolvedCompanyId,
        !isCreatingNewCompany && selectedBranchId ? Number(selectedBranchId) : null
      );

      // Handle Company Email
      if (databaseCompanyEmail.trim()) {
        if (databaseCompanyEmailId) {
          try {
            await crmService.updateDatabaseEmail(database.id, Number(databaseCompanyEmailId), {
              email: databaseCompanyEmail.trim().toLowerCase()
            });
          } catch (emailErr: any) {
            toast.warning(`Database updated, but failed to update company email: ${emailErr.message}`);
          }
        } else {
          try {
            await crmService.addDatabaseEmail(database.id, {
              email: databaseCompanyEmail.trim().toLowerCase(),
              emailType: 'company',
              isPrimary: true,
              isVerified: true,
              isCorporate: true
            });
          } catch (emailErr: any) {
            toast.warning(`Database updated, but failed to save company email: ${emailErr.message}`);
          }
        }
      } else if (databaseCompanyEmailId) {
        try {
          await crmService.deleteDatabaseEmail(database.id, Number(databaseCompanyEmailId));
        } catch (emailErr: any) {
          toast.warning(`Database updated, but failed to clear company email: ${emailErr.message}`);
        }
      }

      // Handle Personal Email
      if (databasePersonalEmail.trim()) {
        if (databasePersonalEmailId) {
          try {
            await crmService.updateDatabaseEmail(database.id, Number(databasePersonalEmailId), {
              email: databasePersonalEmail.trim().toLowerCase()
            });
          } catch (emailErr: any) {
            toast.warning(`Database updated, but failed to update personal email: ${emailErr.message}`);
          }
        } else {
          try {
            await crmService.addDatabaseEmail(database.id, {
              email: databasePersonalEmail.trim().toLowerCase(),
              emailType: 'personal',
              isPrimary: !databaseCompanyEmail.trim(),
              isVerified: true,
              isCorporate: false
            });
          } catch (emailErr: any) {
            toast.warning(`Database updated, but failed to save personal email: ${emailErr.message}`);
          }
        }
      } else if (databasePersonalEmailId) {
        try {
          await crmService.deleteDatabaseEmail(database.id, Number(databasePersonalEmailId));
        } catch (emailErr: any) {
          toast.warning(`Database updated, but failed to clear personal email: ${emailErr.message}`);
        }
      }

      toast.success('Database updated successfully!');
      onUpdated();
      onClose();
    } catch (err: any) {
      toast.error(err.message || 'Failed to update database');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="ms-modal-overlay">
      <div className="ms-modal w-full max-w-2xl">
        <div className="ms-modal-header">
        <button
          onClick={onClose}
          className="ms-modal-close"
        >
          <X className="w-5 h-5" />
        </button>

        <h3 className="ms-modal-title">Edit Database</h3>
        </div>

        <form onSubmit={handleUpdateDatabase} className="ms-modal-form">
        <div className="ms-modal-body space-y-5">

          <div className="mb-5 p-3.5 bg-blue-50 border border-blue-200 rounded-xl flex items-start gap-2.5">
            <AlertCircle className="w-4.5 h-4.5 text-blue-500 shrink-0 mt-0.5" />
            <div>
              <p className="text-xs text-blue-800">Data boleh dilengkapi dan disimpan bertahap. Selama belum lengkap, data tetap masuk Database Kotor.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">Salutation</label>
              <select
                value={salutation}
                onChange={(e) => setSalutation(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl text-slate-900 focus:outline-none transition-all bg-slate-50 border border-slate-200 focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-500/20"
              >
                <option value="">Belum diisi</option>
                <option value="Mr">Mr</option>
                <option value="Mrs">Mrs</option>
                <option value="Ms">Ms</option>
                <option value="Dr">Dr</option>
              </select>
            </div>

            <div>
              <div className="flex flex-wrap justify-between items-center gap-2 mb-1.5">
                <label className="block text-sm font-semibold text-slate-700">
                  Associated Company
                </label>
                <button
                  type="button"
                  onClick={() => {
                    setIsCreatingNewCompany(!isCreatingNewCompany);
                    setSelectedCompanyId('');
                    setSelectedBranchId('');
                    setNewCompanyName('');
                    setSelectedGroupId('');
                    setBrandName('');
                    setCompanyAddress('');
                    setOfficePhone('');
                    setWebsite('');
                    setIndustry('');
                    setCompanySizeRevenue('');
                    setCompanySizeEmployee('');
                    setCompanyHardware('');
                    setCity('');
                    setPostalCode('');
                    setCompanySearchQuery('');
                    setIsCompanyDropdownOpen(false);
                  }}
                  className="text-xs font-bold text-blue-600 hover:text-blue-800 underline focus:outline-none"
                >
                  {isCreatingNewCompany ? '← Choose Existing' : '+ Create New Company'}
                </button>
              </div>

              {isCreatingNewCompany ? (
                <input
                  type="text"
                  placeholder="Enter new company name (e.g. PT Smartnet Magna Global)"
                  value={newCompanyName}
                  onChange={(e) => setNewCompanyName(e.target.value)}
                  className={`w-full px-4 py-2.5 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none transition-all ${submitAttempted && !newCompanyName.trim()
                      ? 'bg-red-50/30 border border-red-500 focus:border-red-500 focus:ring-2 focus:ring-red-500/20'
                      : 'bg-slate-50 border border-slate-200 focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-500/20'
                    }`}
                />
              ) : (
                <div className="relative">
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="Type to search company..."
                      value={isCompanyDropdownOpen ? companySearchQuery : (companySearchQuery || selectedCompany?.name || '')}
                      onFocus={() => {
                        setCompanySearchQuery('');
                        setIsCompanyDropdownOpen(true);
                      }}
                      onChange={(e) => {
                        setCompanySearchQuery(e.target.value);
                        setIsCompanyDropdownOpen(true);
                        if (selectedCompanyId) setSelectedCompanyId('');
                        setSelectedBranchId('');
                      }}
                      className="w-full px-4 py-2.5 pr-10 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none transition-all bg-slate-50 border border-slate-200 focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-500/20"
                    />
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1 text-slate-400">
                      {(companySearchQuery || selectedCompanyId) ? (
                        <button
                          type="button"
                          onClick={() => {
                            setCompanySearchQuery('');
                            setSelectedCompanyId('');
                            setSelectedBranchId('');
                            setIsCompanyDropdownOpen(false);
                          }}
                          className="hover:text-slate-600 p-0.5 text-xs font-bold"
                          title="Clear selection"
                        >
                          ✕
                        </button>
                      ) : (
                        <Search className="w-4 h-4" />
                      )}
                    </div>
                  </div>

                  {isCompanyDropdownOpen && (
                    <>
                      <div className="fixed inset-0 z-10" onClick={() => setIsCompanyDropdownOpen(false)} />
                      <div className="absolute left-0 right-0 top-full mt-1.5 bg-white border border-slate-200 rounded-xl shadow-xl z-20 max-h-56 overflow-y-auto py-1 animate-in fade-in duration-150">
                        <button
                          type="button"
                          onClick={() => {
                            setIsCreatingNewCompany(true);
                            setSelectedCompanyId('');
                            setSelectedBranchId('');
                            setNewCompanyName(companySearchQuery || '');
                            setSelectedGroupId('');
                            setBrandName('');
                            setCompanyAddress('');
                            setOfficePhone('');
                            setWebsite('');
                            setIndustry('');
                            setCompanySizeRevenue('');
                            setCompanySizeEmployee('');
                            setCompanyHardware('');
                            setCity('');
                            setPostalCode('');
                            setCompanySearchQuery('');
                            setIsCompanyDropdownOpen(false);
                          }}
                          className="w-full text-left px-3.5 py-2 text-xs font-bold text-blue-600 hover:bg-blue-50 flex items-center gap-2 border-b border-slate-100"
                        >
                          <span>+ Add New Company {companySearchQuery ? `"${companySearchQuery}"` : ''}</span>
                        </button>

                        {companyOptionsLoading ? (
                          <div className="px-3.5 py-3 flex items-center justify-center">
                            <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                          </div>
                        ) : companyOptions.length === 0 ? (
                          <div className="px-3.5 py-3 text-xs text-slate-400 italic">No matching companies found</div>
                        ) : (
                          companyOptions.map((comp) => (
                            <button
                              key={comp.id}
                              type="button"
                              onClick={() => {
                                setSelectedCompanyId(comp.id.toString());
                                if (selectedCompanyId !== comp.id.toString()) setSelectedBranchId('');
                                setSelectedGroupId(comp.group?.id?.toString() || '');
                                setBrandName(comp.brandName || '');
                                setCompanyAddress(comp.address || '');
                                setOfficePhone(comp.officePhone || '');
                                setWebsite(comp.website || '');
                                setIndustry(comp.industry || '');
                                setCompanySizeRevenue(comp.companySizeRevenue || '');
                                setCompanySizeEmployee(comp.companySizeEmployee || '');
                                setCompanyHardware(comp.companyHardware || '');
                                setCity(comp.city || '');
                                setPostalCode(comp.postalCode || '');
                                setCompanySearchQuery('');
                                setIsCompanyDropdownOpen(false);
                              }}
                              className={`w-full text-left px-3.5 py-2 text-xs transition-colors flex items-center justify-between ${selectedCompanyId === comp.id.toString()
                                  ? 'bg-blue-50 text-blue-700 font-bold'
                                  : 'text-slate-700 hover:bg-slate-50 font-medium'
                                }`}
                            >
                              <span>{comp.name}</span>
                              {comp.industry && <span className="text-[10px] text-slate-400 font-normal">{comp.industry}</span>}
                            </button>
                          ))
                        )}
                      </div>
                    </>
                  )}
                </div>
              )}
              {submitAttempted && isCreatingNewCompany && !newCompanyName.trim() && (
                <p className="text-red-500 text-[11px] mt-1 font-semibold">
                  Nama Perusahaan Baru wajib diisi
                </p>
              )}
            </div>

            <CompanyBranchSelect companyId={selectedCompanyId} value={selectedBranchId} onChange={setSelectedBranchId} selection={branchSelection} initialBranch={database.branch} creatingCompany={isCreatingNewCompany} disabled={submitting} />

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">First Name</label>
              <input
                type="text"
                placeholder="e.g. John"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none transition-all bg-slate-50 border border-slate-200 focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-500/20"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">Last Name</label>
              <input
                type="text"
                placeholder="e.g. Doe"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none transition-all bg-slate-50 border border-slate-200 focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-500/20"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">Job Title</label>
              <input
                type="text"
                placeholder="e.g. Senior Manager IT"
                value={jobTitle}
                onChange={(e) => setJobTitle(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none transition-all bg-slate-50 border border-slate-200 focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-500/20"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">Position Level</label>
              <select
                value={positionLevel}
                onChange={(e) => setPositionLevel(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl text-slate-900 focus:outline-none transition-all bg-slate-50 border border-slate-200 focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-500/20"
              >
                <option value="unknown">unknown</option>
                <option value="C-level//GM/Director">C-level//GM/Director</option>
                <option value="Manajerial/Head">Manajerial/Head</option>
                <option value="Staff">Staff</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">Division</label>
              <input
                type="text"
                placeholder="e.g. IT / Marketing"
                value={specialityDivision}
                onChange={(e) => setSpecialityDivision(e.target.value)}
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 focus:border-blue-500 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none transition-all focus:bg-white"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">Mobile Phone</label>
              <input
                type="text"
                placeholder="e.g. 0812345678"
                value={mobilePhone}
                onChange={(e) => setMobilePhone(e.target.value.replace(/\D/g, ''))}
                className="w-full px-4 py-2.5 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none transition-all font-mono bg-slate-50 border border-slate-200 focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-500/20"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">Company Email</label>
              <input
                type="email"
                placeholder="e.g. name@company.com"
                value={databaseCompanyEmail}
                onChange={(e) => setDatabaseCompanyEmail(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none transition-all bg-slate-50 border border-slate-200 focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-500/20"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">Personal Email <span className="text-slate-400 font-normal text-xs">(Optional)</span></label>
              <input
                type="email"
                placeholder="e.g. name@gmail.com"
                value={databasePersonalEmail}
                onChange={(e) => setDatabasePersonalEmail(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none transition-all bg-slate-50 border border-slate-200 focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-500/20"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">LinkedIn Profile URL</label>
              <input
                type="text"
                placeholder="e.g. https://linkedin.com/..."
                value={linkedinUrl}
                onChange={(e) => setLinkedinUrl(e.target.value)}
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 focus:border-blue-500 focus:bg-white rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none transition-all"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">Database Type</label>
              <select
                value={databaseType}
                onChange={(e) => setDatabaseType(e.target.value)}
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 focus:border-blue-500 rounded-xl text-slate-900 focus:outline-none transition-all focus:bg-white"
              >
                <option value="unknown">Unknown</option>
                <option value="partner_it">Partner IT</option>
                <option value="partner_marketing">Partner Marketing</option>
                <option value="end_user">End User</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">Data Source</label>
              <select
                value={source}
                onChange={(e) => setSource(e.target.value)}
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 focus:border-blue-500 rounded-xl text-slate-900 focus:outline-none transition-all focus:bg-white"
              >
                <option value="manual">Manual Entry</option>
                <option value="databaseout">DatabaseOut</option>
                <option value="old_db">Old Database</option>
                <option value="excel_import">Excel Import</option>
                <option value="event_registration">Event Registration</option>
              </select>
            </div>

            <div className="flex items-center gap-2 pt-6">
              <input
                type="checkbox"
                id="editIsActive"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                className="w-4 h-4 text-blue-600 bg-slate-50 border-slate-200 rounded focus:ring-blue-500"
              />
              <label htmlFor="editIsActive" className="text-sm font-semibold text-slate-700">
                Active (Allowed to target)
              </label>
            </div>
          </div>

          <section className="ms-modal-section space-y-4">
            <div>
              <h4 className="text-sm font-bold text-slate-900">Company Details · Kantor Pusat</h4>
              <p className="text-xs text-slate-500 mt-1">Informasi perusahaan dan kantor pusat ini berlaku untuk semua kontak di perusahaan yang sama. Alamat cabang dikelola melalui Company Details.</p>
              {!selectedCompanyId && !isCreatingNewCompany && <p className="text-xs text-slate-500 mt-1">Pilih atau buat perusahaan untuk mengisi detail perusahaan. Data kontak tetap bisa disimpan tanpa perusahaan.</p>}
            </div>

            <fieldset disabled={submitting || (!selectedCompanyId && !isCreatingNewCompany)} className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Group / Holding</label>
                <select value={selectedGroupId} onChange={(e) => setSelectedGroupId(e.target.value)} className="w-full px-4 py-2.5 bg-white border border-slate-200 focus:border-blue-500 rounded-xl text-slate-900 focus:outline-none">
                  <option value="">No Group (Independent)</option>
                  {groups.map((group) => <option key={group.id} value={group.id}>{group.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Brand Name</label>
                <input value={brandName} onChange={(e) => setBrandName(e.target.value)} placeholder="e.g. Toyota" className="w-full px-4 py-2.5 bg-white border border-slate-200 focus:border-blue-500 rounded-xl text-slate-900 focus:outline-none" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Industry</label>
                <select value={industry} onChange={(e) => setIndustry(e.target.value)} className="w-full px-4 py-2.5 bg-white border border-slate-200 focus:border-blue-500 rounded-xl text-slate-900 focus:outline-none">
                  <option value="">Select Industry</option>
                  {INDUSTRIES.map((item) => <option key={item} value={item}>{item}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Telepon Kantor Pusat</label>
                <input value={officePhone} onChange={(e) => setOfficePhone(e.target.value.replace(/[^0-9+\-()\s]/g, ''))} placeholder="e.g. 021-123456" className="w-full px-4 py-2.5 bg-white border border-slate-200 focus:border-blue-500 rounded-xl text-slate-900 focus:outline-none" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Company Size (Revenue)</label>
                <select value={companySizeRevenue} onChange={(e) => setCompanySizeRevenue(e.target.value)} className="w-full px-4 py-2.5 bg-white border border-slate-200 focus:border-blue-500 rounded-xl text-slate-900 focus:outline-none">
                  <option value="">Select Revenue Size</option>
                  {REVENUE_SIZES.map((item) => <option key={item} value={item}>{item}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Company Size (Employee)</label>
                <select value={companySizeEmployee} onChange={(e) => setCompanySizeEmployee(e.target.value)} className="w-full px-4 py-2.5 bg-white border border-slate-200 focus:border-blue-500 rounded-xl text-slate-900 focus:outline-none">
                  <option value="">Select Employee Size</option>
                  {EMPLOYEE_SIZES.map((item) => <option key={item} value={item}>{item}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Kota Kantor Pusat</label>
                <input value={city} onChange={(e) => setCity(e.target.value)} placeholder="e.g. Jakarta" className="w-full px-4 py-2.5 bg-white border border-slate-200 focus:border-blue-500 rounded-xl text-slate-900 focus:outline-none" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Kode Pos Kantor Pusat</label>
                <input value={postalCode} onChange={(e) => setPostalCode(e.target.value)} placeholder="e.g. 14330" className="w-full px-4 py-2.5 bg-white border border-slate-200 focus:border-blue-500 rounded-xl text-slate-900 focus:outline-none" />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Company Website</label>
                <input value={website} onChange={(e) => setWebsite(e.target.value)} placeholder="e.g. www.company.co.id" className="w-full px-4 py-2.5 bg-white border border-slate-200 focus:border-blue-500 rounded-xl text-slate-900 focus:outline-none" />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Alamat Kantor Pusat</label>
                <textarea value={companyAddress} onChange={(e) => setCompanyAddress(e.target.value)} rows={2} placeholder="Full office address..." className="w-full px-4 py-2.5 bg-white border border-slate-200 focus:border-blue-500 rounded-xl text-slate-900 focus:outline-none resize-none" />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Company Hardware</label>
                <textarea value={companyHardware} onChange={(e) => setCompanyHardware(e.target.value)} rows={2} placeholder="Hardware, servers, laptops, etc." className="w-full px-4 py-2.5 bg-white border border-slate-200 focus:border-blue-500 rounded-xl text-slate-900 focus:outline-none resize-none" />
              </div>
            </fieldset>
          </section>

        </div>
          <div className="ms-modal-footer">
            {onRequestTakeout ? (
              <button
                type="button"
                onClick={() => {
                  onRequestTakeout(database);
                  onClose();
                }}
                className="ms-modal-secondary sm:mr-auto"
                title="Request Data Takeout for this contact"
              >
                <UserX className="w-4 h-4 text-slate-600" />
                Request Takeout
              </button>
            ) : <div />}

            <div className="flex flex-wrap justify-end gap-2 items-center">
              <button
                type="button"
                onClick={onClose}
                className="ms-modal-secondary"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting || (!isCreatingNewCompany && !branchSelection.valid)}
                className="ms-modal-primary"
              >
                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                Save Changes
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
