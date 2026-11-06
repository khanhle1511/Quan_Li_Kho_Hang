import { Given, When, Then, expect, today, randomPhone, type World } from './fixtures';
import { SEL } from '../helpers/selectors';
import { gotoLogin, nav, uiLogin } from '../helpers/app';

const rnd4 = () => String(Math.floor(1000 + Math.random() * 9000));
const PHONE_SHOWN = /0\d{3} \d{3} \d{3}/;
/** Giá trị trong bảng Dữ liệu: "" → chuỗi rỗng, "boss" → chuỗi, -1 → số */
const lit = (v: string) => (v.startsWith('"') ? JSON.parse(v) : Number(v));

async function whBody(world: World, id: string, patch: Record<string, unknown> = {}) {
  const w = (await world.state('admin')).warehouses.find((x: any) => x.id === id);
  return { code: w.code, name: w.name, address: w.address, keeperId: w.keeperId, phone: w.phone ?? '', capacity: w.capacity, opened: w.opened, status: w.status, ...patch };
}
const validWh = (world: World) => ({ code: 'KHO-T' + rnd4(), name: `[TEST] Kho hợp lệ ${world.runId}`, address: '[TEST] địa chỉ', keeperId: null, phone: '', capacity: 0, opened: today(), status: 'paused' });
const validUser = (world: World) => ({ name: `[TEST] User ${world.runId}`, phone: randomPhone(), password: 'Test1234', role: 'staff', opened: today(), status: 'draft' });
const remember = (world: World, kind: 'wh' | 'user') => { const id = world.last?.json?.id; if (world.last?.status === 200 && id) (kind === 'wh' ? world.extraWhs : world.extraUsers).push(id); };
const loginStatus = async (world: World, phone: string, password: string) => (await (await world.fresh()).post('/api/auth/login', { data: { phone, password } })).status();

// ================= WH – Kho =================

Then(/^"([^"]+)" hiển thị "([^"]+)"$/, async ({ world }, wh: string, text: string) => {
  const cell = world.page.locator(SEL.whRow, { hasText: wh }).locator(':scope > span').nth(3);
  expect((await cell.innerText()).replace(/\s+/g, ' ').trim()).toBe(text);
});

When(/^Admin gọi POST "\/api\/warehouses" với:$/, async ({ world }, table: any) => {
  const r = table.hashes()[0];
  const code = r.code.replace('<runId>', rnd4()); // mã kho tối đa 10 ký tự sau "KHO-" nên dùng 4 số thay cho runId
  world.vars.sentCode = code;
  await world.call('admin', 'POST', '/api/warehouses', {
    code, name: world.expand(r.name), address: r['address'] === 'địa chỉ' ? '[TEST] địa chỉ' : r.address,
    keeperId: await world.path(r.keeperId), phone: '', capacity: Number(r.capacity), opened: r.opened === 'hôm nay' ? today() : r.opened, status: r.status,
  });
  remember(world, 'wh');
});
Then(/^code được lưu dạng "KHO-T…" \(tự in hoa\)$/, async ({ world }) => {
  const w = (await world.state('admin')).warehouses.find((x: any) => x.id === world.ok().id);
  expect(w.code).toBe(world.vars.sentCode.toUpperCase());
  expect(w.code).toMatch(/^KHO-T\d{4}$/);
  world.vars.whCreated = w;
});
Then(/^trạng thái là "Tạm ngưng"$/, async ({ world }) => { expect(world.vars.whCreated.status).toBe('paused'); });

When(/^tôi gọi POST "\/api\/(warehouses|users)" với (\w+) = (.+)$/, async ({ world }, what: string, f: string, v: string) => {
  const body = what === 'warehouses' ? validWh(world) : validUser(world);
  await world.call(world.actor, 'POST', '/api/' + what, { ...body, [f]: lit(v) });
  remember(world, what === 'warehouses' ? 'wh' : 'user');
});

When(/^tôi gọi PUT "\/api\/warehouses\/(\w+)" với capacity (\d+)$/, async ({ world }, id: string, cap: string) => {
  await world.call(world.actor, 'PUT', '/api/warehouses/' + id, await whBody(world, id, { capacity: Number(cap) }));
});
When(/^Admin gọi PUT "\/api\/warehouses\/T_WH" với code "([^"]+)"$/, async ({ world }, code: string) => {
  await world.call('admin', 'PUT', '/api/warehouses/' + world.T_WH.id, await whBody(world, world.T_WH.id, { code }));
});
Then('mã của T_WH không đổi', async ({ world }) => {
  expect((await world.state('admin')).warehouses.find((x: any) => x.id === world.T_WH.id).code).toBe(world.T_WH.code);
});

