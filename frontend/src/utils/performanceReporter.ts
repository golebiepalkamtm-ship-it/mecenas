import type { PerformanceReport } from '../hooks/usePerformanceMonitor';

export const generatePerformanceReport = (report: PerformanceReport): void => {
  console.log('\n📊 RAPORT WYDAJNOŚCI APLIKACJI');
  console.log('============================');
  
  console.log('\n📈 Główne metryki:');
  console.log(`  Całkowity czas ładowania: ${report.totals.totalLoadTime.toFixed(2)}ms`);
  console.log(`  FCP (Pierwszy element): ${report.totals.firstContentfulPaint.toFixed(2)}ms`);
  console.log(`  LCP (Największy element): ${report.totals.largestContentfulPaint.toFixed(2)}ms`);
  console.log(`  DOM Content Loaded: ${report.totals.domContentLoaded.toFixed(2)}ms`);
  
  console.log('\n⏱️  Szczegółowe pomiary:');
  report.metrics
    .sort((a, b) => b.duration - a.duration)
    .slice(0, 10)
    .forEach(metric => {
      const emoji = metric.duration > 100 ? '⚠️' : '✅';
      console.log(`  ${emoji} ${metric.name}: ${metric.duration.toFixed(2)}ms`);
    });

  console.log('\n🎯 Ocena wydajności:');
  const score = calculatePerformanceScore(report);
  console.log(`  Ogólny wynik: ${score}/100`);
  
  if (score >= 90) console.log('  ✅ Wydajność doskonała!');
  else if (score >= 70) console.log('  ⚠️  Wydajność dobra, można poprawić');
  else console.log('  ❌ Wydajność wymaga poprawy');
  
  console.log('');
};

const calculatePerformanceScore = (report: PerformanceReport): number => {
  let score = 100;
  
  // Karanie za powolne ładowanie
  if (report.totals.firstContentfulPaint > 1800) score -= 20;
  else if (report.totals.firstContentfulPaint > 1000) score -= 10;
  
  if (report.totals.largestContentfulPaint > 2500) score -= 25;
  else if (report.totals.largestContentfulPaint > 1800) score -= 10;
  
  // Karanie za powolne komponenty
  const slowComponents = report.metrics.filter(m => m.duration > 100);
  score -= slowComponents.length * 5;
  
  return Math.max(0, Math.min(100, score));
};

export const logPerformanceMetric = (name: string, duration: number): void => {
  const color = duration > 100 ? '\x1b[33m' : duration > 50 ? '\x1b[36m' : '\x1b[32m';
  console.log(`${color}[Performance] ${name}: ${duration.toFixed(2)}ms\x1b[0m`);
};
