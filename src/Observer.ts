import { TaskResult } from './types'

/**
 * Observer tracks a rolling window of task results using a circular buffer
 * and exposes metrics like p50, error rate, and success streak
 */
export class Observer {
  private buffer: TaskResult[]
  private pointer: number = 0
  private filled: number = 0

  /**
   * Creates a new Observer with a circular buffer
   */
  constructor(windowSize: number) {
    this.buffer = new Array(windowSize)
  }

  /**
   * Records a task result in the circular buffer
   */
  record(result: TaskResult): void {
    this.buffer[this.pointer] = result
    this.pointer = (this.pointer + 1) % this.buffer.length
    if (this.filled < this.buffer.length) {
      this.filled++
    }
  }

  /**
   * Gets the P50 (median) latency of the filled buffer
   */
  p50(): number {
    if (this.filled === 0) {
      return 0
    }

    // Extract only the filled portion and sort
    const filledPortion = this.buffer.slice(0, this.filled)
    const durations = filledPortion.map((r) => r.durationMs).sort((a, b) => a - b)
    const median = Math.floor(durations.length / 2)
    return durations[median]
  }

  /**
   * Gets the error rate (failed tasks / total tasks) in the window
   */
  errorRate(): number {
    if (this.filled === 0) {
      return 0
    }

    const filledPortion = this.buffer.slice(0, this.filled)
    const errors = filledPortion.filter((r) => !r.success).length
    return errors / this.filled
  }

  /**
   * Gets the success rate (successful tasks / total tasks) in the window
   */
  successRate(): number {
    if (this.filled === 0) {
      return 0
    }
    return 1 - this.errorRate()
  }

  /**
   * Gets the count of consecutive successes from the end of the buffer
   */
  successStreak(): number {
    if (this.filled === 0) {
      return 0
    }

    let streak = 0
    let idx = this.filled - 1

    while (idx >= 0) {
      if (this.buffer[idx].success) {
        streak++
        idx--
      } else {
        break
      }
    }

    return streak
  }

  /**
   * Gets the total number of results recorded
   */
  count(): number {
    return this.filled
  }
}
