import React from 'react';
import { X, FolderTree, Building2, MapPin, Globe, ExternalLink } from 'lucide-react';
import { Group, Company } from '../../../../lib/types';

interface GroupDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  group: Group;
  companies: Company[];
  onGoToCompanyDetails: (companyName: string) => void;
}

export const GroupDetailModal: React.FC<GroupDetailModalProps> = ({
  isOpen,
  onClose,
  group,
  companies,
  onGoToCompanyDetails
}) => {
  if (!isOpen) return null;

  const groupSubsidiaries = companies.filter(c => c.group?.id === group.id);

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

        <div className="flex items-center gap-2 mb-4 text-blue-600">
          <FolderTree className="w-6 h-6" />
          <h3 className="text-xl font-extrabold text-slate-900">Holding Group Details</h3>
        </div>

        <div className="space-y-6">
          {/* Group Metadata */}
          <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl space-y-3">
            <div>
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider text-[10px]">Group Name</h4>
              <p className="text-base font-extrabold text-slate-800 mt-0.5">{group.name}</p>
            </div>
            <div>
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider text-[10px]">Notes / Descriptions</h4>
              <p className="text-sm text-slate-700 mt-1 whitespace-pre-wrap">
                {group.notes || <span className="text-slate-400 italic">No notes written.</span>}
              </p>
            </div>
          </div>

          {/* Group Companies List */}
          <div>
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 text-[10px]">
              Daftar Perusahaan (Group Companies)
            </h4>
            
            {groupSubsidiaries.length === 0 ? (
              <div className="text-center py-8 border border-dashed border-slate-200 rounded-xl bg-slate-50/50">
                <Building2 className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                <p className="text-xs text-slate-500 font-semibold">No companies linked to this group yet.</p>
              </div>
            ) : (
              <div className="border border-slate-200 rounded-xl overflow-hidden divide-y divide-slate-100 bg-white shadow-sm">
                {groupSubsidiaries.map((company) => (
                  <div key={company.id} className="p-3.5 flex items-center justify-between hover:bg-slate-55 transition-all">
                    <div className="space-y-1">
                      <h5 className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
                        <Building2 className="w-4 h-4 text-slate-450" />
                        {company.name}
                      </h5>
                      <div className="flex items-center gap-2 flex-wrap text-xs text-slate-500">
                        {company.brandName && (
                          <span className="font-semibold text-blue-605">Brand: {company.brandName}</span>
                        )}
                        {company.brandName && <span className="text-slate-300">•</span>}
                        {company.city && (
                          <span className="flex items-center gap-0.5">
                            <MapPin className="w-3.5 h-3.5 text-slate-405" />
                            {company.city}
                          </span>
                        )}
                        {company.website && (
                          <>
                            <span className="text-slate-300">•</span>
                            <a 
                              href={company.website.startsWith('http') ? company.website : `https://${company.website}`} 
                              target="_blank" 
                              rel="noreferrer"
                              className="flex items-center gap-0.5 text-blue-650 hover:text-blue-500 font-medium"
                            >
                              <Globe className="w-3.5 h-3.5" />
                              Website
                            </a>
                          </>
                        )}
                      </div>
                    </div>
                    
                    <button
                      onClick={() => onGoToCompanyDetails(company.name)}
                      className="inline-flex items-center gap-1 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-600 text-xs font-bold rounded-lg border border-blue-100 transition-all cursor-pointer shadow-sm"
                      type="button"
                    >
                      <span>Go to Details</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 justify-end pt-4 border-t border-slate-100 mt-6">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-105 hover:bg-slate-200 text-slate-700 text-xs font-medium rounded-xl border border-slate-200 transition-all cursor-pointer shadow-sm"
            >
              Close Detail
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
