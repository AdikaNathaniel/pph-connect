import http from 'k6/http';
import { check, sleep } from 'k6';
import { Trend } from 'k6/metrics';

const BASE_URL = __ENV.BASE_URL || 'http://localhost:5173';
const DASHBOARD_ENDPOINT = `${BASE_URL.replace(/\/$/, '')}/api/worker/stats-summary`;
const MESSAGING_ENDPOINT = `${BASE_URL.replace(/\/$/, '')}/api/messages/broadcast`;
const SUPABASE_ANON_KEY = __ENV.SUPABASE_ANON_KEY || 'dev-anon-key';
const SCENARIO = __ENV.SCENARIO || 'dashboard';

const responseTime = new Trend('load_test_response_time');

export const options = {
  scenarios: {
    worker_dashboard: {
      executor: 'ramping-arrival-rate',
      startRate: 20,
      timeUnit: '1m',
      preAllocatedVUs: 120,
      maxVUs: 150,
      vus: 100,
      stages: [
        { target: 100, duration: '30s' },
        { target: 100, duration: '4m' },
        { target: 0, duration: '30s' },
      ],
    },
  },
  thresholds: {
    load_test_response_time: ['p(95)<1500'],
    http_req_failed: ['rate<0.01'],
  },
};

function requestConfig() {
  return {
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      'Content-Type': 'application/json',
    },
    tags: {
      scenario: SCENARIO,
    },
  };
}

function runDashboardScenario() {
  const res = http.get(DASHBOARD_ENDPOINT, requestConfig());
  responseTime.add(res.timings.duration);
  check(res, {
    'dashboard status 200': (r) => r.status === 200,
  });
}

function runMessagingScenario() {
  const payload = JSON.stringify({
    subject: 'Load Test Broadcast',
    body: 'Synthetic load testing message body',
    audience: 'workers:all',
  });
  const res = http.post(MESSAGING_ENDPOINT, payload, requestConfig());
  responseTime.add(res.timings.duration);
  check(res, {
    'messaging status 2xx': (r) => r.status >= 200 && r.status < 300,
  });
}

export default function () {
  if (SCENARIO === 'messaging') {
    runMessagingScenario();
  } else {
    runDashboardScenario();
  }
  sleep(1);
}
