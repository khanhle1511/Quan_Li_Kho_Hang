import { Given, When, Then, expect, actorOf, type World } from './fixtures';
import { SEL } from '../helpers/selectors';
import { ACCOUNTS, nav, readToast, uiLogin, waitToastGone } from '../helpers/app';
import { exact } from './ui.steps';

const pad4 = (n: number) => String(n).padStart(4, '0');

/** Tính biểu thức theo t trong câu bước: "t", "t + 20", "(t − 9)", "t − 1", "9" */
function evalT(world: World, expr: string): number {
  const e = expr.replace(/[()\s]/g, '').replace(/−/g, '-');
  const m = /^(t)?([+-]\d+)?$|^(\d+)$/.exec(e);
  if (!m) throw new Error('Không hiểu biểu thức: ' + expr);
  if (m[3]) return Number(m[3]);
  return (m[1] ? world.vars.t : 0) + (m[2] ? Number(m[2]) : 0);
}
const pidOf = (world: World, p: string) => (p === 'T_PROD' ? world.need().prod.id : p);
const whId = (s: string) => ({ HN: 'HN', HCM: 'HCM', 'Kho Hà Nội': 'HN', 'Kho TP.HCM': 'HCM' } as Record<string, string>)[s] ?? s;
/** Đối tác hợp lệ cho loại phiếu: dùng đối tác [TEST] nếu có fixture, không thì đối tác mẫu */
const partnerFor = (world: World, type: 'in' | 'out') => (world.fx ? (type === 'in' ? world.fx.sup.id : world.fx.cus.id) : type === 'in' ? 'NCC-01' : 'KH-01');
const screenType = async (world: World) => ((await world.page.locator(SEL.pageTitle).innerText()).includes('Xuất') ? 'out' : 'in');

// ================= Đọc số liệu =================

Given(/^tôi đọc tồn t của (T_PROD|P\d+) tại (HN|HCM)$/, async ({ world }, p: string, wh: string) => {
  const pid = pidOf(world, p);
  world.vars.t = await world.stock(pid, wh);
  world.vars.h = await world.historyCount(pid);
});

Given(/^tôi đọc "seq\.in" và tồn T_PROD tại HN từ "\/api\/state"$/, async ({ world }) => {
  const st = await world.state();
  world.vars.seqIn = st.seq.in;
  world.vars.t = st.stock[world.need().prod.id + '|HN'] ?? 0;
});

Given(/^tôi đọc "low" từ "\/api\/public\/summary"$/, async ({ world }) => { world.vars.L = (await world.summary()).low; });

Given(/^tồn t của T_PROD tại HN lớn hơn 10 \(min 10\)$/, async ({ world }) => {
  world.vars.t = await world.stock(world.need().prod.id, 'HN');
  expect(world.vars.t).toBeGreaterThan(10);
});

Given('tồn T_PROD tại HN được đưa về 4 bằng kiểm kê', async ({ world }) => {
  await world.setStock(world.need().prod.id, 'HN', 4);
  world.vars.t = 4;
});

Then(/^tồn T_PROD tại HN (?:là|vẫn là) (.+)$/, async ({ world }, expr: string) => {
  expect(await world.stock(world.need().prod.id, 'HN')).toBe(evalT(world, expr));
});
Then('tồn T_PROD tại HN không đổi', async ({ world }) => { expect(await world.stock(world.need().prod.id, 'HN')).toBe(world.vars.t); });
Then('tồn T_PROD tại HN không âm', async ({ world }) => { expect(await world.stock(world.need().prod.id, 'HN')).toBeGreaterThanOrEqual(0); });

// ================= Lập phiếu qua API =================

