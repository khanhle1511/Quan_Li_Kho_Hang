import { Given, When, Then, expect, actorOf, type World } from './fixtures';
import { SEL } from '../helpers/selectors';
import { nav, readToast, waitToastGone } from '../helpers/app';

// ================= RCPT-10 – Sổ phiếu nhập/xuất & popup chi tiết =================

const rows = (world: World) => world.page.locator(SEL.rbRow);
const dialog = (world: World) => world.page.locator(SEL.rcvDialog);

async function openTab(world: World) {
  await world.ui();
  await waitToastGone(world.page);
  await nav(world.page, 'Phiếu nhập/xuất');
  await expect(world.page.locator(SEL.pageTitle)).toHaveText('Phiếu nhập/xuất');
}
async function openCode(world: World, code: string) {
  const link = world.page.locator(SEL.rcLink + `[data-code="${code}"]`).first();
  // Sổ phiếu phân trang 10 phiếu/trang: phiếu không ở trang hiện tại thì tìm theo mã trước
  if (!(await link.count()) && (await world.page.locator(SEL.rbQ).count())) await world.page.fill(SEL.rbQ, code);
  await link.click();
  await expect(world.page.locator(SEL.rcvTitle)).toHaveText(code);
}

// ---------- điều hướng ----------
When(/^tôi mở tab "Phiếu nhập\/xuất"$/, async ({ world }) => { await openTab(world); });
When(/^(Admin|Manager) mở tab "Phiếu nhập\/xuất"$/, async ({ world }, who: string) => {
  await world.setActor(actorOf(who));
  await openTab(world);
});
When('tôi mở ứng dụng', async ({ world }) => { await world.ui(); });
Then(/^menu không có mục "([^"]+)"$/, async ({ world }, label: string) => {
  await expect(world.page.locator(SEL.navItem, { hasText: label })).toHaveCount(0);
});
Then(/^màn hình đang ở "([^"]+)"$/, async ({ world }, screen: string) => {
  await expect(world.page.locator(SEL.pageTitle)).toHaveText(screen);
});

// ---------- danh sách ----------
// Có phân trang 10 phiếu/trang: tổng ở tiêu đề phụ = số phiếu trong state, trang hiện tại có min(10, tổng) dòng
Then(/^số dòng trong sổ phiếu bằng số phiếu trong "\/api\/state"$/, async ({ world }) => {
  const n = (await world.state(world.actor)).receipts.length;
  await expect(world.page.locator(SEL.rbSub)).toContainText(new RegExp('(/ |^)' + n + ' phiếu'));
  await expect(rows(world)).toHaveCount(Math.min(10, n));
});

