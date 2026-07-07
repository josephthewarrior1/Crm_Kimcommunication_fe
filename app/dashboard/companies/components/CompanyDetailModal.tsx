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
          className="absolute top-4 right-4 p-1 text-slate-400 hover:text-slate-600 rounded-lg transition-colors"
          title="Close"
          type="button"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Title & Brand */}
        <div className="flex items-start gap-4 mb-6 pb-4 border-b border-slate-100">
          <div className="p-3 bg-blue-50 border border-blue-100 text-blue-600 rounded-2xl shrink-0">
            <Building2 className="w-8 h-8" />
          </div>
          <div>
            <h3 className="text-xl font-extrabold text-slate-900">{company.name}</h3>
            {company.brandName && (
              <p className="text-sm font-semibold text-blue-600 mt-0.5">Brand: {company.brandName}</p>
            )}
          </div>
        </div>

        {/* Grid content */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Left section: Metadata */}
          <div className="space-y-4">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <Info className="w-3.5 h-3.5" />
              Company Metadata
            </h4>

            <div className="bg-slate-50/55 border border-slate-150 rounded-2xl p-4 space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <p className="text-slate-400 font-medium">Holding Group</p>
                  <p className="font-bold text-slate-800 mt-0.5">
                    {company.group?.name || (
                      <span className="text-slate-400 font-normal italic">Independent</span>
                    )}
                  </p>
                </div>
                <div>
                  <p className="text-slate-400 font-medium">Industry</p>
                  <p className="font-bold text-slate-800 mt-0.5">{company.industry || '-'}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs pt-2 border-t border-slate-100">
                <div>
                  <p className="text-slate-400 font-medium">Website</p>
                  {company.website ? (
                    <a
                      href={
                        company.website.startsWith('http')
                          ? company.website
                          : `https://${company.website}`
                      }
                      target="_blank"
                      rel="noreferrer"
                      className="font-bold text-blue-600 hover:text-blue-500 transition-colors block mt-0.5 break-all"
                    >
                      {company.website}
                    </a>
                  ) : (
                    <p className="text-slate-400 italic mt-0.5">-</p>
                  )}
                </div>
                <div>
                  <p className="text-slate-400 font-medium">Office Phone</p>
                  <p className="font-bold text-slate-800 mt-0.5 font-mono">
                    {company.officePhone || '-'}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs pt-2 border-t border-slate-100">
                <div>
                  <p className="text-slate-400 font-medium">Revenue Size</p>
                  <p className="font-bold text-slate-800 mt-0.5">
                    {company.companySizeRevenue || '-'}
                  </p>
                </div>
                <div>
                  <p className="text-slate-400 font-medium">Employee Count (Est.)</p>
                  <p className="font-bold text-slate-800 mt-0.5">
                    {company.companySizeEmployee || '-'}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs pt-2 border-t border-slate-100">
                <div>
                  <p className="text-slate-400 font-medium">CRM Registered Databases</p>
                  <p className="font-bold text-blue-600 mt-0.5 flex items-center gap-1">
                    <Users className="w-3.5 h-3.5" />
                    {associatedDatabases.length} People
                  </p>
                </div>
                <div>{/* Reserved */}</div>
              </div>

              <div className="grid grid-cols-1 gap-2 text-xs pt-2 border-t border-slate-100">
                <div>
                  <p className="text-slate-400 font-medium">City / Address</p>
                  {company.city && (
                    <p className="font-bold text-slate-850 mt-0.5">
                      {company.city} {company.postalCode ? `- ${company.postalCode}` : ''}
                    </p>
                  )}
                  {!company.city && company.postalCode && (
                    <p className="font-bold text-slate-850 mt-0.5">
                      Postal Code: {company.postalCode}
                    </p>
                  )}
                  <p className="text-slate-655 mt-1 leading-relaxed">
                    {company.address || (
                      <span className="text-slate-400 italic font-normal">
                        No address provided.
                      </span>
                    )}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Right section: Technology / Hardware info */}
          <div className="space-y-4">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5" />
              Infrastructure & Hardware
            </h4>

            <div className="bg-slate-50/55 border border-slate-150 rounded-2xl p-4 min-h-[180px] text-xs">
              {company.companyHardware ? (
                <p className="text-slate-700 whitespace-pre-wrap leading-relaxed">
                  {company.companyHardware}
                </p>
              ) : (
                <p className="text-slate-400 italic">No hardware / server specs recorded.</p>
              )}
            </div>
          </div>
        </div>

        {/* Bottom section: Associated Databases (Employees) */}
        <div className="mt-8 pt-6 border-t border-slate-100 space-y-4">
          <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
            <Users className="w-4 h-4 text-blue-500" />
            Employees list ({associatedDatabases.length} People)
          </h4>

          {associatedDatabases.length === 0 ? (
            <div className="p-8 text-center bg-slate-55 border border-slate-150 rounded-2xl">
              <Users className="w-8 h-8 text-slate-400 mx-auto mb-2" />
              <p className="text-xs text-slate-500 font-medium">
                No databases associated with this company yet.
              </p>
            </div>
          ) : (
            <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-sm bg-white">
              <div className="overflow-x-auto max-h-[220px] overflow-y-auto animate-in fade-in duration-100">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50/50 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                      <th className="py-2.5 px-4">Name</th>
                      <th className="py-2.5 px-4">Job Title / Level</th>
                      <th className="py-2.5 px-4">Mobile Phone</th>
                      <th className="py-2.5 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs text-slate-750">
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
                          <td className="py-3 px-4 font-medium text-slate-650">
                            {database.jobTitle || '-'}
                            {database.positionLevel && database.positionLevel !== 'unknown' && (
                              <span className="text-[10px] text-slate-400 font-normal block mt-0.5">
                                Level: {database.positionLevel}
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-4 font-mono text-slate-600">
                            {database.mobilePhone || '-'}
                          </td>
                          <td className="py-3 px-4 text-right">
                            <button
                              onClick={() => onGoToEmployeeDetails(fullName)}
                              className="inline-flex items-center gap-1 px-2.5 py-1 bg-blue-50 hover:bg-blue-100 text-blue-605 text-xs font-bold rounded-lg border border-blue-100 transition-all cursor-pointer shadow-sm"
                              type="button"
                            >
                              <span>Go to Details</span>
                              <ExternalLink className="w-3 h-3" />
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

        {/* Footer */}
        <div className="flex justify-end gap-3 pt-6 mt-6 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 bg-slate-105 hover:bg-slate-200 active:bg-slate-200 text-slate-700 text-sm font-bold rounded-xl transition-all"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
