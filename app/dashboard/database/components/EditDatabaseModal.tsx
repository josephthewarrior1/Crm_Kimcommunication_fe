import React, { useState, useEffect } from 'react';
import { X, Loader2, AlertCircle, CheckCircle } from 'lucide-react';
import { Company, Database } from '../../../../lib/types';
import { crmService } from '../../../../lib/services/crmService';
import { toast } from 'sonner';
import { normalizePhone } from '../utils/phoneHelper';

interface EditDatabaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  database: Database;
  companies: Company[];
  onUpdated: () => void;
}

export const EditDatabaseModal: React.FC<EditDatabaseModalProps> = ({
  isOpen,
  onClose,
  database,
  companies,
  onUpdated
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
  const [isActive, setIsActive] = useState(true);
  const [databaseCompanyEmail, setDatabaseCompanyEmail] = useState('');
  const [databaseCompanyEmailId, setDatabaseCompanyEmailId] = useState('');
  const [databasePersonalEmail, setDatabasePersonalEmail] = useState('');
  const [databasePersonalEmailId, setDatabasePersonalEmailId] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [submitAttempted, setSubmitAttempted] = useState(false);

  useEffect(() => {
    if (!database) return;
    setFirstName(database.firstName || '');
    setLastName(database.lastName || '');
    setSalutation(database.salutation || 'Mr');
    setSelectedCompanyId(database.company?.id ? database.company.id.toString() : '');
    setPositionLevel(database.positionLevel || 'unknown');
    setSpecialityDivision(database.specialityDivision || '');
    setJobTitle(database.jobTitle || '');
    setMobilePhone(database.mobilePhone || '');
    setLinkedinUrl(database.linkedinUrl || '');
    setDatabaseType(database.databaseType || 'unknown');
    setSource(database.source || 'manual');
    setIsActive(database.isActive !== false);
    setSubmitAttempted(false);

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
          const compEmail = emails.find(e => e.isCorporate || e.emailType === 'company');
          if (compEmail) {
            setDatabaseCompanyEmail(compEmail.email);
            setDatabaseCompanyEmailId(compEmail.id.toString());
          }
          const persEmail = emails.find(e => !e.isCorporate && e.emailType === 'personal');
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

  if (!isOpen) return null;

  const handleUpdateDatabase = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitAttempted(true);

    const missing: string[] = [];
    if (!firstName.trim()) missing.push("First Name");
    if (!lastName.trim()) missing.push("Last Name");
    if (!salutation.trim()) missing.push("Salutation");
    if (!jobTitle.trim()) missing.push("Job Title");
    if (!positionLevel || positionLevel === 'unknown' || !positionLevel.trim()) missing.push("Position Level");
    if (!mobilePhone.trim()) missing.push("Mobile Phone");
    if (!databaseCompanyEmail.trim()) missing.push("Company Email");
    if (!databasePersonalEmail.trim()) missing.push("Personal Email");
    if (!selectedCompanyId) missing.push("Associated Company");

    if (missing.length > 0) {
      toast.error(`Harap isi semua kolom wajib: ${missing.join(", ")}`);
      return;
    }

    setSubmitting(true);
    try {
      await crmService.updateDatabase(
        database.id,
        {
          salutation,
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          positionLevel: positionLevel || 'unknown',
          specialityDivision: specialityDivision.trim() || undefined,
          jobTitle: jobTitle.trim() || undefined,
          mobilePhone: mobilePhone.trim() || undefined,
          normalizedPhone: mobilePhone.trim() ? normalizePhone(mobilePhone) : undefined,
          linkedinUrl: linkedinUrl.trim() || undefined,
          databaseType,
          source,
          isActive
        },
        selectedCompanyId ? Number(selectedCompanyId) : undefined
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

  const isFormIncomplete =
    !salutation.trim() ||
    !firstName.trim() ||
    !lastName.trim() ||
    (!positionLevel || positionLevel === 'unknown' || !positionLevel.trim()) ||
    !jobTitle.trim() ||
    !mobilePhone.trim() ||
    !databaseCompanyEmail.trim() ||
    !databasePersonalEmail.trim() ||
    !selectedCompanyId;

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl bg-white border border-slate-200 rounded-2xl p-6 shadow-xl relative max-h-[90vh] overflow-y-auto animate-in scale-in duration-200">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1 text-slate-400 hover:text-slate-600 rounded-lg transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <h3 className="text-xl font-extrabold text-slate-900 mb-6">Edit Database</h3>

        {isFormIncomplete ? (
          <div className="mb-5 p-3.5 bg-red-50 border border-red-200 rounded-xl flex items-start gap-2.5 animate-in fade-in duration-200">
            <AlertCircle className="w-4.5 h-4.5 text-red-500 shrink-0 mt-0.5" />
            <div>
              <h5 className="text-xs font-bold text-red-800">Semua kolom wajib diisi kecuali Division/Speciality, LinkedIn URL, Database Type, dan Data Source</h5>
            </div>
          </div>
        ) : (
          <div className="mb-5 p-3.5 bg-emerald-50 border border-emerald-250 rounded-xl flex items-start gap-2.5 animate-in fade-in duration-200">
            <CheckCircle className="w-4.5 h-4.5 text-emerald-500 shrink-0 mt-0.5" />
            <div>
              <h5 className="text-xs font-bold text-emerald-850">Semua Kolom Wajib Terisi Lengkap</h5>
            </div>
          </div>
        )}

        <form onSubmit={handleUpdateDatabase} className="space-y-5">
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
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">Associated Company <span className="text-red-500 font-bold">*</span></label>
              <select
                value={selectedCompanyId}
                onChange={(e) => setSelectedCompanyId(e.target.value)}
                className={`w-full px-4 py-2.5 rounded-xl text-slate-900 focus:outline-none transition-all ${submitAttempted && !selectedCompanyId
                    ? 'bg-red-50/30 border border-red-500 focus:border-red-500 focus:ring-2 focus:ring-red-500/20'
                    : 'bg-slate-50 border border-slate-200 focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-500/20'
                  }`}
              >
                <option value="">Select a Company</option>
                {companies.map((comp) => (
                  <option key={comp.id} value={comp.id}>
                    {comp.name}
                  </option>
                ))}
              </select>
              {submitAttempted && !selectedCompanyId && (
                <p className="text-red-500 text-[11px] mt-1 font-semibold">Associated Company wajib diisi</p>
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
                placeholder="e.g. IT / Marketing"
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
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">Personal Email <span className="text-red-500 font-bold">*</span></label>
              <input
                type="email"
                placeholder="e.g. name@gmail.com"
                value={databasePersonalEmail}
                onChange={(e) => setDatabasePersonalEmail(e.target.value)}
                className={`w-full px-4 py-2.5 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none transition-all ${submitAttempted && !databasePersonalEmail.trim()
                    ? 'bg-red-50/30 border border-red-500 focus:border-red-500 focus:ring-2 focus:ring-red-500/20'
                    : 'bg-slate-50 border border-slate-200 focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-500/20'
                  }`}
              />
              {submitAttempted && !databasePersonalEmail.trim() && (
                <p className="text-red-500 text-[11px] mt-1 font-semibold">Personal Email wajib diisi</p>
              )}
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

          <div className="flex gap-3 justify-end pt-4 border-t border-slate-100 mt-6">
            <button
              type="button"
              onClick={onClose}
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
  );
};
