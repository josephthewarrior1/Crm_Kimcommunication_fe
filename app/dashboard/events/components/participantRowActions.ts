import type { MouseEvent } from 'react';
import type { EventParticipant } from '../../../../lib/types';

const interactiveSelector = 'button, input, select, textarea, label, a[href], summary, [role="button"], [role="link"], [contenteditable]';

export function getParticipantRowActions(participant: EventParticipant, onOpen?: (participant: EventParticipant) => void) {
  const { firstName, lastName } = participant.database;
  const name = [firstName, lastName].filter(Boolean).join(' ').trim() || 'Peserta';

  return {
    onRowClick: onOpen && ((event: MouseEvent<HTMLTableRowElement>) => {
      if (event.defaultPrevented || (event.target as Element).closest?.(interactiveSelector)) return;
      const selection = event.currentTarget?.ownerDocument.getSelection();
      if (selection && !selection.isCollapsed && event.currentTarget.contains(selection.anchorNode)) return;
      event.currentTarget?.querySelector<HTMLButtonElement>('[data-participant-details-trigger]')?.focus({ preventScroll: true });
      onOpen(participant);
    }),
    buttonProps: {
      type: 'button' as const,
      'aria-label': `Detail peserta ${name}`,
      'aria-haspopup': 'dialog' as const,
      'data-participant-details-trigger': '',
      onClick: () => onOpen?.(participant),
    },
  };
}
