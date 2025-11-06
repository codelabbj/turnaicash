import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Formats a phone number by removing all non-digit characters (spaces, plus signs, etc.)
 * Example: "+229 01 57455419" -> "2290157455419"
 */
export function formatPhoneNumber(phone: string): string {
  if (!phone) return phone
  // Remove all non-digit characters
  return phone.replace(/\D/g, '')
}

/**
 * Formats a phone number for display by adding "+" at the start if not present
 * Example: "2290157455419" -> "+2290157455419"
 */
export function formatPhoneNumberForDisplay(phone: string): string {
  if (!phone) return phone
  // If phone doesn't start with +, add it
  if (!phone.startsWith('+')) {
    return `+${phone}`
  }
  return phone
}
