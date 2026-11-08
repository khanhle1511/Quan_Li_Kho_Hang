import { request as pwRequest, type APIRequestContext } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { Given, When, Then, expect, randomPhone, type World } from './fixtures';
import { SEL } from '../helpers/selectors';
import * as mail from '../helpers/mailpit';
import { GENERIC_KEYS, sleep, fakeIp, emailFor, fp, target, requireMailpit, waitOrSkip, requestCode, verifyCode, resetPassword, otp, wrongOf, tryLogin, setEmail } from './forgot.world';

/** AUTH-08 – các bước gọi API của luồng quên mật khẩu (features/17-quen-mat-khau.feature). Trạng thái chung ở forgot.world.ts. */

// ================= Chọn tài khoản =================

Given('T_USER có email riêng', async ({ world, $test }) => {
  await requireMailpit($test);
  const s = await fp(world); const u = world.need().user;
  const email = emailFor(world, 't_user');
  world.ok(await setEmail(world, u.id, u.phone, email), 'đặt email cho T_USER');
  s.target = { phone: u.phone, email, userId: u.id };
  world.vars.old = { pass: u.pass }; // cho bước "T_USER đăng nhập bằng mật khẩu cũ thất bại"
});

Given('SĐT không thuộc tài khoản nào', async ({ world }) => {
  (await fp(world)).target = { phone: randomPhone(), email: null };
});

Given(/^tài khoản \[TEST\] (bị khóa|nháp|đang hoạt động) (có|chưa có) email$/, async ({ world, $test }, kind: string, has: string) => {
  await requireMailpit($test);
  const status = { 'bị khóa': 'locked', nháp: 'draft', 'đang hoạt động': 'active' }[kind]!;
  const u = await world.createUser(`[TEST] User ${status} ${world.runId}`, status);
  world.extraUsers.push(u.id);
  const email = has === 'có' ? emailFor(world, 'u_' + status) : null;
  if (email) world.ok(await setEmail(world, u.id, u.phone, email), 'đặt email');
  (await fp(world)).target = { phone: u.phone, email, userId: u.id };
});

// ================= B1: gửi mã (API) =================

When(/^tôi yêu cầu mã xác nhận cho (T_USER|tài khoản đó)(?: (ngay lập tức)| (\d+) lần liên tiếp)?$/,
  async ({ world }, _who: string, _now?: string, times?: number) => {
    const t = target(await fp(world));
    for (let i = 0; i < (times ? Number(times) : 1); i++) await requestCode(world, t.phone);
  });

Given('T_USER đã yêu cầu mã xác nhận', async ({ world }) => {
  world.ok(await requestCode(world, target(await fp(world)).phone), 'yêu cầu mã');
});

When('T_USER yêu cầu mã lần nữa sau thời gian chờ gửi lại', async ({ world, $test }) => {
  const s = await fp(world);
  await waitOrSkip($test, s.resendAfter, 'Thời gian chờ gửi lại');
  await requestCode(world, target(s).phone);
});

When(/^T_USER yêu cầu mã thêm (\d+) lần, mỗi lần sau thời gian chờ gửi lại$/, async ({ world, $test }, n: number) => {
  const s = await fp(world);
  for (let i = 0; i < Number(n); i++) {
    await waitOrSkip($test, s.resendAfter, 'Thời gian chờ gửi lại');
    world.ok(await requestCode(world, target(s).phone), `yêu cầu mã lần ${i + 2}`);
  }
});

Then('phản hồi là phản hồi chung', async ({ world }) => {
  const json = world.ok(world.last, 'yêu cầu mã');
  expect(Object.keys(json).sort(), 'chỉ có các trường của phản hồi chung').toEqual(GENERIC_KEYS);
  expect(json.ok).toBe(true);
  expect(json.expiresIn).toBeGreaterThan(0);
  expect(json.resendAfter).toBeGreaterThan(0);
});

