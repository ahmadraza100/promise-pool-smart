/**
 * Clamps a value between min and max
 */
export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max)
}

/**
 * Parse a duration string and convert to milliseconds
 * Supports: 1000ms, 1s, 1m, 1h
 */
export function parseDuration(input: string | number): number {
  if (typeof input === 'number') {
    return input
  }

  const match = input.match(/^(\d+)(ms|s|m|h)$/)
  if (!match) {
    throw new Error(`Invalid duration format: ${input}`)
  }

  const [, valueStr, unit] = match
  const value = parseInt(valueStr, 10)

  switch (unit) {
    case 'ms':
      return value
    case 's':
      return value * 1000
    case 'm':
      return value * 60 * 1000
    case 'h':
      return value * 60 * 60 * 1000
    default:
      throw new Error(`Unknown duration unit: ${unit}`)
  }
}

/**
 * Sleep for a given number of milliseconds
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}
