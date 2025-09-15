// Performance testing integration for BusinessCard component
import React, { useEffect, useRef, useState } from 'react';
import BusinessCard from './BusinessCard';
import { PerformanceTester } from '../../utils/performanceTestUtils';

/**
 * Business Card Performance Test Wrapper
 * Use this to measure BusinessCard performance improvements
 */
const BusinessCardPerformanceTest = ({ business, testDuration = 10000 }) => {
    const testerRef = useRef(new PerformanceTester('BusinessCard'));
    const [renderCount, setRenderCount] = useState(0);
    const [isTestingComplete, setIsTestingComplete] = useState(false);
    const [testResults, setTestResults] = useState(null);

    // Start performance measurement when component mounts
    useEffect(() => {
        const tester = testerRef.current;
        console.log('🚀 Starting BusinessCard performance test...');

        // Test automatic completion after duration
        const testTimer = setTimeout(() => {
            const results = tester.logReport();
            setTestResults(results);
            setIsTestingComplete(true);
        }, testDuration);

        return () => {
            clearTimeout(testTimer);
        };
    }, [testDuration]);

    // Measure each render
    useEffect(() => {
        const tester = testerRef.current;
        const measure = tester.startMeasure('render');

        // Update render count
        setRenderCount(prev => prev + 1);

        // End measurement after render
        const timeoutId = setTimeout(() => {
            measure.end();
        }, 0);

        return () => {
            clearTimeout(timeoutId);
        };
    });

    // Manual test completion
    const completeTest = () => {
        const results = testerRef.current.logReport();
        setTestResults(results);
        setIsTestingComplete(true);
    };

    // Reset test
    const resetTest = () => {
        testerRef.current.reset();
        setRenderCount(0);
        setIsTestingComplete(false);
        setTestResults(null);
        console.log('🔄 Performance test reset');
    };

    return (
        <div className="business-card-performance-test">
            {/* Performance Test Controls */}
            <div className="performance-test-controls" style={{
                position: 'fixed',
                top: 0,
                right: 0,
                background: 'rgba(0,0,0,0.8)',
                color: 'white',
                padding: '10px',
                borderRadius: '0 0 0 8px',
                fontSize: '12px',
                zIndex: 10000,
                minWidth: '200px'
            }}>
                <div style={{ fontWeight: 'bold', marginBottom: '5px' }}>
                    📊 Performance Test
                </div>
                <div>Renders: {renderCount}</div>
                <div>Status: {isTestingComplete ? '✅ Complete' : '🔄 Running'}</div>

                {testResults && (
                    <div style={{ marginTop: '10px', fontSize: '11px' }}>
                        <div>Avg: {testResults.averageRenderTime}ms</div>
                        <div>Max: {testResults.maxRenderTime}ms</div>
                        <div>Min: {testResults.minRenderTime}ms</div>
                        <div style={{
                            color: testResults.averageRenderTime < 16 ? '#4CAF50' :
                                  testResults.averageRenderTime < 32 ? '#FF9800' : '#F44336'
                        }}>
                            {testResults.averageRenderTime < 16 ? '✅ Excellent' :
                             testResults.averageRenderTime < 32 ? '⚠️ Moderate' : '❌ Poor'}
                        </div>
                    </div>
                )}

                <div style={{ marginTop: '10px', display: 'flex', gap: '5px' }}>
                    <button
                        onClick={completeTest}
                        style={{
                            background: '#4CAF50',
                            border: 'none',
                            color: 'white',
                            padding: '4px 8px',
                            borderRadius: '4px',
                            fontSize: '10px',
                            cursor: 'pointer'
                        }}
                    >
                        Complete
                    </button>
                    <button
                        onClick={resetTest}
                        style={{
                            background: '#FF9800',
                            border: 'none',
                            color: 'white',
                            padding: '4px 8px',
                            borderRadius: '4px',
                            fontSize: '10px',
                            cursor: 'pointer'
                        }}
                    >
                        Reset
                    </button>
                </div>
            </div>

            {/* The actual BusinessCard being tested */}
            <BusinessCard business={business} />
        </div>
    );
};

export default BusinessCardPerformanceTest;