When(/^Admin bấm "Thêm kho"$/, async ({ world }) => {
  await world.setActor('admin');
  await world.ui();
  await nav(world.page, 'Kho');
  await world.page.click(SEL.whAdd);
});
When(/^tôi mở "\.keeperbox" và gõ "([^"]+)" vào ô "kp-q"$/, async ({ world }, q: string) => {
  await world.page.click(SEL.keeperBox);
  await world.page.fill(SEL.kpQ, q);
});
Then(/^có (\d+) kết quả "([^"]+)" kèm "([^"]+)"$/, async ({ world }, n: string, name: string, st: string) => {
  const rows = world.page.locator(SEL.kpRow);
  await expect(rows).toHaveCount(Number(n));
  await expect(rows.first()).toContainText(name);
  await expect(rows.first()).toContainText(st);
});
When('tôi chọn kết quả đó', async ({ world }) => { await world.page.locator(SEL.kpRow).first().click(); });

When(/^tôi lưu kho với keeperId = "([^"]+)"$/, async ({ world }, k: string) => {
  await world.call('admin', 'POST', '/api/warehouses', { ...validWh(world), keeperId: k });
  remember(world, 'wh');
});

Given('T_WH có thủ kho là T_USER', async ({ world }) => {
  world.ok(await world.call('admin', 'PUT', '/api/warehouses/' + world.T_WH.id, await whBody(world, world.T_WH.id, { keeperId: world.need().user.id })), 'gán thủ kho');
});
Given('T_USER đã bị khóa', async ({ world }) => {
  world.ok(await world.call('admin', 'PUT', `/api/users/${world.need().user.id}/status`, { status: 'locked' }), 'khóa T_USER');
});
When(/^Admin gọi PUT "\/api\/warehouses\/T_WH" giữ keeperId = T_USER$/, async ({ world }) => {
  await world.call('admin', 'PUT', '/api/warehouses/' + world.T_WH.id, await whBody(world, world.T_WH.id));
});
Then(/^màn "Kho" hiện cảnh báo "([^"]+)" ở T_WH$/, async ({ world }, text: string) => {
  await world.setActor('admin');
  await world.ui();
  await nav(world.page, 'Kho');
  await expect(world.page.locator(SEL.whRow, { hasText: world.T_WH.name })).toContainText(text);
});

Given(/^T_WH đang active(?: và có 1 phiếu \[TEST\] chờ duyệt)?$/, async ({ world, $step }) => {
  world.ok(await world.setWhStatus(world.T_WH, 'active'), 'mở lại T_WH');
  if ($step.title.includes('phiếu')) {
    const fx = world.need();
    world.vars.code = await world.createReceipt('staff', 'in', fx.sup.id, world.T_WH.id, [[fx.prod.id, 1]]);
  }
});

// PUT …/status với "paused" / "locked"
When(/^(tôi|Admin) gọi PUT "([^"]+\/status)" với "([^"]+)"$/, async ({ world }, who: string, p: string, st: string) => {
  await world.call(who === 'tôi' ? world.actor : 'admin', 'PUT', await world.path(p), { status: st });
});

/**
 * Đợt @exclusive: thay đổi dữ liệu dùng chung, chạy xong phải reset CSDL.
 * Kho còn lại phải KHÔNG có phiếu chờ (máy chủ kiểm "còn phiếu chờ" trước luật "còn ≥ 1 kho hoạt động"),
 * và các kho khác phải tạm ngưng được → từ chối phiếu chờ ở các kho đó.
 */
Given('mọi kho đã tạm ngưng trừ 1 kho', async ({ world }) => {
  const st = await world.state('admin');
  const active = st.warehouses.filter((w: any) => w.status === 'active');
  const pending = (id: string) => st.receipts.filter((r: any) => r.wh === id && r.status === 'pending');
  active.sort((a: any, b: any) => pending(a.id).length - pending(b.id).length);
  world.vars.keep = active[0];
  expect(pending(world.vars.keep.id), 'kho được giữ lại không được có phiếu chờ').toHaveLength(0);
  for (const w of active.slice(1)) {
    for (const r of pending(w.id)) world.ok(await world.call('admin', 'POST', `/api/receipts/${r.id}/reject`), 'từ chối ' + r.id);
    world.ok(await world.call('admin', 'PUT', `/api/warehouses/${w.id}/status`, { status: 'paused' }), 'tạm ngưng ' + w.name);
    world.restoreWhs.push(w.id);
  }
});
When('Admin tạm ngưng kho còn lại', async ({ world }) => {
  await world.call('admin', 'PUT', `/api/warehouses/${world.vars.keep.id}/status`, { status: 'paused' });
  if (world.last?.status === 200) world.restoreWhs.push(world.vars.keep.id);
});

When(/^Staff mở các màn (.+)$/, async ({ world }, list: string) => {
  await world.setActor('staff');
  await world.ui();
  world.vars.whCounts = {};
  for (const screen of list.match(/"([^"]+)"/g)!.map((s) => s.slice(1, -1))) {
    await nav(world.page, screen);
    world.vars.whCounts[screen] = await world.page.locator(SEL.optcard, { hasText: world.T_WH.name }).count();
  }
});
Then('không màn nào có thẻ kho T_WH', async ({ world }) => {
  expect(Object.values(world.vars.whCounts).every((n) => n === 0), JSON.stringify(world.vars.whCounts)).toBe(true);
});

