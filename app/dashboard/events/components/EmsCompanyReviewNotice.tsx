import React from 'react';

type Props = {
  companyReviewRequired?: boolean | null;
  crmCompanyName?: string | null;
  emsCompanyName?: string | null;
};

export function EmsCompanyReviewNotice({ companyReviewRequired, crmCompanyName, emsCompanyName }: Props) {
  if (!companyReviewRequired) return null;
  return <div className="mt-2 space-y-1 text-xs leading-5 text-amber-900">
    <span className="inline-block rounded border border-amber-200 bg-amber-50 px-2 py-0.5 font-semibold">Perusahaan perlu dicek</span>
    <div className="break-words font-normal">
      <p>CRM: {crmCompanyName?.trim() || 'Belum diisi'}</p>
      <p>Registrasi: {emsCompanyName?.trim() || 'Belum diisi'}</p>
    </div>
  </div>;
}
