/**
 * ============================================================
 * DAX Performance Telemetry & Monitoring Integration
 * ============================================================
 *
 * Captures query performance, DAX measure execution metrics, API roundtrip times,
 * and component frame render durations for telemetry reporting.
 *
 * @module services/daxPerformanceMonitor
 */

/**
 * @typedef {Object} PerformanceMetric
 * @property {string} metricName - Name of the DAX query or API endpoint monitored
 * @property {number} durationMs - Measured duration in milliseconds
 * @property {'dax_query'|'api_latency'|'component_render'} category - Performance category
 * @property {Record<string, any>} [metadata] - Additional contextual telemetry attributes
 * @property {string} timestamp - ISO timestamp of event capture
 */

class DaxPerformanceMonitor {
  /**
   * Initializes the performance monitoring engine.
   *
   * @param {Object} [config]
   * @param {string} [config.endpoint="/api/analytics/telemetry"] - Backend telemetry ingestion URL
   * @param {boolean} [config.debug=false] - Enables console performance logging
   */
  constructor(config = {}) {
    this.endpoint = config.endpoint || '/api/analytics/telemetry';
    this.debug = config.debug ?? (process.env.NODE_ENV === 'development');
    /** @type {PerformanceMetric[]} */
    this.buffer = [];
    this.maxBufferSize = 20;

    this.initObservers();
  }

  /**
   * Registers PerformanceObserver to track long tasks and layout shifts.
   *
   * @private
   */
  initObservers() {
    if (typeof window === 'undefined' || !('PerformanceObserver' in window)) return;

    try {
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.duration > 50) {
            this.recordMetric({
              metricName: entry.name || 'long_task',
              durationMs: Math.round(entry.duration),
              category: 'component_render',
              metadata: { startTime: entry.startTime },
            });
          }
        }
      });
      observer.observe({ entryTypes: ['longtask'] });
    } catch (e) {
      // Longtask observer not supported in current environment
    }
  }

  /**
   * Benchmarks an asynchronous DAX query or API request execution.
   *
   * @async
   * @template T
   * @param {string} measureName - Identifier for the DAX measure or dataset query
   * @param {() => Promise<T>} executeFn - Asynchronous callback returning data payload
   * @param {Record<string, any>} [metadata] - Additional attributes (e.g. date ranges)
   * @returns {Promise<T>} Result of the executed async function
   */
  async measureDaxExecution(measureName, executeFn, metadata = {}) {
    const startTime = performance.now();
    try {
      const result = await executeFn();
      const durationMs = Math.round(performance.now() - startTime);

      this.recordMetric({
        metricName: measureName,
        durationMs,
        category: 'dax_query',
        metadata: {
          ...metadata,
          success: true,
        },
      });

      return result;
    } catch (error) {
      const durationMs = Math.round(performance.now() - startTime);
      this.recordMetric({
        metricName: measureName,
        durationMs,
        category: 'dax_query',
        metadata: {
          ...metadata,
          success: false,
          errorMessage: error?.message || 'Execution error',
        },
      });
      throw error;
    }
  }

  /**
   * Records a individual metric into the processing queue.
   *
   * @param {Omit<PerformanceMetric, 'timestamp'>} metric
   */
  recordMetric(metric) {
    const payload = {
      ...metric,
      timestamp: new Date().toISOString(),
    };

    if (this.debug) {
      console.log(
        `%c[DAX Monitor] ${payload.category.toUpperCase()} -> ${payload.metricName}: ${payload.durationMs}ms`,
        'color: #a855f7; font-weight: bold;',
        payload.metadata || ''
      );
    }

    this.buffer.push(payload);

    if (this.buffer.length >= this.maxBufferSize) {
      this.flushTelemetry();
    }
  }

  /**
   * Flushes buffered performance metrics to backend telemetry endpoint.
   *
   * @async
   */
  async flushTelemetry() {
    if (this.buffer.length === 0) return;

    const metricsToFlush = [...this.buffer];
    this.buffer = [];

    try {
      if (typeof navigator !== 'undefined' && navigator.sendBeacon) {
        const blob = new Blob([JSON.stringify({ metrics: metricsToFlush })], {
          type: 'application/json',
        });
        navigator.sendBeacon(this.endpoint, blob);
      } else {
        await fetch(this.endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ metrics: metricsToFlush }),
          keepalive: true,
        });
      }
    } catch (error) {
      console.error('[DAX Monitor] Telemetry dispatch failed:', error);
    }
  }
}

export const daxMonitor = new DaxPerformanceMonitor();