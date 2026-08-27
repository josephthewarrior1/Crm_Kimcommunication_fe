import { AppUser } from '../types';

// ponytail: Helper for checking if an event is allowed for a user/manager/viewer (DB first, localStorage fallback)
export function getUserAllowedEventIds(targetUser?: AppUser | null): number[] {
  if (!targetUser) return [];
  if (targetUser.allowedEventIds && Array.isArray(targetUser.allowedEventIds)) {
    return targetUser.allowedEventIds;
  }
  if (typeof window !== 'undefined') {
    const saved = localStorage.getItem(`user_allowed_events_${targetUser.id}`) || localStorage.getItem(`viewer_allowed_events_${targetUser.id}`);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {}
    }
  }
  return [];
}

export function saveUserAllowedEventIds(userId: number, eventIds: number[]): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(`user_allowed_events_${userId}`, JSON.stringify(eventIds));
  localStorage.setItem(`viewer_allowed_events_${userId}`, JSON.stringify(eventIds));
}

// Backward compatibility aliases
export const getViewerAllowedEventIds = getUserAllowedEventIds;
export const saveViewerAllowedEventIds = saveUserAllowedEventIds;

export function isEventAllowedForUser(eventId: number, user?: AppUser | null): boolean {
  if (!user) return false;
  const isAdmin = user.roles?.includes('ADMIN');
  if (isAdmin) return true;

  const allowed = getUserAllowedEventIds(user);
  return allowed.includes(eventId);
}

export const isEventAllowedForViewer = isEventAllowedForUser;