Then(/^hộp thư của (?:tài khoản đó|T_USER) có (\d+) mail mã xác nhận$/, async ({ world }, n: number) => {
  const t = target(await fp(world));
  if (Number(n) > 0) {
    expect(t.email, 'tài khoản đang xét phải có email').toBeTruthy();
    await mail.waitForMails(t.email!, mail.OTP_SUBJECT, Number(n));
  }
  if (!t.email) return; // không có địa chỉ nào để nhận
  await sleep(1500); // mail gửi bất đồng bộ: chờ một nhịp rồi mới khẳng định là không có thêm
  expect((await mail.mailsTo(t.email)).filter((m) => mail.OTP_SUBJECT.test(m.subject))).toHaveLength(Number(n));
});

Then('mã phản hồi là 429 kèm retryAfter và header Retry-After', async ({ world }) => {
  const l = world.last!;
  expect(l.status, l.text).toBe(429);
  expect(l.json.retryAfter).toBeGreaterThan(0);
  expect(l.headers['retry-after']).toBe(String(l.json.retryAfter));
});

// ================= B2: kiểm tra mã (API) =================

When(/^tôi nhập sai mã (\d+) lần$/, async ({ world }, n: number) => {
  const s = await fp(world); const code = await otp(world);
  world.vars.statuses = [];
  for (let i = 0; i < Number(n); i++) world.vars.statuses.push(await verifyCode(world, target(s).phone, wrongOf(code)));
});

Then(/^cả (\d+) lần đều trả 400 với thông báo "([^"]+)"$/, async ({ world }, n: number, msg: string) => {
  expect(world.vars.statuses).toHaveLength(Number(n));
  for (const l of world.vars.statuses) { expect(l.status).toBe(400); expect(l.json.error).toBe(msg); }
});

When(/^tôi nhập mã thứ (\d+) trong email$/, async ({ world }, nth: number) => {
  const s = await fp(world);
  await verifyCode(world, target(s).phone, await otp(world, Number(nth)));
});

When(/^tôi chờ mã hết hạn rồi nhập mã thứ (\d+) trong email$/, async ({ world, $test }, nth: number) => {
  const s = await fp(world); const code = await otp(world, Number(nth));
  await waitOrSkip($test, s.expiresIn, 'Thời hạn mã OTP');
  await verifyCode(world, target(s).phone, code);
});

When(/^tôi nhập mã "(\d{6})" cho tài khoản đó$/, async ({ world }, code: string) => {
  await verifyCode(world, target(await fp(world)).phone, code);
});

Then('mã phản hồi là 200 và có reset token', async ({ world }) => {
  const json = world.ok(world.last, 'kiểm tra mã');
  expect(json.resetToken).toMatch(/^[A-Za-z0-9_-]{43}$/); // 32 byte base64url không đệm (BR-33)
  expect(json.expiresIn).toBeGreaterThan(0);
});

Given('T_USER đã có reset token', async ({ world }) => {
  const t = target(await fp(world));
  world.ok(await requestCode(world, t.phone), 'yêu cầu mã');
  world.ok(await verifyCode(world, t.phone, await otp(world)), 'kiểm tra mã');
});

// ================= B3: đặt mật khẩu mới (API) =================

When(/^tôi đặt mật khẩu mới "([^"]+)" bằng token đó$/, async ({ world }, pass: string) => {
  await resetPassword(world, pass);
});

When(/^tôi chờ token hết hạn rồi đặt mật khẩu mới "([^"]+)"$/, async ({ world, $test }, pass: string) => {
  await waitOrSkip($test, world.last!.json.expiresIn, 'Thời hạn reset token');
  await resetPassword(world, pass);
});

When('tôi đặt mật khẩu bằng token đó với các giá trị sau thì đều nhận 400:', async ({ world }, table: any) => {
  const value = (v: string) => (v === '<73 ký tự>' ? 'a'.repeat(73) : v);
  for (const row of table.hashes() as Record<string, string>[]) {
    const l = await resetPassword(world, value(row['mật khẩu']), value(row['nhập lại']));
    expect(l.status, `"${row['mật khẩu']}": ${l.text}`).toBe(400);
    expect(l.json.error).toContain(row['thông báo']);
  }
});

