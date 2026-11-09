import React, { useState, useEffect } from 'react';
import { X, Loader2, AlertCircle, CheckCircle, Search } from 'lucide-react';
import { Company } from '../../../../lib/types';
import { crmService } from '../../../../lib/services/crmService';
import { auditLogService } from '../../../../lib/services/auditLogService';
import { useAuth } from '../../../../lib/context/AuthContext';
import { toast } from 'sonner';
import { normalizePhone, normalizePhoneList } from '../utils/phoneHelper';
import { isPersonalContactEmail, isValidContactEmail, isValidContactPhone } from '../utils/emailCategory';
import { CompanyBranchSelect, useCompanyBranches } from './CompanyBranchSelect';

interface CreateDatabaseModalProps {
  initialDestination?: 'company' | 'participant';
  isOpen: boolean;
  onClose: () => void;
  companies: Company[];
  onCreated: () => void;
}

export const CreateDatabaseModal: React.FC<CreateDatabaseModalProps> = ({
  initialDestination = 'company',
  isOpen,
  onClose,
  companies,
  onCreated
}) => {
  const { user } = useAuth();
  const [destination, setDestination] = useState<'company' | 'participant'>(initialDestination);
  const [institutionName, setInstitutionName] = useState('');
  const [participantCategory, setParticipantCategory] = useState('');
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
  const [databaseCompanyEmail, setDatabaseCompanyEmail] = useState('');
  const [databasePersonalEmail, setDatabasePersonalEmail] = useState('');
  const [isCreatingNewCompany, setIsCreatingNewCompany] = useState(false);
  const [newCompanyName, setNewCompanyName] = useState('');
  const [companySearchQuery, setCompanySearchQuery] = useState('');
  const [isCompanyDropdownOpen, setIsCompanyDropdownOpen] = useState(false);
  const [companyOptions, setCompanyOptions] = useState<Company[]>([]);
  const [companyOptionsLoading, setCompanyOptionsLoading] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const branchSelection = useCompanyBranches(isOpen && !isCreatingNewCompany ? selectedCompanyId : '', selectedBranchId);

  const resetForm = (nextDestination: 'company' | 'participant') => {
    setDestination(nextDestination);
    setInstitutionName('');
    setParticipantCategory('');
    setFirstName('');
    setLastName('');
    setSalutation('');
    setSelectedCompanyId('');
    setSelectedBranchId('');
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
      resetForm(initialDestination);
    }
  }, [isOpen, initialDestination]);

  useEffect(() => {
    if (!isOpen || destination === 'participant' || isCreatingNewCompany) return;
    void loadCompanyOptions(companySearchQuery);
  }, [isOpen, destination, isCreatingNewCompany, companySearchQuery]);

  const handleClose = () => {
    resetForm(initialDestination);
    onClose();
  };

  if (!isOpen) return null;

  const selectedCompany = companies.find((c) => c.id.toString() === selectedCompanyId)
    || companyOptions.find((c) => c.id.toString() === selectedCompanyId);

  const isPersonalProfile = destination === 'participant';
  const hasCompanyEmail = isValidContactEmail(databaseCompanyEmail) && !isPersonalContactEmail(databaseCompanyEmail);
  const companySelectionMissing = !isPersonalProfile && (isCreatingNewCompany
    ? !newCompanyName.trim() : !selectedCompanyId);
  const missing: string[] = [];
  if (!isPersonalProfile && !firstName.trim()) missing.push('First Name');
  if (isPersonalProfile && ![databaseCompanyEmail, databasePersonalEmail].some(isValidContactEmail) && !isValidContactPhone(mobilePhone)) missing.push('Email atau HP/WhatsApp valid');
  if (!isPersonalProfile) {
    if (!lastName.trim()) missing.push('Last Name');
    if (!salutation.trim()) missing.push('Salutation');
    if (!jobTitle.trim()) missing.push('Job Title');
    if (!mobilePhone.trim()) missing.push('Mobile Phone');
    if (!hasCompanyEmail) missing.push('Company Email perusahaan yang valid');
  }
  if (companySelectionMissing) missing.push(isCreatingNewCompany ? 'New Company Name' : 'Associated Company');
  const invalidCompanyEmail = !!databaseCompanyEmail.trim() && !isValidContactEmail(databaseCompanyEmail);
  const invalidPersonalEmail = !!databasePersonalEmail.trim() && !isValidContactEmail(databasePersonalEmail);
  const invalidMobilePhone = !!mobilePhone.trim() && (!isValidContactPhone(mobilePhone) || normalizePhoneList(mobilePhone).length > 50);
  const isFormIncomplete = missing.length > 0 || invalidCompanyEmail || invalidPersonalEmail || invalidMobilePhone;

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

  const handleCreateDatabase = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    setSubmitAttempted(true);
    if (!isPersonalProfile && !isCreatingNewCompany && !branchSelection.valid) {
      toast.error('Tunggu daftar cabang dimuat, lalu periksa pilihan cabang sebelum menyimpan.');
      return;
    }

    if (invalidMobilePhone) {
      toast.error('Periksa nomor HP/WhatsApp. Pisahkan beberapa nomor dengan koma; maksimal 50 karakter setelah dirapikan.');
      return;
    }

    if (invalidCompanyEmail || invalidPersonalEmail) {
      toast.error('Periksa format email yang diisi sebelum menyimpan.');
      return;
    }

    if (missing.length > 0) {
      if (!isPersonalProfile && isPersonalContactEmail(databaseCompanyEmail)) {
        toast.error('Email pribadi masuk melalui Database Peserta. Pilih tujuan Peserta atau gunakan email institusi/perusahaan.');
        return;
      }
      toast.error(`Harap isi semua kolom wajib: ${missing.join(", ")}`);
      return;
    }

    setSubmitting(true);
    try {
      let resolvedCompanyId: number | undefined = !isPersonalProfile && selectedCompanyId ? Number(selectedCompanyId) : undefined;
      if (!isPersonalProfile && isCreatingNewCompany && newCompanyName.trim()) {
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
          databaseDestination: destination,
          institutionName: institutionName.trim(),
          participantCategory,
          salutation,
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          positionLevel: positionLevel || 'unknown',
          specialityDivision: specialityDivision.trim() || undefined,
          jobTitle: jobTitle.trim() || undefined,
          mobilePhone: mobilePhone.trim() ? normalizePhoneList(mobilePhone) : undefined,
          normalizedPhone: mobilePhone.trim() ? normalizePhone(mobilePhone) : undefined,
          linkedinUrl: linkedinUrl.trim() || undefined,
          databaseType,
          source,
          isActive: true,
          emails: isPersonalProfile ? [databasePersonalEmail, databaseCompanyEmail]
            .filter(address => address.trim()).map((address, index) => ({
              email: address.trim().toLowerCase(), emailType: 'personal', isCorporate: false,
              isPrimary: index === 0, isVerified: true,
            })) : undefined,
        },
        resolvedCompanyId,
        !isPersonalProfile && !isCreatingNewCompany && selectedBranchId ? Number(selectedBranchId) : null
      );
      let emailSaveFailed = false;

      // Save Company Email if filled
      if (!isPersonalProfile && databaseCompanyEmail.trim()) {
        try {
          await crmService.addDatabaseEmail(createdDatabase.id, {
            email: databaseCompanyEmail.trim().toLowerCase(),
            emailType: 'company',
            isPrimary: true,
            isVerified: true,
            isCorporate: true
          });
        } catch (emailErr: any) {
          emailSaveFailed = true;
          toast.warning(`Database created, but failed to save company email: ${emailErr.message}`);
        }
      }

      // Save Personal Email if filled
      if (!isPersonalProfile && databasePersonalEmail.trim()) {
        try {
          await crmService.addDatabaseEmail(createdDatabase.id, {
            email: databasePersonalEmail.trim().toLowerCase(),
            emailType: 'personal',
            isPrimary: !databaseCompanyEmail.trim(),
            isVerified: true,
            isCorporate: false
          });
        } catch (emailErr: any) {
          emailSaveFailed = true;
          toast.warning(`Database created, but failed to save personal email: ${emailErr.message}`);
        }
      }

      // Record audit log
      if (user) {
        auditLogService.recordLog({
          userId: user.id,
          username: user.username,
          userFullName: user.fullName,
          userRole: user.roles?.[0] || 'USER',
          module: 'DATABASE',
          actionType: 'CREATE',
          targetId: createdDatabase.id,
          targetName: `${firstName.trim()} ${lastName.trim()}`,
          description: `Menambahkan kontak database baru '${firstName.trim()} ${lastName.trim()}' (Jabatan: ${jobTitle.trim() || '-'}).`
        });
      }

      if (!emailSaveFailed) toast.success(isPersonalProfile ? 'Profil peserta berhasil disimpan.' : 'Database created successfully!');
      onCreated();
      onClose();
    } catch (err: any) {
      toast.error(err.message || 'Failed to create database');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="ms-modal-overlay">
      <div className="ms-modal w-full max-w-2xl">
        <div className="ms-modal-header">
        <button
          onClick={handleClose}
          className="ms-modal-close"
        >
          <X className="w-5 h-5" />
        </button>

        <h3 className="ms-modal-title">Create New Database</h3>
        </div>

        <form onSubmit={handleCreateDatabase} className="ms-modal-form">
        <div className="ms-modal-body space-y-5">

        <label className="block text-sm font-semibold text-slate-700">Tujuan database
          <select aria-label="Tujuan database" value={destination} onChange={event => {
            setDestination(event.target.value as 'company' | 'participant');
            setSelectedCompanyId(''); setSelectedBranchId(''); setIsCreatingNewCompany(false); setNewCompanyName(''); setCompanySearchQuery('');
          }} className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5">
            <option value="company">Database Perusahaan</option>
            <option value="participant">Database Peserta</option>
          </select>
        </label>
        <p className="text-xs leading-5 text-slate-600">Tujuan mengikuti pilihan ini. Peserta cukup memiliki email valid atau HP/WhatsApp. Nama boleh dilengkapi belakangan; nama kosong tetap tersimpan sebagai Data Kotor. Email pribadi, kampus, atau kantor diterima.</p>
        {isPersonalProfile && <div className="grid gap-4 md:grid-cols-2">
          <label className="text-sm font-semibold text-slate-700">Sekolah/Kampus/Instansi
            <input placeholder="Nama sekolah, kampus, atau instansi (opsional)" value={institutionName} onChange={event => setInstitutionName(event.target.value)} className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 font-normal" />
          </label>
          <label className="text-sm font-semibold text-slate-700">Kategori peserta
            <select aria-label="Kategori peserta" value={participantCategory} onChange={event => setParticipantCategory(event.target.value)} className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 font-normal">
              <option value="">Belum dikategorikan</option><option value="pelajar">Pelajar</option><option value="mahasiswa">Mahasiswa</option><option value="umum">Umum</option>
            </select>
          </label>
        </div>}

        {isFormIncomplete ? (
          <div className="mb-5 p-3.5 bg-red-50 border border-red-200 rounded-xl flex items-start gap-2.5 animate-in fade-in duration-200">
            <AlertCircle className="w-4.5 h-4.5 text-red-500 shrink-0 mt-0.5" />
            <div>
              <h5 className="text-xs font-bold text-red-800">Lengkapi kolom bertanda *. Cabang / Kantor bersifat opsional.</h5>
            </div>
          </div>
        ) : (
          <div className="mb-5 p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl flex items-start gap-2.5 animate-in fade-in duration-200">
            <CheckCircle className="w-4.5 h-4.5 text-emerald-500 shrink-0 mt-0.5" />
            <div>
              <h5 className="text-xs font-bold text-emerald-850">{isPersonalProfile ? [firstName, lastName].some(name => name.trim()) ? 'Kontak peserta valid; siap disimpan' : 'Bisa disimpan sebagai Data Kotor; nama dapat dilengkapi nanti' : 'Semua Kolom Wajib Terisi Lengkap'}</h5>
            </div>
          </div>
        )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">Salutation {!isPersonalProfile && <span className="text-red-500 font-bold">*</span>}</label>
              <select
                value={salutation}
                onChange={(e) => setSalutation(e.target.value)}
                className={`w-full px-4 py-2.5 rounded-xl text-slate-900 focus:outline-none transition-all ${submitAttempted && !isPersonalProfile && !salutation.trim()
                    ? 'bg-red-50/30 border border-red-500 focus:border-red-500 focus:ring-2 focus:ring-red-500/20'
                    : 'bg-slate-50 border border-slate-200 focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-500/20'
                  }`}
              >
                <option value="">Belum diisi</option>
                <option value="Mr">Mr</option>
                <option value="Mrs">Mrs</option>
                <option value="Ms">Ms</option>
                <option value="Dr">Dr</option>
              </select>
            </div>

            {!isPersonalProfile && <div>
              <div className="flex flex-wrap justify-between items-center gap-2 mb-1.5">
                <label className="block text-sm font-semibold text-slate-700">
                  Associated Company {(!isPersonalProfile || isCreatingNewCompany) && <span className="text-red-500 font-bold">*</span>}
                </label>
                <button
                  type="button"
                  onClick={() => {
                    setIsCreatingNewCompany(!isCreatingNewCompany);
                    setSelectedCompanyId('');
                    setSelectedBranchId('');
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
                      className={`w-full px-4 py-2.5 pr-10 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none transition-all ${submitAttempted && companySelectionMissing
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
              {submitAttempted && companySelectionMissing && (
                <p className="text-red-500 text-[11px] mt-1 font-semibold">
                  {isCreatingNewCompany ? 'Nama Perusahaan Baru wajib diisi' : isPersonalProfile ? 'Pilih Associated Company atau kosongkan pencarian untuk kontak personal' : 'Associated Company wajib diisi'}
                </p>
              )}
            </div>}

            {!isPersonalProfile && <CompanyBranchSelect companyId={selectedCompanyId} value={selectedBranchId} onChange={setSelectedBranchId} selection={branchSelection} creatingCompany={isCreatingNewCompany} disabled={submitting} />}

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">First Name {!isPersonalProfile && <span className="text-red-500 font-bold">*</span>}</label>
              <input
                type="text"
                placeholder="e.g. John"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                className={`w-full px-4 py-2.5 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none transition-all ${submitAttempted && !isPersonalProfile && !firstName.trim()
                    ? 'bg-red-50/30 border border-red-500 focus:border-red-500 focus:ring-2 focus:ring-red-500/20'
                    : 'bg-slate-50 border border-slate-200 focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-500/20'
                  }`}
              />
              {submitAttempted && !isPersonalProfile && !firstName.trim() && (
                <p className="text-red-500 text-[11px] mt-1 font-semibold">First Name wajib diisi</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">Last Name {!isPersonalProfile && <span className="text-red-500 font-bold">*</span>}</label>
              <input
                type="text"
                placeholder="e.g. Doe"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                className={`w-full px-4 py-2.5 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none transition-all ${submitAttempted && !isPersonalProfile && !lastName.trim()
                    ? 'bg-red-50/30 border border-red-500 focus:border-red-500 focus:ring-2 focus:ring-red-500/20'
                    : 'bg-slate-50 border border-slate-200 focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-500/20'
                  }`}
              />
              {submitAttempted && !isPersonalProfile && !lastName.trim() && (
                <p className="text-red-500 text-[11px] mt-1 font-semibold">Last Name wajib diisi</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">Job Title {!isPersonalProfile && <span className="text-red-500 font-bold">*</span>}</label>
              <input
                type="text"
                placeholder="e.g. Senior Manager IT"
                value={jobTitle}
                onChange={(e) => setJobTitle(e.target.value)}
                className={`w-full px-4 py-2.5 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none transition-all ${submitAttempted && !isPersonalProfile && !jobTitle.trim()
                    ? 'bg-red-50/30 border border-red-500 focus:border-red-500 focus:ring-2 focus:ring-red-500/20'
                    : 'bg-slate-50 border border-slate-200 focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-500/20'
                  }`}
              />
              {submitAttempted && !isPersonalProfile && !jobTitle.trim() && (
                <p className="text-red-500 text-[11px] mt-1 font-semibold">Job Title wajib diisi</p>
              )}
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
                placeholder="e.g. Infrastructure / Sales"
                value={specialityDivision}
                onChange={(e) => setSpecialityDivision(e.target.value)}
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 focus:border-blue-500 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none transition-all focus:bg-white"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">Mobile Phone {!isPersonalProfile && <span className="text-red-500 font-bold">*</span>}</label>
              <input
                type="text"
                placeholder="e.g. 0812345678"
                value={mobilePhone}
                onChange={(e) => setMobilePhone(e.target.value)}
                className={`w-full px-4 py-2.5 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none transition-all font-mono ${submitAttempted && !isPersonalProfile && !mobilePhone.trim()
                    ? 'bg-red-50/30 border border-red-500 focus:border-red-500 focus:ring-2 focus:ring-red-500/20'
                    : 'bg-slate-50 border border-slate-200 focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-500/20'
                  }`}
              />
              {submitAttempted && !isPersonalProfile && !mobilePhone.trim() && (
                <p className="text-red-500 text-[11px] mt-1 font-semibold">Mobile Phone wajib diisi</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">{isPersonalProfile ? 'Email tambahan (opsional)' : 'Company Email'} {!isPersonalProfile && <span className="text-red-500 font-bold">*</span>}</label>
              <input
                type="email"
                placeholder="e.g. name@company.com"
                value={databaseCompanyEmail}
                onChange={(e) => setDatabaseCompanyEmail(e.target.value)}
                className={`w-full px-4 py-2.5 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none transition-all ${submitAttempted && (invalidCompanyEmail || (!isPersonalProfile && !hasCompanyEmail))
                    ? 'bg-red-50/30 border border-red-500 focus:border-red-500 focus:ring-2 focus:ring-red-500/20'
                    : 'bg-slate-50 border border-slate-200 focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-500/20'
                  }`}
              />
              {submitAttempted && (invalidCompanyEmail || (!isPersonalProfile && !hasCompanyEmail)) && (
                <p className="text-red-500 text-[11px] mt-1 font-semibold">{invalidCompanyEmail ? 'Format Company Email tidak valid' : 'Isi email perusahaan yang valid untuk kontak korporat'}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">{isPersonalProfile ? 'Email Peserta' : 'Personal Email'} {isPersonalProfile && !isValidContactEmail(databaseCompanyEmail) && !isValidContactPhone(mobilePhone) ? <span className="text-red-500 font-bold">*</span> : <span className="text-slate-400 font-normal text-xs">(Optional)</span>}</label>
              <input
                type="email"
                placeholder="e.g. name@gmail.com"
                value={databasePersonalEmail}
                onChange={(e) => setDatabasePersonalEmail(e.target.value)}
                className={`w-full px-4 py-2.5 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none transition-all ${submitAttempted && invalidPersonalEmail ? 'bg-red-50/30 border border-red-500 focus:border-red-500 focus:ring-2 focus:ring-red-500/20' : 'bg-slate-50 border border-slate-200 focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-500/20'}`}
              />
              {submitAttempted && invalidPersonalEmail && <p className="text-red-500 text-[11px] mt-1 font-semibold">Format Personal Email tidak valid</p>}
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

        </div>
          <div className="ms-modal-footer">
            <button
              type="button"
              onClick={() => resetForm(destination)}
              className="ms-modal-secondary sm:mr-auto"
            >
              Reset Form
            </button>
            <div className="flex flex-wrap justify-end gap-2">
              <button
                type="button"
                onClick={handleClose}
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
                Save Database
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
