import type { DatabaseUploadTarget } from '../../../lib/types';

export type TargetDraft = { count: string; mode: DatabaseUploadTarget['targetMode']; enabled: boolean };

export function targetDraft(row: DatabaseUploadTarget): TargetDraft {
  return { count: String(row.targetCount || 50), mode: row.targetMode, enabled: row.targetCount > 0 };
}

export function targetCount(draft: TargetDraft): number {
  if (!draft.enabled) return 0;
  const count = Number(draft.count);
  if (!draft.count.trim() || !Number.isInteger(count) || count < 1 || count > 2147483647) {
    throw new Error('Target aktif harus bilangan bulat antara 1 dan 2.147.483.647.');
  }
  return count;
}

export function targetChanged(row: DatabaseUploadTarget, draft: TargetDraft): boolean {
  return draft.enabled !== (row.targetCount > 0) || (draft.enabled ? Number(draft.count) : 0) !== row.targetCount || draft.mode !== row.targetMode;
}
