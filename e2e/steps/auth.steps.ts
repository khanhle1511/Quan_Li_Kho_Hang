import { Given, When, Then, expect, actorOf, today } from './fixtures';
import { SEL } from '../helpers/selectors';
import { ACCOUNTS, gotoLogin, uiLoginAs, nav } from '../helpers/app';

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Rê chuột lên tên đối tác. Cuộn trang làm popup tự ẩn → cuộn tới trước, đưa chuột ra ngoài rồi mới rê vào. */
export async function hoverHp(page: any, id: string) {
  const t = page.locator(SEL.hp(id));
  await t.scrollIntoViewIfNeeded();
  await page.mouse.move(0, 0);
  await sleep(200);
  await t.hover();
  await expect(page.locator(SEL.hpop)).toBeVisible();
}
const norm = (p: string) => p.replace(/[\s.\-]/g, '');

// ================= AUTH-01 Trang chủ =================

Given('tôi chưa đăng nhập và đang ở trang chủ', async ({ world }) => {
  await world.setActor('anon');
  await world.page.goto('/');
  await expect(world.page.locator(SEL.home)).toBeVisible();
  await sleep(700); // chờ hiệu ứng xuất hiện (rise) để sự kiện chuột/phím được gắn
});

When(/^tôi nhấn (?:phím )?"([^"]+)"$/, async ({ world }, key: string) => { await world.page.keyboard.press(key); });

Then('trang chủ "#home" biến mất', async ({ world }) => {
  await world.page.locator(SEL.home).waitFor({ state: 'detached', timeout: 5000 });
});
Then('trang chủ "#home" vẫn hiển thị', async ({ world }) => {
  await sleep(1200); // dài hơn hiệu ứng rời trang chủ (640 ms)
  await expect(world.page.locator(SEL.home)).toBeVisible();
});
Then(/^tôi thấy ô "([^"]+)"$/, async ({ world }, fid: string) => {
  await expect(world.page.locator(`[data-fid="${fid}"]`)).toBeVisible();
});

When(/^tôi giữ chuột kéo lên (\d+)px rồi thả$/, async ({ world }, px: string) => {
  const box = (await world.page.locator(SEL.home).boundingBox())!;
  const x = box.x + box.width / 2, y = box.y + box.height / 2;
  await world.page.mouse.move(x, y);
  await world.page.mouse.down();
  await world.page.mouse.move(x, y - Number(px), { steps: 8 });
  await world.page.mouse.up();
});

// ================= AUTH-02/03 Đăng nhập qua API =================

When(/^tôi gọi POST "\/api\/auth\/login" với phone "([^"]*)" và password "([^"]*)"$/, async ({ world }, phone: string, pass: string) => {
  // Mật khẩu mặc định 123456 của 3 tài khoản demo có thể bị ghi đè bằng biến môi trường
  const role = (['admin', 'manager', 'staff'] as const).find((r) => ACCOUNTS[r].phone === norm(phone));
  const password = role && pass === '123456' ? ACCOUNTS[role].pass : pass;
  const ctx = await world.fresh();
  await world.keep(await ctx.post('/api/auth/login', { data: { phone, password } }));
});

Then(/^role trả về là "([^"]+)"$/, async ({ world }, role: string) => { expect(world.ok().role).toBe(role); });

Given(/^tài khoản (U\d) đang ở tình trạng "([^"]+)"$/, async ({ world }, id: string, st: string) => {
  const u = (await world.state('admin')).users.find((x: any) => x.id === id);
  expect(u?.status, 'tình trạng ' + id).toBe(st);
});

// ================= AUTH-04/05 =================

Then('tôi vẫn ở trong ứng dụng', async ({ world }) => { await expect(world.page.locator(SEL.navItem).first()).toBeVisible({ timeout: 15_000 }); });

When('tôi tải lại trang', async ({ world }) => {
  if (world.actor !== 'anon' && world.uiActor === null) await world.ui(); // "đã đăng nhập" mà chưa mở trang → mở trước
  await world.page.reload();
  await world.page.waitForLoadState('networkidle');
});

// ================= AUTH-06 Hết phiên =================

Given(/^T_USER \(staff\) đã đăng nhập ở context A$/, async ({ world }) => {
  await world.setActor('T_USER');
  await world.ui();
});

When('Admin ở context B khóa T_USER', async ({ world }) => {
  world.ok(await world.call('admin', 'PUT', `/api/users/${world.need().user.id}/status`, { status: 'locked' }), 'khóa T_USER');
});

/** Thao tác có gọi API trên giao diện: lập phiếu nhập một dòng rồi lưu. */
async function uiActionWithApi(world: any) {
  const page = world.page;
  await nav(page, 'Nhập kho');
  await page.locator(SEL.pick).first().click();
  await page.click(SEL.rcSave);
  await page.waitForTimeout(800);
}

When(/^(?:T_USER|T_USER2|tôi) (?:làm một thao tác|thao tác tiếp|thao tác) có gọi API.*$/, async ({ world }) => { await uiActionWithApi(world); });