Given(/^(Staff|Manager|Admin) đã lập 1 phiếu T_PROD$/, async ({ world }, who: string) => {
  world.vars.code = await world.createReceipt(actorOf(who), 'in', world.need().sup.id, 'HN', [[world.need().prod.id, 1]]);
});
Given(/^(Staff|Manager|Admin) đã lập 1 phiếu xuất T_PROD$/, async ({ world }, who: string) => {
  world.vars.code = await world.createReceipt(actorOf(who), 'out', world.need().cus.id, 'HN', [[world.need().prod.id, 1]]);
});
// BR-09 (sửa 07/11/2026): phiếu nhập của Manager / Admin được duyệt ngay khi lập
When(/^(Manager|Admin) lập phiếu nhập T_PROD × (\d+) vào HN$/, async ({ world }, who: string, q: string) => {
  const fx = world.need();
  const l = await world.call(actorOf(who), 'POST', '/api/receipts', { type: 'in', partnerId: fx.sup.id, warehouseId: 'HN', note: '[TEST] auto', lines: [{ productId: fx.prod.id, qty: Number(q) }] });
  world.vars.code = l.json?.code;
});
Given(/^Staff đã lập phiếu (nhập|xuất) T_PROD × (\d+)(?: vào HN| tại HN)?$/, async ({ world }, kind: string, qty: string) => {
  const type = kind === 'nhập' ? 'in' : 'out';
  world.vars.code = await world.createReceipt('staff', type, partnerFor(world, type), 'HN', [[world.need().prod.id, Number(qty)]]);
});

When(/^Staff gọi POST "\/api\/receipts" với:$/, async ({ world }, table: any) => {
  const r = table.hashes()[0];
  const [p, q] = r.lines.split('×').map((s: string) => s.trim());
  const body = { type: r.type, partnerId: await world.path(r.partnerId), warehouseId: r.warehouseId, note: r.note, lines: [{ productId: pidOf(world, p), qty: Number(q) }] };
  const l = await world.call('staff', 'POST', '/api/receipts', body);
  world.vars.code = l.json?.code;
});

Then(/^code là "PN-" \+ seq\.in \(4 chữ số\)$/, async ({ world }) => { expect(world.ok().code).toBe('PN-' + pad4(world.vars.seqIn)); });

When(/^Staff gọi POST "\/api\/receipts" phiếu xuất kho (HN|HCM) với (T_PROD|P\d+) × (.+)$/, async ({ world }, wh: string, p: string, expr: string) => {
  const l = await world.call('staff', 'POST', '/api/receipts', { type: 'out', partnerId: partnerFor(world, 'out'), warehouseId: wh, note: '[TEST] auto', lines: [{ productId: pidOf(world, p), qty: evalT(world, expr) }] });
  world.vars.code = l.json?.code;
});

When(/^Staff lập phiếu xuất HN với T_PROD × (.+)$/, async ({ world }, expr: string) => {
  world.vars.code = await world.createReceipt('staff', 'out', partnerFor(world, 'out'), 'HN', [[world.need().prod.id, evalT(world, expr)]]);
});

When(/^Staff lập 2 phiếu xuất HN, mỗi phiếu T_PROD × t$/, async ({ world }) => {
  const fx = world.need();
  world.vars.codes = [
    await world.createReceipt('staff', 'out', fx.cus.id, 'HN', [[fx.prod.id, world.vars.t]]),
    await world.createReceipt('staff', 'out', fx.cus.id, 'HN', [[fx.prod.id, world.vars.t]]),
  ];
});

Given(/^có 2 phiếu xuất T_PROD × (\d+) đang chờ duyệt$/, async ({ world }, q: string) => {
  const fx = world.need();
  world.vars.codes = [
    await world.createReceipt('staff', 'out', fx.cus.id, 'HN', [[fx.prod.id, Number(q)]]),
    await world.createReceipt('staff', 'out', fx.cus.id, 'HN', [[fx.prod.id, Number(q)]]),
  ];
});

// Các phiếu không hợp lệ: thân phiếu hợp lệ, chỉ thay một chỗ
const baseIn = (world: World) => ({ type: 'in', partnerId: 'NCC-01', warehouseId: 'HN', note: '[TEST] không hợp lệ', lines: [{ productId: 'P01', qty: 1 }] });

