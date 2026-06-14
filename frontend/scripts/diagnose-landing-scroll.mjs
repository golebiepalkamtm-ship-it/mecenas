#!/usr/bin/env node
/**
 * Diagnostyka scrolla landing — uruchom przy działającym frontendzie (port 3000).
 *
 *   npm run diagnose:scroll
 *   npm run diagnose:scroll -- --url=http://127.0.0.1:3000
 *
 * Wymaga: puppeteer (instaluje się przy pierwszym --install-deps).
 */

import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const frontendRoot = join(__dirname, "..");
const outDir = join(frontendRoot, "diagnostics");

const args = process.argv.slice(2);
const url =
  args.find((a) => a.startsWith("--url="))?.split("=")[1] ?? "http://localhost:3000";
const installDeps = args.includes("--install-deps");

async function ensurePuppeteer() {
  try {
    return await import("puppeteer");
  } catch {
    if (!installDeps) {
      console.error("Brak puppeteer. Uruchom: npm run diagnose:scroll -- --install-deps");
      process.exit(1);
    }
    const { execSync } = await import("node:child_process");
    execSync("npm install puppeteer --no-save --legacy-peer-deps", {
      cwd: frontendRoot,
      stdio: "inherit",
    });
    return await import("puppeteer");
  }
}

async function main() {
  const health = await fetch(url, { signal: AbortSignal.timeout(5000) }).catch(() => null);
  if (!health?.ok) {
    console.error(`Frontend nie odpowiada na ${url}. Uruchom uruchom.bat.`);
    process.exit(1);
  }

  const puppeteer = await ensurePuppeteer();
  const browser = await puppeteer.default.launch({ headless: "new" });
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });

  const targetUrl = `${url.replace(/\/$/, "")}/?scrollDiag=1`;
  console.log(`Otwieram ${targetUrl} …`);
  await page.goto(targetUrl, { waitUntil: "networkidle2", timeout: 60_000 });
  await new Promise((r) => setTimeout(r, 4000));

  const report = await page.evaluate(async () => {
    if (!window.__lexMindScrollDiag) {
      return { error: "Brak __lexMindScrollDiag — odśwież stronę na landing (po splash)." };
    }
    return window.__lexMindScrollDiag.runFull();
  });

  mkdirSync(outDir, { recursive: true });
  const outPath = join(outDir, `scroll-report-${Date.now()}.json`);
  writeFileSync(outPath, JSON.stringify(report, null, 2));

  console.log("\n── Raport ──\n");
  if (report.error) {
    console.error(report.error);
  } else {
    console.log("Wniosek:", report.conclusion);
    console.log("");
    for (const f of report.findings ?? []) {
      const mark = { critical: "✗", warning: "⚠", ok: "✓", info: "·" }[f.severity] ?? "?";
      console.log(`${mark} [${f.code}] ${f.message}`);
      if (f.fix) console.log(`    → ${f.fix}`);
    }
    if (report.wheelProbe) {
      console.log("\nWheel probe:", report.wheelProbe.verdict);
    }
    console.log(`\nZapisano: ${outPath}`);
  }

  await browser.close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
