'use client';

import React from 'react';
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '../../../../components/ui/dialog';

type Props = {
  companyReviewRequired?: boolean | null;
  crmCompanyName?: string | null;
  emsCompanyName?: string | null;
  identityReviewMessage?: string | null;
  clientDeclineReviewRequired?: boolean | null;
};

export function EmsCompanyReviewNotice({ companyReviewRequired, crmCompanyName, emsCompanyName, identityReviewMessage, clientDeclineReviewRequired }: Props) {
  const identityMessage = identityReviewMessage?.trim();
  if (!companyReviewRequired && !identityMessage && !clientDeclineReviewRequired) return null;
  return <div className="mt-1">
    <Dialog>
      <DialogTrigger asChild>
        <button type="button" aria-label="Lihat detail peringatan" className="inline-flex items-center gap-1.5 whitespace-nowrap rounded border border-amber-200 bg-amber-50 px-2 py-1 text-xs font-semibold leading-4 text-amber-900 hover:bg-amber-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-600">
          <svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="9" /><path d="M12 7v6m0 3v1" /></svg>
          {clientDeclineReviewRequired ? 'Tertahan' : 'Perlu review'}
        </button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Detail peringatan</DialogTitle>
          <DialogDescription>Periksa informasi berikut sebelum menindaklanjuti peserta.</DialogDescription>
        </DialogHeader>
        <div className="ms-modal-body space-y-4 text-sm leading-6">
          {companyReviewRequired && <section className="space-y-2">
            <h3 className="font-semibold text-slate-900">Perusahaan perlu dicek</h3>
            <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 rounded-lg bg-slate-50 p-3">
              <dt className="text-slate-500">CRM</dt><dd className="break-words">{crmCompanyName?.trim() || 'Belum diisi'}</dd>
              <dt className="text-slate-500">Registrasi</dt><dd className="break-words">{emsCompanyName?.trim() || 'Belum diisi'}</dd>
            </dl>
          </section>}
          {(identityMessage || clientDeclineReviewRequired) && <section className="space-y-2">
            <h3 className="font-semibold text-slate-900">{clientDeclineReviewRequired ? 'Review keputusan client' : 'Identitas perlu dicek'}</h3>
            {identityMessage && <p className="whitespace-pre-line break-words font-normal text-slate-700">{identityMessage}</p>}
            {clientDeclineReviewRequired && <p className="rounded-lg border border-amber-200 bg-amber-50 p-3 font-medium text-amber-900">Client Decline tetap berlaku. Peserta belum masuk Pre-Event dan Reminder sampai ditinjau.</p>}
          </section>}
        </div>
        <DialogFooter><DialogClose asChild><button type="button" className="ms-modal-secondary">Tutup</button></DialogClose></DialogFooter>
      </DialogContent>
    </Dialog>
  </div>;
}
