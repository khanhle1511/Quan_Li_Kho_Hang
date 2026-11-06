import { Given, When, Then, expect } from './fixtures';
import { SEL } from '../helpers/selectors';
import { nav, readToast, waitToastGone } from '../helpers/app';
import { exact } from './ui.steps';

const num = (s: string) => Number(s.replace(/[^\d−-]/g, '').replace('−', '-'));
const prodOf = async (world: any, id: string) => (await world.state()).products.find((p: any) => p.id === id);

// ================= DASH – Tổng quan =================

Then(/^thẻ "([^"]+)" hiển thị "?([^"]+?)"?$/, async ({ world }, short: string, value: string) => {
  const card = world.page.locator(SEL.kpi, { hasText: SEL.kpiLabel[short] ?? short });
  await expect(card.locator(SEL.kpiValue)).toHaveText(value);
});

When(/^tôi bấm thẻ KPI "([^"]+)"$/, async ({ world }, short: string) => {
  await world.page.locator(SEL.kpi, { hasText: SEL.kpiLabel[short] ?? short }).click();
});

Then(/^biểu đồ có (\d+) thanh$/, async ({ world }, n: string) => {
  await expect(world.page.locator(SEL.chartCard).locator(SEL.chartBar)).toHaveCount(Number(n));
});

Then(/^thanh đầu tiên là mặt hàng có tỉ lệ tồn\/min thấp nhất$/, async ({ world }) => {
  const st = await world.state();
  const wh = (await world.page.locator(SEL.chartCard).locator('.pill.on').innerText()).trim();
  const ids = wh === 'Tất cả kho' ? st.warehouses.map((w: any) => w.id) : [st.warehouses.find((w: any) => w.name === wh).id];
  const ratio = (p: any) => ids.reduce((a: number, w: string) => a + (st.stock[p.id + '|' + w] ?? 0), 0) / Math.max(p.min * ids.length, 1);
  const lowest = [...st.products].sort((a, b) => ratio(a) - ratio(b))[0];
  await expect(world.page.locator(SEL.chartCard).locator(SEL.chartBar).first().locator('span').first()).toHaveText(lowest.name);
});

When(/^tôi bấm "Nhập" trên dòng "([^"]+)" của (Kho .+)$/, async ({ world }, name: string, wh: string) => {
  await world.page.locator(SEL.lowCardRow).filter({ hasText: name }).filter({ hasText: wh }).locator('button', { hasText: exact('Nhập') }).click();
});

