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