Given(/^T_WH2 đã tạm ngưng nhưng còn T_PROD × (\d+)$/, async ({ world }, q: string) => {
  const fx = world.need();
  fx.wh2 = await world.createWh('active');
  await world.approve('manager', await world.createReceipt('staff', 'in', fx.sup.id, fx.wh2.id, [[fx.prod.id, Number(q)]]));
  world.ok(await world.setWhStatus(fx.wh2, 'paused'), 'tạm ngưng T_WH2');
});

/** Tạo chứng từ cũ cho T_WH (nhập 1 rồi xuất 1) để kiểm tra chứng từ còn sau khi xóa kho, rồi tạm ngưng kho. */
Given('T_WH đã tạm ngưng và tồn bằng 0', async ({ world }) => {
  const fx = world.need(); const w = world.T_WH;
  world.ok(await world.setWhStatus(w, 'active'));
  const pn = await world.createReceipt('staff', 'in', fx.sup.id, w.id, [[fx.prod.id, 1]]);
  await world.approve('manager', pn);
  const px = await world.createReceipt('staff', 'out', fx.cus.id, w.id, [[fx.prod.id, 1]]);
  await world.approve('manager', px);
  world.vars.whDocs = [pn, px];
  world.ok(await world.setWhStatus(w, 'paused'));
  expect(await world.stock(fx.prod.id, w.id)).toBe(0);
});
Then(/^T_WH không còn trong "\/api\/state"$/, async ({ world }) => {
  expect((await world.state('admin')).warehouses.some((x: any) => x.id === world.T_WH.id)).toBe(false);
});
Then('phiếu và thẻ kho cũ của T_WH vẫn còn', async ({ world }) => {
  const st = await world.state('admin');
  for (const code of world.vars.whDocs) expect(st.receipts.some((r: any) => r.id === code), code).toBe(true);
  expect(st.history.filter((h: any) => h.wh === world.T_WH.id).length).toBeGreaterThanOrEqual(2);
});

When(/^Admin bấm "Xóa" ở dòng (T_WH|T_USER)$/, async ({ world }, what: string) => {
  await world.setActor('admin');
  await world.ui();
  if (what === 'T_WH') {
    await nav(world.page, 'Kho');
    await world.page.locator(SEL.whDelBtn(world.T_WH.name)).click();
  } else {
    await nav(world.page, 'Người dùng');
    await world.page.locator(SEL.userDelBtn(world.need().user.name)).click();
  }
  await expect(world.page.locator(SEL.overlayDialog)).toBeVisible();
});

Then(/^mọi "(warehouses|users)\[\]\.phone" là null$/, async ({ world }, key: string) => {
  for (const x of world.ok()[key]) expect(x.phone ?? null, x.id).toBeNull();
});
Then(/^"warehouses\[\]\.phone" có giá trị$/, async ({ world }) => {
  expect(world.ok().warehouses.find((w: any) => w.id === 'HN').phone).toBeTruthy();
});
Then(/^màn "Kho" không hiển thị SĐT$/, async ({ world }) => {
  await world.ui();
  await nav(world.page, 'Kho');
  for (const t of await world.page.locator(SEL.whRow).allInnerTexts()) expect(t).not.toMatch(PHONE_SHOWN);
});

// ================= USR – Người dùng =================

