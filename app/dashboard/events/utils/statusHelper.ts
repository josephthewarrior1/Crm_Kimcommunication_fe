const BADGE_STYLES: Record<string, string> = {
  registered: 'text-emerald-700 bg-emerald-50 border-emerald-250',
  confirm: 'text-emerald-700 bg-emerald-50 border-emerald-250',
  green: 'text-emerald-700 bg-emerald-50 border-emerald-250',
  on_location: 'text-emerald-700 bg-emerald-50 border-emerald-250',
  on_the_way: 'text-blue-700 bg-blue-50 border-blue-250',
  tentative: 'text-amber-700 bg-amber-50 border-amber-250',
  yellow: 'text-amber-700 bg-amber-50 border-amber-250',
  not_respon_yet: 'text-slate-600 bg-slate-50 border-slate-250',
  not_respond_yet: 'text-slate-600 bg-slate-50 border-slate-250',
  white: 'text-slate-600 bg-slate-50 border-slate-250',
  not_respond_2x: 'text-slate-700 bg-slate-100 border-slate-300',
  not_interest: 'text-rose-700 bg-rose-50 border-rose-250',
  unable_to_attend: 'text-rose-700 bg-rose-50 border-rose-250',
  red: 'text-rose-700 bg-rose-50 border-rose-250',
};

export const getStatusBadgeStyle = (status: string): string => {
  const s = status ? status.toLowerCase() : '';
  if (BADGE_STYLES[s]) return BADGE_STYLES[s];
  if (s.startsWith('not_respond_') || s.startsWith('not_respon_')) {
    return 'text-slate-800 bg-slate-200/80 border-slate-350';
  }
  return 'text-slate-500 bg-slate-50 border-slate-250';
};

const STATUS_LABELS: Record<string, string> = {
  on_location: 'On Location',
  on_the_way: 'On The Way',
  registered: 'Registered',
  green: 'Registered',
  confirm: 'Confirm',
  tentative: 'Tentative',
  yellow: 'Tentative',
  not_respon_yet: 'Not respond yet',
  not_respond_yet: 'Not respond yet',
  white: 'Not respond yet',
  not_respond_2x: 'Not respond yet 2x',
  not_respond_3x: 'Not respond yet 3x',
  not_respond_4x: 'Not respond yet 4x',
  not_respond_5x: 'Not respond yet 5x',
  not_respond_6x: 'Not respond yet 6x',
  not_respond_7x: 'Not respond yet 7x',
  not_respond_8x: 'Not respond yet 8x',
  not_respond_9x: 'Not respond yet 9x',
  not_interest: 'Not Interest',
  red: 'Not Interest',
  unable_to_attend: 'Unable to attend',
};

export const getStatusLabel = (status: string): string => {
  const s = status ? status.toLowerCase() : '';
  return STATUS_LABELS[s] || '- None';
};

export const getConfirmationStatusBadgeStyle = (status: string): string => {
  const s = status ? status.toLowerCase() : 'pending';
  if (s === 'approve') {
    return 'text-emerald-700 bg-emerald-50 border-emerald-250';
  }
  if (s === 'decline') {
    return 'text-rose-700 bg-rose-50 border-rose-250';
  }
  return 'text-blue-700 bg-blue-50 border-blue-250';
};

export const getConfirmationStatusLabel = (status: string): string => {
  const s = status ? status.toLowerCase() : 'pending';
  if (s === 'approve') return 'Approve';
  if (s === 'decline') return 'Decline';
  return 'Pending';
};
