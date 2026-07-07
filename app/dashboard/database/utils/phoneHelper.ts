export const normalizePhone = (phone: string | null | undefined): string => {
  if (!phone) return '';
  return "+62" + phone.trim().replace(/^0/, '');
};