// ---------- phân trang (TC-RCPT-10-14) ----------
const PER_PAGE = 10;
Given(/^sổ phiếu có hơn (\d+) phiếu$/, async ({ world }, n: number) => {
  const fx = world.need();
  const have = (await world.state('admin')).receipts.length;
  // Staff lập thêm phiếu nhập [TEST] (chờ duyệt) cho đủ số lượng; fixture tự từ chối khi dọn
  for (let i = have; i <= Number(n); i++) await world.createReceipt('staff', 'in', fx.sup.id, 'HN', [[fx.prod.id, 1]]);
  world.vars.total = (await world.state('admin')).receipts.length;
});
Then(/^trang 1 có đúng (\d+) dòng và tiêu đề ghi "Hiển thị 1–10 \/ <tổng> phiếu"$/, async ({ world }, n: number) => {
  await expect(rows(world)).toHaveCount(Number(n));
  await expect(world.page.locator(SEL.rbSub)).toContainText(`Hiển thị 1–${PER_PAGE} / ${world.vars.total} phiếu`);
  world.vars.page1 = await rows(world).locator(SEL.rcLink).allInnerTexts();
});
Then('thanh chuyển trang hiển thị số trang đúng', async ({ world }) => {
  const pages = Math.ceil(world.vars.total / PER_PAGE);
  await expect(world.page.locator(SEL.pager)).toContainText(`Trang 1 / ${pages}`);
  await expect(world.page.locator(SEL.pager + ' [data-page="prev"]')).toBeDisabled();
  await expect(world.page.locator(SEL.pager + ` [data-page="${pages}"]`)).toBeVisible();
});
When(/^tôi bấm "Sau" ở thanh chuyển trang$/, async ({ world }) => { await world.page.locator(SEL.pager + ' [data-page="next"]').click(); });
When(/^tôi bấm trang cuối ở thanh chuyển trang$/, async ({ world }) => {
  await world.page.locator(SEL.pager + ` [data-page="${Math.ceil(world.vars.total / PER_PAGE)}"]`).click();
});
Then(/^trang 2 hiển thị các phiếu tiếp theo, không trùng trang 1$/, async ({ world }) => {
  const total = world.vars.total;
  await expect(world.page.locator(SEL.rbSub)).toContainText(`Hiển thị 11–${Math.min(20, total)} / ${total} phiếu`);
  const page2 = await rows(world).locator(SEL.rcLink).allInnerTexts();
  expect(page2.length).toBe(Math.min(PER_PAGE, total - PER_PAGE));
  expect(page2.filter((c) => world.vars.page1.includes(c))).toEqual([]);
});
Then('trang cuối có số dòng còn lại và nút "Sau" bị vô hiệu hóa', async ({ world }) => {
  const rest = world.vars.total % PER_PAGE || PER_PAGE;
  await expect(rows(world)).toHaveCount(rest);
  await expect(world.page.locator(SEL.pager + ' [data-page="next"]')).toBeDisabled();
});
Then(/^sổ phiếu quay về trang 1$/, async ({ world }) => {
  const pager = world.page.locator(SEL.pager);
  if (await pager.count()) await expect(pager).toContainText('Trang 1 /');
  await expect(world.page.locator(SEL.rbSub)).toContainText('Hiển thị 1–');
});

// ---------- thời gian duyệt (TC-RCPT-10-15) ----------
Then(/^dòng phiếu đó có thời gian duyệt "([^"]+)"$/, async ({ world }, text: string) => {
  await world.page.fill(SEL.rbQ, world.vars.code);
  await expect(rows(world).filter({ hasText: world.vars.code }).locator(SEL.rbDecided)).toHaveText(text);
});
Then('dòng phiếu đó có thời gian duyệt là thời điểm vừa duyệt', async ({ world }) => {
  const r = (await world.state('admin')).receipts.find((x: any) => x.code === world.vars.code);
  expect(r.status).toBe('approved');
  expect(r.decidedAt, 'decidedAt trong /api/state').toMatch(/^\d{2}\/\d{2}\/\d{4} \d{2}:\d{2}$/);
  const [d, m, y, hh, mm] = r.decidedAt.split(/[/ :]/).map(Number);
  expect(Math.abs(Date.now() - new Date(y, m - 1, d, hh, mm).getTime()) / 60_000, 'duyệt trong vòng vài phút').toBeLessThanOrEqual(3);
  await world.page.fill(SEL.rbQ, world.vars.code);
  await expect(rows(world).filter({ hasText: world.vars.code }).locator(SEL.rbDecided)).toHaveText(r.decidedAt);
  world.vars.decidedAt = r.decidedAt;
});
Then(/^popup phiếu có "Thời gian duyệt" là "([^"]+)"$/, async ({ world }, text: string) => {
  await expect(dialog(world).locator('.rcv-info')).toContainText('Thời gian duyệt' + text);
});
Then('popup phiếu có "Thời gian duyệt" đúng thời điểm vừa duyệt', async ({ world }) => {
  await expect(dialog(world).locator('.rcv-info')).toContainText('Thời gian duyệt' + world.vars.decidedAt);
});
When('tôi đóng popup phiếu', async ({ world }) => { await world.page.keyboard.press('Escape'); });
Then(/^có các thẻ số liệu "([^"]+)", "([^"]+)", "([^"]+)", "([^"]+)"$/, async ({ world }, ...labels: string[]) => {
  for (const l of labels) await expect(world.page.locator(SEL.statTile, { hasText: l }).first()).toBeVisible();
});
When(/^tôi gõ "([^"]+)" vào ô tìm phiếu$/, async ({ world }, q: string) => { await world.page.fill(SEL.rbQ, q); });
When('tôi bỏ mọi bộ lọc sổ phiếu', async ({ world }) => { await resetFilters(world); });
async function resetFilters(world: World) {
  const page = world.page;
  await page.fill(SEL.rbQ, '');
  // nhóm Loại, Trạng thái: nút "Tất cả"; nhóm Kho: "Tất cả kho"
  for (const pill of await page.locator('main .pill', { hasText: /^Tất cả( kho)?$/ }).all()) await pill.click();
}
When(/^tôi bỏ mọi bộ lọc sổ phiếu và chọn "([^"]+)" ở nhóm "([^"]+)"$/, async ({ world }, value: string, group: string) => {
  await resetFilters(world);
  const g = world.page.locator('main .col', { has: world.page.locator('.lbl', { hasText: new RegExp('^' + group + '$') }) }).first();
  await g.locator('.pill', { hasText: new RegExp('^' + value + '$') }).click();
});
When(/^tôi bỏ mọi bộ lọc sổ phiếu và bấm thẻ "([^"]+)"$/, async ({ world }, label: string) => {
  await resetFilters(world);
  await world.page.locator(SEL.statTile, { hasText: label }).first().click();
});
// "tôi bấm thẻ "…"" dùng chung bước ở ui.steps.ts
Then(/^mọi dòng trong sổ phiếu đều chứa "([^"]+)"$/, async ({ world }, text: string) => {
  const r = rows(world);
  await expect(r.first()).toBeVisible();
  const n = await r.count();
  for (let i = 0; i < n; i++) await expect(r.nth(i)).toContainText(text);
});

