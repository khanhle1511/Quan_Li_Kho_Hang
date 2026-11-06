// Chạy từ thư mục e2e (đã npm install) để tìm được Playwright:
//   cd e2e && node qa/walkthrough-2026-11-07/scripts/lockcheck.js
// Cần CSDL mới nạp dữ liệu mẫu (xóa thư mục data/ rồi chạy lại ứng dụng). Ảnh ghi vào ../output/.
// F5 / RISK-17: tài khoản bị khóa khi đang đăng nhập -> thao tác tiếp theo trên giao diện phải đưa về trang đăng nhập.
const { chromium } = require('playwright');
const path = require('path');
const BASE = process.env.BASE_URL || 'http://localhost:8080';
const OUT = path.join(__dirname, '..', 'output');
require('fs').mkdirSync(OUT, { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
(async () => {
  const browser = await chromium.launch();
  // admin qua API
  const admin = await browser.newContext();
  const ap = await admin.newPage();
  await ap.request.post(BASE + '/api/auth/login', { data: { phone: '0901111111', password: '123456' } });
  const u = await (await ap.request.post(BASE + '/api/users', { data: { name: '[TEST] Lock Me', phone: '0907777777', password: 'abc123', role: 'staff', opened: '2026-11-07', status: 'active' } })).json();
  console.log('created', u);
  // U7 đăng nhập trên giao diện
  const ctx = await browser.newContext({ viewport: { width: 1300, height: 850 } });
  const p = await ctx.newPage();
  await p.goto(BASE);
  await p.click('.home-nav [data-home="go"]'); await p.locator('#home').waitFor({ state: 'detached' }); await sleep(300);
  await p.fill('[data-fid="login-user"]', '0907777777'); await p.fill('[data-fid="login-pass"]', 'abc123');
  await p.click('.auth-card button.btn-primary'); await p.waitForSelector('aside button.nav'); await sleep(300);
  // chuẩn bị một phiếu nhập trên giao diện
  await p.locator('aside button.nav', { hasText: 'Nhập kho' }).click(); await sleep(300);
  await p.fill('[data-fid="rc-search-in"]', 'Cáp'); await sleep(200);
  await p.locator('.pick', { hasText: 'Cáp USB-C' }).click(); await sleep(200);
  // admin khóa U7 trong lúc đó
  const r = await ap.request.put(BASE + '/api/users/' + u.id + '/status', { data: { status: 'locked' } });
  console.log('locked ->', r.status());
  // U7 bấm lưu phiếu -> api() nhận 401 -> sessionExpired
  await p.click('button:has-text("Lưu phiếu và gửi duyệt")');
  await sleep(1200);
  const atLogin = await p.locator('[data-fid="login-user"]').count();
  const err = (await p.locator('.alert-err').count()) ? await p.locator('.alert-err').innerText() : '(không có)';
  await p.screenshot({ path: path.join(OUT, '99-F5-locked-session-expired.png'), fullPage: true });
  console.log(atLogin ? 'OK   UI về trang đăng nhập, thông báo: ' + err : 'FAIL UI vẫn ở trong ứng dụng');
  // dọn: xóa U7
  await ap.request.delete(BASE + '/api/users/' + u.id);
  await browser.close();
})().catch((e) => { console.error('FATAL', e); process.exit(1); });