When(/^tôi gọi POST "\/api\/receipts" với lines rỗng$/, async ({ world }) => {
  await world.call(world.actor, 'POST', '/api/receipts', { ...baseIn(world), lines: [] });
});
When(/^tôi gọi POST "\/api\/receipts" với một dòng hàng có qty (.+)$/, async ({ world }, raw: string) => {
  const qty = raw.startsWith('"') ? raw.slice(1, -1) : Number(raw);
  await world.call(world.actor, 'POST', '/api/receipts', { ...baseIn(world), lines: [{ productId: 'P01', qty }] });
});
When(/^tôi gọi POST "\/api\/receipts" với dòng T_PROD có qty ([\d.]+)$/, async ({ world }, q: string) => {
  const fx = world.need();
  const l = await world.call(world.actor, 'POST', '/api/receipts', { ...baseIn(world), partnerId: fx.sup.id, lines: [{ productId: fx.prod.id, qty: Number(q) }] });
  world.vars.code = l.json?.code; // nếu bị chấp nhận (bug) thì phiếu sẽ được dọn sau kịch bản
});
When(/^tôi gọi POST "\/api\/receipts" với lines "(P\d+) × (\d+)"(?: và "(P\d+) × (\d+)")?$/, async ({ world }, p1: string, q1: string, p2?: string, q2?: string) => {
  const lines = [{ productId: p1, qty: Number(q1) }];
  if (p2) lines.push({ productId: p2, qty: Number(q2) });
  await world.call(world.actor, 'POST', '/api/receipts', { ...baseIn(world), lines });
});
When(/^tôi gọi POST "\/api\/receipts" phiếu nhập với partnerId "([^"]+)"$/, async ({ world }, pid: string) => {
  await world.call(world.actor, 'POST', '/api/receipts', { ...baseIn(world), partnerId: pid });
});
When(/^tôi gọi POST "\/api\/receipts" phiếu nhập vào T_WH$/, async ({ world }) => {
  const fx = world.need();
  await world.call(world.actor, 'POST', '/api/receipts', { ...baseIn(world), partnerId: fx.sup.id, warehouseId: world.T_WH.id, lines: [{ productId: fx.prod.id, qty: 1 }] });
});

Given('T_WH đang tạm ngưng', async ({ world }) => {
  const st = await world.state();
  if (st.warehouses.find((w: any) => w.id === world.T_WH.id)?.status !== 'paused') world.ok(await world.setWhStatus(world.T_WH, 'paused'));
});

// ================= Duyệt / từ chối =================

When(/^(Admin|Manager) (?:gọi POST approve|duyệt) phiếu đó$/, async ({ world }, who: string) => {
  await world.call(actorOf(who), 'POST', `/api/receipts/${world.vars.code}/approve`);
});

When(/^Manager duyệt phiếu ([12])$/, async ({ world }, i: string) => {
  world.vars['r' + i] = await world.call('manager', 'POST', `/api/receipts/${world.vars.codes[Number(i) - 1]}/approve`);
});
Then('phiếu 1 trả mã 200', async ({ world }) => { expect(world.vars.r1.status, world.vars.r1.text).toBe(200); });
Then(/^phiếu 2 trả mã 400 với thông báo chứa "([^"]+)" và "([^"]+)"$/, async ({ world }, a: string, b: string) => {
  expect(world.vars.r2.status).toBe(400);
  expect(world.vars.r2.json.error).toContain(a);
  expect(world.vars.r2.json.error).toContain(b);
});
Then(/^phiếu 2 vẫn ở trạng thái "([^"]+)"$/, async ({ world }, st: string) => {
  const r = (await world.state()).receipts.find((x: any) => x.id === world.vars.codes[1]);
  expect(r.status).toBe(st);
});

Given(/^phiếu (P[NX]-\d{4}) đã được duyệt$/, async ({ world }, code: string) => {
  expect((await world.state()).receipts.find((x: any) => x.id === code)?.status).toBe('approved');
});

Then(/^người duyệt là "([^"]+)"$/, async ({ world }, name: string) => {
  expect((await world.state()).receipts.find((x: any) => x.id === world.vars.code)?.approver).toBe(name);
});