// ---------- popup ----------
When(/^tôi bấm mã phiếu "([^"]+)"$/, async ({ world }, code: string) => { await openCode(world, code); });
When('tôi bấm mã phiếu đó', async ({ world }) => { await openCode(world, world.vars.code); });
Then(/^popup phiếu hiển thị loại "([^"]+)", mã "([^"]+)" và chip trạng thái$/, async ({ world }, kind: string, code: string) => {
  await expect(dialog(world)).toContainText(kind);
  await expect(world.page.locator(SEL.rcvTitle)).toHaveText(code);
  await expect(dialog(world).locator('.chip').first()).toHaveText(/Chờ duyệt|Đã duyệt|Đã từ chối|Admin cập nhật phiếu/);
});
Then(/^popup phiếu có "([^"]+)", "([^"]+)", "([^"]+)", "([^"]+)", "([^"]+)"$/, async ({ world }, ...labels: string[]) => {
  for (const l of labels) await expect(dialog(world)).toContainText(l);
});
Then(/^popup phiếu có bảng dòng hàng với cột "([^"]+)", "([^"]+)", "([^"]+)", "([^"]+)", "([^"]+)", "([^"]+)" và dòng "([^"]+)"$/, async ({ world }, ...labels: string[]) => {
  const lines = dialog(world).locator('.rcv-lines');
  for (const l of labels) await expect(lines).toContainText(l);
  expect(await lines.locator('.trow').count(), 'có dòng hàng + dòng tổng').toBeGreaterThan(1);
});
Then(/^popup phiếu có mục "([^"]+)"$/, async ({ world }, label: string) => {
  await expect(dialog(world)).toContainText(label);
  expect(await dialog(world).locator(SEL.rcvMove).count()).toBeGreaterThan(0);
});
Then('popup phiếu hiển thị đúng mã phiếu đó', async ({ world }) => {
  await expect(world.page.locator(SEL.rcvTitle)).toHaveText(world.vars.code);
});
Then(/^popup phiếu hiển thị cảnh báo "([^"]+)"$/, async ({ world }, text: string) => {
  await expect(dialog(world).locator('.notice')).toContainText(text);
});
Then(/^popup phiếu có ô "Mặt hàng" bằng (\d+), ô "Tổng số lượng" và "Giá trị" là "•••"$/, async ({ world }, n: number) => {
  await expect(dialog(world).locator('.mini', { hasText: 'Mặt hàng' }).locator('b')).toHaveText(String(n));
  for (const l of ['Tổng số lượng', 'Giá trị']) await expect(dialog(world).locator('.mini', { hasText: l }).locator('b')).toHaveText('•••');
});
Then(/^popup phiếu không có nút "([^"]+)" và "([^"]+)"$/, async ({ world }, a: string, b: string) => {
  for (const l of [a, b]) await expect(dialog(world).locator('button', { hasText: new RegExp('^' + l + '$') })).toHaveCount(0);
});
When(/^tôi bấm "([^"]+)" trong popup$/, async ({ world }, label: string) => {
  await waitToastGone(world.page);
  await dialog(world).locator('button', { hasText: new RegExp('^' + label + '$') }).click();
});
Then(/^popup phiếu cập nhật chip "([^"]+)", người duyệt "([^"]+)" và có biến động thẻ kho$/, async ({ world }, chip: string, by: string) => {
  await expect(dialog(world).locator('.chip').first()).toHaveText(chip);
  await expect(dialog(world).locator('.rcv-info')).toContainText(by);
  await expect(dialog(world).locator(SEL.rcvMove).first()).toBeVisible();
});
When('tôi bấm vào vùng tối bên ngoài popup phiếu', async ({ world }) => {
  await world.page.locator(SEL.overlay).click({ position: { x: 10, y: 10 } });
});
Then('popup phiếu đóng lại', async ({ world }) => { await expect(world.page.locator(SEL.rcvTitle)).toHaveCount(0); });

// ---------- dữ liệu ----------
Given('Admin đã lập 1 phiếu xuất T_PROD chờ duyệt', async ({ world }) => {
  const fx = world.need();
  world.vars.code = await world.createReceipt('admin', 'out', fx.cus.id, 'HN', [[fx.prod.id, 1]], '[TEST] ghi chú của Admin');
  expect((await world.state('admin')).receipts.find((r: any) => r.code === world.vars.code)?.status).toBe('pending');
});
Given('Admin đã lập 1 phiếu nhập T_PROD được duyệt ngay', async ({ world }) => {
  const fx = world.need();
  world.vars.code = await world.createReceipt('admin', 'in', fx.sup.id, 'HN', [[fx.prod.id, 2]]);
  expect((await world.state('admin')).receipts.find((r: any) => r.code === world.vars.code)?.status).toBe('approved');
});
When(/^Manager đọc phiếu đó trong "\/api\/state"$/, async ({ world }) => {
  world.vars.mr = (await world.state('manager')).receipts.find((r: any) => r.code === world.vars.code);
});
Then('phiếu đó có masked = true, lines rỗng và note rỗng', async ({ world }) => {
  const r = world.vars.mr;
  expect(r, 'Manager thấy phiếu trong danh sách').toBeTruthy();
  expect(r.masked).toBe(true);
  expect(r.lines).toEqual([]);
  expect(r.note).toBe('');
  expect(r.lineCount).toBe(1);
});
Then(/^dòng phiếu đó hiển thị "•••" và chip "([^"]+)"$/, async ({ world }, chip: string) => {
  const row = rows(world).filter({ hasText: world.vars.code });
  await expect(row).toHaveCount(1);
  await expect(row).toContainText('•••');
  await expect(row.locator('.chip', { hasText: chip })).toHaveCount(1);
});
Then(/^thẻ "([^"]+)" bằng số phiếu bị che trong "\/api\/state" của Manager$/, async ({ world }, label: string) => {
  const n = (await world.state('manager')).receipts.filter((r: any) => r.masked).length;
  await expect(world.page.locator(SEL.statTile, { hasText: label }).first()).toContainText(String(n));
});
When('Manager gọi POST approve và reject phiếu đó', async ({ world }) => {
  const c = world.vars.code;
  world.vars.ar = [await world.call('manager', 'POST', `/api/receipts/${c}/approve`), await world.call('manager', 'POST', `/api/receipts/${c}/reject`)];
});
Then(/^cả hai trả mã 403 với thông báo "([^"]+)"$/, async ({ world }, msg: string) => {
  const want = msg.replace('…', world.vars.code);
  for (const r of world.vars.ar) { expect(r.status, r.text).toBe(403); expect(r.json.error).toBe(want); }
});
When(/^Admin đọc "\/api\/state"$/, async ({ world }) => { world.vars.as = await world.state('admin'); });
Then('không có phiếu nào masked = true', async ({ world }) => {
  expect(world.vars.as.receipts.filter((r: any) => r.masked).map((r: any) => r.code)).toEqual([]);
});
Then('cả hai phiếu đều có đủ dòng hàng', async ({ world }) => {
  const mine = world.vars.as.receipts.filter((r: any) => r.note === '[TEST] ghi chú của Admin' || r.code === world.vars.code);
  const all = world.vars.as.receipts;
  const admin = all.find((r: any) => r.creatorRole === 'admin' && r.note === '[TEST] ghi chú của Admin');
  const staff = all.find((r: any) => r.code === world.vars.code);
  for (const r of [admin, staff]) { expect(r, 'phiếu').toBeTruthy(); expect(r.lines.length).toBe(r.lineCount); expect(r.lines.length).toBeGreaterThan(0); }
  void mine;
});

