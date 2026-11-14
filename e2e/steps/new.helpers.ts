import { expect, actorOf, randomPhone, type ActorKey, type World } from './fixtures';

/**
 * Hàm dùng chung cho các step của tính năng bổ sung 13–14/11/2026:
 * phạm vi kho (BR-36/37), sửa hàng hóa, xuất báo cáo Admin, nhập/xuất định kỳ.
 * Không khai báo step nào ở đây (playwright-bdd nạp mọi file trong steps/ nhưng file này chỉ chứa hàm).
 */

/** Tên vai trò trong câu bước (cho regex): Admin, Manager (HN), Staff (HN), Manager HCM, … */
export const WHO_RE = String.raw`Admin|Manager HCM|Manager DN|Staff HCM|Manager|Staff|Tài khoản \[TEST\]|tôi`;

export function actorFor(world: World, word: string): ActorKey {
  if (word === 'tôi') return world.actor;
  if (word === 'Tài khoản [TEST]') return 'T_USER';
  return actorOf(word);
}

// ---------- ngày giờ theo múi giờ Việt Nam (khớp Rules.today() ở máy chủ) ----------
const vnNow = () => new Date(Date.now() + 7 * 3600e3);
const iso = (d: Date) => d.toISOString().slice(0, 10);
export const dateVars = () => {
  const n = vnNow();
  const first = new Date(Date.UTC(n.getUTCFullYear(), n.getUTCMonth(), 1));
  const tomorrow = new Date(n.getTime() + 86400e3);
  return {
    today: iso(n),
    tomorrow: iso(tomorrow),
    monthStart: iso(first),
    day: n.getUTCDate(),
    month: String(n.getUTCMonth() + 1).padStart(2, '0'),
    year: n.getUTCFullYear(),
    /** Mã kỳ tháng hiện tại, ví dụ 2026-11 */
    period: `${n.getUTCFullYear()}-${String(n.getUTCMonth() + 1).padStart(2, '0')}`,
  };
};
/** Ngày trong tháng sau hôm nay `n` ngày; null nếu vượt ngày 28 (tránh tháng ngắn, kịch bản tự bỏ qua). */
export const dayAfter = (n: number) => { const d = dateVars().day + n; return d <= 28 ? d : null; };

/** Tra giá trị theo đường dẫn "a.b.0.c" trong đối tượng JSON. */
export function jsonPath(obj: any, path: string): any {
  return path.split('.').reduce((o, k) => (o == null ? undefined : o[k]), obj);
}

/**
 * Thay `${tên}` trong chuỗi:
 *  - biến ngày: today, tomorrow, monthStart, day, month, year, period
 *  - runId; các biến lưu trong world.vars (prod.id, planId, user.id, …)
 *  - planReceipt: mã phiếu định kỳ mới nhất của kế hoạch vừa tạo (tra từ /api/state của Admin)
 */
export async function fill(world: World, s: string): Promise<string> {
  const dv: Record<string, unknown> = { ...dateVars(), runId: world.runId };
  let out = s;
  for (const m of [...s.matchAll(/\$\{([\w.]+)\}/g)]) {
    const key = m[1];
    let val: unknown;
    if (/^phone\d?$/.test(key)) { world.vars[key] ??= randomPhone(); val = world.vars[key]; }
    else if (key === 'planReceipt') val = (await planReceipts(world))[0]?.code;
    else if (key in dv) val = dv[key];
    else val = jsonPath(world.vars, key);
    expect(val, `biến \${${key}} chưa có giá trị`).not.toBeUndefined();
    out = out.replace(m[0], String(val));
  }
  return out;
}

/** Thân JSON từ docstring, đã thay biến. Số/mảng giữ nguyên kiểu vì chuỗi được thay trước khi parse. */
export async function jsonBody(world: World, doc: string): Promise<unknown> {
  return JSON.parse(await fill(world, doc));
}

// ---------- dọn dẹp ----------
interface Tracked { plans: string[]; receipts: string[] }

