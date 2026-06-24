/**
 * Status Formatting Utilities
 * 
 * Utility functions for converting enum values to user-friendly display labels.
 * Handles conversion of underscore-separated enums to human-readable labels.
 * 
 * @author Juan
 * @version 1.0
 */

/**
 * Convert enum value to friendly display label
 * 
 * Converts underscore-separated enums (e.g., "APPROVED") to readable format.
 * 
 * @param value - The enum value to convert
 * @returns Friendly display label
 * 
 * @example
 * formatStatusLabel('APPROVED') // Returns 'Approved'
 */
export function formatStatusLabel(value: string): string {
  if (!value) return value;

  return value
    .toLowerCase()
    .replace(/_/g, ' ')
    .replace(/\b\w/g, l => l.toUpperCase());
}

/**
 * Convert priority enum to friendly display label
 * 
 * @param priority - The priority enum value
 * @returns Friendly display label
 * 
 * @example
 * formatPriorityLabel('HIGH') // Returns 'High'
 * formatPriorityLabel('MEDIUM') // Returns 'Medium'
 */
export function formatPriorityLabel(priority: string): string {
  if (!priority) return priority;
  return priority.charAt(0) + priority.slice(1).toLowerCase();
}

/**
 * Get CSS classes for status badge
 * 
 * @param status - The status enum value
 * @returns CSS classes for the badge
 */
export function getStatusBadgeColor(status: string): string {
  const normalizedStatus = status.toUpperCase();
  
  switch (normalizedStatus) {
    case 'COMPLETED':
      return 'bg-green-100 text-green-800';
    case 'PENDING':
      return 'bg-slate-100 text-slate-800';
    case 'PITCHING':
      return 'bg-violet-100 text-violet-800';
    case 'APPROVED':
      return 'bg-blue-100 text-blue-800';
    case 'CANCELLED':
      return 'bg-red-100 text-red-800';
    default:
      return 'bg-blue-100 text-blue-800';
  }
}

/**
 * Get CSS classes for priority badge
 * 
 * @param priority - The priority enum value
 * @returns CSS classes for the badge
 */
export function getPriorityBadgeColor(priority: string): string {
  const normalizedPriority = (priority || '').toLowerCase();
  
  switch (normalizedPriority) {
    case 'high':
      return 'bg-red-100 text-red-800';
    case 'medium':
      return 'bg-amber-100 text-amber-900';
    case 'low':
      return 'bg-emerald-100 text-emerald-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
}

/**
 * Get status display name
 * 
 * Converts status enum values to user-friendly display names
 * 
 * @param status - The status enum value
 * @returns User-friendly status display name
 * 
 * @example
 * getStatusDisplayName('APPROVED') // Returns 'Approved'
 */
export function getStatusDisplayName(status: string): string {
  switch (status) {
    case 'PENDING': return 'Pending';
    case 'PITCHING': return 'Pitching';
    case 'APPROVED': return 'Approved';
    case 'COMPLETED': return 'Completed';
    case 'CANCELLED': return 'Cancelled';
    default: return formatStatusLabel(status);
  }
}

