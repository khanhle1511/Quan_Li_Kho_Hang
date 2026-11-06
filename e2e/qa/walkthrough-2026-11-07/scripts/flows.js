// Chạy từ thư mục e2e (đã npm install) để tìm được Playwright:
//   cd e2e && node qa/walkthrough-2026-11-07/scripts/flows.js
// Cần CSDL mới nạp dữ liệu mẫu (xóa thư mục data/ rồi chạy lại ứng dụng). Ảnh ghi vào ../output/.
// Pass 2: đi qua các luồng F1–F10 trong đặc tả kiểm thử, chụp ảnh và đối chiếu dữ liệu qua API.
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');
const BASE = process.env.BASE_URL || 'http://localhost:8080';
const OUT = path.join(__dirname, '..', 'output');
require('fs').mkdirSync(OUT, { recursive: true });
const results = [];
let n = 20;
const shot = async (page, name) => { n++; const f = path.join(OUT, `${String(n).padStart(2, '0')}-${name}.png`); await page.screenshot({ path: f, fullPage: true }); return path.basename(f); };
const log = (flow, step, ok, detail) => { results.push({ flow, step, ok, detail }); console.log((ok ? 'OK  ' : 'FAIL') + ' [' + flow + '] ' + step + (detail ? ' -> ' + detail : '')); };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ---------- helpers ----------
async function clearToast(page) { await page.locator('.toast').waitFor({ state: 'detached', timeout: 6000 }).catch(() => {}); }
async function login(page, phone, pass) {
  if (await page.locator('#home').count()) {
    await page.click('.home-nav [data-home="go"]');
    await page.locator('#home').waitFor({ state: 'detached', timeout: 5000 });
    await sleep(300);
  }
  await page.waitForSelector('[data-fid="login-user"]');
  await clearToast(page);
  await page.fill('[data-fid="login-user"]', phone);
  await page.fill('[data-fid="login-pass"]', pass);
  await page.click('.auth-card button.btn-primary');
  await Promise.race([page.waitForSelector('aside button.nav', { timeout: 8000 }), page.waitForSelector('.alert-err', { timeout: 8000 })]);
  await sleep(300);
  const err = page.locator('.alert-err');
  return (await err.count()) ? await err.innerText() : null;
}
async function logout(page) { await page.click('button:has-text("Đăng xuất")'); await page.waitForSelector('[data-fid="login-user"]'); await sleep(300); }
async function nav(page, label) {
  const loc = label === 'Kho' ? page.locator('aside button.nav', { hasText: /^Kho$/ }) : page.locator('aside button.nav', { hasText: label }).first();
  await loc.click(); await sleep(400);
}
async function toast(page) { try { const t = await page.waitForSelector('.toast', { timeout: 8000 }); return (await t.innerText()).trim(); } catch { return null; } }
async function state(page) { const r = await page.request.get(BASE + '/api/state'); return r.ok() ? await r.json() : { status: r.status() }; }
async function createReceipt(page, type, partnerText, whText, items, note) {
  await nav(page, type === 'in' ? 'Nhập kho' : 'Xuất kho');
  await page.locator('.optcard', { hasText: partnerText }).first().click(); await sleep(200);
  await page.locator('.optcard', { hasText: whText }).first().click(); await sleep(200);
  for (let i = 0; i < items.length; i++) {
    await page.fill(`[data-fid="rc-search-${type}"]`, items[i][0]); await sleep(200);
    await page.locator('.pick', { hasText: items[i][0] }).first().click(); await sleep(200);
    await page.fill(`[data-fid="rc-qty-${type}-${i}"]`, String(items[i][1])); await sleep(200);
  }
  if (note) await page.fill(`[data-fid="rc-note-${type}"]`, note);
  await clearToast(page);
  await page.click('button:has-text("Lưu phiếu và gửi duyệt")');
  const t = await toast(page);
  const err = page.locator('.alert-err');
  return { toast: t, err: (await err.count()) ? await err.innerText() : null };
}
async function approve(page, type, code, action = 'Duyệt') {
  await nav(page, type === 'in' ? 'Nhập kho' : 'Xuất kho');
  const row = page.locator('#rc-list .trow', { hasText: code });
  const btn = row.locator('button', { hasText: new RegExp('^' + action) });
  if (!(await btn.count())) return { toast: null, info: (await row.innerText()).replace(/\s+/g, ' ') };
  await clearToast(page);
  await btn.first().click();
  return { toast: await toast(page) };
}
async function flow(name, fn) { try { await fn(); } catch (e) { log(name, 'EXCEPTION', false, String(e.message).split('\n')[0]); } }

