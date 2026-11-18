import type { DatabaseImportResult } from '../types';

export class DatabaseImportUnconfirmedError extends Error {
  constructor(message = 'Hasil import belum bisa dikonfirmasi.') {
    super(`${message} Data mungkin sudah tersimpan. Periksa daftar Database sebelum mengupload file yang sama lagi.`);
  }
}

export function databaseImportResult(value: unknown): DatabaseImportResult {
  const unconfirmed = () => new DatabaseImportUnconfirmedError('Ringkasan hasil import tidak dapat dibaca.');
  if (!value || typeof value !== 'object') throw unconfirmed();
  const result = value as Record<string, unknown>;
  const keys = ['count', 'newCount', 'updatedCount', 'totalRows', 'skippedCount'] as const;
  for (const key of keys) {
    if (!Number.isSafeInteger(result[key]) || (result[key] as number) < 0) throw unconfirmed();
  }
  if ((result.newCount as number) + (result.updatedCount as number) !== result.count) throw unconfirmed();
  const text = (field: unknown) => typeof field === 'string' ? field : '';
  const skippedRows = Array.isArray(result.skippedRows) ? result.skippedRows.map(row => {
    if (!row || typeof row !== 'object' || !Number.isSafeInteger(row.rowNum) || row.rowNum < 1) throw unconfirmed();
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
