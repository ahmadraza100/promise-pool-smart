/**
 * Type representing a task that returns a promise
 */
export type Task<T> = () => Promise<T>

/**
 * Type representing a function that processes items
 */
export type Mapper<T, R> = (item: T, index: number) => Promise<R>

/**
 * Configuration options for SmartPool
 */
export interface SmartPoolOptions {
  /**
   * Minimum concurrency level (default: 1)
   */
  min?: number

  /**
   * Maximum concurrency level (default: 20)
   */
  max?: number

  /**
   * Initial concurrency level (default: 3)
   */
  start?: number

  /**
   * Target error rate threshold for scaling decisions (default: 0.05)
   */
  targetErrorRate?: number

  /**
   * Target P50 latency threshold in milliseconds (default: 1000)
   */
  targetP50Ms?: number

  /**
   * Size of the rolling window for metrics (default: 100)
   */
  windowSize?: number

  /**
   * Additive increase step for concurrency (default: 1)
   */
  increaseStep?: number

  /**
   * Optional callback when concurrency changes
   */
  onConcurrencyChange?: (concurrency: number) => void
}

/**
 * Map options for the pool.map() method
 */
export interface MapOptions {
  /**
   * If true, stop processing on first error (default: false)
   */
  bail?: boolean
}

/**
 * Statistics about the pool state
 */
export interface PoolStats {
  /** Current concurrency level */
  concurrency: number

  /** P50 latency in milliseconds */
  p50: number

  /** Current error rate (0-1) */
  errorRate: number

  /** Total tasks processed */
  processed: number

  /** Success rate (0-1) */
  successRate: number

  /** Current number of active tasks */
  active: number
}

/**
 * Internal representation of a task result
 */
export interface TaskResult {
  /** Duration of task execution in milliseconds */
  durationMs: number

  /** Whether the task succeeded */
  success: boolean
}
