import { Given, When, Then, expect, PDF_BYTES, FAKE_PDF_BYTES, type World } from './fixtures';
import { SEL } from '../helpers/selectors';
import { nav } from '../helpers/app';
import { hoverHp } from './auth.steps';

const PHONE_SHOWN = /0\d{3} \d{3} \d{3}|0\d{9}/;
const screenOf = (id: string) => (id.startsWith('NCC') ? 'Nhà cung cấp' : 'Khách hàng');
const pdfOfSize = (bytes: number) => Buffer.concat([PDF_BYTES(), Buffer.alloc(Math.max(0, bytes - PDF_BYTES().length), 0x20)]);
const findPartner = (st: any, id: string) => st.suppliers.concat(st.customers).find((x: any) => x.id === id);

async function openDetail(world: World, id: string) {
  await world.ui();
  if ((await world.page.locator(SEL.pageTitle).innerText()).trim() !== screenOf(id)) await nav(world.page, screenOf(id));
  await world.page.locator(SEL.pDetailBtn(id)).click();
  await expect(world.page.locator(SEL.pDetail)).toBeVisible();
}

// ================= Popup =================

When(/^tôi rê chuột lên "\[data-hp=([^\]]+)\]"$/, async ({ world }, id: string) => {
  await hoverHp(world.page, id);
});
Then(/^"#hpop" có "([^"]+)"$/, async ({ world }, text: string) => {
  await expect(world.page.locator(SEL.hpop)).toContainText(text);
});
Then(/^"#hpop" có "([^"]+)" và email$/, async ({ world }, text: string) => {
  const pop = world.page.locator(SEL.hpop);
  await expect(pop).toContainText(text);
  await expect(pop).toContainText('@');
});
Then(/^"#hpop" có số hồ sơ PDF$/, async ({ world }) => { await expect(world.page.locator(SEL.hpop)).toContainText(/\d+ hồ sơ PDF/); });
Then(/^"#hpop" có dòng "([^"]+)"$/, async ({ world }, text: string) => { await expect(world.page.locator(SEL.hpop)).toContainText(text); });
Then(/^"#hpop" không có SĐT và email$/, async ({ world }) => {
  const t = await world.page.locator(SEL.hpop).innerText();
  expect(t).not.toMatch(PHONE_SHOWN);
  expect(t).not.toContain('@');
});

// ================= Chi tiết =================

When(/^tôi mở chi tiết ((?:NCC|KH)-\d+)(?: và chọn tab "([^"]+)")?$/, async ({ world }, id: string, tab?: string) => {
  await openDetail(world, id);
  if (tab) await world.page.locator(SEL.pDetailTab, { hasText: tab }).click();
});

Then(/^tab "([^"]+)" có (\d+) dòng:$/, async ({ world }, tab: string, n: string, table: any) => {
  const pill = world.page.locator(SEL.pDetailTab, { hasText: tab });
  if (!(await pill.getAttribute('class'))?.includes(' on')) await pill.click();
  const rows = world.page.locator(SEL.pDetailRow);
  await expect(rows).toHaveCount(Number(n));
  const st = await world.state();
  for (const r of table.hashes()) {
    const p = st.products.find((x: any) => x.id === r['hàng']);
    const wh = st.warehouses.find((w: any) => w.id === r['kho']).name;
    const row = rows.filter({ hasText: p.sku }).filter({ hasText: wh });
    await expect(row).toHaveCount(1);
    const cells = (await row.locator(':scope > span').allInnerTexts()).map((s) => s.trim());
    const qty = r['đã nhập'] ?? r['số lượng'];
    expect(cells[3], 'số lượng ' + p.sku).toMatch(new RegExp('^' + qty + ' '));
    if (r['tồn']) expect(cells[4], 'tồn ' + p.sku).toBe(r['tồn']);
    if (r['chứng từ']) expect(cells[6]).toContain(r['chứng từ']);
  }
});

Then(/^tab có (\d+) dòng của (P[NX]-\d{4})$/, async ({ world }, n: string, code: string) => {
  const rows = world.page.locator(SEL.pDetailRow);
  await expect(rows).toHaveCount(Number(n));
  for (const r of await rows.all()) await expect(r).toContainText(code);
});

