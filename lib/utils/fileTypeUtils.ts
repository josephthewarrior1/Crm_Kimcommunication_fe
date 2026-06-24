export function getExtension(nameOrUrl: string): string {
  const s = (nameOrUrl || '').trim();
  // Only return an extension if there's actually a dot in the string
  const dotIndex = s.lastIndexOf('.');
  if (dotIndex === -1 || dotIndex === s.length - 1) return '';
  return s.slice(dotIndex + 1).toLowerCase();
}

/**
 * Resolve the file extension from a document object by checking name first, then url.
 * Handles cases where the name has no extension but the URL does (or vice versa).
 */
export function resolveDocExtension(doc: { name?: string; url?: string }): string {
  return getExtension(doc.name || '') || getExtension(doc.url || '');
}

export function isPdf(nameOrUrl: string): boolean {
  return getExtension(nameOrUrl) === 'pdf';
}

export function isPdfDoc(doc: { name?: string; url?: string }): boolean {
  return resolveDocExtension(doc) === 'pdf';
}

export function isPptx(nameOrUrl: string): boolean {
  return ['pptx', 'ppt'].includes(getExtension(nameOrUrl));
}

export function isPptxDoc(doc: { name?: string; url?: string }): boolean {
  return ['pptx', 'ppt'].includes(resolveDocExtension(doc));
}

/** Returns true if the file can be opened in Quill/OnlyOffice editors */
export function isEditable(nameOrUrl: string): boolean {
  return !isPdf(nameOrUrl) && !isPptx(nameOrUrl);
}

/** Returns true if the document can be opened in Quill/OnlyOffice editors (checks both name and url) */
export function isEditableDoc(doc: { name?: string; url?: string }): boolean {
  const ext = resolveDocExtension(doc);
  return ext !== 'pdf' && ext !== 'pptx' && ext !== 'ppt';
}

/** Returns true if the file can be edited in OnlyOffice (strict whitelist of office formats) */
export function isOnlyOfficeEditable(doc: { name?: string; url?: string; fileName?: string }): boolean {
  const ext = resolveDocExtension({ name: doc.name || doc.fileName, url: doc.url });
  return ['docx', 'doc', 'xlsx', 'xls', 'csv', 'odt', 'ods'].includes(ext);
}

/** Returns true if the document is an external link (not an uploaded file) */
export function isExternalLink(doc: { type?: string }): boolean {
  return doc.type === 'link';
}