/** Cả luồng qua API: yêu cầu mã → đọc mail → kiểm tra mã → đặt mật khẩu. */
Given(/^T_USER đặt lại mật khẩu thành "([^"]+)" bằng mã OTP$/, async ({ world }, pass: string) => {
  const t = target(await fp(world));
  world.ok(await requestCode(world, t.phone), 'yêu cầu mã');
  world.ok(await verifyCode(world, t.phone, await otp(world)), 'kiểm tra mã');
  world.ok(await resetPassword(world, pass), 'đặt lại mật khẩu');
});

// ================= Phiên, khóa tạm, tình trạng =================

Given('T_USER đang đăng nhập ở một phiên khác', async ({ world }) => {
  const other = await world.fresh(); const u = world.need().user;
  expect((await other.post('/api/auth/login', { data: { phone: u.phone, password: u.pass } })).status()).toBe(200);
  expect((await other.get('/api/state')).status()).toBe(200);
  world.vars.otherSession = other;
});

Then(/^phiên khác của T_USER nhận 401 "([^"]+)"$/, async ({ world }, msg: string) => {
  const l = await world.keep(await (world.vars.otherSession as APIRequestContext).get('/api/state'));
  expect(l.status, l.text).toBe(401);
  expect(l.json.error).toContain(msg);
});

Then('T_USER đăng nhập bằng mật khẩu cũ bị khóa tạm', async ({ world }) => {
  const u = world.need().user;
  const l = await tryLogin(world, u.phone, u.pass);
  expect(l.status).toBe(400);
  expect(l.json.error).toContain('Đăng nhập sai quá nhiều lần');
});

Then(/^tài khoản đó vẫn ở tình trạng "(\w+)"$/, async ({ world }, status: string) => {
  const t = target(await fp(world));
  const u = (await world.state('admin')).users.find((x: any) => x.id === t.userId);
  expect(u?.status).toBe(status);
});

Then(/^lịch sử của T_USER có hành động "([A-Z_]+)"$/, async ({ world }, action: string) => {
  const id = world.need().user.id;
  // mail gửi bất đồng bộ nên nhật ký PWD_RESET_MAIL_FAIL có thể ghi sau phản hồi một chút
  await expect.poll(async () => {
    const h = world.ok(await world.call('admin', 'GET', `/api/users/${id}/activity`), 'lịch sử');
    return h.items.map((i: any) => i.action);
  }, { timeout: 10_000 }).toContain(action);
});

// ================= Đo thời gian, giới hạn IP, lỗi mail =================

/** Thời gian (ms) của một lần yêu cầu mã thành công. */
async function timedRequest(world: World, phone: string) {
  const l = await requestCode(world, phone);
  world.ok(l, 'yêu cầu mã');
  return l.ms;
}

When(/^tôi đo thời gian yêu cầu mã cho T_USER và cho SĐT không tồn tại, mỗi loại (\d+) lần$/, async ({ world, $test }, n: number) => {
  const s = await fp(world); const t = target(s);
  const real: number[] = []; const fake: number[] = [];
  for (let i = 0; i < Number(n); i++) {
    if (i > 0) await waitOrSkip($test, s.resendAfter, 'Thời gian chờ gửi lại');
    real.push(await timedRequest(world, t.phone));
    fake.push(await timedRequest(world, randomPhone()));
  }
  world.vars.timing = { real, fake };
});

Then(/^chênh lệch trung vị nhỏ hơn (\d+) ms$/, async ({ world }, limit: number) => {
  const median = (a: number[]) => { const b = [...a].sort((x, y) => x - y); return b[Math.floor(b.length / 2)]; };
  const { real, fake } = world.vars.timing;
  const diff = Math.abs(median(real) - median(fake));
  expect(diff, `trung vị: có tài khoản ${median(real)} ms, không có ${median(fake)} ms`).toBeLessThan(Number(limit));
});

When(/^tôi yêu cầu mã cho (\d+) SĐT ngẫu nhiên khác nhau từ cùng một IP$/, async ({ world }, n: number) => {
  world.vars.statuses = [];
  for (let i = 0; i < Number(n); i++) world.vars.statuses.push((await requestCode(world, randomPhone())).status);
});

