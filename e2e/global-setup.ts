import type { FullConfig } from '@playwright/test';

/** Đánh thức máy chủ trước khi chạy (Render gói Free ngủ sau 15 phút). */
export default async function globalSetup(config: FullConfig) {
  const baseURL = config.projects[0].use.baseURL ?? 'http://localhost:8080';
  for (let i = 0; i < 12; i++) {
    const r = await fetch(baseURL + '/api/public/summary').catch(() => null);
    if (r?.ok) {
      console.log(`[global-setup] ${baseURL} sẵn sàng:`, await r.text());
      return;
    }
    console.log(`[global-setup] chờ máy chủ ${baseURL}... (${i + 1}/12)`);
    await new Promise((f) => setTimeout(f, 10_000));
  }
  throw new Error('Máy chủ không phản hồi tại ' + baseURL + '. Hãy khởi động ứng dụng local (mvn spring-boot:run) hoặc đặt BASE_URL.');
}
