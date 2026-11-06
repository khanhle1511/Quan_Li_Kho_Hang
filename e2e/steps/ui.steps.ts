import { When, Then, expect, type World } from './fixtures';
import { SEL } from '../helpers/selectors';
import { nav, waitToastGone } from '../helpers/app';

/** Dòng của bảng chính trên màn hình hiện tại. */
export async function rowsOf(world: World) {
  const title = (await world.page.locator(SEL.pageTitle).innerText()).trim();
  const map: Record<string, string> = {
    'Tồn kho': SEL.invRow, 'Hàng hóa': SEL.prRow, 'Cảnh báo tồn thấp': SEL.alertRow, 'Nhà cung cấp': SEL.pRow, 'Khách hàng': SEL.pRow,
    'Kho': SEL.whRow, 'Người dùng': SEL.userRow, 'Nhập kho': SEL.rcRow, 'Xuất kho': SEL.rcRow, 'Kiểm kê': SEL.kkRow,
  };
  if (!map[title]) throw new Error('Không biết bảng chính của màn ' + title);
  return world.page.locator(map[title]);
}

const exact = (s: string) => new RegExp('^\\s*' + s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\s*$');

// "bảng có 3 dòng", "danh sách có 2 kho", "danh sách có 1 dòng KH-01", "danh sách có 1 dòng "Phạm Thu Dung""
Then(/^(?:bảng|danh sách) có (\d+) (?:dòng|kho)(?: "([^"]+)"| ([A-Z]+-\d+))?$/, async ({ world }, n: string, q?: string, code?: string) => {
  const text = q || code;
  const rows = await rowsOf(world);
  await expect(rows).toHaveCount(Number(n));
  if (text) for (let i = 0; i < Number(n); i++) await expect(rows.nth(i)).toContainText(text);
});

// Bấm pill (bộ lọc kho, tab…): "tôi bấm pill "Kho Hà Nội"", "tôi chọn "Kho TP.HCM""
When(/^tôi (?:bấm pill|chọn) "([^"]+)"$/, async ({ world }, label: string) => {
  await world.page.locator(SEL.pill, { hasText: exact(label) }).first().click();
});

// Thẻ số liệu lọc danh sách
When(/^tôi bấm (?:lại )?thẻ "([^"]+)"$/, async ({ world }, label: string) => {
  await world.page.locator(SEL.statBtn, { hasText: label }).first().click();
});

When(/^tôi nhập "([^"]*)" vào ô "([^"]+)"$/, async ({ world }, v: string, fid: string) => {
  await world.page.fill(`[data-fid="${fid}"]`, v);
});

When(/^tôi tích "([^"]+)"$/, async ({ world }, what: string) => {
  const byFid = world.page.locator(`[data-fid="${what}"]`);
  if (await byFid.count()) await byFid.check();
  else await world.page.locator(`label:has-text("${what}") input[type=checkbox]`).check();
});

// Nút bấm theo chữ (không gồm "Đăng xuất" vì đã có bước riêng)
When(/^tôi bấm "(?!Đăng xuất")([^"]+)"$/, async ({ world }, label: string) => {
  await waitToastGone(world.page);
  await world.page.locator('button', { hasText: exact(label) }).first().click();
});

Then(/^màn "([^"]+)" không có nút "([^"]+)"$/, async ({ world }, screen: string, label: string) => {
  await world.ui();
  await nav(world.page, screen);
  await expect(world.page.locator(SEL.pageTitle)).toHaveText(screen);
  await expect(world.page.locator('main button', { hasText: exact(label) })).toHaveCount(0);
});

Then(/^không có nút "([^"]+)"$/, async ({ world }, label: string) => {
  const scope = world.vars.scope ? world.page.locator(world.vars.scope) : world.page.locator('main');
  await expect(scope.locator('button', { hasText: exact(label) })).toHaveCount(0);
});

Then(/^nút "([^"]+)" (bị vô hiệu hóa|được bật)$/, async ({ world }, label: string, st: string) => {
  const b = world.page.locator(SEL.overlayDialog).locator('button', { hasText: exact(label) });
  if (st === 'bị vô hiệu hóa') await expect(b).toBeDisabled(); else await expect(b).toBeEnabled();
});

Then('popup đóng lại', async ({ world }) => { await expect(world.page.locator(SEL.overlayDialog)).toHaveCount(0); });

export { exact };
