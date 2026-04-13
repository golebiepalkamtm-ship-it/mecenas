import { useEffect, useRef, useCallback } from 'react';

export interface PerformanceMetric {
  name: string;
  duration: number;
  timestamp: number;
  type: 'load' | 'render' | 'navigation' | 'api';
}

export interface PerformanceReport {
  metrics: PerformanceMetric[];
  totals: {
    totalLoadTime: number;
    firstContentfulPaint: number;
    largestContentfulPaint: number;
    domContentLoaded: number;
    windowLoad: number;
  };
}

export const usePerformanceMonitor = () => {
  const metricsRef = useRef<PerformanceMetric[]>([]);
  const marksRef = useRef<Map<string, number>>(new Map());

  const startMeasure = useCallback((name: string) => {
    marksRef.current.set(name, performance.now());
  }, []);

  const endMeasure = useCallback((name: string, type: PerformanceMetric['type'] = 'render'): number => {
    const startTime = marksRef.current.get(name);
    if (!startTime) return -1;
    
    const duration = performance.now() - startTime;
    const metric: PerformanceMetric = {
      name,
      duration,
      timestamp: Date.now(),
      type
    };
    
    metricsRef.current.push(metric);
    marksRef.current.delete(name);
    
    console.log(`[Performance] ${name}: ${duration.toFixed(2)}ms`);
    return duration;
  }, []);

  const measureFunction = useCallback(async <T>(
    name: string, 
    fn: () => Promise<T> | T,
    type: PerformanceMetric['type'] = 'render'
  ): Promise<T> => {
    startMeasure(name);
    try {
      const result = await fn();
      endMeasure(name, type);
      return result;
    } catch (error) {
      endMeasure(name, type);
      throw error;
    }
  }, [startMeasure, endMeasure]);

  const getReport = useCallback((): PerformanceReport => {
    const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
    const paint = performance.getEntriesByType('paint');
    
    return {
      metrics: [...metricsRef.current],
      totals: {
        totalLoadTime: navigation?.loadEventEnd - navigation?.startTime || 0,
        firstContentfulPaint: paint.find(p => p.name === 'first-contentful-paint')?.startTime || 0,
        largestContentfulPaint: paint.find(p => p.name === 'largest-contentful-paint')?.startTime || 0,
        domContentLoaded: navigation?.domContentLoadedEventEnd - navigation?.startTime || 0,
        windowLoad: navigation?.loadEventEnd - navigation?.startTime || 0
      }
    };
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        metricsRef.current.push({
          name: entry.name,
          duration: entry.duration,
          timestamp: Date.now(),
          type: entry.entryType as PerformanceMetric['type'] || 'render'
        });
      }
    });

    try {
      observer.observe({ entryTypes: ['paint', 'largest-contentful-paint', 'layout-shift', 'first-input'] });
    } catch {
      // Ignore unsupported entry types
    }

    return () => observer.disconnect();
  }, []);

  return {
    startMeasure,
    endMeasure,
    measureFunction,
    getReport
  };
};
