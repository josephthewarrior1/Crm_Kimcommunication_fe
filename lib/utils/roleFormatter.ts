/**
 * Formats a role enum name to a human-readable label.
 * e.g. "PROJECT_ADMIN" → "Project Admin", "EDITOR" → "Editor"
 */
export function formatRoleName(name: string | undefined | null): string {
  if (!name) return '';
  return name
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}
