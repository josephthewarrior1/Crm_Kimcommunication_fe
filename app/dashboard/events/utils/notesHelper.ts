export const extractPicFromNotes = (notes: string | null | undefined): { pic: string; cleanNotes: string } => {
  if (!notes) return { pic: 'Admin', cleanNotes: '-' };
  let clean = notes;
  
  // Clean origin tags from display
  clean = clean.replace(/\[Origin:\s*Request\]/gi, '').replace(/\[Origin:\s*EMS Sync\]/gi, '').replace(/\[EMS\]/gi, '').trim();

  const picRegex = /^\[PIC:\s*([^\]]+)\]/;
  const match = clean.match(picRegex);
  if (match) {
    const pic = match[1].trim();
    const cleanNotes = clean.replace(picRegex, '').trim();
    return { pic, cleanNotes: cleanNotes || '-' };
  }
  return { pic: 'Admin', cleanNotes: clean || '-' };
};
