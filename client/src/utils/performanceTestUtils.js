// Performance testing utilities for business card optimizations
import { performance } from 'perf_hooks';

/**
 * Performance testing utility for React components
 * Measures render time and re-render frequency
 */
export class PerformanceTester {
    constructor(componentName) {
        this.componentName = componentName;
        this.measurements = [];
        this.renderCount = 0;
    }

    // Start measuring a render
    startMeasure(measureName = 'default') {
        this.renderCount++;
        const startTime = performance.now();

        performance.mark(`${this.componentName}-${measureName}-start-${this.renderCount}`);

        return {
            end: () => {
                const endTime = performance.now();
                const duration = endTime - startTime;

                performance.mark(`${this.componentName}-${measureName}-end-${this.renderCount}`);
                performance.measure(
                    `${this.componentName}-${measureName}-${this.renderCount}`,
                    `${this.componentName}-${measureName}-start-${this.renderCount}`,
                    `${this.componentName}-${measureName}-end-${this.renderCount}`
                );

                this.measurements.push({
                    measureName,
                    duration,
                    renderCount: this.renderCount,
                    timestamp: endTime
                });

                // Log if render is slow (>16ms for 60fps)
                if (duration > 16) {
                    console.warn(`⚠️ Slow render detected: ${this.componentName} took ${duration.toFixed(2)}ms`);
                }

                return duration;
            }
        };
    }

    // Get performance statistics
    getStats() {
        if (this.measurements.length === 0) {
            return { message: 'No measurements recorded' };
        }

        const durations = this.measurements.map(m => m.duration);
        const avg = durations.reduce((a, b) => a + b, 0) / durations.length;
        const max = Math.max(...durations);
        const min = Math.min(...durations);

        // Calculate renders per second (approximate)
        const timeSpan = this.measurements[this.measurements.length - 1].timestamp - this.measurements[0].timestamp;
        const rendersPerSecond = timeSpan > 0 ? (this.renderCount / timeSpan) * 1000 : 0;

        return {
            componentName: this.componentName,
            totalRenders: this.renderCount,
            averageRenderTime: Math.round(avg * 100) / 100,
            maxRenderTime: Math.round(max * 100) / 100,
            minRenderTime: Math.round(min * 100) / 100,
            rendersPerSecond: Math.round(rendersPerSecond * 100) / 100,
            measurements: this.measurements
        };
    }

    // Clear measurements
    reset() {
        this.measurements = [];
        this.renderCount = 0;
        performance.clearMarks();
        performance.clearMeasures();
    }

    // Log performance report
    logReport() {
        const stats = this.getStats();
        console.group(`📊 Performance Report: ${stats.componentName}`);
        console.log(`Total Renders: ${stats.totalRenders}`);
        console.log(`Average Render Time: ${stats.averageRenderTime}ms`);
        console.log(`Max Render Time: ${stats.maxRenderTime}ms`);
        console.log(`Min Render Time: ${stats.minRenderTime}ms`);
        console.log(`Renders Per Second: ${stats.rendersPerSecond}`);

        // Performance assessment
        if (stats.averageRenderTime < 8) {
            console.log('✅ Excellent performance');
        } else if (stats.averageRenderTime < 16) {
            console.log('✅ Good performance');
        } else if (stats.averageRenderTime < 32) {
            console.log('⚠️ Moderate performance - consider optimization');
        } else {
            console.log('❌ Poor performance - optimization needed');
        }

        console.groupEnd();
        return stats;
    }
}

/**
 * React hook for measuring component performance
 */
export const usePerformanceMeasure = (componentName, dependencies = []) => {
    const tester = new PerformanceTester(componentName);

    // Measure on every render
    React.useLayoutEffect(() => {
        const measure = tester.startMeasure('render');
        return measure.end;
    });

    // Return performance stats
    return {
        getStats: () => tester.getStats(),
        logReport: () => tester.logReport(),
        reset: () => tester.reset()
    };
};

/**
 * Performance testing for business card list
 */
export const testBusinessCardListPerformance = (cardCount = 50) => {
    console.group(`🧪 Testing Business Card List Performance (${cardCount} cards)`);

    const expectations = {
        averageRenderTime: 16, // 60fps budget
        maxRenderTime: 32,     // Acceptable peak
        memoryLeakThreshold: 50 // MB
    };

    // Memory usage before
    const initialMemory = performance.memory ? performance.memory.usedJSHeapSize : 0;

    console.log(`Initial memory usage: ${(initialMemory / 1024 / 1024).toFixed(2)}MB`);
    console.log(`Expected render budget: <${expectations.averageRenderTime}ms average`);
    console.log(`Expected peak budget: <${expectations.maxRenderTime}ms max`);

    console.groupEnd();

    return {
        expectations,
        initialMemory,
        checkMemoryLeak: () => {
            if (!performance.memory) return false;

            const currentMemory = performance.memory.usedJSHeapSize;
            const memoryIncrease = (currentMemory - initialMemory) / 1024 / 1024;

            console.log(`Memory increase: ${memoryIncrease.toFixed(2)}MB`);

            if (memoryIncrease > expectations.memoryLeakThreshold) {
                console.warn(`⚠️ Potential memory leak detected: ${memoryIncrease.toFixed(2)}MB increase`);
                return true;
            }

            return false;
        }
    };
};

/**
 * Test component re-render frequency
 */
export const testReRenderFrequency = (componentName, testDuration = 5000) => {
    const tester = new PerformanceTester(componentName);
    let renderCount = 0;

    console.log(`🔄 Testing re-render frequency for ${testDuration}ms`);

    const interval = setInterval(() => {
        renderCount++;
        const measure = tester.startMeasure('rerender-test');
        // Simulate small work
        setTimeout(measure.end, 1);
    }, 16); // Try to render at 60fps

    setTimeout(() => {
        clearInterval(interval);
        const stats = tester.getStats();

        console.group(`🔄 Re-render Frequency Results: ${componentName}`);
        console.log(`Total re-renders in ${testDuration}ms: ${stats.totalRenders}`);
        console.log(`Re-renders per second: ${stats.rendersPerSecond.toFixed(2)}`);

        if (stats.rendersPerSecond > 30) {
            console.warn('⚠️ High re-render frequency detected - check for unnecessary updates');
        } else if (stats.rendersPerSecond > 10) {
            console.log('⚠️ Moderate re-render frequency - monitor for optimization opportunities');
        } else {
            console.log('✅ Good re-render frequency');
        }

        console.groupEnd();

        return stats;
    }, testDuration);
};

export default PerformanceTester;