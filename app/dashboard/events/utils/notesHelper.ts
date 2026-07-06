export const extractPicFromNotes = (notes: string | null | undefined): { pic: string; cleanNotes: string } => {
  if (!notes) return { pic: '-', cleanNotes: '-' };
  let clean = notes;
  
  // Clean [Origin: Request] tag
  const originRegex = /\[Origin:\s*Request\]/gi;
  clean = clean.replace(originRegex, '').trim();

  const picRegex = /^\[PIC:\s*([^\]]+)\]/;
  const match = clean.match(picRegex);
  if (match) {
    const pic = match[1].trim();
    const cleanNotes = clean.replace(picRegex, '').trim();
    return { pic, cleanNotes: cleanNotes || '-' };
  }
  return { pic: '-', cleanNotes: clean || '-' };
};
