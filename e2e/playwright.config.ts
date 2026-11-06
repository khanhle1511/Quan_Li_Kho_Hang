import { defineConfig, devices } from '@playwright/test';
import { defineBddConfig } from 'playwright-bdd';
import { WORKERS as FILE_WORKERS } from './config-worker';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

// Địa chỉ ứng dụng: mặc định là bản local. Chỉ chạy trên bản online khi được yêu cầu: npm run test:online
//   BASE_URL=http://localhost:8099 npx playwright test   (local ở cổng khác)
const ONLINE_URL = 'https://qlkho-web.onrender.com';
// Nhiều agent làm việc cùng lúc: AGENT=agent2 → app riêng ở cổng của agent2 (xem agents/agents.config.json)
// và kết quả/báo cáo ghi vào output/agent2/ để không đè lên nhau.
const AGENT = process.env.AGENT;
const agentUrl = (name: string) => {
  const n = /^agent(\d+)$/.exec(name);
  if (!n) throw new Error(`AGENT="${name}" không hợp lệ (dùng agent1, agent2…)`);
  // Cổng thực tế (có thể đã tự đổi vì cổng ưu tiên bị chiếm) do agents.mjs ghi khi khởi động
  try {
    const run = JSON.parse(readFileSync(join(__dirname, '..', 'agents', 'run', `${name}.json`), 'utf8'));
    if (run.port) return `http://localhost:${run.port}`;
  } catch { /* agent chưa khởi động bằng agents.mjs bản mới → dùng cổng ưu tiên */ }
  const cfg = JSON.parse(readFileSync(join(__dirname, '..', 'agents', 'agents.config.json'), 'utf8'));
  return `http://localhost:${cfg.basePort + Number(n[1]) - 1}`;
};
const BASE_URL = process.env.BASE_URL
  ?? (AGENT ? agentUrl(AGENT) : undefined)
  ?? (process.env.npm_lifecycle_event === 'test:online' ? ONLINE_URL : 'http://localhost:8080');
const OUT = AGENT ? `./output/${AGENT}` : './output';
const ONLINE = BASE_URL.includes('onrender.com');
// Số worker: sửa trong config-worker.ts. Ghi đè tạm: WORKERS=6 npm run … hoặc --workers=6. Bản online luôn 1 worker.
const ENV_WORKERS = process.env.WORKERS;
const WORKERS = ENV_WORKERS ? (ENV_WORKERS.endsWith('%') ? ENV_WORKERS : Number(ENV_WORKERS)) : FILE_WORKERS;

// Kịch bản BDD (features/*.feature, Gherkin tiếng Việt) + step definition (steps/*.ts) → sinh test vào .features-gen
const bddTestDir = defineBddConfig({
  features: 'features/*.feature',
  steps: ['steps/*.ts'],
  outputDir: '.features-gen',
  language: 'vi',
});

export default defineConfig({
  globalSetup: './global-setup.ts',
  outputDir: `${OUT}/test-results`,
  timeout: 90_000,                       // chừa thời gian cho Render thức dậy
  expect: { timeout: 10_000 },
  retries: ONLINE ? 1 : 0,
  workers: ONLINE ? 1 : WORKERS,         // bản online dùng chung dữ liệu: chạy tuần tự
  reporter: [
    ['list'],
    ['html', { outputFolder: `${OUT}/report`, open: 'never' }],
    // Allure: kết quả thô → output/allure-results, sinh báo cáo bằng: npm run allure:generate
    ['allure-playwright', {
      resultsDir: `${OUT}/allure-results`,
      detail: true,
      suiteTitle: true,
      environmentInfo: { BASE_URL, Agent: AGENT ?? '—', Workers: String(ONLINE ? 1 : WORKERS), Node: process.version, OS: process.platform },
    }],
  ],
  use: {
    baseURL: BASE_URL,
    locale: 'vi-VN',
    viewport: { width: 1400, height: 900 },
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    trace: 'retain-on-failure',
  },
  projects: [
    { name: 'chromium', testDir: './tests', use: { ...devices['Desktop Chrome'] } },
    // BDD ghi dữ liệu dùng chung: script bdd* chạy --workers=1. Khi WORKERS khác 1 thì chia theo từng kịch bản
    // (không theo file) để dùng hết số worker; không chạy song song các nhóm @exclusive, @after-reset, @seed-data.
    { name: 'bdd', testDir: bddTestDir, fullyParallel: WORKERS !== 1, use: { ...devices['Desktop Chrome'] } },
  ],
});