Then('thẻ kho có thêm 1 dòng tham chiếu mã phiếu', async ({ world }) => {
  const hs = (await world.state()).history.filter((h: any) => h.pid === world.need().prod.id);
  expect(hs.length).toBe(world.vars.h + 1);
  expect(hs.some((h: any) => h.ref === world.vars.code)).toBe(true);
});
Then('thẻ kho không có dòng mới', async ({ world }) => { expect(await world.historyCount(world.need().prod.id)).toBe(world.vars.h); });
Then('thẻ kho có đúng 1 dòng cho phiếu đó', async ({ world }) => {
  expect((await world.state()).history.filter((h: any) => h.ref === world.vars.code)).toHaveLength(1);
});

Then(/^danh sách "low" rỗng nếu t − 5 > 10$/, async ({ world }) => {
  if (world.vars.t - 5 > 10) expect(world.ok().low).toEqual([]);
});
Then(/^danh sách "low" trả về chứa tên T_PROD$/, async ({ world }) => { expect(world.ok().low).toContain(world.need().prod.name); });
Then(/^"\/api\/public\/summary" có "low" tăng 1$/, async ({ world }) => { expect((await world.summary()).low).toBe(world.vars.L + 1); });

// ================= Đồng thời (RISK-01..03) =================

When(/^tôi gửi song song (\d+) request approve phiếu đó từ 2 phiên Manager \+ Admin$/, async ({ world }, n: string) => {
  const ctxs = [await world.api('manager'), await world.api('admin')];
  const res = await Promise.all(Array.from({ length: Number(n) }, (_, i) => ctxs[i % 2].post(`/api/receipts/${world.vars.code}/approve`)));
  world.vars.statuses = res.map((r) => r.status());
});
Then('đúng 1 request thành công', async ({ world }) => {
  expect(world.vars.statuses.filter((s: number) => s === 200), 'statuses: ' + world.vars.statuses).toHaveLength(1);
});

When(/^Staff gửi song song (\d+) POST "\/api\/receipts" với T_PROD, note "([^"]+)"$/, async ({ world }, n: string, note: string) => {
  const fx = world.need(); const ctx = await world.api('staff');
  const res = await Promise.all(Array.from({ length: Number(n) }, () => ctx.post('/api/receipts', { data: { type: 'in', partnerId: fx.sup.id, warehouseId: 'HN', note, lines: [{ productId: fx.prod.id, qty: 1 }] } })));
  world.vars.statuses = res.map((r) => r.status());
  world.vars.codes = await Promise.all(res.map(async (r) => (r.ok() ? (await r.json()).code : null)));
});
Then(/^có (\d+) phiếu được tạo với mã khác nhau$/, async ({ world }, n: string) => {
  const codes = (world.vars.codes as (string | null)[]).filter(Boolean);
  expect(codes, 'statuses: ' + world.vars.statuses).toHaveLength(Number(n));
  expect(new Set(codes).size).toBe(Number(n));
});

When('Manager và Admin duyệt 2 phiếu song song', async ({ world }) => {
  const [m, a] = [await world.api('manager'), await world.api('admin')];
  const res = await Promise.all([m.post(`/api/receipts/${world.vars.codes[0]}/approve`), a.post(`/api/receipts/${world.vars.codes[1]}/approve`)]);
  world.vars.statuses = res.map((r) => r.status());
});
Then('1 phiếu thành công và 1 phiếu bị từ chối', async ({ world }) => {
  expect([...world.vars.statuses].sort(), 'statuses').toEqual([200, 400]);
});

// ================= Giao diện lập phiếu =================

async function pickPartnerAndWh(world: World, partnerName: string, wh: string) {
  await world.page.locator(SEL.optcard, { hasText: partnerName }).click();
  await world.page.locator(SEL.optcard).filter({ has: world.page.locator('span', { hasText: exact(wh) }) }).first().click();
}
async function addProduct(world: World, sku: string) {
  const t = await screenType(world);
  await world.page.fill(SEL.rcSearch(t as any), sku);
  await world.page.locator(SEL.pick, { hasText: sku }).first().click();
}