Then(/^pill "([^"]+)" được chọn$/, async ({ world }, label: string) => {
  await expect(world.page.locator('.pill.on', { hasText: label })).toBeVisible();
});

When(/^(Manager|Staff) đăng nhập$/, async ({ world }, who: string) => {
  await world.setActor(who === 'Manager' ? 'manager' : 'staff');
  await world.ui();
});
Then(/^menu trái không có mục "([^"]+)"$/, async ({ world }, item: string) => {
  await expect(world.page.locator(SEL.navItem, { hasText: item })).toHaveCount(0);
});

When(/^tôi gọi POST "\/api\/users" với:$/, async ({ world }, table: any) => {
  const r = table.hashes()[0];
  const phone = r.phone.includes('ngẫu nhiên') ? randomPhone() : r.phone;
  world.vars.newUser = { phone, pass: r.password };
  await world.call(world.actor, 'POST', '/api/users', { name: world.expand(r.name), phone, password: r.password, role: r.role, opened: r.opened === 'hôm nay' ? today() : r.opened, status: r.status });
  remember(world, 'user');
});
Then(/^đăng nhập bằng SĐT đó với mật khẩu "([^"]+)" thành công$/, async ({ world }, pass: string) => {
  expect(await loginStatus(world, world.vars.newUser.phone, pass)).toBe(200);
});
When(/^tôi gọi POST "\/api\/users" với (phone|password) "([^"]*)"$/, async ({ world }, f: string, v: string) => {
  await world.call(world.actor, 'POST', '/api/users', { ...validUser(world), [f]: v });
  remember(world, 'user');
});

When(/^Admin gọi PUT "\/api\/users\/T_USER" với phone (cũ|mới ngẫu nhiên) và password (?:"([^"]+)"|rỗng)$/, async ({ world }, ph: string, pass?: string) => {
  const u = world.need().user;
  world.vars.old = { phone: u.phone, pass: u.pass };
  const phone = ph === 'cũ' ? u.phone : randomPhone();
  world.ok(await world.call('admin', 'PUT', `/api/users/${u.id}`, { phone, password: pass ?? '' }), 'sửa T_USER');
  u.phone = phone;
  if (pass) u.pass = pass;
});
Then('T_USER đăng nhập bằng mật khẩu cũ thất bại', async ({ world }) => {
  expect(await loginStatus(world, world.need().user.phone, world.vars.old.pass)).toBe(400);
});
Then(/^T_USER đăng nhập bằng "([^"]+)" thành công$/, async ({ world }, pass: string) => {
  expect(await loginStatus(world, world.need().user.phone, pass)).toBe(200);
});
Then('T_USER đăng nhập bằng SĐT mới với mật khẩu cũ thành công', async ({ world }) => {
  expect(await loginStatus(world, world.need().user.phone, world.vars.old.pass)).toBe(200);
});
Then('T_USER đăng nhập bị từ chối', async ({ world }) => {
  const u = world.need().user;
  expect(await loginStatus(world, u.phone, u.pass)).toBe(400);
});

When(/^tôi gọi PUT "\/api\/users\/(U\d)" với phone "([^"]+)" và password rỗng$/, async ({ world }, id: string, phone: string) => {
  await world.call(world.actor, 'PUT', '/api/users/' + id, { phone, password: '' });
});

Given(/^Admin tạo T_USER2 ở tình trạng "([^"]+)"$/, async ({ world }, st: string) => {
  const fx = world.need();
  fx.user2 = await world.createUser(`[TEST] User2 ${world.runId}`, st);
});
When('T_USER2 đăng nhập', async ({ world }) => {
  const u = world.need().user2!;
  await world.setActor('anon');
  if (!(await world.page.locator(SEL.loginUser).count())) await gotoLogin(world.page);
  world.vars.loginErr = await uiLogin(world.page, u.phone, u.pass);
  if (!world.vars.loginErr) { world.actor = 'T_USER2'; world.uiActor = 'T_USER2'; world.pageActor = 'T_USER2'; }
});
Then(/^bị từ chối với thông báo "([^"]+)"$/, async ({ world }, text: string) => { expect(world.vars.loginErr).toContain(text); });
Then('T_USER2 vào được ứng dụng', async ({ world }) => { await expect(world.page.locator(SEL.navItem).first()).toBeVisible(); });
When(/^Admin (kích hoạt|khóa) T_USER2(?: trong lúc T_USER2 đang dùng)?$/, async ({ world }, act: string) => {
  world.ok(await world.call('admin', 'PUT', `/api/users/${world.need().user2!.id}/status`, { status: act === 'khóa' ? 'locked' : 'active' }));
});

