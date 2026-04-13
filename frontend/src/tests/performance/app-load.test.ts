import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render } from '@testing-library/react';
import React from 'react';
import App from '../../App';

describe('Aplikacja - Testy wydajnościowe ładowania', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Mock Navigation Timing API
    Object.defineProperty(window, 'performance', {
      value: {
        now: vi.fn(() => Date.now()),
        getEntriesByType: vi.fn(() => []),
        mark: vi.fn(),
        measure: vi.fn(),
      },
      writable: true
    });
  });

  it('powinien załadować aplikację w akceptowalnym czasie', async () => {
    const startTime = performance.now();
    
    const { container } = render(React.createElement(App));
    
    const endTime = performance.now();
    const loadTime = endTime - startTime;
    
    console.log(`Czas renderowania App: ${loadTime.toFixed(2)}ms`);
    
    expect(loadTime).toBeLessThan(500);
    expect(container).toBeTruthy();
  });

  it('powinien testować wielokrotne odświeżenia (stress test)', async () => {
    const iterations = 10;
    const times: number[] = [];

    for (let i = 0; i < iterations; i++) {
      const start = performance.now();
      const { unmount } = render(React.createElement(App));
      const end = performance.now();
      
      times.push(end - start);
      unmount();
      
      await new Promise(resolve => setTimeout(resolve, 10));
    }

    const avgTime = times.reduce((a, b) => a + b, 0) / times.length;
    const maxTime = Math.max(...times);
    const minTime = Math.min(...times);

    console.log(`Wyniki ${iterations} odświeżeń:`);
    console.log(`  Średni czas: ${avgTime.toFixed(2)}ms`);
    console.log(`  Maksymalny czas: ${maxTime.toFixed(2)}ms`);
    console.log(`  Minimalny czas: ${minTime.toFixed(2)}ms`);

    expect(avgTime).toBeLessThan(500);
    expect(maxTime).toBeLessThan(1000);
  });
});