/**
 * Ghi nhớ kế hoạch và phiếu do kịch bản tạo để dọn sau khi chạy: kết thúc kế hoạch, từ chối phiếu còn chờ duyệt
 * (phiếu chờ duyệt không dọn thì làm lệch số "Phiếu chờ duyệt" của các kịch bản @after-reset chạy sau).
 */
export function track(world: World): Tracked {
  if (world.vars.tracked) return world.vars.tracked as Tracked;
  const t: Tracked = { plans: [], receipts: [] };
  world.vars.tracked = t;
  world.onCleanup(async () => {
    for (const id of t.plans) await world.call('admin', 'PUT', `/api/plans/${id}/status`, { status: 'ended' });
    const st = await world.state('admin');
    for (const r of st.receipts) {
      const mine = t.receipts.includes(r.code) || t.plans.some((p) => String(r.recurringRef ?? '').startsWith(p + ' /'));
      if (r.status === 'pending' && mine) await world.call('admin', 'POST', `/api/receipts/${r.code}/reject`);
    }
  });
  return t;
}

// ---------- dữ liệu [TEST] ----------
export const WH_NAME: Record<string, string> = { HN: 'Kho Hà Nội', HCM: 'Kho TP.HCM', DN: 'Kho Đà Nẵng' };
export const SUP = 'NCC-01';
export const CUS = 'KH-01';

/** Hàng hóa [TEST] (tồn 0 ở mọi kho). Hàng hóa không xóa được nên mỗi lần chạy dùng SKU riêng. */
export async function ensureProd(world: World) {
  if (world.vars.prod) return world.vars.prod as { id: string; sku: string; name: string };
  const sku = `TST-${world.runId}`;
  const name = `[TEST] Sản phẩm ${world.runId}`;
  const r = world.ok(await world.call('manager', 'POST', '/api/products', { sku, name, category: '[TEST]', unit: 'Cái', minStock: 5 }), 'tạo hàng hóa [TEST]');
  world.vars.prod = { id: r.id as string, sku, name };
  return world.vars.prod as { id: string; sku: string; name: string };
}

/** Đưa tồn hàng hóa [TEST] tại kho `wh` lên thêm `qty` bằng phiếu nhập của Admin (duyệt ngay). */
export async function stockUp(world: World, wh: string, qty: number) {
  const p = await ensureProd(world);
  const r = world.ok(await world.call('admin', 'POST', '/api/receipts', { type: 'in', partnerId: SUP, warehouseId: wh, note: '[TEST] nhập tồn', lines: [{ productId: p.id, qty }] }), 'nhập tồn [TEST]');
  expect(r.status, 'phiếu nhập của Admin được duyệt ngay').toBe('approved');
}

export async function stockOf(world: World, wh: string, pid = world.vars.prod?.id): Promise<number> {
  return ((await world.state('admin')).stock[`${pid}|${wh}`] ?? 0) as number;
}

// ---------- kế hoạch định kỳ ----------
export async function planOf(world: World, id = world.vars.planId, as: 'admin' | 'manager' | 'staff' | 'managerHcm' = 'admin') {
  const p = (await world.state(as)).plans.find((x: any) => x.id === id);
  expect(p, `kế hoạch ${id} trong /api/state của ${as}`).toBeTruthy();
  return p;
}

/** Phiếu sinh từ kế hoạch `id`, mới nhất trước. */
export async function planReceipts(world: World, id = world.vars.planId) {
  const st = await world.state('admin');
  return st.receipts.filter((r: any) => String(r.recurringRef ?? '').startsWith(id + ' /')) as any[];
}

/** Ghi nhớ kế hoạch vừa tạo (từ phản hồi POST /api/plans) để các bước sau dùng và để dọn. */
export function rememberPlan(world: World) {
  const id = world.last?.json?.id as string | undefined;
  if (world.last?.status === 200 && id && /^DK-\d+$/.test(id)) {
    world.vars.planId = id;
    track(world).plans.push(id);
  }
}
export function rememberReceipt(world: World) {
  const code = world.last?.json?.code as string | undefined;
  if (world.last?.status === 200 && code) track(world).receipts.push(code);
}
