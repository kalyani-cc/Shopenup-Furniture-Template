import { useState, useMemo } from 'react';
import { Button, Text, Heading } from "@shopenup/ui";
import { ChevronLeft, ChevronRight } from "@shopenup/icons";
import { useCalendarData } from "../../../hooks/api/use-appointments";
import { useHolidays } from "../../../hooks/api/use-holidays";
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, addWeeks, subWeeks, addMonths, subMonths, isToday } from 'date-fns';
import { AppointmentDetailModal } from './appointment-detail-modal';

// Dark green color for done/completed appointments
const DONE_APPOINTMENT_COLOR = {
  bg: 'bg-green-700/20 backdrop-blur-sm',
  border: 'border-l-4 border-green-700/80',
  hover: 'hover:bg-green-700/30',
  text: 'text-green-900',
  accent: 'bg-green-700'
};

// Glassmorphism color palette for appointment cards (removed light green colors: emerald, lime, green)
const APPOINTMENT_COLORS = [
  { bg: 'bg-blue-500/10 backdrop-blur-sm', border: 'border-l-4 border-blue-400/60', hover: 'hover:bg-blue-500/20', text: 'text-blue-900', accent: 'bg-blue-500' },
  { bg: 'bg-amber-500/10 backdrop-blur-sm', border: 'border-l-4 border-amber-400/60', hover: 'hover:bg-amber-500/20', text: 'text-amber-900', accent: 'bg-amber-500' },
  { bg: 'bg-purple-500/10 backdrop-blur-sm', border: 'border-l-4 border-purple-400/60', hover: 'hover:bg-purple-500/20', text: 'text-purple-900', accent: 'bg-purple-500' },
  { bg: 'bg-rose-500/10 backdrop-blur-sm', border: 'border-l-4 border-rose-400/60', hover: 'hover:bg-rose-500/20', text: 'text-rose-900', accent: 'bg-rose-500' },
  { bg: 'bg-indigo-500/10 backdrop-blur-sm', border: 'border-l-4 border-indigo-400/60', hover: 'hover:bg-indigo-500/20', text: 'text-indigo-900', accent: 'bg-indigo-500' },
  { bg: 'bg-teal-500/10 backdrop-blur-sm', border: 'border-l-4 border-teal-400/60', hover: 'hover:bg-teal-500/20', text: 'text-teal-900', accent: 'bg-teal-500' },
  { bg: 'bg-violet-500/10 backdrop-blur-sm', border: 'border-l-4 border-violet-400/60', hover: 'hover:bg-violet-500/20', text: 'text-violet-900', accent: 'bg-violet-500' },
  { bg: 'bg-cyan-500/10 backdrop-blur-sm', border: 'border-l-4 border-cyan-400/60', hover: 'hover:bg-cyan-500/20', text: 'text-cyan-900', accent: 'bg-cyan-500' },
  { bg: 'bg-sky-500/10 backdrop-blur-sm', border: 'border-l-4 border-sky-400/60', hover: 'hover:bg-sky-500/20', text: 'text-sky-900', accent: 'bg-sky-500' },
  { bg: 'bg-fuchsia-500/10 backdrop-blur-sm', border: 'border-l-4 border-fuchsia-400/60', hover: 'hover:bg-fuchsia-500/20', text: 'text-fuchsia-900', accent: 'bg-fuchsia-500' },
  { bg: 'bg-orange-500/10 backdrop-blur-sm', border: 'border-l-4 border-orange-400/60', hover: 'hover:bg-orange-500/20', text: 'text-orange-900', accent: 'bg-orange-500' },
  { bg: 'bg-pink-500/10 backdrop-blur-sm', border: 'border-l-4 border-pink-400/60', hover: 'hover:bg-pink-500/20', text: 'text-pink-900', accent: 'bg-pink-500' },
  { bg: 'bg-red-500/10 backdrop-blur-sm', border: 'border-l-4 border-red-400/60', hover: 'hover:bg-red-500/20', text: 'text-red-900', accent: 'bg-red-500' },
];

