import { useState, useEffect } from 'react';
import { Button, Input, Checkbox, Text, Heading, toast, usePrompt, Select } from "@shopenup/ui";
import { generateTimeSlots } from './utils/slot-generator';

const API_BASE_URL = import.meta.env.VITE_SHOPENUP_BACKEND_URL || '';

const DURATION_OPTIONS = [15, 30, 45, 60, 75, 90, 105, 120];

interface SlotOverride {
  id: string;
  startDate: string;
  endDate: string;
  duration: number;
  workingDays: string[];
  workingHoursFrom: string;
  workingHoursTo: string;
  selectedSlots: string[];
  status: 'active' | 'inactive';
  reason?: string;
}

// Convert slot format from "09:00 AM - 09:15 AM" to "09:00 AM-09:15 AM" (for API)
const formatSlotForAPI = (slot: string): string => {
  return slot.replace(/\s*-\s*/g, '-');
};

// Convert slot format from "09:00 AM-09:15 AM" to "09:00 AM - 09:15 AM" (for display)
const formatSlotFromAPI = (slot: string): string => {
  return slot.replace(/-/g, ' - ');
};

// Normalize slot format to ensure consistent comparison (standardize to " - " format)
const normalizeSlotFormat = (slot: string): string => {
  return slot.replace(/\s*-\s*/g, ' - ');
};

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

// Calculate duration of a slot in minutes from its time range
const calculateSlotDuration = (slot: string): number => {
  try {
    const { start, end } = parseSlotTime(slot);
    return end - start;
  } catch (error) {
    return 0;
  }
};

// Check if two slots overlap
const slotsOverlap = (slot1: string, slot2: string): boolean => {
  const time1 = parseSlotTime(slot1);
  const time2 = parseSlotTime(slot2);
  
  // Check if time ranges overlap
  return time1.start < time2.end && time2.start < time1.end;
};

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

// Get all dates in a date range - REMOVED: No longer used after removing "Available Dates in Range" section
// const getAllDatesInRange = (start: string, end: string): string[] => {
//   const dates: string[] = [];
//   const startDate = new Date(start);
//   const endDate = new Date(end);
//   
//   const currentDate = new Date(startDate);
//   while (currentDate <= endDate) {
//     dates.push(currentDate.toISOString().split('T')[0]);
//     currentDate.setDate(currentDate.getDate() + 1);
//   }
//   
//   return dates;
// };

