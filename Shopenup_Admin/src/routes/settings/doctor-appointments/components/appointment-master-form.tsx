import { useState, useEffect, useRef } from 'react';
import { Button, Input, Select, Checkbox, Text, Heading, toast, usePrompt } from "@shopenup/ui";
import { Trash, ChevronDown } from "@shopenup/icons";
import { useTranslation } from 'react-i18next';
import { generateTimeSlots } from './utils/slot-generator';

const API_BASE_URL = import.meta.env.VITE_SHOPENUP_BACKEND_URL || '';

const DURATION_OPTIONS = [15, 30, 45, 60, 75, 90, 105, 120];
const WORKING_DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

// Convert 24-hour format (HH:MM) to 12-hour format (HH:MM AM/PM)
const convertTo12Hour = (time24: string): string => {
  const [hours, minutes] = time24.split(':').map(Number);
  const period = hours >= 12 ? 'PM' : 'AM';
  const displayHours = hours > 12 ? hours - 12 : hours === 0 ? 12 : hours;
  return `${displayHours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')} ${period}`;
};

// Convert 12-hour format to 24-hour format
const convertTo24Hour = (time12: string): string => {
  const [time, period] = time12.split(' ');
  let [hours, minutes] = time.split(':').map(Number);
  if (period === 'PM' && hours !== 12) hours += 12;
  if (period === 'AM' && hours === 12) hours = 0;
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
};

// Normalize slot format to match generator output (with spaces around dash)
const normalizeSlotFormat = (slot: string): string => {
  return slot.replace(/\s*-\s*/g, ' - ');
};

// Convert slot format from "09:00 AM - 09:15 AM" to "09:00 AM-09:15 AM" (for API)
const formatSlotForAPI = (slot: string): string => {
  return slot.replace(/\s*-\s*/g, '-');
};

// Check if two slots overlap
const slotsOverlap = (slot1: string, slot2: string): boolean => {
  // Parse slot times (format: "09:00 AM - 09:15 AM" or "09:00 AM-09:15 AM")
  const parseSlotTime = (slot: string): { start: number; end: number } => {
    const normalized = slot.replace(/\s*-\s*/g, '-');
    const [startStr, endStr] = normalized.split('-');
    
    const parseTime = (timeStr: string): number => {
      const trimmed = timeStr.trim();
      const [time, period] = trimmed.split(' ');
      let [hours, minutes] = time.split(':').map(Number);
      if (period === 'PM' && hours !== 12) hours += 12;
      if (period === 'AM' && hours === 12) hours = 0;
      return hours * 60 + minutes;
    };
    
    return {
      start: parseTime(startStr),
      end: parseTime(endStr),
    };
  };
  
  const time1 = parseSlotTime(slot1);
  const time2 = parseSlotTime(slot2);
  
  // Check if time ranges overlap
  return time1.start < time2.end && time2.start < time1.end;
};