// ---------- từ lịch sử hoạt động ----------
When(/^tôi bấm dòng "Lập phiếu" của phiếu đó trong lịch sử$/, async ({ world }) => {
  await world.page.locator(SEL.actItem + `[data-action="RECEIPT_CREATE"] ` + SEL.actRc + `[data-code="${world.vars.code}"]`).click();
});

// ---------- thẻ kho & tổng quan ----------
When('Manager mở thẻ kho của T_PROD', async ({ world }) => {
  await world.setActor('manager');
  await world.ui();
  await nav(world.page, 'Tồn kho');
  await world.page.fill(SEL.invQ, world.need().prod.sku);
  await world.page.locator(SEL.invRow).first().locator('button:has-text("Thẻ kho")').click();
});
Then(/^dòng thẻ kho tham chiếu phiếu đó hiển thị "•••"$/, async ({ world }) => {
  const row = world.page.locator(SEL.invCardTimeline, { hasText: world.vars.code });
  await expect(row).toHaveCount(1);
  await expect(row).toContainText('•••');
  await expect(row).not.toContainText('tồn sau');
});
Then(/^dòng "Hoạt động gần đây" tham chiếu phiếu đó hiển thị "•••"$/, async ({ world }) => {
  const card = world.page.locator('section.card', { has: world.page.locator('h2', { hasText: 'Hoạt động gần đây' }) });
  const row = card.locator('.tl', { hasText: world.vars.code });
  await expect(row.first()).toBeVisible();
  await expect(row.first()).toContainText('•••');
});

// ---------- rủi ro: thẻ kho qua API ----------
When(/^Manager đọc "history\[\]" của phiếu đó trong "\/api\/state"$/, async ({ world }) => {
  world.vars.hist = (await world.state('manager')).history.filter((h: any) => h.ref === world.vars.code);
});
Then('delta và after của phiếu đó vẫn được trả về', async ({ world }) => {
  // Ghi nhận hiện trạng (hạn chế đã biết RCPT-10 mục 5): số liệu chỉ che trên giao diện
  expect(world.vars.hist.length).toBeGreaterThan(0);
  for (const h of world.vars.hist) { expect(typeof h.delta).toBe('number'); expect(typeof h.after).toBe('number'); }
});
void readToast;
