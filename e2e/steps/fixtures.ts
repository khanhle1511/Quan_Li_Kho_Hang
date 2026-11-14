import { expect, request as pwRequest, type APIRequestContext, type APIResponse, type Page } from '@playwright/test';
import { test as base, createBdd } from 'playwright-bdd';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { ACCOUNTS } from '../helpers/app';
import { SEL } from '../helpers/selectors';

/**
 * Trạng thái của một kịch bản BDD.
 *
 * - "tôi" là vai trò hiện tại (`actor`), đặt bởi bước "Cho <vai trò> đã đăng nhập".
 *   Phiên của "tôi" dùng `page.request` nên chung cookie với trình duyệt: đăng nhập API xong mở trang là vào thẳng ứng dụng.
 * - Các vai trò khác được nêu tên trong bước ("Admin gọi …") dùng request context riêng.
 * - Dữ liệu [TEST] tạo khi gặp bước "fixture [TEST] đã được tạo" và dọn sau kịch bản.
 */
export type ActorKey = 'admin' | 'manager' | 'staff' | 'managerHcm' | 'managerDn' | 'staffHcm' | 'anon' | 'T_USER' | 'T_USER2';
/** Vai trò có tài khoản trong dữ liệu mẫu (đọc từ ACCOUNTS). Manager/Staff = kho HN; Hcm/Dn = kho TP.HCM / Đà Nẵng (BR-36) */
const SEEDED: ActorKey[] = ['admin', 'manager', 'staff', 'managerHcm', 'managerDn', 'staffHcm'];

export interface TestUser { id: string; name: string; phone: string; pass: string }
export interface TestWh { id: string; code: string; name: string }
export interface Fx {
  runId: string;
  prod: { id: string; sku: string; name: string };
  sup: { id: string; name: string; phone: string; email: string };
  cus: { id: string; name: string; phone: string; email: string };
  user: TestUser;
  wh: TestWh;
  wh2?: TestWh;
  user2?: TestUser;
}
export interface Last { status: number; json: any; text: string; headers: Record<string, string>; ms: number }

const FIXTURES = join(__dirname, '..', 'fixtures');
export const PDF_BYTES = () => readFileSync(join(FIXTURES, 'test.pdf'));
export const FAKE_PDF_BYTES = () => readFileSync(join(FIXTURES, 'fake.pdf'));
export const today = () => new Date().toISOString().slice(0, 10);
const rnd = (n: number) => Array.from({ length: n }, () => Math.floor(Math.random() * 10)).join('');
export const randomPhone = () => '09' + rnd(8);
export const SEED = { low: 12, pending: 2, total: 994, warehouses: 3 }; // dữ liệu mẫu sau khi cố định 3 kho (DataSeeder)

/** Tên vai trò trong câu bước → khóa nội bộ */
export function actorOf(word: string): ActorKey {
  const m: Record<string, ActorKey> = {
    Admin: 'admin', Manager: 'manager', Staff: 'staff', 'Manager HCM': 'managerHcm', 'Manager DN': 'managerDn', 'Staff HCM': 'staffHcm',
    'Quản trị viên': 'admin', T_USER: 'T_USER', T_USER2: 'T_USER2',
  };
  if (!(word in m)) throw new Error('Không biết vai trò: ' + word);
  return m[word];
}

export class World {
  /** Kịch bản không nêu vai trò (tracker ghi "Bất kỳ") → mặc định Manager */
  actor: ActorKey = 'manager';
  uiActor: ActorKey | null = null;
  pageActor: ActorKey | null = null;
  last: Last | null = null;
  vars: Record<string, any> = {};
  fx: Fx | null = null;
  dialogs: string[] = [];
  downloads = 0;
  /** Định danh lần chạy, dùng trong tên dữ liệu [TEST] (có sẵn kể cả khi chưa tạo fixture) */
  runId = Date.now().toString(36).toUpperCase() + rnd(2);
  /** Kho [TEST] tạo riêng trong kịch bản không dùng fixture (ví dụ TC-ALT-03-01) */
  ownWh: TestWh | null = null;
  /** Tài khoản/kho tạo thêm ngoài fixture, cần dọn sau kịch bản */
  extraUsers: string[] = [];
  extraWhs: string[] = [];
  /** Kho thật bị tạm ngưng trong đợt @exclusive, mở lại sau kịch bản */
  restoreWhs: string[] = [];
  private sessions = new Map<string, APIRequestContext>();
  /** Việc dọn dẹp do các bước tự đăng ký (đóng context riêng, tắt giả lập lỗi…), chạy trước khi xóa dữ liệu [TEST] */
  private disposers: (() => Promise<unknown>)[] = [];
  private extraCreds = new Map<ActorKey, { phone: string; pass: string }>();

