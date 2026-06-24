/**
 * Type Converters
 * 
 * Utility functions for converting between backend enum values and UI-friendly formats.
 * 
 * @author Juan
 * @version 1.0
 */

/**
 * Convert UI status to backend stage enum
 */
export const toStageEnum = (s: string): string => {
  switch ((s || '').toLowerCase()) {
    case 'completed': return 'COMPLETED';
    case 'in-progress': return 'IN_PROGRESS';
    case 'pending': return 'PENDING';
    case 'cancelled': return 'CANCELLED';
    default: return 'PENDING';
  }
};

/**
 * Convert backend stage enum to UI status
 */
export const fromStageEnum = (e: string): string => {
  switch (e) {
    case 'COMPLETED': return 'completed';
    case 'IN_PROGRESS': return 'in-progress';
    case 'PENDING': return 'pending';
    case 'CANCELLED': return 'cancelled';
    default: return 'pending';
  }
};

/**
 * Convert UI event type to backend enum
 */
export const toEventType = (t: string): string => {
  switch ((t || '').toLowerCase()) {
    case 'meeting': return 'MEETING';
    case 'deadline': return 'DEADLINE';
    case 'event': return 'EVENT';
    case 'workflow': return 'WORKFLOW';
    default: return 'EVENT';
  }
};

/**
 * Convert backend event type enum to UI format
 */
export const fromEventType = (e: string): string => {
  return e ? e.toLowerCase() : 'event';
};

/**
 * Convert UI event status to backend enum
 */
export const toEventStatus = (s: string): string => {
  switch ((s || '').toLowerCase()) {
    case 'completed': return 'COMPLETED';
    case 'in-progress': return 'CONFIRMED';
    case 'upcoming': return 'PENDING';
    default: return 'PENDING';
  }
};

/**
 * Convert backend event status enum to UI format
 */
export const fromEventStatus = (e: string): string => {
  switch (e) {
    case 'COMPLETED': return 'completed';
    case 'CONFIRMED': return 'in-progress';
    case 'PENDING': return 'upcoming';
    default: return 'upcoming';
  }
};

/**
 * Convert UI contact category to backend enum
 */
export const toContactCategory = (c: string): string => {
  return (c || '').toUpperCase();
};

/**
 * Convert backend contact category enum to UI format
 */
export const fromContactCategory = (c: string): string => {
  return c ? c.toLowerCase() : 'client';
};

/**
 * Get status display name
 */
export const getStatusDisplayName = (status: string): string => {
  switch (status) {
    case 'PENDING': return 'Pending';
    case 'PITCHING': return 'Pitching';
    case 'APPROVED': return 'Approved';
    case 'COMPLETED': return 'Completed';
    case 'CANCELLED': return 'Cancelled';
    default: return status;
  }
};

