import { useQuery } from '@tanstack/react-query';

const API_BASE_URL = import.meta.env.VITE_SHOPENUP_BACKEND_URL || '';

export interface Holiday {
  date: string; // YYYY-MM-DD format
  name: string;
}

interface HolidaysResponse {
  holidays: Holiday[];
}

/**
 * Fetches holidays from backend API
 * The API key is stored securely on the backend, not exposed to the client
 * 
 * @param countryCalendarId - Google Calendar ID (e.g., 'en.indian#holiday@group.v.calendar.google.com' for India)
 * @param startDate - Start date for fetching holidays (YYYY-MM-DD)
 * @param endDate - End date for fetching holidays (YYYY-MM-DD)
 */
export const useHolidays = (
  countryCalendarId: string = 'en.indian#holiday@group.v.calendar.google.com',
  startDate?: string,
  endDate?: string
) => {
  return useQuery({
    queryKey: ['holidays', countryCalendarId, startDate, endDate],
    queryFn: async (): Promise<Holiday[]> => {
      try {
        const params = new URLSearchParams();
        
        // Add countryCalendarId if provided (optional, defaults to India on backend)
        if (countryCalendarId) {
          params.append('countryCalendarId', countryCalendarId);
        }
        
        // Add date range (required for proper filtering)
        if (startDate) {
          params.append('startDate', startDate);
        }
        if (endDate) {
          params.append('endDate', endDate);
        }

        const response = await fetch(`${API_BASE_URL}/admin/holidays?${params.toString()}`, {
          method: 'GET',
          credentials: 'include', // Include session cookies for authentication
          headers: {
            'Content-Type': 'application/json',
          },
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.message || `Failed to fetch holidays: ${response.statusText}`);
        }

        const data: HolidaysResponse = await response.json();
        
        // Backend returns: { holidays: Holiday[] }
        return data.holidays || [];
      } catch (error) {
        console.error('Error fetching holidays:', error);
        return [];
      }
    },
    staleTime: 1000 * 60 * 60 * 24, // Cache for 24 hours (holidays don't change frequently)
  });
};