  constructor(public page: Page, public baseURL: string) {
    page.on('dialog', (d) => { this.dialogs.push(d.message()); d.accept().catch(() => {}); });
    page.on('download', () => { this.downloads++; });
  }

  // ---------- phiên & đăng nhập ----------
  creds(a: ActorKey) {
    const o = this.extraCreds.get(a);
    if (o) return o;
    if (SEEDED.includes(a)) { const acc = ACCOUNTS[a as keyof typeof ACCOUNTS]; return { phone: acc.phone, pass: acc.pass }; }
    if (a === 'T_USER') return { phone: this.need().user.phone, pass: this.need().user.pass };
    if (a === 'T_USER2' && this.fx?.user2) return { phone: this.fx.user2.phone, pass: this.fx.user2.pass };
    throw new Error('Chưa có tài khoản cho ' + a);
  }
  setCreds(a: ActorKey, phone: string, pass: string) { this.extraCreds.set(a, { phone, pass }); }
  onCleanup(fn: () => Promise<unknown>) { this.disposers.push(fn); }

  /** Context API đã đăng nhập cho vai trò `a` (mặc định là "tôi"). */
  async api(a: ActorKey = this.actor): Promise<APIRequestContext> {
    if (a === this.actor) {
      const r = this.page.request;
      if (a !== 'anon' && this.pageActor !== a) {
        const c = this.creds(a);
        const res = await r.post('/api/auth/login', { data: { phone: c.phone, password: c.pass } });
        expect(res.status(), `đăng nhập ${a} (phiên trình duyệt)`).toBe(200);
        this.pageActor = a;
      }
      return r;
    }
    let ctx = this.sessions.get(a);
    if (!ctx) {
      ctx = await pwRequest.newContext({ baseURL: this.baseURL });
      if (a !== 'anon') {
        const c = this.creds(a);
        const res = await ctx.post('/api/auth/login', { data: { phone: c.phone, password: c.pass } });
        expect(res.status(), `đăng nhập ${a}`).toBe(200);
      }
      this.sessions.set(a, ctx);
    }
    return ctx;
  }

  /** Bỏ phiên đã lưu của một vai trò (sau khi đổi mật khẩu, khóa…) */
  async dropSession(a: ActorKey) {
    const c = this.sessions.get(a);
    if (c) { await c.dispose(); this.sessions.delete(a); }
    if (this.pageActor === a) this.pageActor = null;
  }

  /** Context mới hoàn toàn, không cookie (dùng cho thử đăng nhập). */
  async fresh(): Promise<APIRequestContext> {
    const key = 'fresh-' + this.sessions.size;
    const ctx = await pwRequest.newContext({ baseURL: this.baseURL });
    this.sessions.set(key, ctx);
    return ctx;
  }

  async setActor(a: ActorKey) {
    this.actor = a;
    if (a === 'anon') { await this.page.request.post('/api/auth/logout').catch(() => {}); this.pageActor = null; this.uiActor = null; }
  }

  // ---------- gọi API ----------
  async call(a: ActorKey, method: string, path: string, body?: unknown, opts: { multipart?: any } = {}): Promise<Last> {
    const ctx = await this.api(a);
    const t0 = Date.now();
    const res: APIResponse = await ctx.fetch(path, {
      method,
      ...(opts.multipart ? { multipart: opts.multipart } : body !== undefined ? { data: body as any } : {}),
    });
    return this.keep(res, Date.now() - t0);
  }
  async keep(res: APIResponse, ms = 0): Promise<Last> {
    const text = await res.text().catch(() => '');
    let json: any = null;
    try { json = JSON.parse(text); } catch { /* không phải JSON (PDF…) */ }
    this.last = { status: res.status(), json, text, headers: res.headers(), ms };
    return this.last;
  }
  ok(l: Last | null = this.last, what = 'API'): any {
    expect(l, what).not.toBeNull();
    expect(l!.status, `${what}: ${l!.text.slice(0, 200)}`).toBe(200);
    return l!.json;
  }

  async state(a: ActorKey = 'admin') {
    const ctx = await this.api(a);
    const r = await ctx.get('/api/state');
    expect(r.status(), 'GET /api/state').toBe(200);
    return r.json();
  }
  async summary() {
    const ctx = await this.api('anon');
    return (await ctx.get('/api/public/summary')).json();
  }
  async stock(pid: string, wh: string) { return ((await this.state()).stock[pid + '|' + wh] ?? 0) as number; }
  async historyCount(pid: string) { return (await this.state()).history.filter((h: any) => h.pid === pid).length as number; }