Then(/^API trả 401 với thông báo bắt đầu bằng "([^"]+)"$/, async ({ world }, msg: string) => {
  const r = await world.page.request.get('/api/state');
  expect(r.status()).toBe(401);
  // Giao diện hiển thị đúng thông báo máy chủ trả về ở form đăng nhập
  await expect(world.page.locator(SEL.loginErr)).toContainText(msg);
});

Then(/^giao diện của (?:T_USER|T_USER2) về trang đăng nhập$|^(?:T_USER|T_USER2) bị đẩy về trang đăng nhập$/, async ({ world }) => {
  await expect(world.page.locator(SEL.loginUser)).toBeVisible();
  await expect(world.page.locator(SEL.navItem)).toHaveCount(0);
});

When('máy chủ được khởi động lại', async ({ world, $test }) => {
  const key = process.env.RENDER_API_KEY, svc = process.env.RENDER_SERVICE_ID;
  $test.skip(!key || !svc, 'Cần RENDER_API_KEY và RENDER_SERVICE_ID để khởi động lại máy chủ (chỉ chạy đợt @exclusive trên bản online). Trên local hãy khởi động lại thủ công.');
  const r = await fetch(`https://api.render.com/v1/services/${svc}/restart`, { method: 'POST', headers: { Authorization: 'Bearer ' + key } });
  expect(r.ok, 'Render restart').toBe(true);
  for (let i = 0; i < 30; i++) {
    await sleep(10_000);
    const s = await world.page.request.get('/api/public/summary').catch(() => null);
    if (s?.ok()) break;
  }
});

Then('tôi thấy thông báo phiên hết hạn và về trang đăng nhập', async ({ world }) => {
  await expect(world.page.locator(SEL.loginErr)).toContainText(/Phiên đăng nhập/);
  await expect(world.page.locator(SEL.loginUser)).toBeVisible();
});

Then('đăng nhập lại thì dùng bình thường', async ({ world }) => {
  world.uiActor = null; world.pageActor = null;
  await uiLoginAs(world.page, world.actor as any);
  await expect(world.page.locator(SEL.navItem).first()).toBeVisible();
});

// ================= AUTH-07 Thẻ demo =================

Given('tôi đang ở trang đăng nhập', async ({ world }) => {
  await world.setActor('anon');
  await gotoLogin(world.page);
});

When(/^tôi bấm thẻ "\.rolecard" thứ (\d+).*$/, async ({ world }, n: string) => {
  world.vars.card = Number(n) - 1;
  await world.page.locator(SEL.roleCard).nth(world.vars.card).click();
});

