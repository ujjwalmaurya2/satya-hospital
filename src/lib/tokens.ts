/**
 * Satya Hospital Identifier & Scheduling Logic
 * 
 * Rules:
 * - OPD starts at 09:30 AM IST (Asia/Kolkata)
 * - Online booking for a particular OPD date opens 1 calendar day before the appointment date.
 * - Online booking for that date closes strictly at 09:00 AM IST on the appointment date.
 * - After 09:00 AM, online booking for that date is rejected and the next eligible OPD date is shown.
 * - Offline walk-in registration at reception continues after 09:00 AM throughout OPD operating hours.
 * - NO fixed maximum daily patient count (unlimited daily capacity).
 * - Shared daily queue and sequential token-number system for both online and walk-in patients.
 * - Patient IDs: SH-YYYY-XXXXX (collision-safe, non-PII sequence).
 */

/**
 * Format date in Asia/Kolkata time zone as YYYY-MM-DD
 */
export function getHospitalTodayDate(): string {
  const now = new Date();
  const options: Intl.DateTimeFormatOptions = {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  };
  const parts = new Intl.DateTimeFormat('en-CA', options).formatToParts(now);
  const year = parts.find(p => p.type === 'year')?.value;
  const month = parts.find(p => p.type === 'month')?.value;
  const day = parts.find(p => p.type === 'day')?.value;
  return `${year}-${month}-${day}`;
}

/**
 * Add or subtract calendar days to a YYYY-MM-DD date string
 */
export function getHospitalDateWithOffset(days: number, baseDateStr?: string): string {
  const base = baseDateStr ? new Date(`${baseDateStr}T12:00:00Z`) : new Date();
  base.setDate(base.getDate() + days);
  const options: Intl.DateTimeFormatOptions = {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  };
  const parts = new Intl.DateTimeFormat('en-CA', options).formatToParts(base);
  const year = parts.find(p => p.type === 'year')?.value;
  const month = parts.find(p => p.type === 'month')?.value;
  const day = parts.find(p => p.type === 'day')?.value;
  return `${year}-${month}-${day}`;
}

/**
 * Get weekday name in English for a YYYY-MM-DD date in Asia/Kolkata
 */
export function getDayName(dateStr: string): string {
  const date = new Date(`${dateStr}T12:00:00Z`);
  return new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Kolkata', weekday: 'long' }).format(date);
}

/**
 * Check if a date is a regular operating day and not an approved hospital holiday
 */
export function isOperatingDay(
  dateStr: string, 
  operatingDays: string[] = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
  holidays: string[] = []
): boolean {
  if (holidays.includes(dateStr)) {
    return false;
  }
  const day = getDayName(dateStr);
  return operatingDays.includes(day);
}

/**
 * Get current time in Asia/Kolkata as { hours: number, minutes: number }
 */
export function getHospitalCurrentTime(): { hours: number; minutes: number } {
  const now = new Date();
  const timeString = now.toLocaleTimeString('en-US', {
    timeZone: 'Asia/Kolkata',
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
  });
  const [hours, minutes] = timeString.split(':').map(Number);
  return { hours, minutes };
}

/**
 * Calculates the NEXT eligible OPD date for online booking.
 * 
 * Rules:
 * - If today is an operating day and current time < 9:00 AM: Today is eligible!
 * - If today is at/after 9:00 AM (or today is a holiday/non-operating): Today is closed.
 *   The next eligible date is tomorrow (or the first upcoming operating day).
 */
export function getNextEligibleOpdDate(options?: {
  cutoffTimeStr?: string;
  operatingDays?: string[];
  holidays?: string[];
  currentTime?: { hours: number; minutes: number };
  baseDate?: string;
}): string {
  const cutoffTimeStr = options?.cutoffTimeStr || '09:00';
  const operatingDays = options?.operatingDays || ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const holidays = options?.holidays || [];
  const currentTime = options?.currentTime || getHospitalCurrentTime();
  const todayStr = options?.baseDate || getHospitalTodayDate();

  const [cutoffHour, cutoffMinute] = cutoffTimeStr.split(':').map(Number);
  const currentMinutesTotal = currentTime.hours * 60 + currentTime.minutes;
  const cutoffMinutesTotal = cutoffHour * 60 + cutoffMinute;

  // Check if today before 9:00 AM is eligible
  if (currentMinutesTotal < cutoffMinutesTotal && isOperatingDay(todayStr, operatingDays, holidays)) {
    return todayStr;
  }

  // Otherwise, find the next eligible date starting from tomorrow (offset +1, +2, ...)
  for (let i = 1; i <= 30; i++) {
    const candidate = getHospitalDateWithOffset(i, todayStr);
    if (isOperatingDay(candidate, operatingDays, holidays)) {
      return candidate;
    }
  }

  // Fallback to tomorrow
  return getHospitalDateWithOffset(1, todayStr);
}

/**
 * Validates if an online booking can be made for target date based on:
 * 1. T-1 Booking Window: Booking opens 1 calendar day before the appointment date.
 * 2. 09:00 AM Cutoff: Booking for that date closes at 09:00 AM IST on the appointment date.
 * 3. Operating Days & Holidays.
 */