  // ---------- nghiệp vụ dùng lại ----------
  async createReceipt(by: ActorKey, type: 'in' | 'out', partnerId: string, wh: string, lines: [string, number][], note = '[TEST] auto') {
    const l = await this.call(by, 'POST', '/api/receipts', { type, partnerId, warehouseId: wh, note, lines: lines.map(([productId, qty]) => ({ productId, qty })) });
    return this.ok(l, `lập phiếu ${type}`).code as string;
  }
  async approve(by: ActorKey, code: string) { return this.ok(await this.call(by, 'POST', `/api/receipts/${code}/approve`), 'duyệt ' + code); }
  /** Đưa tồn T_PROD tại kho về đúng `target` bằng kiểm kê (Manager). */
  async setStock(pid: string, wh: string, target: number) {
    this.ok(await this.call('manager', 'POST', '/api/stocktakes', { warehouseId: wh, rows: [{ productId: pid, actual: target }] }), 'kiểm kê đặt tồn');
  }

  need(): Fx {
    if (!this.fx) throw new Error('Kịch bản cần bước "Cho fixture [TEST] đã được tạo"');
    return this.fx;
  }

  /** Tạo dữ liệu [TEST] theo QLKho_Test_Tracker (T_PROD, T_SUP, T_CUS, T_USER, T_WH). */
  async ensureFx(): Promise<Fx> {
    if (this.fx) return this.fx;
    const runId = this.runId;
    const sup = { name: `[TEST] NCC ${runId}`, phone: '028' + rnd(7), email: `ncc${runId.toLowerCase()}@test.vn` };
    const cus = { name: `[TEST] KH ${runId}`, phone: '024' + rnd(7), email: `kh${runId.toLowerCase()}@test.vn` };
    const supId = this.ok(await this.call('admin', 'POST', '/api/partners', { type: 'sup', ...sup }), 'tạo T_SUP').id;
    const cusId = this.ok(await this.call('admin', 'POST', '/api/partners', { type: 'cus', ...cus }), 'tạo T_CUS').id;
    const prod = { sku: `TST-${runId}`, name: `[TEST] Sản phẩm ${runId}` };
    const prodId = this.ok(await this.call('manager', 'POST', '/api/products', { ...prod, category: '[TEST]', unit: 'Cái', minStock: 10, price: 1000 }), 'tạo T_PROD').id;
    this.fx = { runId, prod: { id: prodId, ...prod }, sup: { id: supId, ...sup }, cus: { id: cusId, ...cus }, user: null as any, wh: null as any };
    const pn = await this.createReceipt('staff', 'in', supId, 'HN', [[prodId, 50]]);
    await this.approve('manager', pn);
    this.fx.user = await this.createUser(`[TEST] User ${runId}`, 'active');
    this.fx.wh = await this.createWh('paused');
    return this.fx;
  }

  async createUser(name: string, status: string, pass = 'Test1234'): Promise<TestUser> {
    for (let i = 0; i < 5; i++) {
      const phone = randomPhone();
      // BR-36: Nhân viên kho phải có kho làm việc
      const l = await this.call('admin', 'POST', '/api/users', { name, phone, password: pass, role: 'staff', opened: today(), status, warehouseId: 'HN' });
      if (l.status === 200) return { id: l.json.id, name, phone, pass };
      if (!/đã được dùng/.test(l.json?.error ?? '')) this.ok(l, 'tạo user');
    }
    throw new Error('Không tạo được user [TEST]');
  }

  async createWh(status: 'active' | 'paused', keeperId: string | null = null): Promise<TestWh> {
    for (let i = 0; i < 5; i++) {
      const code = 'KHO-T' + rnd(4);
      // hậu tố ngẫu nhiên: tránh trùng tên với kho mà kịch bản tự tạo bằng "[TEST] Kho <runId>"
      const name = `[TEST] Kho ${this.runId}-${rnd(3)}`;
      const l = await this.call('admin', 'POST', '/api/warehouses', { code, name, address: '[TEST] địa chỉ', keeperId, phone: '', capacity: 0, opened: today(), status });
      if (l.status === 200) { this.extraWhs.push(l.json.id); return { id: l.json.id, code, name: l.json.name }; }
      if (!/đã tồn tại|đã được dùng/.test(l.json?.error ?? '')) this.ok(l, 'tạo kho');
    }
    throw new Error('Không tạo được kho [TEST]');
  }

  async setWhStatus(wh: TestWh, status: 'active' | 'paused') {
    return this.call('admin', 'PUT', `/api/warehouses/${wh.id}/status`, { status });
  }

  /** Kho mà ký hiệu T_WH đang chỉ tới */
  get T_WH(): TestWh { const w = this.ownWh ?? this.fx?.wh; if (!w) throw new Error('Chưa có T_WH'); return w; }

  /** Thay các ký hiệu trong câu bước bằng giá trị thật. */
  expand(s: string): string {
    const fx = this.fx;
    let out = s.replaceAll('<runId>', this.runId);
    const wh = this.ownWh ?? fx?.wh;
    if (wh) out = out.replaceAll('<tên T_WH>', wh.name).replaceAll('<T_WH>', wh.name);
    if (fx) out = out.replaceAll('<T_WH2>', fx.wh2?.name ?? '').replaceAll('<T_PROD>', fx.prod.name);
    if (this.vars.t !== undefined) out = out.replace(/chỉ còn t /g, `chỉ còn ${this.vars.t} `);
    return out;
  }

