import React from 'react';
import { X, Building2, Info, Users, Globe, Phone, MapPin, ExternalLink } from 'lucide-react';
import { Company, Database } from '../../../../lib/types';

interface CompanyDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  company: Company;
  databases: Database[];
  onGoToEmployeeDetails: (fullName: string) => void;
}

export const CompanyDetailModal: React.FC<CompanyDetailModalProps> = ({
  isOpen,
  onClose,
  company,
  databases,
  onGoToEmployeeDetails
}) => {
  if (!isOpen) return null;

  const associatedDatabases = databases.filter(
    (c) => c.company?.id === company.id && c.isActive
  );

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="w-full max-w-3xl bg-white border border-slate-200 rounded-2xl p-6 shadow-xl relative max-h-[90vh] overflow-y-auto animate-in scale-in duration-200 text-slate-900">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-lg transition-all"
          title="Close"
          type="button"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header Section */}
        <div className="flex items-start gap-4 mb-6 pb-4 border-b border-slate-100">
          <div className="p-3 bg-gradient-to-tr from-blue-600 to-indigo-600 text-white rounded-2xl shrink-0 shadow-md shadow-blue-500/10">
            <Building2 className="w-7 h-7" />
          </div>
          <div>
            <h3 className="text-xl font-black text-slate-900 tracking-tight">{company.name}</h3>
            {company.brandName && (
              <p className="text-xs font-semibold text-blue-600 mt-1">Brand: {company.brandName}</p>
            )}
          </div>
        </div>

        {/* Grid Content */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Left Column: Overview and CRM Metrics */}
          <div className="space-y-5">
            {/* Overview Card */}
            <div className="bg-slate-50/40 border border-slate-100 rounded-2xl p-5 space-y-4">
              <h4 className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <Info className="w-3.5 h-3.5 text-blue-500" />
                Company Overview
              </h4>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Holding Group</p>
                  <div className="mt-1">
                    {company.group?.name ? (
                      <span className="inline-flex px-2 py-0.5 text-[10px] font-bold bg-blue-50 border border-blue-100 text-blue-650 rounded-md">
                        {company.group.name}
                      </span>
                    ) : (
                      <span className="inline-flex px-2 py-0.5 text-[10px] font-medium bg-slate-100 border border-slate-200 text-slate-500 rounded-md italic">
                        Independent
                      </span>
                    )}
                  </div>
                </div>
                <div>
                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Industry</p>
                  <p className="text-xs font-bold text-slate-800 mt-1.5">{company.industry || '-'}</p>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100/80">
                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">City / Location</p>
                <p className="text-xs font-bold text-slate-800 mt-1.5 flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span>{company.city || '-'} {company.postalCode ? `(${company.postalCode})` : ''}</span>
                </p>
                {company.address && (
                  <p className="text-xs text-slate-500 mt-2 bg-white/70 p-2.5 rounded-lg border border-slate-100 leading-relaxed italic">
                    "{company.address}"
                  </p>
                )}
              </div>
            </div>

            {/* Scale Card */}
            <div className="bg-slate-50/40 border border-slate-100 rounded-2xl p-5 space-y-4">
              <h4 className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-indigo-500" />
                Scale & CRM Metrics
              </h4>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Revenue Size</p>
                  <p className="text-xs font-black text-slate-800 mt-1.5">{company.companySizeRevenue || '-'}</p>
                </div>
                <div>
                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Employee Size</p>
                  <p className="text-xs font-black text-slate-800 mt-1.5">{company.companySizeEmployee || '-'}</p>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100/80">
                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">CRM Registered Contacts</p>
                <div className="mt-1.5">
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-indigo-50 border border-indigo-100 text-indigo-650 rounded-lg text-[10px] font-black uppercase tracking-wider shadow-sm">
                    <Users className="w-3.5 h-3.5" />
                    {associatedDatabases.length} Databases
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Channels and Infrastructure */}
          <div className="space-y-5">
            {/* Contact Channels */}
            <div className="bg-slate-50/40 border border-slate-100 rounded-2xl p-5 space-y-4">
              <h4 className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <Globe className="w-3.5 h-3.5 text-emerald-500" />
                Channels & Contact Info
              </h4>

              <div className="space-y-3.5">
                <div>
                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Official Website</p>
                  {company.website ? (
                    <a
                      href={company.website.startsWith('http') ? company.website : `https://${company.website}`}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-600 hover:text-blue-500 hover:underline mt-1.5 break-all transition-all"
                    >
                      <Globe className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                      <span>{company.website}</span>
                      <ExternalLink className="w-3.5 h-3.5 text-blue-400" />
                    </a>
                  ) : (
                    <p className="text-xs text-slate-400 italic mt-1.5">-</p>
                  )}
                </div>

                <div className="pt-3 border-t border-slate-100/80">
                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Office Telephone</p>
                  {company.officePhone ? (
                    <p className="text-xs font-bold text-slate-800 mt-1.5 flex items-center gap-1.5 font-mono">
                      <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span>{company.officePhone}</span>
                    </p>
                  ) : (
                    <p className="text-xs text-slate-400 italic mt-1.5">-</p>
                  )}
                </div>
              </div>
            </div>

            {/* Tech Specs */}
            <div className="bg-slate-50/40 border border-slate-100 rounded-2xl p-5 space-y-3 flex flex-col min-h-[178px]">
              <h4 className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-slate-500" />
                Infrastructure & Hardware
              </h4>

              <div className="flex-1 bg-white border border-slate-100 rounded-xl p-3 text-xs overflow-y-auto max-h-[120px]">
                {company.companyHardware ? (
                  <p className="text-slate-700 whitespace-pre-wrap leading-relaxed">
                    {company.companyHardware}
                  </p>
                ) : (
                  <p className="text-slate-400 italic">No hardware or specs recorded.</p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Associated Employees */}
        <div className="mt-8 pt-6 border-t border-slate-100 space-y-4">
          <h4 className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
            <Users className="w-4 h-4 text-blue-500" />
            Associated Contacts List ({associatedDatabases.length} People)
          </h4>

          {associatedDatabases.length === 0 ? (
            <div className="p-8 text-center bg-slate-50/40 border border-slate-100 rounded-2xl">
              <Users className="w-8 h-8 text-slate-350 mx-auto mb-2" />
              <p className="text-xs text-slate-500 font-medium">
                No databases associated with this company yet.
              </p>
            </div>
          ) : (
            <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-sm bg-white">
              <div className="overflow-x-auto max-h-[220px] overflow-y-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50/50 text-[10px] font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">
                      <th className="py-2.5 px-4">Name</th>
                      <th className="py-2.5 px-4">Job Title / Level</th>
                      <th className="py-2.5 px-4">Mobile Phone</th>
                      <th className="py-2.5 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                    {associatedDatabases.map((database) => {
                      const fullName = `${database.firstName} ${database.lastName}`;
                      return (
                        <tr key={database.id} className="hover:bg-slate-50/30 transition-colors">
                          <td className="py-3 px-4 font-bold text-slate-900">
                            {database.salutation && (
                              <span className="text-slate-400 font-normal mr-1">
                                {database.salutation}
                              </span>
                            )}
                            {fullName}
                          </td>
                          <td className="py-3 px-4 font-medium text-slate-500">
                            {database.jobTitle || '-'}
                            {database.positionLevel && database.positionLevel !== 'unknown' && (
                              <span className="text-[10px] text-slate-400 font-normal block mt-0.5">
                                Level: {database.positionLevel}
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-4 font-mono text-slate-550">
                            {database.mobilePhone || '-'}
                          </td>
                          <td className="py-3 px-4 text-right whitespace-nowrap">
                            <button
                              onClick={() => onGoToEmployeeDetails(fullName)}
                              className="inline-flex items-center gap-1 px-3 py-1 bg-slate-100 hover:bg-slate-200/85 active:bg-slate-200 text-slate-700 text-[10px] font-bold rounded-lg border border-slate-200/50 shadow-sm transition-all cursor-pointer"
                              type="button"
                            >
                              <span>Go to Details</span>
                              <ExternalLink className="w-3 h-3 text-slate-500" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex justify-end gap-3 pt-6 mt-6 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-bold rounded-xl transition-all"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
