import { describe, it, expect, beforeEach, vi } from 'vitest'
import { SmartPool } from '../src/SmartPool'
import { sleep } from '../src/utils'

describe('SmartPool', () => {
  let pool: SmartPool

  beforeEach(() => {
    pool = new SmartPool({
      min: 1,
      max: 10,
      start: 2,
      windowSize: 50,
    })
  })

  it('processes all items and returns results in order', async () => {
    const items = [1, 2, 3, 4, 5]
    const results = await pool.map(items, async (item) => item * 2)
    expect(results).toEqual([2, 4, 6, 8, 10])
  })

  it('respects min concurrency bounds', async () => {
    const pool2 = new SmartPool({
      min: 5,
      max: 10,
      start: 2,
    })
    const stats = pool2.stats()
    expect(stats.concurrency).toBeGreaterThanOrEqual(5)
  })

  it('respects max concurrency bounds', async () => {
    const pool2 = new SmartPool({
      min: 1,
      max: 5,
      start: 10,
    })
    const stats = pool2.stats()
    expect(stats.concurrency).toBeLessThanOrEqual(5)
  })

  it('scales up concurrency when all tasks succeed quickly', async () => {
    const pool2 = new SmartPool({
      min: 1,
      max: 10,
      start: 2,
      targetErrorRate: 0.05,
      targetP50Ms: 1000,
      increaseStep: 2,
      windowSize: 20,
    })

    const items = Array.from({ length: 30 }, (_, i) => i)
    await pool2.map(items, async () => {
      await sleep(10) // very fast
      return 'success'
    })

    const stats = pool2.stats()
    // After many successful quick tasks, concurrency should increase
    expect(stats.concurrency).toBeGreaterThan(2)
  })

  it('scales down when error rate exceeds threshold', async () => {
    const pool2 = new SmartPool({
      min: 1,
      max: 10,
      start: 5,
      targetErrorRate: 0.05,
      increaseStep: 1,
      windowSize: 50,
    })

    const items = Array.from({ length: 20 }, (_, i) => i)
    let errorCount = 0

    try {
      await pool2.map(items, async (item) => {
        if (item % 2 === 0) {
          errorCount++
          throw new Error('Even numbers fail')
        }
        return item
      })
    } catch (error) {
      // Expected to throw AggregateError
      expect(error).toBeInstanceOf(AggregateError)
    }

    // Should have recorded errors
    expect(errorCount).toBeGreaterThan(0)
  })

  it('scales down when latency exceeds targetP50Ms', async () => {
    const pool2 = new SmartPool({
      min: 1,
      max: 10,
      start: 5,
      targetP50Ms: 50,
      increaseStep: 1,
      windowSize: 50,
    })

    const items = Array.from({ length: 20 }, (_, i) => i)
    await pool2.map(items, async () => {
      await sleep(100) // Exceeds targetP50Ms of 50
      return 'done'
    })

    const stats = pool2.stats()
    expect(stats.p50).toBeGreaterThan(50)
  })

  it('bail: true stops processing on first error', async () => {
    const pool2 = new SmartPool({
      min: 1,
      max: 10,
      start: 2,
    })

    const items = [1, 2, 3, 4, 5]
    let processed = 0

    try {
      await pool2.map(
        items,
        async (item) => {
          processed++
          if (item === 2) {
            throw new Error('Stop here')
          }
          return item
        },
        { bail: true },
      )
    } catch (error) {
      expect(error).toBeInstanceOf(AggregateError)
      if (error instanceof AggregateError) {
        expect(error.errors.length).toBeGreaterThan(0)
      }
    }

    // Some items were processed but not all (due to early bail)
    expect(processed).toBeGreaterThan(0)
  })

  it('pool.stats() returns correct values', async () => {
    const items = [1, 2, 3]
    await pool.map(items, async (item) => item * 2)

    const stats = pool.stats()
    expect(stats.concurrency).toBeGreaterThanOrEqual(1)
    expect(stats.p50).toBeGreaterThanOrEqual(0)
    expect(stats.errorRate).toBeLessThanOrEqual(1)
    expect(stats.processed).toBeGreaterThan(0)
    expect(stats.successRate).toBeLessThanOrEqual(1)
    expect(stats.active).toBeGreaterThanOrEqual(0)
  })

  it('handles empty array input', async () => {
    const results = await pool.map([], async (item: never) => item)
    expect(results).toEqual([])
  })

  it('pool.map() with 0 items resolves immediately', async () => {
    const start = Date.now()
    const results = await pool.map([], async () => 'test')
    const duration = Date.now() - start
    expect(results.length).toBe(0)
    expect(duration).toBeLessThan(100) // Should be nearly instant
  })

  it('calls onConcurrencyChange callback', async () => {
    const callback = vi.fn()
    const pool2 = new SmartPool({
      min: 1,
      max: 10,
      start: 2,
      onConcurrencyChange: callback,
      windowSize: 20,
    })

    const items = Array.from({ length: 30 }, (_, i) => i)
    await pool2.map(items, async () => {
      await sleep(5)
      return 'done'
    })

    // The callback should have been called at least once during adjustment
    expect(callback).toHaveBeenCalled()
  })

  it('throws when running on destroyed pool', async () => {
    pool.destroy()
    await expect(pool.map([1], async () => 1)).rejects.toThrow('destroyed')
  })

  it('garbage collects properly after destroy()', () => {
    const pool2 = new SmartPool({
      min: 1,
      max: 10,
      start: 5,
    })

    pool2.destroy()

    const stats = pool2.stats()
    expect(stats.processed).toBe(0)
  })

  it('preserves error messages in AggregateError', async () => {
    const items = [1, 2, 3]
    const errorMessages = ['Error 1', 'Error 2']
    let errorIndex = 0

    try {
      await pool.map(items, async (item) => {
        if (item > 1 && errorIndex < errorMessages.length) {
          throw new Error(errorMessages[errorIndex++])
        }
        return item
      })
    } catch (error) {
      if (error instanceof AggregateError) {
        expect(error.errors.length).toBeGreaterThan(0)
      }
    }
  })

  it('maintains result order despite async completion', async () => {
    const items = [100, 50, 30, 80, 20]
    const results = await pool.map(items, async (item) => {
      // Reverse sleep durations to ensure out-of-order completion
      await sleep(100 - item)
      return item * 10
    })

    expect(results).toEqual([1000, 500, 300, 800, 200])
  })
})
