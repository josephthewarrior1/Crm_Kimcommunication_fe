export const normalizeIndustry = (str: string): string => {
  return str
    .trim()
    .toLowerCase()
    .replace(/mm/g, 'm')
    .replace(/s$/, '');
};

export const matchesIndustryFilter = (industry: string | null | undefined, filterIndustry: string): boolean => {
  if (!industry) return false;
  const dbInd = normalizeIndustry(industry);
  const filterInd = normalizeIndustry(filterIndustry);
  return dbInd === filterInd || dbInd.includes(filterInd) || filterInd.includes(dbInd);
};
