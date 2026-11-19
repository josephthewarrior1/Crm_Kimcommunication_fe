import { tagtogSsoEnabled } from './tagtogAuth';

export function positiveCrmEventId(value: unknown): number | null {
  if (typeof value === 'string' && !/^[1-9]\d*$/.test(value)) return null;
  if (typeof value !== 'string' && typeof value !== 'number') return null;
  const id = Number(value);
  return Number.isSafeInteger(id) && id > 0 ? id : null;
}

/** Reject ambiguous return links before selecting or loading a native CRM event. */
export function crmEventIdFromQuery(query: { getAll(name: string): string[] }): number | null {
  const ids = [...query.getAll('eventId'), ...query.getAll('id')];
  return ids.length === 1 ? positiveCrmEventId(ids[0]) : null;
}

/** Origin and company/client binding are supplied by the server route, never by the browser. */
export function crmDataSyncHref(eventId?: number): string {
  if (eventId === undefined) return '/api/tagtog/data-sync';
  const id = positiveCrmEventId(eventId);
  if (id === null) throw new Error('Pilih event CRM yang valid sebelum membuka penghubung.');
  return '/api/tagtog/data-sync?eventId=' + id;
}

export function openTagtogDataSync(eventId?: number): void {
  if (typeof window !== 'undefined') window.location.assign(crmDataSyncHref(eventId));
}

/** Fail before any old EMS/PMS request if a forgotten caller uses the password adapter in SSO mode. */
export function requireStandaloneSync(): void {
  if (tagtogSsoEnabled) throw new Error('Gunakan Sync melalui TAGTOG untuk menghubungkan PMS, EMS, dan CRM kantor Anda.');
}

type CrmContextBase = { companyId: number; datasetId: string; eventId: number };
export type CrmTagtogEventContext = CrmContextBase & ({ linked: false } | {
  linked: true; pmsProjectId: number; emsEventId: number; pmsDatasetId: string;
  emsDatasetId: string; updatedAt: string; version: number;
});

/** Keep stale/mismatched responses out of the event's source-information panel. */
export function readCrmTagtogEventContext(value: unknown, eventId: number): CrmTagtogEventContext {
  const row = value as Record<string, unknown> | null;
  const uuid = (id: unknown): id is string => typeof id === 'string' && /^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(id);
  const invalid = () => new Error('Informasi hubungan event belum valid. Muat ulang hubungan data.');
  if (!row || positiveCrmEventId(row.eventId) !== eventId || positiveCrmEventId(row.companyId) === null
    || !uuid(row.datasetId) || typeof row.linked !== 'boolean') throw invalid();
  const base = { companyId: positiveCrmEventId(row.companyId)!, datasetId: row.datasetId, eventId };
  if (!row.linked) return { ...base, linked: false };
  if (positiveCrmEventId(row.pmsProjectId) === null || positiveCrmEventId(row.emsEventId) === null
    || !uuid(row.pmsDatasetId) || !uuid(row.emsDatasetId)
    || new Set([row.datasetId, row.pmsDatasetId, row.emsDatasetId].map(id => id.toLowerCase())).size !== 3
    || positiveCrmEventId(row.version) === null || typeof row.updatedAt !== 'string'
    || !/(?:Z|[+-]\d{2}:\d{2})$/.test(row.updatedAt) || !Number.isFinite(Date.parse(row.updatedAt))) throw invalid();
  return { ...base, linked: true, pmsProjectId: positiveCrmEventId(row.pmsProjectId)!, emsEventId: positiveCrmEventId(row.emsEventId)!,
    pmsDatasetId: row.pmsDatasetId, emsDatasetId: row.emsDatasetId, updatedAt: row.updatedAt, version: positiveCrmEventId(row.version)! };
}