export const OverrideSettingsForm = () => {
  const [loading, setLoading] = useState(false);
  const [fetchingExisting, setFetchingExisting] = useState(false);
  const [existingOverride, setExistingOverride] = useState<SlotOverride | null>(null);
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [duration, setDuration] = useState<number>(30);
  const [workingDays, setWorkingDays] = useState<string[]>([]);
  const [workingHoursFrom, setWorkingHoursFrom] = useState<string>('09:00');
  const [workingHoursTo, setWorkingHoursTo] = useState<string>('18:00');
  const [availableSlots, setAvailableSlots] = useState<string[]>([]);
  const [selectedSlots, setSelectedSlots] = useState<string[]>([]);
  const [selectedSlotsByDuration, setSelectedSlotsByDuration] = useState<Record<number, string[]>>({});
  const [reason, setReason] = useState<string>('');
  const [updateMode, setUpdateMode] = useState<'full' | 'specific'>('full'); // 'full' or 'specific'
  const [specificUpdateDate, setSpecificUpdateDate] = useState<string>(''); // For specific date update
  const [currentSlotType, setCurrentSlotType] = useState<'master' | 'override'>('master'); // Track if showing master or override slots
  const [specificDatesSlots, setSpecificDatesSlots] = useState<Record<string, string[]>>({}); // Store slots for multiple specific dates: { date: [slots] }
  const prompt = usePrompt();

  // Fetch existing override for a date range
  const fetchExistingOverride = async (fromDate: string, toDate: string): Promise<SlotOverride | null> => {
    try {
      const response = await fetch(`${API_BASE_URL}/admin/appointments/slot-overrides`, {
        credentials: 'include',
      });

      if (response.ok) {
        const data = await response.json();
        const overrides = data.overrides || [];
        
        // Find override that matches the date range
        const matchingOverride = overrides.find((override: SlotOverride) => {
          const overrideStart = override.startDate.split('T')[0];
          const overrideEnd = override.endDate.split('T')[0];
          return overrideStart === fromDate && overrideEnd === toDate && override.status === 'active';
        });
        
        return matchingOverride || null;
      }
      return null;
    } catch (error) {
      console.error('Error fetching existing override:', error);
      return null;
    }
  };

  // Fetch slots for a specific date (returns master or override slots based on what's applied)
  const fetchSlotsForDate = async (date: string): Promise<{ slots: string[]; hasOverride: boolean; slotType: string }> => {
    try {
      const response = await fetch(`${API_BASE_URL}/admin/appointments/slot-overrides?date=${date}`, {
        credentials: 'include',
      });

      if (response.ok) {
        const data = await response.json();
        const slots = data.slots || [];
        const hasOverride = data.hasOverride || false;
        const slotType = data.slotType || 'master';
        
        // Format slots from API format to display format
        // API returns: { startTime: "09:00 AM", endTime: "09:15 AM", isAvailable: true }
        // We need: "09:00 AM - 09:15 AM"
        const formattedSlots = slots
          .map((slot: any) => {
            const startTime = slot.startTime || '';
            const endTime = slot.endTime || '';
            if (startTime && endTime) {
              return `${startTime} - ${endTime}`;
            }
            return null;
          })
          .filter((slot: string | null): slot is string => slot !== null);
        
        return {
          slots: formattedSlots,
          hasOverride,
          slotType
        };
      }
      return { slots: [], hasOverride: false, slotType: 'master' };
    } catch (error) {
      console.error('Error fetching slots for date:', error);
      return { slots: [], hasOverride: false, slotType: 'master' };
    }
  };

  // Reset update mode when dates become the same
  useEffect(() => {
    if (startDate && endDate && startDate === endDate) {
      setUpdateMode('full');
      setSpecificUpdateDate('');
    }
  }, [startDate, endDate]);

  // When only start date is selected, fetch and display slots for that date
  useEffect(() => {
    const loadSlotsForStartDate = async () => {
      if (startDate && !endDate) {
        setFetchingExisting(true);
        // Clear existing override when only start date is selected
        setExistingOverride(null);
        try {
          const slotsData = await fetchSlotsForDate(startDate);
          
          if (slotsData.slots.length > 0) {
            // Show slots for the start date
            setSelectedSlots(slotsData.slots);
            setCurrentSlotType(slotsData.slotType === 'override' ? 'override' : 'master');
            
            // Group slots by their actual duration
            const slotsByDuration: Record<number, string[]> = {};
            slotsData.slots.forEach(slot => {
              const slotDuration = calculateSlotDuration(slot);
              if (slotDuration > 0) {
                if (!slotsByDuration[slotDuration]) {
                  slotsByDuration[slotDuration] = [];
                }
                slotsByDuration[slotDuration].push(slot);
              }
            });
            
            setSelectedSlotsByDuration(slotsByDuration);
            
            // Try to infer duration from slots
            const firstSlotDuration = calculateSlotDuration(slotsData.slots[0]);
            if (firstSlotDuration > 0) {
              setDuration(firstSlotDuration);
            }
          } else {
            // No slots found, clear selection
            setSelectedSlots([]);
            setSelectedSlotsByDuration({});
            setCurrentSlotType('master');
          }
        } catch (error) {
          console.error('Error loading slots for start date:', error);
        } finally {
          setFetchingExisting(false);
        }
      }
    };

    loadSlotsForStartDate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [startDate]);

  // When dates are selected, fetch existing override data and slots for the start date
  useEffect(() => {
    const loadExistingOverride = async () => {
      if (startDate && endDate) {
        setFetchingExisting(true);
        try {
          // Fetch slots for the start date to see if override is applied
          const slotsData = await fetchSlotsForDate(startDate);
          
          // Fetch override data for the date range
          const override = await fetchExistingOverride(startDate, endDate);
          
          if (override) {
            setExistingOverride(override);
            // Load override data into form
            setDuration(override.duration);
            setWorkingDays([]);
            
            // Convert 12-hour format to 24-hour for time inputs
            const from24 = override.workingHoursFrom.includes('AM') || override.workingHoursFrom.includes('PM') 
              ? convertTo24Hour(override.workingHoursFrom) 
              : override.workingHoursFrom;
            const to24 = override.workingHoursTo.includes('AM') || override.workingHoursTo.includes('PM')
              ? convertTo24Hour(override.workingHoursTo)
              : override.workingHoursTo;
            
            setWorkingHoursFrom(from24);
            setWorkingHoursTo(to24);
            
            // Use slots from API response (override or master slots)
            // If override exists, use override slots, otherwise use master slots
            const displaySlots = slotsData.slots.length > 0 
              ? slotsData.slots 
              : override.selectedSlots.map(formatSlotFromAPI);
            
            setSelectedSlots(displaySlots);
            setCurrentSlotType(slotsData.slotType === 'override' ? 'override' : 'master');
            
            // Group slots by their actual duration
            const slotsByDuration: Record<number, string[]> = {};
            displaySlots.forEach(slot => {
              const slotDuration = calculateSlotDuration(slot);
              if (slotDuration > 0) {
                if (!slotsByDuration[slotDuration]) {
                  slotsByDuration[slotDuration] = [];
                }
                slotsByDuration[slotDuration].push(slot);
              }
            });
            
            setSelectedSlotsByDuration(slotsByDuration);
            setReason(override.reason || '');
          } else {
            // No existing override, but check if master slots exist
            if (slotsData.slots.length > 0) {
              // Show master slots
              setSelectedSlots(slotsData.slots);
              setCurrentSlotType('master');
              
              // Group slots by their actual duration
              const slotsByDuration: Record<number, string[]> = {};
              slotsData.slots.forEach(slot => {
                const slotDuration = calculateSlotDuration(slot);
                if (slotDuration > 0) {
                  if (!slotsByDuration[slotDuration]) {
                    slotsByDuration[slotDuration] = [];
                  }
                  slotsByDuration[slotDuration].push(slot);
                }
              });
              
              setSelectedSlotsByDuration(slotsByDuration);
              
              // Try to infer duration from slots
              if (slotsData.slots.length > 0) {
                const firstSlotDuration = calculateSlotDuration(slotsData.slots[0]);
                if (firstSlotDuration > 0) {
                  setDuration(firstSlotDuration);
                }
              }
            } else {
              // No slots at all, reset to defaults
              setSelectedSlots([]);
              setSelectedSlotsByDuration({});
              setCurrentSlotType('master');
            }
            
            setExistingOverride(null);
            setUpdateMode('full'); // Reset to full mode when creating new override
            setSpecificUpdateDate(''); // Clear specific date
            setSpecificDatesSlots({}); // Clear specific dates slots
            setDuration(30);
            setWorkingHoursFrom('09:00');
            setWorkingHoursTo('18:00');
            setReason('');
          }
        } catch (error) {
          console.error('Error loading existing override:', error);
        } finally {
          setFetchingExisting(false);
        }
      } else {
        // Reset when dates are cleared
        setExistingOverride(null);
        resetForm();
      }
    };

    loadExistingOverride();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [startDate, endDate]);

  // When specific date is selected in update mode, fetch and pre-select its active slots
  useEffect(() => {
    const loadSlotsForSpecificDate = async () => {
      if (updateMode === 'specific' && specificUpdateDate && startDate && endDate) {
        // Validate date is within range
        const selectedDate = new Date(specificUpdateDate);
        const rangeStart = new Date(startDate);
        const rangeEnd = new Date(endDate);
        
        if (selectedDate >= rangeStart && selectedDate <= rangeEnd) {
          // Check if we have saved slots for this date
          if (specificDatesSlots[specificUpdateDate]) {
            // Use saved slots
            const savedSlots = specificDatesSlots[specificUpdateDate];
            setSelectedSlots(savedSlots);
            
            // Group slots by duration
            const slotsByDuration: Record<number, string[]> = {};
            savedSlots.forEach(slot => {
              const slotDuration = calculateSlotDuration(slot);
              if (slotDuration > 0) {
                if (!slotsByDuration[slotDuration]) {
                  slotsByDuration[slotDuration] = [];
                }
                slotsByDuration[slotDuration].push(slot);
              }
            });
            setSelectedSlotsByDuration(slotsByDuration);
            
            // Set duration from first slot if available
            if (savedSlots.length > 0) {
              const firstSlotDuration = calculateSlotDuration(savedSlots[0]);
              if (firstSlotDuration > 0) {
                setDuration(firstSlotDuration);
              }
            }
          } else {
            // Fetch slots from API
            const slotsData = await fetchSlotsForDate(specificUpdateDate);
            
            if (slotsData.slots.length > 0) {
              // Pre-select these slots (override or master slots)
              setSelectedSlots(slotsData.slots);
              setCurrentSlotType(slotsData.slotType === 'override' ? 'override' : 'master');
              
              // Group slots by their actual duration (calculated from time range)
              const slotsByDuration: Record<number, string[]> = {};
              slotsData.slots.forEach(slot => {
                const slotDuration = calculateSlotDuration(slot);
                if (slotDuration > 0) {
                  if (!slotsByDuration[slotDuration]) {
                    slotsByDuration[slotDuration] = [];
                  }
                  slotsByDuration[slotDuration].push(slot);
                }
              });
              
              setSelectedSlotsByDuration(slotsByDuration);
              
              // Try to infer duration from slots if not set
              if (slotsData.slots.length > 0) {
                const firstSlotDuration = calculateSlotDuration(slotsData.slots[0]);
                if (firstSlotDuration > 0 && duration !== firstSlotDuration) {
                  setDuration(firstSlotDuration);
                }
              }
            } else {
              // No slots found, clear selection
              setSelectedSlots([]);
              setSelectedSlotsByDuration({});
              setCurrentSlotType('master');
            }
          }
        }
      }
    };

    loadSlotsForSpecificDate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [specificUpdateDate, updateMode, specificDatesSlots]);

  // Save slots for the currently selected specific date
  const handleSaveSlotsForDate = () => {
    if (!specificUpdateDate) {
      toast.error('Error', {
        description: 'Please select a specific date first',
      });
      return;
    }

    // Save current selected slots for this date
    setSpecificDatesSlots(prev => ({
      ...prev,
      [specificUpdateDate]: [...selectedSlots],
    }));

    toast.success('Success', {
      description: `Slots saved for ${new Date(specificUpdateDate).toLocaleDateString()}`,
    });
  };

  // Fetch count of affected appointments that will be cancelled
  // Excludes cancelled, done, and completed appointments (only counts pending/confirmed appointments)
  const fetchAffectedSlotsCount = async (fromDate: string, toDate: string): Promise<number> => {
    try {
      const params = new URLSearchParams();
      params.append('dateFrom', fromDate);
      params.append('dateTo', toDate);
      
      const response = await fetch(`${API_BASE_URL}/admin/appointments?${params.toString()}`, {
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
      console.error('Error fetching affected slots count:', error);
      return 0;
    }
  };


  const resetForm = () => {
    setExistingOverride(null);
    setDuration(30);
    setWorkingDays([]);
    setWorkingHoursFrom('09:00');
    setWorkingHoursTo('18:00');
    setSelectedSlots([]);
    setSelectedSlotsByDuration({});
    setReason('');
    setUpdateMode('full'); // Reset update mode
    setSpecificUpdateDate(''); // Reset specific date
    setSpecificDatesSlots({}); // Reset specific dates slots
    setCurrentSlotType('master'); // Reset slot type
  };

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
      // Build the merged list from selectedSlotsByDuration (source of truth)
      const currentSelected = selectedSlotsByDuration[duration] || [];
      const mergedSelected = [...new Set([...currentSelected, ...otherDurationSlots])];
      setSelectedSlots(mergedSelected);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [duration, workingHoursFrom, workingHoursTo, selectedSlotsByDuration]);

  // REMOVED: Working days toggle - backend generates slots for ALL dates in range
  // const handleDayToggle = (day: string) => {
  //   setWorkingDays(prev =>
  //     prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]
  //   );
  // };

  const handleSlotToggle = (slot: string) => {
    // Normalize the slot format for consistent comparison
    const normalizedSlot = normalizeSlotFormat(slot);
    
    setSelectedSlots(prev => {
      // Normalize all slots for comparison
      const normalizedPrev = prev.map(normalizeSlotFormat);
      const newSelected = normalizedPrev.includes(normalizedSlot)
        ? prev.filter(s => normalizeSlotFormat(s) !== normalizedSlot)
        : [...prev, slot];
      
      // Update selected slots by duration
      setSelectedSlotsByDuration(prevDur => {
        // Calculate actual duration of the slot
        const actualDuration = calculateSlotDuration(slot);
        
        // Check if this slot belongs to current duration by generating slots
        const currentDurationSlots = generateTimeSlots(
          convertTo12Hour(workingHoursFrom),
          convertTo12Hour(workingHoursTo),
          duration
        );
        // Normalize for comparison
        const normalizedCurrentSlots = currentDurationSlots.map(normalizeSlotFormat);
        const isCurrentDurationSlot = normalizedCurrentSlots.includes(normalizedSlot);
        
        const updated = { ...prevDur };
        
        if (isCurrentDurationSlot) {
          // This slot belongs to current duration
          updated[duration] = newSelected.filter(s => 
            normalizedCurrentSlots.includes(normalizeSlotFormat(s))
          );
        } else {
          // This slot belongs to another duration
          // Find and update the correct duration group
          if (actualDuration > 0) {
            if (!updated[actualDuration]) {
              updated[actualDuration] = [];
            }
            // Check if slot is in newSelected (normalize for comparison)
            const normalizedNewSelected = newSelected.map(normalizeSlotFormat);
            if (normalizedNewSelected.includes(normalizedSlot)) {
              // Add slot to its duration group if not already there
              const normalizedDurationSlots = (updated[actualDuration] || []).map(normalizeSlotFormat);
              if (!normalizedDurationSlots.includes(normalizedSlot)) {
                updated[actualDuration] = [...(updated[actualDuration] || []), slot];
              }
            } else {
              // Remove slot from its duration group (normalize for comparison)
              updated[actualDuration] = (updated[actualDuration] || []).filter(s => normalizeSlotFormat(s) !== normalizedSlot);
              // Clean up empty duration groups
              if (updated[actualDuration].length === 0) {
                delete updated[actualDuration];
              }
            }
          } else {
            // Fallback: remove from any duration group that contains it (normalize for comparison)
            Object.keys(updated).forEach(dur => {
              const normalizedDurationSlots = (updated[Number(dur)] || []).map(normalizeSlotFormat);
              if (normalizedDurationSlots.includes(normalizedSlot)) {
                updated[Number(dur)] = updated[Number(dur)].filter(s => normalizeSlotFormat(s) !== normalizedSlot);
                if (updated[Number(dur)].length === 0) {
                  delete updated[Number(dur)];
                }
              }
            });
          }
        }
        
        return updated;
      });
      
      return newSelected;
    });
  };

  const handleSelectAll = () => {
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
    
    // Validation
    if (!startDate || !endDate) {
      toast.error('Error', {
        description: 'Please select date range',
      });
      return;
    }

    if (new Date(startDate) > new Date(endDate)) {
      toast.error('Error', {
        description: 'Start date must be before end date',
      });
      return;
    }

    // Validation for specific date mode
    if (updateMode === 'specific') {
      if (Object.keys(specificDatesSlots).length === 0) {
        toast.error('Error', {
          description: 'Click Save to apply the specific date override',
        });
        return;
      }
    }

    // For holidays, slots can be empty
    // If slots are selected, then working hours are required
    // Working days validation removed - backend generates slots for ALL dates in range
    const isHoliday = selectedSlots.length === 0;
    
    if (!isHoliday) {
      // Working days validation removed - backend generates slots for ALL dates in range automatically
      // if (workingDays.length === 0) {
      //   toast.error('Error', {
      //     description: 'Please select at least one working day',
      //   });
      //   return;
      // }

      if (workingHoursFrom >= workingHoursTo) {
        toast.error('Error', {
          description: 'Working hours "From" must be before "To"',
        });
        return;
      }
    }

    // Determine date range for affected appointments
    let dateRangeStart = startDate;
    let dateRangeEnd = endDate;
    let totalCount = 0;
    
    if (updateMode === 'specific' && Object.keys(specificDatesSlots).length > 0) {
      // For specific dates, count appointments for all configured dates
      const dates = Object.keys(specificDatesSlots).sort();
      dateRangeStart = dates[0];
      dateRangeEnd = dates[dates.length - 1];
      
      // Count appointments for all specific dates
      for (const date of dates) {
        const count = await fetchAffectedSlotsCount(date, date);
        totalCount += count;
      }
    } else {
      totalCount = await fetchAffectedSlotsCount(dateRangeStart, dateRangeEnd);
    }
    
    const isHolidayMode = updateMode === 'specific'
      ? Object.values(specificDatesSlots).every(slots => slots.length === 0)
      : selectedSlots.length === 0;
    const isSpecificUpdate = updateMode === 'specific';
    const configuredDatesCount = Object.keys(specificDatesSlots).length;
    
    const title = isHolidayMode
      ? (isSpecificUpdate ? `Holiday Mode (${configuredDatesCount} Date${configuredDatesCount !== 1 ? 's' : ''})` : 'Holiday Mode')
      : (isSpecificUpdate ? `Update ${configuredDatesCount} Specific Date${configuredDatesCount !== 1 ? 's' : ''}` : 'Confirm Override');
    
    const description = isSpecificUpdate
      ? isHolidayMode
        ? `No slots will be available on ${configuredDatesCount} configured date${configuredDatesCount !== 1 ? 's' : ''}. This will cancel all existing bookings for these dates only.`
        : `This will update slots for ${configuredDatesCount} specific date${configuredDatesCount !== 1 ? 's' : ''}. Other dates in the range (${startDate} to ${endDate}) will remain unchanged.`
      : isHolidayMode
        ? `No slots will be available from ${startDate} to ${endDate}. This will cancel all existing bookings and mark the period as a holiday.`
        : `This will cancel all existing bookings from ${startDate} to ${endDate} and replace existing slots with new override slots.`;
    
    const fullDescription = totalCount > 0
      ? `${description}\n\n⚠️ ${totalCount} appointment${totalCount !== 1 ? 's' : ''} will be cancelled.`
      : description;
    
    const res = await prompt({
      title,
      description: fullDescription,
      confirmText: 'Confirm',
      cancelText: 'Cancel',
    });

    if (!res) {
      return;
    }

    await proceedWithSubmit();
  };

  const proceedWithSubmit = async () => {
    setLoading(true);
    try {
      // Validation for specific date mode
      if (updateMode === 'specific') {
        if (Object.keys(specificDatesSlots).length === 0) {
          toast.error('Error', {
            description: 'Please configure at least one specific date by selecting a date and clicking Save',
          });
          setLoading(false);
          return;
        }
        
        // Validate all configured dates are within range
        const rangeStart = new Date(startDate);
        const rangeEnd = new Date(endDate);
        
        for (const date of Object.keys(specificDatesSlots)) {
          const selectedDate = new Date(date);
          if (selectedDate < rangeStart || selectedDate > rangeEnd) {
            toast.error('Error', {
              description: `Date ${new Date(date).toLocaleDateString()} is not within the range`,
            });
            setLoading(false);
            return;
          }
        }
      }

      // Format slots for API (remove spaces around dash)
      const formattedSlots = selectedSlots.map(formatSlotForAPI);
      
      // For holidays (empty slots), working hours and duration may not be needed
      // But we'll still send them if they're set, or use defaults
      const from12 = workingHoursFrom ? convertTo12Hour(workingHoursFrom) : '09:00 AM';
      const to12 = workingHoursTo ? convertTo12Hour(workingHoursTo) : '06:00 PM';
      const durationValue = duration || 30; // Default to 30 minutes if not set
      
      const payload: any = {
        startDate,
        endDate,
        duration: parseInt(String(durationValue)),
        workingDays: workingDays.length > 0 ? workingDays : [], // Not used by backend - backend generates slots for ALL dates in range automatically, but kept for backward compatibility
        workingHoursFrom: from12,
        workingHoursTo: to12,
        selectedSlots: formattedSlots, // Empty array for holidays (used for full range mode)
        ...(reason && { reason }),
      };

      // Add specificDates array if updating multiple specific dates
      if (updateMode === 'specific' && Object.keys(specificDatesSlots).length > 0) {
        payload.specificDates = Object.keys(specificDatesSlots).map(date => ({
          date,
          slots: specificDatesSlots[date].map(formatSlotForAPI),
        }));
      }

      // POST or PUT based on whether override exists
      const url = existingOverride
        ? `${API_BASE_URL}/admin/appointments/slot-overrides/${existingOverride.id}`
        : `${API_BASE_URL}/admin/appointments/slot-overrides`;
      
      const method = existingOverride ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Failed to ${existingOverride ? 'update' : 'create'} override`);
      }

      await response.json();
      
      const configuredDatesCount = updateMode === 'specific' ? Object.keys(specificDatesSlots).length : 0;
      const successMessage = existingOverride && updateMode === 'specific'
        ? `Override updated for ${configuredDatesCount} specific date${configuredDatesCount !== 1 ? 's' : ''}`
        : existingOverride
          ? 'Override updated successfully'
          : 'Slots overridden successfully.';
      
      toast.success('Success', {
        description: successMessage,
      });

      // Reset form after success - clear everything including dates
      setStartDate('');
      setEndDate('');
      setDuration(30);
      setWorkingDays([]);
      setWorkingHoursFrom('09:00');
      setWorkingHoursTo('18:00');
      setSelectedSlots([]);
      setSelectedSlotsByDuration({});
      setReason('');
      setUpdateMode('full');
      setSpecificUpdateDate('');
      setSpecificDatesSlots({});
      setExistingOverride(null);
      setCurrentSlotType('master');
    } catch (error) {
      toast.error('Error', {
        description: error instanceof Error ? error.message : 'Failed to create override',
      });
    } finally {
      setLoading(false);
    }
  };

  // Determine if update mode should be shown (only when editing existing override and dates are different)
  const showUpdateMode = existingOverride && startDate && endDate && startDate !== endDate;

  return (
    <div className="space-y-6">
      {/* Override Form */}
      <form onSubmit={handleSubmit} className="space-y-6" noValidate>
        <div className="bg-ui-bg-base border border-ui-border-base rounded-lg p-4 sm:p-6">
          <Heading level="h3" className="mb-4">
            {existingOverride ? 'Update Override' : 'Create Override'}
          </Heading>
          {fetchingExisting && (
            <Text size="small" className="text-ui-fg-subtle mb-2">
              Loading existing override data...
            </Text>
          )}
          <Text size="small" className="text-ui-fg-subtle mb-6">
            Override appointment slots for specific date ranges. This will cancel existing bookings and replace slots.
            <br />
          </Text>

        {/* Date Range and Update Mode - First Line */}
        <div className="mb-6">
          <style dangerouslySetInnerHTML={{__html: `
            input[type="date"]::-webkit-datetime-edit-text,
            input[type="date"]::-webkit-datetime-edit-month-field,
            input[type="date"]::-webkit-datetime-edit-day-field,
            input[type="date"]::-webkit-datetime-edit-year-field {
              opacity: 0 !important;
              color: transparent !important;
              padding: 0 !important;
              margin: 0 !important;
            }
            input[type="date"][value]:not([value=""])::-webkit-datetime-edit-text,
            input[type="date"][value]:not([value=""])::-webkit-datetime-edit-month-field,
            input[type="date"][value]:not([value=""])::-webkit-datetime-edit-day-field,
            input[type="date"][value]:not([value=""])::-webkit-datetime-edit-year-field {
              opacity: 1 !important;
              color: inherit !important;
            }
          `}} />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
            {/* Date Range Column */}
            <div>
              <label className="block text-sm font-medium mb-2">
                Date Range *
              </label>
              <div className="flex flex-col sm:flex-row sm:items-center gap-4 max-w-2xl">
                <div className="flex-1 relative">
                  <label className="block text-xs text-ui-fg-subtle mb-1">Start Date</label>
                  <div className="relative">
                    <Input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      min={new Date().toISOString().split('T')[0]}
                      className={!startDate ? 'text-transparent' : ''}
                    />
                    {!startDate && (
                      <div className="absolute inset-0 flex items-center px-3 pointer-events-none text-ui-fg-subtle text-sm">
                        Select start date
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex-1 relative">
                  <label className="block text-xs text-ui-fg-subtle mb-1">End Date</label>
                  <div className="relative">
                    <Input
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      min={startDate || new Date().toISOString().split('T')[0]}
                      className={!endDate ? 'text-transparent' : ''}
                    />
                    {!endDate && (
                      <div className="absolute inset-0 flex items-center px-3 pointer-events-none text-ui-fg-subtle text-sm">
                        Select end date
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Update Mode Column - Only show when start and end dates are different */}
            {showUpdateMode && (
              <div>
                <label className="block text-sm font-medium mb-2">
                  Update Mode
                </label>
                {/* Spacer label to align buttons with date inputs */}
                <label className="block text-xs text-ui-fg-subtle mb-1 invisible">
                  Spacer
                </label>
                <div className="flex flex-col sm:flex-row sm:items-center gap-3 flex-wrap">
                  <Button
                    type="button"
                    variant={updateMode === 'full' ? 'primary' : 'secondary'}
                    size="small"
                    onClick={() => {
                      setUpdateMode('full');
                      setSpecificUpdateDate('');
                      // Reload existing override data for full range from existingOverride
                      if (existingOverride) {
                        const displaySlots = existingOverride.selectedSlots.map(formatSlotFromAPI);
                        setSelectedSlots(displaySlots);
                        const slotsByDuration: Record<number, string[]> = {};
                        displaySlots.forEach(slot => {
                          const slotDuration = calculateSlotDuration(slot);
                          if (slotDuration > 0) {
                            if (!slotsByDuration[slotDuration]) {
                              slotsByDuration[slotDuration] = [];
                            }
                            slotsByDuration[slotDuration].push(slot);
                          }
                        });
                        setSelectedSlotsByDuration(slotsByDuration);
                        setDuration(existingOverride.duration);
                        const from24 = existingOverride.workingHoursFrom.includes('AM') || existingOverride.workingHoursFrom.includes('PM') 
                          ? convertTo24Hour(existingOverride.workingHoursFrom) 
                          : existingOverride.workingHoursFrom;
                        const to24 = existingOverride.workingHoursTo.includes('AM') || existingOverride.workingHoursTo.includes('PM')
                          ? convertTo24Hour(existingOverride.workingHoursTo)
                          : existingOverride.workingHoursTo;
                        setWorkingHoursFrom(from24);
                        setWorkingHoursTo(to24);
                        setReason(existingOverride.reason || '');
                      }
                    }}
                    className={`w-full sm:w-auto ${updateMode === 'full' ? '' : 'hover:bg-ui-bg-base'}`}
                  >
                    Update Entire Range
                  </Button>
                  <Button
                    type="button"
                    variant={updateMode === 'specific' ? 'primary' : 'secondary'}
                    size="small"
                    onClick={() => setUpdateMode('specific')}
                    className={`w-full sm:w-auto ${updateMode === 'specific' ? '' : 'hover:bg-ui-bg-base'}`}
                  >
                    Update Specific Date
                  </Button>
                  
                  {/* Show date picker for specific date update - inline with buttons */}
                  {updateMode === 'specific' && startDate && endDate && (
                    <>
                      <div className="relative w-full sm:max-w-[200px]">
                        <Input
                          type="date"
                          value={specificUpdateDate}
                          onChange={(e) => setSpecificUpdateDate(e.target.value)}
                          min={startDate}
                          max={endDate}
                          className={`text-sm ${!specificUpdateDate ? 'text-transparent' : ''}`}
                        />
                        {!specificUpdateDate && (
                          <div className="absolute inset-0 flex items-center px-3 pointer-events-none text-ui-fg-subtle text-xs">
                            Select date
                          </div>
                        )}
                      </div>
                      {specificUpdateDate && (
                        <Button
                          type="button"
                          variant="primary"
                          size="small"
                          onClick={handleSaveSlotsForDate}
                          className="w-full sm:w-auto"
                        >
                          Save
                        </Button>
                      )}
                    </>
                  )}
                </div>
                
                {/* Show configured specific dates */}
                {updateMode === 'specific' && Object.keys(specificDatesSlots).length > 0 && (
                  <div className="mt-3 p-2 border border-ui-border-base rounded-lg bg-ui-bg-subtle/30">
                    <Text size="small" className="text-ui-fg-subtle mb-1.5 block text-xs">
                      Configured Dates ({Object.keys(specificDatesSlots).length}):
                    </Text>
                    <div className="flex flex-wrap gap-1.5">
                      {Object.keys(specificDatesSlots).sort().map(date => (
                        <div
                          key={date}
                          className="px-2 py-0.5 bg-ui-bg-base border border-ui-border-base rounded text-xs flex items-center gap-1.5"
                        >
                          <span className="text-ui-fg-base">{new Date(date).toLocaleDateString()}</span>
                          <span className="text-ui-fg-subtle text-[10px]">({specificDatesSlots[date].length})</span>
                          <button
                            type="button"
                            onClick={() => {
                              const newSlots = { ...specificDatesSlots };
                              delete newSlots[date];
                              setSpecificDatesSlots(newSlots);
                              if (specificUpdateDate === date) {
                                setSpecificUpdateDate('');
                                setSelectedSlots([]);
                                setSelectedSlotsByDuration({});
                              }
                            }}
                            className="ml-0.5 text-ui-fg-muted hover:text-ui-fg-base font-bold text-sm leading-none"
                            title="Remove this date"
                          >
                            ×
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Duration and Working Hours - Second Line */}
        <div className="mt-4 mb-8 flex flex-col lg:flex-row gap-6 items-start">

          {/* Duration and Working Hours - Grouped together */}
          <div className="flex flex-col lg:flex-row lg:items-end lg:gap-6">
            {/* Duration */}
            <div>
              <label className="block text-sm font-medium mb-2">
                Duration (minutes) {selectedSlots.length > 0 ? '*' : ''}
              </label>
              <div className="max-w-xs">
                <Select
                  value={duration.toString()}
                  onValueChange={(value) => setDuration(Number(value))}
                >
                  <Select.Trigger>
                    <Select.Value placeholder="Select duration" />
                  </Select.Trigger>
                  <Select.Content>
                    {DURATION_OPTIONS.map(opt => (
                      <Select.Item key={opt} value={opt.toString()}>
                        {opt} min
                      </Select.Item>
                    ))}
                  </Select.Content>
                </Select>
              </div>
            </div>

            {/* Working Hours */}
            <div>
              <label className="block text-sm font-medium mb-2">
                Working Hours {selectedSlots.length > 0 ? '*' : ''}
              </label>
              <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                <div className="w-full sm:w-auto">
                  <Input
                    type="time"
                    value={workingHoursFrom}
                    onChange={(e) => setWorkingHoursFrom(e.target.value)}
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
                    onChange={(e) => setWorkingHoursTo(e.target.value)}
                    className="w-full sm:w-60"
                  />
                </div>
                <Button
                  type="button"
                  variant="secondary"
                  size="small"
                  className="bg-black hover:bg-gray-800 text-white border-black hover:border-gray-800 w-full sm:w-auto"
                  onClick={() => {
                    if (updateMode === 'specific' && specificUpdateDate) {
                      // In specific date mode, clear slots for the selected date
                      setSelectedSlots([]);
                      setSelectedSlotsByDuration({});
                      setSpecificDatesSlots(prev => ({
                        ...prev,
                        [specificUpdateDate]: [],
                      }));
                    } else {
                      // In full mode, clear all slots
                      setSelectedSlots([]);
                      setSelectedSlotsByDuration({});
                      setSpecificDatesSlots({});
                    }
                  }}
                >
                  Set Holiday
                </Button>
              </div>
            </div>
          </div>
        </div>
        {/* Working Days - REMOVED: Backend generates slots for ALL dates in the selected range automatically */}

        {/* Slot Selection */}
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
              
              // Sort other duration slots chronologically by start time
              otherDurationSlots.sort((a, b) => {
                const timeA = parseSlotTime(a);
                const timeB = parseSlotTime(b);
                return timeA.start - timeB.start;
              });
              
              // Filter out slots that overlap with other duration slots
              const availableCurrentSlots = allCurrentDurationSlots.filter(slot => {
                return !otherDurationSlots.some(otherSlot => slotsOverlap(slot, otherSlot));
              }).sort((a, b) => {
                // Sort chronologically by start time
                const timeA = parseSlotTime(a);
                const timeB = parseSlotTime(b);
                return timeA.start - timeB.start;
              });
              
              return (
                <>
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-3">
                    <div className="flex items-center gap-3 flex-wrap">
                      <label className="block text-sm font-medium">
                        Select Slots ({duration} min slots)
                      </label>
                      {selectedSlots.length > 0 && (
                        <Text size="small" className={`px-2 py-1 rounded ${
                          currentSlotType === 'override' 
                            ? 'bg-blue-100 text-blue-800' 
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {currentSlotType === 'override' ? 'Override Slots' : 'Master Slots'}
                        </Text>
                      )}
                    </div>
                    <div className="flex flex-col sm:flex-row gap-2">
                      <Button
                        type="button"
                        variant="secondary"
                        size="small"
                        onClick={handleSelectAll}
                        className="w-full sm:w-auto"
                      >
                        Select All ({duration} min)
                      </Button>
                      <Button
                        type="button"
                        variant="secondary"
                        size="small"
                        onClick={handleDeselectAll}
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
                          // Calculate actual duration from slot time range first
                          const actualDuration = calculateSlotDuration(slot);
                          // Also try to find which duration this slot belongs to in selectedSlotsByDuration
                          let slotDuration = actualDuration;
                          Object.keys(selectedSlotsByDuration).forEach(dur => {
                            const normalizedDurationSlots = (selectedSlotsByDuration[Number(dur)] || []).map(normalizeSlotFormat);
                            if (Number(dur) !== duration && normalizedDurationSlots.includes(normalizeSlotFormat(slot))) {
                              // Use the stored duration if it matches the calculated one, otherwise prefer calculated
                              slotDuration = actualDuration > 0 ? actualDuration : Number(dur);
                            }
                          });
                          
                          // Normalize for comparison
                          const normalizedSlot = normalizeSlotFormat(slot);
                          const normalizedSelectedSlots = selectedSlots.map(normalizeSlotFormat);
                          const isSelected = normalizedSelectedSlots.includes(normalizedSlot);
                          return (
                            <div key={slot} className="flex items-center">
                              <Checkbox
                                checked={isSelected}
                                onCheckedChange={() => handleSlotToggle(slot)}
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
                    <>
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 max-h-96 overflow-y-auto border border-ui-border-base rounded-lg p-3">
                        {availableCurrentSlots.map(slot => {
                          // Normalize for comparison
                          const normalizedSlot = normalizeSlotFormat(slot);
                          const normalizedSelectedSlots = selectedSlots.map(normalizeSlotFormat);
                          const isSelected = normalizedSelectedSlots.includes(normalizedSlot);
                          return (
                            <div key={slot} className="flex items-center">
                              <Checkbox
                                checked={isSelected}
                                onCheckedChange={() => handleSlotToggle(slot)}
                              />
                              <label className="ml-2 text-sm break-words">{slot}</label>
                            </div>
                          );
                        })}
                      </div>
                      {/* <Text size="small" className="text-ui-fg-subtle mt-2">
                        Selected: {selectedSlots.length} total ({availableCurrentSlots.filter(s => selectedSlots.includes(s)).length} of {availableCurrentSlots.length} available {duration} min slots)
                      </Text> */}
                    </>
                  )}
                </>
              );
            })() : (
              <div>
                <label className="block text-sm font-medium mb-3">
                  Select Slots ({duration} min slots)
                </label>
                <div className="border border-ui-border-base rounded-lg p-4 text-center bg-ui-bg-subtle/30">
                  <Text size="small" className="text-ui-fg-subtle">
                    Set working hours to generate available slots
                  </Text>
                </div>
              </div>
            )}
        </div>


        {/* Reason */}
        <div className="mb-6">
          <label className="block text-sm font-medium mb-2">
            Reason (Optional)
          </label>
          <Input
            type="text"
            placeholder="e.g., Holiday schedule change"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />
        </div>

        {/* Submit Button */}
        <div className="flex flex-col sm:flex-row sm:justify-end gap-2">
          <Button type="button" variant="secondary" onClick={() => {
            setStartDate('');
            setEndDate('');
            resetForm();
          }} disabled={loading} className="w-full sm:w-auto">
            Clear
          </Button>
          <Button type="submit" variant="primary" disabled={loading || fetchingExisting} className="w-full sm:w-auto">
            {loading 
              ? (existingOverride ? 'Updating...' : 'Creating...') 
              : (existingOverride ? 'Override' : 'Override')}
          </Button>
        </div>
      </div>
    </form>

    </div>
  );
};

