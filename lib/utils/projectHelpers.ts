/**
 * Project Helper Utilities
 * 
 * Utility functions for project status management, validation, and display.
 * Provides reusable helper functions for project-related operations.
 * 
 * @author Juan
 * @version 1.0
 */

/**
 * Project status helper functions
 */

/**
 * Check if a project is finished (completed or delivered)
 * 
 * @param status - Project status
 * @returns true if project is finished
 */
export const isProjectFinished = (status: string): boolean => {
  const s = status?.toUpperCase();
  return s === 'COMPLETED';
};

/**
 * Check if a project is cancelled
 * 
 * @param status - Project status
 * @returns true if project is cancelled
 */
export const isProjectCancelled = (status: string): boolean => {
  return status?.toUpperCase() === 'CANCELLED';
};

/**
 * Check if a project is delayed
 * 
 * @param status - Project status
 * @returns true if project is delayed
 */
export const isProjectDelayed = (status: string): boolean => {
  return status === 'Delayed';
};

/**
 * Check if a project can be finished (not finished and not cancelled)
 * 
 * @param status - Project status
 * @returns true if project can be finished
 */
export const canFinishProject = (status: string): boolean => {
  const s = status?.toUpperCase();
  return s !== 'COMPLETED' && s !== 'CANCELLED';
};

/**
 * Check if a project can be cancelled (not finished and not cancelled)
 * 
 * @param status - Project status
 * @returns true if project can be cancelled
 */
export const canCancelProject = (status: string): boolean => {
  const s = status?.toUpperCase();
  return s !== 'COMPLETED' && s !== 'CANCELLED';
};

/**
 * Check if a project can be deleted
 * 
 * @param status - Project status
 * @returns true if project can be deleted
 */
export const canDeleteProject = (status: string): boolean => {
  // Projects can be deleted anytime
  return true;
};

/**
 * Check if a project can be resumed (currently delayed)
 * 
 * @param status - Project status
 * @returns true if project can be resumed
 */
export const canResumeProject = (status: string): boolean => {
  return status === 'Delayed';
};

/**
 * Check if a project can be marked as delivered (currently completed)
 * 
 * @param status - Project status
 * @returns true if project can be marked as delivered
 */
export const canMarkAsDelivered = (status: string): boolean => {
  return false;
};

/**
 * Check if a project can be approved (currently pending approval)
 * 
 * @param status - Project status
 * @returns true if project can be approved
 */
export const canApproveProject = (status: string): boolean => {
  return status?.toUpperCase() === 'PENDING';
};

// Status display functions moved to statusFormatter.ts for consistency across components

/**
 * Get project status description
 * 
 * @param project - Project object
 * @returns Status description string
 */
export const getProjectStatusDescription = (project: any): string => {
  const status = project.status?.toUpperCase();

  if (status === 'COMPLETED') {
    return 'Project completed';
  }
  if (status === 'CANCELLED') {
    return 'Project cancelled';
  }
  if (status === 'APPROVED') {
    return 'Active';
  }
  if (status === 'PENDING') {
    return 'Waiting to be started';
  }
  if (status === 'PITCHING') {
    return 'Pitching in progress';
  }
  if (project.daysUntilEvent > 0) {
    return `${project.daysUntilEvent}d remaining`;
  }
  return 'Project delayed';
};

/**
 * Calculate days until event
 * 
 * @param eventDate - Event date string
 * @returns Number of days until event
 */
export const calculateDaysUntilEvent = (eventDate: string): number => {
  if (!eventDate) return 0;
  
  const today = new Date();
  const projectDate = new Date(eventDate);
  const timeDiff = projectDate.getTime() - today.getTime();
  
  return Math.ceil(timeDiff / (1000 * 60 * 60 * 24));
};

/**
 * Validate project data
 * 
 * @param projectData - Project data to validate
 * @returns Validation result with errors
 */
export const validateProjectData = (projectData: any): { isValid: boolean; errors: string[] } => {
  const errors: string[] = [];
  
  if (!projectData.name || projectData.name.trim() === '') {
    errors.push('Project name is required');
  }
  
  if (!projectData.client || projectData.client.trim() === '') {
    errors.push('Client is required');
  }
  
  if (!projectData.eventDate) {
    errors.push('Event date is required');
  } else {
    const eventDate = new Date(projectData.eventDate);
    const today = new Date();
    
    if (eventDate < today) {
      errors.push('Event date cannot be in the past');
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

/**
 * Format project date for display
 * 
 * @param dateString - Date string to format
 * @returns Formatted date string
 */
export const formatProjectDate = (dateString: string): string => {
  if (!dateString) return '';
  
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  } catch (error) {
    return dateString;
  }
};

/**
 * Get project priority color
 * 
 * @param priority - Project priority
 * @returns CSS class for priority badge
 */
export const getPriorityBadgeColor = (priority: string): string => {
  switch (priority?.toLowerCase()) {
    case 'high':
      return 'bg-red-100 text-red-800';
    case 'medium':
      return 'bg-amber-100 text-amber-800';
    case 'low':
      return 'bg-emerald-100 text-emerald-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
};