// Get color for an appointment based on patient name and status
// Done/completed appointments always get dark green color
// Uses a hash of the entire name for better color distribution for other appointments
const getAppointmentColor = (patientName: string, status?: string) => {
  // If appointment is done or completed, return dark green color
  if (status === 'done' || status === 'completed') {
    return DONE_APPOINTMENT_COLOR;
  }
  
  // Create a simple hash from the entire name string for other appointments
  let hash = 0;
  const normalizedName = patientName.trim().toLowerCase();
  for (let i = 0; i < normalizedName.length; i++) {
    const char = normalizedName.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  // Use absolute value and modulo to get index
  const index = Math.abs(hash) % APPOINTMENT_COLORS.length;
  return APPOINTMENT_COLORS[index];
};

interface AppointmentCalendarViewProps {
  filters: {
    dateRange?: { from?: string; to?: string };
    search?: string;
  };
}

type ViewMode = 'day' | 'week' | 'month';

export const AppointmentCalendarView = ({ filters }: AppointmentCalendarViewProps) => {
  const [viewMode, setViewMode] = useState<ViewMode>('month');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedAppointmentId, setSelectedAppointmentId] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [expandedDays, setExpandedDays] = useState<Set<string>>(new Set());

  // Determine date range for fetching holidays
  const holidayDateRange = useMemo(() => {
    if (filters.dateRange?.from && filters.dateRange?.to) {
      // For custom date range, use the provided range
      return {
        startDate: filters.dateRange.from,
        endDate: filters.dateRange.to,
      };
    } else {
      // For regular view, calculate range based on view mode
      let startDate: Date;
      let endDate: Date;

      if (viewMode === 'day') {
        startDate = currentDate;
        endDate = currentDate;
      } else if (viewMode === 'week') {
        startDate = startOfWeek(currentDate, { weekStartsOn: 1 });
        endDate = endOfWeek(currentDate, { weekStartsOn: 1 });
      } else {
        // month view
        startDate = startOfMonth(currentDate);
        endDate = endOfMonth(currentDate);
      }

      return {
        startDate: format(startDate, 'yyyy-MM-dd'),
        endDate: format(endDate, 'yyyy-MM-dd'),
      };
    }
  }, [filters.dateRange, viewMode, currentDate]);

  // Fetch holidays from Google Calendar API
  // Using India's holiday calendar by default (can be changed to other countries)
  const { data: holidayList = [] } = useHolidays(
    'en.indian#holiday@group.v.calendar.google.com', // India holidays calendar
    holidayDateRange.startDate,
    holidayDateRange.endDate
  );

  // Helper function to get holiday name for a date
  const getHolidayName = (date: Date): string | null => {
    const dateStr = format(date, 'yyyy-MM-dd');
    const holiday = holidayList.find((h) => h.date === dateStr);
    return holiday ? holiday.name : null;
  };

  // Check if using custom date range
  const useCustomRange = !!(filters.dateRange?.from && filters.dateRange?.to);

  // Prepare filters for the hook
  const calendarFilters = {
    // If custom range provided, use it; otherwise use view + date
    ...(useCustomRange
      ? {
          dateRange: {
            from: filters.dateRange!.from!,
            to: filters.dateRange!.to!,
          },
        }
      : {
          view: viewMode,
          date: format(currentDate, 'yyyy-MM-dd'),
        }),
    // Add search if provided
    ...(filters.search && { search: filters.search }),
  };

  const { data: calendarData, isLoading } = useCalendarData(calendarFilters);

  // Filter out cancelled appointments from calendar view
  // Done/completed appointments are shown only if they're in active slots (backend handles this)
  const events = (calendarData?.events || []).filter(
    (event) => 
      event.status !== 'cancelled' && 
      event.status !== 'canceled'
  );

  const navigateDate = (direction: 'prev' | 'next') => {
    // Don't navigate if using custom date range
    if (useCustomRange) return;
    
    if (viewMode === 'day') {
      setCurrentDate((prev) => {
        const newDate = new Date(prev);
        newDate.setDate(newDate.getDate() + (direction === 'next' ? 1 : -1));
        return newDate;
      });
    } else if (viewMode === 'week') {
      setCurrentDate((prev) => (direction === 'next' ? addWeeks(prev, 1) : subWeeks(prev, 1)));
    } else {
      setCurrentDate((prev) => {
        const newDate = direction === 'next' ? addMonths(prev, 1) : subMonths(prev, 1);
        // Reset expanded days when month changes
        setExpandedDays(new Set());
        return newDate;
      });
    }
  };

  const renderDayView = () => {
    const dayEvents = events.filter((event) =>
      isSameDay(new Date(event.start), currentDate)
    );
    const holidayName = getHolidayName(currentDate);

    return (
      <div className="space-y-4">
        {holidayName && (
          <div className="mb-4">
            <div className="bg-blue-400 rounded-lg px-4 py-2.5 shadow-lg">
              <Text className="text-white font-semibold text-sm sm:text-base">
                {holidayName}
              </Text>
            </div>
          </div>
        )}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 2xl:grid-cols-8 gap-2">
          {Array.from({ length: 24 }).map((_, hour) => {
            const hourEvents = dayEvents.filter((event) => {
              const eventHour = new Date(event.start).getHours();
              return eventHour === hour;
            });

            return (
              <div 
                key={hour} 
                className="border border-white/20 rounded-xl p-2 sm:p-3 min-h-[80px] sm:min-h-[100px] bg-white/30 backdrop-blur-md hover:bg-white/40 transition-all duration-300 shadow-lg shadow-black/5"
              >
                <Text size="small" className="font-semibold text-gray-700 mb-1 sm:mb-2 text-xs sm:text-sm">
                  {hour.toString().padStart(2, '0')}:00
                </Text>
                {hourEvents.map((event) => {
                  const colorScheme = getAppointmentColor(event.patient_name, event.status);
                  return (
                    <div
                      key={event.id}
                      className={`mt-1 sm:mt-2 p-1.5 sm:p-2.5 ${colorScheme.bg} ${colorScheme.border} rounded-lg cursor-pointer ${colorScheme.hover} shadow-lg shadow-black/10 transition-all duration-200 border-r border-t border-b border-white/20`}
                      onClick={() => {
                        setSelectedAppointmentId(event.id);
                        setIsModalOpen(true);
                      }}
                    >
                      <Text size="small" weight="plus" className={`${colorScheme.text} font-semibold text-xs`}>
                        {event.patient_name}
                      </Text>
                      <Text size="small" className={`${colorScheme.text} opacity-75 text-xs`}>
                        {event.time_slot}
                      </Text>
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const renderWeekView = () => {
    const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
    const weekDays = eachDayOfInterval({
      start: weekStart,
      end: endOfWeek(currentDate, { weekStartsOn: 1 }),
    });

    return (
      <div className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 gap-2 overflow-x-auto">
          {weekDays.map((day) => {
            const dayEvents = events.filter((event) =>
              isSameDay(new Date(event.start), day)
            );
            const isTodayDay = isToday(day);
            const holidayName = getHolidayName(day);

            return (
              <div 
                key={day.toString()} 
                className={`border rounded-xl p-2 sm:p-3 min-h-[200px] sm:min-h-[250px] backdrop-blur-md transition-all duration-300 ${
                  isTodayDay 
                    ? 'bg-blue-400/20 border-blue-300/40 shadow-xl shadow-blue-200/20' 
                    : 'bg-white/30 border-white/20 shadow-lg shadow-black/5'
                } hover:bg-white/40 hover:shadow-xl hover:shadow-black/10`}
              >
                <Text
                  size="small"
                  className={`font-semibold mb-1 sm:mb-2 text-xs sm:text-sm ${isTodayDay ? 'text-blue-700' : 'text-gray-700'}`}
                >
                  {format(day, 'EEE')}
                </Text>
                <Text
                  size="small"
                  className={`font-bold text-base sm:text-lg mb-2 sm:mb-3 ${isTodayDay ? 'text-blue-600' : 'text-gray-900'}`}
                >
                  {format(day, 'd')}
                </Text>
                <div className="mt-1 sm:mt-2 space-y-1.5 sm:space-y-2">
                  {holidayName && (
                    <div className="mb-1.5 sm:mb-2">
                      <div className="bg-blue-400 rounded-lg px-2.5 py-1.5 shadow-md">
                        <Text size="small" className="text-white font-semibold text-xs">
                          {holidayName}
                        </Text>
                      </div>
                    </div>
                  )}
                  {dayEvents.map((event) => {
                    const colorScheme = getAppointmentColor(event.patient_name, event.status);
                    return (
                      <div
                        key={event.id}
                        className={`p-1.5 sm:p-2.5 ${colorScheme.bg} ${colorScheme.border} rounded-lg cursor-pointer ${colorScheme.hover} shadow-lg shadow-black/10 transition-all duration-200 border-r border-t border-b border-white/20`}
                        onClick={() => {
                          setSelectedAppointmentId(event.id);
                          setIsModalOpen(true);
                        }}
                      >
                        <Text size="small" weight="plus" className={`${colorScheme.text} font-semibold text-xs`}>
                          {event.patient_name}
                        </Text>
                        <Text size="small" className={`${colorScheme.text} opacity-75 text-xs`}>
                          {event.time_slot}
                        </Text>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const renderMonthView = () => {
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(currentDate);
    const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 });
    const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
    const days = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

    const toggleDayExpansion = (dayKey: string) => {
      setExpandedDays((prev) => {
        const newSet = new Set(prev);
        if (newSet.has(dayKey)) {
          newSet.delete(dayKey);
        } else {
          newSet.add(dayKey);
        }
        return newSet;
      });
    };

    return (
      <div className="space-y-2 sm:space-y-4">
        <div className="grid grid-cols-7 gap-1 sm:gap-2">
          {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => (
            <div 
              key={day} 
              className="p-2 sm:p-3 text-center font-semibold border-b border-white/30 bg-white/20 backdrop-blur-sm rounded-t-xl"
            >
              <Text size="small" className="text-gray-700 text-xs sm:text-sm">
                {day}
              </Text>
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1 sm:gap-2">
          {days.map((day) => {
            const dayEvents = events.filter((event) =>
              isSameDay(new Date(event.start), day)
            );
            const isCurrentMonth = day >= monthStart && day <= monthEnd;
            const dayKey = format(day, 'yyyy-MM-dd');
            const isExpanded = expandedDays.has(dayKey);
            const displayEvents = isExpanded ? dayEvents : dayEvents.slice(0, 3);
            const remainingCount = dayEvents.length - 3;
            const isTodayDay = isToday(day);
            const holidayName = getHolidayName(day);

            return (
              <div
                key={day.toString()}
                className={`border rounded-lg sm:rounded-xl p-1 sm:p-2 min-h-[100px] sm:min-h-[140px] transition-all duration-300 backdrop-blur-md ${
                  !isCurrentMonth 
                    ? 'bg-white/10 opacity-50 border-white/10' 
                    : isTodayDay
                    ? 'bg-blue-400/20 border-blue-300/40 shadow-xl shadow-blue-200/20 hover:bg-blue-400/30 hover:shadow-2xl hover:shadow-blue-300/30'
                    : 'bg-white/30 border-white/20 shadow-lg shadow-black/5 hover:bg-white/40 hover:shadow-xl hover:shadow-black/10'
                }`}
              >
                <Text
                  size="small"
                  className={`font-semibold mb-1 sm:mb-2 text-xs sm:text-sm ${
                    isTodayDay 
                      ? 'text-blue-700' 
                      : isCurrentMonth 
                      ? 'text-gray-900' 
                      : 'text-gray-400'
                  }`}
                >
                  {format(day, 'd')}
                </Text>
                <div className="mt-0.5 sm:mt-1 space-y-1 sm:space-y-1.5">
                  {holidayName && (
                    <div className="mb-1">
                      <div className="bg-blue-400 rounded-lg px-2 py-1 shadow-md">
                        <Text size="small" className="text-black  sm:text-xs">
                          {holidayName}
                        </Text>
                      </div>
                    </div>
                  )}
                  {displayEvents.map((event) => {
                    const colorScheme = getAppointmentColor(event.patient_name, event.status);
                    return (
                      <div
                        key={event.id}
                        className={`p-1 sm:p-1.5 ${colorScheme.bg} ${colorScheme.border} rounded-md sm:rounded-lg cursor-pointer ${colorScheme.hover} shadow-lg shadow-black/10 transition-all duration-200 text-xs border-r border-t border-b border-white/20`}
                        onClick={() => {
                          setSelectedAppointmentId(event.id);
                          setIsModalOpen(true);
                        }}
                      >
                        <Text size="small" weight="plus" className={`${colorScheme.text} font-semibold truncate text-[10px] sm:text-xs`}>
                          {event.patient_name}
                        </Text>
                        <Text size="small" className={`${colorScheme.text} opacity-75 truncate text-[10px] sm:text-xs`}>
                          {event.time_slot}
                        </Text>
                      </div>
                    );
                  })}
                  {dayEvents.length > 3 && (
                    <Text
                      size="small"
                      className="text-blue-600 font-medium cursor-pointer hover:text-blue-800 transition-colors text-[10px] sm:text-xs"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleDayExpansion(dayKey);
                      }}
                    >
                      {isExpanded
                        ? 'Show less'
                        : `+${remainingCount} more`}
                    </Text>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="bg-white/30 backdrop-blur-md border border-white/20 rounded-2xl p-6 shadow-xl shadow-black/10">
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-2 border-white/30 border-t-blue-600 mb-4"></div>
          <Text className="text-gray-700">Loading calendar...</Text>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white/30 backdrop-blur-md border border-white/20 rounded-2xl p-3 sm:p-4 md:p-6 shadow-xl shadow-black/10">
      <div className="flex flex-col sm:flex-row items-center justify-between mb-4 sm:mb-6 pb-3 sm:pb-4 border-b border-white/20 gap-3 sm:gap-0">
        <div className="flex items-center gap-2 sm:gap-4 w-full sm:w-auto justify-between sm:justify-start">
          <Button
            variant="secondary"
            size="small"
            onClick={() => navigateDate('prev')}
            disabled={useCustomRange}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Heading level="h3" className="text-gray-900 text-base sm:text-lg md:text-xl text-center sm:text-left">
            {useCustomRange
              ? `${format(new Date(filters.dateRange!.from!), 'MMM d')} - ${format(new Date(filters.dateRange!.to!), 'MMM d, yyyy')}`
              : viewMode === 'day'
              ? format(currentDate, 'MMMM d, yyyy')
              : viewMode === 'week'
              ? `Week of ${format(startOfWeek(currentDate, { weekStartsOn: 1 }), 'MMM d')}`
              : format(currentDate, 'MMMM yyyy')}
          </Heading>
          <Button
            variant="secondary"
            size="small"
            onClick={() => navigateDate('next')}
            disabled={useCustomRange}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto justify-center sm:justify-end">
          <Button
            variant={viewMode === 'day' ? 'primary' : 'secondary'}
            size="small"
            onClick={() => {
              setViewMode('day');
              setExpandedDays(new Set());
            }}
            disabled={useCustomRange}
            className="flex-1 sm:flex-none"
          >
            Day
          </Button>
          <Button
            variant={viewMode === 'week' ? 'primary' : 'secondary'}
            size="small"
            onClick={() => {
              setViewMode('week');
              setExpandedDays(new Set());
            }}
            disabled={useCustomRange}
            className="flex-1 sm:flex-none"
          >
            Week
          </Button>
          <Button
            variant={viewMode === 'month' ? 'primary' : 'secondary'}
            size="small"
            onClick={() => {
              setViewMode('month');
              setExpandedDays(new Set());
            }}
            disabled={useCustomRange}
            className="flex-1 sm:flex-none"
          >
            Month
          </Button>
        </div>
      </div>
      {/* Note about done appointments */}
      <div className="mb-3 sm:mb-4 flex items-center justify-end gap-1.5">
        <div className={`w-2.5 h-2.5 rounded ${DONE_APPOINTMENT_COLOR.bg} ${DONE_APPOINTMENT_COLOR.border} border-r border-t border-b border-white/20`}></div>
        <Text size="small" className="text-gray-500 text-[10px] sm:text-xs">
          Done appointments 
        </Text>
      </div>

      {/* Show active filters */}
      {(useCustomRange || filters.search) && (
        <div className="mb-3 sm:mb-4 p-2 sm:p-3 bg-white/20 backdrop-blur-sm border border-white/30 rounded-xl shadow-lg shadow-black/5">
          <Text size="small" className="text-gray-700 text-xs sm:text-sm break-words">
            {useCustomRange && (
              <span className="block sm:inline">
                <span className="font-medium">Date Range:</span>{' '}
                {format(new Date(filters.dateRange!.from!), 'MMM d')} - {format(new Date(filters.dateRange!.to!), 'MMM d, yyyy')}
              </span>
            )}
            {useCustomRange && filters.search && (
              <span className="hidden sm:inline"> • </span>
            )}
            {/* {filters.search && (
              <span className={`block ${useCustomRange ? 'sm:inline mt-1 sm:mt-0' : ''}`}>
                <span className="font-medium">Search:</span> "{filters.search}"
              </span>
            )} */}
          </Text>
        </div>
      )}

      {viewMode === 'day' && renderDayView()}
      {viewMode === 'week' && renderWeekView()}
      {viewMode === 'month' && renderMonthView()}

      <AppointmentDetailModal
        appointmentId={selectedAppointmentId}
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setSelectedAppointmentId(null);
        }}
      />
    </div>
  );
};

