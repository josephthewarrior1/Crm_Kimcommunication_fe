import type { DatabaseImportResult } from '../types';

export function databaseImportResult(value: unknown): DatabaseImportResult {
  const uncertain = 'Server sudah merespons upload, tetapi ringkasan hasilnya tidak dapat dibaca. Periksa daftar Database sebelum mengupload file yang sama lagi.';
  if (!value || typeof value !== 'object') throw new Error(uncertain);
  const result = value as Record<string, unknown>;
  const keys = ['count', 'newCount', 'updatedCount', 'totalRows', 'skippedCount'] as const;
  for (const key of keys) {
    if (!Number.isSafeInteger(result[key]) || (result[key] as number) < 0) throw new Error(uncertain);
  }
  if ((result.newCount as number) + (result.updatedCount as number) !== result.count) throw new Error(uncertain);
  const text = (field: unknown) => typeof field === 'string' ? field : '';
  const skippedRows = Array.isArray(result.skippedRows) ? result.skippedRows.map(row => {
    if (!row || typeof row !== 'object' || !Number.isSafeInteger(row.rowNum) || row.rowNum < 1) throw new Error(uncertain);
    return {
      rowNum: row.rowNum,
      firstName: text(row.firstName),
      lastName: text(row.lastName),
      companyName: text(row.companyName),
      branchName: text(row.branchName),
      status: text(row.status),
      message: text(row.message) || 'Alasan baris dilewati tidak tersedia.',
    };
  }) : [];
  return {
    message: text(result.message),
    count: result.count as number,
    newCount: result.newCount as number,
    updatedCount: result.updatedCount as number,
    totalRows: result.totalRows as number,
    skippedCount: result.skippedCount as number,
    skippedRows,
  };
}
