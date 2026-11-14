import { Given, When, Then, expect } from './fixtures';
import { SEL, SEL2 } from '../helpers/selectors';
import { nav, waitToastGone } from '../helpers/app';
import { fill, jsonPath, stockOf, stockUp } from './new.helpers';

// ================= PRD-03 – Admin sửa hàng hóa =================

Given(/^hàng hóa \[TEST\] đang có tồn (\d+) tại kho "(HN|HCM|DN)"$/, async ({ world }, qty: string, wh: string) => {
  await stockUp(world, wh, Number(qty));
});

Then(/^tồn của hàng hóa \[TEST\] tại kho "(HN|HCM|DN)" là (\d+)$/, async ({ world }, wh: string, qty: string) => {
  expect(await stockOf(world, wh)).toBe(Number(qty));
});

Then(/^hàng hóa \[TEST\] trong state có:$/, async ({ world }, table: any) => {
  const p = (await world.state('admin')).products.find((x: any) => x.id === world.vars.prod.id);
  expect(p, 'hàng hóa [TEST]').toBeTruthy();
  for (const r of table.hashes() as { trường: string; 'giá trị': string }[])
    expect(String(p[r['trường']]), r['trường']).toBe(await fill(world, r['giá trị']));
});

Then(/^nhật ký hoạt động của tài khoản "(U\d+)" có hành động "(\w+)" chứa "(.+)"$/, async ({ world }, id: string, action: string, text: string) => {
  const r = await (await world.api('admin')).get(`/api/users/${id}/activity`);
  expect(r.status()).toBe(200);
  const items = (await r.json()).items as any[];
  const want = await fill(world, text);
  expect(items.some((i) => i.action === action && String(i.detail).includes(want)), `không có ${action} chứa "${want}"`).toBe(true);
});

When(/^tôi tìm hàng hóa \[TEST\] và bấm "Sửa" ở dòng đó$/, async ({ world }) => {
  await world.page.fill(SEL.prQ, world.vars.prod.sku);
  await world.page.locator(SEL2.prEdit(world.vars.prod.name)).click();
});
Then(/^form "Sửa hàng hóa" hiện ra với mã SKU và tên của hàng hóa \[TEST\]$/, async ({ world }) => {
  await expect(world.page.locator(SEL2.prFormTitle)).toContainText(world.vars.prod.sku);
  await expect(world.page.locator(SEL.prForm.name)).toHaveValue(world.vars.prod.name);
  await expect(world.page.locator(SEL.prForm.sku)).toHaveValue(world.vars.prod.sku);
});
When(/^tôi đổi tên thành "(.+)" và tồn tối thiểu thành (\d+) rồi lưu$/, async ({ world }, name: string, min: string) => {
  world.vars.newName = name.replace('<runId>', world.runId);
  await world.page.fill(SEL.prForm.name, world.vars.newName);
  await world.page.fill(SEL.prForm.min, String(min));
  await world.page.click(SEL2.prSaveEdit);
});
Then(/^dòng hàng hóa \[TEST\] hiển thị tên mới và tối thiểu (\d+)$/, async ({ world }, min: string) => {
  await world.page.fill(SEL.prQ, world.vars.prod.sku);
  const row = world.page.locator(SEL.prRow, { hasText: world.vars.prod.sku });
  await expect(row).toContainText(world.vars.newName);
  await expect(row).toContainText(String(min));
});
Then(/^bảng hàng hóa không có nút "Sửa"$/, async ({ world }) => {
  await expect(world.page.locator(SEL.prRow).first()).toBeVisible();
  await expect(world.page.locator(SEL.prRow + ' button', { hasText: 'Sửa' })).toHaveCount(0);
});
Then(/^bảng hàng hóa có nút "Sửa" ở mọi dòng$/, async ({ world }) => {
  const rows = world.page.locator(SEL.prRow);
  await expect(rows.first()).toBeVisible();
  await expect(world.page.locator(SEL.prRow + ' button', { hasText: 'Sửa' })).toHaveCount(await rows.count());
});

// ================= REP-04/05 – Admin xuất báo cáo và lịch sử báo cáo =================

When(/^Admin xuất báo cáo kho "(all|HN|HCM|DN)"$/, async ({ world }, wh: string) => {
  await world.call('admin', 'POST', '/api/reports', { warehouseId: wh });
  if (world.last?.status === 200) {
    world.vars.reportId = world.last.json.id;
    world.vars.reportFile = world.last.json.fileName;
  }
});

When(/^Admin tải file của báo cáo vừa xuất$/, async ({ world }) => {
  await world.call('admin', 'GET', `/api/reports/${world.vars.reportId}/file`);
});

Then(/^phản hồi là file Excel hợp lệ$/, async ({ world }) => {
  const l = world.last!;
  expect(l.status, l.text.slice(0, 100)).toBe(200);
  expect(l.headers['content-type']).toContain('spreadsheetml.sheet');
  // .xlsx là file zip: bắt đầu bằng "PK", tên các phần nằm trong tiêu đề từng mục (không nén)
  expect(l.text.startsWith('PK'), 'chữ ký zip').toBe(true);
  for (const part of ['xl/workbook.xml', 'xl/worksheets/sheet1.xml', 'xl/styles.xml']) expect(l.text, part).toContain(part);
});
Then(/^tên file tải về khớp "(.+)"$/, async ({ world }, re: string) => {
  const cd = decodeURIComponent(world.last!.headers['content-disposition'] ?? '');
  expect(cd).toMatch(new RegExp(re));
});
Then(/^tên file trả về khi xuất khớp "(.+)"$/, async ({ world }, re: string) => {
  expect(String(world.vars.reportFile)).toMatch(new RegExp(re));
});