Then(/^tôi sang màn "([^"]+)" với bộ lọc "([^"]+)"$/, async ({ world }, screen: string, f: string) => {
  await expect(world.page.locator(SEL.pageTitle)).toHaveText(screen);
  await expect(world.page.locator(SEL.rcList).locator('.pill.on')).toContainText(f);
});

// ================= Thêm / sửa đối tác =================

When(/^tôi gọi POST "\/api\/partners" với type "(sup|cus)", name "([^"]+)", (phone|email) "([^"]+)"$/, async ({ world }, type: string, name: string, f: string, v: string) => {
  await world.call(world.actor, 'POST', '/api/partners', { type, name: world.expand(name), [f]: v });
});
When(/^tôi gọi POST "\/api\/partners" không có phone và email$/, async ({ world }) => {
  await world.call(world.actor, 'POST', '/api/partners', { type: 'sup', name: '[TEST] Thiếu liên hệ' });
});
When(/^tôi gọi POST "\/api\/partners" với (phone|email) = "([^"]+)"$/, async ({ world }, f: string, v: string) => {
  await world.call(world.actor, 'POST', '/api/partners', { type: 'sup', name: '[TEST] Sai định dạng', phone: '0281234567', [f]: v });
});
When(/^tôi gọi POST "\/api\/partners" với type "(sup|cus)"$/, async ({ world }, type: string) => {
  await world.call(world.actor, 'POST', '/api/partners', { type, name: '[TEST] Không được tạo', email: 'x@y.vn' });
});

Given('T_SUP có phone p0', async ({ world }) => { world.vars.p0 = world.need().sup.phone; world.vars.e0 = world.need().sup.email; });

When(/^Manager gọi PUT "\/api\/partners\/T_SUP" với name mới, phone "([^"]+)", email "([^"]+)"$/, async ({ world }, phone: string, email: string) => {
  const s = world.need().sup;
  await world.call('manager', 'PUT', `/api/partners/${s.id}`, { type: 'sup', name: s.name + ' (sửa)', phone, email, address: '' });
});
Then(/^Admin đọc "\/api\/state" vẫn thấy phone p0 và email cũ của T_SUP$/, async ({ world }) => {
  const p = findPartner(await world.state('admin'), world.need().sup.id);
  expect(p.phone).toBe(world.vars.p0);
  expect(p.email).toBe(world.vars.e0);
});

When(/^Admin gọi PUT "\/api\/partners\/T_SUP" với phone "([^"]+)"$/, async ({ world }, phone: string) => {
  const s = world.need().sup;
  world.vars.newPhone = phone;
  await world.call('admin', 'PUT', `/api/partners/${s.id}`, { type: 'sup', name: s.name, phone, email: s.email, address: '' });
});
Then(/^"\/api\/state" hiển thị số mới của T_SUP$/, async ({ world }) => {
  expect(findPartner(await world.state('admin'), world.need().sup.id).phone).toBe(world.vars.newPhone);
});

Then(/^giao diện không có nút thêm NCC hay "Sửa thông tin"$/, async ({ world }) => {
  await world.ui();
  await nav(world.page, 'Nhà cung cấp');
  await expect(world.page.locator(SEL.pAddSup)).toHaveCount(0);
  await openDetail(world, 'NCC-01');
  await expect(world.page.locator(SEL.pEdit)).toHaveCount(0);
});

// ================= Ghi chú =================

When(/^Manager gọi PUT "\/api\/partners\/T_SUP\/note" với "([^"]+)"$/, async ({ world }, note: string) => {
  world.vars.noteFor = world.need().sup.id;
  await world.call('manager', 'PUT', `/api/partners/${world.vars.noteFor}/note`, { note });
});
Then(/^noteBy là "([^"]+)"$/, async ({ world }, by: string) => {
  const id = await world.path(world.vars.noteFor);
  expect(findPartner(await world.state('admin'), id).noteBy).toBe(by);
});
Then('noteAt có giá trị', async ({ world }) => {
  expect(findPartner(await world.state('admin'), await world.path(world.vars.noteFor)).noteAt).toBeTruthy();
});
Then('giao diện hiển thị ghi chú dạng chỉ đọc', async ({ world }) => {
  await openDetail(world, 'NCC-01');
  await expect(world.page.locator(SEL.pNoteEdit)).toHaveCount(0);
  await expect(world.page.locator(SEL.card('Ghi chú')).locator('p')).toBeVisible();
});

// ================= Hồ sơ PDF =================

When(/^(Admin|Manager) gọi POST "\/api\/partners\/(T_SUP|T_CUS)\/files" với một PDF (?:(\d+) KB|hợp lệ)$/, async ({ world }, who: string, p: string, kb?: string) => {
  const buffer = kb ? pdfOfSize(Number(kb) * 1024) : PDF_BYTES();
  const l = await world.call(who === 'Admin' ? 'admin' : 'manager', 'POST', `/api/partners/${await world.path(p)}/files`, undefined,
    { multipart: { file: { name: `test-${world.runId}.pdf`, mimeType: 'application/pdf', buffer } } });
  world.vars.fileId = l.json?.id;
});
Given('T_CUS có 1 file test', async ({ world }) => {
  const l = await world.call('admin', 'POST', `/api/partners/${world.need().cus.id}/files`, undefined,
    { multipart: { file: { name: `test-${world.runId}.pdf`, mimeType: 'application/pdf', buffer: PDF_BYTES() } } });
  world.vars.fileId = world.ok(l, 'tải file mẫu').id;
});
Then(/^file (xuất hiện|không còn) trong "state\.files"$/, async ({ world }, how: string) => {
  const has = (await world.state('admin')).files.some((f: any) => f.id === world.vars.fileId);
  expect(has).toBe(how === 'xuất hiện');
});
Then(/^GET "\/api\/files\/\{id\}" trả "([^"]+)"$/, async ({ world }, type: string) => {
  const r = await (await world.api('admin')).get('/api/files/' + world.vars.fileId);
  expect(r.status()).toBe(200);
  expect(r.headers()['content-type']).toContain(type);
});