When(/^tôi chọn đối tác T_SUP và kho "([^"]+)"$/, async ({ world }, wh: string) => { await pickPartnerAndWh(world, world.need().sup.name, wh); });
When(/^tôi chọn kho "([^"]+)"$/, async ({ world }, wh: string) => {
  await world.page.locator(SEL.optcard).filter({ has: world.page.locator('span', { hasText: exact(wh) }) }).first().click();
});
When('tôi thêm hàng T_PROD', async ({ world }) => { await addProduct(world, world.need().prod.sku); });
When(/^tôi thêm hàng (P\d+) và đọc tồn t$/, async ({ world }, pid: string) => {
  const p = (await world.state()).products.find((x: any) => x.id === pid);
  await addProduct(world, p.sku);
  world.vars.t = await world.stock(pid, 'HN');
  world.vars.unit = p.unit;
  world.vars.min = p.min;
});
When(/^tôi nhập số lượng (.+)$/, async ({ world }, expr: string) => {
  const t = await screenType(world);
  await world.page.fill(SEL.rcQty(t as any, 0), String(evalT(world, expr)));
});
Then(/^dòng hiển thị chữ đỏ "([^"]+)"$/, async ({ world }, text: string) => {
  const w = world.page.locator(SEL.slipWarn).first();
  await expect(w).toContainText(text);
  await expect(w).toHaveAttribute('style', /#A01F17/i);
});
Then(/^dòng hiển thị chữ cam "([^"]+)" nếu t − 1 ≤ (\d+)$/, async ({ world }, text: string, lim: string) => {
  const w = world.page.locator(SEL.slipWarn);
  if (world.vars.t - 1 <= Number(lim)) {
    await expect(w.first()).toContainText(text);
    await expect(w.first()).toHaveAttribute('style', /#933A00/i);
  } else await expect(w).toHaveCount(0);
});

Then(/^phiếu xuất hiện trong "#rc-list" với chip "([^"]+)"$/, async ({ world }, chip: string) => {
  const code = /(P[NX]-\d{4})/.exec(world.vars.toast ?? '')?.[1];
  expect(code, 'mã phiếu trong toast').toBeTruthy();
  await expect(world.page.locator(SEL.rcRow, { hasText: code! }).locator(SEL.chip)).toHaveText(chip);
});

Given(/^(Staff|Manager|Admin) đang lập phiếu nhập T_PROD trên giao diện$/, async ({ world }, who: string) => {
  await world.setActor(actorOf(who));
  await world.ui();
  await nav(world.page, 'Nhập kho');
  await pickPartnerAndWh(world, world.need().sup.name, 'Kho Hà Nội');
  await addProduct(world, world.need().prod.sku);
});
When('tôi ghi lại mã dự kiến trên phiếu xem trước', async ({ world }) => {
  world.vars.expected = (await world.page.locator(SEL.slipCode).innerText()).trim();
});
When('tôi lưu phiếu', async ({ world }) => {
  await waitToastGone(world.page);
  await world.page.click(SEL.rcSave);
  world.vars.toast = await readToast(world.page);
  const code = /(P[NX]-\d{4})/.exec(world.vars.toast ?? '')?.[1];
  if (code) world.vars.code = code; // để các bước "dòng phiếu đó…", "phiếu ở trạng thái…" dùng tiếp
});
Then(/^nút lưu phiếu là "([^"]+)"$/, async ({ world }, label: string) => {
  await expect(world.page.locator(SEL.rcSave)).toHaveText(label);
});
Then(/^toast vừa hiện có "(.+)"$/, async ({ world }, text: string) => {
  expect(world.vars.toast, 'không thấy toast sau khi lưu').toBeTruthy();
  for (const p of text.split('…').map((s) => s.trim()).filter(Boolean)) expect(world.vars.toast).toContain(p);
});
Then('toast hiển thị đúng mã dự kiến đó', async ({ world }) => { expect(world.vars.toast).toContain(world.vars.expected); });