Then(/^bản ghi báo cáo vừa xuất có trong lịch sử báo cáo trong state của Admin$/, async ({ world }) => {
  const reports = (await world.state('admin')).reports as any[];
  expect(reports.some((r) => r.id === world.vars.reportId), 'lịch sử báo cáo thiếu ' + world.vars.reportId).toBe(true);
});
Then(/^bản ghi báo cáo vừa xuất có:$/, async ({ world }, table: any) => {
  const reports = (await world.state('admin')).reports as any[];
  const rec = reports.find((r) => r.id === world.vars.reportId);
  expect(rec, 'bản ghi ' + world.vars.reportId).toBeTruthy();
  for (const r of table.hashes() as { trường: string; 'giá trị': string }[])
    expect(String(jsonPath(rec, r['trường'])), r['trường']).toBe(await fill(world, r['giá trị']));
});
Then(/^tồn cuối của báo cáo vừa xuất bằng tổng tồn hiện tại của (kho "(?:HN|HCM|DN)"|mọi kho)$/, async ({ world }, scope: string) => {
  const st = await world.state('admin');
  const wh = /"(\w+)"/.exec(scope)?.[1];
  const total = Object.entries(st.stock as Record<string, number>).filter(([k]) => !wh || k.endsWith('|' + wh)).reduce((a, [, v]) => a + v, 0);
  const rec = (st.reports as any[]).find((r) => r.id === world.vars.reportId);
  expect(rec.end).toBe(total);
});
When(/^hàng hóa \[TEST\] được nhập thêm (\d+) tại kho "(HN|HCM|DN)"$/, async ({ world }, qty: string, wh: string) => {
  await stockUp(world, wh, Number(qty));
});
Given(/^tồn cuối của báo cáo vừa xuất được ghi nhận$/, async ({ world }) => {
  const rec = ((await world.state('admin')).reports as any[]).find((r) => r.id === world.vars.reportId);
  world.vars.reportEnd = rec.end;
});
Then(/^tồn cuối của báo cáo đã xuất không đổi$/, async ({ world }) => {
  const rec = ((await world.state('admin')).reports as any[]).find((r) => r.id === world.vars.reportId);
  expect(rec.end, 'báo cáo cũ giữ số liệu tại thời điểm xuất').toBe(world.vars.reportEnd);
});
Then(/^tồn cuối của báo cáo mới lớn hơn báo cáo cũ (\d+) đơn vị$/, async ({ world }, n: string) => {
  const rec = ((await world.state('admin')).reports as any[]).find((r) => r.id === world.vars.reportId);
  expect(rec.end - world.vars.reportEnd).toBe(Number(n));
});
Then(/^lịch sử báo cáo trong state của (Manager|Staff|Manager HCM) trống$/, async ({ world }, who: string) => {
  const key = who === 'Manager' ? 'manager' : who === 'Staff' ? 'staff' : 'managerHcm';
  expect((await world.state(key)).reports).toHaveLength(0);
});

// ---------- giao diện ----------
When(/^tôi chọn kho "([^"]+)" ở bộ lọc của trang Báo cáo$/, async ({ world }, wh: string) => {
  await world.page.locator('main .col:has(> span.lbl:text-is("Kho")) button.pill', { hasText: new RegExp(`^${wh}$`) }).click();
});
When(/^tôi ấn nút "Xuất báo cáo Excel"$/, async ({ world }) => {
  const [dl] = await Promise.all([world.page.waitForEvent('download', { timeout: 15_000 }), world.page.click(SEL2.repExport)]);
  world.vars.download = dl;
});
Then(/^trình duyệt tải về file "(.+)"$/, async ({ world }, re: string) => {
  expect(world.vars.download.suggestedFilename()).toMatch(new RegExp(re));
});
Then(/^dòng đầu của lịch sử báo cáo ghi kho "([^"]+)" và người xuất "([^"]+)"$/, async ({ world }, wh: string, by: string) => {
  const row = world.page.locator(SEL2.repHistoryRow).first();
  await expect(row).toContainText(wh);
  await expect(row).toContainText(by);
});
When(/^tôi bấm "Tải lại" ở dòng đầu của lịch sử báo cáo$/, async ({ world }) => {
  const [dl] = await Promise.all([world.page.waitForEvent('download', { timeout: 15_000 }), world.page.locator(SEL2.repHistoryRow).first().locator(SEL2.repReload).click()]);
  world.vars.download = dl;
});
Then(/^trang Báo cáo có nút "Xuất báo cáo Excel" và bảng "Lịch sử báo cáo"$/, async ({ world }) => {
  await expect(world.page.locator(SEL2.repExport)).toBeVisible();
  await expect(world.page.locator(SEL2.repHistory)).toBeVisible();
});
Then(/^trang Báo cáo không có nút "Xuất báo cáo Excel", không có "Lịch sử báo cáo" và không còn nút xuất mô phỏng$/, async ({ world }) => {
  await expect(world.page.locator(SEL2.repExport)).toHaveCount(0);
  await expect(world.page.locator(SEL2.repHistory)).toHaveCount(0);
  await expect(world.page.locator('main button', { hasText: /Xuất (Excel|PDF)/ })).toHaveCount(0);
});

// dùng chung: mở màn bằng vai trò hiện tại (một số kịch bản cần chờ toast cũ trôi đi trước khi chuyển màn)
When(/^tôi chuyển sang màn "([^"]+)"$/, async ({ world }, screen: string) => {
  await world.ui();
  await waitToastGone(world.page);
  await nav(world.page, screen);
  await expect(world.page.locator(SEL.pageTitle)).toHaveText(screen);
});

