// import { getRepository } from 'typeorm';
import { BusinessHours } from '../models/BusinessHours';
import { Holiday } from '../models/Holiday';
import { AppDataSource } from '../config/database';

/**
 * Creates a new Date object with UTC timezone
 * Use this when creating dates to be stored in the database
 * @param date Optional Date or date string to convert to UTC
 * @returns Date object in UTC timezone
 */
export function createUTCDate(date?: Date | string): Date {
  if (!date) {
    // Create a new Date in UTC
    const now = new Date();
    return new Date(Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth(),
      now.getUTCDate(),
      now.getUTCHours(),
      now.getUTCMinutes(),
      now.getUTCSeconds(),
      now.getUTCMilliseconds()
    ));
  }
  
  if (typeof date === 'string') {
    // Parse the string into a Date object
    const parsedDate = new Date(date);
    return new Date(Date.UTC(
      parsedDate.getUTCFullYear(),
      parsedDate.getUTCMonth(),
      parsedDate.getUTCDate(),
      parsedDate.getUTCHours(),
      parsedDate.getUTCMinutes(),
      parsedDate.getUTCSeconds(),
      parsedDate.getUTCMilliseconds()
    ));
  }
  
  // Convert existing Date to UTC
  return new Date(Date.UTC(
    date.getUTCFullYear(),
    date.getUTCMonth(),
    date.getUTCDate(),
    date.getUTCHours(),
    date.getUTCMinutes(),
    date.getUTCSeconds(),
    date.getUTCMilliseconds()
  ));
}

/**
 * Check if a date is within business hours
 * @param date Date to check
 * @param businessHoursId ID of business hours configuration
 * @returns true if within business hours
 */
export async function isWithinBusinessHours(date: Date, businessHoursId: number): Promise<boolean> {
  const businessHoursRepository = AppDataSource.getRepository(BusinessHours);
  const businessHours = await businessHoursRepository.findOne({ where: { id: businessHoursId } });
  
  if (!businessHours) {
    return true; // Default to true if no business hours defined
  }
  
  const day = date.getDay(); // 0 = Sunday, 1 = Monday, ...
  const hours = date.getHours();
  const minutes = date.getMinutes();
  const currentTime = hours * 60 + minutes; // Convert to minutes since day start
  
  let dayStartTimeProperty: keyof BusinessHours;
  let dayEndTimeProperty: keyof BusinessHours;
  
  switch (day) {
    case 0: // Sunday
      dayStartTimeProperty = 'sundayStart' as keyof BusinessHours;
      dayEndTimeProperty = 'sundayEnd' as keyof BusinessHours;
      break;
    case 1: // Monday
      dayStartTimeProperty = 'mondayStart' as keyof BusinessHours;
      dayEndTimeProperty = 'mondayEnd' as keyof BusinessHours;
      break;
    case 2: // Tuesday
      dayStartTimeProperty = 'tuesdayStart' as keyof BusinessHours;
      dayEndTimeProperty = 'tuesdayEnd' as keyof BusinessHours;
      break;
    case 3: // Wednesday
      dayStartTimeProperty = 'wednesdayStart' as keyof BusinessHours;
      dayEndTimeProperty = 'wednesdayEnd' as keyof BusinessHours;
      break;
    case 4: // Thursday
      dayStartTimeProperty = 'thursdayStart' as keyof BusinessHours;
      dayEndTimeProperty = 'thursdayEnd' as keyof BusinessHours;
      break;
    case 5: // Friday
      dayStartTimeProperty = 'fridayStart' as keyof BusinessHours;
      dayEndTimeProperty = 'fridayEnd' as keyof BusinessHours;
      break;
    case 6: // Saturday
      dayStartTimeProperty = 'saturdayStart' as keyof BusinessHours;
      dayEndTimeProperty = 'saturdayEnd' as keyof BusinessHours;
      break;
    default:
      return false;
  }
  
  const dayStartTime = businessHours[dayStartTimeProperty];
  const dayEndTime = businessHours[dayEndTimeProperty];
  
  if (!dayStartTime || !dayEndTime) {
    return false; // Closed on this day
  }
  
  // Convert time strings to minutes
  const startTimeParts = (dayStartTime as string).split(':');
  const endTimeParts = (dayEndTime as string).split(':');
  const startMinutes = parseInt(startTimeParts[0]) * 60 + parseInt(startTimeParts[1]);
  const endMinutes = parseInt(endTimeParts[0]) * 60 + parseInt(endTimeParts[1]);
  
  // Check if current time is within business hours
  return currentTime >= startMinutes && currentTime <= endMinutes;
}