Then(/^danh sách chỉ còn (P[NX]-\d{4}) và có nhãn "([^"]+)"$/, async ({ world }, code: string, label: string) => {
  await expect(world.page.locator(SEL.rcRow)).toHaveCount(1);
  await expect(world.page.locator(SEL.rcRow)).toContainText(code);
  await expect(world.page.locator(SEL.statBtn + '.on .tick')).toHaveText(label);
});
Then(/^danh sách hiển thị đủ (\d+) phiếu$/, async ({ world }, n: string) => { await expect(world.page.locator(SEL.rcRow)).toHaveCount(Number(n)); });

When('Manager mở danh sách phiếu', async ({ world }) => {
  await world.setActor('manager');
  await world.ui();
  await nav(world.page, 'Nhập kho');
});
Then(/^dòng phiếu đó hiển thị "([^"]+)"$/, async ({ world }, text: string) => {
  world.vars.scope = `#rc-list .trow:has-text("${world.vars.code}")`;
  await expect(world.page.locator(world.vars.scope)).toContainText(text);
});

// ================= Kiểm kê =================

async function startKk(world: World, actor: 'staff' | 'manager', wh = 'Kho Hà Nội') {
  await world.setActor(actor);
  await world.ui();
  await nav(world.page, 'Kiểm kê');
  await world.page.locator(SEL.kkWhCard, { hasText: wh }).first().click();
  await world.page.click(SEL.kkStart);
  await expect(world.page.locator(SEL.kkBar)).toBeVisible();
}

When(/^tôi chọn "([^"]+)" và bấm "Bắt đầu kiểm kê"$/, async ({ world }, wh: string) => {
  await world.page.locator(SEL.kkWhCard, { hasText: wh }).first().click();
  await world.page.click(SEL.kkStart);
});
Given(/^Staff (?:đang mở phiên kiểm kê "Kho Hà Nội"|đang mở phiên kiểm kê HN trên giao diện|mở phiên kiểm kê HN)$/, async ({ world }) => {
  if (world.fx) world.vars.t = await world.stock(world.fx.prod.id, 'HN');
  await startKk(world, 'staff');
});
Given('Staff đang mở phiên kiểm kê và đã sửa số', async ({ world }) => {
  await startKk(world, 'staff');
  await world.page.locator(SEL.kkRow).first().locator(SEL.kkPlus).click();
});

Then('phiên có 8 dòng, số thực tế bằng tồn hệ thống', async ({ world }) => {
  // Tracker ghi 8 = số mặt hàng của dữ liệu mẫu; phiên luôn có đủ mọi mặt hàng hiện có
  const n = (await world.state()).products.length;
  const rows = world.page.locator(SEL.kkRow);
  await expect(rows).toHaveCount(n);
  for (let i = 0; i < n; i++) {
    const system = (await rows.nth(i).locator('span.r').first().innerText()).replace(/\./g, '');
    await expect(world.page.locator(SEL.kkInput(i))).toHaveValue(system);
  }
});
Then(/^mọi dòng có chip "([^"]+)"$/, async ({ world }, chip: string) => {
  const rows = world.page.locator(SEL.kkRow);
  for (const r of await rows.all()) await expect(r.locator(SEL.chip)).toHaveText(chip);
});
Then(/^thanh trạng thái hiển thị "([^"]+)"$/, async ({ world }, text: string) => { await expect(world.page.locator(SEL.kkBar)).toContainText(text); });

