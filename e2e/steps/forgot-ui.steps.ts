import { When, Then, actorOf, expect, randomPhone, type World } from './fixtures';
import { SEL } from '../helpers/selectors';
import { gotoLogin } from '../helpers/app';
import { exact } from './ui.steps';
import { emailFor, fp, target, waitOrSkip, otp, setEmail } from './forgot.world';

/** AUTH-08 – các bước giao diện: khung quên mật khẩu ở màn đăng nhập và ô email ở form tài khoản của Admin. */

// ================= Giao diện =================

const card = (world: World) => world.page.locator(SEL.authCard);
const cardButton = (world: World, label: string) => card(world).locator('button', { hasText: exact(label) });

async function openLogin(world: World) {
  await fp(world);
  await world.setActor('anon');
  await gotoLogin(world.page);
}

When(/^tôi mở màn đăng nhập và bấm "Quên mật khẩu\?"$/, async ({ world }) => {
  await openLogin(world);
  await cardButton(world, 'Quên mật khẩu?').click();
  await expect(world.page.locator(SEL.fpPhone)).toBeVisible();
});

When(/^tôi mở màn đăng nhập, gõ "([^"]+)" vào ô SĐT rồi bấm "Quên mật khẩu\?"$/, async ({ world }, phone: string) => {
  await openLogin(world);
  await world.page.fill(SEL.loginUser, phone);
  await cardButton(world, 'Quên mật khẩu?').click();
});

When(/^tôi nhập SĐT của T_USER và bấm "Gửi mã xác nhận"$/, async ({ world }) => {
  await world.page.fill(SEL.fpPhone, target(await fp(world)).phone);
  await cardButton(world, 'Gửi mã xác nhận').click();
  await expect(world.page.locator(SEL.fpOtp)).toBeVisible();
});

When(/^tôi gõ (?:"([^"]+)"|(một SĐT ngẫu nhiên)) vào ô SĐT của khung quên mật khẩu và bấm "Gửi mã xác nhận"$/, async ({ world }, typed?: string) => {
  const s = await fp(world);
  s.lastTypedPhone = typed ?? randomPhone();
  await world.page.fill(SEL.fpPhone, s.lastTypedPhone);
  await cardButton(world, 'Gửi mã xác nhận').click();
  if (!typed) await expect(world.page.locator(SEL.fpOtp)).toBeVisible();
});

Then('màn nhập mã hiển thị thông báo chung kèm SĐT của T_USER', async ({ world }) => {
  const phone = target(await fp(world)).phone;
  const pretty = `${phone.slice(0, 4)} ${phone.slice(4, 7)} ${phone.slice(7)}`;
  await expect(card(world)).toContainText(`Nếu số điện thoại ${pretty} đã đăng ký email, mã xác nhận 6 số đã được gửi tới email đó.`);
});

When(/^tôi nhập mã trong email mới nhất và bấm "Xác nhận"$/, async ({ world }) => {
  const code = await otp(world);
  (await fp(world)).secrets.push(code);
  await world.page.fill(SEL.fpOtp, code);
  await cardButton(world, 'Xác nhận').click();
  await expect(world.page.locator(SEL.fpPass)).toBeVisible();
});

When(/^tôi nhập mật khẩu mới "([^"]+)" hai lần và bấm "Đặt lại mật khẩu"$/, async ({ world }, pass: string) => {
  await world.page.fill(SEL.fpPass, pass);
  await world.page.fill(SEL.fpPass2, pass);
  await cardButton(world, 'Đặt lại mật khẩu').click();
});

Then('form đăng nhập điền sẵn SĐT của T_USER và ô mật khẩu trống', async ({ world }) => {
  await expect(world.page.locator(SEL.loginUser)).toHaveValue(target(await fp(world)).phone);
  await expect(world.page.locator(SEL.loginPass)).toHaveValue('');
});

Then(/^đồng hồ "Mã hết hạn sau" đang đếm ngược$/, async ({ world }) => {
  const timer = world.page.locator(SEL.fpTimer);
  await expect(timer).toContainText(/Mã hết hạn sau \d{2}:\d{2}/);
  const first = await timer.innerText();
  await expect.poll(() => timer.innerText(), { timeout: 3000 }).not.toBe(first);
});

Then('nút gửi lại mã bị khóa kèm số giây chờ', async ({ world }) => {
  const b = world.page.locator(SEL.fpResendWait);
  await expect(b).toBeDisabled();
  await expect(b).toHaveText(/^Gửi lại mã \(\d+ giây\)$/);
});