export function checkOnlineBookingCutoff(
  targetDateStr: string,
  cutoffOrOptions?: string | {
    cutoffTimeStr?: string;
    operatingDays?: string[];
    holidays?: string[];
    currentTime?: { hours: number; minutes: number };
    baseDate?: string;
  }
): { allowed: boolean; reason?: string; nextEligibleDate?: string } {
  let cutoffTimeStr = '09:00';
  let operatingDays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  let holidays: string[] = [];
  let currentTime = getHospitalCurrentTime();
  let todayStr = getHospitalTodayDate();

  if (typeof cutoffOrOptions === 'string') {
    cutoffTimeStr = cutoffOrOptions;
  } else if (cutoffOrOptions && typeof cutoffOrOptions === 'object') {
    if (cutoffOrOptions.cutoffTimeStr) cutoffTimeStr = cutoffOrOptions.cutoffTimeStr;
    if (cutoffOrOptions.operatingDays) operatingDays = cutoffOrOptions.operatingDays;
    if (cutoffOrOptions.holidays) holidays = cutoffOrOptions.holidays;
    if (cutoffOrOptions.currentTime) currentTime = cutoffOrOptions.currentTime;
    if (cutoffOrOptions.baseDate) todayStr = cutoffOrOptions.baseDate;
  }

  const nextEligible = getNextEligibleOpdDate({
    cutoffTimeStr,
    operatingDays,
    holidays,
    currentTime,
    baseDate: todayStr,
  });

  // Past dates
  if (targetDateStr < todayStr) {
    return {
      allowed: false,
      reason: 'Bookings cannot be scheduled for past dates.',
      nextEligibleDate: nextEligible,
    };
  }

  // Check operating days / holidays
  if (!isOperatingDay(targetDateStr, operatingDays, holidays)) {
    const dayName = getDayName(targetDateStr);
    const isHoliday = holidays.includes(targetDateStr);
    return {
      allowed: false,
      reason: isHoliday
        ? `Hospital OPD is closed on ${targetDateStr} due to a scheduled hospital holiday.`
        : `Hospital OPD is not scheduled on ${dayName}s.`,
      nextEligibleDate: nextEligible,
    };
  }

  // Booking Window rule: Online booking for date D opens 1 calendar day before D
  const tomorrowStr = getHospitalDateWithOffset(1, todayStr);

  // If target date is further than tomorrow (e.g. today is 22nd, target is 24th or later):
  if (targetDateStr > tomorrowStr) {
    const opensOnDate = getHospitalDateWithOffset(-1, targetDateStr);
    return {
      allowed: false,
      reason: `Online booking for ${targetDateStr} opens 1 calendar day in advance on ${opensOnDate}. The next currently open OPD date is ${nextEligible}.`,
      nextEligibleDate: nextEligible,
    };
  }

  // If target date is tomorrow (opened today): It is allowed!
  if (targetDateStr === tomorrowStr) {
    return { allowed: true, nextEligibleDate: nextEligible };
  }

  // If target date is today: Enforce 09:00 AM cutoff
  if (targetDateStr === todayStr) {
    const [cutoffHour, cutoffMinute] = cutoffTimeStr.split(':').map(Number);
    const currentMinutesTotal = currentTime.hours * 60 + currentTime.minutes;
    const cutoffMinutesTotal = cutoffHour * 60 + cutoffMinute;

    if (currentMinutesTotal >= cutoffMinutesTotal) {
      return {
        allowed: false,
        reason: `Online bookings for today closed at ${cutoffTimeStr} AM IST. Please visit hospital reception for walk-in OPD token allocation (OPD begins at 9:30 AM). The next available online OPD date is ${nextEligible}.`,
        nextEligibleDate: nextEligible,
      };
    }
  }

  return { allowed: true, nextEligibleDate: nextEligible };
}

/**
 * Generate an immutable collision-safe Hospital Patient ID
 * Format: SH-YYYY-XXXXX (e.g., SH-2026-00104)
 */
export function generatePatientId(sequenceNumber: number): string {
  const year = new Date().getFullYear();
  const paddedSeq = sequenceNumber.toString().padStart(5, '0');
  return `SH-${year}-${paddedSeq}`;
}

/**
 * Generate Appointment Code
 */
export function generateAppointmentCode(seed: number): string {
  const year = new Date().getFullYear();
  const padded = seed.toString().padStart(4, '0');
  return `APT-${year}-${padded}`;
}

/**
 * Generate Lab Accession Number
 */
export function generateAccessionNumber(seed: number): string {
  const year = new Date().getFullYear();
  const padded = seed.toString().padStart(4, '0');
  return `ACC-${year}-${padded}`;
}

/**
 * Validate phone number (Standard 10-digit Indian Mobile Number)
 */
export function isValidIndianPhone(phone: string): boolean {
  const clean = phone.replace(/[\s-+]/g, '');
  return /^[6-9]\d{9}$/.test(clean);
}
