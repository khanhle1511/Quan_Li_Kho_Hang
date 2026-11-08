import { request, type APIRequestContext } from '@playwright/test';

/**
 * Đọc hộp thư Mailpit (SMTP giả chạy local) cho các test AUTH-08.
 * Chạy Mailpit: `mailpit --smtp 127.0.0.1:1025 --listen 127.0.0.1:8025 --enable-chaos`
 * (--enable-chaos để test trường hợp gửi mail lỗi). Đổi địa chỉ bằng biến MAILPIT_URL.
 *
 * Mỗi kịch bản dùng địa chỉ email riêng (có runId) nên không cần xóa cả hộp thư, chạy song song không lẫn nhau.
 */
export const MAILPIT_URL = process.env.MAILPIT_URL ?? 'http://localhost:8025';
const POLL_MS = 300;

export interface Mail { id: string; subject: string; to: string; created: string }
export interface MailBody { html: string; text: string }

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

let ctx: APIRequestContext | null = null;
async function api(): Promise<APIRequestContext> {
  ctx ??= await request.newContext({ baseURL: MAILPIT_URL });
  return ctx;
}

export async function mailpitAvailable(): Promise<boolean> {
  try { return (await (await api()).get('/api/v1/info', { timeout: 2000 })).ok(); } catch { return false; }
}

/** Các mail gửi tới `email`, mới nhất trước. */
export async function mailsTo(email: string): Promise<Mail[]> {
  const res = await (await api()).get('/api/v1/search', { params: { query: `to:"${email}"`, limit: 50 } });
  const data = await res.json();
  return (data.messages ?? []).map((m: any) => ({ id: m.ID, subject: m.Subject, to: m.To?.[0]?.Address ?? '', created: m.Created }));
}

/** Chờ đến khi số mail khớp `subject` gửi tới `email` đạt `count`; trả về các mail đó (mới nhất trước). */
export async function waitForMails(email: string, subject: RegExp, count = 1, timeoutMs = 10_000): Promise<Mail[]> {
  const deadline = Date.now() + timeoutMs;
  for (;;) {
    const found = (await mailsTo(email)).filter((m) => subject.test(m.subject));
    if (found.length >= count) return found;
    if (Date.now() > deadline) throw new Error(`Sau ${timeoutMs} ms chỉ có ${found.length}/${count} mail "${subject}" gửi tới ${email}`);
    await sleep(POLL_MS);
  }
}

export const OTP_SUBJECT = /Mã xác nhận đặt lại mật khẩu/;
export const CHANGED_SUBJECT = /Mật khẩu của bạn đã được thay đổi/;

/**
 * Mã OTP trong mail thứ `nth` (1 = mới nhất) gửi tới `email`; tiêu đề mail có sẵn 6 chữ số.
 * Mail gửi bất đồng bộ: truyền `expected` = tổng số mail mã đã yêu cầu để không đọc nhầm mail cũ khi mail mới chưa tới.
 */
export async function otpFromMail(email: string, nth = 1, expected = nth): Promise<string> {
  const mails = await waitForMails(email, OTP_SUBJECT, Math.max(nth, expected));
  const m = /(\d{6})/.exec(mails[nth - 1].subject);
  if (!m) throw new Error('Tiêu đề mail không có mã 6 số: ' + mails[nth - 1].subject);
  return m[1];
}

export async function mailBody(id: string): Promise<MailBody> {
  const d = await (await (await api()).get(`/api/v1/message/${id}`)).json();
  return { html: d.HTML ?? '', text: d.Text ?? '' };
}

/** Bật/tắt lỗi SMTP giả của Mailpit (cần --enable-chaos): người nhận bị từ chối với mã 451. */
export async function setRecipientFailure(on: boolean): Promise<boolean> {
  const res = await (await api()).put('/api/v1/chaos', { data: on ? { Recipient: { ErrorCode: 451, Probability: 100 } } : {} });
  return res.ok();
}
