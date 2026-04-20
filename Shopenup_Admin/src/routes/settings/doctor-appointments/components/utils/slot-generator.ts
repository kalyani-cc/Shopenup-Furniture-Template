// Helper function to generate time slots
export const generateTimeSlots = (fromTime: string, toTime: string, duration: number): string[] => {
  const slots: string[] = [];
  
  // Parse time strings (format: "HH:MM" or "HH:MM AM/PM")
  const parseTime = (timeStr: string): number => {
    let [hours, minutes] = timeStr.replace(/[AP]M/i, '').trim().split(':').map(Number);
    const isPM = /PM/i.test(timeStr) && hours !== 12;
    const isAM = /AM/i.test(timeStr) && hours === 12;
    
    if (isPM) hours += 12;
    if (isAM) hours = 0;
    
    return hours * 60 + minutes;
  };

  // Format minutes to time string
  const formatTime = (minutes: number): string => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    const period = hours >= 12 ? 'PM' : 'AM';
    const displayHours = hours > 12 ? hours - 12 : hours === 0 ? 12 : hours;
    return `${displayHours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')} ${period}`;
  };

  const startMinutes = parseTime(fromTime);
  const endMinutes = parseTime(toTime);

  let currentMinutes = startMinutes;
  while (currentMinutes + duration <= endMinutes) {
    const slotStart = formatTime(currentMinutes);
    const slotEnd = formatTime(currentMinutes + duration);
    slots.push(`${slotStart} - ${slotEnd}`);
    currentMinutes += duration;
  }

  return slots;
};