  /** Thay ký hiệu trong đường dẫn API. */
  async path(p: string): Promise<string> {
    let out = p;
    const fx = this.fx;
    if (fx) {
      out = out.replace(/\bT_SUP\b/g, fx.sup.id).replace(/\bT_CUS\b/g, fx.cus.id).replace(/\bT_USER2\b/g, fx.user2?.id ?? 'T_USER2')
        .replace(/\bT_USER\b/g, fx.user.id).replace(/\bT_WH2\b/g, fx.wh2?.id ?? 'T_WH2');
    }
    if (this.ownWh ?? fx?.wh) out = out.replace(/\bT_WH\b/g, this.T_WH.id);
    if (out.includes('{mã}')) out = out.replace('{mã}', this.vars.code);
    if (out.includes('{id}')) out = out.replace('{id}', this.vars.fileId);
    if (out.includes('{id bất kỳ}')) out = out.replace('{id bất kỳ}', 'khong-ton-tai');
    const m = /\{id của ((?:NCC|KH)-\d+)\}/.exec(out);
    if (m) {
      const f = (await this.state('admin')).files.find((x: any) => x.partnerId === m[1]);
      expect(f, 'file PDF mẫu của ' + m[1]).toBeTruthy();
      out = out.replace(m[0], f.id);
    }
    return out;
  }

  // ---------- giao diện ----------
  /** Mở ứng dụng trong trình duyệt với vai trò "tôi" (đăng nhập qua API cho nhanh). */
  async ui() {
    if (this.uiActor === this.actor && (await this.page.locator(SEL.navItem).count())) return;
    await this.api(this.actor);
    await this.page.goto('/');
    await this.page.locator(SEL.navItem).first().waitFor({ timeout: 15_000 });
    this.uiActor = this.actor;
  }

  // ---------- dọn dẹp ----------
  async cleanup() {
    for (const fn of this.disposers) await fn().catch(() => null);
    for (const id of this.restoreWhs) await this.call('admin', 'PUT', `/api/warehouses/${id}/status`, { status: 'active' }).catch(() => null);
    const fx = this.fx;
    // T_WH2 còn hàng → mở lại, kiểm kê về 0 rồi mới xóa được
    if (fx?.wh2) {
      await this.setWhStatus(fx.wh2, 'active').catch(() => null);
      await this.call('manager', 'POST', '/api/stocktakes', { warehouseId: fx.wh2.id, rows: [{ productId: fx.prod.id, actual: 0 }] }).catch(() => null);
    }
    if (fx) {
      const st = await this.state('admin').catch(() => null);
      if (st) {
        const mine = new Set([fx.sup.id, fx.cus.id]);
        const whs = new Set([fx.wh?.id, fx.wh2?.id].filter(Boolean));
        for (const r of st.receipts.filter((r: any) => r.status === 'pending' && (mine.has(r.partner) || whs.has(r.wh) || r.lines.some((l: any) => l.pid === fx.prod.id)))) {
          const l = await this.call('admin', 'POST', `/api/receipts/${r.id}/reject`).catch(() => null);
          if (l?.status !== 200) await this.call('manager', 'POST', `/api/receipts/${r.id}/reject`).catch(() => null);
        }
      }
      for (const w of [fx.wh, fx.wh2].filter(Boolean) as TestWh[]) {
        await this.setWhStatus(w, 'paused').catch(() => null);
        await this.call('admin', 'DELETE', `/api/warehouses/${w.id}`).catch(() => null);
      }
      for (const u of [fx.user, fx.user2].filter(Boolean) as TestUser[]) this.extraUsers.push(u.id);
    }
    for (const id of this.extraWhs) {
      await this.call('admin', 'PUT', `/api/warehouses/${id}/status`, { status: 'paused' }).catch(() => null);
      await this.call('admin', 'DELETE', `/api/warehouses/${id}`).catch(() => null);
    }
    for (const id of this.extraUsers) {
      await this.call('admin', 'PUT', `/api/users/${id}/status`, { status: 'locked' }).catch(() => null);
      await this.call('admin', 'DELETE', `/api/users/${id}`).catch(() => null);
    }
    for (const c of this.sessions.values()) await c.dispose().catch(() => {});
    this.sessions.clear();
  }
}

export const test = base.extend<{ world: World }>({
  world: async ({ page, baseURL }, use) => {
    const w = new World(page, baseURL!);
    await use(w);
    await w.cleanup();
  },
});

export const { Given, When, Then, Step } = createBdd(test);
export { expect };