Then(/^ô "([^"]+)" có giá trị "([^"]*)"$/, async ({ world }, fid: string, v: string) => {
  await expect(world.page.locator(`[data-fid="${fid}"]`)).toHaveValue(v);
});

Then('thẻ đó có viền chọn', async ({ world }) => {
  const card = world.page.locator(SEL.roleCard).nth(world.vars.card);
  await expect(card).toHaveClass(/\bon\b/);
  await expect(card).toHaveAttribute('aria-pressed', 'true');
});

// ================= SEC-01 =================

Then(/^phản hồi có "user" là null$/, async ({ world }) => { expect(world.ok().user).toBeNull(); });

// ================= SEC-02 XSS =================

Given(/^Manager tạo nhà cung cấp tên "(.+)"$/, async ({ world }, given: string) => {
  const name = `${given} ${world.runId}`; // đối tác không xóa được → thêm runId để không trùng với lần chạy trước
  const r = world.ok(await world.call('manager', 'POST', '/api/partners', { type: 'sup', name, phone: '0281112233' }), 'tạo NCC XSS');
  world.vars.xss = { id: r.id, name };
});

When(/^tôi mở danh sách NCC, chi tiết NCC, popup "#hpop" và màn "Nhập kho"$/, async ({ world }) => {
  const { id, name } = world.vars.xss;
  const page = world.page;
  await world.ui();
  const seen: string[] = [];
  await nav(page, 'Nhà cung cấp');
  await expect(page.locator(SEL.pRow, { hasText: name })).toBeVisible(); seen.push('danh sách');
  await hoverHp(page, id);
  await expect(page.locator(SEL.hpop)).toContainText(name); seen.push('popup');
  await page.locator(SEL.pDetailBtn(id)).click();
  await expect(page.locator(SEL.pDetail).locator('h2', { hasText: name })).toBeVisible(); seen.push('chi tiết');
  await nav(page, 'Nhập kho');
  await expect(page.locator(SEL.optcard, { hasText: name })).toBeVisible(); seen.push('Nhập kho');
  world.vars.seen = seen;
});

Then('tên hiển thị nguyên văn dạng chữ ở mọi nơi', async ({ world }) => {
  expect(world.vars.seen).toEqual(['danh sách', 'popup', 'chi tiết', 'Nhập kho']);
  // Nếu HTML được chèn thật thì sẽ có <img src="x"> trong trang
  expect(await world.page.locator('img[src="x"]').count()).toBe(0);
});

Then(/^không có (?:hộp thoại alert nào xuất hiện|script nào được thực thi)$/, async ({ world }) => {
  expect(world.dialogs, 'hộp thoại bật lên: ' + world.dialogs.join(' | ')).toEqual([]);
});

When(/^Staff lập phiếu T_PROD với ghi chú "(.+)"$/, async ({ world }, note: string) => {
  const fx = world.need();
  world.vars.code = await world.createReceipt('staff', 'in', fx.sup.id, 'HN', [[fx.prod.id, 1]], note);
});

When(/^Manager thêm hàng hóa tên "(.+)"$/, async ({ world }, given: string) => {
  const fx = world.need();
  const name = `${given} ${fx.runId}`; // hàng hóa không xóa được → thêm runId để không trùng với lần chạy trước
  world.vars.xssProd = world.ok(await world.call('manager', 'POST', '/api/products', { sku: 'TSTX-' + fx.runId, name, category: '[TEST]', unit: 'Cái', minStock: 1, price: 1 }), 'thêm hàng XSS');
  world.vars.xssProd.name = name;
});

Then('ghi chú và tên hàng hiển thị dạng chữ ở danh sách phiếu, thẻ kho và báo cáo', async ({ world }) => {
  const page = world.page; const fx = world.need(); const name = world.vars.xssProd.name;
  await world.setActor('manager');
  await world.ui();
  await nav(page, 'Nhập kho');
  await expect(page.locator(SEL.rcRow, { hasText: world.vars.code })).toContainText(fx.prod.name);
  await nav(page, 'Hàng hóa');
  await expect(page.locator(SEL.prRow, { hasText: name })).toBeVisible();
  await nav(page, 'Tồn kho');
  await page.fill(SEL.invQ, 'TSTX-' + fx.runId);
  await page.locator(SEL.invRow).first().locator('button:has-text("Thẻ kho")').click();
  await expect(page.locator(SEL.invCard).locator('h2')).toContainText(name);
  await nav(page, 'Báo cáo');
  await expect(page.locator('.trow', { hasText: name })).toBeVisible();
  // thẻ <b> không được tạo ra từ tên hàng
  expect(await page.locator('.trow b:text-is("x")').count()).toBe(0);
});

// ================= SEC-03 =================

Given(/^T_USER (?:đang hoạt động|đang active)$/, async ({ world }) => {
  const u = (await world.state('admin')).users.find((x: any) => x.id === world.need().user.id);
  expect(u?.status).toBe('active');
});

When(/^tôi đăng nhập T_USER sai mật khẩu (\d+) lần liên tiếp$/, async ({ world }, n: string) => {
  const ctx = await world.fresh(); const u = world.need().user; const st: number[] = [];
  for (let i = 0; i < Number(n); i++) st.push((await world.keep(await ctx.post('/api/auth/login', { data: { phone: u.phone, password: 'sai' + i } }))).status);
  world.vars.statuses = st;
});

Then('lần thứ 6 tài khoản bị khóa tạm theo đặc tả', async ({ world }) => {
  const u = world.need().user;
  const ctx = await world.fresh();
  const r = await world.keep(await ctx.post('/api/auth/login', { data: { phone: u.phone, password: u.pass } }));
  expect(r.status, 'Sau 6 lần sai, đăng nhập đúng mật khẩu vẫn phải bị chặn tạm thời (RISK-07)').toBe(400);
});

When(/^Admin tạo user với mật khẩu dài (\d+) ký tự$/, async ({ world }, n: string) => {
  const pass = 'A'.repeat(Number(n)); const phone = '09' + String(Date.now()).slice(-8);
  const l = await world.call('admin', 'POST', '/api/users', { name: `[TEST] Long ${world.need().runId}`, phone, password: pass, role: 'staff', opened: today(), status: 'active' });
  world.vars.longUser = { status: l.status, error: l.json?.error, id: l.json?.id, phone, pass };
  if (l.json?.id) world.extraUsers.push(l.json.id);
  world.vars.statuses = [l.status];
});

When(/^tôi đăng nhập user đó bằng (\d+) ký tự đầu nối thêm một chuỗi khác$/, async ({ world }, n: string) => {
  const u = world.vars.longUser;
  if (u.status !== 200) return;
  const ctx = await world.fresh();
  const r = await world.keep(await ctx.post('/api/auth/login', { data: { phone: u.phone, password: u.pass.slice(0, Number(n)) + 'KHAC' } }));
  u.loginStatus = r.status;
  world.vars.statuses.push(r.status);
});

Then('việc tạo bị từ chối 400 rõ ràng, hoặc chỉ mật khẩu đúng mới đăng nhập được', async ({ world }) => {
  const u = world.vars.longUser;
  expect([200, 400], `tạo user mật khẩu 100 ký tự trả ${u.status}: ${u.error ?? ''}`).toContain(u.status);
  if (u.status === 400) expect(u.error, 'thông báo khi từ chối mật khẩu dài').toBeTruthy();
  else expect(u.loginStatus, 'mật khẩu sai (chỉ trùng 72 ký tự đầu) vẫn đăng nhập được – RISK-08').toBe(400);
});