Then(/^tôi sang màn "([^"]+)" với kho "([^"]+)" được chọn$/, async ({ world }, screen: string, wh: string) => {
  await expect(world.page.locator(SEL.pageTitle)).toHaveText(screen);
  await expect(world.page.locator(SEL.optcard + '.on', { hasText: wh })).toBeVisible();
});

Then(/^phiếu có dòng (P\d+) với số lượng (\d+)$/, async ({ world }, pid: string, qty: string) => {
  const p = await prodOf(world, pid);
  await expect(world.page.locator(SEL.slipLine).first()).toContainText(p.name);
  await expect(world.page.locator(SEL.rcQty('in', 0))).toHaveValue(String(qty));
});

Given('Staff vừa lập 1 phiếu xuất T_PROD', async ({ world }) => {
  const fx = world.need();
  world.vars.code = await world.createReceipt('staff', 'out', fx.cus.id, 'HN', [[fx.prod.id, 1]]);
});

Given('tôi ghi nhận số phiếu chờ hiện tại', async ({ world }) => { world.vars.pending = (await world.summary()).pending; });

When(/^Manager mở màn "Tổng quan" và bấm "Duyệt" ở phiếu đó$/, async ({ world }) => {
  await world.setActor('manager');
  await world.ui();
  await nav(world.page, 'Tổng quan');
  await waitToastGone(world.page);
  await world.page.locator(SEL.pendCardRow, { hasText: world.vars.code }).locator('button', { hasText: exact('Duyệt') }).click();
});

Then('số phiếu chờ giảm 1 so với trước khi duyệt', async ({ world }) => {
  expect((await world.summary()).pending).toBe(world.vars.pending - 1);
});

Then(/^khối "Phiếu chờ duyệt" chỉ có nút "Mở"$/, async ({ world }) => {
  const rows = world.page.locator(SEL.pendCardRow);
  expect(await rows.count(), 'cần có ít nhất 1 phiếu chờ để kiểm tra').toBeGreaterThan(0);
  for (const b of await rows.locator('button').all()) await expect(b).toHaveText('Mở');
  world.vars.scope = SEL.card('Phiếu chờ duyệt');
});

// ================= INV – Tồn kho =================

Then(/^bảng có 2 dòng là (P\d+) và (P\d+)$/, async ({ world }, a: string, b: string) => {
  const rows = world.page.locator(SEL.invRow);
  await expect(rows).toHaveCount(2);
  await expect(rows.nth(0)).toContainText((await prodOf(world, a)).sku);
  await expect(rows.nth(1)).toContainText((await prodOf(world, b)).sku);
});

Then(/^bảng có 2 dòng: HN tồn (\d+) và HCM tồn (\d+)$/, async ({ world }, hn: string, hcm: string) => {
  const rows = world.page.locator(SEL.invRow);
  await expect(rows).toHaveCount(2);
  await expect(rows.filter({ hasText: 'Kho Hà Nội' }).locator('span.r').first()).toHaveText(new RegExp('^' + hn + ' /'));
  await expect(rows.filter({ hasText: 'Kho TP.HCM' }).locator('span.r').first()).toHaveText(new RegExp('^' + hcm + ' /'));
});

When(/^tôi bấm "Thẻ kho" ở dòng (P\d+)$/, async ({ world }, pid: string) => {
  const p = await prodOf(world, pid);
  await world.page.locator(SEL.invRow, { hasText: p.sku }).first().locator('button', { hasText: 'Thẻ kho' }).click();
});

Then(/^tổng nhập là (\S+) và tổng xuất là (\S+)$/, async ({ world }, tin: string, tout: string) => {
  const card = world.page.locator(SEL.invCard);
  await expect(card.locator('.mini', { hasText: 'Tổng nhập' }).locator('b')).toHaveText(tin);
  await expect(card.locator('.mini', { hasText: 'Tổng xuất' }).locator('b')).toHaveText(tout);
});

Then(/^dòng thời gian có (\d+) dòng (\S+) và (\S+)$/, async ({ world }, n: string, a: string, b: string) => {
  const tl = world.page.locator(SEL.invCardTimeline);
  await expect(tl).toHaveCount(Number(n));
  await expect(tl.filter({ hasText: a })).toHaveCount(1);
  await expect(tl.filter({ hasText: b })).toHaveCount(1);
});

When(/^tôi bấm tên "([^"]+)"$/, async ({ world }, name: string) => {
  await world.page.locator(SEL.whLink, { hasText: name }).click();
});

Then(/^tôi sang màn "([^"]+)" với pill "([^"]+)" đang chọn$/, async ({ world }, screen: string, pill: string) => {
  await expect(world.page.locator(SEL.pageTitle)).toHaveText(screen);
  await expect(world.page.locator('.pill.on', { hasText: exact(pill) })).toBeVisible();
});

Then(/^dải thông báo hiển thị "([^"]+)"$/, async ({ world }, text: string) => {
  await expect(world.page.locator(SEL.invBanner)).toContainText(text);
});

Then(/^nút quay lại đưa tôi về màn "([^"]+)"$/, async ({ world }, screen: string) => {
  await world.page.click(SEL.invBack);
  await expect(world.page.locator(SEL.pageTitle)).toHaveText(screen);
});

// ================= ALT – Cảnh báo =================

Then(/^badge trên menu là (\d+)$/, async ({ world }, n: string) => {
  await expect(world.page.locator(SEL.navBadge)).toHaveText(String(n));
});