When(/^tôi bấm "([−+])" ở dòng (\d+)$/, async ({ world }, sign: string, n: string) => {
  await world.page.locator(SEL.kkRow).nth(Number(n) - 1).locator(sign === '+' ? SEL.kkPlus : SEL.kkMinus).click();
});
Then(/^dòng (\d+) có chip "([^"]+)" và dòng (\d+) có chip "([^"]+)"$/, async ({ world }, a: string, ca: string, b: string, cb: string) => {
  const rows = world.page.locator(SEL.kkRow);
  await expect(rows.nth(Number(a) - 1).locator(SEL.chip)).toHaveText(ca);
  await expect(rows.nth(Number(b) - 1).locator(SEL.chip)).toHaveText(cb);
  world.vars.kkRows = [Number(a) - 1, Number(b) - 1];
});
Then(/^cả 2 dòng được tô "\.trow\.hl"$/, async ({ world }) => {
  for (const i of world.vars.kkRows) await expect(world.page.locator(SEL.kkRow).nth(i)).toHaveClass(/\bhl\b/);
});
Then(/^tổng kết hiển thị Thiếu (\d+), Thừa (\d+)$/, async ({ world }, under: string, over: string) => {
  const bar = world.page.locator(SEL.kkBar);
  await expect(bar.locator('.mini', { hasText: 'Thiếu' }).locator('b')).toHaveText(String(under));
  await expect(bar.locator('.mini', { hasText: 'Thừa' }).locator('b')).toHaveText(String(over));
});

When(/^(Admin|Manager|Staff) mở màn "([^"]+)"$/, async ({ world }, who: string, screen: string) => {
  await world.setActor(actorOf(who));
  await world.ui();
  await nav(world.page, screen);
});
Then('không có thẻ kho của T_WH', async ({ world }) => {
  await expect(world.page.locator(SEL.optcard, { hasText: world.T_WH.name })).toHaveCount(0);
});

When(/^Manager gọi POST "\/api\/stocktakes" kho HN với T_PROD actual = (.+)$/, async ({ world }, expr: string) => {
  const l = await world.call('manager', 'POST', '/api/stocktakes', { warehouseId: 'HN', rows: [{ productId: world.need().prod.id, actual: evalT(world, expr) }] });
  world.vars.code = l.json?.code;
});
Then(/^code có dạng "KK-xxxx" và diff là (.+)$/, async ({ world }, d: string) => {
  expect(world.ok().code).toMatch(/^KK-\d{4}$/);
  const delta = Number(d.replace('−', '-'));
  const h = (await world.state()).history.find((x: any) => x.ref === world.vars.code && x.pid === world.need().prod.id);
  expect(h?.delta, 'chênh lệch ghi trên thẻ kho').toBe(delta);
});
Then(/^diff là 0 và vẫn tạo mã "KK-xxxx"$/, async ({ world }) => {
  const j = world.ok();
  expect(j.diff).toBe(0);
  expect(j.code).toMatch(/^KK-\d{4}$/);
});
Then(/^thẻ kho có dòng "Kiểm kê" (.+)$/, async ({ world }, d: string) => {
  const h = (await world.state()).history.find((x: any) => x.ref === world.vars.code && x.pid === world.need().prod.id);
  expect(h?.kind).toBe('Kiểm kê');
  expect(h?.delta).toBe(Number(d.replace('−', '-')));
});

When(/^tôi gọi POST "\/api\/stocktakes" kho HN với một dòng actual = (.+)$/, async ({ world }, raw: string) => {
  await world.call(world.actor, 'POST', '/api/stocktakes', { warehouseId: 'HN', rows: [{ productId: 'P01', actual: raw === 'null' ? null : Number(raw) }] });
});
When(/^Manager gọi POST "\/api\/stocktakes" với warehouseId = T_WH$/, async ({ world }) => {
  await world.call('manager', 'POST', '/api/stocktakes', { warehouseId: world.T_WH.id, rows: [{ productId: world.need().prod.id, actual: 0 }] });
});

Then('trên giao diện Staff chỉ thấy thông báo cần Quản lý kho xác nhận', async ({ world }) => {
  await startKk(world, 'staff');
  await expect(world.page.locator(SEL.kkStaffNotice)).toBeVisible();
  await expect(world.page.locator(SEL.kkConfirm)).toHaveCount(0);
});

When(/^Admin duyệt 1 phiếu nhập T_PROD × (\d+) vào HN$/, async ({ world }, q: string) => {
  const fx = world.need();
  // Staff lập (phiếu nhập của Manager/Admin được duyệt ngay – BR-09), Admin duyệt
  const code = await world.createReceipt('staff', 'in', fx.sup.id, 'HN', [[fx.prod.id, Number(q)]]);
  await world.approve('admin', code);
});