export const AppointmentMasterForm = () => {
  const { t } = useTranslation();
  const prompt = usePrompt();
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [duration, setDuration] = useState<number>(30);
  const [workingDays, setWorkingDays] = useState<string[]>([]);
  const [workingHoursFrom, setWorkingHoursFrom] = useState<string>('09:00');
  const [workingHoursTo, setWorkingHoursTo] = useState<string>('18:00');
  const [availableSlots, setAvailableSlots] = useState<string[]>([]);
  const [selectedSlots, setSelectedSlots] = useState<string[]>([]);
  const [selectedSlotsByDuration, setSelectedSlotsByDuration] = useState<Record<number, string[]>>({});
  const [slotsCreated, setSlotsCreated] = useState<boolean>(false);
  const [workingDaysDropdownOpen, setWorkingDaysDropdownOpen] = useState(false);
  const workingDaysDropdownRef = useRef<HTMLDivElement>(null);

  // Fetch existing master settings
  useEffect(() => {
    const fetchMasterSettings = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/admin/appointments/appointment-master`, {
          credentials: 'include',
        });

        if (response.ok) {
          const data = await response.json();
          if (data.master) {
            const fetchedDuration = data.master.duration || 30;
            const fetchedWorkingDays = data.master.workingDays || [];
            // Convert 12-hour format from API to 24-hour for input
            const fromTime = data.master.workingHoursFrom || '09:00 AM';
            const toTime = data.master.workingHoursTo || '06:00 PM';
            const fetchedFrom = fromTime.includes('AM') || fromTime.includes('PM') ? convertTo24Hour(fromTime) : fromTime;
            const fetchedTo = toTime.includes('AM') || toTime.includes('PM') ? convertTo24Hour(toTime) : toTime;
            
            setDuration(fetchedDuration);
            setWorkingDays(fetchedWorkingDays);
            setWorkingHoursFrom(fetchedFrom);
            setWorkingHoursTo(fetchedTo);
            
            // Normalize slot format to ensure they match the generator format
            const fetchedSlots = (data.master.selectedSlots || []).map(normalizeSlotFormat);
            setSelectedSlots(fetchedSlots);
            
            // Initialize selected slots by duration (assume all slots are from the fetched duration)
            setSelectedSlotsByDuration({
              [fetchedDuration]: fetchedSlots,
            });
            
            // Check if slots are already created (if selectedSlots exist and have values)
            if (fetchedSlots.length > 0) {
              setSlotsCreated(true);
            }
            
            // Always generate available slots based on fetched settings
            // This ensures slots are always displayed, even if API doesn't provide them
            if (fetchedFrom && fetchedTo && fetchedDuration) {
              const from12 = convertTo12Hour(fetchedFrom);
              const to12 = convertTo12Hour(fetchedTo);
              const generatedSlots = generateTimeSlots(from12, to12, fetchedDuration);
              setAvailableSlots(generatedSlots);
            }
            
            // If API provides availableSlots, use them (but we've already generated above as fallback)
            if (data.availableSlots && data.availableSlots.length > 0) {
              setAvailableSlots(data.availableSlots);
            }
          } else {
            // If no master data exists, still generate slots for initial display
            if (workingHoursFrom && workingHoursTo && duration) {
              const from12 = convertTo12Hour(workingHoursFrom);
              const to12 = convertTo12Hour(workingHoursTo);
              const slots = generateTimeSlots(from12, to12, duration);
              setAvailableSlots(slots);
            }
          }
        }
      } catch (error) {
        console.error('Error fetching master settings:', error);
      }
    };

    fetchMasterSettings();
  }, []);

  // Auto-generate slots when duration or working hours change
  useEffect(() => {
    if (workingHoursFrom && workingHoursTo && duration) {
      // Convert 24-hour format to 12-hour for slot generation
      const from12 = convertTo12Hour(workingHoursFrom);
      const to12 = convertTo12Hour(workingHoursTo);
      const currentDurationSlots = generateTimeSlots(from12, to12, duration);
      
      // Get all selected slots from other durations
      const otherDurationSlots: string[] = [];
      Object.keys(selectedSlotsByDuration).forEach(dur => {
        if (Number(dur) !== duration) {
          otherDurationSlots.push(...(selectedSlotsByDuration[Number(dur)] || []));
        }
      });
      
      // Filter out current duration slots that overlap with other duration slots
      const availableCurrentSlots = currentDurationSlots.filter(slot => {
        // Check if this slot overlaps with any selected slot from other durations
        return !otherDurationSlots.some(otherSlot => slotsOverlap(slot, otherSlot));
      });
      
      // Combine available current duration slots with selected slots from other durations
      const allSlots = [...new Set([...availableCurrentSlots, ...otherDurationSlots])].sort();
      setAvailableSlots(allSlots);
      
      // Merge selected slots from current duration and other durations
      const currentSelected = selectedSlotsByDuration[duration] || [];
      const mergedSelected = [...new Set([...currentSelected, ...otherDurationSlots])];
      setSelectedSlots(mergedSelected);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [duration, workingHoursFrom, workingHoursTo, selectedSlotsByDuration]);

  const handleDayToggle = (day: string) => {
    if (slotsCreated) return; // Prevent changes if slots are created
    setWorkingDays(prev =>
      prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]
    );
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (workingDaysDropdownRef.current && !workingDaysDropdownRef.current.contains(event.target as Node)) {
        setWorkingDaysDropdownOpen(false);
      }
    };

    if (workingDaysDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [workingDaysDropdownOpen]);

  const handleSlotToggle = (slot: string) => {
    if (slotsCreated) return; // Prevent changes if slots are created
    setSelectedSlots(prev => {
      const newSelected = prev.includes(slot)
        ? prev.filter(s => s !== slot)
        : [...prev, slot];
      
      // Update selected slots by duration
      setSelectedSlotsByDuration(prevDur => {
        const isCurrentDurationSlot = generateTimeSlots(
          convertTo12Hour(workingHoursFrom),
          convertTo12Hour(workingHoursTo),
          duration
        ).includes(slot);
        
        if (isCurrentDurationSlot) {
          // This slot belongs to current duration
          const updated = { ...prevDur };
          updated[duration] = newSelected.filter(s => 
            generateTimeSlots(
              convertTo12Hour(workingHoursFrom),
              convertTo12Hour(workingHoursTo),
              duration
            ).includes(s)
          );
          return updated;
        } else {
          // This slot belongs to another duration - remove it from that duration
          const updated = { ...prevDur };
          Object.keys(updated).forEach(dur => {
            if (Number(dur) !== duration && updated[Number(dur)]?.includes(slot)) {
              updated[Number(dur)] = updated[Number(dur)].filter(s => s !== slot);
            }
          });
          return updated;
        }
      });
      
      return newSelected;
    });
  };

  const handleSelectAll = () => {
    if (slotsCreated) return; // Prevent changes if slots are created
    // Get current duration slots only
    const from12 = convertTo12Hour(workingHoursFrom);
    const to12 = convertTo12Hour(workingHoursTo);
    const currentDurationSlots = generateTimeSlots(from12, to12, duration);
    
    // Get selected slots from other durations
    const otherDurationSlots: string[] = [];
    Object.keys(selectedSlotsByDuration).forEach(dur => {
      if (Number(dur) !== duration) {
        otherDurationSlots.push(...(selectedSlotsByDuration[Number(dur)] || []));
      }
    });
    
    // Combine current duration slots with other duration selected slots
    const allSelected = [...new Set([...currentDurationSlots, ...otherDurationSlots])];
    setSelectedSlots(allSelected);
    
    // Update selected slots by duration - store current duration slots
    setSelectedSlotsByDuration(prev => ({
      ...prev,
      [duration]: [...currentDurationSlots],
    }));
  };

  const handleDeselectAll = () => {
    if (slotsCreated) return; // Prevent changes if slots are created
    // Only deselect current duration slots, keep other duration slots
    // Get selected slots from other durations
    const otherDurationSlots: string[] = [];
    Object.keys(selectedSlotsByDuration).forEach(dur => {
      if (Number(dur) !== duration) {
        otherDurationSlots.push(...(selectedSlotsByDuration[Number(dur)] || []));
      }
    });
    
    setSelectedSlots(otherDurationSlots);
    
    // Clear current duration slots
    setSelectedSlotsByDuration(prev => {
      const updated = { ...prev };
      updated[duration] = [];
      return updated;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Prevent submission if slots are already created
    if (slotsCreated) {
      toast.error('Error', {
        description: 'Cannot modify appointment master settings once slots are created. Please use override settings for specific date ranges.',
      });
      return;
    }
    
    // Validation
    if (workingDays.length === 0) {
      toast.error('Error', {
        description: 'Please select at least one working day',
      });
      return;
    }

    if (selectedSlots.length === 0) {
      toast.error('Error', {
        description: 'Please select at least one time slot',
      });
      return;
    }

    if (workingHoursFrom >= workingHoursTo) {
      toast.error('Error', {
        description: 'Working hours "From" must be before "To"',
      });
      return;
    }

    setLoading(true);
    try {
      // Convert 24-hour format to 12-hour format for API
      const from12 = convertTo12Hour(workingHoursFrom);
      const to12 = convertTo12Hour(workingHoursTo);
      
      // Format slots for API (remove spaces around dash)
      const formattedSlots = selectedSlots.map(formatSlotForAPI);
      
      const payload = {
        duration: parseInt(String(duration)),
        workingDays,
        workingHoursFrom: from12,
        workingHoursTo: to12,
        selectedSlots: formattedSlots,
      };

      // Backend uses POST for both create and update
      const response = await fetch(`${API_BASE_URL}/admin/appointments/appointment-master`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Failed to save settings');
      }

      toast.success('Success', {
        description: 'Settings saved successfully',
      });
      
      // Mark slots as created after successful save (for tracking only, not for locking)
      setSlotsCreated(true);
    } catch (error) {
      toast.error('Error', {
        description: error instanceof Error ? error.message : 'Failed to save appointment master settings',
      });
    } finally {
      setLoading(false);
    }
  };

  // Fetch count of all active appointments that will be cancelled
  // Excludes cancelled, done, and completed appointments (only counts pending/confirmed appointments)
  const fetchAllActiveAppointmentsCount = async (): Promise<number> => {
    try {
      const response = await fetch(`${API_BASE_URL}/admin/appointments`, {
        credentials: 'include',
      });

      if (response.ok) {
        const data = await response.json();
        const appointments = data.appointments || [];
        // Filter out cancelled, done, and completed appointments - only count active appointments
        const activeAppointments = appointments.filter(
          (apt: any) => 
            apt.status !== 'cancelled' && 
            apt.status !== 'canceled' && 
            apt.status !== 'done' && 
            apt.status !== 'completed'
        );
        return activeAppointments.length;
      }
      return 0;
    } catch (error) {
      console.error('Error fetching active appointments count:', error);
      return 0;
    }
  };

  const handleDelete = async () => {
    if (!slotsCreated) {
      toast.error('Error', {
        description: 'No master slots to delete. Slots must be created first.',
      });
      return;
    }

    // Fetch count of affected appointments
    const count = await fetchAllActiveAppointmentsCount();
    
    const description = `This will delete all appointment slots and regenerate slots.`;
    const fullDescription = count > 0
      ? `${description}\n\n⚠️ ${count} appointment${count !== 1 ? 's' : ''} will be cancelled.`
      : description;

    const res = await prompt({
      title: 'Delete Master Slots',
      description: fullDescription,
      confirmText: 'Delete',
      cancelText: 'Cancel',
    });

    if (!res) {
      return;
    }

    setDeleting(true);
    try {
      const response = await fetch(`${API_BASE_URL}/admin/appointments/appointment-master`, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData.message || 'Failed to delete master slots';
        
        // Handle specific error cases
        if (response.status === 404) {
          throw new Error('No appointment master found');
        } else if (response.status === 400) {
          throw new Error(errorMessage);
        } else {
          throw new Error(errorMessage);
        }
      }

      toast.success('Success', { 
        description: 'Appointment master slots deleted successfully' 
      });
      
      // Reset form state after successful deletion
      setSlotsCreated(false);
      setSelectedSlots([]);
      setSelectedSlotsByDuration({});
      setWorkingDays([]);
      setDuration(30);
      setWorkingHoursFrom('09:00');
      setWorkingHoursTo('18:00');
      setAvailableSlots([]);
      
      // Refresh master settings (should return empty/null after deletion)
      const fetchResponse = await fetch(`${API_BASE_URL}/admin/appointments/appointment-master`, {
        credentials: 'include',
      });
      
      if (fetchResponse.ok) {
        const fetchData = await fetchResponse.json();
        if (fetchData.master) {
          // If master still exists, reload it
          const fetchedDuration = fetchData.master.duration || 30;
          const fetchedWorkingDays = fetchData.master.workingDays || [];
          const fromTime = fetchData.master.workingHoursFrom || '09:00 AM';
          const toTime = fetchData.master.workingHoursTo || '06:00 PM';
          const fetchedFrom = fromTime.includes('AM') || fromTime.includes('PM') ? convertTo24Hour(fromTime) : fromTime;
          const fetchedTo = toTime.includes('AM') || toTime.includes('PM') ? convertTo24Hour(toTime) : toTime;
          
          setDuration(fetchedDuration);
          setWorkingDays(fetchedWorkingDays);
          setWorkingHoursFrom(fetchedFrom);
          setWorkingHoursTo(fetchedTo);
          
          const fetchedSlots = (fetchData.master.selectedSlots || []).map(normalizeSlotFormat);
          setSelectedSlots(fetchedSlots);
          
          if (fetchedSlots.length > 0) {
            setSlotsCreated(true);
          }
          
          if (fetchedFrom && fetchedTo && fetchedDuration) {
            const from12 = convertTo12Hour(fetchedFrom);
            const to12 = convertTo12Hour(fetchedTo);
            const generatedSlots = generateTimeSlots(from12, to12, fetchedDuration);
            setAvailableSlots(generatedSlots);
          }
        } else {
          // Master was deleted, form is already reset above
        }
      }
    } catch (error) {
      toast.error('Error', {
        description: error instanceof Error ? error.message : 'Failed to delete master slots',
      });
    } finally {
      setDeleting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="bg-ui-bg-base border border-ui-border-base rounded-lg p-4 sm:p-6">
        <Heading level="h3" className="mb-4">
          {t('doctorAppointments.appointmentMaster.title')}
        </Heading>
        <Text size="small" className="text-ui-fg-subtle mb-6">
          {t('doctorAppointments.appointmentMaster.description')}
        </Text>
        
        {/* Warning message if slots are created */}
        {slotsCreated && (
          <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <Text size="small" className="text-yellow-800 font-medium">
               Slots are already created and cannot be edited.
               Use Override Settings to modify slots for specific dates.
            </Text>
          </div>
        )}

        {/* First Row: Duration */}
        <div className="mb-6">
          <label className="block text-sm font-medium mb-2">
            {t('doctorAppointments.appointmentMaster.duration')}
          </label>
          <style dangerouslySetInnerHTML={{__html: `
            [data-placeholder] {
              color: #9ca3af !important;
            }
          `}} />
          <div className="max-w-xs">
            <Select 
              value={String(duration)} 
              onValueChange={(value) => !slotsCreated && setDuration(Number(value))}
              disabled={slotsCreated}
            >
              <Select.Trigger disabled={slotsCreated} className="[&[data-placeholder]]:text-gray-400">
                <Select.Value placeholder="Select duration" />
              </Select.Trigger>
              <Select.Content>
                {DURATION_OPTIONS.map(opt => (
                  <Select.Item key={opt} value={String(opt)}>
                    {opt} minutes
                  </Select.Item>
                ))}
              </Select.Content>
            </Select>
          </div>
        </div>

        {/* Second Row: Working Days and Working Hours */}
        <div className="grid grid-cols-1 lg:grid-cols-[auto_1fr] gap-6 mb-6">
          {/* Working Days Dropdown */}
          <div>
            <label className="block text-sm font-medium mb-2">
              {t('doctorAppointments.appointmentMaster.workingDays')} {selectedSlots.length > 0 ? '*' : ''}
            </label>
            <div className="relative max-w-xs" ref={workingDaysDropdownRef}>
              <Button
                type="button"
                variant="secondary"
                onClick={() => !slotsCreated && setWorkingDaysDropdownOpen(!workingDaysDropdownOpen)}
                disabled={slotsCreated}
                className="w-full justify-between"
              >
                <span className={`text-sm ${workingDays.length === 0 ? 'text-gray-400' : ''}`}>
                  {workingDays.length === 0
                    ? 'Select working days'
                    : workingDays.length === WORKING_DAYS.length
                    ? 'All days selected'
                    : `${workingDays.length} day${workingDays.length !== 1 ? 's' : ''} selected`}
                </span>
                <ChevronDown className={`h-4 w-4 transition-transform ${workingDaysDropdownOpen ? 'rotate-180' : ''}`} />
              </Button>
              {workingDaysDropdownOpen && !slotsCreated && (
                <div className="absolute z-50 w-full mt-1 bg-white border border-ui-border-base rounded-lg shadow-lg max-h-60 overflow-y-auto">
                  <div className="p-2 space-y-1">
                    {WORKING_DAYS.map(day => (
                      <div key={day} className="flex items-center p-2 hover:bg-ui-bg-subtle rounded cursor-pointer">
                        <Checkbox
                          checked={workingDays.includes(day)}
                          onCheckedChange={() => handleDayToggle(day)}
                          disabled={slotsCreated}
                        />
                        <label className={`ml-2 text-sm cursor-pointer ${slotsCreated ? 'text-ui-fg-subtle' : ''}`}>
                          {day}
                        </label>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {slotsCreated && workingDays.length > 0 && (
                <Text size="small" className="text-ui-fg-subtle mt-1.5 text-xs break-words">
                  {workingDays.join(', ')}
                </Text>
              )}
            </div>
          </div>

          {/* Working Hours */}
          <div>
            <label className="block text-sm font-medium mb-3">
              {t('doctorAppointments.appointmentMaster.workingHours')} {selectedSlots.length > 0 ? '*' : ''}
            </label>
            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
              <div className="w-full sm:w-auto">
                <Input
                  type="time"
                  value={workingHoursFrom}
                  onChange={(e) => !slotsCreated && setWorkingHoursFrom(e.target.value)}
                  disabled={slotsCreated}
                  className="w-full sm:w-60"
                />
              </div>
              <Text size="small" className="text-ui-fg-subtle">
                To
              </Text>
              <div className="w-full sm:w-auto">
                <Input
                  type="time"
                  value={workingHoursTo}
                  onChange={(e) => !slotsCreated && setWorkingHoursTo(e.target.value)}
                  disabled={slotsCreated}
                  className="w-full sm:w-60"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Third Row: Slot Selection - Full Width */}
        <div className="mb-6">
            {availableSlots.length > 0 ? (() => {
              const from12 = convertTo12Hour(workingHoursFrom);
              const to12 = convertTo12Hour(workingHoursTo);
              const allCurrentDurationSlots = generateTimeSlots(from12, to12, duration);
              
              // Get selected slots from other durations
              const otherDurationSlots: string[] = [];
              Object.keys(selectedSlotsByDuration).forEach(dur => {
                if (Number(dur) !== duration) {
                  otherDurationSlots.push(...(selectedSlotsByDuration[Number(dur)] || []));
                }
              });
              
              // Filter out slots that overlap with other duration slots
              const availableCurrentSlots = allCurrentDurationSlots.filter(slot => {
                return !otherDurationSlots.some(otherSlot => slotsOverlap(slot, otherSlot));
              });
              
              return (
                <>
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-3">
                    <label className="block text-sm font-medium">
                      {t('doctorAppointments.appointmentMaster.selectSlots')} ({duration} min slots)
                    </label>
                    <div className="flex flex-col sm:flex-row gap-2">
                      <Button
                        type="button"
                        variant="secondary"
                        size="small"
                        onClick={handleSelectAll}
                        disabled={slotsCreated}
                        className="w-full sm:w-auto"
                      >
                        Select All ({duration} min)
                      </Button>
                      <Button
                        type="button"
                        variant="secondary"
                        size="small"
                        onClick={handleDeselectAll}
                        disabled={slotsCreated}
                        className="w-full sm:w-auto"
                      >
                        Deselect All ({duration} min)
                      </Button>
                    </div>
                  </div>
                  
                  {/* Show selected slots from other durations - can be unchecked */}
                  {otherDurationSlots.length > 0 && (
                    <div className="mb-3">
                      <Text size="small" className="text-ui-fg-subtle mb-2 block">
                        Selected slots from other durations (click to uncheck):
                      </Text>
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 border border-ui-border-base rounded-lg p-3 bg-blue-50 max-h-48 overflow-y-auto">
                        {otherDurationSlots.map(slot => {
                          // Find which duration this slot belongs to
                          let slotDuration = 0;
                          Object.keys(selectedSlotsByDuration).forEach(dur => {
                            if (Number(dur) !== duration && selectedSlotsByDuration[Number(dur)]?.includes(slot)) {
                              slotDuration = Number(dur);
                            }
                          });
                          
                          return (
                            <div key={slot} className="flex items-center">
                              <Checkbox
                                checked={true}
                                onCheckedChange={() => handleSlotToggle(slot)}
                                disabled={slotsCreated}
                              />
                              <label className="ml-2 text-sm break-words">
                                {slot} <span className="text-xs text-blue-600">({slotDuration} min)</span>
                              </label>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                  
                  {availableCurrentSlots.length === 0 ? (
                    <div className="border border-ui-border-base rounded-lg p-4 text-center">
                      <Text size="small" className="text-ui-fg-subtle">
                        No available {duration} min slots. All time periods are occupied by other duration slots.
                      </Text>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 max-h-96 overflow-y-auto border border-ui-border-base rounded-lg p-3">
                      {availableCurrentSlots.map(slot => (
                        <div key={slot} className="flex items-center">
                          <Checkbox
                            checked={selectedSlots.includes(slot)}
                            onCheckedChange={() => handleSlotToggle(slot)}
                            disabled={slotsCreated}
                          />
                          <label className={`ml-2 text-sm break-words ${slotsCreated ? 'text-ui-fg-subtle' : ''}`}>{slot}</label>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              );
            })() : (
              <div>
                <label className="block text-sm font-medium mb-3">
                  {t('doctorAppointments.appointmentMaster.selectSlots')} ({duration} min slots)
                </label>
                <div className="border border-ui-border-base rounded-lg p-4 text-center bg-ui-bg-subtle/30">
                  <Text size="small" className="text-ui-fg-subtle">
                    Set working hours to generate available slots
                  </Text>
                </div>
              </div>
            )}
          </div>

        {/* Submit and Delete Buttons */}
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
          {slotsCreated && (
            <Button 
              type="button" 
              variant="secondary" 
              onClick={handleDelete}
              disabled={deleting || loading}
              className="text-red-600 hover:text-red-700 hover:bg-red-50 w-full sm:w-auto"
            >
              <Trash className="h-4 w-4 mr-2" />
              {deleting ? 'Deleting...' : 'Delete Master Slots'}
            </Button>
          )}
          <div className={slotsCreated ? 'w-full sm:w-auto' : 'w-full sm:w-auto sm:ml-auto'}>
            <Button type="submit" variant="primary" disabled={loading || slotsCreated} className="w-full sm:w-auto">
              {loading ? 'Saving...' : slotsCreated ? 'Slots Already Generated' : t('doctorAppointments.appointmentMaster.save')}
            </Button>
          </div>
        </div>
      </div>
    </form>
  );
};

