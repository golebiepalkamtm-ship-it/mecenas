import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '30s', target: 10 },  // Ramp up to 10 users
    { duration: '1m', target: 10 },   // Stay at 10 users
    { duration: '30s', target: 0 },   // Ramp down
  ],
};

export default function () {
  const payload = JSON.stringify({
    message: 'Test message ' + Math.random(),
    history: [],
    use_rag: true,
    model: 'gpt-3.5-turbo',
  });

  const params = {
    headers: {
      'Content-Type': 'application/json',
    },
    timeout: '60s', // Match our frontend timeout
  };

  const res = http.post('http://localhost:8000/chat', payload, params);
  
  check(res, {
    'is status 200': (r) => r.status === 200,
    'response time < 30s': (r) => r.timings.duration < 30000,
    'has content': (r) => JSON.parse(r.body).content.length > 0,
  });

  sleep(1);
}
