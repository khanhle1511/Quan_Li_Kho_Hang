#!/usr/bin/env node
// Allure theo từng agent: AGENT=agent2 → output/agent2/allure-results, output/agent2/allure-report.
// Không đặt AGENT → output/allure-results, output/allure-report.
//   node scripts/allure.mjs clean | generate | open
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';

const AGENT = process.env.AGENT;
const OUT = AGENT ? `output/${AGENT}` : 'output';
const RESULTS = `${OUT}/allure-results`;
const REPORT = `${OUT}/allure-report`;
const allure = (...args) => {
  const r = spawnSync('npx', ['allure', ...args], { stdio: 'inherit', shell: true });
  process.exit(r.status ?? 1);
};

switch (process.argv[2]) {
  case 'clean':
    fs.rmSync(RESULTS, { recursive: true, force: true });
    break;
  case 'generate':
    if (!fs.existsSync(RESULTS)) { console.error(`Chưa có ${RESULTS}. Chạy test trước.`); process.exit(1); }
    allure('generate', RESULTS, '-o', REPORT, '--name', `"QLKho E2E${AGENT ? ' – ' + AGENT : ''}"`, '--clean');
    break;
  case 'open':
    allure('open', REPORT);
    break;
  default:
    console.log('Dùng: node scripts/allure.mjs clean | generate | open   (AGENT=agentN để chọn thư mục riêng)');
}
