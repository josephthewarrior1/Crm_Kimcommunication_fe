export const extractPicFromNotes = (notes: string | null | undefined): { pic: string; cleanNotes: string } => {
  if (!notes) return { pic: 'Admin', cleanNotes: '-' };
  let clean = notes;
  
  // Clean origin tags from display
  clean = clean.replace(/\[Origin:\s*Request\]/gi, '').replace(/\[Origin:\s*EMS Sync\]/gi, '').replace(/\[EMS\]/gi, '').trim();
  clean = clean.replace(/\[PreEventApproval:\s*[^\]]+\]/gi, '').trim();

  const picRegex = /^\[PIC:\s*([^\]]+)\]/;
  const match = clean.match(picRegex);
  if (match) {
    const pic = match[1].trim();
    const cleanNotes = clean.replace(picRegex, '').trim();
    return { pic, cleanNotes: cleanNotes || '-' };
  }
  return { pic: 'Admin', cleanNotes: clean || '-' };
};

export const extractPreEventApprovalStatus = (notes: string | null | undefined): string => {
  const match = notes?.match(/\[PreEventApproval:\s*([^\]]+)\]/i);
  const status = match?.[1]?.trim().toLowerCase();
  return status === 'approve' || status === 'decline' ? status : 'pending';
};

export const setPreEventApprovalStatus = (notes: string | null | undefined, status: string): string => {
  const cleanStatus = status === 'approve' || status === 'decline' ? status : 'pending';
  const cleanNotes = (notes || '').replace(/\[PreEventApproval:\s*[^\]]+\]/gi, '').replace(/\s+/g, ' ').trim();
  return `[PreEventApproval: ${cleanStatus}] ${cleanNotes}`.replace(/\s+/g, ' ').trim();
};
