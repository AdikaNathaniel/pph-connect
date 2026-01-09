/**
 * Date utility functions for consistent Eastern Time display
 */

/**
 * Format a date string to Eastern Time (ET)
 * @param dateString - ISO date string or Date object
 * @param options - Intl.DateTimeFormatOptions
 * @returns Formatted date string in Eastern Time
 */
export const formatDateET = (
  dateString: string | Date | null | undefined,
  options?: Intl.DateTimeFormatOptions
): string => {
  if (!dateString) return '';
  
  try {
    const date = typeof dateString === 'string' ? new Date(dateString) : dateString;
    
    if (isNaN(date.getTime())) {
      return 'Invalid Date';
    }
    
    const defaultOptions: Intl.DateTimeFormatOptions = {
      timeZone: 'America/New_York',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      ...options
    };
    
    return date.toLocaleDateString('en-US', defaultOptions);
  } catch (error) {
    console.error('Date formatting error:', error);
    return 'Invalid Date';
  }
};

/**
 * Format a date and time string to Eastern Time
 * @param dateString - ISO date string or Date object
 * @returns Formatted date and time string in Eastern Time
 */
export const formatDateTimeET = (
  dateString: string | Date | null | undefined
): string => {
  if (!dateString) return '';
  
  try {
    const date = typeof dateString === 'string' ? new Date(dateString) : dateString;
    
    if (isNaN(date.getTime())) {
      return 'Invalid Date';
    }
    
    return date.toLocaleString('en-US', {
      timeZone: 'America/New_York',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  } catch (error) {
    console.error('Date time formatting error:', error);
    return 'Invalid Date';
  }
};

/**
 * Convert a date input (YYYY-MM-DD) to UTC ISO string for storage
 * This ensures the date is stored as the exact date in ET, not shifted by timezone
 * @param dateInput - Date string in YYYY-MM-DD format
 * @returns ISO string for the date at midnight ET
 */
export const dateInputToUTC = (dateInput: string): string => {
  if (!dateInput) return '';
  
  try {
    // Parse as a date in Eastern Time at midnight
    const date = new Date(dateInput + 'T00:00:00');
    return date.toISOString();
  } catch (error) {
    console.error('Date conversion error:', error);
    return '';
  }
};