When(/^tôi tải file "([^"]+)" lên NCC-01 \(request bị từ chối nên không ghi dữ liệu\)$/, async ({ world }, f: string) => {
  const file = f === 'test.txt'
    ? { name: 'test.txt', mimeType: 'text/plain', buffer: Buffer.from('day khong phai PDF') }
    : { name: 'fake.pdf', mimeType: 'application/pdf', buffer: FAKE_PDF_BYTES() };
  await world.call(world.actor, 'POST', '/api/partners/NCC-01/files', undefined, { multipart: { file } });
});
When(/^tôi tải một PDF (\d+) MB lên NCC-01 \(request bị từ chối nên không ghi dữ liệu\)$/, async ({ world }, mb: string) => {
  await world.call(world.actor, 'POST', '/api/partners/NCC-01/files', undefined,
    { multipart: { file: { name: 'lon.pdf', mimeType: 'application/pdf', buffer: pdfOfSize(Number(mb) * 1024 * 1024) } } });
});

When(/^Admin tải lên T_SUP file PDF tên "([^"]+)"$/, async ({ world }, name: string) => {
  // "aaaa…(N ký tự).pdf" ⇒ tên dài đúng N ký tự kể cả đuôi .pdf (BUG-009: ngưỡng cột là 255)
  const m = name.match(/\((\d+) ký tự\)/);
  const fileName = m ? 'a'.repeat(Number(m[1]) - 4) + '.pdf' : name;
  const l = await world.call('admin', 'POST', `/api/partners/${world.need().sup.id}/files`, undefined,
    { multipart: { file: { name: fileName, mimeType: 'application/pdf', buffer: PDF_BYTES() } } });
  world.vars.statuses = [l.status];
  world.vars.fileId = l.json?.id;
});
Then('file bị từ chối hoặc được lưu an toàn', async ({ world }) => {
  const s = world.last!.status;
  expect([200, 400], `phản hồi ${s}: ${world.last!.text.slice(0, 200)}`).toContain(s);
  if (s === 200) {
    const r = await (await world.api('admin')).get('/api/files/' + world.vars.fileId);
    expect(r.status(), 'đọc lại file vừa lưu').toBe(200);
  }
});

// ================= Ẩn liên hệ theo vai trò (đọc từ phản hồi GET /api/state vừa gọi) =================

Then(/^"(suppliers|customers)\[\]\.phone" và "(?:suppliers|customers)\[\]\.email" có giá trị$/, async ({ world }, key: string) => {
  const list = world.ok()[key];
  for (const x of list) expect(x.phone || x.email, x.id).toBeTruthy();
  const sample = list.find((x: any) => x.id === (key === 'suppliers' ? 'NCC-01' : 'KH-01'));
  expect(sample.phone).toBeTruthy();
  expect(sample.email).toBeTruthy();
});
Then(/^mọi "(suppliers|customers)\[\]\.phone" là "" và "(?:suppliers|customers)\[\]\.email" là ""$/, async ({ world }, key: string) => {
  for (const x of world.ok()[key]) { expect(x.phone, x.id).toBe(''); expect(x.email, x.id).toBe(''); }
});
Then(/^"files" có file của (\S+)$/, async ({ world }, id: string) => {
  expect(world.ok().files.some((f: any) => f.partnerId === id)).toBe(true);
});
Then(/^"files" không có partnerId bắt đầu bằng "([^"]+)"$/, async ({ world }, prefix: string) => {
  expect(world.ok().files.filter((f: any) => f.partnerId.startsWith(prefix))).toEqual([]);
});

When(/^tôi mở màn "(Nhập kho|Xuất kho)" và đọc thẻ chọn (?:NCC|khách hàng)$/, async ({ world }, screen: string) => {
  await world.ui();
  await nav(world.page, screen);
  const prefix = screen === 'Nhập kho' ? 'NCC-' : 'KH-';
  const cards = world.page.locator(SEL.optcard).filter({ hasText: prefix });
  expect(await cards.count()).toBeGreaterThan(0);
  world.vars.cards = (await cards.allInnerTexts()).map((s) => s.trim());
});
Then(/^thẻ chỉ hiện mã (NCC|KH)$/, async ({ world }, prefix: string) => {
  for (const c of world.vars.cards) expect(c).toMatch(new RegExp(prefix + '-\\d+'));
});
Then('không có SĐT', async ({ world }) => {
  for (const c of world.vars.cards) expect(c).not.toMatch(PHONE_SHOWN);
});
