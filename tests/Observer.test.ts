import { describe, it, expect } from 'vitest'
import { Observer } from '../src/Observer'

describe('Observer', () => {
  it('circular buffer wraps correctly at windowSize', () => {
    const observer = new Observer(3)

    observer.record({ durationMs: 10, success: true })
    observer.record({ durationMs: 20, success: true })
    observer.record({ durationMs: 30, success: true })
    observer.record({ durationMs: 40, success: true }) // This should wrap

    // After wrapping, should only have last 3 entries
    expect(observer.count()).toBe(3)
  })

  it('p50 returns correct median', () => {
    const observer = new Observer(10)

    observer.record({ durationMs: 10, success: true })
    observer.record({ durationMs: 20, success: true })
    observer.record({ durationMs: 30, success: true })
    observer.record({ durationMs: 40, success: true })
    observer.record({ durationMs: 50, success: true })

    const p50 = observer.p50()
    // Sorted: [10, 20, 30, 40, 50], median at index 2 is 30
    expect(p50).toBe(30)
  })

  it('errorRate is correct ratio of failures', () => {
    const observer = new Observer(10)

    observer.record({ durationMs: 10, success: true })
    observer.record({ durationMs: 20, success: false })
    observer.record({ durationMs: 30, success: true })
    observer.record({ durationMs: 40, success: false })
    observer.record({ durationMs: 50, success: true })

    const errorRate = observer.errorRate()
    expect(errorRate).toBe(0.4) // 2 failures out of 5
  })

  it('successRate is inverse of errorRate', () => {
    const observer = new Observer(10)

    observer.record({ durationMs: 10, success: true })
    observer.record({ durationMs: 20, success: false })
    observer.record({ durationMs: 30, success: true })

    const successRate = observer.successRate()
    const errorRate = observer.errorRate()
    expect(successRate + errorRate).toBeCloseTo(1.0)
  })

  it('successStreak counts correctly from end', () => {
    const observer = new Observer(10)

    observer.record({ durationMs: 10, success: true })
    observer.record({ durationMs: 20, success: false })
    observer.record({ durationMs: 30, success: true })
    observer.record({ durationMs: 40, success: true })
    observer.record({ durationMs: 50, success: true })

    const streak = observer.successStreak()
    expect(streak).toBe(3) // Last 3 are successes
  })

  it('successStreak resets on failure', () => {
    const observer = new Observer(10)

    observer.record({ durationMs: 10, success: true })
    observer.record({ durationMs: 20, success: true })
    observer.record({ durationMs: 30, success: false })
    observer.record({ durationMs: 40, success: true })

    const streak = observer.successStreak()
    expect(streak).toBe(1) // Only 1 success after the failure
  })

  it('returns 0 metrics for empty buffer', () => {
    const observer = new Observer(10)

    expect(observer.p50()).toBe(0)
    expect(observer.errorRate()).toBe(0)
    expect(observer.successRate()).toBe(0) // Empty buffer should return 0, not 1
    expect(observer.successStreak()).toBe(0)
    expect(observer.count()).toBe(0)
  })

  it('handles single record correctly', () => {
    const observer = new Observer(10)

    observer.record({ durationMs: 42, success: true })

    expect(observer.p50()).toBe(42)
    expect(observer.errorRate()).toBe(0)
    expect(observer.successStreak()).toBe(1)
    expect(observer.count()).toBe(1)
  })

  it('circular buffer wraps and overwrites old entries', () => {
    const observer = new Observer(2)

    observer.record({ durationMs: 10, success: true })
    observer.record({ durationMs: 20, success: true })
    expect(observer.count()).toBe(2)

    observer.record({ durationMs: 30, success: false })
    expect(observer.count()).toBe(2) // Still 2, wrapped around

    // Now buffer should have entries from index 1 and 0 (newest at pointer)
    const errorRate = observer.errorRate()
    expect(errorRate).toBeGreaterThan(0) // Should include the failed entry
  })

  it('p50 with even number of items', () => {
    const observer = new Observer(10)

    observer.record({ durationMs: 10, success: true })
    observer.record({ durationMs: 20, success: true })
    observer.record({ durationMs: 30, success: true })
    observer.record({ durationMs: 40, success: true })

    const p50 = observer.p50()
    // Sorted: [10, 20, 30, 40], median should be floor(4/2) = 2 → 30
    expect(p50).toBeGreaterThanOrEqual(20)
    expect(p50).toBeLessThanOrEqual(30)
  })

  it('all failures gives 100% error rate', () => {
    const observer = new Observer(10)

    observer.record({ durationMs: 10, success: false })
    observer.record({ durationMs: 20, success: false })
    observer.record({ durationMs: 30, success: false })

    expect(observer.errorRate()).toBe(1.0)
    expect(observer.successRate()).toBe(0)
    expect(observer.successStreak()).toBe(0)
  })
})
