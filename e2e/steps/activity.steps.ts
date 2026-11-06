import { Given, When, Then, expect, type World } from './fixtures';
import { SEL } from '../helpers/selectors';
import { nav } from '../helpers/app';

// ================= USR-07 – Lịch sử hoạt động của nhân viên =================

type ActItem = { id: number; at: string; category: string; action: string; label: string; targetId: string; detail: string; inferred: boolean; byOther: string | null };
type Activity = { user: any; stats: any; items: ActItem[]; truncated: boolean };

const activityOf = async (world: World, id: string): Promise<Activity> =>
  world.ok(await world.call('admin', 'GET', `/api/users/${id}/activity`), 'lịch sử ' + id);
const pad = (n: number) => String(n).padStart(2, '0');
const todayVn = () => { const d = new Date(); return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`; };
/** "dd/MM/yyyy HH:mm" → số phút cách hiện tại (Infinity nếu sai định dạng) */
const minutesFromNow = (at: string) => {
  const m = /^(\d{2})\/(\d{2})\/(\d{4}) (\d{2}):(\d{2})$/.exec(at ?? '');
  if (!m) return Infinity;
  return Math.abs(Date.now() - new Date(+m[3], +m[2] - 1, +m[1], +m[4], +m[5]).getTime()) / 60_000;
};
const dayKey = (s: string) => { const m = /(\d{2})\/(\d{2})\/(\d{4})/.exec(s); return m ? `${m[3]}${m[2]}${m[1]}` : ''; };

async function openDrawer(world: World, name: string) {
  const page = world.page;
  await page.locator(SEL.userRow, { hasText: name }).first().locator(SEL.userNameBtn).click();
  await expect(page.locator(SEL.actDrawer)).toBeVisible();
  await expect(page.locator(SEL.actList), 'bảng lịch sử tải xong').toBeVisible({ timeout: 10_000 });
}

// ---------- mở / đóng ----------
When(/^tôi mở màn "Người dùng" và bấm tên "([^"]+)"$/, async ({ world }, name: string) => {
  await world.setActor('admin');
  await world.ui();
  await nav(world.page, 'Người dùng');
  await openDrawer(world, name);
});
When(/^tôi bấm tên "([^"]+)" ở bảng người dùng$/, async ({ world }, name: string) => { await openDrawer(world, name); });
When('Admin mở lịch sử của T_USER trên giao diện', async ({ world }) => {
  await world.setActor('admin');
  await world.ui();
  await nav(world.page, 'Người dùng');
  await openDrawer(world, world.need().user.name);
});
When('tôi nhấn phím Escape', async ({ world }) => { await world.page.keyboard.press('Escape'); });
When('tôi bấm vào vùng tối bên ngoài bảng lịch sử', async ({ world }) => {
  // bảng trượt nằm bên phải (rộng ≤ 700px); góc trái màn hình là nền tối
  await world.page.locator(SEL.actOverlay).click({ position: { x: 20, y: 300 } });
});
Then('bảng lịch sử đóng lại', async ({ world }) => { await expect(world.page.locator(SEL.actDrawer)).toHaveCount(0); });

// ---------- nội dung bảng ----------
Then(/^bảng lịch sử hiển thị tên "([^"]+)", vai trò "([^"]+)", tình trạng "([^"]+)" và SĐT "([^"]+)"$/,
  async ({ world }, name: string, role: string, status: string, phone: string) => {
    const head = world.page.locator(SEL.actDrawer).locator('.cardhead').first();
    await expect(head.locator('#act-title')).toHaveText(name);
    for (const t of [role, status, phone]) await expect(head).toContainText(t);
  });
Then(/^bảng lịch sử có thống kê "([^"]+)", "([^"]+)", "([^"]+)"$/, async ({ world }, a: string, b: string, c: string) => {
  for (const t of [a, b, c]) await expect(world.page.locator(SEL.actDrawer).locator('.mini', { hasText: t })).toHaveCount(1);
});
Then('các hoạt động được nhóm theo ngày, mới nhất ở trên', async ({ world }) => {
  const page = world.page;
  expect(await page.locator(SEL.actItem).count(), 'có ít nhất một hoạt động').toBeGreaterThan(0);
  const days = (await page.locator(SEL.actDay).allInnerTexts()).map(dayKey);
  expect(days.length).toBeGreaterThan(0);
  for (let i = 1; i < days.length; i++) expect(days[i] < days[i - 1], `ngày ${days[i]} phải cũ hơn ${days[i - 1]}`).toBe(true);
  const ats = await page.locator(SEL.actItem).evaluateAll((els) => els.map((e) => (e as HTMLElement).dataset.at ?? ''));
  const keys = ats.map((a) => dayKey(a) + a.slice(11));
  for (let i = 1; i < keys.length; i++) expect(keys[i] <= keys[i - 1], `dòng ${i} (${ats[i]}) phải không mới hơn dòng trước (${ats[i - 1]})`).toBe(true);
});
Then(/^bảng lịch sử có dòng "([^"]+)" kèm nhãn "([^"]+)"$/, async ({ world }, label: string, chip: string) => {
  await expect(world.page.locator(SEL.actItem, { hasText: label }).filter({ hasText: chip }).first()).toBeVisible();
});

// ---------- lọc & tìm ----------
When(/^tôi chọn nhóm "([^"]+)" và gõ "([^"]+)" vào ô tìm kiếm lịch sử$/, async ({ world }, group: string, q: string) => {
  const page = world.page;
  await page.locator(SEL.actPill, { hasText: group }).first().click();
  await page.fill(SEL.actQ, q);
});
Then(/^chỉ còn các dòng thuộc nhóm "([^"]+)" và chứa "([^"]+)"$/, async ({ world }, cat: string, q: string) => {
  const items = world.page.locator(SEL.actItem);
  const n = await items.count();
  expect(n, 'phải còn ít nhất một dòng').toBeGreaterThan(0);
  for (let i = 0; i < n; i++) {
    await expect(items.nth(i)).toHaveAttribute('data-cat', cat);
    await expect(items.nth(i)).toContainText(q);
  }
});
Then(/^số trên nút lọc "([^"]+)" bằng số dòng đang hiển thị$/, async ({ world }, group: string) => {
  const text = await world.page.locator(SEL.actPill, { hasText: group }).first().innerText();
  const n = Number(/\((\d+)\)\s*$/.exec(text)?.[1]);
  expect(n, 'số trên nút lọc: ' + text).toBe(await world.page.locator(SEL.actItem).count());
});

// ---------- API ----------
When(/^tôi đọc lịch sử hoạt động của "([^"]+)" và "([^"]+)"$/, async ({ world }, a: string, b: string) => {
  world.vars.act = { [a]: await activityOf(world, a), [b]: await activityOf(world, b) };
  world.vars.inferredExpected = {};
});
const countInferred = (act: Activity, label: string) => act.items.filter((i) => i.inferred && i.label === label).length;
Then(/^lịch sử của "([^"]+)" có đúng (\d+) "([^"]+)", (\d+) "([^"]+)", (\d+) "([^"]+)" và (\d+) "([^"]+)" suy ra từ chứng từ$/,
  async ({ world }, id: string, n1: number, l1: string, n2: number, l2: string, n3: number, l3: string, n4: number, l4: string) => {
    const act: Activity = world.vars.act[id];
    for (const [n, l] of [[n1, l1], [n2, l2], [n3, l3], [n4, l4]] as [number, string][])
      expect(countInferred(act, l), `${id}: số dòng "${l}" suy ra`).toBe(Number(n));
    world.vars.inferredExpected[id] = Number(n1) + Number(n2) + Number(n3) + Number(n4);
  });
Then(/^lịch sử của "([^"]+)" có đúng (\d+) "([^"]+)" suy ra từ chứng từ$/, async ({ world }, id: string, n: number, l: string) => {
  const act: Activity = world.vars.act[id];
  expect(countInferred(act, l), `${id}: số dòng "${l}" suy ra`).toBe(Number(n));
  world.vars.inferredExpected[id] = Number(n);
});
Then('không có dòng suy ra nào khác', async ({ world }) => {
  for (const id of Object.keys(world.vars.inferredExpected)) {
    const act: Activity = world.vars.act[id];
    expect(act.items.filter((i) => i.inferred).length, `${id}: tổng dòng suy ra`).toBe(world.vars.inferredExpected[id]);
  }
});

When('T_USER đăng nhập và lập 1 phiếu xuất T_PROD', async ({ world }) => {
  const fx = world.need();
  await world.dropSession('T_USER'); // bảo đảm có một lần đăng nhập mới
  world.vars.code = await world.createReceipt('T_USER', 'out', fx.cus.id, 'HN', [[fx.prod.id, 1]]);
});
Then('bảng lịch sử có dòng "Đăng nhập" và dòng "Lập phiếu" kèm mã phiếu vừa lập, không có nhãn "Suy ra từ chứng từ"', async ({ world }) => {
  const items = world.page.locator(SEL.actItem);
  const login = items.filter({ has: world.page.locator('[data-action="LOGIN"]') }).or(items.locator('xpath=self::*[@data-action="LOGIN"]'));
  await expect(world.page.locator(`${SEL.actItem}[data-action="LOGIN"]`).first()).toBeVisible();
  const created = world.page.locator(`${SEL.actItem}[data-action="RECEIPT_CREATE"]`, { hasText: world.vars.code });
  await expect(created).toHaveCount(1);
  await expect(created).toContainText('Lập phiếu');
  for (const l of [world.page.locator(`${SEL.actItem}[data-action="LOGIN"]`).first(), created]) await expect(l).not.toContainText('Suy ra từ chứng từ');
  void login;
});
Then('hai dòng đó ghi đúng thời điểm hôm nay', async ({ world }) => {
  const act = await activityOf(world, world.need().user.id);
  const login = act.items.find((i) => i.action === 'LOGIN');
  const created = act.items.find((i) => i.action === 'RECEIPT_CREATE' && i.targetId === world.vars.code);
  for (const [name, it] of [['Đăng nhập', login], ['Lập phiếu', created]] as [string, ActItem | undefined][]) {
    expect(it, 'dòng ' + name).toBeTruthy();
    expect(it!.inferred, name + ' không phải suy ra').toBe(false);
    expect(it!.at.startsWith(todayVn()), `${name} ghi ngày hôm nay (${it!.at})`).toBe(true);
    expect(minutesFromNow(it!.at), `${name} ghi đúng giờ (${it!.at})`).toBeLessThanOrEqual(3);
  }
});

Given('tôi đọc stats.failedLogins của T_USER', async ({ world }) => {
  world.vars.failed = (await activityOf(world, world.need().user.id)).stats.failedLogins;
});
When('T_USER đăng nhập sai mật khẩu 1 lần', async ({ world }) => {
  const u = world.need().user;
  const r = await (await world.fresh()).post('/api/auth/login', { data: { phone: u.phone, password: u.pass + 'x' } });
  expect(r.status()).toBe(400);
});
Then(/^lịch sử của T_USER có dòng LOGIN_FAIL với chi tiết chứa "([^"]+)"$/, async ({ world }, text: string) => {
  const act = await activityOf(world, world.need().user.id);
  const it = act.items.find((i) => i.action === 'LOGIN_FAIL');
  expect(it, 'dòng LOGIN_FAIL').toBeTruthy();
  expect(it!.detail).toContain(text);
  expect(it!.label).toBe('Đăng nhập thất bại');
});
Then('stats.failedLogins của T_USER tăng 1', async ({ world }) => {
  expect((await activityOf(world, world.need().user.id)).stats.failedLogins).toBe(world.vars.failed + 1);
});

When('Admin khóa T_USER', async ({ world }) => {
  world.ok(await world.call('admin', 'PUT', `/api/users/${world.need().user.id}/status`, { status: 'locked' }), 'khóa T_USER');
});
Then(/^lịch sử của T_USER có dòng USER_STATUS do "([^"]+)" thực hiện$/, async ({ world }, by: string) => {
  const act = await activityOf(world, world.need().user.id);
  const it = act.items.find((i) => i.action === 'USER_STATUS');
  expect(it, 'dòng USER_STATUS trên T_USER').toBeTruthy();
  expect(it!.byOther).toBe(by);
  expect(it!.label).toBe('Đổi trạng thái tài khoản');
});
Then('lịch sử của Admin có dòng USER_STATUS với targetId là mã T_USER', async ({ world }) => {
  const act = await activityOf(world, 'U1');
  const it = act.items.find((i) => i.action === 'USER_STATUS' && i.targetId === world.need().user.id);
  expect(it, 'dòng USER_STATUS trên Admin').toBeTruthy();
  expect(it!.byOther).toBeNull();
});

Given('T_USER đã bị khóa và xóa', async ({ world }) => {
  const id = world.need().user.id;
  world.ok(await world.call('admin', 'PUT', `/api/users/${id}/status`, { status: 'locked' }), 'khóa T_USER');
  world.ok(await world.call('admin', 'DELETE', `/api/users/${id}`), 'xóa T_USER');
});
When('Admin gọi GET lịch sử của T_USER', async ({ world }) => {
  await world.call('admin', 'GET', `/api/users/${world.need().user.id}/activity`);
});
