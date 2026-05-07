# promise-pool-smart

[![npm version](https://badge.fury.io/js/promise-pool-smart.svg)](https://www.npmjs.com/package/promise-pool-smart)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![npm downloads](https://img.shields.io/npm/dm/promise-pool-smart.svg)](https://www.npmjs.com/package/promise-pool-smart)
[![Node.js Version](https://img.shields.io/node/v/promise-pool-smart.svg)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-blue.svg)](https://www.typescriptlang.org/)

> **Intelligent, self-tuning promise concurrency pool** that automatically optimizes parallel execution using AIMD algorithm (same principle as TCP congestion control)

## Features

- ⚡ **Auto-tuning**: Dynamically adjusts concurrency based on real-time metrics (success rate, error rate, latency)
- 🎯 **Zero dependencies**: Pure TypeScript implementation, no external runtime dependencies
- 📊 **Advanced metrics**: P50 latency, error rates, success streaks with rolling window tracking
- 🔄 **AIMD algorithm**: Battle-tested congestion control from TCP, optimized for JavaScript/TypeScript workloads
- 💾 **Memory efficient**: Fixed-size circular buffer prevents memory leaks in long-running processes
- 📦 **Dual modules**: ESM + CommonJS with full TypeScript type exports
- 🛡️ **Type safe**: 100% TypeScript strict mode, all public APIs documented with JSDoc
- ⚙️ **Configurable**: Extensive options for tuning behavior to your specific workload
- 🧪 **Battle-tested**: Comprehensive test suite with 39+ test cases ensuring reliability

## Installation

```bash
npm install promise-pool-smart
```

**Requirements**: Node.js >= 18

## Basic Usage

```typescript
import { SmartPool } from 'promise-pool-smart'

const pool = new SmartPool({
  min: 2,              // minimum concurrent tasks
  max: 50,             // maximum concurrent tasks
  targetErrorRate: 0.05,   // scale down if error rate exceeds 5%
  targetP50Ms: 500,        // scale down if p50 latency exceeds 500ms
})

// Process items with automatic concurrency tuning
const results = await pool.map(items, async (item) => {
  return await processItem(item)
})

// View live performance metrics
console.log(pool.stats())
// {
//   concurrency: 24,      // current parallel limit (auto-adjusted)
//   p50: 342,             // 50th percentile latency in ms
//   errorRate: 0.02,      // 2% of tasks failed
//   processed: 4821,      // total tasks completed
//   successRate: 0.98,    // 98% success rate
//   active: 3             // currently running tasks
// }

pool.destroy()  // cleanup
```

## How It Works

**SmartPool uses the AIMD (Additive Increase Multiplicative Decrease) algorithm** to find your workload's sweet spot:

### Additive Increase (Growth Phase)
When everything is healthy:
- Last 10+ tasks succeeded ✅
- P50 latency below target 📊
- Error rate below threshold 📉

→ **Slowly increase concurrency** (add 1 task per adjustment)

### Multiplicative Decrease (Recovery Phase)
When problems appear:
- Error rate spikes above threshold ⚠️
- P50 latency shoots up 🚀
- Task failures detected ❌

→ **Quickly halve concurrency** (cut in half immediately)

**Result**: Your pool automatically finds the optimal concurrency that maximizes throughput while maintaining stability.

## Real-World Examples

### Scraping Unreliable APIs

```typescript
const pool = new SmartPool({
  min: 2,
  max: 100,
  targetErrorRate: 0.10,       // tolerate some API failures
  targetP50Ms: 800,
  increaseStep: 5,             // grow fast when healthy
  onConcurrencyChange: (n) => {
    console.log(`📈 Adjusted to ${n} parallel requests`)
  },
})

try {
  const data = await pool.map(urls, async (url) => {
    const response = await fetch(url, { timeout: 5000 })
    return response.json()
  })
  console.log(`✅ Scraped ${data.length} items successfully`)
} catch (err) {
  if (err instanceof AggregateError) {
    console.error(`❌ ${err.errors.length} requests failed`)
  }
} finally {
  pool.destroy()
}
```

### Batch Processing with Error Tolerance

```typescript
const pool = new SmartPool({
  min: 1,
  max: 20,
  targetErrorRate: 0.05,
})

const jobs = generateLargeJobList()
const results = await pool.map(jobs, async (job) => {
  // Process job, errors are collected and thrown after all tasks complete
  return await executeJob(job)
})
```

### Stop on First Failure

```typescript
const pool = new SmartPool({ min: 2, max: 10 })

try {
  await pool.map(items, processItem, { bail: true })
  // Stops processing immediately when first error occurs
} catch (err) {
  if (err instanceof AggregateError) {
    console.error('First error:', err.errors[0])
  }
}
```

## API Reference

### `SmartPool` Constructor

```typescript
new SmartPool(options?: SmartPoolOptions)
```

**Options:**
| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `min` | number | `1` | Minimum concurrency level |
| `max` | number | `20` | Maximum concurrency level |
| `start` | number | `3` | Initial concurrency level |
| `targetErrorRate` | number | `0.05` | Error rate threshold (0-1) for scaling down |
| `targetP50Ms` | number | `1000` | P50 latency target in milliseconds |
| `windowSize` | number | `100` | Rolling window size for metrics |
| `increaseStep` | number | `1` | Additive increase step size |
| `onConcurrencyChange` | function | `undefined` | Callback when concurrency adjusts |

### Instance Methods

#### `pool.map(items, mapper, options?)`
Process an array of items with automatic concurrency tuning.

```typescript
const results = await pool.map(
  [1, 2, 3, 4, 5],
  async (item) => item * 2,
  { bail: false }  // optional: stop on first error
)
```

- ✅ Preserves result order
- ✅ Collects all errors and throws `AggregateError` at end (unless `bail: true`)
- ✅ Returns results in same order as input

#### `pool.run(task)`
Execute a single task respecting the current concurrency limit.

```typescript
const result = await pool.run(async () => {
  return await someAsyncOperation()
})
```

#### `pool.stats()`
Get current pool metrics.

```typescript
const stats = pool.stats()
// {
//   concurrency: number    // Current parallel limit
//   p50: number           // 50th percentile latency (ms)
//   errorRate: number     // Ratio of failed tasks (0-1)
//   processed: number     // Total tasks completed
//   successRate: number   // Ratio of successful tasks (0-1)
//   active: number        // Currently running tasks
// }
```

#### `pool.destroy()`
Clean up the pool and release resources. After calling `destroy()`, the pool cannot be reused.

```typescript
pool.destroy()
```

## Comparison with Alternatives

| Feature | promise-pool-smart | p-limit | p-queue | bull |
|---------|-------------------|---------|---------|------|
| Auto-tuning concurrency | ✅ | ❌ | ❌ | ❌ |
| Real-time metrics | ✅ | ❌ | ❌ | ✅ |
| Fixed concurrency | ✅ | ✅ | ✅ | ✅ |
| Task prioritization | ❌ | ❌ | ✅ | ✅ |
| Zero dependencies | ✅ | ✅ | ✅ | ❌ |
| TypeScript support | ✅ | ✅ | ✅ | ✅ |
| File: size (minified+gzip) | **~4KB** | ~2KB | ~6KB | ~50KB |

## When to Use

### ✅ Perfect For
- **Unreliable third-party APIs** with variable latency and error rates
- **Web scraping** where targets have rate limits and variable response times
- **Batch API calls** to multiple services with different performance characteristics
- **Database operations** where connection pool performance varies
- **Background jobs** needing automatic rate limiting and recovery
- **Microservice cascades** where downstream services have varying capacity

### ❌ Not Ideal For
- Fixed concurrency requirements (use `p-limit`)
- Task prioritization needed (use `p-queue`)
- Job persistence across restarts (use `bull`)
- Perfectly stable workloads with predictable latency

## Performance

- **Memory**: O(windowSize) - constant memory regardless of task count
- **CPU overhead**: Minimal - metrics only calculated on demand
- **GC friendly**: Fixed-size buffers, no growing arrays
- **Latency**: <1ms per task scheduling

## TypeScript Support

100% TypeScript strict mode compatible with full type exports:

```typescript
import {
  SmartPool,
  Observer,
  SmartPoolOptions,
  MapOptions,
  PoolStats,
  Mapper,
  Task,
} from 'promise-pool-smart'
```

## Browser Support

Node.js only (requires event loop). Not suitable for browser environments.

## License

MIT © [Your Name/Organization]

---

## Contributing

Contributions welcome! This is an actively maintained open-source project.

## Resources

- [GitHub Repository](https://github.com/yourusername/promise-pool-smart)
- [Issue Tracker](https://github.com/yourusername/promise-pool-smart/issues)
- [npm Package](https://www.npmjs.com/package/promise-pool-smart)

---

**Built with** TypeScript • Zero Dependencies • Node.js 18+
