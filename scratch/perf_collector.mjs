import { chromium } from 'playwright';
import fs from 'fs';

async function runTest() {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  const logs = [];
  page.on('console', msg => {
    const text = msg.text();
    logs.push({ type: msg.type(), text, timestamp: Date.now() });
    console.log(`[BROWSER_CONSOLE] ${text}`);
  });

  console.log('Navigating to http://localhost:3000/...');
  try {
    await page.goto('http://localhost:3000/', { waitUntil: 'networkidle', timeout: 30000 });
  } catch (e) {
    console.log('Initial load reached timeout or networkidle, proceeding to check logs.');
  }

  // Wait for the application logic to settle
  console.log('Waiting for startup phase to settle (10 seconds)...');
  await page.waitForTimeout(10000); 

  console.log('--- PERFORMANCE ANALYSIS SUMMARY ---');
  const perfLogs = logs.filter(l => l.text.includes('[PERF_FREEZE]') || l.text.includes('[APP_BOOT]') || l.text.includes('[AUTH]') || l.text.includes('[APP]'));
  
  if (perfLogs.length === 0) {
    console.log('No specific performance logs found.');
  } else {
    perfLogs.forEach(l => console.log(`- ${l.text}`));
  }

  const screenshotPath = 'scratch/startup_test.png';
  await page.screenshot({ path: screenshotPath });
  console.log(`Screenshot saved to ${screenshotPath}`);

  await browser.close();
  
  fs.writeFileSync('scratch/performance_report.json', JSON.stringify(logs, null, 2));
  console.log('Full report saved to scratch/performance_report.json');
}

runTest().catch(err => {
  console.error(err);
  process.exit(1);
});
