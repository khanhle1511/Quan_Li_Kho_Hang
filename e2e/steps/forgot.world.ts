import { request as pwRequest, type APIRequestContext, type APIResponse } from '@playwright/test';
import { type World } from './fixtures';
import * as mail from '../helpers/mailpit';

/**
 * AUTH-08 – trạng thái dùng chung và lời gọi 3 API của luồng quên mật khẩu, cho forgot.steps.ts (API) và forgot-ui.steps.ts.
 *
 * Mỗi kịch bản có một địa chỉ IP giả riêng (header X-Forwarded-For, máy chủ đọc qua forward-headers-strategy)
 * cho cả gọi API lẫn trình duyệt, để giới hạn 20 lần/giờ/IP không làm các kịch bản ảnh hưởng nhau.
 * File này không định nghĩa bước nào.
 */

export const GENERIC_KEYS = ['expiresIn', 'ok', 'resendAfter'];
/** Chờ lâu hơn mức này thì bỏ qua test (máy chủ đang chạy thời hạn thật, không phải cấu hình e2e). */
const MAX_WAIT_SECONDS = 30;

/** Đối tượng điều khiển test mà playwright-bdd truyền vào bước ($test). */
export type TestCtl = { skip(condition: boolean, reason: string): void };

export interface Target { phone: string; email: string | null; userId?: string }
export interface ForgotState {
  ip: string;
  api: APIRequestContext;
  target: Target | null;
  token: string | null;
  /** Số lần yêu cầu mã thành công cho tài khoản đang xét = số mail mã phải có trong hộp thư */
  otpRequests: number;
  expiresIn: number;
  resendAfter: number;
  /** Mã OTP, token, mật khẩu đã dùng: không được xuất hiện trong lịch sử hoạt động hay log (SEC-04) */
  secrets: string[];
  jsErrors: string[];
  lastTypedPhone: string;
}

export const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const octet =() => 1 + Math.floor(Math.random() * 250);
export const fakeIp = () => `10.${octet()}.${octet()}.${octet()}`;
export const emailFor = (world: World, who: string) => `${who}.${world.runId}@qlkho.test`.toLowerCase();

/** Trạng thái AUTH-08 của kịch bản; lần đầu gọi thì tạo IP giả và gắn header cho cả trình duyệt. */
export async function fp(world: World): Promise<ForgotState> {
  if (world.vars.fp) return world.vars.fp;
  const ip = fakeIp();
  const headers = { 'X-Forwarded-For': ip };
  const api = await pwRequest.newContext({ baseURL: world.baseURL, extraHTTPHeaders: headers });
  await world.page.context().setExtraHTTPHeaders(headers);
  const state: ForgotState = { ip, api, target: null, token: null, otpRequests: 0, expiresIn: 0, resendAfter: 0, secrets: [], jsErrors: [], lastTypedPhone: '' };
  world.page.on('pageerror', (e) => state.jsErrors.push(e.message));
  world.onCleanup(() => api.dispose());
  world.vars.fp = state;
  return state;
}

export function target(s: ForgotState): Target {
  if (!s.target) throw new Error('Kịch bản chưa chọn tài khoản (bước "T_USER có email riêng", "tài khoản [TEST] …"…)');
  return s.target;
}

export async function requireMailpit($test: TestCtl) {
  $test.skip(!(await mail.mailpitAvailable()), `Không kết nối được Mailpit ở ${mail.MAILPIT_URL}`);
}

/** Bỏ qua test nếu phải chờ quá lâu, ngược lại chờ đủ `seconds` (+ một chút dư). */
export async function waitOrSkip($test: TestCtl, seconds: number, what: string) {
  $test.skip(seconds > MAX_WAIT_SECONDS, `${what} là ${seconds} giây: chạy máy chủ với cấu hình rút ngắn (xem đầu file feature)`);
  await sleep(seconds * 1000 + 300);
}

async function keep(world: World, res: APIResponse, t0: number) { return world.keep(res, Date.now() - t0); }

// ---------- gọi 3 API của luồng ----------
export async function requestCode(world: World, phone: string, api?: APIRequestContext) {
  const s = await fp(world);
  const t0 = Date.now();
  const l = await keep(world, await (api ?? s.api).post('/api/auth/forgot', { data: { phone } }), t0);
  if (l.status === 200) {
    s.expiresIn = l.json.expiresIn; s.resendAfter = l.json.resendAfter;
    if (phone === s.target?.phone) s.otpRequests++;
  }
  return l;
}

export async function verifyCode(world: World, phone: string, otp: string) {
  const s = await fp(world);
  s.secrets.push(otp);
  const t0 = Date.now();
  const l = await keep(world, await s.api.post('/api/auth/forgot/verify', { data: { phone, otp } }), t0);
  if (l.status === 200) { s.token = l.json.resetToken; s.secrets.push(l.json.resetToken); }
  return l;
}

export async function resetPassword(world: World, password: string, confirm = password) {
  const s = await fp(world);
  s.secrets.push(password);
  const t0 = Date.now();
  return keep(world, await s.api.post('/api/auth/forgot/reset', { data: { resetToken: s.token, password, confirm } }), t0);
}

/** Mã OTP thứ `nth` (1 = mới nhất) trong hộp thư của tài khoản đang xét. */
export async function otp(world: World, nth = 1) {
  const s = await fp(world); const t = target(s);
  if (!t.email) throw new Error('Tài khoản đang xét không có email');
  return mail.otpFromMail(t.email, nth, s.otpRequests);
}

/** Mã sai chắc chắn khác mã thật. */
export const wrongOf = (code: string) => String((Number(code) + 1) % 1_000_000).padStart(6, '0');

export async function tryLogin(world: World, phone: string, password: string) {
  return world.keep(await (await world.fresh()).post('/api/auth/login', { data: { phone, password } }));
}

export async function setEmail(world: World, userId: string, phone: string, email: string) {
  return world.call('admin', 'PUT', `/api/users/${userId}`, { phone, email });
}
