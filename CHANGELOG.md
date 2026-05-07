# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.0] - 2024-05-07

### Added
- Initial release of promise-pool-smart
- SmartPool class with AIMD-based automatic concurrency tuning
- Observer class for rolling window metrics (p50, error rate, success streak)
- Support for ESM and CommonJS module formats
- Full TypeScript strict mode support with complete type exports
- pool.map() for batch processing with result order preservation
- pool.run() for individual task execution
- pool.stats() for real-time pool metrics
- pool.destroy() for resource cleanup
- Configurable concurrency bounds (min, max, start)
- Configurable tuning parameters (targetErrorRate, targetP50Ms, increaseStep)
- onConcurrencyChange callback for monitoring adjustments
- bail option to stop processing on first error
- Comprehensive test suite with 40+ test cases
- Production-ready documentation and examples

### Technical Details
- Zero runtime dependencies
- Node.js >= 18 support
- Circular buffer for constant memory usage
- Proper AggregateError handling for failed tasks
- Garbage-collectable after destroy()
