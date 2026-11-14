import { Given, When, Then, expect, randomPhone, type World } from './fixtures';
import { SEL } from '../helpers/selectors';
import { nav, waitToastGone } from '../helpers/app';
import { WHO_RE, actorFor, ensureProd, track } from './new.helpers';

// ================= BR-36 (mỗi kho một Quản lý kho) và BR-37 (phạm vi kho) =================

// ---------- đăng nhập các vai trò theo kho ----------
Given(/^(Manager HCM|Manager DN|Staff HCM|Tài khoản \[TEST\]) đã đăng nhập$/, async ({ world }, who: string) => {
  await world.setActor(actorFor(world, who));
});

// ---------- dữ liệu [TEST] ----------
Given(/^thông tin kho "(HN|HCM|DN)" đã được đọc$/, async ({ world }, wh: string) => {
  world.vars.wh = (await world.state('admin')).warehouses.find((w: any) => w.id === wh);
  expect(world.vars.wh, 'kho ' + wh).toBeTruthy();
});

Given(/^tài khoản \[TEST\] (Nhân viên kho|Quản lý kho) tại kho "(HN|HCM|DN)" đã được tạo$/, async ({ world }, role: string, wh: string) => {
  const phone = randomPhone();
  const body = { name: `[TEST] ${role} ${world.runId}`, phone, password: 'Test1234', role: role === 'Quản lý kho' ? 'manager' : 'staff', opened: new Date().toISOString().slice(0, 10), status: 'active', warehouseId: wh };
  const r = world.ok(await world.call('admin', 'POST', '/api/users', body), 'tạo tài khoản [TEST]');
  world.extraUsers.push(r.id);
  world.vars.user = { id: r.id, name: body.name, phone, pass: 'Test1234' };
  world.setCreds('T_USER', phone, 'Test1234');
});

Given('hàng hóa [TEST] đã được tạo', async ({ world }) => { await ensureProd(world); });

/** Phiếu NHẬP chờ duyệt của hàng hóa [TEST] do nhân viên kho `wh` lập (Staff = HN, Staff HCM = HCM). */
Given(/^phiếu nhập chờ duyệt \[TEST\] của kho "(HN|HCM)" do (Staff|Staff HCM) lập$/, async ({ world }, wh: string, who: string) => {
  const p = await ensureProd(world);
  const l = await world.call(actorFor(world, who), 'POST', '/api/receipts', { type: 'in', partnerId: 'NCC-01', warehouseId: wh, note: '[TEST] phạm vi kho', lines: [{ productId: p.id, qty: 3 }] });
  const r = world.ok(l, 'lập phiếu nhập chờ duyệt');
  expect(r.status).toBe('pending');
  track(world).receipts.push(r.code);
  world.vars.receipt = r.code;
});

// ---------- Admin đổi kho làm việc của tài khoản (qua API) ----------
async function putUser(world: World, id: string, patch: Record<string, unknown>) {
  const u = (await world.state('admin')).users.find((x: any) => x.id === id);
  expect(u, 'tài khoản ' + id).toBeTruthy();
  return world.call('admin', 'PUT', `/api/users/${id}`, { name: u.name, phone: u.phone, email: u.email ?? '', password: '', ...patch });
}
Given(/^tài khoản \[TEST\] đã bị bỏ phân kho$/, async ({ world }) => {
  world.ok(await putUser(world, world.vars.user.id, { warehouseId: '' }), 'bỏ phân kho tài khoản [TEST]');
});
When(/^Admin bỏ phân kho của tài khoản "(U\d+)"$/, async ({ world }, id: string) => { await putUser(world, id, { warehouseId: '' }); });
When(/^Admin gán tài khoản "(U\d+)" vào kho "(HN|HCM|DN)"$/, async ({ world }, id: string, wh: string) => { await putUser(world, id, { warehouseId: wh }); });

/** Kịch bản @exclusive đổi Quản lý kho của kho thật: trả `id` về kho `wh` sau kịch bản (gỡ Quản lý [TEST] đang giữ chỗ trước). */
Given(/^Quản lý kho "(U\d+)" sẽ được trả về kho "(HN|HCM|DN)" sau kịch bản$/, async ({ world }, id: string, wh: string) => {
  world.onCleanup(async () => {
    const users = (await world.state('admin')).users as any[];
    for (const u of users.filter((x) => x.role === 'manager' && x.warehouseId === wh && x.id !== id)) await putUser(world, u.id, { warehouseId: '' });
    await putUser(world, id, { warehouseId: wh });
  });
});

