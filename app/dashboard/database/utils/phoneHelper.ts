export const normalizePhone = (phone: string | null | undefined): string => {
  if (!phone) return '';
  let digits = phone.trim().replace(/[^0-9]/g, '');
  if (!digits) return '';

  if (digits.startsWith('62')) {
    digits = digits.slice(2);
  } else if (digits.startsWith('0')) {
    digits = digits.slice(1);
  }

  if (!digits) return '';
  return "+62" + digits;
};