Then(/^dòng (P\d+) tại HN đề xuất nhập (.+)$/, async ({ world }, pid: string, sugg: string) => {
  const p = await prodOf(world, pid);
  await expect(world.page.locator(SEL.alertRow).filter({ hasText: p.sku }).filter({ hasText: 'Kho Hà Nội' })).toContainText(sugg);
});

When(/^tôi gọi GET "\/api\/public\/summary" và ghi nhận "low"$/, async ({ world }) => { world.vars.L = (await world.summary()).low; });

When(/^tôi đăng nhập rồi mở màn "([^"]+)"$/, async ({ world }, screen: string) => {
  await world.setActor('manager');
  await world.ui();
  await nav(world.page, screen);
});

Then(/^số dòng cảnh báo bằng "low"$/, async ({ world }) => { await expect(world.page.locator(SEL.alertRow)).toHaveCount(world.vars.L); });

Given(/^tồn T_PROD tại HN đã được đưa về ≤ 10 .*$/, async ({ world }) => {
  const fx = world.need();
  const t = await world.stock(fx.prod.id, 'HN');
  if (t > 5) await world.approve('manager', await world.createReceipt('staff', 'out', fx.cus.id, 'HN', [[fx.prod.id, t - 5]]));
  world.vars.t = await world.stock(fx.prod.id, 'HN');
  expect(world.vars.t).toBeLessThanOrEqual(10);
});

When(/^Staff bấm "Tạo phiếu nhập" ở dòng T_PROD$/, async ({ world }) => {
  const fx = world.need();
  await world.setActor('staff');
  await world.ui();
  await nav(world.page, 'Cảnh báo tồn thấp');
  await world.page.locator(SEL.alertRow).filter({ hasText: fx.prod.sku }).filter({ hasText: 'Kho Hà Nội' }).locator('button', { hasText: 'Tạo phiếu nhập' }).click();
});

Then(/^form điền sẵn số lượng = max\(20 − tồn, 1\)$/, async ({ world }) => {
  await expect(world.page.locator(SEL.pageTitle)).toHaveText('Nhập kho');
  await expect(world.page.locator(SEL.rcQty('in', 0))).toHaveValue(String(Math.max(20 - world.vars.t, 1)));
});

When('Staff lưu phiếu và Manager duyệt', async ({ world }) => {
  await waitToastGone(world.page);
  await world.page.click(SEL.rcSave);
  const t = await readToast(world.page);
  const code = /(PN-\d{4})/.exec(t ?? '')?.[1];
  expect(code, 'toast sau khi lưu: ' + t).toBeTruthy();
  await world.approve('manager', code!);
});

Then(/^dòng T_PROD biến mất khỏi màn "Cảnh báo tồn thấp"$/, async ({ world }) => {
  const fx = world.need();
  await world.page.reload();
  await world.page.locator(SEL.navItem).first().waitFor();
  await nav(world.page, 'Cảnh báo tồn thấp');
  await expect(world.page.locator(SEL.alertRow).filter({ hasText: fx.prod.sku }).filter({ hasText: 'Kho Hà Nội' })).toHaveCount(0);
});

Given(/^"\/api\/public\/summary" có "low" = L và số (hàng hóa|kho active) = ([NK])$/, async ({ world }, what: string, v: string) => {
  const st = await world.state();
  world.vars.L = (await world.summary()).low;
  world.vars[v] = what === 'hàng hóa' ? st.products.length : st.warehouses.filter((w: any) => w.status === 'active').length;
});

When('Admin tạo T_WH ở trạng thái active', async ({ world }) => { world.ownWh = await world.createWh('active'); });
When('Admin tạm ngưng T_WH', async ({ world }) => { world.ok(await world.setWhStatus(world.T_WH, 'paused'), 'tạm ngưng T_WH'); });

Then(/^"low" (?:là L \+ ([NK])|trở lại L)$/, async ({ world }, v?: string) => {
  expect((await world.summary()).low).toBe(world.vars.L + (v ? world.vars[v] : 0));
});

