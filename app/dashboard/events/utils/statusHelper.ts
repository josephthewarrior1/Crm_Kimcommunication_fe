const BADGE_STYLES: Record<string, string> = {
  // Positive/Active states: Bold, high contrast, brand colors
  registered: 'text-indigo-950 bg-indigo-50 border-indigo-200 font-extrabold',
  confirm: 'text-indigo-950 bg-indigo-50 border-indigo-200 font-extrabold',
  green: 'text-indigo-950 bg-indigo-50 border-indigo-200 font-extrabold',
  on_location: 'text-indigo-950 bg-indigo-50 border-indigo-200 font-extrabold',
  
  // Transition / Pending states: Semibold, neutral slate colors
  on_the_way: 'text-slate-700 bg-slate-50 border-slate-200 font-semibold',
  tentative: 'text-slate-700 bg-slate-50 border-slate-200 font-semibold',
  yellow: 'text-slate-700 bg-slate-50 border-slate-200 font-semibold',
  not_respon_yet: 'text-slate-500 bg-slate-50 border-slate-150 font-normal',
  not_respond_yet: 'text-slate-500 bg-slate-50 border-slate-150 font-normal',
  white: 'text-slate-500 bg-slate-50 border-slate-150 font-normal',
  
  // Negative / Muted states: Light text, faded backgrounds, reduced opacity
  not_respond_2x: 'text-slate-400 bg-slate-50/50 border-slate-150 font-normal opacity-60',
  not_interest: 'text-slate-400 bg-slate-50/50 border-slate-150 font-normal opacity-60',
  unable_to_attend: 'text-slate-400 bg-slate-50/50 border-slate-150 font-normal opacity-60',
  red: 'text-slate-400 bg-slate-50/50 border-slate-150 font-normal opacity-60',
};

export const getStatusBadgeStyle = (status: string): string => {
  const s = status ? status.toLowerCase() : '';
  if (BADGE_STYLES[s]) return BADGE_STYLES[s];
  if (s.startsWith('not_respond_') || s.startsWith('not_respon_')) {
    return 'text-slate-400 bg-slate-50/50 border-slate-150 font-normal opacity-60';
  }
  return 'text-slate-500 bg-slate-50 border-slate-150 font-normal';
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
  if (s === 'approve' || s === 'confirmed') {
    return 'text-emerald-800 bg-emerald-50/90 border-emerald-300 font-extrabold shadow-2xs hover:bg-emerald-100/80';
  }
  if (s === 'decline' || s === 'declined') {
    return 'text-rose-800 bg-rose-50/90 border-rose-300 font-extrabold shadow-2xs hover:bg-rose-100/80';
  }
  return 'text-amber-800 bg-amber-50/90 border-amber-300 font-extrabold shadow-2xs hover:bg-amber-100/80';
};

export const getConfirmationStatusLabel = (status: string): string => {
  const s = status ? status.toLowerCase() : 'pending';
  if (s === 'approve' || s === 'confirmed') return 'Approve';
  if (s === 'decline' || s === 'declined') return 'Decline';
  return 'Pending';
};
