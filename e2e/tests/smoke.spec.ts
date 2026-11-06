import { test, expect } from '@playwright/test';
import { ACCOUNTS, SCREENS, apiLogin, apiState, gotoLogin, nav, uiLogin, uiLoginAs, uiLogout } from '../helpers/app';

/**
 * Bộ smoke @smoke – chỉ đọc, chạy được cả trên bản online (đặc tả mục 2.7):
 * sức khỏe máy chủ, đăng nhập 3 vai trò, /api/state theo bảng 4.2, quyền xem PDF, mở từng màn hình.
 */
test.describe('@smoke sức khỏe và đăng nhập', () => {
  test('GET /api/public/summary trả 200 và đủ trường', async ({ request }) => {
    const r = await request.get('/api/public/summary');
    expect(r.status()).toBe(200);
    const j = await r.json();
    for (const k of ['low', 'pending', 'total', 'warehouses']) expect(typeof j[k], k).toBe('number');
  });

  test('trang chủ hiện trước, bấm Đăng nhập thì vào form', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('#home')).toBeVisible();
    await gotoLogin(page);
    await expect(page.locator('[data-fid="login-user"]')).toBeEditable();
    await expect(page.locator('.rolecard')).toHaveCount(3);
  });

  test('BR-01/02/03: SĐT sai, mật khẩu sai, tài khoản khóa/nháp đều bị từ chối', async ({ page }) => {
    await gotoLogin(page);
    expect(await uiLogin(page, '0123', '123456')).toContain('Số điện thoại không hợp lệ');
    expect(await uiLogin(page, ACCOUNTS.manager.phone, 'sai-mat-khau')).toBe('Sai số điện thoại hoặc mật khẩu.');
    expect(await uiLogin(page, ACCOUNTS.locked.phone, ACCOUNTS.locked.pass)).toContain('đã bị khóa');
    expect(await uiLogin(page, ACCOUNTS.draft.phone, ACCOUNTS.draft.pass)).toContain('chưa được kích hoạt');
  });

  for (const role of ['admin', 'manager', 'staff'] as const) {
    test(`đăng nhập ${role}: vào Tổng quan, menu đúng vai trò`, async ({ page }) => {
      await gotoLogin(page);
      await uiLoginAs(page, role);
      await expect(page.locator('main h1')).toHaveText('Tổng quan');
      const menu = await page.locator('aside button.nav').allInnerTexts();
      expect(menu.some((m) => m.includes('Người dùng'))).toBe(role === 'admin');
      await expect(page.locator('main')).toContainText(ACCOUNTS[role].name);
      await uiLogout(page);
      const me = await page.request.get('/api/auth/me').then((r) => r.json());
      expect(me.user).toBeNull();
    });
  }
});

test.describe('@smoke phân quyền dữ liệu (bảng 4.2)', () => {
  test('staff: liên hệ đối tác, SĐT kho/người dùng và hồ sơ đều bị lược ở máy chủ', async ({ request }) => {
    await apiLogin(request, 'staff');
    const s = await apiState(request);
    expect(s.me.role).toBe('staff');
    for (const p of [...s.suppliers, ...s.customers]) { expect(p.phone).toBe(''); expect(p.email).toBe(''); }
    expect(s.files).toEqual([]);
    for (const u of s.users) expect(u.phone).toBeNull();
    for (const w of s.warehouses) expect(w.phone).toBeNull();
    // địa chỉ và ghi chú KHÔNG bị ẩn
    expect(s.suppliers.some((p: any) => p.address)).toBe(true);
  });

  test('manager: ẩn NCC, thấy khách hàng', async ({ request }) => {
    await apiLogin(request, 'manager');
    const s = await apiState(request);
    for (const p of s.suppliers) { expect(p.phone).toBe(''); expect(p.email).toBe(''); }
    expect(s.customers.some((p: any) => p.phone !== '')).toBe(true);
    for (const f of s.files) expect(f.partnerId).toMatch(/^KH-/);
    for (const w of s.warehouses) expect(w.phone).not.toBeNull();
  });

  test('admin: thấy đủ; hideContact gửi kèm để giao diện dùng', async ({ request }) => {
    await apiLogin(request, 'admin');
    const s = await apiState(request);
    expect(s.suppliers.some((p: any) => p.phone !== '')).toBe(true);
    expect(s.files.some((f: any) => f.partnerId.startsWith('NCC-'))).toBe(true);
    expect(s.hideContact).toEqual({ sup: expect.arrayContaining(['manager', 'staff']), cus: ['staff'], wh: ['staff'] });
  });

  test('quyền xem PDF: admin 200, manager 403 với NCC / 200 với KH, staff 403, chưa đăng nhập 401', async ({ playwright, baseURL }) => {
    const admin = await playwright.request.newContext({ baseURL });
    await apiLogin(admin, 'admin');
    const files = (await apiState(admin)).files as { id: string; partnerId: string }[];
    const ncc = files.find((f) => f.partnerId.startsWith('NCC-'))!;
    const kh = files.find((f) => f.partnerId.startsWith('KH-'))!;
    const a = await admin.get('/api/files/' + ncc.id);
    expect(a.status()).toBe(200);
    expect(a.headers()['content-type']).toContain('application/pdf');
    expect((await a.body()).subarray(0, 4).toString()).toBe('%PDF');

    const manager = await playwright.request.newContext({ baseURL });
    await apiLogin(manager, 'manager');
    expect((await manager.get('/api/files/' + ncc.id)).status()).toBe(403);
    expect((await manager.get('/api/files/' + kh.id)).status()).toBe(200);

    const staff = await playwright.request.newContext({ baseURL });
    await apiLogin(staff, 'staff');
    expect((await staff.get('/api/files/' + ncc.id)).status()).toBe(403);
    expect((await staff.get('/api/files/' + kh.id)).status()).toBe(403);

    const anon = await playwright.request.newContext({ baseURL });
    expect((await anon.get('/api/files/' + kh.id)).status()).toBe(401);
    expect((await anon.get('/api/state')).status()).toBe(401);
    for (const c of [admin, manager, staff, anon]) await c.dispose();
  });

  test('API 403 cho staff ở các thao tác quản lý; 404 JSON cho đường dẫn lạ', async ({ request }) => {
    await apiLogin(request, 'staff');
    expect((await request.post('/api/receipts/PN-0002/approve')).status()).toBe(403);
    expect((await request.post('/api/stocktakes', { data: { warehouseId: 'HN', rows: [] } })).status()).toBe(403);
    expect((await request.post('/api/products', { data: {} })).status()).toBe(403);
    expect((await request.post('/api/warehouses', { data: {} })).status()).toBe(403);
    expect((await request.post('/api/users', { data: {} })).status()).toBe(403);
    const nf = await request.get('/api/khong-ton-tai');
    expect(nf.status()).toBe(404);
    expect((await nf.json()).error).toBeTruthy();
  });
});

test.describe('@smoke mở từng màn hình', () => {
  test('admin mở được 12 màn hình, tiêu đề đúng, không lỗi JS', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await gotoLogin(page);
    await uiLoginAs(page, 'admin');
    for (const s of SCREENS) {
      await nav(page, s);
      await expect(page.locator('main h1')).toHaveText(s);
    }
    expect(errors).toEqual([]);
  });
});
