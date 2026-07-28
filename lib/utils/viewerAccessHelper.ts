import { AppUser } from '../types';

// ponytail: Helper for checking if an event is allowed for a viewer (DB first, localStorage fallback)
export function getViewerAllowedEventIds(targetUser?: AppUser | null): number[] {
  if (!targetUser) return [];
  if (targetUser.allowedEventIds && Array.isArray(targetUser.allowedEventIds)) {
    return targetUser.allowedEventIds;
  }
  if (typeof window !== 'undefined') {
    const saved = localStorage.getItem(`viewer_allowed_events_${targetUser.id}`);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {}
    }
  }
  return [];
}

export function saveViewerAllowedEventIds(userId: number, eventIds: number[]): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(`viewer_allowed_events_${userId}`, JSON.stringify(eventIds));
}

export function isEventAllowedForViewer(eventId: number, user?: AppUser | null): boolean {
  if (!user) return false;
  const allowed = getViewerAllowedEventIds(user);
  return allowed.includes(eventId);
}
