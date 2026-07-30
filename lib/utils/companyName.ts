export function formatCompanyName(name?: string | null): string {
  if (!name) return '';

  const normalized = name.trim().replace(/\s+/g, ' ');
  const prefixMatch = normalized.match(/^PT\.?\s+(.+)$/i);
  if (prefixMatch) {
    return `${prefixMatch[1].trim()} PT`;
  }

  return normalized.replace(/\s+PT\.$/i, ' PT');
}
