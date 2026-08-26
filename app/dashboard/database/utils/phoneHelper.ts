export const normalizePhone = (phone: string | null | undefined): string => {
  if (!phone) return '';
  const trimmed = phone.trim();
  if (!trimmed) return '';

  // Jika terdapat multi-nomor yang dipisah oleh '/', ',', ';', '|', 'atau', 'or', 'ext'
  // Ambil nomor pertama saja untuk tampilan tabel agar rapi
  const firstPart = trimmed.split(/[\/,;|\n\r]+|\s+(?:atau|or|ext\.?)\s+/i)[0].trim();
  if (!firstPart) return '';

  if (firstPart.startsWith('+')) {
    const digits = firstPart.slice(1).replace(/[^0-9]/g, '');
    return digits ? `+${digits}` : '';
  }

  const digits = firstPart.replace(/[^0-9]/g, '');
  if (!digits) return '';

  if (digits.startsWith('0')) {
    return `+62${digits.slice(1)}`;
  }

  if (digits.startsWith('65') || digits.startsWith('62') || digits.startsWith('60') || digits.startsWith('1')) {
    return `+${digits}`;
  }

  return `+62${digits}`;
};