Given(/^T_USER đã lập 1 phiếu(?: nhập)? và đã bị khóa$/, async ({ world }) => {
  const fx = world.need();
  world.vars.code = await world.createReceipt('T_USER', 'in', fx.sup.id, 'HN', [[fx.prod.id, 1]]);
  world.ok(await world.call('admin', 'PUT', `/api/users/${fx.user.id}/status`, { status: 'locked' }), 'khóa T_USER');
});
Then(/^T_USER không còn trong "state\.users"$/, async ({ world }) => {
  expect((await world.state('admin')).users.some((u: any) => u.id === world.need().user.id)).toBe(false);
});
Then(/^phiếu của T_USER trong "state\.receipts" vẫn giữ tên người lập$/, async ({ world }) => {
  const r = (await world.state('admin')).receipts.find((x: any) => x.id === world.vars.code);
  expect(r?.creator).toBe(world.need().user.name);
});
Then(/^popup ghi "(\d+) chứng từ \((.+)\)"$/, async ({ world }, n: string, detail: string) => {
  const d = world.page.locator(SEL.overlayDialog);
  await expect(d).toContainText(n + ' chứng từ');
  await expect(d).toContainText(detail);
});

Given('T_USER là thủ kho của T_WH và đã bị khóa', async ({ world }) => {
  const fx = world.need();
  world.ok(await world.call('admin', 'PUT', '/api/warehouses/' + world.T_WH.id, await whBody(world, world.T_WH.id, { keeperId: fx.user.id })), 'gán thủ kho');
  world.ok(await world.call('admin', 'PUT', `/api/users/${fx.user.id}/status`, { status: 'locked' }), 'khóa T_USER');
});
When('Admin xóa T_USER', async ({ world }) => {
  world.vars.statuses = [(await world.call('admin', 'DELETE', `/api/users/${world.need().user.id}`)).status];
});
// BUG-011: mã tài khoản đã xóa không được cấp lại; người mới không bị coi là người lập phiếu của người cũ
When('Admin tạo tài khoản Quản lý kho mới', async ({ world }) => {
  const phone = '09' + String(Date.now()).slice(-8); const pass = '123456';
  const l = world.ok(await world.call('admin', 'POST', '/api/users', {
    name: `[TEST] QLK mới ${world.need().runId}`, phone, password: pass, role: 'manager', opened: new Date().toISOString().slice(0, 10), status: 'active',
  }), 'tạo Quản lý kho mới');
  world.vars.newUserId = l.id;
  world.extraUsers.push(l.id);
  world.setCreds('T_USER2', phone, pass);
});
Then('tài khoản mới có mã khác mã của T_USER', async ({ world }) => {
  expect(world.vars.newUserId, 'mã của tài khoản đã xóa bị cấp lại (BUG-011)').not.toBe(world.need().user.id);
});
Then('tài khoản mới duyệt được phiếu của T_USER', async ({ world }) => {
  const l = await world.call('T_USER2', 'POST', `/api/receipts/${world.vars.code}/approve`);
  expect(l.status, `người mới bị coi là người lập phiếu của người cũ: ${l.text.slice(0, 120)}`).toBe(200);
});
When(/^tôi gọi GET "\/api\/state" rồi mở màn "([^"]+)"$/, async ({ world }, screen: string) => {
  world.vars.statuses.push((await world.call(world.actor, 'GET', '/api/state')).status);
  await world.ui();
  await nav(world.page, screen);
});
Then(/^T_WH hiển thị "([^"]+) – ([^"]+)"$/, async ({ world }, a: string, b: string) => {
  const row = world.page.locator(SEL.whRow, { hasText: world.T_WH.name });
  await expect(row).toContainText(a);
  await expect(row).toContainText(b);
});

When(/^tôi gọi GET "\/api\/state" và đọc "users\[\]\.phone"$/, async ({ world }) => { await world.call(world.actor, 'GET', '/api/state'); });
Then('theo quyền riêng tư chỉ Admin nên thấy SĐT người dùng', async ({ world }) => {
  const shown = world.ok().users.filter((u: any) => u.phone);
  expect(shown.map((u: any) => u.id), 'vai trò ' + world.actor + ' vẫn nhận SĐT người dùng (RISK-06)').toEqual([]);
});
