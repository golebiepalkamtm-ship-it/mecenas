import http from 'http';
import https from 'https';

const visited = new Set();
const pending = ['http://localhost:3000/src/components/Chat/index.tsx'];

async function fetchUrl(url) {
    return new Promise((resolve, reject) => {
        const client = url.startsWith('https') ? https : http;
        client.get(url, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => resolve({ status: res.statusCode, data }));
        }).on('error', reject);
    });
}

async function crawl() {
    while (pending.length > 0) {
        const url = pending.shift();
        if (visited.has(url)) continue;
        visited.add(url);

        try {
            const { status, data } = await fetchUrl(url);
            console.log(`[${status}] ${url}`);
            
            if (status === 200) {
                // Extract imports
                const importRegex = /import\s+.*?\s+from\s+['"](\/[^'"]+)['"]/g;
                const dynamicImportRegex = /import\(['"](\/[^'"]+)['"]\)/g;
                
                let match;
                while ((match = importRegex.exec(data)) !== null) {
                    const nextUrl = `http://localhost:3000${match[1]}`;
                    if (!visited.has(nextUrl) && !pending.includes(nextUrl)) {
                        pending.push(nextUrl);
                    }
                }
                while ((match = dynamicImportRegex.exec(data)) !== null) {
                    const nextUrl = `http://localhost:3000${match[1]}`;
                    if (!visited.has(nextUrl) && !pending.includes(nextUrl)) {
                        pending.push(nextUrl);
                    }
                }
            } else {
                console.error(`FAILED: ${url} returned ${status}`);
                console.log(data);
            }
        } catch (e) {
            console.error(`ERROR fetching ${url}:`, e.message);
        }
    }
}

crawl();