// ---------- đọc /api/state theo vai trò ----------
When(new RegExp(`^(${WHO_RE}) lấy dữ liệu "/api/state"$`), async ({ world }, who: string) => {
  const st = await world.state(actorFor(world, who));
  world.vars.state = st;
  (world.vars.states ??= {})[who] = st;
});

Then(/^dữ liệu trong state chỉ thuộc kho "(HN|HCM|DN)"$/, async ({ world }, wh: string) => {
  const st = world.vars.state;
  expect(st.warehouses.map((w: any) => w.id), 'danh sách kho').toEqual([wh]);
  expect(Object.keys(st.stock).length, 'có tồn kho của kho này').toBeGreaterThan(0);
  for (const k of Object.keys(st.stock)) expect(k.endsWith('|' + wh), 'tồn ' + k).toBe(true);
  for (const r of st.receipts) expect(r.wh, 'phiếu ' + r.code).toBe(wh);
  for (const h of st.history) expect(h.wh, 'thẻ kho ' + h.ref).toBe(wh);
  for (const k of st.kkList) expect(k.wh, 'kiểm kê ' + k.code).toBe(wh);
  for (const p of st.plans) expect(p.wh, 'kế hoạch ' + p.id).toBe(wh);
});

Then(/^dữ liệu trong state không có kho, tồn, phiếu, thẻ kho, kiểm kê hay kế hoạch nào$/, async ({ world }) => {
  const st = world.vars.state;
  expect(st.warehouses).toHaveLength(0);
  expect(Object.keys(st.stock)).toHaveLength(0);
  for (const k of ['receipts', 'history', 'kkList', 'plans']) expect(st[k], k).toHaveLength(0);
});

Then(/^state có (\d+) kho$/, async ({ world }, n: string) => { expect(world.vars.state.warehouses).toHaveLength(Number(n)); });

Then(/^mã phiếu kế tiếp của "([^"]+)" bằng của "([^"]+)"$/, async ({ world }, a: string, b: string) => {
  expect(world.vars.states[a].seq).toEqual(world.vars.states[b].seq);
});

Then(/^tài khoản của "([^"]+)" trong state mang kho làm việc "(HN|HCM|DN)"$/, async ({ world }, who: string, wh: string) => {
  const me = world.vars.states[who]?.me ?? world.vars.state.me;
  expect(me.warehouseId).toBe(wh);
});

// ---------- Quản lý kho / Nhân viên kho của từng kho (state của Admin) ----------
Then(/^Quản lý kho của các kho là:$/, async ({ world }, table: any) => {
  const st = await world.state('admin');
  for (const r of table.hashes() as { kho: string; 'quản lý': string }[])
    expect(st.warehouses.find((w: any) => w.id === r.kho)?.managerId, 'Quản lý kho của ' + r.kho).toBe(r['quản lý']);
});
Then(/^Quản lý kho của kho "(HN|HCM|DN)" là "(U\d+)"$/, async ({ world }, wh: string, id: string) => {
  expect((await world.state('admin')).warehouses.find((w: any) => w.id === wh).managerId).toBe(id);
});
Then(/^Quản lý kho của kho "(HN|HCM|DN)" là tài khoản \[TEST\]$/, async ({ world }, wh: string) => {
  const st = await world.state('admin');
  const m = st.users.find((u: any) => u.role === 'manager' && u.warehouseId === wh);
  expect(m?.name).toContain('[TEST]');
});
Given(/^số nhân viên kho của kho "(HN|HCM|DN)" được ghi nhận$/, async ({ world }, wh: string) => {
  world.vars.staffBefore = (await world.state('admin')).warehouses.find((w: any) => w.id === wh).staffCount;
});
Then(/^số nhân viên kho của kho "(HN|HCM|DN)" tăng thêm (\d+)$/, async ({ world }, wh: string, n: string) => {
  const now = (await world.state('admin')).warehouses.find((w: any) => w.id === wh).staffCount;
  expect(now - world.vars.staffBefore).toBe(Number(n));
});