// ================= REP – Báo cáo =================

When(/^tôi mở màn "Báo cáo" với "([^"]+)"$/, async ({ world }, wh: string) => {
  await world.ui();
  await nav(world.page, 'Báo cáo');
  await world.page.locator(SEL.pill, { hasText: exact(wh) }).click();
});

const totalCells = async (world: any) => {
  const row = world.page.locator(SEL.repTotalRow);
  await row.waitFor();
  return (await row.locator(':scope > span').allInnerTexts()).map((s: string) => s.trim());
};

Then('dòng tổng có:', async ({ world }, table: any) => {
  const want = table.hashes()[0];
  const c = await totalCells(world);
  const got = { 'Tồn đầu': c[2], 'Nhập': c[3], 'Xuất': c[4], 'Điều chỉnh': c[5], 'Tồn cuối': c[6], 'Giá trị': c[7] } as Record<string, string>;
  for (const k of Object.keys(want)) expect(got[k], k).toBe(want[k]);
});

Then(/^tồn cuối là (\d+)$/, async ({ world }, n: string) => { expect((await totalCells(world))[6]).toBe(String(n)); });

Then(/^nhãn kỳ cố định là "([^"]+)"$/, async ({ world }, label: string) => {
  await expect(world.page.locator(SEL.repPeriod)).toHaveText(label);
});

Then('tồn đầu kỳ được tính từ toàn bộ thẻ kho', async ({ world }) => {
  const st = await world.state();
  const end = Object.values(st.stock as Record<string, number>).reduce((a, b) => a + b, 0);
  let inn = 0, out = 0, adj = 0;
  for (const h of st.history) { if (h.kind === 'Nhập') inn += h.delta; else if (h.kind === 'Xuất') out -= h.delta; else adj += h.delta; }
  expect(num((await totalCells(world))[2])).toBe(end - inn + out - adj);
});

Then(/^nhãn 5 cột của biểu đồ waterfall bằng số trên dòng "Tổng cộng" của bảng$/, async ({ world }) => {
  const c = await totalCells(world);
  // <text> trong SVG không có innerText → đọc textContent
  const wf = (await world.page.locator(SEL.repWaterfallValue).allTextContents()).map((s) => num(s));
  expect(wf).toEqual([c[2], c[3], c[4], c[5], c[6]].map(num));
});

Then('không có file nào được tải về', async ({ world }) => {
  await world.page.waitForTimeout(1000);
  expect(world.downloads).toBe(0);
});

// ================= PRD – Hàng hóa =================

When(/^Manager gọi POST "\/api\/products" với:$/, async ({ world }, table: any) => {
  const r = table.hashes()[0];
  await world.call('manager', 'POST', '/api/products', {
    sku: world.expand(r.sku), name: world.expand(r.name), category: r.category, unit: r.unit, minStock: Number(r.minStock), price: Number(r.price),
  });
});

Then(/^category là "([^"]+)"$/, async ({ world }, cat: string) => {
  const p = await prodOf(world, world.ok().id);
  expect(p.cat).toBe(cat);
});

const validProduct = (world: any) => ({ sku: 'TSTV-' + world.runId, name: '[TEST] Hàng kiểm thử', category: '[TEST]', unit: 'Cái', minStock: 1, price: 1 });

When(/^tôi gọi POST "\/api\/products" với sku "([^"]+)"$/, async ({ world }, sku: string) => {
  await world.call(world.actor, 'POST', '/api/products', { ...validProduct(world), sku });
});
When(/^tôi gọi POST "\/api\/products" với (sku|name|unit) bỏ trống$/, async ({ world }, f: string) => {
  await world.call(world.actor, 'POST', '/api/products', { ...validProduct(world), [f]: '' });
});
When(/^tôi gọi POST "\/api\/products" với (minStock|price) = (-?\d+)$/, async ({ world }, f: string, v: string) => {
  await world.call(world.actor, 'POST', '/api/products', { ...validProduct(world), [f]: Number(v) });
});