/** Đổi người đăng nhập trên CÙNG tab (không tải lại trang) để phiên kiểm kê trong bộ nhớ trang còn nguyên. */
async function handoverToManager(world: World) {
  await world.page.click(SEL.logout);
  await world.page.locator(SEL.loginUser).waitFor();
  expect(await uiLogin(world.page, ACCOUNTS.manager.phone, ACCOUNTS.manager.pass)).toBeNull();
  world.actor = 'manager'; world.pageActor = 'manager'; world.uiActor = 'manager';
  await nav(world.page, 'Kiểm kê');
}

When('Manager xác nhận phiên kiểm kê mà không sửa số', async ({ world }) => {
  await handoverToManager(world);
  await world.page.click(SEL.kkConfirm);
  await readToast(world.page);
});
Then('cần quyết định nghiệp vụ về tồn T_PROD', async ({ world }) => {
  // Quy tắc đã chốt (BUG-008, RISK-04): chênh lệch kiểm kê = thực tế − số hệ thống lúc mở phiên, cộng vào tồn hiện tại.
  // Không sửa số ⇒ chênh lệch 0 ⇒ phiếu nhập +5 duyệt trong lúc kiểm kê được giữ nguyên và thẻ kho không có dòng "Kiểm kê".
  const pid = world.need().prod.id;
  expect(await world.stock(pid, 'HN'), 'tồn sau khi xác nhận kiểm kê bị đặt về số cũ, mất phần nhập trong lúc kiểm kê').toBe(world.vars.t + 5);
  const hs = (await world.state()).history.filter((h: any) => h.pid === pid && h.wh === 'HN');
  expect(hs[0]?.kind, 'dòng thẻ kho mới nhất phải là phiếu Nhập, không phải điều chỉnh Kiểm kê').toBe('Nhập');
});

When('Staff chỉ sửa dòng T_PROD thành tồn − 1', async ({ world }) => {
  world.vars.before = (await world.state()).stock;
  await world.page.locator(SEL.kkRow, { hasText: world.need().prod.sku }).locator(SEL.kkMinus).click();
});
When('Staff đăng xuất và Manager đăng nhập cùng tab', async ({ world }) => { await handoverToManager(world); });
When('Manager bấm xác nhận', async ({ world }) => {
  const row = world.page.locator(SEL.kkRow, { hasText: world.need().prod.sku });
  world.vars.intact = (await world.page.locator(SEL.kkBar).count()) === 1 && (await row.locator(SEL.chip).innerText()).trim() === '−1';
  await waitToastGone(world.page);
  await world.page.click(SEL.kkConfirm);
  await readToast(world.page);
});
Then('phiên vẫn còn nguyên trước khi xác nhận', async ({ world }) => { expect(world.vars.intact).toBe(true); });
Then('sau khi xác nhận chỉ T_PROD tại HN giảm 1', async ({ world }) => {
  const k = world.need().prod.id + '|HN';
  expect((await world.state()).stock[k]).toBe(world.vars.before[k] - 1);
});
Then('các mặt hàng khác không đổi', async ({ world }) => {
  const now = (await world.state()).stock; const k = world.need().prod.id + '|HN';
  for (const key of Object.keys(world.vars.before)) if (key.endsWith('|HN') && key !== k) expect(now[key], key).toBe(world.vars.before[key]);
});

Then('phiên kiểm kê bị mất', async ({ world }) => {
  await world.page.locator(SEL.navItem).first().waitFor();
  await nav(world.page, 'Kiểm kê');
  await expect(world.page.locator(SEL.kkBar)).toHaveCount(0);
  await expect(world.page.locator(SEL.kkStart)).toBeVisible();
});

Then(/^lịch sử có (KK-\d{4}) của "([^"]+)" với (\d+) mặt hàng$/, async ({ world }, code: string, wh: string, n: string) => {
  const row = world.page.locator(SEL.kkHistoryRow, { hasText: code });
  await expect(row).toContainText(wh);
  await expect(row.locator('span.r')).toHaveText(String(n));
  world.vars.scope = `${SEL.kkHistoryRow}:has-text("${code}")`;
});
Then(/^chip "([^"]+)"$/, async ({ world }, chip: string) => { await expect(world.page.locator(world.vars.scope).locator(SEL.chip)).toHaveText(chip); });
