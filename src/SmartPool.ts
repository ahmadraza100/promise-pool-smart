import { SmartPoolOptions, MapOptions, Mapper, Task, PoolStats } from './types'
import { Observer } from './Observer'
import { clamp } from './utils'

/**
 * SmartPool is a self-tuning promise concurrency pool that automatically
 * adjusts concurrency based on real-time success rate, error rate, and latency
 * using the AIMD (Additive Increase Multiplicative Decrease) algorithm.
 */
export class SmartPool {
  private concurrency: number
  private min: number
  private max: number
  private targetErrorRate: number
  private targetP50Ms: number
  private increaseStep: number
  private onConcurrencyChange?: (n: number) => void

  private activeCount: number = 0
  private queue: Array<() => Promise<void>> = []
  private observer: Observer
  private totalProcessed: number = 0

  private isDestroyed: boolean = false

  /**
   * Creates a new SmartPool instance
   */
  constructor(options: SmartPoolOptions = {}) {
    this.min = options.min ?? 1
    this.max = options.max ?? 20
    this.concurrency = options.start ?? 3
    this.targetErrorRate = options.targetErrorRate ?? 0.05
    this.targetP50Ms = options.targetP50Ms ?? 1000
    this.increaseStep = options.increaseStep ?? 1
    this.onConcurrencyChange = options.onConcurrencyChange

    const windowSize = options.windowSize ?? 100
    this.observer = new Observer(windowSize)

    this.concurrency = clamp(this.concurrency, this.min, this.max)
  }

  /**
   * Processes an array of items with auto-tuned concurrency
   */
  async map<T, R>(items: T[], mapper: Mapper<T, R>, options: MapOptions = {}): Promise<R[]> {
    if (this.isDestroyed) {
      throw new Error('Pool has been destroyed')
    }

    if (items.length === 0) {
      return []
    }

    const results: Array<R | Error> = new Array(items.length)
    const errors: Error[] = []
    let shouldStop = false

    const taskPromises = items.map((item, index) => {
      if (shouldStop) {
        return Promise.resolve()
      }

      return this.run(async () => {
        if (shouldStop) {
          return
        }

        try {
          const result = await mapper(item, index)
          results[index] = result
        } catch (error) {
          const err = error instanceof Error ? error : new Error(String(error))
          results[index] = err
          errors.push(err)

          if (options.bail) {
            shouldStop = true
            throw err
          }
        }
      }).catch((error) => {
        if (options.bail && shouldStop) {
          throw error
        }
      })
    })

    try {
      await Promise.all(taskPromises)
    } catch {
      if (options.bail) {
        throw new AggregateError(errors, 'Pool map failed')
      }
    }

    // Check for errors and throw AggregateError if any exist
    if (errors.length > 0) {
      throw new AggregateError(errors, `${errors.length} task(s) failed in pool.map()`)
    }

    // Cast results to R[] since we already checked for errors
    return results as R[]
  }

  /**
   * Runs a single task respecting the current concurrency limit
   */
  async run<T>(task: Task<T>): Promise<T> {
    if (this.isDestroyed) {
      throw new Error('Pool has been destroyed')
    }

    return new Promise((resolve, reject) => {
      const executeTask = async () => {
        this.activeCount++
        const startTime = Date.now()

        try {
          const result = await task()
          const duration = Date.now() - startTime
          this.observer.record({ durationMs: duration, success: true })
          this.totalProcessed++
          this.adjustConcurrency()
          resolve(result)
        } catch (error) {
          const duration = Date.now() - startTime
          this.observer.record({ durationMs: duration, success: false })
          this.totalProcessed++
          this.adjustConcurrency()
          reject(error)
        } finally {
          this.activeCount--
          this.drainQueue()
        }
      }

      if (this.activeCount < this.concurrency) {
        executeTask()
      } else {
        this.queue.push(executeTask)
      }
    })
  }

  /**
   * Gets the current pool statistics
   */
  stats(): PoolStats {
    return {
      concurrency: this.concurrency,
      p50: this.observer.p50(),
      errorRate: this.observer.errorRate(),
      processed: this.totalProcessed,
      successRate: this.observer.successRate(),
      active: this.activeCount,
    }
  }

  /**
   * Destroys the pool and cleans up resources
   */
  destroy(): void {
    this.isDestroyed = true
    this.queue = []
    this.observer = new Observer(100)
    this.onConcurrencyChange = undefined
  }

  /**
   * Drains the queue by executing pending tasks if slots are available
   */
  private drainQueue(): void {
    while (this.queue.length > 0 && this.activeCount < this.concurrency) {
      const task = this.queue.shift()
      if (task) {
        task()
      }
    }
  }

  /**
   * Applies AIMD algorithm to adjust concurrency
   */
  private adjustConcurrency(): void {
    const errorRate = this.observer.errorRate()
    const p50 = this.observer.p50()
    const successStreak = this.observer.successStreak()

    let newConcurrency = this.concurrency

    // Additive Increase: all metrics are good
    if (
      successStreak > 10 &&
      p50 < this.targetP50Ms &&
      errorRate < this.targetErrorRate
    ) {
      newConcurrency = Math.min(this.max, this.concurrency + this.increaseStep)
    }
    // Multiplicative Decrease: something is wrong
    else if (errorRate > this.targetErrorRate || p50 > this.targetP50Ms * 1.5) {
      newConcurrency = Math.max(this.min, Math.floor(this.concurrency / 2))
    }

    if (newConcurrency !== this.concurrency) {
      this.concurrency = newConcurrency
      this.onConcurrencyChange?.(this.concurrency)
    }
  }
}
