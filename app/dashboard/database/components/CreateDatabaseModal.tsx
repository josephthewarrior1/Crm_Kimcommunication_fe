import React, { useState, useEffect } from 'react';
import { X, Loader2, AlertCircle, CheckCircle, Search } from 'lucide-react';
import { Company } from '../../../../lib/types';
import { crmService } from '../../../../lib/services/crmService';
import { toast } from 'sonner';
import { normalizePhone } from '../utils/phoneHelper';

interface CreateDatabaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  companies: Company[];
  onCreated: () => void;
}

export const CreateDatabaseModal: React.FC<CreateDatabaseModalProps> = ({
  isOpen,
  onClose,
  companies,
  onCreated
}) => {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [salutation, setSalutation] = useState('Mr');
  const [selectedCompanyId, setSelectedCompanyId] = useState('');
  const [positionLevel, setPositionLevel] = useState('unknown');
  const [specialityDivision, setSpecialityDivision] = useState('');
  const [jobTitle, setJobTitle] = useState('');
  const [mobilePhone, setMobilePhone] = useState('');
  const [linkedinUrl, setLinkedinUrl] = useState('');
  const [databaseType, setDatabaseType] = useState('unknown');
  const [source, setSource] = useState('manual');
  const [databaseCompanyEmail, setDatabaseCompanyEmail] = useState('');
  const [databasePersonalEmail, setDatabasePersonalEmail] = useState('');
  const [isCreatingNewCompany, setIsCreatingNewCompany] = useState(false);
  const [newCompanyName, setNewCompanyName] = useState('');
  const [companySearchQuery, setCompanySearchQuery] = useState('');
  const [isCompanyDropdownOpen, setIsCompanyDropdownOpen] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [submitAttempted, setSubmitAttempted] = useState(false);

  const resetForm = () => {
    setFirstName('');
    setLastName('');
    setSalutation('Mr');
    setSelectedCompanyId('');
    setPositionLevel('unknown');
    setSpecialityDivision('');
    setJobTitle('');
    setMobilePhone('');
    setLinkedinUrl('');
    setDatabaseType('unknown');
    setSource('manual');
    setDatabaseCompanyEmail('');
    setDatabasePersonalEmail('');
    setIsCreatingNewCompany(false);
    setNewCompanyName('');
    setCompanySearchQuery('');
    setIsCompanyDropdownOpen(false);
    setSubmitAttempted(false);
    setSubmitting(false);
  };

  useEffect(() => {
    if (isOpen) {
      resetForm();
    }
  }, [isOpen]);

  const handleClose = () => {
    resetForm();
    onClose();
  };

  if (!isOpen) return null;

  const filteredCompanies = companies.filter((c) =>
    (c.name || '').toLowerCase().includes((companySearchQuery || '').toLowerCase().trim())
  );

  const handleCreateDatabase = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitAttempted(true);

    const missing: string[] = [];
    if (!firstName.trim()) missing.push("First Name");
    if (!lastName.trim()) missing.push("Last Name");
    if (!salutation.trim()) missing.push("Salutation");
    if (!jobTitle.trim()) missing.push("Job Title");
    if (!mobilePhone.trim()) missing.push("Mobile Phone");
    if (!databaseCompanyEmail.trim()) missing.push("Company Email");
    if (isCreatingNewCompany) {
      if (!newCompanyName.trim()) missing.push("New Company Name");
    } else if (!selectedCompanyId) {
      missing.push("Associated Company");
    }

    if (missing.length > 0) {
      toast.error(`Harap isi semua kolom wajib: ${missing.join(", ")}`);
      return;
    }

    setSubmitting(true);
    try {
      let resolvedCompanyId: number | undefined = selectedCompanyId ? Number(selectedCompanyId) : undefined;
      if (isCreatingNewCompany && newCompanyName.trim()) {
        try {
          const createdComp = await crmService.createCompany({ name: newCompanyName.trim() });
          resolvedCompanyId = createdComp.id;
        } catch (compErr: any) {
          toast.error(`Gagal membuat Perusahaan Baru: ${compErr.message}`);
          setSubmitting(false);
          return;
        }
      }

      const createdDatabase = await crmService.createDatabase(
        {
          salutation,
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          positionLevel: positionLevel || 'unknown',
          specialityDivision: specialityDivision.trim() || undefined,
          jobTitle: jobTitle.trim() || undefined,
          mobilePhone: mobilePhone.trim() ? normalizePhone(mobilePhone) : undefined,
          normalizedPhone: mobilePhone.trim() ? normalizePhone(mobilePhone) : undefined,
          linkedinUrl: linkedinUrl.trim() || undefined,
          databaseType,
          source,
          isActive: true
        },
        resolvedCompanyId
      );

      // Save Company Email if filled
      if (databaseCompanyEmail.trim()) {
        try {
          await crmService.addDatabaseEmail(createdDatabase.id, {
            email: databaseCompanyEmail.trim().toLowerCase(),
            emailType: 'company',
            isPrimary: true,
            isVerified: true,
            isCorporate: true
          });
        } catch (emailErr: any) {
          toast.warning(`Database created, but failed to save company email: ${emailErr.message}`);
        }
      }

      // Save Personal Email if filled
      if (databasePersonalEmail.trim()) {
        try {
          await crmService.addDatabaseEmail(createdDatabase.id, {
            email: databasePersonalEmail.trim().toLowerCase(),
            emailType: 'personal',
            isPrimary: !databaseCompanyEmail.trim(),
            isVerified: true,
            isCorporate: false
          });
        } catch (emailErr: any) {
          toast.warning(`Database created, but failed to save personal email: ${emailErr.message}`);
        }
      }

      toast.success('Database created successfully!');
      onCreated();
      onClose();
    } catch (err: any) {
      toast.error(err.message || 'Failed to create database');
    } finally {
      setSubmitting(false);
    }
  };

  const isFormIncomplete =
    !salutation.trim() ||
    !firstName.trim() ||
    !lastName.trim() ||
    (!positionLevel || positionLevel === 'unknown' || !positionLevel.trim()) ||
    !jobTitle.trim() ||
    !mobilePhone.trim() ||
    !databaseCompanyEmail.trim() ||
    (isCreatingNewCompany ? !newCompanyName.trim() : !selectedCompanyId);

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl bg-white border border-slate-200 rounded-2xl p-6 shadow-xl relative max-h-[90vh] overflow-y-auto animate-in scale-in duration-200">
        <button
          onClick={handleClose}
          className="absolute top-4 right-4 p-1 text-slate-400 hover:text-slate-600 rounded-lg transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <h3 className="text-xl font-extrabold text-slate-900 mb-6">Create New Database</h3>

        {isFormIncomplete ? (
          <div className="mb-5 p-3.5 bg-red-50 border border-red-200 rounded-xl flex items-start gap-2.5 animate-in fade-in duration-200">
            <AlertCircle className="w-4.5 h-4.5 text-red-500 shrink-0 mt-0.5" />
            <div>
              <h5 className="text-xs font-bold text-red-800">Semua kolom wajib diisi kecuali Division/Speciality, LinkedIn URL, Database Type, dan Data Source</h5>
            </div>
          </div>
        ) : (
          <div className="mb-5 p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl flex items-start gap-2.5 animate-in fade-in duration-200">
            <CheckCircle className="w-4.5 h-4.5 text-emerald-500 shrink-0 mt-0.5" />
            <div>
              <h5 className="text-xs font-bold text-emerald-850">Semua Kolom Wajib Terisi Lengkap</h5>
            </div>
          </div>
        )}

        <form onSubmit={handleCreateDatabase} className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">Salutation <span className="text-red-500 font-bold">*</span></label>
              <select
                value={salutation}
                onChange={(e) => setSalutation(e.target.value)}
                className={`w-full px-4 py-2.5 rounded-xl text-slate-900 focus:outline-none transition-all ${submitAttempted && !salutation.trim()
                    ? 'bg-red-50/30 border border-red-500 focus:border-red-500 focus:ring-2 focus:ring-red-500/20'
                    : 'bg-slate-50 border border-slate-200 focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-500/20'
                  }`}
              >
                <option value="Mr">Mr</option>
                <option value="Mrs">Mrs</option>
                <option value="Ms">Ms</option>
                <option value="Dr">Dr</option>
              </select>
            </div>

            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label className="block text-sm font-semibold text-slate-700">
                  Associated Company <span className="text-red-500 font-bold">*</span>
                </label>
                <button
                  type="button"
                  onClick={() => {
                    setIsCreatingNewCompany(!isCreatingNewCompany);
                    setSelectedCompanyId('');
                    setNewCompanyName('');
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
                      value={isCompanyDropdownOpen ? companySearchQuery : (companySearchQuery || (companies.find(c => c.id.toString() === selectedCompanyId)?.name || ''))}
                      onFocus={() => {
                        setCompanySearchQuery('');
                        setIsCompanyDropdownOpen(true);
                      }}
                      onChange={(e) => {
                        setCompanySearchQuery(e.target.value);
                        setIsCompanyDropdownOpen(true);
                        if (selectedCompanyId) setSelectedCompanyId('');
                      }}
                      className={`w-full px-4 py-2.5 pr-10 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none transition-all ${submitAttempted && !selectedCompanyId
                          ? 'bg-red-50/30 border border-red-500 focus:border-red-500 focus:ring-2 focus:ring-red-500/20'
                          : 'bg-slate-50 border border-slate-200 focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-500/20'
                        }`}
                    />
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1 text-slate-400">
                      {(companySearchQuery || selectedCompanyId) ? (
                        <button
                          type="button"
                          onClick={() => {
                            setCompanySearchQuery('');
                            setSelectedCompanyId('');
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
                            setNewCompanyName(companySearchQuery || '');
                            setCompanySearchQuery('');
                            setIsCompanyDropdownOpen(false);
                          }}
                          className="w-full text-left px-3.5 py-2 text-xs font-bold text-blue-600 hover:bg-blue-50 flex items-center gap-2 border-b border-slate-100"
                        >
                          <span>+ Add New Company {companySearchQuery ? `"${companySearchQuery}"` : ''}</span>
                        </button>

                        {filteredCompanies.length === 0 ? (
                          <div className="px-3.5 py-3 text-xs text-slate-400 italic">No matching companies found</div>
                        ) : (
                          filteredCompanies.map((comp) => (
                            <button
                              key={comp.id}
                              type="button"
                              onClick={() => {
                                setSelectedCompanyId(comp.id.toString());
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
              {submitAttempted && (isCreatingNewCompany ? !newCompanyName.trim() : !selectedCompanyId) && (
                <p className="text-red-500 text-[11px] mt-1 font-semibold">
                  {isCreatingNewCompany ? 'Nama Perusahaan Baru wajib diisi' : 'Associated Company wajib diisi'}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">First Name <span className="text-red-500 font-bold">*</span></label>
              <input
                type="text"
                placeholder="e.g. John"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                className={`w-full px-4 py-2.5 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none transition-all ${submitAttempted && !firstName.trim()
                    ? 'bg-red-50/30 border border-red-500 focus:border-red-500 focus:ring-2 focus:ring-red-500/20'
                    : 'bg-slate-50 border border-slate-200 focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-500/20'
                  }`}
              />
              {submitAttempted && !firstName.trim() && (
                <p className="text-red-500 text-[11px] mt-1 font-semibold">First Name wajib diisi</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">Last Name <span className="text-red-500 font-bold">*</span></label>
              <input
                type="text"
                placeholder="e.g. Doe"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                className={`w-full px-4 py-2.5 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none transition-all ${submitAttempted && !lastName.trim()
                    ? 'bg-red-50/30 border border-red-500 focus:border-red-500 focus:ring-2 focus:ring-red-500/20'
                    : 'bg-slate-50 border border-slate-200 focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-500/20'
                  }`}
              />
              {submitAttempted && !lastName.trim() && (
                <p className="text-red-500 text-[11px] mt-1 font-semibold">Last Name wajib diisi</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">Job Title <span className="text-red-500 font-bold">*</span></label>
              <input
                type="text"
                placeholder="e.g. Senior Manager IT"
                value={jobTitle}
                onChange={(e) => setJobTitle(e.target.value)}
                className={`w-full px-4 py-2.5 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none transition-all ${submitAttempted && !jobTitle.trim()
                    ? 'bg-red-50/30 border border-red-500 focus:border-red-500 focus:ring-2 focus:ring-red-500/20'
                    : 'bg-slate-50 border border-slate-200 focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-500/20'
                  }`}
              />
              {submitAttempted && !jobTitle.trim() && (
                <p className="text-red-500 text-[11px] mt-1 font-semibold">Job Title wajib diisi</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">Position Level <span className="text-red-500 font-bold">*</span></label>
              <select
                value={positionLevel}
                onChange={(e) => setPositionLevel(e.target.value)}
                className={`w-full px-4 py-2.5 rounded-xl text-slate-900 focus:outline-none transition-all ${submitAttempted && (!positionLevel || positionLevel === 'unknown' || !positionLevel.trim())
                    ? 'bg-red-50/30 border border-red-500 focus:border-red-500 focus:ring-2 focus:ring-red-500/20'
                    : 'bg-slate-50 border border-slate-200 focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-500/20'
                  }`}
              >
                <option value="unknown">unknown</option>
                <option value="C-level//GM/Director">C-level//GM/Director</option>
                <option value="Manajerial/Head">Manajerial/Head</option>
                <option value="Staff">Staff</option>
              </select>
              {submitAttempted && (!positionLevel || positionLevel === 'unknown' || !positionLevel.trim()) && (
                <p className="text-red-500 text-[11px] mt-1 font-semibold">Position Level wajib diisi (tidak boleh unknown)</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">Division / Speciality</label>
              <input
                type="text"
                placeholder="e.g. Infrastructure / Sales"
                value={specialityDivision}
                onChange={(e) => setSpecialityDivision(e.target.value)}
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 focus:border-blue-500 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none transition-all focus:bg-white"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">Mobile Phone <span className="text-red-500 font-bold">*</span></label>
              <input
                type="text"
                placeholder="e.g. 0812345678"
                value={mobilePhone}
                onChange={(e) => setMobilePhone(e.target.value.replace(/\D/g, ''))}
                className={`w-full px-4 py-2.5 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none transition-all font-mono ${submitAttempted && !mobilePhone.trim()
                    ? 'bg-red-50/30 border border-red-500 focus:border-red-500 focus:ring-2 focus:ring-red-500/20'
                    : 'bg-slate-50 border border-slate-200 focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-500/20'
                  }`}
              />
              {submitAttempted && !mobilePhone.trim() && (
                <p className="text-red-500 text-[11px] mt-1 font-semibold">Mobile Phone wajib diisi</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">Company Email <span className="text-red-500 font-bold">*</span></label>
              <input
                type="email"
                placeholder="e.g. name@company.com"
                value={databaseCompanyEmail}
                onChange={(e) => setDatabaseCompanyEmail(e.target.value)}
                className={`w-full px-4 py-2.5 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none transition-all ${submitAttempted && !databaseCompanyEmail.trim()
                    ? 'bg-red-50/30 border border-red-500 focus:border-red-500 focus:ring-2 focus:ring-red-500/20'
                    : 'bg-slate-50 border border-slate-200 focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-500/20'
                  }`}
              />
              {submitAttempted && !databaseCompanyEmail.trim() && (
                <p className="text-red-500 text-[11px] mt-1 font-semibold">Company Email wajib diisi</p>
              )}
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
          </div>

          <div className="flex gap-3 justify-between pt-4 border-t border-slate-100 mt-6">
            <button
              type="button"
              onClick={resetForm}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-semibold rounded-xl transition-all"
            >
              Reset Form
            </button>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleClose}
                className="px-4 py-2 hover:bg-slate-100 text-slate-600 text-sm font-medium rounded-xl transition-all"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="px-5 py-2 bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white text-sm font-bold rounded-xl flex items-center gap-2 transition-all disabled:opacity-50 shadow-sm"
              >
                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                Save Database
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
