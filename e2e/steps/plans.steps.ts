import { Given, When, Then, expect } from './fixtures';
import { SEL, SEL2 } from '../helpers/selectors';
import { ACCOUNTS, waitToastGone } from '../helpers/app';
import { WHO_RE, actorFor, dateVars, dayAfter, fill, jsonBody, jsonPath, planOf, planReceipts, rememberPlan, track } from './new.helpers';

// ================= Nhập/xuất định kỳ (PLAN-xx) =================

// ---------- tiền điều kiện ----------
Given(new RegExp(`^kế hoạch định kỳ \\[TEST\\] đã được tạo bởi (${WHO_RE}) với JSON:$`), async ({ world }, who: string, doc: string) => {
  const l = await world.call(actorFor(world, who), 'POST', '/api/plans', await jsonBody(world, doc));
  world.ok(l, 'tạo kế hoạch định kỳ [TEST]');
  rememberPlan(world);
});

/** Đăng nhập lại bằng phiên mới: mỗi lần đăng nhập máy chủ kiểm tra kỳ đến hạn (chạy lại không được sinh trùng). */
When('có người đăng nhập lại', async ({ world }) => {
  const ctx = await world.fresh();
  const res = await ctx.post('/api/auth/login', { data: { phone: ACCOUNTS.admin.phone, password: ACCOUNTS.admin.pass } });
  expect(res.status()).toBe(200);
});

