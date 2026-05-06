import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const TIMEZONE_PHT = 'Asia/Manila';

export function formatDateTimePHT(date: string | number | Date) {
  return new Intl.DateTimeFormat('en-PH', {
    timeZone: TIMEZONE_PHT,
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(date));
}

export function formatDatePHT(date: string | number | Date) {
  return new Intl.DateTimeFormat('en-PH', {
    timeZone: TIMEZONE_PHT,
    dateStyle: 'medium',
  }).format(new Date(date));
}

export function formatTimePHT(date: string | number | Date) {
  return new Intl.DateTimeFormat('en-PH', {
    timeZone: TIMEZONE_PHT,
    timeStyle: 'short',
  }).format(new Date(date));
}

export function incrementBatchNumber(lastBatch: string): string {
  // Regex to find the last sequence of digits in the string
  const match = lastBatch.match(/(.*?)(\d+)([^\d]*)$/);
  
  if (!match) {
    // If no numbers found, append -1 (or -2 if we assume the input was the first one)
    return `${lastBatch}-02`;
  }

  const prefix = match[1];
  const digits = match[2];
  const suffix = match[3];
  
  const nextNumber = (parseInt(digits, 10) + 1).toString();
  const paddedNumber = nextNumber.padStart(digits.length, '0');
  
  return `${prefix}${paddedNumber}${suffix}`;
}
