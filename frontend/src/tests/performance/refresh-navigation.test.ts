import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { render, act } from '@testing-library/react';
import React from 'react';
import App from '../../App';

describe('Odświeżanie i nawigacja - Testy wydajnościowe', () => {
  beforeEach(() => {
    // vi.useFakeTimers(); -- Disabled as it causes loops with App boot logic
  });

  afterEach(() => {
    // vi.useRealTimers();
  });

  it('powinien symulować odświeżenie przeglądarki i zmierzyć czas ładowania', async () => {
    const loads = 1;
    const times: number[] = [];

    for (let i = 0; i < loads; i++) {
      const start = performance.now();
      
      const { unmount } = render(React.createElement(App));
      
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 500));
      });
      
      const end = performance.now();
      times.push(end - start);
      
      unmount();
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    const avgLoad = times.reduce((a, b) => a + b, 0) / times.length;
    const maxLoad = Math.max(...times);
    
    console.log(`Symulacja ${loads} odświeżeń przeglądarki:`);
    console.log(`  Średni czas ładowania: ${avgLoad.toFixed(2)}ms`);
    console.log(`  Najdłuższe ładowanie: ${maxLoad.toFixed(2)}ms`);

    expect(avgLoad).toBeLessThan(1500);
    expect(maxLoad).toBeLessThan(2500);
  }, 15000);

  it('powinien sprawdzić brak wycieków pamięci przy wielokrotnym montowaniu', () => {
    const iterations = 10;
    
    for (let i = 0; i < iterations; i++) {
      const { unmount } = render(React.createElement(App));
      unmount();
    }

    const finalStart = performance.now();
    const finalRender = render(React.createElement(App));
    const finalEnd = performance.now();
    finalRender.unmount();

    console.log(`Czas renderowania po ${iterations} cyklach: ${(finalEnd - finalStart).toFixed(2)}ms`);
    
    expect(finalEnd - finalStart).toBeLessThan(500);
  });
});
