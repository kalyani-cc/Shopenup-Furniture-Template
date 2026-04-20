import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

const API_BASE_URL = import.meta.env.VITE_SHOPENUP_BACKEND_URL || '';

export interface Appointment {
  id: string;
  appointment_id?: string;
  fullName?: string; // API field
  patient_name?: string; // Alternative field name
  gender?: 'Male' | 'Female';
  date_of_birth?: string;
  age?: number;
  appointmentDate?: string; // API field
  appointment_date?: string; // Alternative field name
  startTime?: string; // API field
  endTime?: string; // API field
  time_slot?: string; // Alternative field name (or computed from startTime-endTime)
  email?: string;
  mobileNumber?: string; // API field
  mobile?: string; // Alternative field name
  state?: string;
  city?: string;
  address?: string;
  pincode?: string;
  symptoms?: string;
  durationOfSymptoms?: string; // API field
  duration_of_symptoms?: string; // Alternative field name
  existingConditions?: string; // API field
  existing_conditions?: string; // Alternative field name
  currentMedications?: string; // API field
  current_medications?: string; // Alternative field name
  allergies?: string;
  status?: 'pending' | 'confirmed' | 'cancelled' | 'completed' | 'done';
  created_at?: string;
  updated_at?: string;
}

export interface AppointmentFilters {
  dateRange?: {
    from?: string; // YYYY-MM-DD
    to?: string; // YYYY-MM-DD
  };
  search?: string;
  // For view-based navigation (when not using custom date range)
  view?: 'day' | 'week' | 'month';
  date?: string; // YYYY-MM-DD
}

export interface AppointmentMaster {
  duration: number;
  workingDays: string[];
  workingHoursFrom: string;
  workingHoursTo: string;
  selectedSlots: string[];
}

export interface CalendarEvent {
  id: string;
  patient_name: string;
  time_slot: string;
  start: string; // ISO date string
  status: string;
  mobileNumber: string;
}

export interface CalendarData {
  events: CalendarEvent[];
}

// Fetch appointments with filters
export const useAppointments = (filters?: AppointmentFilters) => {
  return useQuery({
    queryKey: ['appointments', filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      
      if (filters?.dateRange?.from) {
        params.append('dateFrom', filters.dateRange.from);
      }
      if (filters?.dateRange?.to) {
        params.append('dateTo', filters.dateRange.to);
      }
      if (filters?.search) {
        params.append('search', filters.search);
      }

      const response = await fetch(`${API_BASE_URL}/admin/appointments?${params.toString()}`, {
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to fetch appointments');
      }

      const data = await response.json();
      // Handle both response structures: { appointments: [] } or { appointments: [], total: 1 }
      const appointments = data.appointments || [];
      // Map API field names to our interface
      return appointments.map((apt: any) => ({
        ...apt,
        patient_name: apt.fullName || apt.patient_name,
        appointment_date: apt.appointmentDate || apt.appointment_date,
        mobile: apt.mobileNumber || apt.mobile,
        time_slot: apt.time_slot || (apt.startTime && apt.endTime ? `${apt.startTime} - ${apt.endTime}` : apt.startTime || ''),
      }));
    },
  });
};

// Fetch single appointment
export const useAppointment = (id: string) => {
  return useQuery({
    queryKey: ['appointment', id],
    queryFn: async () => {
      const response = await fetch(`${API_BASE_URL}/admin/appointments/${id}`, {
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to fetch appointment');
      }

      const data = await response.json();
      const appointment = data.appointment || data; // Handle both { appointment: {} } and direct object
      
      // Map API field names to our interface
      return {
        ...appointment,
        patient_name: appointment.fullName || appointment.patient_name,
        fullName: appointment.fullName,
        date_of_birth: appointment.dateOfBirth || appointment.date_of_birth,
        appointment_date: appointment.appointmentDate || appointment.appointment_date,
        mobile: appointment.mobileNumber || appointment.mobile,
        mobileNumber: appointment.mobileNumber,
        time_slot: appointment.time_slot || (appointment.startTime && appointment.endTime 
          ? `${appointment.startTime} - ${appointment.endTime}` 
          : appointment.startTime || ''),
        startTime: appointment.startTime,
        endTime: appointment.endTime,
        duration_of_symptoms: appointment.durationOfSymptoms || appointment.duration_of_symptoms,
        existing_conditions: appointment.existingConditions || appointment.existing_conditions,
        current_medications: appointment.currentMedications || appointment.current_medications,
      } as Appointment;
    },
    enabled: !!id,
  });
};

// Update appointment
export const useUpdateAppointment = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<Appointment> }) => {
      const response = await fetch(`${API_BASE_URL}/admin/appointments/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Failed to update appointment');
      }

      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
      queryClient.invalidateQueries({ queryKey: ['appointment'] });
      queryClient.invalidateQueries({ queryKey: ['calendar'] });
    },
  });
};

// Cancel appointment
export const useCancelAppointment = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, cancellationReason }: { id: string; cancellationReason?: string }) => {
      const response = await fetch(`${API_BASE_URL}/admin/appointments/${id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          status: 'cancelled',
          ...(cancellationReason && { cancellationReason }),
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Failed to cancel appointment');
      }

      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
      queryClient.invalidateQueries({ queryKey: ['appointment'] });
      queryClient.invalidateQueries({ queryKey: ['calendar'] });
    },
  });
};

