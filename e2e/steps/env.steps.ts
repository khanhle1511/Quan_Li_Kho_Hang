import { Given, When, Then, expect, PDF_BYTES } from './fixtures';
import { SEL } from '../helpers/selectors';
import { nav, uiLoginAs, gotoLogin } from '../helpers/app';

const isOnline = (url: string) => url.startsWith('https://');
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

Given('bản online không được truy cập trong hơn 15 phút', async ({ world, $test }) => {
  $test.skip(!isOnline(world.baseURL), 'Chỉ có ý nghĩa trên bản online (Render ngủ sau 15 phút không truy cập).');
});

When(/^tôi gọi GET "\/api\/public\/summary" và đo thời gian$/, async ({ world }) => {
  const t0 = Date.now(); const seen: number[] = [];
  while (Date.now() - t0 < 120_000) {
    const r = await world.page.request.get('/api/public/summary', { timeout: 120_000 }).catch(() => null);
    seen.push(r?.status() ?? 0);
    if (r?.status() === 200) break;
    await sleep(3000);
  }
  world.vars.wake = { ms: Date.now() - t0, seen };
});
Then(/^nhận được 200 trong vòng (\d+) giây$/, async ({ world, $testInfo }, s: string) => {
  await $testInfo.attach('thoi-gian-thuc-day.json', { body: JSON.stringify(world.vars.wake), contentType: 'application/json' });
  expect(world.vars.wake.seen.at(-1)).toBe(200);
  expect(world.vars.wake.ms).toBeLessThanOrEqual(Number(s) * 1000);
});

Given('bản online, hoặc local chạy profile prod', async ({ world, $test }) => {
  $test.skip(!isOnline(world.baseURL), 'Cần địa chỉ https (bản online) để thử truy cập bằng http://');
});
When(/^tôi mở ứng dụng bằng "http:\/\/", đăng nhập và thao tác$/, async ({ world }) => {
  const httpUrl = world.baseURL.replace(/^https:/, 'http:');
  await world.page.goto(httpUrl + '/');
  world.vars.landed = world.page.url();
  await gotoLogin(world.page);
  await uiLoginAs(world.page, 'manager');
  await nav(world.page, 'Tồn kho');
});
Then('tôi được chuyển hướng sang https hoặc thấy thông báo rõ ràng', async ({ world }) => {
  expect(world.vars.landed, 'trang mở bằng http:// phải chuyển sang https').toMatch(/^https:/);
});
Then('không bị vòng lặp đăng nhập', async ({ world }) => {
  await expect(world.page.locator(SEL.pageTitle)).toHaveText('Tồn kho');
});

When(/^tôi gửi song song (\d+) request GET "\/api\/state" bằng (\d+) phiên$/, async ({ world }, n: string, k: string) => {
  const roles = (['admin', 'manager', 'staff'] as const).slice(0, Number(k));
  const ctxs = await Promise.all(roles.map((r) => world.api(r)));
  const t0 = Date.now();
  const res = await Promise.all(Array.from({ length: Number(n) }, async (_, i) => {
    const s = Date.now(); const r = await ctxs[i % ctxs.length].get('/api/state'); return { status: r.status(), ms: Date.now() - s };
  }));
  world.vars.statuses = res.map((r) => r.status);
  world.vars.timing = { total: Date.now() - t0, each: res.map((r) => r.ms) };
});
Then('thời gian phản hồi được ghi lại', async ({ world, $testInfo }) => {
  await $testInfo.attach('thoi-gian-phan-hoi.json', { body: JSON.stringify(world.vars.timing), contentType: 'application/json' });
});

When(/^tôi tạo và duyệt (\d+) phiếu \[TEST\] với T_PROD$/, async ({ world }) => {
  const fx = await world.ensureFx(); const n = 300; // kịch bản không có bước fixture riêng → tạo T_PROD tại đây
  for (let i = 0; i < n; i++) {
    const code = await world.createReceipt('staff', i % 2 ? 'out' : 'in', i % 2 ? fx.cus.id : fx.sup.id, 'HN', [[fx.prod.id, 1]]);
    await world.approve('manager', code);
  }
});
When(/^tôi đo thời gian GET "\/api\/state" và thời gian vẽ màn "Tổng quan"$/, async ({ world }) => {
  const ctx = await world.api(world.actor);
  let t0 = Date.now(); await ctx.get('/api/state'); const api = Date.now() - t0;
  await world.ui();
  t0 = Date.now(); await nav(world.page, 'Báo cáo'); await nav(world.page, 'Tổng quan'); const ui = Date.now() - t0;
  world.vars.perf = { api, ui };
});
Then(/^cả hai dưới (\d+) giây$/, async ({ world, $testInfo }, s: string) => {
  await $testInfo.attach('hieu-nang.json', { body: JSON.stringify(world.vars.perf), contentType: 'application/json' });
  expect(world.vars.perf.api).toBeLessThan(Number(s) * 1000);
  expect(world.vars.perf.ui).toBeLessThan(Number(s) * 1000);
});

When(/^Manager tải PDF ([\d,]+) MB lên T_CUS rồi bấm "Xem"$/, async ({ world }) => {
  const size = Math.floor(9.9 * 1024 * 1024);
  const buffer = Buffer.concat([PDF_BYTES(), Buffer.alloc(size - PDF_BYTES().length, 0x20)]);
  const up = await world.call('manager', 'POST', `/api/partners/${world.need().cus.id}/files`, undefined, { multipart: { file: { name: 'gan-10mb.pdf', mimeType: 'application/pdf', buffer } } });
  world.vars.results = [{ status: up.status, error: up.json?.error }];
  if (up.status === 200) {
    const r = await (await world.api('manager')).get('/api/files/' + up.json.id);
    world.vars.results.push({ status: r.status(), size: (await r.body()).length });
  }
});
Then('thao tác thành công hoặc có lỗi rõ ràng', async ({ world }) => {
  for (const r of world.vars.results) {
    expect([200, 400], JSON.stringify(r)).toContain(r.status);
    if (r.status === 400) expect(r.error).toBeTruthy();
  }
});
Then(/^máy chủ không khởi động lại \(exit 137\)$/, async ({ world }) => {
  // Nếu máy chủ khởi động lại, phiên đăng nhập trong bộ nhớ sẽ mất → GET /api/state trả 401
  const r = await (await world.api('manager')).get('/api/state');
  expect(r.status(), 'phiên Manager phải còn hiệu lực').toBe(200);
});

When(/^tôi lưu ghi chú T_SUP là "([^"]+)"$/, async ({ world }, note: string) => {
  world.vars.note = note;
  await world.call(world.actor, 'PUT', `/api/partners/${world.need().sup.id}/note`, { note });
  world.vars.noteStatus = world.last!.status;
});
When(/^tôi đọc lại "\/api\/state"$/, async ({ world }) => { world.vars.st = await world.state('admin'); });
Then('ghi chú trả về nguyên văn', async ({ world }) => {
  expect(world.vars.st.suppliers.find((x: any) => x.id === world.need().sup.id).note).toBe(world.vars.note);
});
Then(/^không có lỗi 500 "Incorrect string value"$/, async ({ world }) => { expect(world.vars.noteStatus).not.toBe(500); });