/**
 * Check if a date is a holiday
 * @param date Date to check
 * @param businessHoursId ID of business hours configuration
 * @returns true if date is a holiday
 */
export async function isHoliday(date: Date, businessHoursId: number): Promise<boolean> {
  const holidayRepository = AppDataSource.getRepository(Holiday);
  
  // Format date to YYYY-MM-DD
  const formattedDate = date.toISOString().split('T')[0];
  
  // Check for exact date match
  const exactDateHoliday = await holidayRepository.findOne({
    where: {
      businessHoursId,
      date: formattedDate,
    } as any
  });
  
  if (exactDateHoliday) {
    return true;
  }
  
  // Check for recurring holidays (same month/day, any year)
  const month = date.getMonth() + 1; // getMonth() is 0-indexed
  const day = date.getDate();
  
  const recurringHolidays = await holidayRepository.find({
    where: {
      businessHoursId,
      recurring: true,
    } as any
  });
  
  for (const holiday of recurringHolidays) {
    const holidayDate = new Date(holiday.date);
    
    if (holidayDate.getMonth() + 1 === month && holidayDate.getDate() === day) {
      return true;
    }
  }
  
  return false;
}

/**
 * Add business hours to a date
 * @param date Base date
 * @param hours Number of business hours to add
 * @param businessHoursOnly Whether to consider only business days (Mon-Fri)
 * @returns New date with business hours added
 */
export function addBusinessHours(date: Date, hours: number, businessHoursOnly: boolean = true): Date {
  if (!businessHoursOnly) {
    // If not using business hours only, simply add the hours (24/7)
    const result = new Date(date);
    // Use milliseconds for more precise calculation
    const millisToAdd = hours * 60 * 60 * 1000;
    result.setTime(result.getTime() + millisToAdd);
    return result;
  }
  
  // Business hours constants
  const BUSINESS_START_HOUR = 9; // 9am
  const BUSINESS_END_HOUR = 17;  // 5pm
  const BUSINESS_HOURS_PER_DAY = BUSINESS_END_HOUR - BUSINESS_START_HOUR;
  
  // Clone the date to avoid modifying the original
  const result = new Date(date);
  
  // Calculate full business days and remaining hours
  const fullBusinessDays = Math.floor(hours / BUSINESS_HOURS_PER_DAY);
  let remainingHours = hours % BUSINESS_HOURS_PER_DAY;
  
  // Current time info
  let currentHour = result.getHours();
  let currentMinute = result.getMinutes();
  let currentSeconds = result.getSeconds();
  let currentMilliseconds = result.getMilliseconds();
  let currentDay = result.getDay();
  let isBusinessDay = currentDay >= 1 && currentDay <= 5; // Monday-Friday
  let isBusinessHour = currentHour >= BUSINESS_START_HOUR && currentHour < BUSINESS_END_HOUR;
  
  // First, handle the case where we're starting outside of business hours
  if (isBusinessDay) {
    // If we're before business hours on a business day
    if (currentHour < BUSINESS_START_HOUR) {
      // Preserve minutes, seconds and milliseconds from original time
      result.setHours(BUSINESS_START_HOUR, currentMinute, currentSeconds, currentMilliseconds);
    }
    // If we're after business hours on a business day
    else if (currentHour >= BUSINESS_END_HOUR) {
      // Move to the next day and set to business start time
      result.setDate(result.getDate() + 1);
      // Preserve minutes, seconds and milliseconds from original time
      result.setHours(BUSINESS_START_HOUR, currentMinute, currentSeconds, currentMilliseconds);
      // Check if we landed on a weekend
      const newDay = result.getDay();
      if (newDay === 0) { // Sunday
        result.setDate(result.getDate() + 1); // Move to Monday
      } else if (newDay === 6) { // Saturday
        result.setDate(result.getDate() + 2); // Move to Monday
      }
    }
  } else {
    // We're on a weekend - move to next Monday
    const daysUntilMonday = currentDay === 0 ? 1 : 2; // 1 day if Sunday, 2 days if Saturday
    result.setDate(result.getDate() + daysUntilMonday);
    // Preserve minutes, seconds and milliseconds from original time
    result.setHours(BUSINESS_START_HOUR, currentMinute, currentSeconds, currentMilliseconds);
  }
  
  // Now add full business days
  if (fullBusinessDays > 0) {
    let daysToAdd = 0;
    let businessDaysAdded = 0;
    
    while (businessDaysAdded < fullBusinessDays) {
      daysToAdd++;
      const futureDay = new Date(result);
      futureDay.setDate(futureDay.getDate() + daysToAdd);
      const futureDayOfWeek = futureDay.getDay();
      
      // Only count weekdays
      if (futureDayOfWeek >= 1 && futureDayOfWeek <= 5) {
        businessDaysAdded++;
      }
    }
    
    result.setDate(result.getDate() + daysToAdd);
  }
  
  // Finally, add remaining hours within the business day
  // Calculate hours in milliseconds for precise timing
  const remainingMilliseconds = remainingHours * 60 * 60 * 1000;
  result.setTime(result.getTime() + remainingMilliseconds);
  
  // Check if we've gone past business hours
  const newHour = result.getHours();
  if (newHour >= BUSINESS_END_HOUR) {
    // Move to the next business day
    result.setDate(result.getDate() + 1);
    // Roll over excess hours to the next day
    const excessHours = newHour - BUSINESS_END_HOUR;
    const excessMinutes = result.getMinutes();
    const excessSeconds = result.getSeconds();
    const excessMilliseconds = result.getMilliseconds();
    
    // Set to business start time plus excess time
    result.setHours(BUSINESS_START_HOUR + excessHours, excessMinutes, excessSeconds, excessMilliseconds);
    
    // Check if we landed on a weekend
    const resultDay = result.getDay();
    if (resultDay === 0) { // Sunday
      result.setDate(result.getDate() + 1); // Move to Monday
    } else if (resultDay === 6) { // Saturday
      result.setDate(result.getDate() + 2); // Move to Monday
    }
  }
  
  return result;
}

