import { Given, When, Then, expect, actorOf, SEED, PDF_BYTES } from './fixtures';
import { SEL } from '../helpers/selectors';
import { nav, readToast, waitToastGone } from '../helpers/app';

// ================= Tiền điều kiện =================

Given('dữ liệu mẫu vừa được reset', async ({ world, $test }) => {
  const s = await world.summary();
  const fresh = s.low === SEED.low && s.pending === SEED.pending && s.total === SEED.total && s.warehouses === SEED.warehouses;
  $test.skip(!fresh, `CSDL không còn ở trạng thái dữ liệu mẫu (${JSON.stringify(s)}). Reset CSDL rồi chạy riêng nhóm @after-reset.`);
});

Given('fixture [TEST] đã được tạo', async ({ world }) => { await world.ensureFx(); });

Given(/^(Admin|Manager|Staff) đã đăng nhập$/, async ({ world }, who: string) => { await world.setActor(actorOf(who)); });
// "Bất kỳ" trong tracker → dùng Manager
Given('tôi đã đăng nhập', async ({ world }) => { await world.setActor('manager'); });
Given(/^tôi (?:chưa đăng nhập|không có cookie phiên)$/, async ({ world }) => { await world.setActor('anon'); });
Given(/^tài khoản (Admin|Manager|Staff) lấy từ biến môi trường$/, async () => { /* ACCOUNTS đọc ADMIN_PHONE/ADMIN_PASS… */ });

// Đợt @exclusive: chỉ là lời nhắc quy trình
Given(/^nhóm đã được báo trước.*$/, async () => {});

// ================= Màn hình =================

Given(/^tôi (?:đang ở|mở) màn "([^"]+)"$/, async ({ world }, screen: string) => {
  await world.ui();
  await waitToastGone(world.page);
  await nav(world.page, screen);
  await expect(world.page.locator(SEL.pageTitle)).toHaveText(screen);
});

Then(/^tôi sang màn "([^"]+)"$/, async ({ world }, screen: string) => {
  // "Xuất/Nhập kho" = một trong hai màn (thẻ Phiếu chờ sang màn có nhiều phiếu chờ hơn)
  const names = screen === 'Xuất/Nhập kho' ? ['Xuất kho', 'Nhập kho'] : [screen];
  await expect(world.page.locator(SEL.pageTitle)).toHaveText(new RegExp('^(' + names.join('|') + ')$'));
});

Then('menu trái hiển thị', async ({ world }) => { await expect(world.page.locator(SEL.navItem).first()).toBeVisible(); });

Then('tôi về trang đăng nhập', async ({ world }) => {
  await expect(world.page.locator(SEL.loginUser)).toBeVisible();
  await expect(world.page.locator(SEL.navItem)).toHaveCount(0);
});

When(/^tôi bấm "Đăng xuất"$/, async ({ world }) => {
  await world.ui();
  await world.page.click(SEL.logout);
  // Từ đây "tôi" là khách: phiên trình duyệt đã bị hủy, không tự đăng nhập lại khi gọi API
  world.actor = 'anon';
  world.uiActor = null;
  world.pageActor = null;
});

// ================= API =================

/** Gọi API không có thân, dùng cho các bước kiểm tra quyền (401/403). POST /files gửi kèm PDF hợp lệ. */
When(/^(tôi|Admin|Manager|Staff) gọi (GET|POST|PUT|DELETE) "([^"]+)"$/, async ({ world }, who: string, method: string, p: string) => {
  const a = who === 'tôi' ? world.actor : actorOf(who);
  const path = await world.path(p);
  if (method === 'POST' && /\/files$/.test(path)) {
    await world.call(a, method, path, undefined, { multipart: { file: { name: 'test.pdf', mimeType: 'application/pdf', buffer: PDF_BYTES() } } });
  } else if (method === 'PUT' && /\/note$/.test(path)) {
    world.vars.noteFor = path.split('/')[3];
    await world.call(a, method, path, { note: '[TEST] ghi chú' });
  } else {
    await world.call(a, method, path, method === 'GET' || method === 'DELETE' ? undefined : {});
  }
});

Then(/^mã phản hồi là (\d+)$/, async ({ world }, code: string) => {
  expect(world.last, 'chưa gọi API').not.toBeNull();
  expect(world.last!.status, world.last!.text.slice(0, 300)).toBe(Number(code));
});

Then(/^thông báo lỗi (là|bắt đầu bằng|chứa) "(.*)"$/, async ({ world }, how: string, msg: string) => {
  const err = world.last?.json?.error as string;
  expect(err, 'phản hồi không có trường error: ' + world.last?.text).toBeTruthy();
  const want = world.expand(msg);
  if (how === 'là') expect(err).toBe(want);
  else if (how === 'bắt đầu bằng') expect(err.startsWith(want), `"${err}" phải bắt đầu bằng "${want}"`).toBe(true);
  else expect(err.toLowerCase()).toContain(want.toLowerCase());
});

Then(/^GET "([^"]+)" trả mã (\d+)$/, async ({ world }, p: string, code: string) => {
  const ctx = await world.api(world.actor);
  const r = await ctx.get(await world.path(p));
  expect(r.status()).toBe(Number(code));
});

Then(/^(?:status là|phiếu ở trạng thái) "([^"]+)"$/, async ({ world }, st: string) => {
  const s = await world.state();
  const r = s.receipts.find((x: any) => x.id === world.vars.code);
  expect(r?.status).toBe(st);
});

Then(/^id có dạng "([A-Z]+)(?:-xx|\.\.)"(?: mới)?$/, async ({ world }, prefix: string) => {
  const id = world.ok().id as string;
  expect(id).toMatch(prefix === 'P' ? /^P\d+$/ : new RegExp('^' + prefix + '-\\d+$'));
  world.vars.newId = id;
});

Then(/^không có (?:phản hồi|lỗi) 500$/, async ({ world }) => {
  for (const s of (world.vars.statuses as number[] | undefined) ?? [world.last?.status]) expect(s).not.toBe(500);
});

// ================= Toast =================

Then(/^toast hiển thị "(.+)"$/, async ({ world }, text: string) => {
  const t = await readToast(world.page);
  expect(t, 'không thấy toast').not.toBeNull();
  const parts = text.split('…').map((s) => s.trim()).filter(Boolean);
  for (const p of parts) expect(t!).toContain(p);
  world.vars.toast = t;
});