Then(/^cả (\d+) lần đều trả 200$/, async ({ world }, n: number) => {
  expect(world.vars.statuses).toEqual(Array(Number(n)).fill(200));
});

When(/^tôi yêu cầu mã cho 1 SĐT ngẫu nhiên nữa từ IP đó$/, async ({ world }) => {
  await requestCode(world, randomPhone());
});

Then('yêu cầu mã từ một IP khác vẫn trả 200', async ({ world }) => {
  const other = await pwRequest.newContext({ baseURL: world.baseURL, extraHTTPHeaders: { 'X-Forwarded-For': fakeIp() } });
  try { expect((await requestCode(world, randomPhone(), other)).status).toBe(200); } finally { await other.dispose(); }
});

Given('Mailpit đang giả lập lỗi người nhận', async ({ world, $test }) => {
  $test.skip(!(await mail.setRecipientFailure(true)), 'Mailpit chưa bật --enable-chaos');
  world.onCleanup(() => mail.setRecipientFailure(false));
});

// ================= Nội dung mail, lịch sử, log =================

Then('mail mã xác nhận gửi T_USER có họ tên, mã 6 số, thời hạn và không có liên kết', async ({ world }) => {
  const t = target(await fp(world)); const u = world.need().user;
  const [m] = await mail.waitForMails(t.email!, mail.OTP_SUBJECT);
  const body = await mail.mailBody(m.id);
  expect(m.subject).toMatch(/^\[Quản lý kho\] Mã xác nhận đặt lại mật khẩu: \d{6}$/);
  expect(body.text).toContain(u.name);
  expect(body.text).toMatch(/\d{3} \d{3}/);
  expect(body.text).toMatch(/hiệu lực trong \d+ phút/);
  expect(body.html).not.toMatch(/<a\s/i);
});

Then('mail thông báo đổi mật khẩu gửi T_USER có thời điểm, địa chỉ IP và không có liên kết', async ({ world }) => {
  const s = await fp(world);
  const [m] = await mail.waitForMails(target(s).email!, mail.CHANGED_SUBJECT);
  const body = await mail.mailBody(m.id);
  expect(body.text).toMatch(/lúc \d{2}\/\d{2}\/\d{4} \d{2}:\d{2}/);
  expect(body.text).toContain(s.ip);
  expect(body.html).not.toMatch(/<a\s/i);
});

/** So theo data-action vì nhãn "Đặt lại mật khẩu" cũng nằm trong "Yêu cầu đặt lại mật khẩu". */
Then('bảng lịch sử có dòng "Yêu cầu đặt lại mật khẩu" và dòng "Đặt lại mật khẩu"', async ({ world }) => {
  const rows: [string, string][] = [['PWD_RESET_REQUEST', 'Yêu cầu đặt lại mật khẩu'], ['PWD_RESET', 'Đặt lại mật khẩu']];
  for (const [action, label] of rows)
    await expect(world.page.locator(`${SEL.actItem}[data-action="${action}"]`).first()).toContainText(label);
});

Then('bảng lịch sử không chứa mã OTP hay reset token đã dùng', async ({ world }) => {
  const text = await world.page.locator(SEL.actDrawer).innerText();
  for (const secret of (await fp(world)).secrets) expect(text).not.toContain(secret);
});

Given('log máy chủ đọc được qua biến APP_LOG', async ({ $test }) => {
  $test.skip(!process.env.APP_LOG, 'Đặt APP_LOG=<đường dẫn file log của máy chủ> để chạy test này');
});

Then('log máy chủ không chứa mã OTP, reset token hay mật khẩu mới đã dùng', async ({ world }) => {
  await sleep(1000); // chờ luồng gửi mail nền ghi log xong
  const log = readFileSync(process.env.APP_LOG!, 'utf8');
  const secrets = (await fp(world)).secrets.filter((x) => x.length >= 6);
  expect(secrets.length).toBeGreaterThan(0);
  for (const secret of secrets) expect(log.includes(secret), 'log chứa ' + secret).toBe(false);
});
