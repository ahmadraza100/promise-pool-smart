import { describe, it, expect } from 'vitest'
import { clamp, parseDuration, sleep } from '../src/utils'

describe('Utils', () => {
  describe('clamp', () => {
    it('clamp(5, 1, 10) === 5', () => {
      expect(clamp(5, 1, 10)).toBe(5)
    })

    it('clamp(0, 1, 10) === 1', () => {
      expect(clamp(0, 1, 10)).toBe(1)
    })

    it('clamp(15, 1, 10) === 10', () => {
      expect(clamp(15, 1, 10)).toBe(10)
    })

    it('clamp with negative values', () => {
      expect(clamp(-5, -10, 0)).toBe(-5)
      expect(clamp(-15, -10, 0)).toBe(-10)
      expect(clamp(5, -10, 0)).toBe(0)
    })

    it('clamp with equal min and max', () => {
      expect(clamp(5, 10, 10)).toBe(10)
      expect(clamp(15, 10, 10)).toBe(10)
    })
  })

  describe('parseDuration', () => {
    it('parses milliseconds', () => {
      expect(parseDuration('1000ms')).toBe(1000)
    })

    it('parses seconds', () => {
      expect(parseDuration('1s')).toBe(1000)
      expect(parseDuration('5s')).toBe(5000)
    })

    it('parses minutes', () => {
      expect(parseDuration('1m')).toBe(60000)
    })

    it('parses hours', () => {
      expect(parseDuration('1h')).toBe(3600000)
    })

    it('accepts number directly', () => {
      expect(parseDuration(5000)).toBe(5000)
    })

    it('throws on invalid format', () => {
      expect(() => parseDuration('invalid')).toThrow()
      expect(() => parseDuration('5x')).toThrow()
    })
  })

  describe('sleep', () => {
    it('resolves after specified time', async () => {
      const start = Date.now()
      await sleep(50)
      const duration = Date.now() - start
      expect(duration).toBeGreaterThanOrEqual(40)
      expect(duration).toBeLessThan(200) // Allow some slack
    })

    it('resolves immediately with 0ms', async () => {
      const start = Date.now()
      await sleep(0)
      const duration = Date.now() - start
      expect(duration).toBeLessThan(50)
    })
  })
})
