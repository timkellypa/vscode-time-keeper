import { settings } from '../settings'
import { padNumber } from './number-utils'

/**
 * Check if a date is valid
 * @param date date instance to check
 * @returns whether or not the date has a numeric time (is valid)
 */
export function isValidDate (date: Date): boolean {
  return !isNaN(date.getTime())
}

/**
 * Return ISO format for date, in local time.
 * @param date the date to format
 * @returns ISO formatted date YYYY-MM-DD
 */
export function formatDate (date: Date): string {
  return `${date.getFullYear()}-${padNumber(date.getMonth() + 1, 2)}-${padNumber(date.getDate(), 2)}`
}

/**
 * Get a Date object from an ISO date string.
 * @param dateString ISO date string in the format YYYY-MM-DD
 * @returns Javascript Date object representing the date in local time.
 */
export function dateFromIsoString (dateString: string): Date {
  // Since ISO string usually indicates UTC and we want local, just pass in the date parts separately.
  const parts = dateString.split('-')
  return new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10), 0, 0, 0, 0)
}

/**
 * Format our duration as the number of hours, with a max, 2-digit decimal to represent our minutes.
 * @param minutes number of minutes
 * @param blankIfZero if true, returns an empty string if 0 (more legible on reports)
 * @returns a string representing our duration
 */
export function formatDuration (minutes: number, blankIfZero: boolean = false): string {
  if (minutes === 0 && blankIfZero) {
    return ''
  }
  // show with max of 2 decimal places, rounded.
  return `${(Math.round(minutes * 100 / 60.0) / 100)}`
}

/**
 * Get the current time, in 24 hour format with 0-padded hours and minutes
 * @returns string representing current time
 */
export function getCurrentTime (): string {
  const dt = new Date()
  const hour = dt.getHours()
  const minute = dt.getMinutes()
  return `${padNumber(hour, 2)}:${padNumber(minute, 2)}`
}

/**
 * Get the closest interval to the current time.
 * For instance, if the interval is 15 minutes, and the time is 9:05, return 09:00.
 * At 9:10, return 09:15.
 * @returns the closest interval to the current time.
 */
export function getClosestIntervalToCurrentTime (): string {
  const currentTime = getCurrentTime()
  const currentTimeParts = currentTime.split(':').map((timePart) => parseInt(timePart, 10))
  const currentMinuteTotal = currentTimeParts[0] * 60 + currentTimeParts[1]

  let absDifference: number | null = null

  // start with current hour, find closest absolute value difference
  for (let h = currentTimeParts[0]; h <= currentTimeParts[0] + 1; ++h) {
    for (let m = 0; m < 60; m += settings.interval) {
      const oldDiff = absDifference
      absDifference = Math.abs(currentMinuteTotal - (h * 60 + m))

      // When absolute value decreases, we've found the closest value, the previous once
      if (oldDiff != null && oldDiff <= absDifference) {
        if (m === 0) {
          h -= 1
          m = 60
        }

        // If somehow we are below 0 after adjusting for negative minutes, return 0.
        if (h < 0) {
          return '00:00'
        }

        return `${padNumber(h, 2)}:${padNumber(m - settings.interval, 2)}`
      }
    }
  }

  throw new Error(`Unexpected State:  Closest Current Interval not found!  Current Time=${currentTime}`)
}

/**
 * Total number of minutes in the current time string.
 * @param time 24-hour, 0-padded time string of hours and minutes
 * @returns number of minutes contained in this string representation of the time.
 */
export function getMinutesForTime (time: string): number {
  const timeParts = time.split(':')
  return parseInt(timeParts[0], 10) * 60 + parseInt(timeParts[1] ?? 0, 10)
}

/**
 * Get the beginning of the week, based on what is set as our day 1 offset.
 * @returns the first day of the week
 */
export function getDay1 (dt: Date): Date {
  const returnDate = new Date(dt)

  if (returnDate.getDay() < settings.day1Offset) {
    returnDate.setDate(returnDate.getDate() - 7 + settings.day1Offset)
  } else {
    returnDate.setDate(returnDate.getDate() - returnDate.getDay() + settings.day1Offset)
  }

  return returnDate
}

export function getDayIndex (dt: Date): number {
  const day1 = getDay1(dt)
  return (dt.getTime() - day1.getTime()) / (1000 * 60 * 60 * 24)
}

/**
 * Get the last day of the week.
 * @returns the last day of the week
 */
export function getDay7 (dt: Date): Date {
  const returnDate = new Date(dt)
  const day1 = getDay1(returnDate)
  returnDate.setDate(day1.getDate() + 6)
  return returnDate
}

/**
 * Return time options to be used for a time selection UI element.
 * Order is sorted so that the current time is at the beginning of the list, and times prior to the current time
 * are pushed to the end of the list.
 * @param minTime the minimum time to allow in our list.
 * @param options options containing currentTimeFirst and includeEmpty.
 * @returns an array of formatted time strings for a time selection.
 */
export function getTimeOptions (minTime: string = '00:00', { currentTimeFirst = true, includeEmpty = false, includeStartTime = true }): string[] {
  let times = []

  if (includeEmpty) {
    times.push('')
  }

  for (let h = 0; h < 24; ++h) {
    for (let m = 0; m < 60; m += settings.interval) {
      const minTimeMinutes = getMinutesForTime(minTime)
      const currentMinutes = h * 60 + m

      if ((includeStartTime && minTimeMinutes === currentMinutes) ||
        (minTimeMinutes < currentMinutes)) {
        times.push(`${padNumber(h, 2)}:${padNumber(m, 2)}`)
      }
    }
  }

  // always allow 24:00
  times.push('24:00')

  // Put the current time first, so it is the first thing a user can select.
  if (currentTimeFirst) {
    const currentTime = getClosestIntervalToCurrentTime()
    const endOfArray = times.splice(includeEmpty ? 1 : 0, times.indexOf(currentTime))
    times = times.concat(endOfArray)
  }
  return times
}
