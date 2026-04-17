/**
 * Testy wydajnosci uruchamiania czatu
 */
const http = require('http');

function httpGet(url, timeout = 30000) {
  return new Promise((resolve, reject) => {
    const start = Date.now();
    const req = http.get(url, { timeout }, (res) => {
      let data = ';
      res.on('data', c => data += c);
      res.on('end', () => resolve({ status: res.statusCode, data, latency: Date.now() - start }));
    });
    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('Timeout')); });
  });
}

async function testSeq() {
  console.log('\\n=== SEKWENCYJNE LADOWANIE ===');
  const s = Date.now();
  const r1 = await httpGet('http://127.0.0.1:8003/sessions').catch(e => ({ error: e.message, latency: 0 }));
  console.log('sessions: ' + r1.latency + 'ms');
  const r2 = await httpGet('http://127.0.0.1:8003/models/all', 60000).catch(e => ({ error: e.message, latency: 0 }));
  console.log('models: ' + r2.latency + 'ms');
  console.log('Calkowity: ' + (Date.now() - s) + 'ms');
  return { seq: (Date.now() - s), s: r1.latency, m: r2.latency };
}

async function testPar() {
  console.log('\\n=== ROWNOLELE LADOWANIE ===');
  const s = Date.now();
  const [p1, p2] = await Promise.all([
    httpGet('http://127.0.0.1:8003/sessions'),
    httpGet('http://127.0.0.1:8003/models/all', 60000)
  ]);
  console.log('sessions: ' + p1.latency + 'ms');
  console.log('models: ' + p2.latency + 'ms');
  console.log('Calkowity: ' + (Date.now() - s) + 'ms');
  return { par: (Date.now() - s) };
}

async function run() {
  console.log('=== TESTY WYDAJNOSCI CZATU ===');
  const seq = await testSeq();
  const par = await testPar();
  console.log('\\n=== PODSUMOWANIE ===');
  console.log('Sekwencyjnie: ' + seq.seq + 'ms');
  console.log('Rownolegle: ' + par.par + 'ms');
  console.log('Oszczednosc: ' + (seq.seq - par.par) + 'ms');
}

run().catch(console.error);