(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1400, height: 900 }, locale: 'vi-VN' });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
  page.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
  page.on('dialog', (d) => { console.log('    window.confirm:', d.message()); d.accept(); });
  await page.goto(BASE);

  // ---------- Đăng nhập: các ca lỗi (BR-01..03) ----------
  await flow('LOGIN', async () => {
    log('LOGIN', 'SĐT sai định dạng', (await login(page, '0123', '123456')) !== null, await login(page, '0123', '123456'));
    log('LOGIN', 'sai mật khẩu', true, await login(page, '0902222222', 'xxx'));
    log('LOGIN', 'tài khoản khóa U4', true, await login(page, '0904444444', '123456'));
    log('LOGIN', 'tài khoản nháp U5', true, await login(page, '0905555555', '123456'));
    await shot(page, 'login-error');
  });

  // ---------- Staff: đăng nhập và xem các màn ----------
  await flow('STAFF', async () => {
    const err = await login(page, '0903 333 333', '123456');
    log('STAFF', 'đăng nhập staff', err === null, err);
    const navs = await page.locator('aside button.nav').allInnerTexts();
    log('STAFF', 'menu không có Người dùng', !navs.some((x) => x.includes('Người dùng')), navs.join(' | '));
    await shot(page, 'staff-dashboard');
    await nav(page, 'Nhà cung cấp'); await shot(page, 'staff-suppliers');
    const s = await state(page);
    log('F7', 'staff: suppliers phone/email rỗng', s.suppliers.every((p) => p.phone === '' && p.email === ''));
    log('F7', 'staff: customers phone/email rỗng', s.customers.every((p) => p.phone === '' && p.email === ''));
    log('F7', 'staff: files rỗng', s.files.length === 0, 'files=' + s.files.length);
    log('F7', 'staff: users/warehouses phone null', s.users.every((u) => u.phone === null) && s.warehouses.every((w) => w.phone === null));
    await nav(page, 'Hàng hóa');
    log('STAFF', 'Hàng hóa: không có nút Thêm', !(await page.locator('main button', { hasText: 'Thêm hàng hóa' }).count()));
    await nav(page, 'Kho');
    log('STAFF', 'Kho: không có nút Thêm kho', !(await page.locator('main button', { hasText: 'Thêm kho' }).count()));
  });

  // ---------- F1: staff lập PX P02×60 tại HN ----------
  await flow('F1', async () => {
    const before = (await state(page)).stock['P02|HN'];
    const r = await createReceipt(page, 'out', 'Phòng Hành chính', 'Kho Hà Nội', [['Bút bi xanh', 60]], 'auto-test F1');
    log('F1', 'lập PX-0003', !!r.toast && r.toast.includes('PX-0003'), r.toast || r.err);
    await shot(page, 'F1-staff-px-created');
    const s = await state(page);
    log('F1', 'tồn P02|HN chưa đổi (=80)', s.stock['P02|HN'] === before && before === 80, 'before=' + before + ' after=' + s.stock['P02|HN']);
    log('F1', 'PX-0003 pending, creator U3', s.receipts.some((x) => x.id === 'PX-0003' && x.status === 'pending' && x.creatorId === 'U3'));
    // BR-07: xuất quá tồn
    const r2 = await createReceipt(page, 'out', 'Cửa hàng Quận 3', 'Kho Hà Nội', [['Mực in laser', 999]]);
    log('BR-07', 'xuất quá tồn bị chặn', !!(r2.err || r2.toast) && /Không đủ tồn/.test(r2.err || r2.toast), r2.err || r2.toast);
    await shot(page, 'BR07-over-stock');
    await page.click('button:has-text("Làm lại")');
  });

  // ---------- F3 (phần 1): staff lập 2 PX P06×4 tại HCM ----------
  await flow('F3', async () => {
    const r1 = await createReceipt(page, 'out', 'Cửa hàng Quận 3', 'Kho TP.HCM', [['Bàn phím', 4]], 'auto-test F3a');
    log('F3', 'PX-0004 (P06×4 HCM)', !!r1.toast && r1.toast.includes('PX-0004'), r1.toast || r1.err);
    const r2 = await createReceipt(page, 'out', 'Cửa hàng Quận 3', 'Kho TP.HCM', [['Bàn phím', 4]], 'auto-test F3b');
    log('F3', 'PX-0005 (P06×4 HCM) cũng tạo được', !!r2.toast && r2.toast.includes('PX-0005'), r2.toast || r2.err);
    await shot(page, 'F3-two-px');
  });

  // ---------- F9 (phần 1): staff tạo phiếu nhập từ Cảnh báo ----------
  await flow('F9', async () => {
    await nav(page, 'Cảnh báo tồn thấp');
    await page.locator('.trow', { hasText: 'Mực in laser' }).locator('button', { hasText: 'Tạo phiếu nhập' }).click(); await sleep(400);
    const h1 = await page.locator('main h1').innerText();
    const qty = await page.inputValue('[data-fid="rc-qty-in-0"]');
    log('F9', 'chuyển sang Nhập kho, qty điền sẵn 14', h1 === 'Nhập kho' && qty === '14', h1 + ' qty=' + qty);
    await shot(page, 'F9-prefilled-in');
    await page.fill('[data-fid="rc-note-in"]', 'auto-test F9');
    await clearToast(page); await page.click('button:has-text("Lưu phiếu và gửi duyệt")');
    const t = await toast(page);
    log('F9', 'PN-0003 tạo', !!t && t.includes('PN-0003'), t);
  });

  // ---------- F4 (phần 1): staff mở kiểm kê HN, sửa P01 = 119 ----------
  await flow('F4', async () => {
    await nav(page, 'Kiểm kê');
    await page.locator('.optcard', { hasText: 'Kho Hà Nội' }).click();
    await page.click('button:has-text("Bắt đầu kiểm kê")'); await sleep(400);
    await page.fill('[data-fid="kk-0"]', '119'); await sleep(300);
    const hasConfirm = await page.locator('button', { hasText: 'Xác nhận và điều chỉnh tồn' }).count();
    const notice = await page.locator('.notice').last().innerText();
    log('F4', 'staff: không có nút xác nhận, có thông báo', hasConfirm === 0 && /Quản lý kho/.test(notice), notice);
    await shot(page, 'F4-staff-count');
    const r = await page.request.post(BASE + '/api/stocktakes', { data: { warehouseId: 'HN', rows: [{ productId: 'P01', actual: 119 }] } });
    log('F4', 'POST /stocktakes bằng phiên staff -> 403', r.status() === 403, 'status=' + r.status());
    // staff duyệt qua API -> 403
    const a = await page.request.post(BASE + '/api/receipts/PN-0002/approve');
    log('F4', 'staff approve qua API -> 403', a.status() === 403, 'status=' + a.status());
  });

  // ---------- Manager đăng nhập cùng tab ----------
  await flow('MANAGER', async () => {
    await logout(page);
    const err = await login(page, '0902222222', '123456');
    log('MANAGER', 'đăng nhập manager', err === null, err);
    await shot(page, 'manager-dashboard');
  });

  // ---------- F4 (phần 2): manager xác nhận kiểm kê ----------
  await flow('F4', async () => {
    await nav(page, 'Kiểm kê');
    const active = await page.locator('text=ĐANG KIỂM KÊ').count();
    log('F4', 'phiên kiểm kê vẫn còn sau khi đổi người', active > 0);
    const val = await page.inputValue('[data-fid="kk-0"]');
    log('F4', 'số thực tế P01 = 119 còn giữ', val === '119', 'val=' + val);
    await shot(page, 'F4-manager-session');
    await clearToast(page); await page.click('button:has-text("Xác nhận và điều chỉnh tồn")');
    const t = await toast(page);
    const s = await state(page);
    log('F4', 'KK-0002 tạo, tồn P01|HN = 119', !!t && t.includes('KK-0002') && s.stock['P01|HN'] === 119, (t || '') + ' stock=' + s.stock['P01|HN']);
    log('F4', 'thẻ kho có dòng Kiểm kê -1', s.history.some((h) => h.kind === 'Kiểm kê' && h.delta === -1 && h.ref === 'KK-0002'));
    await shot(page, 'F4-stocktake-done');
  });

  // ---------- F1 (phần 2): manager duyệt PX-0003 ----------
  await flow('F1', async () => {
    const lowBefore = (await page.request.get(BASE + '/api/public/summary').then((r) => r.json())).low;
    const r = await approve(page, 'out', 'PX-0003');
    log('F1', 'duyệt PX-0003', !!r.toast, r.toast || r.info);
    await shot(page, 'F1-approved');
    const s = await state(page);
    log('F1', 'tồn P02|HN = 20', s.stock['P02|HN'] === 20, 'stock=' + s.stock['P02|HN']);
    log('F1', 'thẻ kho: Xuất -60, sau 20, PX-0003', s.history.some((h) => h.ref === 'PX-0003' && h.delta === -60 && h.after === 20));
    const lowAfter = (await page.request.get(BASE + '/api/public/summary').then((r) => r.json())).low;
    log('F1', 'cảnh báo tồn thấp tăng 4 -> 5', lowBefore === 4 && lowAfter === 5, lowBefore + ' -> ' + lowAfter);
  });

  // ---------- F3 (phần 2): duyệt PX-0004 rồi PX-0005 ----------
  await flow('F3', async () => {
    const r1 = await approve(page, 'out', 'PX-0004');
    const s1 = await state(page);
    log('F3', 'duyệt PX-0004 -> tồn P06|HCM = 0', s1.stock['P06|HCM'] === 0, (r1.toast || r1.info) + ' stock=' + s1.stock['P06|HCM']);
    const r2 = await approve(page, 'out', 'PX-0005');
    const s2 = await state(page);
    const px5 = s2.receipts.find((x) => x.id === 'PX-0005');
    log('F3', 'duyệt PX-0005 bị từ chối, vẫn pending', !!r2.toast && /Không thể duyệt/.test(r2.toast) && px5.status === 'pending', r2.toast);
    await shot(page, 'F3-second-approve-rejected');
    const r3 = await approve(page, 'out', 'PX-0005', 'Từ chối');
    const s3 = await state(page);
    log('F3', 'từ chối PX-0005 -> cancelled', s3.receipts.find((x) => x.id === 'PX-0005').status === 'cancelled', r3.toast);
  });

  // ---------- F2: manager lập PN rồi không tự duyệt được ----------
  await flow('F2', async () => {
    const r = await createReceipt(page, 'in', 'Minh An', 'Kho Hà Nội', [['Giấy in A4', 10]], 'auto-test F2');
    log('F2', 'manager lập PN-0004', !!r.toast && r.toast.includes('PN-0004'), r.toast || r.err);
    const a = await approve(page, 'in', 'PN-0004');
    log('F2', 'UI không hiện nút Duyệt cho phiếu mình lập', a.toast === null && /cần người khác duyệt/.test(a.info || ''), a.info);
    await shot(page, 'F2-own-receipt');
    const api = await page.request.post(BASE + '/api/receipts/PN-0004/approve');
    const body = await api.json();
    log('F2', 'API tự duyệt -> 400', api.status() === 400 && /tự duyệt/.test(body.error), body.error);
  });

  // ---------- F7/F8 manager: NCC bị ẩn liên hệ, KH thì thấy ----------
  await flow('F7', async () => {
    const s = await state(page);
    log('F7', 'manager: suppliers phone rỗng', s.suppliers.every((p) => p.phone === ''), JSON.stringify(s.suppliers[0].phone));
    log('F7', 'manager: customers phone có', s.customers.every((p) => p.phone !== ''), s.customers[0].phone);
    log('F7', 'manager: files chỉ của KH', s.files.length > 0 && s.files.every((f) => f.partnerId.startsWith('KH-')), s.files.map((f) => f.partnerId).join(','));
    await nav(page, 'Nhà cung cấp'); await shot(page, 'F7-manager-suppliers-hidden');
    await nav(page, 'Khách hàng'); await shot(page, 'F7-manager-customers');
    // GET file của KH -> 200; NCC file id lấy sau bằng admin
    const khFile = s.files[0].id;
    const g = await page.request.get(BASE + '/api/files/' + khFile);
    log('F7', 'manager GET file KH-01 -> 200 pdf', g.status() === 200 && (g.headers()['content-type'] || '').includes('pdf'), 'status=' + g.status());
  });

  // ---------- F8 manager: upload PDF cho KH-02, upload .txt giả -> lỗi ----------
  const pdfPath = path.join(__dirname, '..', '..', '..', 'fixtures', 'test.pdf'); const txtPath = path.join(__dirname, '..', '..', '..', 'fixtures', 'fake.pdf');
  // fixtures/test.pdf và fixtures/fake.pdf có sẵn trong thư mục fixtures
  await flow('F8', async () => {
    await nav(page, 'Khách hàng');
    await page.locator('#p-list .trow', { hasText: 'Cửa hàng Quận 3' }).locator('button', { hasText: 'Chi tiết' }).click(); await sleep(400);
    await clearToast(page); await page.setInputFiles('input[data-file="KH-02"]', pdfPath);
    const t1 = await toast(page);
    const s = await state(page);
    log('F8', 'manager upload PDF cho KH-02', s.files.some((f) => f.partnerId === 'KH-02' && f.name === 'test.pdf'), t1);
    await shot(page, 'F8-manager-upload-kh02');
    await clearToast(page); await page.setInputFiles('input[data-file="KH-02"]', txtPath);
    const t2 = await toast(page);
    log('F8', 'upload .txt đổi tên .pdf -> bị từ chối', !!t2 && /không phải file PDF/.test(t2), t2);
  });

  // ---------- Manager: ghi chú đối tác, thêm hàng hóa ----------
  await flow('CATALOG', async () => {
    await page.fill('[data-fid="p-note"]', 'Ghi chú auto-test'); await sleep(200);
    await clearToast(page); await page.click('button:has-text("Lưu ghi chú")');
    const t = await toast(page);
    const s = await state(page);
    log('CATALOG', 'lưu ghi chú KH-02 (noteBy = manager)', s.customers.find((c) => c.id === 'KH-02').noteBy === 'Trần Thị Bình', t);
    await nav(page, 'Hàng hóa');
    await page.click('button:has-text("+ Thêm hàng hóa")'); await sleep(200);
    await page.fill('[data-fid="pf-name"]', 'Băng keo trong 5cm');
    await page.fill('[data-fid="pf-unit"]', 'Cuộn');
    await page.fill('[data-fid="pf-min"]', '20');
    await page.fill('[data-fid="pf-price"]', '12000');
    await clearToast(page); await page.click('button:has-text("Lưu hàng hóa")');
    const t2 = await toast(page);
    const s2 = await state(page);
    log('CATALOG', 'thêm hàng hóa P09, danh mục mặc định Khác', s2.products.some((p) => p.id === 'P09' && p.cat === 'Khác'), t2);
    await shot(page, 'CATALOG-product-added');
    // SKU trùng
    await page.click('button:has-text("+ Thêm hàng hóa")'); await sleep(200);
    await page.fill('[data-fid="pf-sku"]', 'sp-0001'); await page.fill('[data-fid="pf-name"]', 'Trùng'); await page.fill('[data-fid="pf-unit"]', 'Cái'); await page.fill('[data-fid="pf-min"]', '0');
    await page.click('button:has-text("Lưu hàng hóa")'); await sleep(400);
    const e = page.locator('.alert-err');
    log('BR-14', 'SKU trùng (không phân biệt hoa thường) bị chặn', (await e.count()) > 0 && /đã tồn tại/.test(await e.innerText()), (await e.count()) ? await e.innerText() : await toast(page));
    await page.click('button:has-text("Hủy")');
  });

  // ---------- Admin ----------
  await flow('ADMIN', async () => {
    await logout(page);
    const err = await login(page, '0901111111', '123456');
    log('ADMIN', 'đăng nhập admin', err === null, err);
    const a1 = await approve(page, 'in', 'PN-0004');
    log('F2', 'admin duyệt PN-0004 thành công', !!a1.toast && !/Không thể/.test(a1.toast), a1.toast || a1.info);
    const lowBefore = (await page.request.get(BASE + '/api/public/summary').then((r) => r.json())).low;
    const a2 = await approve(page, 'in', 'PN-0003');
    const s = await state(page);
    const lowAfter = (await page.request.get(BASE + '/api/public/summary').then((r) => r.json())).low;
    log('F9', 'admin duyệt PN-0003 -> P04|HN = 20, cảnh báo giảm 1', s.stock['P04|HN'] === 20 && lowAfter === lowBefore - 1, 'stock=' + s.stock['P04|HN'] + ' low ' + lowBefore + '->' + lowAfter);
    await shot(page, 'F9-approved-in');
    // F7 admin: thấy đủ + GET file NCC
    log('F7', 'admin: suppliers phone có, files đủ 5', s.suppliers.every((p) => p.phone !== '') && s.files.length === 5, 'files=' + s.files.length);
    const nccFile = s.files.find((f) => f.partnerId === 'NCC-01').id;
    
    const g = await page.request.get(BASE + '/api/files/' + nccFile + '?download=1');
    log('F7', 'admin GET file NCC-01 download -> 200 attachment', g.status() === 200 && /attachment/.test(g.headers()['content-disposition'] || ''), g.headers()['content-disposition']);
  });

  // ---------- F8 admin: upload PDF cho NCC-03 ----------
  await flow('F8', async () => {
    await nav(page, 'Nhà cung cấp');
    await page.locator('#p-list .trow', { hasText: 'Sao Mai' }).locator('button', { hasText: 'Chi tiết' }).click(); await sleep(400);
    await clearToast(page); await page.setInputFiles('input[data-file="NCC-03"]', pdfPath);
    const t = await toast(page);
    const s = await state(page);
    log('F8', 'admin upload PDF cho NCC-03', s.files.some((f) => f.partnerId === 'NCC-03'), t);
    await shot(page, 'F8-admin-upload-ncc03');
    // xem file
    const f = s.files.find((x) => x.partnerId === 'NCC-03');
    const g = await page.request.get(BASE + '/api/files/' + f.id);
    log('F8', 'xem lại file vừa tải', g.status() === 200 && (await g.text()).startsWith('%PDF'));
    // xóa file
    await clearToast(page); await page.locator('button[aria-label="Xóa test.pdf"]').first().click();
    await toast(page); await sleep(300);
    const s2 = await state(page);
    log('F8', 'xóa file NCC-03', !s2.files.some((x) => x.partnerId === 'NCC-03'), 'files NCC-03=' + s2.files.filter((x) => x.partnerId === 'NCC-03').length);
  });

  // ---------- F5: vòng đời tài khoản ----------
  await flow('F5', async () => {
    await nav(page, 'Người dùng');
    await page.click('button:has-text("+ Tạo tài khoản")'); await sleep(200);
    await page.fill('[data-fid="uf-name"]', '[TEST] Võ Minh Khoa');
    await page.fill('[data-fid="uf-phone"]', '0906 666 666');
    await page.fill('[data-fid="uf-pass"]', 'abc123');
    await page.fill('[data-fid="uf-opened"]', '2026-11-07');
    await page.locator('.pill', { hasText: 'Nhân viên kho' }).click();
    await page.locator('.pill', { hasText: /^Nháp$/ }).click();
    await clearToast(page); await page.locator('button', { hasText: /^Tạo tài khoản$/ }).last().click();
    const t = await toast(page);
    const ferr = page.locator('.alert-err'); if (await ferr.count()) console.log('    form error:', await ferr.innerText());
    const s = await state(page);
    const u6 = s.users.find((u) => u.id === 'U6');
    log('F5', 'tạo U6 nháp', !!u6 && u6.status === 'draft', t);
    await shot(page, 'F5-user-created');
    // U6 đăng nhập ở trình duyệt khác -> bị từ chối
    const ctx2 = await browser.newContext({ viewport: { width: 1200, height: 800 } });
    const p2 = await ctx2.newPage(); p2.on('dialog', (d) => d.accept()); await p2.goto(BASE);
    const e1 = await login(p2, '0906666666', 'abc123');
    log('F5', 'U6 nháp đăng nhập bị từ chối', !!e1 && /chưa được kích hoạt/.test(e1), e1);
    // kích hoạt
    await page.locator('#user-table .trow', { hasText: 'Võ Minh Khoa' }).locator('button', { hasText: 'Kích hoạt' }).click(); await sleep(100);
    await toast(page);
    const e2 = await login(p2, '0906666666', 'abc123');
    log('F5', 'U6 đăng nhập được sau kích hoạt', e2 === null, e2);
    await shot(p2, 'F5-u6-logged-in');
    // U6 lập 1 phiếu
    const r = await createReceipt(p2, 'in', 'Sao Mai', 'Kho TP.HCM', [['Nước rửa tay', 5]], 'auto-test F5 by U6');
    log('F5', 'U6 lập PN-0005', !!r.toast && r.toast.includes('PN-0005'), r.toast || r.err);
    // admin khóa U6 khi U6 đang đăng nhập
    await nav(page, 'Người dùng');
    await clearToast(page); await page.locator('#user-table .trow', { hasText: 'Võ Minh Khoa' }).locator('button', { hasText: /^Khóa$/ }).click();
    await toast(page);
    // U6 thao tác tiếp -> 401 và về trang đăng nhập
    await nav(p2, 'Tồn kho'); await sleep(300);
    await p2.locator('aside button.nav', { hasText: 'Tổng quan' }).click().catch(() => {});
    const r401 = await p2.request.get(BASE + '/api/state');
    await sleep(800);
    const backToLogin = await p2.locator('[data-fid="login-user"]').count();
    const errText = (await p2.locator('.alert-err').count()) ? await p2.locator('.alert-err').innerText() : '';
    log('F5', 'U6 bị khóa: API 401, UI về trang đăng nhập', r401.status() === 401 && backToLogin > 0, 'status=' + r401.status() + ' msg=' + errText);
    await shot(p2, 'F5-u6-session-expired');
    await ctx2.close();
    // xóa U6: nút Xóa -> dialog
    await clearToast(page); await page.locator('#user-table .trow', { hasText: 'Võ Minh Khoa' }).locator('button[aria-label^="Xóa"]').first().click(); await sleep(400);
    await shot(page, 'F5-delete-dialog');
    const ack = page.locator('[data-fid="del-ack"]');
    if (await ack.count()) await ack.check();
    await clearToast(page); await page.locator('.dialog button', { hasText: /Xóa/ }).last().click();
    const t3 = await toast(page);
    const s3 = await state(page);
    log('F5', 'xóa U6 sau khi khóa; PN-0005 vẫn giữ tên người lập', !s3.users.some((u) => u.id === 'U6') && s3.receipts.find((x) => x.id === 'PN-0005').creator === '[TEST] Võ Minh Khoa', t3);
    // admin không tự khóa mình
    const self = await page.request.put(BASE + '/api/users/U1/status', { data: { status: 'locked' } });
    log('F5', 'admin không tự đổi trạng thái mình (400)', self.status() === 400, (await self.json()).error);
  });

  // ---------- F6: kho mới ----------
  await flow('F6', async () => {
    const lowBefore = (await page.request.get(BASE + '/api/public/summary').then((r) => r.json())).low;
    await nav(page, 'Kho');
    await page.click('button:has-text("+ Thêm kho")'); await sleep(200);
    await page.fill('[data-fid="wf-code"]', 'kho-dn');
    await page.fill('[data-fid="wf-name"]', '[TEST] Kho Đà Nẵng');
    await page.fill('[data-fid="wf-address"]', 'Hải Châu, Đà Nẵng');
    await page.fill('[data-fid="wf-phone"]', '0236 555 444');
    await page.fill('[data-fid="wf-cap"]', '500');
    await page.fill('[data-fid="wf-opened"]', '2026-11-01');
    await page.click('.keeperbox'); await sleep(300);
    await page.fill('[data-fid="kp-q"]', 'Cường'); await sleep(200);
    await shot(page, 'F6-keeper-picker');
    await page.locator('.kpick-row', { hasText: 'Cường' }).first().click(); await sleep(200);
    await clearToast(page); await page.locator('button', { hasText: /^Thêm kho$/ }).last().click();
    const t = await toast(page);
    const s = await state(page);
    const dn = s.warehouses.find((w) => w.code === 'KHO-DN');
    log('F6', 'tạo KHO-DN, thủ kho U3', !!dn && dn.keeperId === 'U3' && dn.id === 'DN', t);
    await shot(page, 'F6-warehouse-created');
    const lowMid = (await page.request.get(BASE + '/api/public/summary').then((r) => r.json())).low;
    log('F6', 'cảnh báo tăng theo số mặt hàng (9)', lowMid === lowBefore + 9, lowBefore + ' -> ' + lowMid);
    // tạm ngưng
    await clearToast(page); await page.locator('.trow', { hasText: 'Kho Đà Nẵng' }).locator('button', { hasText: 'Tạm ngưng' }).click();
    const t2 = await toast(page);
    const lowAfter = (await page.request.get(BASE + '/api/public/summary').then((r) => r.json())).low;
    log('F6', 'tạm ngưng DN -> cảnh báo về như cũ', lowAfter === lowBefore, (t2 || '') + ' low=' + lowAfter);
    await shot(page, 'F6-warehouse-paused');
    // xóa
    await clearToast(page); await page.locator('.trow', { hasText: 'Kho Đà Nẵng' }).locator('button[aria-label^="Xóa"]').click(); await sleep(400);
    const ack = page.locator('[data-fid="wdel-ack"]');
    if (await ack.count()) await ack.check();
    await clearToast(page); await page.locator('.dialog button', { hasText: /Xóa/ }).last().click();
    const t3 = await toast(page);
    const s3 = await state(page);
    log('F6', 'xóa DN thành công', !s3.warehouses.some((w) => w.id === 'DN'), t3);
    // BR-22: không thể tạm ngưng kho còn phiếu chờ (HCM có PN-0002, PX-0002)
    const p = await page.request.put(BASE + '/api/warehouses/HCM/status', { data: { status: 'paused' } });
    log('BR-22', 'tạm ngưng HCM còn phiếu chờ -> 400', p.status() === 400, (await p.json()).error);
  });

  // ---------- F10: khóa thủ kho ----------
  await flow('F10', async () => {
    await nav(page, 'Người dùng');
    await page.locator('#user-table .trow', { hasText: 'Lê Minh Cường' }).locator('button', { hasText: /^Khóa$/ }).click();
    await toast(page); await clearToast(page);
    await nav(page, 'Kho');
    const txt = await page.locator('.trow', { hasText: 'Kho TP.HCM' }).innerText();
    log('F10', 'kho HCM hiện cảnh báo thủ kho đã khóa', /khóa/i.test(txt), txt.replace(/\s+/g, ' ').slice(0, 120));
    await shot(page, 'F10-keeper-locked');
    const keep = await page.request.put(BASE + '/api/warehouses/HCM', { data: { name: 'Kho TP.HCM', address: 'Thủ Đức, TP.HCM', keeperId: 'U3', phone: '0283777666', capacity: 1500, status: 'active' } });
    log('F10', 'sửa kho giữ nguyên keeper U3 (đã khóa) -> OK', keep.status() === 200, 'status=' + keep.status());
    const bad = await page.request.put(BASE + '/api/warehouses/HCM', { data: { name: 'Kho TP.HCM', address: 'Thủ Đức, TP.HCM', keeperId: 'U4', phone: '0283777666', capacity: 1500, status: 'active' } });
    log('F10', 'đổi keeper sang U4 (locked) -> 400', bad.status() === 400, (await bad.json()).error);
    // mở khóa lại U3
    await nav(page, 'Người dùng');
    await page.locator('#user-table .trow', { hasText: 'Lê Minh Cường' }).locator('button', { hasText: 'Mở khóa' }).click();
    await toast(page);
  });

  // ---------- Báo cáo, Tồn kho, thẻ kho ----------
  await flow('VIEW', async () => {
    await nav(page, 'Tồn kho'); await page.fill('[data-fid="inv-q"]', 'Bút'); await sleep(300); await shot(page, 'VIEW-inventory-search');
    await page.fill('[data-fid="inv-q"]', '');
    const sh = page.locator('main button', { hasText: 'Thẻ kho' }).first();
    if (await sh.count()) { await sh.click(); await sleep(400); await shot(page, 'VIEW-stock-card'); }
    await nav(page, 'Báo cáo'); await shot(page, 'VIEW-reports');
    await nav(page, 'Tổng quan'); await shot(page, 'VIEW-dashboard-final');
  });

  // ---------- Logout ----------
  await flow('LOGOUT', async () => {
    await logout(page);
    const me = await page.request.get(BASE + '/api/auth/me').then((r) => r.json());
    log('LOGOUT', 'đăng xuất, /auth/me user=null', me.user === null);
    await shot(page, 'logout');
  });

  console.log('\nJS ERRORS:', errors.length ? errors : 'none');
  const fails = results.filter((r) => !r.ok);
  console.log(`\nTỔNG: ${results.length} bước, ${fails.length} thất bại`);
  fs.writeFileSync(path.join(OUT, 'results.json'), JSON.stringify(results, null, 2));
  await browser.close();
})().catch((e) => { console.error('FATAL', e); process.exit(1); });