// ---------- kiểm tra kế hoạch qua /api/state ----------
Then(/^kế hoạch vừa tạo có kỳ tới "([^"]+)" đến hạn "([^"]+)"$/, async ({ world }, period: string, due: string) => {
  const p = await planOf(world);
  expect(p.next, 'kỳ tới').toBeTruthy();
  expect([p.next.period, p.next.due]).toEqual([period, due]);
});
Then(/^kế hoạch vừa tạo không còn kỳ tới$/, async ({ world }) => { expect((await planOf(world)).next).toBeNull(); });
Then(/^kế hoạch vừa tạo ở trạng thái "(active|paused|ended)"$/, async ({ world }, st: string) => { expect((await planOf(world)).status).toBe(st); });
Then(/^kế hoạch vừa tạo có (\d+) kỳ (đã lập phiếu|bỏ qua)$/, async ({ world }, n: string, kind: string) => {
  const want = kind === 'bỏ qua' ? 'skipped' : 'generated';
  const runs = (await planOf(world)).runs as any[];
  expect(runs.filter((r) => r.status === want), JSON.stringify(runs)).toHaveLength(Number(n));
});
Then(/^kỳ xử lý mới nhất của kế hoạch vừa tạo có lý do bắt đầu bằng "(.+)"$/, async ({ world }, prefix: string) => {
  const runs = (await planOf(world)).runs as any[];
  expect(String(runs[0]?.reason)).toMatch(new RegExp('^' + prefix));
});
Then(/^số lượng cố định của kế hoạch vừa tạo là:$/, async ({ world }, table: any) => {
  const lines = (await planOf(world)).lines as { pid: string; qty: number }[];
  const want = [];
  for (const r of table.hashes() as { 'hàng': string; 'số lượng': string }[]) want.push({ pid: await fill(world, r['hàng']), qty: Number(r['số lượng']) });
  expect(lines).toEqual(want);
});
Then(/^kỳ tới của kế hoạch vừa tạo có điều chỉnh riêng:$/, async ({ world }, table: any) => {
  const o = (await planOf(world)).next?.override as { pid: string; qty: number }[] | null;
  expect(o, 'điều chỉnh riêng').toBeTruthy();
  const want = [];
  for (const r of table.hashes() as { 'hàng': string; 'số lượng': string }[]) want.push({ pid: await fill(world, r['hàng']), qty: Number(r['số lượng']) });
  expect(o).toEqual(want);
});
Then(/^kỳ tới của kế hoạch vừa tạo không có điều chỉnh riêng$/, async ({ world }) => { expect((await planOf(world)).next?.override).toBeNull(); });

// ---------- phiếu do kế hoạch sinh ----------
Then(/^có đúng (\d+) phiếu sinh từ kế hoạch vừa tạo$/, async ({ world }, n: string) => { expect(await planReceipts(world)).toHaveLength(Number(n)); });
Then(/^phiếu định kỳ mới nhất của kế hoạch vừa tạo có:$/, async ({ world }, table: any) => {
  const r = (await planReceipts(world))[0];
  expect(r, 'phiếu định kỳ').toBeTruthy();
  for (const row of table.hashes() as { trường: string; 'giá trị': string }[]) {
    const got = jsonPath(r, row['trường']);
    expect(String(got ?? 'null'), row['trường']).toBe(await fill(world, row['giá trị']));
  }
});
Then(/^ghi chú của phiếu định kỳ mới nhất chứa "(.+)"$/, async ({ world }, text: string) => {
  const r = (await planReceipts(world))[0];
  expect(String(r.note)).toContain(await fill(world, text));
});
Then(/^phiếu định kỳ mới nhất được ghi nhớ để dọn$/, async ({ world }) => {
  const r = (await planReceipts(world))[0];
  if (r) track(world).receipts.push(r.code);
});

// ================= Giao diện =================
Then(/^danh sách kế hoạch có "([^"]+)" và không có "([^"]+)"$/, async ({ world }, yes: string, no: string) => {
  const t = await world.page.locator('main').innerText();
  expect(t).toContain(yes);
  expect(t).not.toContain(no);
});
Then(/^có nút "\+ Tạo kế hoạch"$/, async ({ world }) => { await expect(world.page.locator(SEL2.plNew)).toHaveCount(1); });
Then(/^không có nút "\+ Tạo kế hoạch" và không có nút "Sửa"$/, async ({ world }) => {
  await expect(world.page.locator(SEL2.plNew)).toHaveCount(0);
  await expect(world.page.locator('main .trow button', { hasText: 'Sửa' })).toHaveCount(0);
});

When(/^tôi ấn nút "\+ Tạo kế hoạch"$/, async ({ world }) => { await world.page.click(SEL2.plNew); });
When(/^tôi đặt kế hoạch theo tháng vào ngày hôm nay(?: cộng (\d+))?, bắt đầu từ đầu tháng$/, async ({ world, $test }, plus?: string | number) => {
  // một nhóm bắt duy nhất: có "cộng N" thì plus = N, không thì undefined
  const day = plus !== undefined ? dayAfter(Number(plus)) : dateVars().day;
  $test.skip(day === null, 'Quá ngày 28 trong tháng: bỏ qua để không vướng tháng ngắn');
  await world.page.locator('main button.pill', { hasText: /^Theo tháng$/ }).click();
  await world.page.fill(SEL2.plDay, String(day));
  await world.page.fill(SEL2.plStart, dateVars().monthStart);
});
Then(/^gợi ý lịch của form nêu ngày hôm nay hằng tháng$/, async ({ world }) => {
  await expect(world.page.locator(SEL2.plHint)).toContainText(new RegExp(`ngày ${dateVars().day} hằng tháng`));
});
When(/^tôi thêm hàng hóa "([^"]+)" với số lượng (\d+) vào form$/, async ({ world }, prod: string, qty: string) => {
  const id = prod === '[TEST]' ? world.vars.prod.id : prod;
  const n = await world.page.locator('[data-fid^="pl-line-q"]').count();
  await world.page.selectOption(SEL2.plLinePick, id);
  await world.page.fill(SEL2.plLineQty(n), String(qty));
});
When(/^tôi nhập ghi chú kế hoạch "(.+)"$/, async ({ world }, note: string) => { await world.page.fill(SEL2.plNote, note); });
/** Lưu form; nếu thành công thì ghi nhớ mã kế hoạch từ toast "Đã tạo kế hoạch DK-xxxx". */
When(/^tôi lưu kế hoạch$/, async ({ world }) => {
  await world.page.click(SEL2.plSave);
  const toast = world.page.locator(SEL.toast);
  await Promise.race([toast.waitFor({ timeout: 10_000 }), world.page.locator(SEL2.plFormErr).waitFor({ timeout: 10_000 })]).catch(() => {});
  const m = /Đã tạo kế hoạch (DK-\d+)/.exec((await toast.count()) ? await toast.innerText() : '');
  if (m) { world.vars.planId = m[1]; track(world).plans.push(m[1]); }
});
Then(/^form kế hoạch báo lỗi chứa "(.+)"$/, async ({ world }, text: string) => {
  await expect(world.page.locator(SEL2.plFormErr)).toContainText(text);
});

When(/^tôi mở chi tiết kế hoạch "(DK-\d+)"$/, async ({ world }, id: string) => { await world.page.locator(SEL2.plOpen(id)).click(); });
Then(/^chi tiết kế hoạch hiển thị "(.+)"$/, async ({ world }, text: string) => {
  await expect(world.page.locator(SEL2.plDetail)).toContainText(await fill(world, text));
});
Then(/^chi tiết kế hoạch không hiển thị "(.+)"$/, async ({ world }, text: string) => {
  await expect(world.page.locator(SEL2.plDetail)).not.toContainText(await fill(world, text));
});
Then(/^chi tiết kế hoạch không có nút hành động nào$/, async ({ world }) => {
  await expect(world.page.locator(SEL2.plDetail)).toBeVisible();
  for (const sel of [SEL2.plRun, SEL2.plSkip, SEL2.plOvrOpen, SEL2.plEdit]) await expect(world.page.locator(sel)).toHaveCount(0);
});