/**
 * Calculate business hours between two dates
 * @param startDate Start date
 * @param endDate End date
 * @param businessHoursId Optional ID of business hours configuration
 * @returns Number of business hours between dates
 */
export function calculateBusinessHours(startDate: Date, endDate: Date, businessHoursId?: number): number {
  // For now, we'll implement a simplified version that doesn't check actual business hours
  // In a real implementation, this would query the business hours config and calculate accordingly
  
  // Clone dates to avoid modifying originals
  const start = new Date(startDate);
  const end = new Date(endDate);
  
  // Simple case: same day
  if (start.toDateString() === end.toDateString()) {
    const isWeekend = start.getDay() === 0 || start.getDay() === 6;
    if (isWeekend) {
      return 0;
    }
    
    // Calculate hours difference on same day
    const diffHours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
    // Limit to 8 business hours per day
    return Math.min(diffHours, 8);
  }
  
  // Complex case: different days
  let totalHours = 0;
  let currentDate = new Date(start);
  
  // Handle first partial day
  if (start.getDay() !== 0 && start.getDay() !== 6) { // Not weekend
    const endOfDay = new Date(start);
    endOfDay.setHours(17, 0, 0, 0); // Assume 9-5 workday
    
    if (start.getHours() < 9) {
      // Before business hours
      totalHours += 8;
    } else if (start.getHours() >= 17) {
      // After business hours
      totalHours += 0;
    } else {
      // During business hours
      const hoursRemaining = (endOfDay.getTime() - start.getTime()) / (1000 * 60 * 60);
      totalHours += Math.min(hoursRemaining, 8);
    }
  }
  
  // Move to next day
  currentDate.setDate(currentDate.getDate() + 1);
  currentDate.setHours(0, 0, 0, 0);
  
  // Handle full days in between
  while (currentDate.toDateString() !== end.toDateString()) {
    const isWeekend = currentDate.getDay() === 0 || currentDate.getDay() === 6;
    if (!isWeekend) {
      totalHours += 8; // Full business day
    }
    currentDate.setDate(currentDate.getDate() + 1);
  }
  
  // Handle last partial day
  if (end.getDay() !== 0 && end.getDay() !== 6) { // Not weekend
    const startOfDay = new Date(end);
    startOfDay.setHours(9, 0, 0, 0); // Assume 9-5 workday
    
    if (end.getHours() <= 9) {
      // Before business hours
      totalHours += 0;
    } else if (end.getHours() >= 17) {
      // After business hours
      totalHours += 8;
    } else {
      // During business hours
      const hoursElapsed = (end.getTime() - startOfDay.getTime()) / (1000 * 60 * 60);
      totalHours += Math.min(hoursElapsed, 8);
    }
  }
  
  return totalHours;
} 