// Fetch calendar data
export const useCalendarData = (filters?: AppointmentFilters) => {
  return useQuery({
    queryKey: ['calendar', filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      
      // Option 1: Use custom date range (dateFrom/dateTo)
      if (filters?.dateRange?.from && filters?.dateRange?.to) {
        params.append('dateFrom', filters.dateRange.from);
        params.append('dateTo', filters.dateRange.to);
      }
      // Option 2: Use view + date (for day/week/month navigation)
      else if (filters?.view && filters?.date) {
        params.append('view', filters.view);
        params.append('date', filters.date);
      }
      // If neither provided, backend will return error (handled below)
      
      // Add search filter if provided
      if (filters?.search) {
        params.append('search', filters.search);
      }

      const response = await fetch(`${API_BASE_URL}/admin/appointments/calendar?${params.toString()}`, {
        credentials: 'include',
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Failed to fetch calendar data');
      }

      const data = await response.json();
      // Backend returns 'appointments' array, map it to 'events'
      const events = (data.appointments || []).map((apt: any) => ({
        id: apt.id,
        patient_name: apt.fullName || '',
        time_slot: apt.startTime && apt.endTime
          ? `${apt.startTime} - ${apt.endTime}`
          : apt.startTime || '',
        start: apt.appointmentDate, // ISO date string
        status: apt.status || 'pending',
        mobileNumber: apt.mobileNumber || '',
      }));

      return { events } as CalendarData;
    },
  });
};

// Fetch available slots for a date
export const useAvailableSlots = (date: string) => {
  return useQuery({
    queryKey: ['available-slots', date],
    queryFn: async () => {
      const response = await fetch(`${API_BASE_URL}/admin/appointments/available-slots?date=${date}`, {
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to fetch available slots');
      }

      const data = await response.json();
      return data.slots || [];
    },
    enabled: !!date,
  });
};

// Mark appointment as done
export const useMarkAppointmentAsDone = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`${API_BASE_URL}/admin/appointments/${id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ status: 'done' }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Failed to mark appointment as done');
      }

      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
      queryClient.invalidateQueries({ queryKey: ['appointment'] });
      queryClient.invalidateQueries({ queryKey: ['calendar'] });
    },
  });
};

// Fetch appointment master settings
export const useAppointmentMaster = () => {
  return useQuery({
    queryKey: ['appointment-master'],
    queryFn: async () => {
      const response = await fetch(`${API_BASE_URL}/admin/appointments/appointment-master`, {
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to fetch appointment master settings');
      }

      const data = await response.json();
      return data.master as AppointmentMaster;
    },
  });
};