When(/^tôi điều chỉnh kỳ tới: thêm hàng hóa "([^"]+)" với số lượng (\d+) rồi lưu$/, async ({ world }, id: string, qty: string) => {
  await world.page.click(SEL2.plOvrOpen);
  const n = await world.page.locator('[data-fid^="pl-ovr-q"]').count();
  await world.page.selectOption(SEL2.plOvrPick, id);
  await world.page.fill(SEL2.plOvrQty(n), String(qty));
  await world.page.click(SEL2.plOvrSave);
});
When(/^tôi bấm "(Bỏ qua kỳ này|Chạy ngay)" ở chi tiết kế hoạch$/, async ({ world }, label: string) => {
  // hộp thoại xác nhận được World tự chấp nhận
  await world.page.click(label === 'Chạy ngay' ? SEL2.plRun : SEL2.plSkip);
});
When(/^tôi bấm "(Tạm dừng|Tiếp tục|Kết thúc)" ở chi tiết kế hoạch$/, async ({ world }, label: string) => {
  await world.page.locator(`${SEL2.plDetail} button`, { hasText: new RegExp(`^${label}$`) }).click();
});
Then(/^dòng của kế hoạch vừa tạo hiển thị "([^"]+)" và không có nút "Sửa"$/, async ({ world }, text: string) => {
  const row = world.page.locator(SEL2.plList, { hasText: world.vars.planId });
  await expect(row).toContainText(text);
  await expect(row.locator('button', { hasText: 'Sửa' })).toHaveCount(0);
});

// ---------- sổ phiếu và popup phiếu ----------
Then(/^sổ phiếu có dòng "Định kỳ" của kế hoạch vừa tạo do "Hệ thống" lập$/, async ({ world }) => {
  await world.page.fill(SEL.rbQ, 'Hệ thống');
  const row = world.page.locator(SEL.rbRow, { hasText: `Định kỳ ${world.vars.planId} /` }).first();
  await expect(row).toContainText('Hệ thống');
});
When(/^tôi mở phiếu định kỳ mới nhất của kế hoạch vừa tạo$/, async ({ world }) => {
  const code = (await planReceipts(world))[0].code;
  await world.page.fill(SEL.rbQ, code);
  await world.page.locator(SEL.rcLink + `[data-code="${code}"]`).first().click();
  await expect(world.page.locator(SEL.rcvTitle)).toHaveText(code);
});
Then(/^popup phiếu có nhãn "Định kỳ" của kế hoạch vừa tạo và người lập "Hệ thống"$/, async ({ world }) => {
  const d = world.page.locator(SEL.rcvDialog);
  await expect(d).toContainText(`Định kỳ ${world.vars.planId} /`);
  await expect(d).toContainText('Hệ thống');
});

// ---------- Tổng quan ----------
Then(/^Tổng quan có thẻ "Sắp đến kỳ nhập\/xuất" nêu kế hoạch vừa tạo "(.+)"$/, async ({ world }, text: string) => {
  const card = world.page.locator(SEL2.dueCard);
  await expect(card).toContainText(world.vars.planId);
  await expect(card).toContainText(text);
});

// tiện ích: về lại màn trước khi đọc toast cũ (dùng ở kịch bản nhiều thao tác liên tiếp)
When(/^tôi đợi thông báo cũ biến mất$/, async ({ world }) => { await waitToastGone(world.page); });

// ---------- bổ sung ----------
/** Dùng kế hoạch mẫu của dữ liệu seed (DK-0001, DK-0002) làm "kế hoạch vừa tạo" mà không ghi nhớ để dọn. */
Given(/^kế hoạch mẫu "(DK-\d+)"$/, async ({ world }, id: string) => { world.vars.planId = id; });

Then(new RegExp(`^kế hoạch vừa tạo (có|không có) trong state của (${WHO_RE})$`), async ({ world }, has: string, who: string) => {
  const plans = (await world.state(actorFor(world, who))).plans as { id: string }[];
  expect(plans.some((p) => p.id === world.vars.planId), `kế hoạch ${world.vars.planId} trong state của ${who}`).toBe(has === 'có');
});

Then(/^ghi chú của phiếu định kỳ mới nhất không chứa "(.+)"$/, async ({ world }, text: string) => {
  const r = (await planReceipts(world))[0];
  expect(String(r.note)).not.toContain(await fill(world, text));
});

When(/^tôi mở chi tiết kế hoạch vừa tạo$/, async ({ world }) => { await world.page.locator(SEL2.plOpen(world.vars.planId)).click(); });
