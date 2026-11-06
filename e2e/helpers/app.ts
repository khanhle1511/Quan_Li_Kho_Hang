import { expect, type APIRequestContext, type Page } from '@playwright/test';

/** Tài khoản demo (đặc tả mục 3). Trên bản online có thể đã đổi mật khẩu Admin → đọc từ biến môi trường. */
export const ACCOUNTS = {
  admin: { phone: process.env.ADMIN_PHONE ?? '0901111111', pass: process.env.ADMIN_PASS ?? '123456', name: 'Nguyễn Văn An' },
  manager: { phone: process.env.MANAGER_PHONE ?? '0902222222', pass: process.env.MANAGER_PASS ?? '123456', name: 'Trần Thị Bình' },
  staff: { phone: process.env.STAFF_PHONE ?? '0903333333', pass: process.env.STAFF_PASS ?? '123456', name: 'Lê Minh Cường' },
  locked: { phone: '0904444444', pass: '123456', name: 'Phạm Thu Dung' },
  draft: { phone: '0905555555', pass: '123456', name: 'Hoàng Gia Huy' },
} as const;
export type Role = 'admin' | 'manager' | 'staff';

/** Menu trái theo đúng thứ tự trên giao diện. "Người dùng" chỉ có với admin. */
export const SCREENS = ['Tổng quan', 'Nhập kho', 'Xuất kho', 'Kiểm kê', 'Tồn kho', 'Cảnh báo tồn thấp', 'Báo cáo', 'Hàng hóa', 'Nhà cung cấp', 'Khách hàng', 'Kho', 'Người dùng'];

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Rời trang chủ (nếu đang hiện) và chờ hiệu ứng chuyển cảnh kết thúc. Form đăng nhập đã nằm sẵn trong DOM nhưng bị inert. */
export async function gotoLogin(page: Page) {
  await page.goto('/');
  if (await page.locator('#home').count()) {
    await page.click('.home-nav [data-home="go"]');
    await page.locator('#home').waitFor({ state: 'detached', timeout: 5000 });
    await sleep(300);
  }
  await page.waitForSelector('[data-fid="login-user"]');
}

/** Đăng nhập trên giao diện. Trả về null nếu thành công, hoặc chuỗi lỗi hiển thị trong form. */
export async function uiLogin(page: Page, phone: string, pass: string): Promise<string | null> {
  if (!(await page.locator('[data-fid="login-user"]').count())) await gotoLogin(page);
  await waitToastGone(page);
  await page.fill('[data-fid="login-user"]', phone);   // form điền sẵn tài khoản manager → luôn ghi đè
  await page.fill('[data-fid="login-pass"]', pass);
  await page.click('.auth-card button.btn-primary');
  await Promise.race([
    page.waitForSelector('aside button.nav', { timeout: 10_000 }),
    page.waitForSelector('.alert-err', { timeout: 10_000 }),
  ]);
  await sleep(300);
  const err = page.locator('.alert-err');
  return (await err.count()) ? (await err.innerText()).trim() : null;
}

export async function uiLoginAs(page: Page, role: Role) {
  const err = await uiLogin(page, ACCOUNTS[role].phone, ACCOUNTS[role].pass);
  expect(err, 'đăng nhập ' + role).toBeNull();
}

export async function uiLogout(page: Page) {
  await page.click('button:has-text("Đăng xuất")');
  await page.waitForSelector('[data-fid="login-user"]');
}

/** Bấm mục menu trái. Chữ "Kho" trùng với "Nhập kho"… nên so khớp chính xác. */
export async function nav(page: Page, label: string) {
  const loc = label === 'Kho'
    ? page.locator('aside button.nav', { hasText: /^Kho$/ })
    : page.locator('aside button.nav', { hasText: label }).first();
  // Giao diện vẽ lại toàn bộ (sau khi tải state, toast chào…). Nếu cú bấm rơi đúng lúc vẽ lại thì màn hình không đổi
  // → kiểm tra mục menu đã thành aria-current="page", chưa thì bấm lại (hay gặp khi chạy nhiều worker, máy chủ chậm).
  for (let i = 1; ; i++) {
    await loc.click();
    try {
      await expect(loc).toHaveAttribute('aria-current', 'page', { timeout: 2000 });
      break;
    } catch (e) {
      if (i >= 3) throw e;
    }
  }
  await sleep(400);
}

/** Toast tồn tại ~4,2 giây. Phải đợi toast cũ biến mất trước thao tác mới, nếu không sẽ đọc nhầm thông báo cũ. */
export async function waitToastGone(page: Page) {
  await page.locator('.toast').waitFor({ state: 'detached', timeout: 6000 }).catch(() => {});
}

export async function readToast(page: Page): Promise<string | null> {
  try {
    const t = await page.waitForSelector('.toast', { timeout: 8000 });
    return (await t.innerText()).trim();
  } catch {
    return null;
  }
}

/** Đăng nhập qua API cho một request context riêng (giữ cookie phiên trong context đó). */
export async function apiLogin(request: APIRequestContext, role: Role | 'locked' | 'draft') {
  const a = ACCOUNTS[role];
  return request.post('/api/auth/login', { data: { phone: a.phone, password: a.pass } });
}

export async function apiState(request: APIRequestContext) {
  const r = await request.get('/api/state');
  expect(r.status(), 'GET /api/state').toBe(200);
  return r.json();
}