Then(/^nút "([^"]+)" của khung quên mật khẩu (bị vô hiệu hóa|được bật)$/, async ({ world }, label: string, st: string) => {
  const b = cardButton(world, label);
  if (st === 'bị vô hiệu hóa') await expect(b).toBeDisabled(); else await expect(b).toBeEnabled();
});

When(/^tôi dán "([^"]+)" vào ô mã xác nhận$/, async ({ world }, text: string) => {
  await world.page.fill(SEL.fpOtp, text);
});

Then(/^ô mã xác nhận có giá trị "([^"]*)"$/, async ({ world }, v: string) => {
  await expect(world.page.locator(SEL.fpOtp)).toHaveValue(v);
});

When(/^tôi chờ hết thời gian chờ gửi lại rồi bấm "Gửi lại mã"$/, async ({ world, $test }) => {
  const s = await fp(world);
  await waitOrSkip($test, s.resendAfter, 'Thời gian chờ gửi lại');
  await cardButton(world, 'Gửi lại mã').click();
});

Then(/^ô SĐT của khung quên mật khẩu có (?:giá trị "([^"]+)"|(SĐT vừa nhập))$/, async ({ world }, v?: string) => {
  await expect(world.page.locator(SEL.fpPhone)).toHaveValue(v ?? (await fp(world)).lastTypedPhone);
});

Then(/^khung quên mật khẩu báo lỗi "([^"]+)"$/, async ({ world }, msg: string) => {
  await expect(card(world).locator(SEL.loginErr)).toContainText(msg);
});

When(/^tôi bấm "([^"]+)" trong khung quên mật khẩu$/, async ({ world }, label: string) => {
  await cardButton(world, label).click();
});

Then('ô SĐT của form đăng nhập có SĐT vừa nhập', async ({ world }) => {
  await expect(world.page.locator(SEL.loginUser)).toHaveValue((await fp(world)).lastTypedPhone);
});

When(/^tôi bấm "Quên mật khẩu\?" trong khung đăng nhập rồi nhấn phím Escape$/, async ({ world }) => {
  await cardButton(world, 'Quên mật khẩu?').click();
  await expect(world.page.locator(SEL.fpPhone)).toBeVisible();
  await world.page.keyboard.press('Escape');
});

Then('form đăng nhập hiển thị', async ({ world }) => {
  await expect(world.page.locator(SEL.loginPass)).toBeVisible();
  await expect(world.page.locator(SEL.fpPhone)).toHaveCount(0);
});

Then('không có lỗi JavaScript nào', async ({ world }) => {
  expect((await fp(world)).jsErrors).toEqual([]);
});

// ================= Email tài khoản (Admin) =================

When(/^tôi gõ "([^"]*)" vào ô Email của form tài khoản$/, async ({ world }, v: string) => {
  await world.page.fill(SEL.ufEmail, world.expand(v));
});

When(/^Admin đặt email của T_USER (?:thành "([^"]*)"|(trùng email của một tài khoản \[TEST\] khác))$/, async ({ world }, email?: string, dup?: string) => {
  const u = world.need().user;
  let value = email ?? '';
  if (dup) {
    const other = await world.createUser(`[TEST] User email ${world.runId}`, 'active');
    world.extraUsers.push(other.id);
    value = emailFor(world, 'trung');
    world.ok(await setEmail(world, other.id, other.phone, value), 'đặt email cho tài khoản khác');
  }
  await setEmail(world, u.id, u.phone, value);
});

/** Email luôn được lưu dạng chữ thường (BR-27) nên so với giá trị mong đợi đã hạ chữ thường. */
Then(/^"state\.users" có T_USER (?:với email "([^"]+)"|(không có email))$/, async ({ world }, email?: string) => {
  const u = (await world.state('admin')).users.find((x: any) => x.id === world.need().user.id);
  expect(u.email ?? null).toBe(email ? world.expand(email).toLowerCase() : null);
});

Then(/^"state\.users" của (Admin|Manager|Staff) (có email của T_USER|không có email nào)$/, async ({ world }, who: string, what: string) => {
  const users = (await world.state(actorOf(who))).users as any[];
  if (what === 'không có email nào') expect(users.filter((x) => x.email != null)).toEqual([]);
  else expect(users.find((x) => x.id === world.need().user.id)?.email).toBe(target(await fp(world)).email);
});