// ---------- giao diện: popup "Kho … đã có Quản lý kho" ----------
When('Admin mở form tạo tài khoản', async ({ world }) => {
  await world.setActor('admin');
  await world.ui();
  await waitToastGone(world.page);
  await nav(world.page, 'Người dùng');
  await world.page.click(SEL.userAdd);
});
When(/^tôi điền họ tên "(.+)", SĐT ngẫu nhiên và mật khẩu "(.+)"$/, async ({ world }, name: string, pass: string) => {
  await world.page.fill(SEL.ufName, name.replace('<runId>', world.runId));
  await world.page.fill(SEL.ufPhone, randomPhone());
  await world.page.fill(SEL.ufPass, pass);
});
When(/^tôi chọn vai trò "([^"]+)" và kho làm việc "([^"]+)"$/, async ({ world }, role: string, wh: string) => {
  await world.page.locator('main button.pill', { hasText: new RegExp(`^${role}$`) }).click();
  await world.page.locator('main button.pill', { hasText: new RegExp(`^${wh}$`) }).click();
});
Then(/^gợi ý kho làm việc chứa "(.+)"$/, async ({ world }, text: string) => {
  await expect(world.page.locator(SEL.ufWhHint)).toContainText(text);
});
When('tôi bấm nút "Tạo tài khoản" trên form', async ({ world }) => { await world.page.click(SEL.userCreate); });

Then(/^popup "(.+)" hiện ra$/, async ({ world }, title: string) => {
  await expect(world.page.locator(SEL.mconfDialog)).toBeVisible();
  await expect(world.page.locator(SEL.mconfTitle)).toHaveText(title);
});
Then(/^popup nêu Quản lý kho "(.+)", SĐT "(\d+)", email "(.+)" và kho đang quản lý "(.+)"$/, async ({ world }, name: string, phone: string | number, email: string, wh: string) => {
  const card = world.page.locator(SEL.mconfCard);
  await expect(card).toContainText(name);
  await expect(card).toContainText(email);
  await expect(card).toContainText(wh);
  expect((await card.innerText()).replace(/\s/g, ''), 'SĐT trong popup').toContain(String(phone));
});
When(/^tôi nhấn phím Esc$/, async ({ world }) => { await world.page.keyboard.press('Escape'); });
Then(/^popup đóng và ô họ tên vẫn có "(.+)"$/, async ({ world }, name: string) => {
  await expect(world.page.locator(SEL.mconfDialog)).toHaveCount(0);
  await expect(world.page.locator(SEL.ufName)).toHaveValue(name.replace('<runId>', world.runId));
});

// ---------- giao diện: form sửa kho, bộ chọn Quản lý kho ----------
When(/^Admin mở form sửa kho "([^"]+)"$/, async ({ world }, name: string) => {
  await world.setActor('admin');
  await world.ui();
  await waitToastGone(world.page);
  await nav(world.page, 'Kho');
  await world.page.locator(SEL.whRow, { hasText: name }).locator('button', { hasText: 'Sửa' }).click();
});
When(/^tôi mở bộ chọn Quản lý kho và chọn "([^"]+)"$/, async ({ world }, name: string) => {
  const box = world.page.locator(SEL.keeperBox);
  // Kho đã có Quản lý: nút "Đổi" trong khung; chưa có: bấm cả khung ".keeperbox.empty"
  const change = box.locator('button:has-text("Đổi")');
  if (await change.count()) await change.click();
  else await box.first().click();
  await world.page.locator(SEL.kpRow, { hasText: name }).first().click();
});
Then(/^dòng kho "([^"]+)" hiển thị Quản lý kho "([^"]+)" và số nhân viên kho$/, async ({ world }, wh: string, name: string) => {
  const row = world.page.locator(SEL.whRow, { hasText: wh });
  await expect(row).toContainText(name);
  await expect(row).toContainText(/\d+ nhân viên kho/);
});

// ---------- giao diện: phạm vi kho của Nhân viên kho ----------
Then(/^thanh trên hiển thị "(.+)"$/, async ({ world }, text: string) => {
  await expect(world.page.locator('main').first()).toContainText(text);
});
Then(/^màn hình không nhắc tới kho "([^"]+)" và "([^"]+)"$/, async ({ world }, a: string, b: string) => {
  const t = await world.page.locator('main').innerText();
  expect(t).not.toContain(a);
  expect(t).not.toContain(b);
});
Then(/^bộ lọc kho chỉ có "([^"]+)"$/, async ({ world }, wh: string) => {
  const pills = world.page.locator('main .col:has(> span.lbl:text-is("Kho")) button.pill');
  await expect(pills).toHaveText([wh]);
});
Then(/^có thông báo chứa "(.+)"$/, async ({ world }, text: string) => {
  await expect(world.page.locator('main .notice').first()).toContainText(text);
});
